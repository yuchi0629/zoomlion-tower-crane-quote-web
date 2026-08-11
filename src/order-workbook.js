import XLSX from "xlsx-js-style";

const HEADER_COLOR = "AADB1E";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalized(value) {
  return String(value ?? "").replace(/\s+/g, "").toLowerCase();
}

function safeSheetName(value) {
  const name = String(value || "Order Configuration").replace(/[\\/?*\[\]:]/g, "_");
  return name.slice(0, 31) || "Order Configuration";
}

function copySheetCells(source, target, rowOffset) {
  const range = XLSX.utils.decode_range(source["!ref"] || "A1:A1");
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const sourceAddress = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = source[sourceAddress];
      if (!cell) continue;
      const targetAddress = XLSX.utils.encode_cell({ r: row + rowOffset, c: column });
      target[targetAddress] = clone(cell);
    }
  }
  return range;
}

function offsetMerges(merges, rowOffset) {
  return (merges || []).map(range => ({
    s: { r: range.s.r + rowOffset, c: range.s.c },
    e: { r: range.e.r + rowOffset, c: range.e.c },
  }));
}

function combineColumns(first, second, maxColumn) {
  return Array.from({ length: maxColumn + 1 }, (_, index) => {
    const left = first?.[index] || {};
    const right = second?.[index] || {};
    return { ...clone(left), ...clone(right), wch: Math.max(left.wch || 0, right.wch || 0) || undefined };
  });
}

function styleHeaderRows(sheet, rows, maxColumn) {
  rows.forEach(row => {
    for (let column = 0; column <= maxColumn; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      if (!sheet[address]) sheet[address] = { t: "s", v: "" };
      const currentStyle = sheet[address].s || {};
      sheet[address].s = {
        ...currentStyle,
        font: { ...(currentStyle.font || {}), name: "Arial", sz: 10, bold: true },
        fill: { patternType: "solid", fgColor: { rgb: HEADER_COLOR } },
        alignment: { ...(currentStyle.alignment || {}), vertical: "center", wrapText: true },
      };
    }
  });
}

function findFormColumn(sheet, formName, maxColumn) {
  const target = normalized(formName);
  for (let column = 0; column <= maxColumn; column += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 3, c: column })];
    const candidate = normalized(cell?.v);
    if (candidate && (candidate === target || candidate.includes(target) || target.includes(candidate))) {
      return column;
    }
  }
  return Math.min(4, maxColumn);
}

function flattenedOptions(optionRows, selected) {
  return optionRows.flatMap((item, index) => {
    const rows = item.children?.length ? item.children : [item];
    return rows.map(row => ({ row, selection: selected[index] || { checked: false, qty: 1, type: "addition" } }));
  });
}

export function selectionMark(selection) {
  if (!selection?.checked) return "○";
  const numericQuantity = Number(selection.qty);
  const quantity = Number.isFinite(numericQuantity) && numericQuantity > 0 ? numericQuantity : 1;
  return `${selection.type === "deduction" ? "-" : "●"}×${quantity}`;
}

export function buildOrderWorkbook({ workbookBase64, formName, optionRows, selected, sheetName }) {
  const sourceWorkbook = XLSX.read(workbookBase64, { type: "base64", cellStyles: true });
  if (sourceWorkbook.SheetNames.length < 2) {
    throw new Error("The configuration workbook must contain standard and option lists.");
  }

  const standardSheet = sourceWorkbook.Sheets[sourceWorkbook.SheetNames[0]];
  const optionSheet = sourceWorkbook.Sheets[sourceWorkbook.SheetNames[1]];
  const standardRange = XLSX.utils.decode_range(standardSheet["!ref"] || "A1:A1");
  const optionRange = XLSX.utils.decode_range(optionSheet["!ref"] || "A1:A1");
  const activeFormColumn = findFormColumn(optionSheet, formName, optionRange.e.c);

  flattenedOptions(optionRows, selected).forEach((item, index) => {
    const address = XLSX.utils.encode_cell({ r: 4 + index, c: activeFormColumn });
    const previous = optionSheet[address] || { t: "s", v: "" };
    optionSheet[address] = { ...clone(previous), t: "s", v: selectionMark(item.selection) };
  });

  const combined = {};
  const standardCopiedRange = copySheetCells(standardSheet, combined, 0);
  const optionRowOffset = standardCopiedRange.e.r + 1;
  const optionCopiedRange = copySheetCells(optionSheet, combined, optionRowOffset);
  const maxColumn = Math.max(standardCopiedRange.e.c, optionCopiedRange.e.c);
  combined["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: optionRowOffset + optionCopiedRange.e.r, c: maxColumn },
  });
  combined["!merges"] = [
    ...offsetMerges(standardSheet["!merges"], 0),
    ...offsetMerges(optionSheet["!merges"], optionRowOffset),
  ];
  combined["!cols"] = combineColumns(standardSheet["!cols"], optionSheet["!cols"], maxColumn);
  combined["!rows"] = [
    ...clone(standardSheet["!rows"] || []),
    ...clone(optionSheet["!rows"] || []),
  ];

  styleHeaderRows(combined, [0, 2, 3, optionRowOffset, optionRowOffset + 2, optionRowOffset + 3], maxColumn);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, combined, safeSheetName(sheetName));
  return workbook;
}

export function serializeOrderWorkbook(workbook) {
  return XLSX.write(workbook, { type: "array", bookType: "xlsx", compression: true, cellStyles: true });
}

export function createOrderWorkbookDataUrl(workbook) {
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx", compression: true, cellStyles: true });
  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
}

export function downloadOrderWorkbook(workbook, filename) {
  const url = createOrderWorkbookDataUrl(workbook);
  return { url, filename };
}
