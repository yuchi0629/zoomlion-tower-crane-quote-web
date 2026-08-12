import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { selectTowerCranes } from "../src/selector-engine.js";

const data = JSON.parse(readFileSync(new URL("../public/data/lifting-performance.json", import.meta.url), "utf8"));

test("ships all confirmed Zoomlion performance models from the expert library", () => {
  assert.deepEqual(
    data.models.map(model => model.code).sort(),
    [
      "R90-5", "R135-8", "R220-10", "R275-12", "R335-16", "R370-20", "L235-12",
      "R500-25", "R600-32", "R800-32", "R800-40", "R1000-50", "R1300-64",
      "R1660-80", "R2300-80", "R2300-100", "R2300-120", "R3200-160",
      "R4300-200", "R6600-240", "R7150-260", "R8000-320", "R12000-450",
      "R23800-730", "L125-8", "L125-10", "L140-10", "L200-12", "L200-16",
      "L250-16", "L275-16", "L315-20", "L400-25", "L500A-32", "L650-50",
      "LH650-50", "L760-50", "L900-50", "L1600-64", "LH3350-120", "RL125-8",
      "RL165-10", "RL205-10", "RL205-12", "RL250-12", "RL250-16", "LW2800A-200NA",
      "WA5610-6", "WA6013-6", "WA6013-8", "WA6017-8", "WA6017-10",
      "WA6515-8", "WA6515-10", "WA7015-10", "WA7025-10", "WA7025-12",
      "WA7527-16", "WA7527-20", "WA350-16", "WA350-20",
    ].sort(),
  );
  assert.equal(data.models.length, 61);
  assert.equal(data.models.filter(model => model.type === "flat").length, 37);
  assert.equal(data.models.filter(model => model.conditions.superlift).length, 6);
  assert.equal(data.models.filter(model => model.type === "luffing").length, 24);
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

test("large R and luffing samples expose sample-backed rows and special modes", () => {
  const r23800 = data.models.find(model => model.code === "R23800-730");
  assert.equal(r23800.conditions.normal.jibs.at(-1).length, 70);
  assert.deepEqual(
    r23800.conditions.normal.jibs.at(-1).rows.map(row => row.reeving),
    [4, 6, 8, 12],
  );

  const rl = data.models.find(model => model.code === "RL125-8");
  assert.deepEqual(
    [...new Set(rl.conditions.normal.jibs.flatMap(jib => jib.rows.map(row => row.mode)))].sort(),
    ["动臂模式（不含小车）", "动臂模式（含小车）", "水平小车模式"].sort(),
  );

  const lw = data.models.find(model => model.code === "LW2800A-200NA");
  assert.deepEqual([...new Set(lw.conditions.normal.jibs.map(jib => jib.length))], [50, 60, 70]);
  assert.ok(lw.conditions.normal.jibs.flatMap(jib => jib.rows).every(row => /m HUH$/.test(row.mode)));
  assert.ok(lw.conditions.normal.jibs.every(jib => (
    new Set(jib.rows.map(row => row.mode)).size === 1
  )));
});

test("web selector points are monotonic after conservative source cleanup", () => {
  data.models.forEach(model => {
    Object.values(model.conditions).forEach(condition => {
      condition.jibs.forEach(jib => {
        jib.rows.forEach(row => {
          row.points.slice(1).forEach((point, index) => {
            assert.ok(point[1] <= row.points[index][1] + 1e-9, `${model.code} ${jib.length}m`);
          });
        });
      });
    });
  });
});
