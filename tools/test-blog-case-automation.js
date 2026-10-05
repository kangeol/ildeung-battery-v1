import assert from "node:assert/strict";
import { loadBlogCases } from "./lib/blog-case-data.js";
import { createBlogCaseIndex, extractFactsFromPost } from "./lib/blog-case-matcher.js";
import { selectionContexts, desiredSelection, selectionFingerprint } from "./lib/blog-case-contexts.js";
import { renderBlogCaseSection } from "./lib/blog-case-renderer.js";
import { maskCaseBlocks } from "./lib/blog-case-protection.js";
import { locationFallbackSafety } from "./lib/blog-case-selection.js";

const index = createBlogCaseIndex();
for (const title of ["송파 거여동 벤츠 GLB250 배터리 교체", "인천 부평 산곡동 GV80 배터리 교체", "구로 개봉동 K7 배터리 교체"]) {
  const facts = extractFactsFromPost({ title }, index);
  assert.equal(facts.neighborhoods.length, 1);
  assert(title.includes(facts.actualWorkLocation.neighborhoodName));
}
const ambiguous = extractFactsFromPost({ title: "송파동 거여동 배터리 교체" }, index);
assert.equal(locationFallbackSafety({ title: "송파동 거여동 배터리 교체", facts: ambiguous }).eligible, false);
const posts = loadBlogCases();
const contexts = selectionContexts();
const asOf = "2026-10-05";
const fingerprint = (ps, c, date = asOf) => JSON.stringify(selectionFingerprint(desiredSelection(ps, c, date)));
for (const [name, predicate] of [
  ["Hyundai", (p) => p.facts.vehicles.some((v) => v.manufacturerId === "hyundai")],
  ["Mercedes", (p) => p.facts.vehicles.some((v) => v.manufacturerId === "benz")],
  ["Yeonsu", (p) => p.facts.regions.some((r) => r.regionId === "yeonsu-gu")],
  ["Songpa", (p) => p.facts.regions.some((r) => r.regionId === "songpa-gu")]
]) {
  const source = posts.find(predicate);
  const added = { ...source, id: "999999999999", publishedAt: asOf };
  let changed = 0;
  for (const c of contexts) {
    const before = desiredSelection(posts, c, asOf);
    const after = desiredSelection([...posts, added], c, asOf);
    if (fingerprint(posts, c) !== fingerprint([...posts, added], c)) changed++;
    const shell = (cases) => `<main><h1>Protected</h1>\n${renderBlogCaseSection(cases)}\n<aside>CTA</aside></main>`;
    assert.equal(maskCaseBlocks(shell(before)), maskCaseBlocks(shell(after)));
    assert.equal(fingerprint([...posts, added], c), fingerprint([...posts, added], c));
  }
  assert(changed > 0);
  console.log(`${name} fixture: ${changed} vehicle/detail/neighborhood selections changed`);
}
for (const c of contexts) assert.equal(fingerprint(posts, c), fingerprint(posts, c));
const c = contexts.find((c) => c.type === "vehicle" && c.manufacturerId === "hyundai");
const exact = posts.find((p) => p.facts.matchedPages.vehicles.includes(c.canonicalPath));
const brand = posts.find((p) => p.facts.vehicles.some((v) => v.manufacturerId === c.manufacturerId && v.urlPath !== c.canonicalPath));
assert(exact && brand);
const fixture = [{ ...exact, id: "1", publishedAt: "2026-04-08" }, { ...brand, id: "2", publishedAt: "2026-10-05" }];
assert.notEqual(fingerprint(fixture, c), fingerprint(fixture, c, "2026-10-06"));
console.log("Blog automation fixtures PASS: new posts, aging, no-op, deterministic, protected shell");
