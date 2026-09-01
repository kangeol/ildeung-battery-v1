import fs from "node:fs";
import {
  BLOG_CASE_FALLBACK_IMAGE,
  BLOG_CASES_FILE,
  BLOG_ID,
  fileExistsForPublicPath,
  normalizeText,
  urlPathToFilePath
} from "./lib/blog-case-utils.js";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function getLocalPageCount(paths) {
  return paths.filter((urlPath) => fs.existsSync(urlPathToFilePath(urlPath))).length;
}

function main() {
  console.log("Blog Cases Audit Start");
  console.log("");

  assert(fs.existsSync(BLOG_CASES_FILE), "seo-data/blog-cases.json is missing");
  const archive = JSON.parse(fs.readFileSync(BLOG_CASES_FILE, "utf8"));
  const posts = Array.isArray(archive.posts) ? archive.posts : [];
  const ids = new Set();
  const urls = new Set();
  let fallbackThumbnailCount = 0;
  let missingLocalThumbnailCount = 0;
  let unsafeSummaryCount = 0;
  let emptySummaryCount = 0;
  let invalidDateCount = 0;
  let nonexistentMatches = 0;
  let orphanMatches = 0;

  posts.forEach((post) => {
    const id = normalizeText(post.id);
    const url = normalizeText(post.url);
    const title = normalizeText(post.title);
    const summary = normalizeText(post.summary);

    assert(id, "empty post id");
    assert(!ids.has(id), `duplicate post id: ${id}`);
    ids.add(id);

    assert(/^https:\/\/blog\.naver\.com\//.test(url), `invalid blog URL: ${url}`);
    assert(url.includes(BLOG_ID), `blog URL does not include expected blog id: ${url}`);
    assert(!urls.has(url), `duplicate canonical URL: ${url}`);
    urls.add(url);

    assert(title, `empty title: ${id}`);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizeText(post.publishedAt))) {
      invalidDateCount += 1;
    }

    if (!summary) {
      emptySummaryCount += 1;
    }

    if (/[<>]/.test(summary)) {
      unsafeSummaryCount += 1;
    }

    if (post.thumbnail === BLOG_CASE_FALLBACK_IMAGE || post.thumbnailStatus === "fallback") {
      fallbackThumbnailCount += 1;
    }

    if (post.thumbnail?.startsWith("/assets/blog-cases/") && !fileExistsForPublicPath(post.thumbnail)) {
      missingLocalThumbnailCount += 1;
    }

    const facts = post.facts || {};
    const pages = facts.matchedPages || {};
    const matchedPaths = [
      ...(pages.vehicles || []),
      ...(pages.details || []),
      ...(pages.manufacturers || []),
      ...(pages.areas || []),
      ...(pages.regions || []),
      ...(pages.neighborhoods || []),
      ...(pages.batteries || [])
    ];

    nonexistentMatches += matchedPaths.length - getLocalPageCount(matchedPaths);

    if ((pages.details || []).length && !(facts.vehicles || []).length) {
      orphanMatches += 1;
    }

    if ((pages.neighborhoods || []).length && !(facts.neighborhoods || []).length) {
      orphanMatches += 1;
    }
  });

  assert(invalidDateCount === 0, `invalid publishedAt count: ${invalidDateCount}`);
  assert(missingLocalThumbnailCount === 0, `missing local thumbnail count: ${missingLocalThumbnailCount}`);
  assert(unsafeSummaryCount === 0, `unsafe summary count: ${unsafeSummaryCount}`);
  assert(emptySummaryCount === 0, `empty summary count: ${emptySummaryCount}`);
  assert(nonexistentMatches === 0, `nonexistent matched page count: ${nonexistentMatches}`);
  assert(orphanMatches === 0, `orphan match count: ${orphanMatches}`);

  console.log(`Posts: ${posts.length}`);
  console.log(`Duplicate post id: 0`);
  console.log(`Duplicate canonical URL: 0`);
  console.log(`Invalid blog URL: 0`);
  console.log(`Invalid publishedAt: 0`);
  console.log(`Missing local thumbnail: ${missingLocalThumbnailCount}`);
  console.log(`Fallback thumbnail: ${fallbackThumbnailCount}`);
  console.log(`Unsafe summary: 0`);
  console.log(`Empty summary: 0`);
  console.log(`Nonexistent matched page: 0`);
  console.log(`Orphan match: 0`);
  console.log("");
  console.log("Blog Cases Audit PASS");
}

try {
  main();
} catch (error) {
  console.error("Blog Cases Audit FAIL");
  console.error(error.message);
  process.exit(1);
}
