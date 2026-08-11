import assert from "node:assert/strict";
import test from "node:test";

import { capacityAt, selectTowerCranes } from "../src/selector-engine.js";

function row({ maxLoad = 10, maxLoadRadius = 20, minRadius = 3, points = [], reeving = 4 } = {}) {
  return { maxLoad, maxLoadRadius, minRadius, points, reeving };
}

function model({ code, type = "flat", normal, superlift }) {
  return {
    code,
    type,
    conditions: {
      normal: { jibs: normal },
      ...(superlift ? { superlift: { jibs: superlift } } : {}),
    },
  };
}

test("uses the next larger catalog radius without interpolation", () => {
  const result = capacityAt(row({
    maxLoad: 8,
    maxLoadRadius: 20,
    points: [[25, 6], [30, 5], [35, 4]],
  }), 28);

  assert.deepEqual(result, { capacity: 5, lookupRadius: 30 });
});

test("selects the shortest jib that satisfies every lifting point", () => {
  const cranes = [model({
    code: "R-MULTI",
    normal: [
      { length: 50, rows: [row({ points: [[40, 4], [50, 2]] })] },
      { length: 60, rows: [row({ points: [[40, 4], [50, 3], [60, 2]] })] },
    ],
  })];

  const result = selectTowerCranes(cranes, {
    type: "flat",
    requirements: [{ radius: 45, load: 2.5 }, { radius: 55, load: 1.5 }],
  });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].jibLength, 60);
  assert.equal(result.matches[0].condition, "normal");
  assert.deepEqual(result.matches[0].points.map(point => point.lookupRadius), [50, 60]);
  assert.deepEqual(result.matches[0].points.map(point => point.surplus), [0.5, 0.5]);
});

test("does not expose superlift when the normal condition satisfies all points", () => {
  const cranes = [model({
    code: "R-NORMAL",
    normal: [{ length: 50, rows: [row({ points: [[50, 3]] })] }],
    superlift: [{ length: 50, rows: [row({ points: [[50, 4]] })] }],
  })];

  const result = selectTowerCranes(cranes, {
    type: "flat",
    requirements: [{ radius: 50, load: 2.5 }],
  });

  assert.equal(result.matches[0].condition, "normal");
  assert.equal(result.matches[0].points[0].capacity, 3);
});

test("uses superlift only when the normal condition cannot satisfy all points", () => {
  const cranes = [model({
    code: "R-SUPER",
    normal: [{ length: 50, rows: [row({ points: [[50, 2]] })] }],
    superlift: [{ length: 50, rows: [row({ points: [[50, 3]] })] }],
  })];

  const result = selectTowerCranes(cranes, {
    type: "flat",
    requirements: [{ radius: 50, load: 2.5 }],
  });

  assert.equal(result.matches[0].condition, "superlift");
  assert.equal(result.matches[0].points[0].capacity, 3);
});

test("ranks normal-condition matches by the smallest average surplus ratio", () => {
  const cranes = [
    model({ code: "R-LARGE", normal: [{ length: 50, rows: [row({ points: [[50, 4]] })] }] }),
    model({ code: "R-CLOSE", normal: [{ length: 50, rows: [row({ points: [[50, 3]] })] }] }),
  ];

  const result = selectTowerCranes(cranes, {
    type: "flat",
    requirements: [{ radius: 50, load: 2.5 }],
  });

  assert.deepEqual(result.matches.map(item => item.code), ["R-CLOSE", "R-LARGE"]);
});

test("ranks a closer superlift match ahead of an oversized normal-condition match", () => {
  const cranes = [
    model({ code: "R-NORMAL-LARGE", normal: [{ length: 50, rows: [row({ points: [[50, 4]] })] }] }),
    model({
      code: "R-SUPER-CLOSE",
      normal: [{ length: 50, rows: [row({ points: [[50, 2]] })] }],
      superlift: [{ length: 50, rows: [row({ points: [[50, 3]] })] }],
    }),
  ];

  const result = selectTowerCranes(cranes, {
    type: "flat",
    requirements: [{ radius: 50, load: 2.5 }],
  });

  assert.deepEqual(result.matches.map(item => item.code), ["R-SUPER-CLOSE", "R-NORMAL-LARGE"]);
});

test("filters flat and luffing cranes independently", () => {
  const cranes = [
    model({ code: "R-FLAT", type: "flat", normal: [{ length: 50, rows: [row({ points: [[50, 3]] })] }] }),
    model({ code: "L-LUFF", type: "luffing", normal: [{ length: 50, rows: [row({ points: [[50, 3]] })] }] }),
  ];

  const result = selectTowerCranes(cranes, {
    type: "luffing",
    requirements: [{ radius: 50, load: 2.5 }],
  });

  assert.deepEqual(result.matches.map(item => item.code), ["L-LUFF"]);
});
