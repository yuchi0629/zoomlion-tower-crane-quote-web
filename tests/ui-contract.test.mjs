import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("top bar generates only the quotation PDF", () => {
  assert.match(source, /generateQuote:\s*"生成报价单"/);
  assert.match(source, /generateQuoteShort:\s*"报价单"/);
  const quoteStart = source.indexOf("async function generateQuotation");
  const quoteEnd = source.indexOf("async function generateOrderWorkbook", quoteStart);
  assert.doesNotMatch(source.slice(quoteStart, quoteEnd), /ltcHtml|LTC选配指导文件/);
  assert.doesNotMatch(source, /onClick=\{generateLtc\}/);
  assert.doesNotMatch(source, /onClick=\{exportConfigurationWorkbook\}/);
  assert.doesNotMatch(source, /scrollIntoView/);
});

test("top bar exposes an order configuration workbook action", () => {
  assert.match(source, /generateOrderWorkbook/);
  assert.match(source, /onClick=\{generateOrderWorkbook\}/);
  assert.match(source, /generateOrderWorkbookLabel/);
  assert.match(source, /downloadOrderWorkbook\(workbook, filename\);[\s\S]*alert\(L\.orderWorkbookDone\)/);
  assert.match(source, /downloadOrderWorkbook\(workbook, filename\);[\s\S]*savePdf\(`LTC选配指导文件_\$\{/);
  assert.match(source, /function ltcHtml/);
  assert.match(source, /L\.noneSelected/);
  assert.doesNotMatch(source, /downloadOrderWorkbookLabel/);
  assert.doesNotMatch(source, /orderDownload/);
  assert.doesNotMatch(source, /order-download-link/);
  assert.doesNotMatch(source, /import\("\.\/order-workbook\.js"\)/);
});

test("quotation remarks are editable and included in the quotation PDF", () => {
  assert.match(source, /remark:\s*"备注"/);
  assert.match(source, /remark:\s*""/);
  assert.match(source, /updateQuoteInfo\("remark"/);
  assert.match(source, /L\.remark[\s\S]*quoteInfo\.remark/);
});

test("package detail table omits item number and retains designation", () => {
  const modalStart = source.indexOf('<div className="table-wrap package-table">');
  assert.notEqual(modalStart, -1);
  const modalTable = source.slice(modalStart, source.indexOf("</table>", modalStart));
  assert.doesNotMatch(modalTable, /L\.itemNo/);
  assert.doesNotMatch(modalTable, /<td>\{tr\(row\.code\)/);
  assert.match(modalTable, /L\.designation/);
  assert.match(modalTable, /row\.modelCode/);
});

test("trade term, trade location and customer are part of quotation information", () => {
  const productStart = source.indexOf('<section className="top-grid">');
  const quoteStart = source.indexOf('<section className="panel" id="quote-panel">');
  const quoteEnd = source.indexOf("</section>", quoteStart);
  const productArea = source.slice(productStart, quoteStart);
  const quoteArea = source.slice(quoteStart, quoteEnd);

  assert.doesNotMatch(productArea, /label=\{L\.(tradeTerm|tradePlace|customer)\}/);
  assert.match(quoteArea, /label=\{L\.tradeTerm\}/);
  assert.match(quoteArea, /label=\{L\.tradePlace\}/);
  assert.match(quoteArea, /label=\{L\.customer\}/);
});

test("currency is placed in the FOB price panel and language uses the short label", () => {
  assert.match(source, /language:\s*"语言"/);
  const productStart = source.indexOf('<section className="top-grid">');
  const priceStart = source.indexOf('<section className="price-panel panel">');
  const priceEnd = source.indexOf("</section>", priceStart);
  assert.doesNotMatch(source.slice(productStart, priceStart), /label=\{L\.currency\}/);
  assert.match(source.slice(priceStart, priceEnd), /aria-label=\{L\.currency\}/);
  assert.match(source.slice(priceStart, priceEnd), /<span className="badge">FOB<\/span>/);
  assert.doesNotMatch(source.slice(priceStart, priceEnd), /<span className="badge">\{tradeTerm\}/);
});

test("clicking the header crane opens protected price settings", () => {
  assert.match(source, /className="logo-button"/);
  assert.match(source, /setAdminModal\("login"\)/);
  assert.match(source, /adminPassword\s*!==\s*"123\."/);
  assert.match(source, /externalPremiumRate/);
  assert.match(source, /actualSalesPrice/);
});

test("exchange-rate provider branding is not displayed", () => {
  assert.match(source, /api\.frankfurter\.dev/);
  assert.doesNotMatch(source, /exchangerate-api\.com/);
  assert.doesNotMatch(source, /Rates by Exchange Rate API/);
});

test("option rows hide reference prices but keep option total pricing", () => {
  const optionsStart = source.indexOf('<SectionTitle title={L.options}');
  const optionsEnd = source.indexOf("</section>", optionsStart);
  const optionsArea = source.slice(optionsStart, optionsEnd);
  assert.doesNotMatch(optionsArea, /L\.itemPrice/);
  assert.doesNotMatch(optionsArea, /formatMoney\(priceWithPremium\(optionPrice/);
  assert.match(source, /const displayedOptionTotal = priceWithPremium\(optionTotal/);
  assert.match(source, /<span>\{L\.optionPrice\}<\/span><strong>\{formatMoney\(displayedOptionTotal/);
});

test("labels the machine and optional-parts prices precisely in every language", () => {
  assert.match(source, /machinePrice: "主机价格"/);
  assert.match(source, /optionPrice: "选配件价格"/);
  assert.match(source, /machinePrice: "Main Unit Price"/);
  assert.match(source, /optionPrice: "Optional Parts Price"/);
  assert.doesNotMatch(source, /machinePrice: "整机价格"/);
  assert.doesNotMatch(source, /optionPrice: "选配价格"/);
});

test("places language first and keeps product selection free of form and count controls", () => {
  const languageStart = source.indexOf('className="top-language-control"');
  const selectorStart = source.indexOf("<TowerCraneSelector");
  const productStart = source.indexOf('<section className="top-grid">');
  const productEnd = source.indexOf("</section>", productStart);
  const productArea = source.slice(productStart, productEnd);

  assert.ok(languageStart > -1 && languageStart < selectorStart);
  assert.doesNotMatch(productArea, /L\.modelCount|L\.formCount/);
  assert.doesNotMatch(productArea, /label=\{L\.form\}/);
  assert.doesNotMatch(productArea, /label=\{L\.language\}/);
});

test("keeps the three mobile header controls side by side with equal height and no language caption", () => {
  const languageStart = source.indexOf('className="top-language-control"');
  const languageEnd = source.indexOf("</label>", languageStart);
  const languageControl = source.slice(languageStart, languageEnd);

  assert.doesNotMatch(languageControl, /<span>\{L\.language\}<\/span>/);
  assert.match(languageControl, /aria-label=\{L\.language\}/);
  assert.match(styles, /@media \(max-width:\s*760px\)[\s\S]*?\.top-actions\s*\{/);
  assert.match(styles, /--mobile-action-height:\s*44px/);
  assert.match(styles, /--mobile-action-font-size:\s*clamp\(/);
  assert.match(styles, /grid-template-columns:\s*clamp\(76px,\s*23vw,\s*88px\)\s+minmax\(0,\s*1\.35fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(styles, /\.title-block h1\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(styles, /\.top-actions\s*\{[\s\S]*?max-width:\s*calc\(100vw\s*-\s*24px\)/);
  assert.match(styles, /\.top-actions \.btn\s*\{[\s\S]*?height:\s*var\(--mobile-action-height\)/);
  assert.match(styles, /\.top-actions \.btn\s*\{[\s\S]*?font-size:\s*var\(--mobile-action-font-size\)/);
  assert.match(styles, /\.top-actions \.btn\s*\{[\s\S]*?white-space:\s*nowrap/);
  assert.match(styles, /\.top-language-control select\s*\{[\s\S]*?height:\s*var\(--mobile-action-height\)/);
  assert.match(styles, /\.top-language-control select\s*\{[\s\S]*?font-size:\s*var\(--mobile-action-font-size\)/);
  assert.match(source, /className="mobile-action-label"/);
});

test("offers Turkish with complete runtime data translations", () => {
  assert.match(source, /tr:\s*"Türkçe"/);
  assert.match(source, /tr:\s*\{/);
  assert.match(source, /translations\?\.tr/);
});

test("uses equal product columns and places price after configuration and options", () => {
  const productStart = source.indexOf('<section className="top-grid">');
  const tablesStart = source.indexOf('<section className="tables">');
  const priceStart = source.indexOf('<section className="price-panel panel">');
  const quoteStart = source.indexOf('<section className="panel" id="quote-panel">');

  assert.ok(productStart < tablesStart && tablesStart < priceStart && priceStart < quoteStart);
  assert.match(styles, /\.top-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test("groups quotation information into three modules inside one outer panel", () => {
  const quoteStart = source.indexOf('<section className="panel" id="quote-panel">');
  const quoteEnd = source.indexOf("</section>", quoteStart);
  const quoteArea = source.slice(quoteStart, quoteEnd);

  assert.match(quoteArea, /className="quote-subsection"[\s\S]*L\.quotationDetails/);
  assert.match(quoteArea, /className="quote-subsection"[\s\S]*L\.contactDetails/);
  assert.match(quoteArea, /className="quote-subsection"[\s\S]*L\.tradeTerms/);
  assert.match(quoteArea, /label=\{L\.quotationPrice\}/);
  assert.match(styles, /\.quote-subsection\s*\{/);
});

test("uses the editable quotation price in the PDF and starts each page load at ten percent premium", () => {
  assert.match(source, /quotationPrice:\s*"报价"/);
  assert.match(source, /useState\(10\)/);
  assert.doesNotMatch(source, /savedPremiumRate/);
  assert.match(source, /const quotationPrice = quotationPriceCny === ""[\s\S]*displayedTotalPrice/);
  assert.match(source, /function updateQuotationPrice/);
  assert.match(source, /const unitPrice = `[\s\S]*formatNumber\(quotationPrice\)/);
  assert.doesNotMatch(source, /const unitPrice = `[\s\S]*formatNumber\(displayedTotalPrice\)/);
});
