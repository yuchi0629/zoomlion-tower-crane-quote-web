import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { selectTowerCranes } from "../src/selector-engine.js";

const data = JSON.parse(readFileSync(new URL("../public/data/lifting-performance.json", import.meta.url), "utf8"));

test("ships all confirmed Zoomlion performance models from the expert library", () => {
  assert.deepEqual(
    data.models.map(model => model.code),
    [
      "R90-5", "R135-8", "R220-10", "R275-12", "R335-16", "R370-20", "L235-12",
      "WA5610-6", "WA6013-6", "WA6013-8", "WA6017-8", "WA6017-10",
      "WA6515-8", "WA6515-10", "WA7015-10", "WA7025-10", "WA7025-12",
      "WA7527-16", "WA7527-20", "WA350-16", "WA350-20",
    ],
  );
  assert.equal(data.models.filter(model => model.type === "flat").length, 20);
  assert.equal(data.models.filter(model => model.conditions.superlift).length, 6);
  assert.equal(data.models.filter(model => model.type === "luffing").length, 1);
});

test("WA series is available only in the independent selector with sample-backed normal curves", () => {
  const waModels = data.models.filter(model => model.code.startsWith("WA"));
  assert.equal(waModels.length, 14);
  waModels.forEach(model => {
    assert.equal(model.type, "flat");
    assert.ok(model.conditions.normal);
    assert.equal(model.conditions.superlift, undefined);
    assert.match(model.conditions.normal.sourceCsv, new RegExp(`/${model.code}/`));
    model.conditions.normal.jibs.forEach(jib => {
      assert.deepEqual(jib.rows.map(row => [row.reeving, row.trolley]), [
        [2, "单小车"],
        [4, "双小车"],
      ]);
    });
  });
});

test("every performance condition contains traceable source data and usable curves", () => {
  data.models.forEach(model => {
    assert.equal(model.status, "confirmed");
    assert.match(model.sourceCard, /型号卡\.md$/);
    Object.values(model.conditions).forEach(condition => {
      assert.match(condition.sourceCsv, /起重性能-/);
      assert.ok(condition.jibs.length > 0);
      condition.jibs.forEach(jib => {
        assert.ok(jib.length > 0);
        assert.ok(jib.rows.length > 0);
      });
    });
  });
});

test("new WA curves participate in selection without changing quotation data", () => {
  const result = selectTowerCranes(data.models, {
    type: "flat",
    requirements: [{ radius: 80, load: 2 }],
  });
  assert.deepEqual(result.matches.slice(0, 2).map(model => model.code), ["WA350-16", "WA350-20"]);
  assert.ok(result.matches.slice(0, 2).every(model => (
    model.condition === "normal" && model.jibLength === 80
  )));
});
