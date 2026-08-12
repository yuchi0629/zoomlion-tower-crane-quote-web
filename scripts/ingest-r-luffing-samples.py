from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from pathlib import Path

import pdfplumber
from pypdf import PdfReader


SAMPLE_ROOT = Path("F:/2 - \u6837\u672c&\u64cd\u4f5c\u624b\u518c")
SAMPLE_GROUPS = {
    "\u5927R": SAMPLE_ROOT / "03 R\u5927\uff08370t\u00b7m-)",
    "\u52a8\u81c2": SAMPLE_ROOT / "04 \u52a8\u81c2\u6837\u672c",
}
KNOWLEDGE_ROOT = (
    Path.home()
    / ".codex"
    / "skills"
    / "tower-crane-sample-reader"
    / "references"
    / "knowledge-base"
    / "\u578b\u53f7\u6027\u80fd\u5e93"
)
NUMBER_RE = re.compile(r"^\d+(?:\.\d+)?$")
MODEL_RE = re.compile(r"(?:^\d{2}-)?((?:R|L|LH|RL|LW)\d+[A-Z]*-\d+[A-Z]*)", re.I)
META_RE = re.compile(
    r"^(\d+(?:\.\d+)?)[\uff5e~j-](\d+(?:\.\d+)?)/(\d+(?:\.\d+)?)$",
    re.I,
)
LW_RANGE_RE = re.compile(r"^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$")


@dataclass
class PerformanceRow:
    jib: float
    reeving: int
    min_radius: float
    max_load_radius: float
    max_load: float
    capacities: dict[float, float]
    page: int
    mode: str = "\u666e\u901a\u5de5\u51b5"
    trolley: str = ""


@dataclass
class ModelData:
    model: str
    crane_type: str
    source: str
    page_count: int
    performance_pages: list[int]
    radii: list[float]
    rows: list[PerformanceRow]
    sha256: str

    @property
    def jibs(self) -> list[float]:
        return sorted({row.jib for row in self.rows}, reverse=True)


def number_text(value: float, digits: int = 2) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.{digits}f}".rstrip("0").rstrip(".")


def grouped_by_top(words: list[dict], tolerance: float = 1.5) -> list[list[dict]]:
    groups: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not groups or abs(groups[-1][0]["top"] - word["top"]) > tolerance:
            groups.append([word])
        else:
            groups[-1].append(word)
    return groups


def normalized_metadata(parts: list[dict]) -> tuple[float, float, float] | None:
    value = "".join(part["text"] for part in parts)
    value = value.replace(" ", "").replace("\u2013", "-").replace("\u2014", "-")
    match = META_RE.fullmatch(value)
    if not match:
        return None
    return tuple(float(match.group(index)) for index in range(1, 4))


def icon_metrics(page: pdfplumber.page.Page, metadata: dict, metadata_x: float) -> tuple[int, float]:
    top = metadata["top"]
    verticals: list[float] = []
    for line in page.lines:
        x0 = float(line.get("x0", 0))
        x1 = float(line.get("x1", 0))
        line_top = float(line.get("top", 0))
        bottom = float(line.get("bottom", 0))
        if not (65 <= x0 < metadata_x - 2):
            continue
        if abs(x0 - x1) > 0.25 or bottom - line_top < 1.0:
            continue
        if abs(line_top - top) <= 3.5 and bottom >= top - 0.8:
            verticals.append(round(x0, 1))
    unique = sorted(set(verticals))
    return len(unique), (unique[-1] - unique[0] if len(unique) > 1 else 0)


