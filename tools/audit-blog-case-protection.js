import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { maskCaseBlocks, normalizeVerifiedWorkCaseHero, workCasePageCount, workCasePageNumber } from "./lib/blog-case-protection.js";

const base = process.env.BLOG_CASE_BASE || "HEAD";
const git = (args) => execFileSync("git", ["-c", "core.safecrlf=false", ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
const paths = git(["diff", base, "--name-only", "--", "*.html"]).trim().split(/\r?\n/).filter(Boolean);
const pageCount = (text) => workCasePageCount(JSON.parse(text).posts || JSON.parse(text));
const beforePageCount = pageCount(git(["show", `${base}:seo-data/blog-cases.json`]));
const afterPageCount = pageCount(fs.readFileSync("seo-data/blog-cases.json", "utf8"));
const existsAtBase = (file) => {
  try {
    git(["cat-file", "-e", `${base}:${file}`]);
    return true;
  } catch {
    return false;
  }
};

for (const file of paths) {
  const after = fs.readFileSync(file, "utf8");
  const pageNumber = workCasePageNumber(file);

  if (pageNumber && !existsAtBase(file)) {
    assert(pageNumber > beforePageCount && pageNumber <= afterPageCount, `Unexpected work-case page added: ${file}`);
    assert(normalizeVerifiedWorkCaseHero(after, { totalPages: afterPageCount, pageNumber }).includes("__VERIFIED_WORK_CASE_PAGE_TOTAL__"), `Unverified work-case hero total: ${file}`);
    continue;
  }

  const before = git(["show", `${base}:${file}`]);
  const protectedBefore = pageNumber
    ? normalizeVerifiedWorkCaseHero(before, { totalPages: beforePageCount, pageNumber })
    : before;
  const protectedAfter = pageNumber
    ? normalizeVerifiedWorkCaseHero(after, { totalPages: afterPageCount, pageNumber })
    : after;
  assert(maskCaseBlocks(protectedAfter) === maskCaseBlocks(protectedBefore), `Protected HTML changed: ${file}`);
  const schemas = (html) => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(/\r\n/g, "\n"));
  assert.deepEqual(schemas(after), schemas(before), `Schema changed: ${file}`);
}
console.log(`Case-block protection audit PASS: ${paths.length} changed HTML files`);
