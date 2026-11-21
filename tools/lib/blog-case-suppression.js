import fs from "node:fs";
import assert from "node:assert/strict";
import { canonicalNaverPostUrl, BLOG_URL } from "./blog-case-utils.js";

const policy = JSON.parse(fs.readFileSync(new URL("../../seo-data/blog-case-suppressions.json", import.meta.url), "utf8"));
assert.equal(policy.version, 1, "Unsupported blog suppression policy");
assert.ok(policy.approval && policy.reason && Array.isArray(policy.posts), "Missing removal approval");
const byId = new Map();
const urls = new Set();
for (const post of policy.posts) {
  assert.match(post.id, /^\d+$/);
  assert.equal(post.url, `${BLOG_URL}/${post.id}`, "Suppression ID/URL mismatch");
  assert.match(post.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!byId.has(post.id) && !urls.has(post.url), "Duplicate suppression");
  byId.set(post.id, Object.freeze({ ...post }));
  urls.add(post.url);
}

export function isSuppressedBlogCase(post) {
  return byId.has(String(post?.id || "")) || urls.has(canonicalNaverPostUrl(post?.url || ""));
}

export function filterSuppressedBlogCases(posts) {
  return posts.filter((post) => !isSuppressedBlogCase(post));
}

// History exceptions require the full approved identity, not just a similar title.
export function isApprovedBlogCaseRemoval(post) {
  const approved = byId.get(String(post?.id || ""));
  return Boolean(approved && post.url === approved.url && post.publishedAt === approved.publishedAt);
}
