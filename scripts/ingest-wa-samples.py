from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

import pdfplumber
from pypdf import PdfReader


MODEL_RE = re.compile(r"^\d{2}-(WA\d+-\d+)")
NUMBER_RE = re.compile(r"^\d+(?:\.\d+)?$")
RANGE_RE = re.compile(r"^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/?$")
FULL_META_RE = re.compile(
    r"^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/(\d+(?:\.\d+)?)$"
)
HEADER_COLOR = "AADB1E"


@dataclass
class PerformanceRow:
    jib: float
    reeving: int
    min_radius: float
    max_load_radius: float
    max_load: float
    capacities: dict[float, float]


@dataclass
class ModelData:
    model: str
    source: Path
    page_count: int
    performance_page: int
    radii: list[float]
    rows: list[PerformanceRow]
    sha256: str

    @property
    def jibs(self) -> list[float]:
        return sorted({row.jib for row in self.rows}, reverse=True)


def numeric(value: str) -> float:
    return float(value)


def grouped_by_top(words: list[dict], tolerance: float = 1.4) -> list[list[dict]]:
    groups: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not groups or abs(groups[-1][0]["top"] - word["top"]) > tolerance:
            groups.append([word])
        else:
            groups[-1].append(word)
    return groups


def parse_performance(page: pdfplumber.page.Page) -> tuple[list[float], list[PerformanceRow]]:
    words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False)
    groups = grouped_by_top(words)
    header_candidates = []
    for group in groups:
        numeric_words = [
            word for word in group
            if word["x0"] > 150 and NUMBER_RE.fullmatch(word["text"])
        ]
        if len(numeric_words) >= 4:
            header_candidates.append((group[0]["top"], numeric_words))
    if not header_candidates:
        raise ValueError("radius header row not found")
    header_top, header_words = min(header_candidates, key=lambda item: item[0])
    header_words.sort(key=lambda word: word["x0"])
    radii = [numeric(word["text"]) for word in header_words]
    header_centers = [(word["x0"] + word["x1"]) / 2 for word in header_words]
    first_capacity_x = header_words[0]["x0"] - 3

    metadata = []
    for group in groups:
        if group[0]["top"] <= header_top + 5:
            continue
        row_words = sorted(group, key=lambda item: item["x0"])
        prefix = [
            item for item in row_words
            if item["x0"] > 90 and item["x1"] < first_capacity_x
        ]
        combined = "".join(item["text"] for item in prefix)
        match = FULL_META_RE.fullmatch(combined)
        if not match:
            continue
        anchor = prefix[0]
        min_radius = numeric(match.group(1))
        max_load_radius = numeric(match.group(2))
        max_load = numeric(match.group(3))
        capacities: dict[float, float] = {}
        for item in row_words:
            if item["x0"] < first_capacity_x or not NUMBER_RE.fullmatch(item["text"]):
                continue
            center = (item["x0"] + item["x1"]) / 2
            nearest = min(range(len(header_centers)), key=lambda index: abs(header_centers[index] - center))
            if abs(header_centers[nearest] - center) <= 8:
                capacities[radii[nearest]] = numeric(item["text"])
        if not capacities:
            raise ValueError(f"capacity cells not found near y={anchor['top']:.1f}")
        metadata.append(
            {
                "anchor": anchor,
                "top": anchor["top"],
                "min_radius": min_radius,
                "max_load_radius": max_load_radius,
                "max_load": max_load,
                "capacities": capacities,
            }
        )
    metadata.sort(key=lambda item: item["top"])
    if not metadata or len(metadata) % 2:
        raise ValueError(f"expected paired performance rows, found {len(metadata)}")
    parsed_rows = metadata

    jib_words = [
        word for word in words
        if word["x0"] < 100 and NUMBER_RE.fullmatch(word["text"])
        and metadata[0]["top"] - 5 <= word["top"] <= metadata[-1]["top"] + 10
    ]
    used_jib_words: set[int] = set()
    rows: list[PerformanceRow] = []
    for pair_index in range(0, len(parsed_rows), 2):
        pair = parsed_rows[pair_index:pair_index + 2]
        target_top = sum(item["top"] for item in pair) / 2
        candidates = [
            (index, word) for index, word in enumerate(jib_words)
            if index not in used_jib_words and abs(word["top"] - target_top) <= 10
        ]
        if not candidates:
            raise ValueError(f"jib length not found near y={target_top:.1f}")
        word_index, jib_word = min(candidates, key=lambda item: abs(item[1]["top"] - target_top))
        used_jib_words.add(word_index)
        jib = numeric(jib_word["text"])
        lower_load = min(item["max_load"] for item in pair)
        upper_load = max(item["max_load"] for item in pair)
        if upper_load <= lower_load:
            raise ValueError(f"unexpected paired max loads for {jib:g} m jib")
        for item in pair:
            reeving = 2 if item["max_load"] == lower_load else 4
            rows.append(
                PerformanceRow(
                    jib=jib,
                    reeving=reeving,
                    min_radius=item["min_radius"],
                    max_load_radius=item["max_load_radius"],
                    max_load=item["max_load"],
                    capacities=item["capacities"],
                )
            )
    return radii, rows


