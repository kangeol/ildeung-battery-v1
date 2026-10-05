import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadBlogCases } from "./lib/blog-case-data.js";
import { urlPathToFilePath } from "./lib/blog-case-utils.js";
import { getKstCalendarDate, getKstDayDifference, locationFallbackSafety } from "./lib/blog-case-selection.js";
import { selectionContexts, desiredSelection, selectionFingerprint, renderedSelection } from "./lib/blog-case-contexts.js";
import { renderBlogCaseSection } from "./lib/blog-case-renderer.js";

const asOf = getKstCalendarDate(process.env.BLOG_CASE_AS_OF || new Date());
const posts = loadBlogCases();
for (const post of posts) {
  const age = getKstDayDifference(post.publishedAt, asOf);
  assert(Number.isFinite(age) && age >= 0, `Invalid/future date: ${post.id}`);
}
const changed = [];
const ledger = [];
for (const context of selectionContexts()) {
  const selected = desiredSelection(posts, context, asOf);
  const expected = selectionFingerprint(selected);
  assert.equal(new Set(selected.map((p) => p.id)).size, selected.length);
  assert(selected.length <= 50);
  for (const post of selected) {
    if (context.type === "neighborhood" && !post.caseSelection.exact) assert(locationFallbackSafety(post).eligible, `Unsafe location fallback: ${post.id}`);
  }
  const html = fs.readFileSync(urlPathToFilePath(context.canonicalPath), "utf8");
  const actual = renderedSelection(html);
  const hasUnfingerprintedCards = html.includes("data-blog-case-item") && actual.length === 0;
  if (hasUnfingerprintedCards || JSON.stringify(expected) !== JSON.stringify(actual)) changed.push(context.canonicalPath);
  if (!process.argv.includes("--detect")) {
    const cards = (text) => [...text.matchAll(/<article class="blog-case-card"[\s\S]*?<\/article>/g)].map((m) => m[0].replace(/\r\n/g, "\n"));
    assert.deepEqual(cards(html), cards(renderBlogCaseSection(selected)), `Factual card mismatch: ${context.canonicalPath}`);
  }
  ledger.push([context.canonicalPath, expected]);
}
console.log(`Selection asOf: ${asOf}`);
console.log(`Selection changed pages: ${changed.length}`);
console.log(`Selection fingerprint: ${createHash("sha256").update(JSON.stringify(ledger)).digest("hex")}`);
console.log(`Location fallback ineligible posts: ${posts.filter((p) => !locationFallbackSafety(p).eligible).length}`);
if (!process.argv.includes("--detect")) {
  assert.equal(changed.length, 0, `Selection mismatch: ${changed.slice(0, 10).join(", ")}`);
  console.log("Blog case selection audit PASS");
}