def parse_standard_table(page: pdfplumber.page.Page, page_number: int) -> tuple[list[float], list[PerformanceRow]]:
    words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False)
    groups = grouped_by_top(words)
    header_candidates: list[tuple[float, list[dict]]] = []
    for group in groups:
        numeric_words = [
            word for word in group
            if word["x0"] > 130 and NUMBER_RE.fullmatch(word["text"])
        ]
        if len(numeric_words) >= 4:
            header_candidates.append((group[0]["top"], numeric_words))
    if not header_candidates:
        raise ValueError("未找到性能表幅度表头")

    header_top, header_words = min(header_candidates, key=lambda item: item[0])
    header_words.sort(key=lambda word: word["x0"])
    radii = [float(word["text"]) for word in header_words]
    if radii != sorted(set(radii)):
        raise ValueError(f"性能表幅度表头不是严格递增值: {radii}")
    centers = [(word["x0"] + word["x1"]) / 2 for word in header_words]
    spacing = min(right - left for left, right in zip(centers, centers[1:]))
    tolerance = max(4.5, min(9.0, spacing * 0.38))
    first_capacity_x = header_words[0]["x0"] - 3

    metadata_rows: list[dict] = []
    for group in groups:
        if group[0]["top"] <= header_top + 5:
            continue
        row_words = sorted(group, key=lambda item: item["x0"])
        prefix = [
            item for item in row_words
            if 85 < item["x0"] and item["x1"] < first_capacity_x
        ]
        parsed = normalized_metadata(prefix)
        if not parsed:
            continue
        min_radius, max_load_radius, max_load = parsed
        anchor = prefix[0]
        capacities: dict[float, float] = {}
        for item in row_words:
            if item["x0"] < first_capacity_x or not NUMBER_RE.fullmatch(item["text"]):
                continue
            center = (item["x0"] + item["x1"]) / 2
            nearest = min(range(len(centers)), key=lambda index: abs(centers[index] - center))
            if abs(centers[nearest] - center) <= tolerance:
                capacity = float(item["text"])
                while capacity > max_load * 2:
                    capacity /= 10
                if max_load < capacity <= max_load * 1.002:
                    capacity = max_load
                capacities[radii[nearest]] = capacity
        if not capacities:
            raise ValueError(f"第{page_number}页 y={anchor['top']:.1f} 未识别到吊重数据")
        metadata_rows.append({
            "top": anchor["top"],
            "x0": anchor["x0"],
            "min_radius": min_radius,
            "max_load_radius": max_load_radius,
            "max_load": max_load,
            "capacities": capacities,
        })

    metadata_rows.sort(key=lambda item: item["top"])
    if not metadata_rows:
        raise ValueError("未识别到性能行")
    metadata_x = min(item["x0"] for item in metadata_rows)
    jib_words = [
        word for word in words
        if word["x0"] < metadata_x - 8
        and NUMBER_RE.fullmatch(word["text"])
        and metadata_rows[0]["top"] - 12 <= word["top"] <= metadata_rows[-1]["top"] + 12
    ]
    if not jib_words:
        raise ValueError("未识别到起重臂长度")

    jib_cells: list[tuple[dict, dict]] = []
    for word in jib_words:
        center_x = (word["x0"] + word["x1"]) / 2
        center_y = (word["top"] + word["bottom"]) / 2
        cells = [
            rect for rect in page.rects
            if rect["x0"] <= center_x <= rect["x1"]
            and rect["top"] <= center_y <= rect["bottom"]
            and rect["x1"] < metadata_x - 2
        ]
        if cells:
            cell = min(
                cells,
                key=lambda rect: (rect["x1"] - rect["x0"]) * (rect["bottom"] - rect["top"]),
            )
            jib_cells.append((word, cell))

    rows: list[PerformanceRow] = []
    for item in metadata_rows:
        containing = [
            word for word, cell in jib_cells
            if cell["top"] - 0.5 <= item["top"] <= cell["bottom"] + 0.5
        ]
        jib_word = (
            containing[0]
            if containing
            else min(
                jib_words,
                key=lambda word: (abs(word["top"] - item["top"]), -word["top"]),
            )
        )
        reeving, icon_span = icon_metrics(page, item, metadata_x)
        if reeving < 1:
            raise ValueError(f"第{page_number}页 y={item['top']:.1f} 未识别到倍率图标")
        rows.append(PerformanceRow(
            jib=float(jib_word["text"]),
            reeving=reeving,
            min_radius=item["min_radius"],
            max_load_radius=item["max_load_radius"],
            max_load=item["max_load"],
            capacities=item["capacities"],
            page=page_number,
            trolley="\u53cc\u5c0f\u8f66" if icon_span > 10 else "\u5355\u5c0f\u8f66",
        ))
    return radii, rows