def parse_sample(path: Path) -> ModelData:
    match = MODEL_RE.match(path.name)
    if not match:
        raise ValueError(f"model not found in filename: {path.name}")
    model = match.group(1)
    reader = PdfReader(str(path))
    page_count = len(reader.pages)
    cover_text = reader.pages[0].extract_text() or ""
    performance_pages = [
        index for index, page in enumerate(reader.pages, 1)
        if "Load diagrams" in (page.extract_text() or "")
    ]
    if len(performance_pages) != 1:
        raise ValueError(f"expected one load-diagram page, found {len(performance_pages)}")
    page_number = performance_pages[0]
    with pdfplumber.open(path) as pdf:
        radii, rows = parse_performance(pdf.pages[page_number - 1])
    source_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    data = ModelData(model, path, page_count, page_number, radii, rows, source_hash)
    validate_model(data, cover_text)
    return data


def validate_model(data: ModelData, cover_text: str) -> None:
    if data.model not in cover_text:
        raise ValueError(f"cover model mismatch for {data.model}")
    if len(data.rows) != len(data.jibs) * 2:
        raise ValueError(f"expected two performance rows per jib for {data.model}")
    if data.radii != sorted(set(data.radii)):
        raise ValueError(f"radius columns are not strictly increasing for {data.model}")
    for row in data.rows:
        if row.jib < max(row.capacities):
            raise ValueError(f"capacity exceeds jib reach for {data.model} {row.jib:g} m")
        if any(value > row.max_load + 0.011 for value in row.capacities.values()):
            raise ValueError(f"capacity exceeds max load for {data.model} {row.jib:g} m")
        ordered = [row.capacities[radius] for radius in sorted(row.capacities)]
        if any(right > left + 0.011 for left, right in zip(ordered, ordered[1:])):
            raise ValueError(f"capacity increases with radius for {data.model} {row.jib:g} m")


def number_text(value: float, digits: int = 1) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.{digits}f}".rstrip("0").rstrip(".")


