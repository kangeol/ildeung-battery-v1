import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BLOG_CASE_FALLBACK_IMAGE,
  SITE_ORIGIN,
  canonicalNaverPostUrl,
  escapeHtml,
  formatKoreanDate,
  normalizeText,
  urlPathToFilePath
} from "./lib/blog-case-utils.js";
import { loadBlogCases } from "./lib/blog-case-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "work-cases");
const PAGE_SIZE = 20;
const HOME_CASE_COUNT = 6;
const HOME_START = "    <!-- WORK_CASE_HOME_START -->";
const HOME_END = "    <!-- WORK_CASE_HOME_END -->";
const HOME_INSERT_ANCHOR = "    <section class=\"section review-section\"";
const HERO_IMAGE = "/assets/seo/vehicle-battery-default.jpg";

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function ensureSafeOutputDir() {
  const resolved = path.resolve(OUTPUT_DIR);
  const rootPrefix = `${ROOT_DIR}${path.sep}`;

  if (!resolved.startsWith(rootPrefix)) {
    throw new Error(`Unsafe output directory: ${resolved}`);
  }

  fs.rmSync(resolved, { recursive: true, force: true });
  fs.mkdirSync(resolved, { recursive: true });
}

function pageDepthPrefix(depth) {
  return "../".repeat(depth);
}

function comparePosts(a, b) {
  const dateCompare = normalizeText(b.publishedAt).localeCompare(normalizeText(a.publishedAt));
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return normalizeText(b.id).localeCompare(normalizeText(a.id), "en", { numeric: true });
}

function dedupePosts(posts) {
  const byUrl = new Map();

  posts.forEach((post) => {
    const key = canonicalNaverPostUrl(post.url || post.id);

    if (!key || byUrl.has(key)) {
      return;
    }

    byUrl.set(key, post);
  });

  return [...byUrl.values()].sort(comparePosts);
}

function pageExists(urlPath) {
  return Boolean(urlPath) && fs.existsSync(urlPathToFilePath(urlPath));
}

function firstExistingPage(items = []) {
  return items.find((item) => item?.urlPath && pageExists(item.urlPath)) || null;
}

function uniqueValues(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function buildVehicleInfo(post) {
  const facts = post.facts || {};
  const detail = firstExistingPage(facts.detailModels || []);
  const vehicle = firstExistingPage(facts.vehicles || []);
  const label = detail
    ? normalizeText(`${detail.displayVehicleName || detail.vehicleName || ""} ${detail.label || ""}`)
    : normalizeText(vehicle?.displayName || vehicle?.vehicleName || facts.vehicle || "");

  return {
    label,
    href: vehicle?.urlPath || detail?.vehicleUrlPath || ""
  };
}

function buildLocationInfo(post) {
  const facts = post.facts || {};
  const actual = facts.actualWorkLocation || null;
  const neighborhood = firstExistingPage(facts.neighborhoods || []);
  const region = firstExistingPage(facts.regions || []);
  const area = firstExistingPage(facts.areas || []);
  const selected = actual && pageExists(actual.urlPath)
    ? actual
    : neighborhood || region || area;

  return {
    label: normalizeText(selected?.label || selected?.areaName || ""),
    href: selected?.urlPath || ""
  };
}

function buildBatteryLabel(post) {
  return uniqueValues(post.facts?.batteryModels || []).slice(0, 2).join(" · ");
}

function formatDisplayText(value) {
  return normalizeText(value).replace(/\b((?:AGM|DIN|DF|EFB)\s*-?\s*[0-9]{2,3}[A-Z]{0,3})(?=[가-힣])/gi, "$1 ");
}

function renderHeader(prefix) {
  return `
  <header class="area-topbar">
    <a class="area-home" href="${prefix}index.html" aria-label="홈으로 이동">‹ 홈</a>
    <a class="area-logo" href="${prefix}index.html" aria-label="일등밧데리 홈">
      <img src="${prefix}assets/logos/ildeung-logo.png" alt="일등밧데리">
    </a>
    <a class="area-call" href="tel:16449141" aria-label="일등밧데리 전화 상담">1644-9141</a>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer" aria-label="사이트 정보">
    <div class="site-footer-inner">
      <strong class="footer-brand">일등밧데리</strong>
      <p class="footer-line">대표번호 <a href="tel:16449141">1644-9141</a></p>
      <p class="footer-line">서울 · 경기 · 인천 출장배터리 교체</p>
      <p class="footer-line">자동차배터리 · AGM배터리 · 출장배터리교체 상담</p>
      <p class="footer-copy">Copyright © 2026 일등밧데리. All rights reserved.</p>
    </div>
  </footer>`;
}

function renderBreadcrumb(items) {
  return `
      <nav class="breadcrumbs" aria-label="현재 위치">
        ${items.map((item, index) => {
          const content = item.href
            ? `<a href="${item.href}">${escapeHtml(item.label)}</a>`
            : `<span>${escapeHtml(item.label)}</span>`;
          const separator = index < items.length - 1 ? `<span aria-hidden="true">&gt;</span>` : "";
          return `${content}${separator}`;
        }).join("\n        ")}
      </nav>`;
}

function breadcrumbJsonLd(items, canonicalPath) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? `${SITE_ORIGIN}${item.path || item.href}` : `${SITE_ORIGIN}${canonicalPath}`
    }))
  });
}

