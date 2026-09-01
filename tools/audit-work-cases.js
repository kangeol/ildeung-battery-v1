import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalNaverPostUrl, normalizeText, SITE_ORIGIN } from "./lib/blog-case-utils.js";
import { loadBlogCases } from "./lib/blog-case-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PAGE_SIZE = 20;
const HOME_CASE_COUNT = 6;
const HOME_START = "<!-- WORK_CASE_HOME_START -->";
const HOME_END = "<!-- WORK_CASE_HOME_END -->";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
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

function comparePosts(a, b) {
  const dateCompare = normalizeText(b.publishedAt).localeCompare(normalizeText(a.publishedAt));
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return normalizeText(b.id).localeCompare(normalizeText(a.id), "en", { numeric: true });
}

function expectedPosts() {
  const byUrl = new Map();

  loadBlogCases().forEach((post) => {
    const key = canonicalNaverPostUrl(post.url || post.id);

    if (key && !byUrl.has(key)) {
      byUrl.set(key, post);
    }
  });

  return [...byUrl.values()].sort(comparePosts);
}

function pagePath(pageNumber) {
  return pageNumber === 1
    ? "work-cases/index.html"
    : `work-cases/page/${pageNumber}/index.html`;
}

function pageUrl(pageNumber) {
  return pageNumber === 1
    ? `${SITE_ORIGIN}/work-cases/`
    : `${SITE_ORIGIN}/work-cases/page/${pageNumber}/`;
}

function extractCanonical(source) {
  return source.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] || "";
}

function extractOgUrl(source) {
  return source.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i)?.[1] || "";
}

function extractCardUrls(source) {
  return [...source.matchAll(/data-work-case-url="([^"]+)"/g)].map((match) => match[1]);
}

function extractCardIds(source) {
  return [...source.matchAll(/data-work-case-id="([^"]+)"/g)].map((match) => match[1]);
}

function parseSitemapLocs() {
  const sitemap = readText("sitemap.xml");
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function extractHomeSection() {
  const source = readText("index.html");
  const start = source.indexOf(HOME_START);
  const end = source.indexOf(HOME_END);

  assert(start >= 0 && end > start, "home work case markers missing");
  return source.slice(start, end);
}

function main() {
  console.log("Work Case Audit Start");
  console.log("");

  const posts = expectedPosts();
  const expectedPageCount = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const htmlFiles = walk("work-cases").filter((filePath) => filePath.endsWith(".html")).sort();
  const sitemapLocs = parseSitemapLocs();
  const sitemapSet = new Set(sitemapLocs);
  const allCardUrls = [];
  const allPageIds = [];

  for (let pageNumber = 1; pageNumber <= expectedPageCount; pageNumber += 1) {
    const relativePath = pagePath(pageNumber);
    assert(fs.existsSync(path.join(ROOT_DIR, relativePath)), `missing work case page: ${relativePath}`);

    const source = readText(relativePath);
    const expectedUrl = pageUrl(pageNumber);
    const cardUrls = extractCardUrls(source);
    const expectedCount = posts.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE).length;

    assert(extractCanonical(source) === expectedUrl, `canonical mismatch: ${relativePath}`);
    assert(extractOgUrl(source) === expectedUrl, `og:url mismatch: ${relativePath}`);
    assert(!/noindex/i.test(source), `unexpected noindex: ${relativePath}`);
    assert(cardUrls.length === expectedCount, `page card count mismatch: ${relativePath}`);
    assert(cardUrls.length <= PAGE_SIZE, `page contains more than ${PAGE_SIZE} cases: ${relativePath}`);
    assert(sitemapSet.has(expectedUrl), `sitemap missing: ${expectedUrl}`);

    allCardUrls.push(...cardUrls);
    allPageIds.push(...extractCardIds(source));

    if (pageNumber < expectedPageCount) {
      assert(source.includes(`href="/work-cases/page/${pageNumber + 1}/"`), `next page link missing: ${relativePath}`);
    }

    if (pageNumber > 1) {
      assert(source.includes(`href="${pageNumber === 2 ? "/work-cases/" : `/work-cases/page/${pageNumber - 1}/`}"`), `previous page link missing: ${relativePath}`);
    }
  }

  assert(!fs.existsSync(path.join(ROOT_DIR, "work-cases", "page", "1", "index.html")), "work-cases/page/1 was generated");

  const expectedUrls = posts.map((post) => canonicalNaverPostUrl(post.url));
  const duplicateUrls = allCardUrls.length - new Set(allCardUrls).size;
  const homeSection = extractHomeSection();
  const homeIds = extractCardIds(homeSection);
  const latestIds = posts.slice(0, HOME_CASE_COUNT).map((post) => post.id);
  const workCaseSitemapUrls = sitemapLocs.filter((loc) => loc.startsWith(`${SITE_ORIGIN}/work-cases/`));
  const naverSitemapUrls = sitemapLocs.filter((loc) => loc.includes("blog.naver.com"));
  const results = {
    sourcePosts: loadBlogCases().length,
    uniqueWorkCases: posts.length,
    expectedWorkCasePages: expectedPageCount,
    workCaseHtml: htmlFiles.length,
    totalRenderedCases: allCardUrls.length,
    duplicateRenderedUrls: duplicateUrls,
    homeLatestCases: homeIds.length,
    paginationPage2Exists: fs.existsSync(path.join(ROOT_DIR, pagePath(2))),
    page1AliasExists: fs.existsSync(path.join(ROOT_DIR, "work-cases", "page", "1", "index.html")),
    sitemapWorkCaseUrls: workCaseSitemapUrls.length,
    naverUrlsInSitemap: naverSitemapUrls.length,
    latestHomeMatches: JSON.stringify(homeIds) === JSON.stringify(latestIds),
    renderedOrderMatches: JSON.stringify(allCardUrls) === JSON.stringify(expectedUrls)
  };

  Object.entries(results).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  assert(results.workCaseHtml === expectedPageCount, `work-case HTML count mismatch: ${results.workCaseHtml}`);
  assert(results.totalRenderedCases === posts.length, `rendered work case count mismatch: ${results.totalRenderedCases}`);
  assert(results.duplicateRenderedUrls === 0, `duplicate rendered Naver URLs: ${results.duplicateRenderedUrls}`);
  assert(results.homeLatestCases === Math.min(HOME_CASE_COUNT, posts.length), `home latest count mismatch: ${results.homeLatestCases}`);
  assert(results.latestHomeMatches, "home latest six does not match newest source posts");
  assert(results.renderedOrderMatches, "work cases are not rendered in source latest order");
  assert(results.sitemapWorkCaseUrls === expectedPageCount, `work-case sitemap count mismatch: ${results.sitemapWorkCaseUrls}`);
  assert(results.naverUrlsInSitemap === 0, `Naver URLs found in sitemap: ${results.naverUrlsInSitemap}`);

  console.log("");
  console.log("Work Case Audit PASS");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("Work Case Audit FAIL");
  console.error(error.message);
  process.exit(1);
}
