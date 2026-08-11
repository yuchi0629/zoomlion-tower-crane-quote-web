function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function convertFromCny(value, currency, rates) {
  const rate = finiteNumber(rates?.[currency], currency === "CNY" ? 1 : 0);
  return finiteNumber(value) * rate;
}

export function priceWithPremium(value, premiumRate, currency, rates) {
  const multiplier = 1 + finiteNumber(premiumRate) / 100;
  return convertFromCny(finiteNumber(value) * multiplier, currency, rates);
}

export function calculateSalesPremium(actualSalesPrice, truePrice) {
  const baseline = finiteNumber(truePrice);
  if (baseline <= 0) return null;
  return (finiteNumber(actualSalesPrice) / baseline - 1) * 100;
}

export function premiumRateOptions() {
  return Array.from({ length: 50 }, (_, index) => (index + 1) * 2);
}
