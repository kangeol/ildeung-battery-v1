import { execFileSync } from "node:child_process";

const STRICT_MODE = process.env.GITHUB_ACTIONS === "true" || process.env.BLOG_SYNC_STRICT_DIFF === "1";

const RUNTIME_ALLOWED_FILES = new Set([
  "seo-data/blog-cases.json",
  "sitemap.xml"
]);

const IMPLEMENTATION_ALLOWED_FILES = new Set([
  ".github/workflows/naver-blog-sync.yml",
  "package.json",
  "tools/audit-blog-sync-diff.js",
  "tools/audit-blog-sync-regression.js",
  "tools/submit-indexnow.js",
  "tools/sync-naver-blog-cases.js"
]);

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^"|"$/g, "");
}

function parseStatusLine(line) {
  const status = line.slice(0, 2);
  const rawPath = line.slice(2).trimStart();
  const renameTarget = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) : rawPath;

  return {
    status,
    path: normalizePath(renameTarget)
  };
}

function isRuntimeAllowed(filePath) {
  if (RUNTIME_ALLOWED_FILES.has(filePath)) {
    return true;
  }

  if (filePath.startsWith("assets/blog-cases/") && filePath.endsWith(".webp")) {
    return true;
  }

  if (filePath.startsWith("car-battery/") && filePath.endsWith(".html")) {
    return true;
  }

  if (filePath.startsWith("area/") && filePath.endsWith(".html")) {
    return true;
  }

  if (filePath.startsWith("battery/") && filePath.endsWith(".html")) {
    return true;
  }

  return false;
}

function isImplementationAllowed(filePath) {
  return IMPLEMENTATION_ALLOWED_FILES.has(filePath);
}

function isDeletion(status) {
  return status.includes("D");
}

function main() {
  const output = runGit(["status", "--porcelain=v1", "-uall"]);
  const changes = output ? output.split(/\r?\n/).filter(Boolean).map(parseStatusLine) : [];
  const forbidden = changes.filter((change) => {
    if (isDeletion(change.status)) {
      return true;
    }

    if (isRuntimeAllowed(change.path)) {
      return false;
    }

    if (!STRICT_MODE && isImplementationAllowed(change.path)) {
      return false;
    }

    return true;
  });

  console.log("Blog Sync Diff Audit Start");
  console.log(`Mode: ${STRICT_MODE ? "runtime-strict" : "local-implementation"}`);
  console.log(`Changed files: ${changes.length}`);
  console.log(`Forbidden files: ${forbidden.length}`);

  if (forbidden.length) {
    forbidden.forEach((change) => console.log(`${change.status} ${change.path}`));
    throw new Error("runtime diff allowlist violation");
  }

  console.log("Blog Sync Diff Audit PASS");
}

try {
  main();
} catch (error) {
  console.error("Blog Sync Diff Audit FAIL");
  console.error(error.message);
  process.exit(1);
}
