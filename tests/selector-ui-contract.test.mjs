import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const selectorSource = readFileSync(new URL("../src/TowerCraneSelector.jsx", import.meta.url), "utf8");
const selectorStyles = readFileSync(new URL("../src/selector.css", import.meta.url), "utf8");

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

test("describes performance matching without performance inventory totals", () => {
  assert.match(selectorSource, /输入全部吊点要求，匹配可满足性能的机型。/);
  assert.match(selectorSource, /正式工程应按具体样本、配置和项目条件复核。/);
  assert.doesNotMatch(selectorSource, /选型结果基于已录入厂家样本性能/);
  assert.doesNotMatch(selectorSource, /flatCount|luffingCount|totalCount|selector-data-count/);
});

test("describes the selected result as based on a jib length", () => {
  assert.match(selectorSource, /basedOnJib: "基于"/);
  assert.match(selectorSource, /jibLengthSuffix: "m 臂长"/);
  assert.doesNotMatch(selectorSource, /shortestJib: "最小臂长"/);
  assert.match(selectorSource, /labels\.basedOnJib/);
  assert.match(selectorSource, /labels\.jibLengthSuffix/);
});

test("stacks radius performance requirements above matching results without inventory totals", () => {
  assert.match(selectorSource, /requirements: "幅度性能需求"/);
  assert.doesNotMatch(selectorSource, /selector-data-count/);
  assert.doesNotMatch(selectorSource, /labels\.loaded/);
  assert.match(selectorStyles, /\.selector-workspace\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(selectorStyles, /\.selector-requirements\s*\{[\s\S]*?border-bottom:/);
});
