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
  vehicleDirectAnswerPages: 427,
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

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDirectAnswer(source) {
  const section = source.match(/<section\s+class=["'][^"']*\bdirect-answer\b[^"']*["'][\s\S]*?<\/section>/i)?.[0] || "";
  const question = section.match(/<h2[^>]*class=["'][^"']*\bdirect-answer-question\b[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "";
  const answer = section.match(/<p[^>]*class=["'][^"']*\bdirect-answer-text\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || "";

  return {
    section,
    question: stripHtml(question),
    answer: stripHtml(answer)
  };
}

function tokenizeBatteryText(value) {
  return String(value ?? "").toUpperCase().match(/\b(?:AGM?|DIN|DF)\d{2,3}[A-Z]{0,2}\b|\b\d{2,3}-\d{3}\b/g) || [];
}

function collectDbBatteryTokens() {
  const manufacturers = readJson("data/manufacturers.json");
  const tokens = new Set();

  manufacturers.forEach((manufacturer) => {
    const rows = readJson(path.join("data", manufacturer.file));
    rows.forEach((row) => {
      tokenizeBatteryText(`${row.defaultBattery || ""} ${row.upgradeBattery || ""}`).forEach((token) => tokens.add(token));
    });
  });

  return tokens;
}

function auditVehicleDirectAnswers() {
  const dbBatteryTokens = collectDbBatteryTokens();
  const files = walk("car-battery").filter((filePath) => filePath.endsWith(".html"));
  const vehicleFiles = files.filter((filePath) => readText(filePath).includes("battery-table"));
  let missing = 0;
  let empty = 0;
  let invalidBatteryTokens = 0;
  let undefinedNull = 0;
  let duplicateQuestionPages = 0;
  const invalidExamples = [];
  const answerCounts = new Map();

  vehicleFiles.forEach((filePath) => {
    const source = readText(filePath);
    const directAnswer = extractDirectAnswer(source);

    if (!directAnswer.section) {
      missing += 1;
      return;
    }

    if (!directAnswer.question || !directAnswer.answer) {
      empty += 1;
    }

    if (/\b(undefined|null)\b/i.test(directAnswer.section)) {
      undefinedNull += 1;
    }

    const questionOccurrences = [...source.matchAll(/direct-answer-question/g)].length;
    if (questionOccurrences !== 1) {
      duplicateQuestionPages += 1;
    }

    tokenizeBatteryText(directAnswer.answer).forEach((token) => {
      if (!dbBatteryTokens.has(token)) {
        invalidBatteryTokens += 1;
        if (invalidExamples.length < 5) {
          invalidExamples.push(`${filePath}: ${token}`);
        }
      }
    });

    if (directAnswer.answer) {
      answerCounts.set(directAnswer.answer, (answerCounts.get(directAnswer.answer) || 0) + 1);
    }
  });

  const duplicateGroups = [...answerCounts.values()].filter((count) => count > 1);
  const maxDuplicateGroupSize = Math.max(0, ...answerCounts.values());

  return {
    directAnswerPages: vehicleFiles.length,
    directAnswerMissing: missing,
    directAnswerEmpty: empty,
    directAnswerInvalidBatteryTokens: invalidBatteryTokens,
    directAnswerInvalidExamples: invalidExamples,
    directAnswerUndefinedNull: undefinedNull,
    directAnswerDuplicateQuestionPages: duplicateQuestionPages,
    directAnswerUniqueAnswers: answerCounts.size,
    directAnswerDuplicateGroups: duplicateGroups.length,
    directAnswerMaxDuplicateGroupSize: maxDuplicateGroupSize
  };
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
  const directAnswers = auditVehicleDirectAnswers();

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
    directAnswerPages: directAnswers.directAnswerPages,
    directAnswerMissing: directAnswers.directAnswerMissing,
    directAnswerEmpty: directAnswers.directAnswerEmpty,
    directAnswerInvalidBatteryTokens: directAnswers.directAnswerInvalidBatteryTokens,
    directAnswerUndefinedNull: directAnswers.directAnswerUndefinedNull,
    directAnswerDuplicateQuestionPages: directAnswers.directAnswerDuplicateQuestionPages,
    directAnswerUniqueAnswers: directAnswers.directAnswerUniqueAnswers,
    directAnswerDuplicateGroups: directAnswers.directAnswerDuplicateGroups,
    directAnswerMaxDuplicateGroupSize: directAnswers.directAnswerMaxDuplicateGroupSize,
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
  assert(result.directAnswerPages === EXPECTED.vehicleDirectAnswerPages, `Direct Answer page count changed: ${result.directAnswerPages}`);
  assert(result.directAnswerMissing === 0, `Direct Answer missing pages: ${result.directAnswerMissing}`);
  assert(result.directAnswerEmpty === 0, `Direct Answer empty pages: ${result.directAnswerEmpty}`);
  assert(result.directAnswerInvalidBatteryTokens === 0, `Direct Answer invalid battery tokens: ${directAnswers.directAnswerInvalidExamples.join(", ")}`);
  assert(result.directAnswerUndefinedNull === 0, `Direct Answer undefined/null pages: ${result.directAnswerUndefinedNull}`);
  assert(result.directAnswerDuplicateQuestionPages === 0, `Direct Answer duplicate question pages: ${result.directAnswerDuplicateQuestionPages}`);
  assert(result.directAnswerUniqueAnswers > 1, "Direct Answer answers appear to be identical across pages");
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
