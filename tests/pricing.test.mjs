import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateSalesPremium,
  convertFromCny,
  premiumRateOptions,
  priceWithPremium,
} from "../src/pricing.js";

const rates = { CNY: 1, USD: 0.15, EUR: 0.13 };

test("converts database CNY prices to the selected currency", () => {
  assert.equal(convertFromCny(100, "CNY", rates), 100);
  assert.equal(convertFromCny(100, "USD", rates), 15);
  assert.equal(convertFromCny(100, "EUR", rates), 13);
});

test("applies the external premium before currency conversion", () => {
  assert.equal(priceWithPremium(100, 20, "USD", rates), 18);
  assert.ok(Math.abs(priceWithPremium(-100, 20, "EUR", rates) + 15.6) < 1e-9);
});

test("calculates the actual sales premium against the true price", () => {
  assert.equal(calculateSalesPremium(125, 100), 25);
  assert.ok(Math.abs(calculateSalesPremium(90, 100) + 10) < 1e-9);
  assert.equal(calculateSalesPremium(100, 0), null);
});

test("offers premium percentages from 2 to 100 in increments of 2", () => {
  const options = premiumRateOptions();
  assert.equal(options.length, 50);
  assert.equal(options[0], 2);
  assert.equal(options.at(-1), 100);
  assert.ok(options.every((value, index) => value === (index + 1) * 2));
});
