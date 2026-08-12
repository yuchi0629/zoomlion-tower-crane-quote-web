import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const knowledgeRoot = process.env.TOWER_CRANE_KNOWLEDGE_ROOT || join(
  homedir(),
  ".codex",
  "skills",
  "tower-crane-sample-reader",
  "references",
  "knowledge-base",
  "型号性能库",
);

const modelDefinitions = [
  { code: "R90-5", type: "flat", superlift: true },
  { code: "R135-8", type: "flat", superlift: true },
  { code: "R220-10", type: "flat", superlift: true },
  { code: "R275-12", type: "flat", superlift: true },
  { code: "R335-16", type: "flat", superlift: true },
  { code: "R370-20", type: "flat", superlift: true },
  { code: "L235-12", type: "luffing", superlift: false },
  { code: "WA5610-6", type: "flat", superlift: false },
  { code: "WA6013-6", type: "flat", superlift: false },
  { code: "WA6013-8", type: "flat", superlift: false },
  { code: "WA6017-8", type: "flat", superlift: false },
  { code: "WA6017-10", type: "flat", superlift: false },
  { code: "WA6515-8", type: "flat", superlift: false },
  { code: "WA6515-10", type: "flat", superlift: false },
  { code: "WA7015-10", type: "flat", superlift: false },
  { code: "WA7025-10", type: "flat", superlift: false },
  { code: "WA7025-12", type: "flat", superlift: false },
  { code: "WA7527-16", type: "flat", superlift: false },
  { code: "WA7527-20", type: "flat", superlift: false },
  { code: "WA350-16", type: "flat", superlift: false },
  { code: "WA350-20", type: "flat", superlift: false },
];

function number(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readCsvRows(path) {
  const workbook = XLSX.read(readFileSync(path, "utf8"), { type: "string", raw: true });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
    raw: true,
    defval: "",
  });
}

function parseCondition(modelCode, filename) {
  const sourcePath = join(knowledgeRoot, modelCode, filename);
  const [headers, ...dataRows] = readCsvRows(sourcePath);
  const reevingColumn = headers.indexOf("倍率");
  const trolleyColumn = headers.indexOf("小车形式");
  const minRadiusColumn = headers.indexOf("最小幅度_m");
  const maxLoadRadiusColumn = headers.indexOf("最大起重量幅度_m");
  const maxLoadColumn = headers.indexOf("最大起重量_t");
  const pointColumns = headers.flatMap((header, index) => {
    const match = String(header).match(/^(\d+(?:\.\d+)?)m_t$/);
    return match ? [{ index, radius: Number(match[1]) }] : [];
  });

  const jibs = new Map();
  dataRows.forEach(values => {
    const length = number(values[0]);
    const reeving = number(values[reevingColumn]);
    const minRadius = number(values[minRadiusColumn]);
    const maxLoadRadius = number(values[maxLoadRadiusColumn]);
    const maxLoad = number(values[maxLoadColumn]);
    if ([length, reeving, minRadius, maxLoadRadius, maxLoad].some(value => value == null)) return;

    const row = {
      reeving,
      minRadius,
      maxLoadRadius,
      maxLoad,
      points: pointColumns.flatMap(point => {
        const capacity = number(values[point.index]);
        return capacity == null ? [] : [[point.radius, capacity]];
      }),
    };
    if (trolleyColumn >= 0 && values[trolleyColumn]) row.trolley = String(values[trolleyColumn]);
    if (!jibs.has(length)) jibs.set(length, []);
    jibs.get(length).push(row);
  });

  return {
    sourceCsv: `型号性能库/${modelCode}/${filename}`,
    jibs: [...jibs.entries()]
      .map(([length, rows]) => ({ length, rows }))
      .sort((left, right) => left.length - right.length),
  };
}

const output = {
  schemaVersion: 1,
  source: "tower-crane-expert confirmed Zoomlion model performance library",
  sourceUpdated: "2026-08-12",
  models: modelDefinitions.map(definition => ({
    code: definition.code,
    type: definition.type,
    status: "confirmed",
    sourceCard: `型号性能库/${definition.code}/型号卡.md`,
    conditions: {
      normal: parseCondition(definition.code, "起重性能-普通.csv"),
      ...(definition.superlift
        ? { superlift: parseCondition(definition.code, "起重性能-超起.csv") }
        : {}),
    },
  })),
};

writeFileSync(
  join(projectRoot, "public", "data", "lifting-performance.json"),
  `${JSON.stringify(output)}\n`,
  "utf8",
);

console.log(`Generated ${output.models.length} confirmed Zoomlion performance models.`);
