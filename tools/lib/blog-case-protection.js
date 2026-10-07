import { canonicalNaverPostUrl } from "./blog-case-utils.js";

export function maskCaseBlocks(html) {
  // Normalize only line endings and the insertion seam surrounding case sections.
  return html.replace(/\r\n/g, "\n")
    .replace(/\s*<section\b[^>]*class="[^"]*\b(?:blog-case-section|home-work-case-section|work-case-list-section)\b[^"]*"[\s\S]*?<\/section>/g, "\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)*/g, "\n");
}

export const WORK_CASE_PAGE_SIZE = 20;

export function workCasePageCount(posts) {
  const urls = new Set(posts.map((post) => canonicalNaverPostUrl(post?.url || post?.id || "")).filter(Boolean));
  return Math.max(1, Math.ceil(urls.size / WORK_CASE_PAGE_SIZE));
}

export function workCasePageNumber(filePath) {
  if (filePath === "work-cases/index.html") return 1;
  const match = /^work-cases\/page\/(\d+)\/index\.html$/.exec(filePath);
  return match ? Number(match[1]) : null;
}

export function normalizeVerifiedWorkCaseHero(html, { totalPages, pageNumber }) {
  const total = totalPages.toLocaleString("ko-KR");
  const current = pageNumber.toLocaleString("ko-KR");
  const hero = new RegExp(
    `(<div class="work-case-hero-meta">\\s*<span>)전체 ${total}페이지(</span>\\s*<span>현재 ${current}페이지</span>\\s*</div>)`
  );

  return html.replace(hero, "$1전체 __VERIFIED_WORK_CASE_PAGE_TOTAL__페이지$2");
}
