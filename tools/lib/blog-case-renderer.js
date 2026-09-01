import { BLOG_CASE_FALLBACK_IMAGE, escapeHtml, formatKoreanDate, normalizeText } from "./blog-case-utils.js";

const PAGE_SIZE = 5;

function uniqueValues(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function buildMetadata(post) {
  const facts = post.facts || {};
  const vehicles = uniqueValues((facts.vehicles || []).map((item) => item.displayName || item.vehicleName));
  const details = uniqueValues((facts.detailModels || []).map((item) => item.label));
  const neighborhoods = uniqueValues((facts.neighborhoods || []).map((item) => `${item.regionName || ""} ${item.name || ""}`.trim()));
  const regions = uniqueValues((facts.regions || []).map((item) => item.label || item.regionName));
  const batteries = uniqueValues(facts.batteryModels || []);
  const pieces = [
    ...vehicles.slice(0, 1),
    ...details.slice(0, 1),
    ...neighborhoods.slice(0, 1),
    ...regions.slice(0, 1),
    ...batteries.slice(0, 2)
  ];

  return uniqueValues(pieces).slice(0, 4).join(" · ");
}

function formatDisplayText(value) {
  return normalizeText(value).replace(/\b((?:AGM|DIN|DF|EFB)\s*-?\s*[0-9]{2,3}[A-Z]{0,3})(?=[가-힣])/gi, "$1 ");
}

export function renderBlogCaseSection(posts, {
  id = "blogCases",
  title = "실제 작업 사례",
  description = "일등밧데리 네이버 블로그에 기록된 실제 배터리 작업 사례입니다.",
  filters = []
} = {}) {
  const cases = Array.isArray(posts) ? posts.filter(Boolean) : [];

  if (!cases.length) {
    return "";
  }

  const totalPages = Math.ceil(cases.length / PAGE_SIZE);
  const filterChips = Array.isArray(filters) && filters.length > 1
    ? `
        <div class="blog-case-filters" role="group" aria-label="작업 사례 필터">
          ${filters.map((filter, index) => {
            const pressed = index === 0 ? " aria-pressed=\"true\"" : " aria-pressed=\"false\"";
            const label = normalizeText(filter.label) || "전체";
            const value = normalizeText(filter.value) || "all";
            const count = Number.isFinite(filter.count) ? filter.count : 0;
            return `<button type="button" class="blog-case-filter-chip" data-blog-case-filter="${escapeHtml(value)}"${pressed}>${escapeHtml(label)} <span>${count.toLocaleString("ko-KR")}</span></button>`;
          }).join("")}
        </div>`
    : "";
  const cards = cases.map((post, index) => {
    const page = Math.floor(index / PAGE_SIZE) + 1;
    const titleText = formatDisplayText(post.title) || "일등밧데리 실제 작업 사례";
    const summary = normalizeText(post.summary) || "일등밧데리 네이버 블로그에 공개된 실제 작업 사례입니다.";
    const dateLabel = formatKoreanDate(post.publishedAt) || "작성일 확인";
    const metadata = buildMetadata(post);
    const thumbnail = normalizeText(post.thumbnail) || BLOG_CASE_FALLBACK_IMAGE;
    const filterValues = uniqueValues(["all", ...(post.blogCaseFilters || [])]).join(" ");
    const hidden = page > 1 ? " hidden" : "";

    return `
          <article class="blog-case-card" data-blog-case-item data-blog-case-page="${page}" data-blog-case-filters="${escapeHtml(filterValues)}"${hidden}>
            <a class="blog-case-link" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer">
              <span class="blog-case-thumb">
                <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(titleText)}" loading="lazy" decoding="async" onerror="this.src='${BLOG_CASE_FALLBACK_IMAGE}'">
              </span>
              <span class="blog-case-body">
                <strong>${escapeHtml(titleText)}</strong>
                <time datetime="${escapeHtml(post.publishedAt || "")}">${escapeHtml(dateLabel)}</time>
                ${metadata ? `<span class="blog-case-meta">${escapeHtml(metadata)}</span>` : ""}
                <span class="blog-case-summary">${escapeHtml(summary)}</span>
                <span class="blog-case-more">실제 작업내용 보기 ›</span>
              </span>
            </a>
          </article>`;
  }).join("");

  const controls = totalPages > 1
    ? `
        <div class="blog-case-pagination" data-blog-case-pagination aria-label="실제 작업 사례 페이지 이동">
          <button type="button" class="blog-case-nav" data-blog-case-prev aria-label="이전 사례">‹</button>
          <span class="blog-case-page-status"><span data-blog-case-current>1</span> / <span data-blog-case-total>${totalPages}</span></span>
          <div class="blog-case-page-buttons">
            ${Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              const current = page === 1 ? " aria-current=\"page\"" : "";
              return `<button type="button" class="blog-case-page-button" data-blog-case-page-button="${page}"${current}>${page}</button>`;
            }).join("")}
          </div>
          <button type="button" class="blog-case-nav" data-blog-case-next aria-label="다음 사례">›</button>
        </div>`
    : "";

  return `
      <section class="blog-case-section" id="${escapeHtml(id)}" data-blog-case-section data-blog-case-total-pages="${totalPages}" aria-labelledby="${escapeHtml(id)}Title">
        <div class="section-heading">
          <p class="eyebrow">Blog Case</p>
          <h2 id="${escapeHtml(id)}Title">${escapeHtml(title)}</h2>
          <p class="section-desc">${escapeHtml(description)}</p>
        </div>
${filterChips}
        <div class="blog-case-grid">${cards}
        </div>
${controls}
      </section>`;
}
