import assert from "node:assert/strict";
import { normalizeVerifiedWorkCaseHero, workCasePageCount, workCasePageNumber } from "./lib/blog-case-protection.js";

const hero = (total, current = 1) => `<div class="work-case-hero-meta"><span>전체 ${total}페이지</span><span>현재 ${current}페이지</span></div>`;
const posts = (count) => Array.from({ length: count }, (_, index) => ({ url: `https://example.test/${index}` }));

assert.equal(workCasePageCount(posts(380)), 19);
assert.equal(workCasePageCount(posts(381)), 20);
assert.equal(workCasePageCount(posts(400)), 20);
assert.equal(workCasePageCount(posts(401)), 21);
assert.equal(workCasePageCount([{ url: "https://blog.naver.com/example/1" }, { url: "https://m.blog.naver.com/example/1" }]), 1);
assert.equal(workCasePageNumber("work-cases/index.html"), 1);
assert.equal(workCasePageNumber("work-cases/page/20/index.html"), 20);
assert.equal(workCasePageNumber("index.html"), null);

assert.equal(normalizeVerifiedWorkCaseHero(hero(20), { totalPages: 20, pageNumber: 1 }), hero(20).replace("전체 20페이지", "전체 __VERIFIED_WORK_CASE_PAGE_TOTAL__페이지"));
assert.equal(normalizeVerifiedWorkCaseHero(hero(19), { totalPages: 20, pageNumber: 1 }), hero(19));
assert.equal(normalizeVerifiedWorkCaseHero(hero(20).replace("현재 1페이지", "현재 2페이지"), { totalPages: 20, pageNumber: 1 }), hero(20).replace("현재 1페이지", "현재 2페이지"));
assert.equal(normalizeVerifiedWorkCaseHero(hero(20).replace("<span>전체", "<span>변조"), { totalPages: 20, pageNumber: 1 }), hero(20).replace("<span>전체", "<span>변조"));

const protectedMarkup = `<h1>보호된 제목</h1>${hero(20)}<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>`;
assert.equal(normalizeVerifiedWorkCaseHero(protectedMarkup, { totalPages: 20, pageNumber: 1 }), protectedMarkup.replace("전체 20페이지", "전체 __VERIFIED_WORK_CASE_PAGE_TOTAL__페이지"));
assert.equal(normalizeVerifiedWorkCaseHero(protectedMarkup.replace("보호된 제목", "변조된 제목"), { totalPages: 20, pageNumber: 1 }), protectedMarkup.replace("보호된 제목", "변조된 제목").replace("전체 20페이지", "전체 __VERIFIED_WORK_CASE_PAGE_TOTAL__페이지"));
assert.equal(normalizeVerifiedWorkCaseHero(protectedMarkup.replace("BreadcrumbList", "WebPage"), { totalPages: 20, pageNumber: 1 }), protectedMarkup.replace("BreadcrumbList", "WebPage").replace("전체 20페이지", "전체 __VERIFIED_WORK_CASE_PAGE_TOTAL__페이지"));

console.log("Blog case protection page-total fixtures PASS");
