import assert from "node:assert/strict";
import test from "node:test";
import XLSX from "xlsx-js-style";

import {
  buildOrderWorkbook,
  createOrderWorkbookUrl,
  downloadOrderWorkbook,
  selectionMark,
  serializeOrderWorkbook,
} from "../src/order-workbook.js";

function sourceWorkbookBase64() {
  const basic = XLSX.utils.aoa_to_sheet([
    ["R220标准配置清单", "", "", "", "", ""],
    ["版本号：V1.0 发布日期：2026-6-27", "", "", "", "", ""],
    ["序号", "组成", "名称", "代号", "“●”标配 “○”选配 “-”不配", ""],
    ["", "", "", "", "支腿固定式", "底架固定式"],
    [1, "上装总成", "起重臂", "BJ", "●", "●"],
  ]);
  basic["!merges"] = [
    XLSX.utils.decode_range("A1:F1"),
    XLSX.utils.decode_range("A2:F2"),
    XLSX.utils.decode_range("A3:A4"),
    XLSX.utils.decode_range("E3:F3"),
  ];
  basic.A1.s = { fill: { patternType: "solid", fgColor: { rgb: "AADB1E" } } };

  const options = XLSX.utils.aoa_to_sheet([
    ["R220增减配清单", "", "", "", "", ""],
    ["版本号：V1.0 发布日期：2026-6-27", "", "", "", "", ""],
    ["序号", "组成", "名称", "代号", "“●”标配 “○”选配 “-”不配", ""],
    ["", "", "", "", "支腿固定式", "底架固定式"],
    [1, "爬升部件包", "爬升架", "PA", "○", "○"],
    ["", "", "泵站", "PB", "○", "○"],
    [2, "选配", "防碰撞系统", "PC", "○", "○"],
  ]);
  options["!merges"] = [
    XLSX.utils.decode_range("A1:F1"),
    XLSX.utils.decode_range("A2:F2"),
    XLSX.utils.decode_range("E3:F3"),
    XLSX.utils.decode_range("A5:A6"),
    XLSX.utils.decode_range("B5:B6"),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, basic, "配置清单");
  XLSX.utils.book_append_sheet(workbook, options, "增减配清单");
  return XLSX.write(workbook, { type: "base64", bookType: "xlsx", cellStyles: true });
}

test("selection marks preserve the chosen quantity", () => {
  assert.equal(selectionMark({ checked: true, qty: 3, type: "addition" }), "●×3");
  assert.equal(selectionMark({ checked: true, qty: 2, type: "deduction" }), "-×2");
  assert.equal(selectionMark({ checked: false, qty: 9, type: "addition" }), "○");
});

test("combines standard and option sheets while retaining merges and applying package quantity", () => {
  const result = buildOrderWorkbook({
    workbookBase64: sourceWorkbookBase64(),
    formName: "支腿固定式",
    optionRows: [
      { children: [{ name: "爬升架" }, { name: "泵站" }] },
      { name: "防碰撞系统" },
    ],
    selected: {
      0: { checked: true, qty: 3, type: "addition" },
      1: { checked: false, qty: 1, type: "addition" },
    },
    sheetName: "订单配置表",
  });

  assert.deepEqual(result.SheetNames, ["订单配置表"]);
  const sheet = result.Sheets["订单配置表"];
  assert.equal(sheet.E10.v, "●×3");
  assert.equal(sheet.E11.v, "●×3");
  assert.equal(sheet.E12.v, "○");
  assert.equal(sheet.E4.v, "支腿固定式");
  assert.equal(sheet.F4, undefined);
  assert.equal(sheet["!ref"], "A1:E12");
  assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "A1:E1"));
  assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "A7:E7"));
  assert.equal(sheet.A9.s.fill.fgColor.rgb, "AADB1E");
  const bytes = serializeOrderWorkbook(result);
  assert.ok(bytes.byteLength > 1000);
  const workbookUrl = createOrderWorkbookUrl(result);
  assert.match(workbookUrl, /^blob:/);
  URL.revokeObjectURL(workbookUrl);
  const events = [];
  const anchor = {
    click: () => events.push("click"),
    remove: () => events.push("remove"),
  };
  const runtime = {
    Blob,
    URL: {
      createObjectURL: () => "blob:order-workbook",
      revokeObjectURL: url => events.push(`revoke:${url}`),
    },
    document: {
      createElement: tag => {
        assert.equal(tag, "a");
        return anchor;
      },
      body: { appendChild: element => assert.equal(element, anchor) },
    },
    setTimeout: callback => callback(),
  };
  const download = downloadOrderWorkbook(result, "R220订单配置表.xlsx", runtime);
  assert.equal(download.filename, "R220订单配置表.xlsx");
  assert.equal(download.url, "blob:order-workbook");
  assert.deepEqual(events, ["click", "remove", "revoke:blob:order-workbook"]);
  assert.equal(anchor.href, "blob:order-workbook");
  assert.equal(anchor.download, "R220订单配置表.xlsx");
});

test("keeps only the selected base-frame installation column", () => {
  const result = buildOrderWorkbook({
    workbookBase64: sourceWorkbookBase64(),
    formName: "底架固定式",
    optionRows: [
      { children: [{ name: "爬升架" }, { name: "泵站" }] },
      { name: "防碰撞系统" },
    ],
    selected: {
      0: { checked: true, qty: 2, type: "addition" },
      1: { checked: false, qty: 1, type: "addition" },
    },
    sheetName: "订单配置表",
  });

  const sheet = result.Sheets["订单配置表"];
  assert.equal(sheet.E4.v, "底架固定式");
  assert.equal(sheet.E10.v, "●×2");
  assert.equal(sheet.E11.v, "●×2");
  assert.equal(sheet.F4, undefined);
  assert.equal(sheet["!ref"], "A1:E12");
  assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "A1:E1"));
  assert.ok(sheet["!merges"].some(range => XLSX.utils.encode_range(range) === "A7:E7"));
});