function renderShell({ depth, pageNumber, totalPages, title, description, canonicalPath, content }) {
  const prefix = pageDepthPrefix(depth);
  const canonical = `${SITE_ORIGIN}${canonicalPath}`;
  const breadcrumbs = [
    { label: "홈", href: `${prefix}index.html`, path: "/" },
    { label: "실제 작업사례", path: canonicalPath }
  ];

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="일등밧데리">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_ORIGIN}${HERO_IMAGE}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="800">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${SITE_ORIGIN}${HERO_IMAGE}">
  <link rel="stylesheet" href="${prefix}css/area-seo.css">
  <link rel="stylesheet" href="${prefix}css/work-cases.css">
  <script type="application/ld+json">${breadcrumbJsonLd(breadcrumbs, canonicalPath)}</script>
</head>
<body class="work-cases-page">
${renderHeader(prefix)}
  <main class="area-page-shell work-case-shell">
${renderBreadcrumb(breadcrumbs)}
      <section class="area-hero-card work-case-hero">
        <p class="eyebrow">Work Cases</p>
        <h1>실제 배터리 교체 작업사례</h1>
        <p class="area-hero-desc">서울·경기·인천에서 실제로 진행한 자동차 배터리 출장교체 사례입니다. 차량, 지역, 배터리 규격과 네이버 블로그 실제 작업내용을 확인할 수 있습니다.</p>
        <div class="work-case-hero-meta">
          <span>전체 ${totalPages > 1 ? `${totalPages.toLocaleString("ko-KR")}페이지` : "1페이지"}</span>
          <span>현재 ${pageNumber.toLocaleString("ko-KR")}페이지</span>
        </div>
      </section>
${content}
  </main>
${renderFooter()}
</body>
</html>
`;
}

function renderMetaLink(info, className) {
  if (!info.label) {
    return "";
  }

  if (info.href) {
    return `<a class="${className}" href="${info.href}">${escapeHtml(info.label)}</a>`;
  }

  return `<span class="${className}">${escapeHtml(info.label)}</span>`;
}

function renderCaseCard(post, { compact = false } = {}) {
  const title = formatDisplayText(post.title) || "일등밧데리 실제 작업 사례";
  const date = formatKoreanDate(post.publishedAt) || "작성일 확인";
  const vehicle = buildVehicleInfo(post);
  const location = buildLocationInfo(post);
  const battery = buildBatteryLabel(post);
  const summary = normalizeText(post.summary) || "일등밧데리 네이버 블로그에 공개된 자동차배터리 실제 작업 사례입니다.";
  const thumbnail = normalizeText(post.thumbnail) || BLOG_CASE_FALLBACK_IMAGE;
  const metaItems = [
    renderMetaLink(vehicle, "work-case-meta-link"),
    renderMetaLink(location, "work-case-meta-link"),
    battery ? `<span class="work-case-meta-battery">${escapeHtml(battery)}</span>` : ""
  ].filter(Boolean).join("");
  const compactClass = compact ? " is-compact" : "";

  return `
          <article class="work-case-card${compactClass}" data-work-case-id="${escapeHtml(post.id || "")}" data-work-case-url="${escapeHtml(canonicalNaverPostUrl(post.url || ""))}">
            <a class="work-case-thumb-link" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(title)} 네이버 블로그 실제 작업내용 보기">
              <span class="work-case-thumb">
                <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="this.src='${BLOG_CASE_FALLBACK_IMAGE}'">
              </span>
            </a>
            <div class="work-case-card-body">
              <time datetime="${escapeHtml(post.publishedAt || "")}">${escapeHtml(date)}</time>
              <h2>${escapeHtml(title)}</h2>
              ${metaItems ? `<div class="work-case-meta">${metaItems}</div>` : ""}
              <p>${escapeHtml(summary)}</p>
              <a class="work-case-more-link" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer">네이버 블로그 실제 작업내용 보기 →</a>
            </div>
          </article>`;
}

function pageUrl(pageNumber) {
  return pageNumber === 1 ? "/work-cases/" : `/work-cases/page/${pageNumber}/`;
}

function renderPagination(currentPage, totalPages) {
  if (totalPages <= 1) {
    return "";
  }

  const prev = currentPage > 1
    ? `<a class="work-case-page-nav" href="${pageUrl(currentPage - 1)}">← 이전</a>`
    : `<span class="work-case-page-nav is-disabled">← 이전</span>`;
  const next = currentPage < totalPages
    ? `<a class="work-case-page-nav" href="${pageUrl(currentPage + 1)}">다음 →</a>`
    : `<span class="work-case-page-nav is-disabled">다음 →</span>`;
  const numbers = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;

    if (page === currentPage) {
      return `<span class="work-case-page-number is-current" aria-current="page">${page}</span>`;
    }

    return `<a class="work-case-page-number" href="${pageUrl(page)}">${page}</a>`;
  }).join("");

  return `
      <nav class="work-case-pagination" aria-label="실제 작업사례 페이지 이동">
        ${prev}
        <div class="work-case-page-numbers">${numbers}</div>
        ${next}
      </nav>`;
}

function renderCasePage(posts, pageNumber, totalPages) {
  const start = (pageNumber - 1) * PAGE_SIZE;
  const pagePosts = posts.slice(start, start + PAGE_SIZE);
  const canonicalPath = pageUrl(pageNumber);
  const depth = pageNumber === 1 ? 1 : 3;
  const title = pageNumber === 1
    ? "자동차 배터리 교체 실제 작업사례 | 일등밧데리"
    : `자동차 배터리 교체 실제 작업사례 ${pageNumber}페이지 | 일등밧데리`;
  const description = pageNumber === 1
    ? "서울·경기·인천 자동차 배터리 출장교체 실제 작업사례를 최신순으로 확인하세요. 차량, 지역, 배터리 규격과 네이버 블로그 원문을 안내합니다."
    : `서울·경기·인천 자동차 배터리 출장교체 실제 작업사례 ${pageNumber}페이지입니다. 차량, 지역, 배터리 규격과 네이버 블로그 원문을 확인하세요.`;
  const content = `
      <section class="area-section work-case-list-section" aria-labelledby="workCaseListTitle">
        <div class="section-heading">
          <p class="eyebrow">Latest Cases</p>
          <h2 id="workCaseListTitle">최신 작업사례</h2>
          <p class="section-desc">네이버 블로그에 공개된 실제 작업글을 최신 발행일 기준으로 정리했습니다.</p>
        </div>
        <div class="work-case-list">${pagePosts.map((post) => renderCaseCard(post)).join("")}
        </div>