def table_header_tops(page: pdfplumber.page.Page) -> list[float]:
    words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False)
    tops = []
    for group in grouped_by_top(words):
        numeric_words = [
            word for word in group
            if word["x0"] > 130 and NUMBER_RE.fullmatch(word["text"])
        ]
        values = [float(word["text"]) for word in sorted(numeric_words, key=lambda word: word["x0"])]
        if len(values) >= 4 and values == sorted(set(values)):
            tops.append(float(group[0]["top"]))
    filtered = []
    for top in tops:
        if not filtered or top - filtered[-1] > 25:
            filtered.append(top)
    return filtered


def parse_rl_pages(
    pdf: pdfplumber.pdf.PDF,
    performance_pages: list[int],
) -> tuple[list[float], list[PerformanceRow]]:
    all_rows: list[PerformanceRow] = []
    all_radii: set[float] = set()
    for page_number in performance_pages:
        page = pdf.pages[page_number - 1]
        words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False)
        header_tops = table_header_tops(page)
        if not header_tops:
            raise ValueError(f"RL第{page_number}页未找到性能表")
        for index, header_top in enumerate(header_tops):
            bottom = header_tops[index + 1] - 5 if index + 1 < len(header_tops) else page.height
            cropped = page.crop((0, max(0, header_top - 5), page.width, bottom))
            radii, rows = parse_standard_table(cropped, page_number)
            title_words = [
                word for word in words
                if word["top"] < header_top and word["text"] in {"Luffing", "Trolleying"}
            ]
            if not title_words:
                raise ValueError(f"RL第{page_number}页未识别到工作模式标题")
            title_anchor = max(title_words, key=lambda word: word["top"])
            title_line = " ".join(
                word["text"] for word in sorted(words, key=lambda word: word["x0"])
                if abs(word["top"] - title_anchor["top"]) <= 2
            ).lower()
            if "trolleying" in title_line:
                mode = "水平小车模式"
            elif "incl." in title_line:
                mode = "动臂模式（含小车）"
            else:
                mode = "动臂模式（不含小车）"
            for row in rows:
                row.mode = mode
            all_rows.extend(rows)
            all_radii.update(radii)
    return sorted(all_radii), all_rows


