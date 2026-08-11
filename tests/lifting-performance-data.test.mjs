import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const data = JSON.parse(readFileSync(new URL("../public/data/lifting-performance.json", import.meta.url), "utf8"));

test("ships all confirmed Zoomlion performance models from the expert library", () => {
  assert.deepEqual(
    data.models.map(model => model.code),
    ["R90-5", "R135-8", "R220-10", "R275-12", "R335-16", "R370-20", "L235-12"],
  );
  assert.equal(data.models.filter(model => model.type === "flat").length, 6);
  assert.equal(data.models.filter(model => model.conditions.superlift).length, 6);
  assert.equal(data.models.filter(model => model.type === "luffing").length, 1);
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
