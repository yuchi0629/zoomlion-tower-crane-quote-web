import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("top bar exposes one combined document generation action", () => {
  assert.match(source, /generateQuote:\s*"生成报价单及选配指导"/);
  assert.doesNotMatch(source, /onClick=\{generateLtc\}/);
  assert.doesNotMatch(source, /onClick=\{exportConfigurationWorkbook\}/);
  assert.doesNotMatch(source, /scrollIntoView/);
});

test("top bar exposes an order configuration workbook action", () => {
  assert.match(source, /generateOrderWorkbook/);
  assert.match(source, /onClick=\{generateOrderWorkbook\}/);
  assert.match(source, /generateOrderWorkbookLabel/);
  assert.match(source, /downloadOrderWorkbook\(workbook, filename\);[\s\S]*alert\(L\.orderWorkbookDone\)/);
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

test("uses equal product columns and places price after configuration and options", () => {
  const productStart = source.indexOf('<section className="top-grid">');
  const tablesStart = source.indexOf('<section className="tables">');
  const priceStart = source.indexOf('<section className="price-panel panel">');
  const quoteStart = source.indexOf('<section className="panel" id="quote-panel">');

  assert.ok(productStart < tablesStart && tablesStart < priceStart && priceStart < quoteStart);
  assert.match(styles, /\.top-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});