def parse_lw_section(
    page: pdfplumber.page.Page,
    page_number: int,
    section_top: float,
    section_bottom: float,
    huh: int,
) -> tuple[list[float], list[PerformanceRow]]:
    words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False)
    groups = [
        group for group in grouped_by_top(words)
        if section_top <= group[0]["top"] < section_bottom
    ]
    jib_words = [
        word for word in words
        if section_top <= word["top"] < section_bottom
        and word["x0"] < 80
        and NUMBER_RE.fullmatch(word["text"])
        and 20 <= float(word["text"]) <= 100
    ]
    if len(jib_words) != 1:
        raise ValueError(f"LW第{page_number}页 {huh}m HUH未唯一识别臂长: {[w['text'] for w in jib_words]}")
    jib = float(jib_words[0]["text"])

    headers: list[tuple[int, list[dict]]] = []
    for group_index, group in enumerate(groups):
        texts = {word["text"] for word in group if word["x0"] < 110}
        columns = [
            word for word in group
            if word["x0"] > 105
            and (NUMBER_RE.fullmatch(word["text"]) or LW_RANGE_RE.fullmatch(word["text"]))
        ]
        if {"m", "/", "t"}.issubset(texts) and len(columns) >= 3:
            headers.append((group_index, sorted(columns, key=lambda word: word["x0"])))
    if not headers:
        raise ValueError(f"LW第{page_number}页 {huh}m HUH未识别性能表头")

    row_data: list[dict] | None = None
    all_radii: set[float] = set()
    for header_position, (group_index, columns) in enumerate(headers):
        next_group_index = headers[header_position + 1][0] if header_position + 1 < len(headers) else len(groups)
        candidate_rows = []
        for group in groups[group_index + 1:next_group_index]:
            values = [
                word for word in group
                if word["x0"] > 105 and NUMBER_RE.fullmatch(word["text"])
            ]
            if len(values) >= 3:
                candidate_rows.append((group[0]["top"], sorted(values, key=lambda word: word["x0"])))
            if len(candidate_rows) == 3:
                break
        if len(candidate_rows) != 3:
            raise ValueError(f"LW第{page_number}页 {huh}m HUH表头后未识别3个倍率行")

        range_columns = [word for word in columns if LW_RANGE_RE.fullmatch(word["text"])]
        point_columns = [word for word in columns if NUMBER_RE.fullmatch(word["text"])]
        point_centers = [(word["x0"] + word["x1"]) / 2 for word in point_columns]
        point_radii = [float(word["text"]) for word in point_columns]
        all_radii.update(point_radii)

        if row_data is None:
            if len(range_columns) != 1:
                raise ValueError(f"LW第{page_number}页 {huh}m HUH首段未识别恒载幅度范围")
            range_match = LW_RANGE_RE.fullmatch(range_columns[0]["text"])
            row_data = []
            range_center = (range_columns[0]["x0"] + range_columns[0]["x1"]) / 2
            for row_top, values in candidate_rows:
                max_word = min(values, key=lambda word: abs((word["x0"] + word["x1"]) / 2 - range_center))
                max_load = float(max_word["text"])
                reeving, _ = icon_metrics(page, {"top": row_top}, range_columns[0]["x0"])
                row_data.append({
                    "reeving": reeving,
                    "min_radius": float(range_match.group(1)),
                    "max_load_radius": float(range_match.group(2)),
                    "max_load": max_load,
                    "capacities": {},
                })

        assert row_data is not None
        for row_index, (_, values) in enumerate(candidate_rows):
            max_load = row_data[row_index]["max_load"]
            for word in values:
                center = (word["x0"] + word["x1"]) / 2
                nearest = min(range(len(point_centers)), key=lambda index: abs(point_centers[index] - center))
                if abs(point_centers[nearest] - center) > 9:
                    continue
                capacity = float(word["text"])
                while capacity > max_load * 2:
                    capacity /= 10
                if max_load < capacity <= max_load * 1.01:
                    capacity = max_load
                row_data[row_index]["capacities"][point_radii[nearest]] = capacity

    assert row_data is not None
    rows = [
        PerformanceRow(
            jib=jib,
            reeving=item["reeving"],
            min_radius=item["min_radius"],
            max_load_radius=item["max_load_radius"],
            max_load=item["max_load"],
            capacities=item["capacities"],
            page=page_number,
            mode=f"{huh}m HUH",
        )
        for item in row_data
    ]
    return sorted(all_radii), rows


def parse_lw_pages(
    pdf: pdfplumber.pdf.PDF,
    performance_pages: list[int],
) -> tuple[list[float], list[PerformanceRow]]:
    all_rows: list[PerformanceRow] = []
    all_radii: set[float] = set()
    for page_number in performance_pages:
        page = pdf.pages[page_number - 1]
        words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False)
        section_titles = sorted(
            [
                (float(word["top"]), int(re.fullmatch(r"(\d+)m(?:HUH)?", word["text"]).group(1)))
                for word in words
                if re.fullmatch(r"\d+m(?:HUH)?", word["text"])
                and (
                    word["text"].endswith("HUH")
                    or any(
                        other["text"] == "HUH" and abs(other["top"] - word["top"]) <= 2
                        for other in words
                    )
                )
            ],
            key=lambda item: item[0],
        )
        if not section_titles:
            raise ValueError(f"LW第{page_number}页未识别HUH性能分区")
        for index, (top, huh) in enumerate(section_titles):
            bottom = section_titles[index + 1][0] if index + 1 < len(section_titles) else page.height
            radii, rows = parse_lw_section(page, page_number, top, bottom, huh)
            all_rows.extend(rows)
            all_radii.update(radii)
    return sorted(all_radii), all_rows


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def model_from_path(path: Path) -> str:
    match = MODEL_RE.search(path.name)
    if not match:
        raise ValueError(f"文件名未识别到型号: {path.name}")
    return match.group(1).upper()


