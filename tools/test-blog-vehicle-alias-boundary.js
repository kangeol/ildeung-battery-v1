import assert from "node:assert/strict";
import fs from "node:fs";
import { createBlogCaseIndex, extractFactsFromPost, buildSafeSummary } from "./lib/blog-case-matcher.js";

const index = createBlogCaseIndex();
const paths = title => extractFactsFromPost({ title }, index).matchedPages.vehicles;
const vehicle = slug => `/car-battery/benz/${slug}.html`;
for (const title of ["벤츠CLA200", "벤츠 CLA200", "벤츠 CLA250 4MATIC Coupe", "벤츠CLA배터리", "벤츠 CLA-클래스"]) {
  assert.deepEqual(paths(title), [vehicle("cla-class")], title);
}
for (const title of ["벤츠C200", "벤츠 C220d", "벤츠C배터리", "벤츠 C클래스", "벤츠 C CLASS", "벤츠 C-클래스"]) {
  assert.deepEqual(paths(title), [vehicle("c-class")], title);
}
assert.deepEqual(paths("벤츠CLS300d"), [vehicle("cls-class")]);
assert.deepEqual(paths("벤츠 CLS300d"), [vehicle("cls-class")]);
assert.deepEqual(paths("벤츠 GLC 220D"), [vehicle("glc-class")]);
for (const title of ["벤츠SLK200", "벤츠SLC200", "벤츠EQE300"]) {
  assert(!paths(title).includes(vehicle("s-class")), title);
  assert(!paths(title).includes(vehicle("e-class")), title);
}
for (const [title, slug] of [["벤츠 E220d", "e-class"], ["벤츠S350d", "s-class"], ["벤츠GLA220d", "gla-class"], ["벤츠GLC300", "glc-class"]]) {
  assert.deepEqual(paths(title), [vehicle(slug)], title);
}
assert.deepEqual(new Set(paths("벤츠 CLA200 및 벤츠 C200")), new Set([vehicle("cla-class"), vehicle("c-class")]));
const archive = JSON.parse(fs.readFileSync(new URL("../seo-data/blog-cases.json", import.meta.url), "utf8"));
const expected = new Map([
  ["224425614256", "cla-class"], ["224411370466", "cla-class"],
  ["224012663220", "cla-class"], ["223920341327", "cla-class"], ["224418409320", "cls-class"],
  ["224411404387", "glc-class"]
]);
for (const [id, slug] of expected) {
  const post = archive.posts.find(p => p.id === id);
  assert(post, id);
  const facts = extractFactsFromPost(post, index);
  assert.deepEqual(facts.matchedPages.vehicles, [vehicle(slug)], id);
  assert(!buildSafeSummary(post, facts).includes("벤츠 C클래스"), id);
  assert.deepEqual(extractFactsFromPost({ ...post, facts, summary: buildSafeSummary(post, facts) }, index), facts, `${id}: repeat sync`);
}
console.log("PASS: CLA/C/CLS/GLC boundaries, normal C/E/S/GLA/GLC, mixed-vehicle mentions, 6 stored cases and repeat-sync extraction");
