import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { maskCaseBlocks } from "./lib/blog-case-protection.js";

const base = process.env.BLOG_CASE_BASE || "HEAD";
const git = (args) => execFileSync("git", ["-c", "core.safecrlf=false", ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
const paths = git(["diff", base, "--name-only", "--", "*.html"]).trim().split(/\r?\n/).filter(Boolean);
for (const file of paths) {
  const before = git(["show", `${base}:${file}`]);
  const after = fs.readFileSync(file, "utf8");
  assert(maskCaseBlocks(after) === maskCaseBlocks(before), `Protected HTML changed: ${file}`);
  const schemas = (html) => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(/\r\n/g, "\n"));
  assert.deepEqual(schemas(after), schemas(before), `Schema changed: ${file}`);
}
console.log(`Case-block protection audit PASS: ${paths.length} changed HTML files`);