def parse_sample(path_text: str, crane_type: str) -> ModelData:
    path = Path(path_text)
    model = model_from_path(path)
    reader = PdfReader(str(path))
    page_count = len(reader.pages)
    cover_text = reader.pages[0].extract_text() or ""
    if model not in cover_text.replace(" ", ""):
        raise ValueError(f"封面型号与文件名不一致: {model}")
    performance_pages = [
        index for index, page in enumerate(reader.pages, 1)
        if re.search(r"Load\s*diagrams", page.extract_text() or "", re.I)
    ]
    with pdfplumber.open(path) as pdf:
        if model.startswith("LW"):
            radii, rows = parse_lw_pages(pdf, performance_pages)
        elif model.startswith("RL"):
            radii, rows = parse_rl_pages(pdf, performance_pages)
        else:
            if len(performance_pages) != 1:
                raise ValueError(f"当前标准表解析器要求1个性能页，实际为{performance_pages}")
            radii, rows = parse_standard_table(pdf.pages[performance_pages[0] - 1], performance_pages[0])
    data = ModelData(
        model=model,
        crane_type=crane_type,
        source=str(path),
        page_count=page_count,
        performance_pages=performance_pages,
        radii=radii,
        rows=rows,
        sha256=sha256(path),
    )
    validate_model(data)
    return data


def validate_model(data: ModelData) -> None:
    if data.radii != sorted(set(data.radii)):
        raise ValueError(f"{data.model} 幅度档位不递增")
    for jib in data.jibs:
        jib_rows = [row for row in data.rows if row.jib == jib]
        arrangements = [(row.reeving, row.trolley, row.mode) for row in jib_rows]
        if len(arrangements) != len(set(arrangements)):
            raise ValueError(f"{data.model} {jib:g}m 倍率/小车组合重复: {arrangements}")
    for row in data.rows:
        if max(row.capacities) > row.jib + 0.01:
            raise ValueError(f"{data.model} {row.jib:g}m 存在超出臂长的性能点")
        if any(value > row.max_load + 0.011 for value in row.capacities.values()):
            raise ValueError(f"{data.model} {row.jib:g}m 存在超过最大起重量的数值")
        # Keep source-table anomalies in the expert CSV. The web-data builder
        # applies a conservative cumulative minimum before model selection.


def discover_samples() -> tuple[list[tuple[Path, str]], list[dict]]:
    selected: list[tuple[Path, str]] = []
    manifest: list[dict] = []
    seen_models: set[str] = set()
    for group_name, directory in SAMPLE_GROUPS.items():
        crane_type = "flat" if group_name == "\u5927R" else "luffing"
        for path in sorted(item for item in directory.iterdir() if item.is_file()):
            file_hash = sha256(path)
            model_match = MODEL_RE.search(path.name)
            model = model_match.group(1).upper() if model_match else None
            manifest.append({
                "group": group_name,
                "file": path.name,
                "bytes": path.stat().st_size,
                "sha256": file_hash,
                "model": model,
            })
            if ".pdf" not in path.name.lower() or not model or model in seen_models:
                continue
            if "\u76ee\u5f55" in path.name or "\u7b26\u53f7" in path.name:
                continue
            seen_models.add(model)
            selected.append((path, crane_type))
    return selected, manifest


