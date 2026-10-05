import assert from "node:assert/strict";
import {
  getKstCalendarDate, getKstDayDifference, isFreshPost, sortPostsNewest, fillCaseTiers,
  getVehicleCaseSelection as vehicle, getVehicleDetailCaseSelection as detail,
  getNeighborhoodCaseSelection as location, locationFallbackSafety
} from "./lib/blog-case-selection.js";

const asOf = "2026-10-05";
const context = { canonicalPath: "/v", vehiclePath: "/v", manufacturerId: "m", areaId: "a", regionId: "r" };
function post(id, { age = 0, v = "/v", d = [], m = "m", n = "/n", r = "r", a = "a" } = {}) {
  return { id: String(id), title: "Town battery", publishedAt: new Date(Date.parse(asOf) - age * 86400000).toISOString().slice(0, 10),
    facts: { manufacturers: [{ id: m }], vehicles: [{ urlPath: v, manufacturerId: m }], detailModels: [],
      actualWorkLocation: { level: "neighborhood", urlPath: n, areaId: a, regionId: r },
      neighborhoods: [{ name: "Town", urlPath: n, areaId: a, regionId: r }], regions: [{ areaId: a, regionId: r }],
      matchedPages: { vehicles: [v], details: d, neighborhoods: [n] } } };
}
const ids = (list) => list.map((p) => p.id);
for (const age of [0, 179, 180, 181]) assert.equal(isFreshPost(post(1, { age }), asOf), age <= 180);
assert.equal(getKstCalendarDate("2026-10-04T15:01:00Z"), asOf);
assert.equal(getKstDayDifference("2026-04-08", asOf), 180);
for (const publishedAt of ["bad", "2026-02-30", "2026-10-06"]) assert.equal(isFreshPost({ publishedAt }, asOf), false);
assert.deepEqual(ids(sortPostsNewest([post(9), post(10), post(11, { age: 1 })])), ["10", "9", "11"]);
assert.equal(vehicle(Array.from({ length: 60 }, (_, n) => post(n + 1)), context, asOf).length, 50);
for (const count of [0, 1, 3]) {
  const exact = Array.from({ length: count }, (_, n) => post(n + 1, { age: 10 }));
  const brand = Array.from({ length: 55 }, (_, n) => post(n + 100, { v: "/other" }));
  const selected = vehicle([...brand, ...exact], context, asOf);
  assert.equal(selected.length, 50);
  assert.deepEqual(ids(selected.slice(0, count)), ids(sortPostsNewest(exact)));
}
assert.deepEqual(ids(vehicle([post(1, { age: 200 }), post(2, { v: "/other" }), post(3, { v: "/x", m: "other" })], context, asOf)), ["2", "1"]);
assert.equal(fillCaseTiers([{ posts: [post(1), post(1)], tier: "V1", relation: "exact" }]).length, 1);
const dc = { ...context, canonicalPath: "/detail" };
const dp = [post(1, { d: ["/detail"] }), post(2), post(3, { v: "/other" }), post(4, { age: 200, d: ["/detail"] }), post(5, { age: 200 })];
assert.deepEqual(detail(dp, dc, asOf).map((p) => p.caseSelection.tier), ["D1", "D2", "D3", "D4", "D5"]);
assert.equal(detail(dp, dc, asOf)[1].caseSelection.exact, false);
const lc = { ...context, canonicalPath: "/n" };
const lp = [post(1), post(2, { n: "/other" }), post(3, { n: "/else", r: "other" }), post(4, { age: 200 }), post(5, { age: 200, n: "/other" }), post(6, { a: "wrong", n: "/wrong" })];
assert.deepEqual(location(lp, lc, asOf).map((p) => p.caseSelection.tier), ["L1", "L2", "L3", "L4", "L5"]);
assert.deepEqual(ids(location(lp.slice(1, 3), lc, asOf)), ["2", "3"]);
const conflict = post(7, { n: "/other" }); conflict.facts.locationConflict = true;
assert.equal(locationFallbackSafety(conflict).eligible, false);
assert.equal(location([conflict], lc, asOf).length, 0);
assert.deepEqual(location(lp, lc, asOf), location(lp, lc, asOf));
const boundary = [post(1, { age: 180 }), post(2, { v: "/other" })];
assert.deepEqual(ids(vehicle(boundary, context, asOf)), ["1", "2"]);
assert.deepEqual(ids(vehicle(boundary, context, "2026-10-06")), ["2", "1"]);
console.log("Blog case selection tests PASS");
