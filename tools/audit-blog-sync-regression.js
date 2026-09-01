import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://battery1.co.kr";

const EXPECTED = {
  dbRows: 917,
  carBatteryHtml: 443,
  areaHtml: 637,
  batteryHtml: 19,
  minBlogPosts: 299
};

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function readText(filePath) {
  return fs.readFileSync(path.join(ROOT_DIR, filePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function gitOutput(args, options = {}) {
  return execFileSync("git", args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: options.allowFailure ? ["ignore", "pipe", "ignore"] : ["ignore", "pipe", "pipe"]
  }).trim();
}

function gitShow(filePath) {
  try {
    return gitOutput(["show", `HEAD:${filePath}`], { allowFailure: true });
  } catch {
    return "";
  }
}

function gitChangedFiles(paths) {
  const output = gitOutput(["diff", "--name-only", "--", ...paths], { allowFailure: true });
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function walk(directory) {
  const absoluteDir = path.join(ROOT_DIR, directory);

  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(absoluteDir, entry.name);
    const relativePath = path.relative(ROOT_DIR, entryPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      return walk(relativePath);
    }

    return [relativePath];
  });
}

function countHtml(directory) {
  return walk(directory).filter((filePath) => filePath.endsWith(".html")).length;
}

function countVehicleDbRows() {
  const manufacturers = readJson("data/manufacturers.json");
  return manufacturers.reduce((total, manufacturer) => {
    const rows = readJson(path.join("data", manufacturer.file));
    return total + rows.length;
  }, 0);
}

function parseSitemapLocs(source) {
  return [...source.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function extractCanonical(source) {
  return source.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] || "";
}

function extractOgUrl(source) {
  return source.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)?.[1] || "";
}

function htmlPathToUrlPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");

  if (normalized === "index.html") {
    return "/";
  }

  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"index.html".length)}`;
  }

  return `/${normalized}`;
}

function urlPathToFilePath(urlPath) {
  const clean = String(urlPath ?? "").replace(/[?#].*$/, "");

  if (!clean || clean === "/") {
    return path.join(ROOT_DIR, "index.html");
  }

  const withoutSlash = clean.replace(/^\//, "");
  if (clean.endsWith("/")) {
    return path.join(ROOT_DIR, withoutSlash, "index.html");
  }

  return path.join(ROOT_DIR, withoutSlash);
}

function collectHtmlFiles() {
  return [
    "index.html",
    "search.html",
    "service-area.html",
    "battery-replacement.html",
    ...walk("car-battery").filter((filePath) => filePath.endsWith(".html")),
    ...walk("area").filter((filePath) => filePath.endsWith(".html")),
    ...walk("battery").filter((filePath) => filePath.endsWith(".html")),
    ...walk("work-cases").filter((filePath) => filePath.endsWith(".html"))
  ].filter((filePath, index, all) => all.indexOf(filePath) === index && fs.existsSync(path.join(ROOT_DIR, filePath)));
}

function countBrokenInternalLinks() {
  const htmlFiles = collectHtmlFiles();
  const attrPattern = /(?:href|src)=["']([^"']+)["']/g;
  const broken = [];

  htmlFiles.forEach((filePath) => {
    const source = readText(filePath);

    for (const match of source.matchAll(attrPattern)) {
      let value = match[1];

      if (!value || value.startsWith("#") || /^(https?:|tel:|mailto:|javascript:|data:)/i.test(value)) {
        continue;
      }

      value = value.split("#")[0].split("?")[0];

      if (!value) {
        continue;
      }

      let target = value.startsWith("/")
        ? path.join(ROOT_DIR, value)
        : path.resolve(path.dirname(path.join(ROOT_DIR, filePath)), value);

      try {
        target = decodeURIComponent(target);
      } catch {
        // Keep the original path if the URL contains a partial escape sequence.
      }

      if (value.endsWith("/")) {
        target = path.join(target, "index.html");
      }

      if (!path.extname(target) && fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, "index.html");
      }

      if (!fs.existsSync(target)) {
        broken.push({ filePath, value });
      }
    }
  });

  return broken.length;
}

function isWorkCaseUrl(loc) {
  return loc.startsWith(`${SITE_ORIGIN}/work-cases/`);
}

function compareProtectedSitemapUrlSet(currentLocs) {
  const previous = gitShow("sitemap.xml");

  if (!previous) {
    return false;
  }

  const before = parseSitemapLocs(previous).filter((loc) => !isWorkCaseUrl(loc)).sort();
  const after = [...currentLocs].filter((loc) => !isWorkCaseUrl(loc)).sort();

  return JSON.stringify(before) !== JSON.stringify(after);
}

function countCanonicalChanges() {
  const files = collectHtmlFiles();
  let changed = 0;

  files.forEach((filePath) => {
    const previous = gitShow(filePath);

    if (!previous) {
      if (filePath.startsWith("work-cases/")) {
        return;
      }

      changed += 1;
      return;
    }

    const current = readText(filePath);

    if (extractCanonical(previous) !== extractCanonical(current) || extractOgUrl(previous) !== extractOgUrl(current)) {
      changed += 1;
    }
  });

  return changed;
}

function checkCurrentCanonicalConsistency() {
  return collectHtmlFiles().filter((filePath) => {
    const source = readText(filePath);
    const canonical = extractCanonical(source);
    const ogUrl = extractOgUrl(source);
    const expected = `${SITE_ORIGIN}${htmlPathToUrlPath(filePath)}`;

    return canonical && canonical !== expected || ogUrl && ogUrl !== canonical;
  }).length;
}

function compareBlogCaseHistory(currentPosts) {
  const previous = gitShow("seo-data/blog-cases.json");

  if (!previous) {
    return {
      previousPosts: 0,
      historicalLoss: 0,
      originalUrlChanged: 0,
      originalTitleChanged: 0,
      publishedAtChanged: 0
    };
  }

  const previousPosts = JSON.parse(previous).posts || [];
  const currentById = new Map(currentPosts.map((post) => [post.id, post]));
  let historicalLoss = 0;
  let originalUrlChanged = 0;
  let originalTitleChanged = 0;
  let publishedAtChanged = 0;

  previousPosts.forEach((previousPost) => {
    const currentPost = currentById.get(previousPost.id);

    if (!currentPost) {
      historicalLoss += 1;
      return;
    }

    if (currentPost.url !== previousPost.url) {
      originalUrlChanged += 1;
    }

    if (currentPost.title !== previousPost.title) {
      originalTitleChanged += 1;
    }

    if (currentPost.publishedAt !== previousPost.publishedAt) {
      publishedAtChanged += 1;
    }
  });

  return {
    previousPosts: previousPosts.length,
    historicalLoss,
    originalUrlChanged,
    originalTitleChanged,
    publishedAtChanged
  };
}

function main() {
  console.log("Blog Sync Regression Audit Start");
  console.log("");

  const sitemap = readText("sitemap.xml");
  const locs = parseSitemapLocs(sitemap);
  const uniqueLocs = new Set(locs);
  const htmlFiles = collectHtmlFiles();
  const archive = readJson("seo-data/blog-cases.json");
  const posts = Array.isArray(archive.posts) ? archive.posts : [];
  const postIds = new Set(posts.map((post) => post.id));
  const postUrls = new Set(posts.map((post) => post.url));
  const history = compareBlogCaseHistory(posts);

  const result = {
    dbRows: countVehicleDbRows(),
    blogPosts: posts.length,
    duplicateBlogIds: posts.length - postIds.size,
    duplicateBlogUrls: posts.length - postUrls.size,
    carBatteryHtml: countHtml("car-battery"),
    areaHtml: countHtml("area"),
    batteryHtml: countHtml("battery"),
    workCaseHtml: countHtml("work-cases"),
    sitemapUrls: locs.length,
    expectedSitemapUrls: htmlFiles.length,
    duplicateSitemapLoc: locs.length - uniqueLocs.size,
    lastmodCount: (sitemap.match(/<lastmod>/g) || []).length,
    brokenInternalLinks: countBrokenInternalLinks(),
    canonicalChanged: countCanonicalChanges(),
    canonicalConsistencyErrors: checkCurrentCanonicalConsistency(),
    protectedUrlSetChanged: compareProtectedSitemapUrlSet(locs),
    assetsSeoChanged: gitChangedFiles(["assets/seo"]).length,
    protectedSearchChanged: gitChangedFiles(["search.html", "js/search.js"]).length,
    protectedDbChanged: gitChangedFiles(["master-db", "data"]).length,
    ...history
  };

  Object.entries(result).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  assert(result.dbRows === EXPECTED.dbRows, `DB rows changed: ${result.dbRows}`);
  assert(result.blogPosts >= EXPECTED.minBlogPosts, `blog post count below ${EXPECTED.minBlogPosts}: ${result.blogPosts}`);
  assert(result.duplicateBlogIds === 0, `duplicate blog ids: ${result.duplicateBlogIds}`);
  assert(result.duplicateBlogUrls === 0, `duplicate blog urls: ${result.duplicateBlogUrls}`);
  assert(result.carBatteryHtml === EXPECTED.carBatteryHtml, `car-battery HTML count changed: ${result.carBatteryHtml}`);
  assert(result.areaHtml === EXPECTED.areaHtml, `area HTML count changed: ${result.areaHtml}`);
  assert(result.batteryHtml === EXPECTED.batteryHtml, `battery HTML count changed: ${result.batteryHtml}`);
  assert(result.workCaseHtml >= 1, `work-case HTML missing: ${result.workCaseHtml}`);
  assert(result.sitemapUrls === result.expectedSitemapUrls, `sitemap URL count mismatch: ${result.sitemapUrls} / ${result.expectedSitemapUrls}`);
  assert(result.duplicateSitemapLoc === 0, `duplicate sitemap loc count: ${result.duplicateSitemapLoc}`);
  assert(result.lastmodCount === 0, `lastmod count: ${result.lastmodCount}`);
  assert(result.brokenInternalLinks === 0, `broken internal links: ${result.brokenInternalLinks}`);
  assert(result.canonicalChanged === 0, `canonical or og:url changed: ${result.canonicalChanged}`);
  assert(result.canonicalConsistencyErrors === 0, `canonical consistency errors: ${result.canonicalConsistencyErrors}`);
  assert(result.protectedUrlSetChanged === false, "protected sitemap URL set changed");
  assert(result.assetsSeoChanged === 0, `assets/seo changed files: ${result.assetsSeoChanged}`);
  assert(result.protectedSearchChanged === 0, `search function files changed: ${result.protectedSearchChanged}`);
  assert(result.protectedDbChanged === 0, `database files changed: ${result.protectedDbChanged}`);
  assert(result.historicalLoss === 0, `historical blog post loss: ${result.historicalLoss}`);
  assert(result.originalUrlChanged === 0, `blog original URL changed: ${result.originalUrlChanged}`);
  assert(result.originalTitleChanged === 0, `blog original title changed: ${result.originalTitleChanged}`);
  assert(result.publishedAtChanged === 0, `blog publishedAt changed: ${result.publishedAtChanged}`);

  console.log("");
  console.log("Blog Sync Regression Audit PASS");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("Blog Sync Regression Audit FAIL");
  console.error(error.message);
  process.exit(1);
}
