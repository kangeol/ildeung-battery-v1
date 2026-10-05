const DAY_MS = 86400000;

export function getKstCalendarDate(input = new Date()) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    if (!Number.isFinite(parseDay(input))) throw new Error(`Invalid asOf: ${input}`);
    return input;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(input));
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return NaN;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time / DAY_MS : NaN;
}

export function getKstDayDifference(publishedAt, asOf) {
  return parseDay(asOf) - parseDay(publishedAt);
}

export function isFreshPost(post, asOf, days = 180) {
  const age = getKstDayDifference(post.publishedAt, asOf);
  return age >= 0 && age <= days;
}

export function sortPostsNewest(posts) {
  return [...posts].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) ||
    String(b.id).localeCompare(String(a.id), "en", { numeric: true }));
}

export function fillCaseTiers(tiers, limit = 50) {
  const result = [];
  const seen = new Set();
  for (const { posts, tier, relation } of tiers) {
    for (const post of sortPostsNewest(posts)) {
      const id = String(post.id || "");
      if (!id || seen.has(id) || result.length >= limit) continue;
      seen.add(id);
      result.push({ ...post, caseSelection: { tier, relation, exact: relation === "exact" } });
    }
  }
  return result;
}

const pages = (post, key, value) => Boolean(value) && (post.facts?.matchedPages?.[key] || []).includes(value);
const sameManufacturer = (post, context) => Boolean(context.manufacturerId) && (
  (post.facts?.manufacturers || []).some((m) => m.id === context.manufacturerId) ||
  (post.facts?.vehicles || []).some((v) => v.manufacturerId === context.manufacturerId));
const sameVehicle = (post, vehiclePath) => pages(post, "vehicles", vehiclePath) ||
  (post.facts?.detailModels || []).some((d) => d.vehicleUrlPath === vehiclePath);

export function locationFallbackSafety(post) {
  const facts = post.facts || {};
  const actual = facts.actualWorkLocation;
  const neighborhoods = facts.neighborhoods || [];
  const regions = facts.regions || [];
  const reasons = [];
  if (!actual) reasons.push("missing-actual-location");
  if (new Set(neighborhoods.map((n) => n.urlPath)).size > 1) reasons.push("multiple-neighborhoods");
  if (new Set(regions.map((r) => `${r.areaId}:${r.regionId}`)).size > 1) reasons.push("multiple-regions");
  if (actual?.level === "neighborhood") {
    const n = neighborhoods.find((item) => item.urlPath === actual.urlPath);
    if (!n || !String(post.title || "").includes(n.name || n.neighborhoodName)) reasons.push("title-neighborhood-not-explicit");
  }
  if (facts.locationConflict || post.locationConflict) reasons.push("explicit-conflict");
  return { eligible: reasons.length === 0, reasons };
}

function select(posts, rules, asOf, limit) {
  return fillCaseTiers(rules.map(([tier, relation, freshness, predicate]) => ({
    tier, relation,
    posts: posts.filter((post) => {
      const age = getKstDayDifference(post.publishedAt, asOf);
      return Number.isFinite(age) && age >= 0 && (freshness ? age <= 180 : age > 180) && predicate(post);
    })
  })), limit);
}

export function getVehicleCaseSelection(posts, context, asOf, limit = 50) {
  const exact = (p) => sameVehicle(p, context.canonicalPath);
  return select(posts, [
    ["V1", "exact", true, exact],
    ["V2", "manufacturer", true, (p) => sameManufacturer(p, context)],
    ["V3", "exact", false, exact]
  ], asOf, limit);
}

export function getVehicleDetailCaseSelection(posts, context, asOf, limit = 50) {
  const exact = (p) => pages(p, "details", context.canonicalPath);
  const vehicle = (p) => sameVehicle(p, context.vehiclePath);
  return select(posts, [
    ["D1", "exact", true, exact], ["D2", "vehicle", true, vehicle],
    ["D3", "manufacturer", true, (p) => sameManufacturer(p, context)],
    ["D4", "exact", false, exact], ["D5", "vehicle", false, vehicle]
  ], asOf, limit);
}

export function getNeighborhoodCaseSelection(posts, context, asOf, limit = 50) {
  const exact = (p) => pages(p, "neighborhoods", context.canonicalPath);
  const region = (p) => locationFallbackSafety(p).eligible &&
    p.facts.actualWorkLocation.areaId === context.areaId && p.facts.actualWorkLocation.regionId === context.regionId;
  const area = (p) => locationFallbackSafety(p).eligible && p.facts.actualWorkLocation.areaId === context.areaId;
  return select(posts, [
    ["L1", "exact", true, exact], ["L2", "region", true, region], ["L3", "area", true, area],
    ["L4", "exact", false, exact], ["L5", "region", false, region]
  ], asOf, limit);
}
