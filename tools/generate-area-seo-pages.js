import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSitemap } from "./generate-sitemap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const AREA_DATA_FILE = path.join(ROOT_DIR, "seo-data", "service-areas.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "area");
const CSS_FILE = "css/area-seo.css";
const SITE_ORIGIN = "https://battery1.co.kr";
const AREA_THUMBNAIL_ROOT = "/assets/seo/area";
const STANDARD_BATTERY_URL = "https://smartstore.naver.com/battery1/products/414050800";
const AGM_BATTERY_URL = "https://smartstore.naver.com/battery1/products/575288571";
const AREA_ORDER = ["incheon", "seoul", "gyeonggi"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function pageDepthPrefix(depth) {
  return "../".repeat(depth);
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

function getAreas(data) {
  return AREA_ORDER
    .map((id) => data.areas[id])
    .filter(Boolean);
}

function getAllRegions(areas) {
  return areas.flatMap((area) => area.regions.map((region) => ({ area, region })));
}

function getAllNeighborhoods(areas) {
  return getAllRegions(areas).flatMap(({ area, region }) => (
    region.neighborhoods.map((neighborhood) => ({ area, region, neighborhood }))
  ));
}

function regionTitleLabel(area, region) {
  if (area.id === "seoul") return `서울 ${region.name}`;
  if (area.id === "incheon") return `인천 ${region.name}`;
  return region.shortName || region.name;
}

function regionH1Label(area, region) {
  if (area.id === "incheon") return `인천 ${region.name}`;
  return region.shortName || region.name;
}

function neighborhoodTitleLabel(area, region, neighborhood, duplicatesByArea) {
  const duplicateCount = duplicatesByArea.get(area.id)?.get(neighborhood.name) || 0;

  if (area.id === "seoul") {
    return `서울 ${region.name} ${neighborhood.name}`;
  }

  if (area.id === "incheon") {
    return duplicateCount > 1
      ? `인천 ${region.name} ${neighborhood.name}`
      : `인천 ${neighborhood.name}`;
  }

  return `${region.shortName || region.name} ${neighborhood.name}`;
}

function neighborhoodH1Label(area, region, neighborhood, duplicatesByArea) {
  const duplicateCount = duplicatesByArea.get(area.id)?.get(neighborhood.name) || 0;

  if (area.id === "incheon") {
    return duplicateCount > 1
      ? `인천 ${region.name} ${neighborhood.name}`
      : `인천 ${neighborhood.name}`;
  }

  if (area.id === "seoul" && duplicateCount > 1) {
    return `${region.name} ${neighborhood.name}`;
  }

  if (area.id === "gyeonggi") {
    return `${region.shortName || region.name} ${neighborhood.name}`;
  }

  return neighborhood.name;
}

function regionPath(area, region) {
  return `/area/${area.slug}/${region.id}.html`;
}

function neighborhoodPath(area, region, neighborhood) {
  return `/area/${area.slug}/${region.id}/${neighborhood.slug}.html`;
}

function areaIndexPath(area) {
  return `/area/${area.slug}/`;
}

function areaThumbnailPath(...segments) {
  return `${AREA_THUMBNAIL_ROOT}/${segments.join("/")}.png`;
}

function rootAreaThumbnailPath() {
  return areaThumbnailPath("index");
}

function areaHubThumbnailPath(area) {
  return areaThumbnailPath(area.slug, "index");
}

function regionThumbnailPath(area, region) {
  return areaThumbnailPath(area.slug, region.id);
}

function neighborhoodThumbnailPath(area, region, neighborhood) {
  return areaThumbnailPath(area.slug, region.id, neighborhood.slug);
}

function getCanonical(pathname) {
  return `${SITE_ORIGIN}${pathname}`;
}

function buildDuplicateNeighborhoodMap(areas) {
  const result = new Map();

  areas.forEach((area) => {
    const counts = new Map();
    area.regions.forEach((region) => {
      region.neighborhoods.forEach((neighborhood) => {
        counts.set(neighborhood.name, (counts.get(neighborhood.name) || 0) + 1);
      });
    });
    result.set(area.id, counts);
  });

  return result;
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
  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.label,
    item: item.href ? getCanonical(item.href) : getCanonical(canonicalPath)
  }));

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement
  });
}