def write_csv(data: ModelData, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    headers = [
        "起重臂_m", "小车形式", "倍率", "最小幅度_m", "最大起重量幅度_m", "最大起重量_t",
        *[f"{radius:.1f}m_t" for radius in data.radii],
    ]
    with destination.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(headers)
        for row in sorted(data.rows, key=lambda item: (-item.jib, item.reeving)):
            writer.writerow([
                number_text(row.jib),
                "单小车",
                row.reeving,
                number_text(row.min_radius),
                number_text(row.max_load_radius),
                number_text(row.max_load),
                *[
                    f"{row.capacities[radius]:.2f}" if radius in row.capacities else ""
                    for radius in data.radii
                ],
            ])


def model_card(data: ModelData) -> str:
    max_jib = max(data.jibs)
    max_load = max(row.max_load for row in data.rows)
    tip_candidates = [
        row.capacities.get(max_jib) for row in data.rows if row.jib == max_jib and max_jib in row.capacities
    ]
    tip_load = max(tip_candidates) if tip_candidates else None
    jib_list = "、".join(number_text(value) for value in sorted(data.jibs))
    return f"""# 型号卡：{data.model}

## 来源与状态

- 状态：已确认入库
- 塔机类型：中联平臂塔机
- 样本：`{data.source}`
- 样本页数：{data.page_count}页
- 原始样本归档：`原始样本/{data.source.name}`
- SHA-256：`{data.sha256}`
- 原始样本加载规则：仅在需要原文复核、补录参数或追溯页码时读取；日常性能查询不加载。
- 用途：命中已知型号索引后，查询{data.model}起重性能或用于选型时读取。

## 型号概况

- 最大起重量：{number_text(max_load)} t。
- 最大起重臂：{number_text(max_jib)} m。
- 样本列出的起重臂长度：{jib_list} m。
- {number_text(max_jib)} m臂尖吊重：{number_text(tip_load, 2) if tip_load is not None else '样本未列'} t。

## 完整起重性能表

- 普通工况：`起重性能-普通.csv`，{len(data.rows)}行。
- 性能来源：样本第{data.performance_page}页Load diagrams表。
- 幅度档位：{number_text(min(data.radii))}～{number_text(max(data.radii))} m，按样本离散档位保存。
- 每个臂长保存2倍率和4倍率两行；小车形式按样本图示归入单小车。
- 样本未列出独立的超起性能表，不为该型号假定超起工况。

## 数据边界

- 本次仅为起重性能查询和网页选型建立档案；独立高度、基础反力、机构、配重和运输参数仍以原始样本逐项复核。
- 非表格幅度不进行线性插值，按中联平臂塔机通用阅读规则保守读取相邻档位。
"""


def write_skill_files(data: ModelData, performance_root: Path) -> None:
    model_root = performance_root / data.model
    archive = model_root / "原始样本"
    archive.mkdir(parents=True, exist_ok=True)
    shutil.copy2(data.source, archive / data.source.name)
    write_csv(data, model_root / "起重性能-普通.csv")
    (model_root / "型号卡.md").write_text(model_card(data), encoding="utf-8")


def update_zoomlion_index(models: list[ModelData], index_path: Path) -> None:
    lines = index_path.read_text(encoding="utf-8").splitlines()
    row_by_model = {data.model: f"| 平臂 | {data.model} | `../{data.model}/` | 已确认 |" for data in models}
    table_header = next(index for index, line in enumerate(lines) if line.startswith("| 塔机类型"))
    rules_header = next(index for index, line in enumerate(lines) if line.startswith("## 加载规则"))
    output = lines[:table_header + 2]
    existing_models = set()
    for existing_line in lines[table_header + 2:rules_header]:
        parts = line_parts(existing_line)
        if not parts:
            continue
        existing_models.add(parts[2].strip())
        output.append(existing_line)
    for model in sorted(row_by_model):
        if model not in existing_models:
            output.append(row_by_model[model])
    output.extend(["", *lines[rules_header:]])
    index_path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")


def line_parts(parts_line: str) -> list[str] | None:
    if not parts_line.startswith("|") or parts_line.startswith("|---"):
        return None
    parts = parts_line.split("|")
    return parts if len(parts) >= 5 else None


def write_report(models: list[ModelData], destination: Path) -> None:
    report = {
        "headerColor": f"#{HEADER_COLOR}",
        "models": [
            {
                "model": data.model,
                "pages": data.page_count,
                "performancePage": data.performance_page,
                "jibs": data.jibs,
                "radii": data.radii,
                "rows": len(data.rows),
                "maxLoad": max(row.max_load for row in data.rows),
                "sha256": data.sha256,
            }
            for data in models
        ],
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--skill-performance-root", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    samples = sorted(
        path for path in args.source.glob("*.pdf")
        if MODEL_RE.match(path.name) and 1 <= int(path.name[:2]) <= 14
    )
    if len(samples) != 14:
        raise SystemExit(f"expected 14 WA samples, found {len(samples)}")
    models = []
    for path in samples:
        try:
            models.append(parse_sample(path))
        except Exception as error:
            raise RuntimeError(f"failed to parse {path.name}: {error}") from error
    write_report(models, args.report)
    if args.write:
        if not args.skill_performance_root:
            raise SystemExit("--skill-performance-root is required with --write")
        for data in models:
            write_skill_files(data, args.skill_performance_root)
        update_zoomlion_index(models, args.skill_performance_root / "品牌索引" / "中联.md")
    for data in models:
        print(
            f"{data.model}: page {data.performance_page}, "
            f"{len(data.jibs)} jibs, {len(data.rows)} rows, "
            f"{number_text(max(row.max_load for row in data.rows))} t max"
        )


if __name__ == "__main__":
    main()
