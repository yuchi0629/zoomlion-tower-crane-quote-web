const EPSILON = 1e-9;

function rounded(value, digits = 3) {
  return Number(Number(value).toFixed(digits));
}

function validRequirement(requirement) {
  return Number(requirement?.radius) > 0 && Number(requirement?.load) > 0;
}

export function capacityAt(row, radiusValue) {
  const radius = Number(radiusValue);
  if (!Number.isFinite(radius) || radius < Number(row.minRadius) - EPSILON) return null;
  if (radius <= Number(row.maxLoadRadius) + EPSILON) {
    return { capacity: Number(row.maxLoad), lookupRadius: Number(row.maxLoadRadius) };
  }

  const point = (row.points || [])
    .map(([pointRadius, capacity]) => [Number(pointRadius), Number(capacity)])
    .filter(([pointRadius, capacity]) => Number.isFinite(pointRadius) && Number.isFinite(capacity))
    .sort((left, right) => left[0] - right[0])
    .find(([pointRadius]) => pointRadius >= radius - EPSILON);
  if (!point) return null;
  return { capacity: point[1], lookupRadius: point[0] };
}

function evaluateJib(jib, requirements) {
  const points = requirements.map(requirement => {
    const options = (jib.rows || []).flatMap(row => {
      const capacity = capacityAt(row, requirement.radius);
      return capacity ? [{ ...capacity, reeving: row.reeving }] : [];
    });
    if (!options.length) return null;
    const best = options.sort((left, right) => right.capacity - left.capacity)[0];
    const required = Number(requirement.load);
    const surplus = rounded(best.capacity - required);
    return {
      radius: Number(requirement.radius),
      required,
      capacity: best.capacity,
      lookupRadius: best.lookupRadius,
      reeving: best.reeving,
      surplus,
      surplusRate: rounded((surplus / required) * 100, 1),
      loadRate: rounded((required / best.capacity) * 100, 1),
    };
  });

  if (points.some(point => point == null)) return null;
  const satisfies = points.every(point => point.surplus >= -EPSILON);
  const averageSurplusRate = rounded(
    points.reduce((sum, point) => sum + point.surplusRate, 0) / points.length,
    1,
  );
  const worstSurplusRate = Math.min(...points.map(point => point.surplusRate));
  return {
    jibLength: Number(jib.length),
    ...(jib.mode ? { mode: jib.mode } : {}),
    points,
    satisfies,
    averageSurplusRate,
    worstSurplusRate,
  };
}

function shortestSatisfyingJib(condition, requirements) {
  const requiredReach = Math.max(...requirements.map(requirement => Number(requirement.radius)));
  return (condition?.jibs || [])
    .filter(jib => Number(jib.length) >= requiredReach - EPSILON)
    .sort((left, right) => Number(left.length) - Number(right.length))
    .map(jib => evaluateJib(jib, requirements))
    .find(result => result?.satisfies) || null;
}

function nearestJib(condition, requirements) {
  const requiredReach = Math.max(...requirements.map(requirement => Number(requirement.radius)));
  return (condition?.jibs || [])
    .filter(jib => Number(jib.length) >= requiredReach - EPSILON)
    .map(jib => evaluateJib(jib, requirements))
    .filter(Boolean)
    .sort((left, right) => (
      right.worstSurplusRate - left.worstSurplusRate
      || right.averageSurplusRate - left.averageSurplusRate
      || left.jibLength - right.jibLength
    ))[0] || null;
}

function matchModel(model, requirements) {
  const normal = shortestSatisfyingJib(model.conditions?.normal, requirements);
  if (normal) return { code: model.code, type: model.type, condition: "normal", ...normal };

  if (model.type === "flat" && model.conditions?.superlift) {
    const superlift = shortestSatisfyingJib(model.conditions.superlift, requirements);
    if (superlift) return { code: model.code, type: model.type, condition: "superlift", ...superlift };
  }
  return null;
}

function nearestModel(model, requirements) {
  const candidates = [
    ["normal", nearestJib(model.conditions?.normal, requirements)],
    ...(model.type === "flat" && model.conditions?.superlift
      ? [["superlift", nearestJib(model.conditions.superlift, requirements)]]
      : []),
  ].filter(([, result]) => result);
  const [condition, result] = candidates.sort((left, right) => (
    right[1].worstSurplusRate - left[1].worstSurplusRate
    || right[1].averageSurplusRate - left[1].averageSurplusRate
    || (left[0] === "normal" ? -1 : 1)
  ))[0] || [];
  return result ? { code: model.code, type: model.type, condition, ...result } : null;
}

export function selectTowerCranes(models, { type, requirements }) {
  const validRequirements = (requirements || [])
    .filter(validRequirement)
    .map(requirement => ({ radius: Number(requirement.radius), load: Number(requirement.load) }));
  if (!validRequirements.length) return { matches: [], nearest: null };

  const candidates = (models || []).filter(model => model.type === type);
  const matches = candidates
    .map(model => matchModel(model, validRequirements))
    .filter(Boolean)
    .sort((left, right) => (
      left.averageSurplusRate - right.averageSurplusRate
      || (left.condition === "normal" ? 0 : 1) - (right.condition === "normal" ? 0 : 1)
      || left.jibLength - right.jibLength
      || left.code.localeCompare(right.code)
    ));

  const nearest = matches.length ? null : candidates
    .map(model => nearestModel(model, validRequirements))
    .filter(Boolean)
    .sort((left, right) => (
      right.worstSurplusRate - left.worstSurplusRate
      || right.averageSurplusRate - left.averageSurplusRate
      || (left.condition === "normal" ? -1 : 1)
    ))[0] || null;

  return { matches, nearest };
}