${renderPagination(pageNumber, totalPages)}
      </section>`;

  return renderShell({
    depth,
    pageNumber,
    totalPages,
    title,
    description,
    canonicalPath,
    content
  });
}

function renderHomeSection(posts) {
  return `    <section class="section home-work-case-section" aria-labelledby="homeWorkCaseTitle">
      <div class="section-heading">
        <p class="eyebrow">Work Case</p>
        <h2 id="homeWorkCaseTitle">실제 배터리 교체 작업사례</h2>
        <p class="section-description">서울·경기·인천에서 실제로 진행한 출장 배터리 교체 사례를 확인하세요.</p>
      </div>

      <div class="home-work-case-grid">${posts.slice(0, HOME_CASE_COUNT).map((post) => renderCaseCard(post, { compact: true })).join("")}
      </div>

      <div class="home-work-case-cta">
        <a class="cta-seo-link" href="/work-cases/">전체 실제 작업사례 보기 →</a>
      </div>
    </section>`;
}

function updateHomeSection(posts) {
  const indexPath = path.join(ROOT_DIR, "index.html");
  const current = fs.readFileSync(indexPath, "utf8");
  const section = renderHomeSection(posts);
  let next;

  if (current.includes(HOME_START) && current.includes(HOME_END)) {
    const pattern = new RegExp(`${HOME_START}[\\s\\S]*?${HOME_END}`);
    next = current.replace(pattern, `${HOME_START}\n${section}\n${HOME_END}`);
  } else {
    const index = current.indexOf(HOME_INSERT_ANCHOR);

    if (index < 0) {
      throw new Error("Could not find home insertion anchor before review section");
    }

    next = `${current.slice(0, index)}${HOME_START}\n${section}\n${HOME_END}\n\n${current.slice(index)}`;
  }

  if (next !== current) {
    fs.writeFileSync(indexPath, next, "utf8");
  }
}

function generate() {
  console.log("Work Case Hub Generate Start");
  console.log("");

  const sourcePosts = loadBlogCases();
  const posts = dedupePosts(sourcePosts);
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));

  ensureSafeOutputDir();

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const outputPath = pageNumber === 1
      ? path.join(OUTPUT_DIR, "index.html")
      : path.join(OUTPUT_DIR, "page", String(pageNumber), "index.html");

    writeFile(outputPath, renderCasePage(posts, pageNumber, totalPages));
  }

  updateHomeSection(posts);

  console.log(`Source posts: ${sourcePosts.length}`);
  console.log(`Unique work cases: ${posts.length}`);
  console.log(`Home latest cases: ${Math.min(HOME_CASE_COUNT, posts.length)}`);
  console.log(`Page size: ${PAGE_SIZE}`);
  console.log(`Work case pages: ${totalPages}`);
  console.log("");
  console.log("Work Case Hub Generate Complete");
}

generate();
