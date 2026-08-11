import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const selectorSource = readFileSync(new URL("../src/TowerCraneSelector.jsx", import.meta.url), "utf8");

test("places an independent tower-crane selector before quotation product selection", () => {
  assert.match(mainSource, /<TowerCraneSelector/);
  assert.ok(mainSource.indexOf("<TowerCraneSelector") < mainSource.indexOf('<section className="top-grid">'));
  assert.doesNotMatch(selectorSource, /setModelName|selectModel|onSelectModel/);
});

test("supports multiple removable lifting requirements", () => {
  assert.match(selectorSource, /addRequirement/);
  assert.match(selectorSource, /removeRequirement/);
  assert.match(selectorSource, /requirements\.map/);
  assert.match(selectorSource, /type="number"/);
});

test("shows only the top three matches until the full list is expanded", () => {
  assert.match(selectorSource, /matches\.slice\(0, 3\)/);
  assert.match(selectorSource, /setExpanded/);
  assert.match(selectorSource, /expanded \? matches/);
});

test("provides flat and luffing selection with four-language labels", () => {
  assert.match(selectorSource, /flat/);
  assert.match(selectorSource, /luffing/);
  assert.match(selectorSource, /zh:/);
  assert.match(selectorSource, /en:/);
  assert.match(selectorSource, /fr:/);
  assert.match(selectorSource, /de:/);
});