function renderShell({ depth, title, description, canonicalPath, breadcrumbs, content, imagePath }) {
  const prefix = pageDepthPrefix(depth);
  const canonical = getCanonical(canonicalPath);
  const resolvedImagePath = imagePath || rootAreaThumbnailPath();

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
  <meta property="og:image" content="${SITE_ORIGIN}${resolvedImagePath}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="800">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${SITE_ORIGIN}${resolvedImagePath}">
  <link rel="stylesheet" href="${prefix}${CSS_FILE}">
  <script type="application/ld+json">${breadcrumbJsonLd(breadcrumbs, canonicalPath)}</script>
</head>
<body class="area-seo-page">
${renderHeader(prefix)}
  <main class="area-page-shell">
${content}
  </main>
${renderFooter()}
</body>
</html>
`;
}

function renderHero({ eyebrow, h1, description, imageAlt, imagePath, summaryTitle, summaryItems, note }) {
  const items = summaryItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const noteHtml = note ? `<p class="area-note">${escapeHtml(note)}</p>` : "";
  const resolvedImagePath = imagePath || rootAreaThumbnailPath();

  return `
      <section class="area-hero-card">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(h1)}</h1>
        <div class="area-hero-layout">
          <figure class="area-hero-image">
            <img src="${resolvedImagePath}" alt="${escapeHtml(imageAlt)}" loading="eager" decoding="async" onerror="this.closest('.area-hero-image').classList.add('is-missing')">
          </figure>
          <div class="area-hero-summary">
            <h2>${escapeHtml(summaryTitle)}</h2>
            <ul class="area-check-list">${items}</ul>
            <div class="area-button-row">
              <a class="btn primary" href="/search.html">내 차 배터리 직접 찾기</a>
              <a class="btn secondary" href="tel:16449141">1644-9141 전화상담</a>
            </div>
          </div>
        </div>
        <p class="area-hero-desc">${escapeHtml(description)}</p>
        ${noteHtml}
      </section>`;
}

function renderPriceLinks() {
  return `
      <section class="area-section" aria-labelledby="areaPriceTitle">
        <div class="section-heading">
          <p class="eyebrow">Price</p>
          <h2 id="areaPriceTitle">배터리 최저가 바로가기</h2>
          <p class="section-desc">차량에 맞는 배터리 타입을 확인한 뒤 현재 판매가격을 확인해 보세요.</p>
        </div>
        <div class="price-link-grid">
          <a class="price-link-card" href="${STANDARD_BATTERY_URL}" target="_blank" rel="noopener noreferrer">
            <span class="price-link-image">
              <img src="/assets/quick-links/standard-din.png" alt="일반타입 DIN 자동차배터리 가격 확인" loading="lazy" decoding="async" onerror="this.hidden=true">
            </span>
            <span class="price-link-text">
              <strong>일반타입 · DIN 배터리</strong>
              <span>현재 판매가격 확인</span>
            </span>
          </a>
          <a class="price-link-card" href="${AGM_BATTERY_URL}" target="_blank" rel="noopener noreferrer">
            <span class="price-link-image">
              <img src="/assets/quick-links/agm.png" alt="AGM 자동차배터리 가격 확인" loading="lazy" decoding="async" onerror="this.hidden=true">
            </span>
            <span class="price-link-text">
              <strong>AGM 배터리</strong>
              <span>현재 판매가격 확인</span>
            </span>
          </a>
        </div>
      </section>`;
}

function renderServiceInfo(locationLabel, parentLabel) {
  const parentCopy = parentLabel
    ? `${escapeHtml(parentLabel)} 안에서 차량 위치를 기준으로 상담 가능 여부를 확인합니다.`
    : "서울·경기·인천 서비스 가능 지역을 기준으로 상담 가능 여부를 확인합니다.";

  return `
      <section class="area-section" aria-labelledby="serviceInfoTitle">
        <div class="section-heading">
          <p class="eyebrow">Service</p>
          <h2 id="serviceInfoTitle">${escapeHtml(locationLabel)} 출장배터리 교체 안내</h2>
        </div>
        <div class="info-grid">
          <article class="info-card">
            <h3>차량 위치 방문 교체</h3>
            <p>${parentCopy} 아파트 지하주차장, 회사 주차장, 자택 인근 등 현장 상황에 맞춰 출장배터리 교체 상담을 도와드립니다.</p>
          </article>
          <article class="info-card">
            <h3>방전·시동불량 상담</h3>
            <p>자동차배터리 방전, 시동불량, 블랙박스 상시전원으로 인한 방전 등 증상 확인 후 필요한 배터리 규격을 안내합니다.</p>
          </article>
          <article class="info-card">
            <h3>일반 DIN·AGM 배터리</h3>
            <p>일반 DIN 타입부터 AGM 배터리까지 차량 조건에 맞춰 확인합니다. 가격은 상품 바로가기와 전화상담으로 현재 기준을 확인해 주세요.</p>
          </article>
          <article class="info-card">
            <h3>수입차 배터리 상담</h3>
            <p>수입차는 배터리 교체 후 코딩이나 진단기 확인이 필요한 경우가 있어, 차종과 연식을 함께 알려주시면 더 정확히 안내할 수 있습니다.</p>
          </article>
        </div>
      </section>`;
}

function renderReplacementProcess() {
  return `
      <section class="area-section" aria-labelledby="processTitle">
        <div class="section-heading">
          <p class="eyebrow">Process</p>
          <h2 id="processTitle">출장배터리 교체 과정</h2>
        </div>
        <ol class="process-list">
          <li><strong>차량 정보 확인</strong><span>제조사, 차량명, 연식, 연료, 세부모델을 확인합니다.</span></li>
          <li><strong>배터리 규격 상담</strong><span>일반 DIN 또는 AGM 적용 여부와 현장 결제 가능 여부를 안내합니다.</span></li>
          <li><strong>방문 교체</strong><span>전문 설치기사가 차량 위치로 방문해 배터리 교체와 기본 점검을 진행합니다.</span></li>
        </ol>
        <div class="process-link-row">
          <a class="text-link" href="/battery-replacement.html">출장배터리 교체 과정 자세히 보기 →</a>
          <a class="text-link" href="/service-area.html">서비스 지역 전체 안내 보기 →</a>
        </div>
      </section>`;
}

function renderAreaCta() {
  return `
      <section class="area-section">
        <div class="area-cta-card">
          <div>
            <p class="eyebrow">Check</p>
            <h2>차량별 배터리 가격 및 규격도 확인하세요</h2>
            <p>지역 상담 후 차종별 배터리 규격을 함께 확인하면 교체 상담이 더 빨라집니다.</p>
          </div>
          <div class="area-button-row">
            <a class="btn primary" href="/car-battery/index.html">차량별 배터리 가격 및 규격 확인하기</a>
            <a class="btn secondary" href="/search.html">내 차 배터리 직접 찾기</a>
            <a class="btn dark" href="tel:16449141">1644-9141 전화상담</a>
          </div>
        </div>
      </section>`;
}

function renderFaq(locationLabel, type) {
  const questions = type === "neighborhood"
    ? [
      [`${locationLabel}에서 출장배터리 교체가 가능한가요?`, `${locationLabel}은 일등밧데리 출장배터리 상담 가능 지역입니다. 다만 현장 위치와 일정에 따라 방문 가능 여부는 상담 시 최종 확인됩니다.`],
      [`${locationLabel} 자동차배터리 가격은 어떻게 확인하나요?`, "배터리 가격은 차량 규격, AGM 여부, 제품에 따라 달라질 수 있습니다. 배터리 최저가 바로가기에서 현재 판매가격을 확인하고, 출장교체 비용은 전화상담으로 안내받을 수 있습니다."],
      ["아파트 지하주차장에서도 교체 가능한가요?", "현장 진입과 작업 공간이 확보되면 지하주차장에서도 상담 가능합니다. 차량 위치와 주차 환경을 함께 알려주세요."],
      ["AGM 배터리도 교체 가능한가요?", "AGM 배터리는 차량 충전 제어 방식과 코딩 여부 확인이 중요합니다. 차종과 연식을 알려주시면 적용 가능 여부를 안내합니다."],
      ["정확한 배터리 규격은 어떻게 확인하나요?", "차량별 배터리 찾기에서 제조사, 차량명, 세부모델을 선택하거나 1644-9141로 문의해 주세요."]
    ]
    : [
      [`${locationLabel} 출장배터리 교체가 가능한가요?`, `${locationLabel}은 일등밧데리 출장배터리 상담 가능 지역입니다. 일부 위치는 이동 거리와 일정에 따라 서비스가 제한될 수 있습니다.`],
      [`${locationLabel} 자동차배터리 가격은 얼마인가요?`, "자동차배터리 가격은 규격과 AGM 여부에 따라 달라집니다. 고정 가격을 임의로 안내하지 않고, 현재 판매가격과 출장교체 상담을 구분해 안내합니다."],
      ["AGM 배터리도 출장교체 가능한가요?", "AGM 배터리 적용 차량은 차종별 규격 확인이 필요합니다. 차량 정보를 알려주시면 교체 가능 여부와 상담 방향을 안내합니다."],
      ["수입차 배터리 코딩도 가능한가요?", "수입차는 차종에 따라 진단기 확인이나 코딩이 필요할 수 있습니다. 정확한 가능 여부는 차량 정보를 기준으로 상담합니다."],
      ["차량 배터리 규격을 모르면 어떻게 하나요?", "내 차 배터리 직접 찾기에서 차량 조건을 선택하거나 1644-9141로 문의하시면 확인을 도와드립니다."]
    ];

  return `
      <section class="area-section" aria-labelledby="faqTitle">
        <div class="section-heading">
          <p class="eyebrow">FAQ</p>
          <h2 id="faqTitle">${escapeHtml(locationLabel)} 자주 묻는 질문</h2>
        </div>
        <div class="faq-grid">
          ${questions.map(([question, answer]) => `
          <article class="faq-card">
            <h3>${escapeHtml(question)}</h3>
            <p>${escapeHtml(answer)}</p>
          </article>`).join("")}
        </div>
      </section>`;
}

function renderRegionLinks(area) {
  return area.regions.map((region) => `
          <a class="area-link-card" href="${regionPath(area, region)}">
            <strong>${escapeHtml(regionTitleLabel(area, region))}</strong>
            <span>${region.neighborhoods.length.toLocaleString("ko-KR")}개 동 안내 보기</span>
          </a>`).join("");
}

function renderNeighborhoodLinks(area, region) {
  return region.neighborhoods.map((neighborhood) => {
    const district = neighborhood.district ? `${neighborhood.district} · ` : "";

    return `
          <a class="area-link-card small" href="${neighborhoodPath(area, region, neighborhood)}">
            <strong>${escapeHtml(neighborhood.name)} 출장배터리</strong>
            <span>${escapeHtml(district)}자동차배터리 교체 안내</span>
          </a>`;
  }).join("");
}

function getSiblingNeighborhoods(region, currentNeighborhood, limit = 18) {
  const siblings = region.neighborhoods.filter((item) => item.slug !== currentNeighborhood.slug);
  if (siblings.length <= limit) {
    return siblings;
  }

  const currentIndex = region.neighborhoods.findIndex((item) => item.slug === currentNeighborhood.slug);
  const rotated = [...siblings.slice(Math.max(0, currentIndex - 6)), ...siblings.slice(0, Math.max(0, currentIndex - 6))];
  return rotated.slice(0, limit);
}

function getStableVariantIndex(value, size) {
  let hash = 2166136261;
  const text = normalizeText(value);

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) % size;
}

function getLocalCopyLabel(area, region, neighborhood, duplicatesByArea) {
  const duplicateCount = duplicatesByArea.get(area.id)?.get(neighborhood.name) || 0;

  if (area.id === "seoul") {
    return `서울 ${region.name} ${neighborhood.name}`;
  }

  if (area.id === "incheon") {
    return duplicateCount > 1
      ? `인천 ${region.name} ${neighborhood.name}`
      : `인천 ${neighborhood.name}`;
  }

  return `${region.name} ${neighborhood.name}`;
}

function getLocalContextCopy(area, region, neighborhood, duplicatesByArea) {
  const localLabel = getLocalCopyLabel(area, region, neighborhood, duplicatesByArea);
  const regionName = region.name;
  const neighborhoodName = neighborhood.name;
  const variants = [
    `${localLabel}은 일등밧데리 출장배터리 서비스 가능 지역입니다. 차량 위치와 차종을 확인한 뒤 자동차배터리 규격 및 방문 교체 상담을 안내합니다.`,
    `${neighborhoodName}에서 자동차배터리 교체가 필요한 경우 차량 위치와 세부모델을 확인해 출장배터리 상담을 받을 수 있습니다. ${regionName} 서비스 가능지역으로 상담 후 방문 일정을 안내합니다.`,
    `${localLabel}에서는 자동차배터리 방전, 시동 불량, 배터리 교체 상담이 가능합니다. 차량별 배터리 규격과 배터리 가격을 먼저 확인하면 더 정확한 안내를 받을 수 있습니다.`,
    `${neighborhoodName}은 일등밧데리 출장배터리 가능 지역에 포함됩니다. ${regionName} 내 차량 사양에 맞춰 일반 DIN 배터리와 AGM 배터리 규격을 확인한 뒤 교체 상담을 안내합니다.`
  ];
  const key = `${area.id}:${region.id}:${neighborhood.slug}:${neighborhood.code || ""}`;

  return {
    index: getStableVariantIndex(key, variants.length),
    text: variants[getStableVariantIndex(key, variants.length)]
  };
}

function renderSiblingLinks(area, region, neighborhood) {
  const siblings = getSiblingNeighborhoods(region, neighborhood);
  const parentLabel = region.name;
  const links = siblings.map((item) => `
          <a class="area-link-card small" href="${neighborhoodPath(area, region, item)}">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(parentLabel)} 서비스 동</span>
          </a>`).join("");

  return `
      <section class="area-section" aria-labelledby="siblingTitle">
        <div class="section-heading">
          <p class="eyebrow">Nearby</p>
          <h2 id="siblingTitle">${escapeHtml(parentLabel)} 다른 출장 가능 지역</h2>
          <p class="section-desc">현재 선택한 ${escapeHtml(neighborhood.name)}을 제외한 ${escapeHtml(parentLabel)} 서비스 가능 동입니다.</p>
        </div>
        <div class="area-link-grid compact">${links}
        </div>
        <a class="text-link" href="${regionPath(area, region)}">${escapeHtml(parentLabel)} 전체 동 보기 →</a>
      </section>`;
}

function renderAreaRootPage(areas) {
  const imagePath = rootAreaThumbnailPath();
  const breadcrumbs = [
    { label: "홈", href: "/" },
    { label: "출장배터리 서비스 지역" }
  ];
  const regionBlocks = areas.map((area) => `
        <article class="hub-card">
          <h2>${escapeHtml(area.name)} 출장배터리</h2>
          <p>${escapeHtml(area.fullName)} 서비스 가능 구/시 대표 페이지입니다. 지역명을 선택하면 상세 안내로 이동합니다.</p>
          <div class="area-link-grid">${renderRegionLinks(area)}
          </div>
        </article>`).join("");
  const content = `${renderBreadcrumb(breadcrumbs)}
      ${renderHero({
        eyebrow: "Service Area",
        h1: "서울·경기·인천 출장배터리 서비스 지역",
        description: "일등밧데리는 서울·경기·인천 지정 가능 지역을 중심으로 차량 위치 방문 배터리 교체 상담을 안내합니다. 지역별 페이지에서 출장배터리 교체, 자동차배터리 가격 확인, 차량별 규격 확인으로 바로 이동할 수 있습니다.",
        imageAlt: "서울 경기 인천 출장배터리 서비스 지역 안내 - 일등밧데리",
        imagePath,
        summaryTitle: "지역별 안내 한눈에 확인",
        summaryItems: [
          "서울·경기·인천 서비스 가능 지역",
          "구/시 및 법정동별 안내",
          "현장 카드·현금·이체 결제 상담",
          "일반 DIN·AGM 배터리 가격 확인",
          "차량별 배터리 규격 연결"
        ]
      })}
      <section class="area-section hub-section" aria-labelledby="hubRegionTitle">
        <div class="section-heading">
          <p class="eyebrow">Coverage</p>
          <h2 id="hubRegionTitle">권역별 출장배터리 바로가기</h2>
        </div>
        <div class="hub-grid">${regionBlocks}
        </div>
      </section>
      ${renderPriceLinks()}
      ${renderAreaCta()}
      ${renderReplacementProcess()}
      ${renderFaq("서울·경기·인천", "region")}`;

  return renderShell({
    depth: 1,
    title: "서울·경기·인천 출장배터리 서비스 지역 | 일등밧데리",
    description: "서울·경기·인천 출장배터리 교체 가능 지역과 자동차배터리 가격, DIN·AGM 배터리 상담 정보를 확인하세요.",
    canonicalPath: "/area/",
    breadcrumbs,
    content,
    imagePath
  });
}

function renderAreaHubPage(area) {
  const imagePath = areaHubThumbnailPath(area);
  const breadcrumbs = [
    { label: "홈", href: "/" },
    { label: "출장배터리 서비스 지역", href: "/area/" },
    { label: area.name }
  ];
  const note = area.id === "incheon"
    ? "인천 지역 SEO 페이지는 2026년 7월 1일 시행된 행정체제 개편 이후 현행 서해구·검단구 기준을 사용합니다."
    : "";
  const content = `${renderBreadcrumb(breadcrumbs)}
      ${renderHero({
        eyebrow: `${area.name} Area`,
        h1: `${area.name} 출장배터리 서비스 지역`,
        description: `${area.fullName} 내 지정 서비스 가능 지역의 출장배터리 교체와 자동차배터리 가격 확인 안내입니다. 가까운 구/시를 선택해 세부 동별 상담 정보를 확인하세요.`,
        imageAlt: `${area.name} 출장배터리 서비스 지역 안내 - 일등밧데리`,
        imagePath,
        summaryTitle: `${area.name} 서비스 흐름`,
        summaryItems: [
          "서비스 가능 구/시 대표 페이지",
          "동별 출장배터리 안내",
          "배터리 방전·시동불량 상담",
          "일반 DIN·AGM 배터리 확인",
          "1644-9141 전화상담 연결"
        ],
        note
      })}
      <section class="area-section" aria-labelledby="areaRegionTitle">
        <div class="section-heading">
          <p class="eyebrow">Regions</p>
          <h2 id="areaRegionTitle">${escapeHtml(area.name)} 주요 서비스 지역</h2>
          <p class="section-desc">아래 지역은 현재 지역 SEO V1 기준의 상담 가능 구/시입니다.</p>
        </div>
        <div class="area-link-grid">${renderRegionLinks(area)}
        </div>
      </section>
      ${renderServiceInfo(area.name, area.fullName)}
      ${renderPriceLinks()}
      ${renderAreaCta()}
      ${renderReplacementProcess()}
      ${renderFaq(area.name, "region")}`;

  return renderShell({
    depth: 2,
    title: `${area.name} 출장배터리 서비스 지역 | 자동차배터리 교체 | 일등밧데리`,
    description: `${area.name} 출장배터리 교체 가능 지역을 확인하세요. 자동차배터리 가격, AGM 배터리, 차량 위치 방문 교체 상담을 안내합니다.`,
    canonicalPath: areaIndexPath(area),
    breadcrumbs,
    content,
    imagePath
  });
}

function renderRegionPage(area, region) {
  const imagePath = regionThumbnailPath(area, region);
  const titleLabel = regionTitleLabel(area, region);
  const h1Label = regionH1Label(area, region);
  const breadcrumbs = [
    { label: "홈", href: "/" },
    { label: "출장배터리 서비스 지역", href: "/area/" },
    { label: area.name, href: areaIndexPath(area) },
    { label: region.name }
  ];
  const districtText = region.districts?.length
    ? `${region.districts.map((district) => district.name).join("·")} 중심으로 법정동별 페이지를 생성했습니다.`
    : `${region.name} 내 현존 법정동 기준으로 페이지를 생성했습니다.`;
  const content = `${renderBreadcrumb(breadcrumbs)}
      ${renderHero({
        eyebrow: "Local Service",
        h1: `${h1Label} 출장배터리 가격 및 교체 안내`,
        description: `${titleLabel} 지역에서 자동차배터리 방전이나 시동불량이 발생했을 때 차량 위치 방문 교체 상담을 받을 수 있습니다. 배터리 가격은 적용 규격과 AGM 여부에 따라 달라질 수 있으므로 차량별 규격 확인과 전화상담을 함께 이용해 주세요.`,
        imageAlt: `${h1Label} 출장배터리 가격 및 교체 안내 - 일등밧데리`,
        imagePath,
        summaryTitle: `${h1Label} 출장배터리 한눈에 확인`,
        summaryItems: [
          "차량 위치 방문 교체 상담",
          "방전·시동불량 증상 안내",
          "일반 DIN·AGM 배터리 구분",
          "수입차 배터리 및 코딩 상담",
          "현장 카드·현금·이체 가능"
        ],
        note: region.note || ""
      })}
      <section class="area-section" aria-labelledby="regionLocalTitle">
        <div class="section-heading">
          <p class="eyebrow">Neighborhoods</p>
          <h2 id="regionLocalTitle">${escapeHtml(h1Label)} 서비스 가능 동</h2>
          <p class="section-desc">${escapeHtml(districtText)} 아래 동 이름을 선택하면 지역별 출장배터리 안내를 확인할 수 있습니다.</p>
        </div>
        <div class="area-link-grid compact">${renderNeighborhoodLinks(area, region)}
        </div>
      </section>
      ${renderServiceInfo(h1Label, titleLabel)}
      ${renderPriceLinks()}
      ${renderAreaCta()}
      ${renderReplacementProcess()}
      ${renderFaq(h1Label, "region")}`;

  return renderShell({
    depth: 2,
    title: `${titleLabel} 출장배터리 가격 및 자동차배터리 교체 | 일등밧데리`,
    description: `${titleLabel} 출장배터리 교체와 자동차배터리 가격을 확인하세요. 차량 위치 방문 교체 상담, 일반 DIN·AGM 배터리, 국산차·수입차 배터리 상담을 안내합니다.`,
    canonicalPath: regionPath(area, region),
    breadcrumbs,
    content,
    imagePath
  });
}

function renderNeighborhoodPage(area, region, neighborhood, duplicatesByArea) {
  const imagePath = neighborhoodThumbnailPath(area, region, neighborhood);
  const titleLabel = neighborhoodTitleLabel(area, region, neighborhood, duplicatesByArea);
  const h1Label = neighborhoodH1Label(area, region, neighborhood, duplicatesByArea);
  const regionLabel = regionH1Label(area, region);
  const localContext = getLocalContextCopy(area, region, neighborhood, duplicatesByArea);
  const legalContext = neighborhood.district
    ? `${region.name} ${neighborhood.district}`
    : region.name;
  const breadcrumbs = [
    { label: "홈", href: "/" },
    { label: "출장배터리 서비스 지역", href: "/area/" },
    { label: area.name, href: areaIndexPath(area) },
    { label: region.name, href: regionPath(area, region) },
    { label: neighborhood.name }
  ];
  const content = `${renderBreadcrumb(breadcrumbs)}
      ${renderHero({
        eyebrow: "Neighborhood Service",
        h1: `${h1Label} 출장배터리 가격 및 교체 안내`,
        description: `${titleLabel} 지역은 ${regionLabel} 출장배터리 상담 가능 범위에 포함됩니다. 자동차배터리 방전, 시동불량, 일반 DIN 및 AGM 배터리 교체 상담은 차량 정보와 현장 위치 확인 후 안내합니다.`,
        imageAlt: `${h1Label} 출장배터리 가격 및 교체 안내 - 일등밧데리`,
        imagePath,
        summaryTitle: `${h1Label} 상담 전 확인`,
        summaryItems: [
          `${legalContext} 서비스 동`,
          "차량 위치 방문 교체 상담",
          "아파트·회사·자택 주차 위치 확인",
          "현장 카드·현금·이체 가능",
          "차량별 배터리 규격 연결"
        ]
      })}
      <section class="area-section" aria-labelledby="localInfoTitle">
        <div class="local-detail-card">
          <p class="eyebrow">Local Detail</p>
          <h2 id="localInfoTitle">${escapeHtml(neighborhood.name)} 출장 가능 안내</h2>
          <p class="local-context-copy">${escapeHtml(localContext.text)}</p>
          <p>${escapeHtml(neighborhood.legalName)} 기준의 지역 안내입니다. 실제 방문 가능 여부는 기사 동선과 현장 주차 환경에 따라 달라질 수 있어 1644-9141 전화상담으로 최종 확인합니다.</p>
          <p>자동차 밧데리 교체가 처음이라도 차량명과 연식, 연료만 알려주시면 기본 규격 확인부터 상담을 도와드립니다.</p>
        </div>
      </section>
      ${renderSiblingLinks(area, region, neighborhood)}
      ${renderServiceInfo(h1Label, regionLabel)}
      ${renderPriceLinks()}
      ${renderAreaCta()}
      ${renderReplacementProcess()}
      ${renderFaq(h1Label, "neighborhood")}`;

  return renderShell({
    depth: 3,
    title: `${titleLabel} 출장배터리 가격 및 자동차배터리 교체 | 일등밧데리`,
    description: `${titleLabel} 출장배터리 교체와 자동차배터리 가격을 확인하세요. 방전·시동불량, 일반 DIN·AGM 배터리, 차량 위치 방문 교체 상담을 안내합니다.`,
    canonicalPath: neighborhoodPath(area, region, neighborhood),
    breadcrumbs,
    content,
    imagePath
  });
}

function assertNoForbiddenAreas(generatedPaths) {
  const forbidden = [
    "cheoin",
    "jemulpo",
    "yeongjong",
    "/area/incheon/seo-gu"
  ];
  const matches = generatedPaths.filter((pathname) => (
    forbidden.some((token) => pathname.includes(token))
  ));

  if (matches.length) {
    throw new Error(`Forbidden area paths generated: ${matches.join(", ")}`);
  }
}

function validateSlugCollisions(areas) {
  const collisions = [];

  areas.forEach((area) => {
    area.regions.forEach((region) => {
      const slugs = new Map();
      region.neighborhoods.forEach((neighborhood) => {
        const owners = slugs.get(neighborhood.slug) || [];
        owners.push(neighborhood.name);
        slugs.set(neighborhood.slug, owners);
      });

      [...slugs.entries()]
        .filter(([, owners]) => owners.length > 1)
        .forEach(([slug, owners]) => {
          collisions.push(`${area.id}/${region.id}/${slug}: ${owners.join(", ")}`);
        });
    });
  });

  return collisions;
}

function generate() {
  console.log("Area SEO Generate Start");
  console.log("");

  const data = readJson(AREA_DATA_FILE);
  const areas = getAreas(data);
  const duplicateNeighborhoods = buildDuplicateNeighborhoodMap(areas);
  const slugCollisions = validateSlugCollisions(areas);

  if (slugCollisions.length) {
    throw new Error(`Slug collisions detected: ${slugCollisions.join("; ")}`);
  }

  ensureSafeOutputDir();

  const generatedPaths = [];

  writeFile(path.join(OUTPUT_DIR, "index.html"), renderAreaRootPage(areas));
  generatedPaths.push("/area/");

  areas.forEach((area) => {
    writeFile(path.join(OUTPUT_DIR, area.slug, "index.html"), renderAreaHubPage(area));
    generatedPaths.push(areaIndexPath(area));

    area.regions.forEach((region) => {
      writeFile(path.join(OUTPUT_DIR, area.slug, `${region.id}.html`), renderRegionPage(area, region));
      generatedPaths.push(regionPath(area, region));

      region.neighborhoods.forEach((neighborhood) => {
        writeFile(
          path.join(OUTPUT_DIR, area.slug, region.id, `${neighborhood.slug}.html`),
          renderNeighborhoodPage(area, region, neighborhood, duplicateNeighborhoods)
        );
        generatedPaths.push(neighborhoodPath(area, region, neighborhood));
      });
    });
  });

  assertNoForbiddenAreas(generatedPaths);

  const allRegions = getAllRegions(areas);
  const allNeighborhoods = getAllNeighborhoods(areas);
  const sitemapEntries = generateSitemap();

  console.log(`Official source: ${data.source?.name || "unknown"}`);
  console.log(`Source URL: ${data.source?.url || "unknown"}`);
  console.log(`Incheon regions: ${data.areas.incheon.regions.length}`);
  console.log(`Seoul regions: ${data.areas.seoul.regions.length}`);
  console.log(`Gyeonggi regions: ${data.areas.gyeonggi.regions.length}`);
  console.log(`Owner regions: ${allRegions.length}`);
  console.log(`Legal neighborhoods: ${allNeighborhoods.length}`);
  console.log(`Area hubs: ${areas.length + 1}`);
  console.log(`Region pages: ${allRegions.length}`);
  console.log(`Neighborhood pages: ${allNeighborhoods.length}`);
  console.log(`Total area html: ${generatedPaths.length}`);
  console.log(`Slug collisions: ${slugCollisions.length}`);
  console.log(`Sitemap URLs: ${sitemapEntries.length}`);
  console.log("");
  console.log("Area SEO Generate Complete");
}

generate();