def data_summary(data: ModelData) -> dict:
    by_jib = []
    for jib in data.jibs:
        rows = [row for row in data.rows if row.jib == jib]
        by_jib.append({
            "jib": jib,
            "reevings": [row.reeving for row in rows],
            "trolleys": [row.trolley for row in rows],
            "maxLoads": [row.max_load for row in rows],
        })
    return {
        "model": data.model,
        "type": data.crane_type,
        "source": Path(data.source).name,
        "pages": data.page_count,
        "performancePages": data.performance_pages,
        "radii": data.radii,
        "rowCount": len(data.rows),
        "jibs": by_jib,
        "sha256": data.sha256,
    }


def write_csv(data: ModelData, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    headers = [
        "\u52a8\u81c2\u957f\u5ea6_m" if data.crane_type == "luffing" else "\u8d77\u91cd\u81c2_m",
        "\u500d\u7387",
        "\u5c0f\u8f66\u5f62\u5f0f",
        "\u6700\u5c0f\u5e45\u5ea6_m",
        "\u6700\u5927\u8d77\u91cd\u91cf\u5e45\u5ea6_m",
        "\u6700\u5927\u8d77\u91cd\u91cf_t",
        "\u6a21\u5f0f",
        "\u6837\u672c\u9875\u7801",
        *[f"{radius:.1f}m_t" for radius in data.radii],
    ]
    with destination.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(headers)
        for row in sorted(data.rows, key=lambda item: (-item.jib, item.reeving, item.mode)):
            writer.writerow([
                number_text(row.jib),
                row.reeving,
                row.trolley if data.crane_type == "flat" else "",
                number_text(row.min_radius),
                number_text(row.max_load_radius),
                number_text(row.max_load),
                row.mode,
                row.page,
                *[
                    f"{row.capacities[radius]:.2f}" if radius in row.capacities else ""
                    for radius in data.radii
                ],
            ])


def model_card(data: ModelData) -> str:
    path = Path(data.source)
    max_jib = max(data.jibs)
    max_load = max(row.max_load for row in data.rows)
    tip_loads = [
        row.capacities[max_jib]
        for row in data.rows
        if row.jib == max_jib and max_jib in row.capacities
    ]
    jib_text = "、".join(number_text(value) for value in sorted(data.jibs))
    if data.model.startswith("RL"):
        type_text = "中联平头动臂塔机"
    elif data.model.startswith("LW"):
        type_text = "中联风电动臂塔机"
    elif data.crane_type == "luffing":
        type_text = "中联动臂塔机"
    else:
        type_text = "中联平头塔机"
    anomalies = []
    for row in data.rows:
        points = sorted(row.capacities.items())
        if any(right[1] > left[1] + 0.011 for left, right in zip(points, points[1:])):
            anomalies.append(f"{number_text(row.jib)}m/{row.reeving}倍率")
    anomaly_note = (
        f"- 源样本存在非单调印刷值（{'、'.join(anomalies)}）；"
        "知识库保留原值，网页选型按累计最小值保守处理。\n"
        if anomalies else ""
    )
    return f"""# 型号卡：{data.model}

## 来源与状态

- 状态：已确认入库
- 塔机类型：{type_text}
- 样本：`{path}`
- 样本页数：{data.page_count}页
- 原始样本归档：`原始样本/{path.name}`
- SHA-256：`{data.sha256}`
- 性能来源页：第{'、'.join(str(page) for page in data.performance_pages)}页 Load diagrams

## 型号概况

- 最大起重量：{number_text(max_load)} t。
- 最大臂长：{number_text(max_jib)} m。
- 样本列出的臂长：{jib_text} m。
- {number_text(max_jib)} m臂尖吊重：{number_text(max(tip_loads), 2) if tip_loads else '样本未列'} t。

## 完整起重性能表

- 普通工况：`起重性能-普通.csv`，共{len(data.rows)}行。
- 幅度档位：{number_text(min(data.radii))}～{number_text(max(data.radii))} m，按样本离散档位保存。
- 倍率按样本每行吊钩倍率图标识别，不按型号名称推断。
- 样本未明确列出的幅度不进行线性插值；网页选型保守读取不小于需求幅度的下一档性能。
{anomaly_note}

## 数据边界

- 本次入库面向起重性能查询和网页选型。
- 独立高度、基础反力、机构、配重、运输尺寸和重量等参数仍须回到本卡归档的原始样本逐项复核。
"""


def write_skill_files(data: ModelData) -> None:
    model_root = KNOWLEDGE_ROOT / data.model
    archive_root = model_root / "\u539f\u59cb\u6837\u672c"
    archive_root.mkdir(parents=True, exist_ok=True)
    write_csv(data, model_root / "\u8d77\u91cd\u6027\u80fd-\u666e\u901a.csv")
    (model_root / "\u578b\u53f7\u5361.md").write_text(model_card(data), encoding="utf-8")
    shutil.copy2(data.source, archive_root / Path(data.source).name)


def update_brand_index(results: list[ModelData], errors: list[dict]) -> None:
    index_path = KNOWLEDGE_ROOT / "品牌索引" / "中联.md"
    existing = index_path.read_text(encoding="utf-8")
    existing_models: dict[str, tuple[str, str]] = {}
    for line in existing.splitlines():
        match = re.match(r"\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|", line)
        if match and match.group(2).strip() != "型号":
            existing_models[match.group(2).strip()] = (match.group(1).strip(), match.group(3).strip())

    for data in results:
        if data.model.startswith("RL"):
            type_text = "平头动臂"
        elif data.model.startswith("LW"):
            type_text = "风电动臂"
        elif data.crane_type == "luffing":
            type_text = "动臂"
        else:
            type_text = "平臂"
        existing_models[data.model] = (type_text, f"../{data.model}/")

    order = {"平臂": 0, "动臂": 1, "平头动臂": 2, "风电动臂": 3}
    rows = [
        f"| {kind} | {model} | `{folder}` | 已确认 |"
        for model, (kind, folder) in sorted(
            existing_models.items(),
            key=lambda item: (order.get(item[1][0], 9), item[0]),
        )
    ]
    damaged = [error for error in errors if "R600-25" in Path(error["file"]).name]
    if damaged:
        rows.append("| 平臂 | R600-25 | — | 待补完整PDF（源文件为损坏的.drivedownload） |")

    loading_rules = existing[existing.index("## 加载规则"):]
    index_path.write_text(
        "# 中联已知型号索引\n\n"
        "| 塔机类型 | 型号 | 型号文件夹 | 档案状态 |\n"
        "|---|---|---|---|\n"
        + "\n".join(rows)
        + "\n\n"
        + loading_rules,
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="写入塔机专家知识库")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--models", nargs="*", default=[])
    parser.add_argument("--report", type=Path, default=Path("tmp/r-luffing-ingest-report.json"))
    args = parser.parse_args()

    samples, manifest = discover_samples()
    requested = {model.upper() for model in args.models}
    if requested:
        samples = [(path, kind) for path, kind in samples if model_from_path(path) in requested]

    results: list[ModelData] = []
    errors: list[dict] = []
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(parse_sample, str(path), kind): (path, kind)
            for path, kind in samples
        }
        for future in as_completed(futures):
            path, kind = futures[future]
            try:
                data = future.result()
                results.append(data)
                print(f"OK {data.model}: {len(data.jibs)}个臂长 / {len(data.rows)}行")
            except Exception as exc:  # noqa: BLE001 - batch report must retain every failed source
                errors.append({"file": str(path), "type": kind, "error": str(exc)})
                print(f"ERROR {path.name}: {exc}")

    results.sort(key=lambda item: item.model)
    report = {
        "samples": [data_summary(data) for data in results],
        "errors": errors,
        "manifest": manifest,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.write:
        for data in results:
            write_skill_files(data)
        update_brand_index(results, errors)
        batch_root = KNOWLEDGE_ROOT / "\u6279\u6b21\u6e05\u5355"
        batch_root.mkdir(parents=True, exist_ok=True)
        (batch_root / "2026-08-13-\u5927R\u4e0e\u52a8\u81c2\u6837\u672c.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    print(f"完成 {len(results)} 个型号，失败 {len(errors)} 个；报告：{args.report}")
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
