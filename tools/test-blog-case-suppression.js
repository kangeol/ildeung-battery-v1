import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { mergePosts } from "./sync-naver-blog-cases.js";
import { loadBlogCases } from "./lib/blog-case-data.js";
import { BLOG_CASES_FILE } from "./lib/blog-case-utils.js";
import { filterSuppressedBlogCases, isSuppressedBlogCase, isApprovedBlogCaseRemoval } from "./lib/blog-case-suppression.js";

const removed = [
  { id: "224463108563", publishedAt: "2026-11-04" },
  { id: "224460886606", publishedAt: "2026-11-01" }
].map((p) => ({ ...p, url: `https://blog.naver.com/kang10107/${p.id}`, title: "same title" }));
const live = ["224463097943", "224456298245"].map((id) => ({ id, url: `https://blog.naver.com/kang10107/${id}`, title: "same title", publishedAt: "2026-11-03" }));
const fresh = { id: "999999999999", url: "https://blog.naver.com/kang10107/999999999999", title: "new upload", publishedAt: "2026-11-21" };
assert.deepEqual(filterSuppressedBlogCases([...removed, ...live]), live);
for (const p of removed) {
  assert(isApprovedBlogCaseRemoval(p));
  assert(!isApprovedBlogCaseRemoval({ ...p, publishedAt: "2026-10-01" }));
  assert(!isApprovedBlogCaseRemoval({ ...p, url: live[0].url }));
  assert(isSuppressedBlogCase({ url: p.url + "?fromRss=true" }));
}
assert(!live.some(isApprovedBlogCaseRemoval));
const merged = mergePosts([...removed, ...live], [...removed, fresh]);
assert.equal(merged.newPosts, 1);
assert.equal(merged.preservedPreviousPosts, 2);
assert.deepEqual(new Set(merged.merged.map((p) => p.id)), new Set([...live, fresh].map((p) => p.id)));
assert.equal(mergePosts(merged.merged, [...removed, fresh]).newPosts, 0);
assert.deepEqual(mergePosts(removed, removed).merged, []);
assert(!loadBlogCases().some(isSuppressedBlogCase));
const originalRead = fs.readFileSync;
try {
  fs.readFileSync = (file, ...args) => file === BLOG_CASES_FILE
    ? JSON.stringify({ posts: [...removed, ...live] })
    : originalRead(file, ...args);
  assert.deepEqual(loadBlogCases(), live, "Loader must hide reintroduced archived records");
} finally {
  fs.readFileSync = originalRead;
}
const current = JSON.parse(fs.readFileSync("seo-data/blog-cases.json", "utf8")).posts;
assert(!current.some(isSuppressedBlogCase));
const base = process.env.BLOG_CASE_BASE || "HEAD";
const before = JSON.parse(execFileSync("git", ["show", `${base}:seo-data/blog-cases.json`], { maxBuffer: 32 * 1024 * 1024 })).posts;
assert.deepEqual(current, filterSuppressedBlogCases(before), "Only exact owner-approved posts may change");
for (const p of live) assert.deepEqual(current.find((x) => x.id === p.id), before.find((x) => x.id === p.id));
const files = execFileSync("git", ["ls-files", "-z", "*.html"], { maxBuffer: 8 * 1024 * 1024 }).toString().split("\0").filter(Boolean);
for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  for (const p of removed) assert(!html.includes(p.id), `Deleted post remains: ${file} ${p.id}`);
}
console.log(`Suppression PASS: RSS/archive reintroduction, retries, new upload, same-title protection, ${current.length} unchanged live posts, ${files.length} HTML scanned`);
