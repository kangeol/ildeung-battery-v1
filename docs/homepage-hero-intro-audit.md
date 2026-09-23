# Homepage additive H1 intro audit

Task: ILDEUNG_HOMEPAGE_ADDITIVE_H1_HERO_INTRO_SEO_V1.
Baseline: `f98442a3595a80710ed8f22894b52aa7fecab1a2`; main; local/origin/actual remote equal; ahead/behind 0/0; clean before edits. PUSH=NO, DEPLOY=NO.

## Before implementation

Real homepage H1 count: 0; no H1 text. Hero advertising headline, supporting artwork and button lettering are baked into three existing images. Actual accessible link hotspots and slide-selection buttons remain HTML. Header -> main -> hero-section -> hero-slider -> three image slides + telephone/search hotspots + generated dots. Main then contains service area, vehicle lookup, store links, services, work cases, reviews, guide, existing SEO summary and final CTA; footer follows main.

Title: `일등밧데리 | 출장배터리 교체 · 자동차 배터리 찾기`.
Canonical: `https://battery1.co.kr/`.
Schema: existing one AutoRepair JSON-LD block, unchanged byte-for-byte.
Existing Seoul/Gyeonggi/Incheon service text, vehicle lookup, prices/links, actual work-case content and footer business details preserved.

## Exact implementation scope

- `index.html`: one homepage-only stylesheet link and one new intro before, not inside, the existing hero-section.
- `css/home-hero-intro.css`: only `.homepage-hero-intro` and descendant selectors; existing color tokens and 820px/374px breakpoints. No shared container changes.
- `tools/test-homepage-hero-intro.js`: additive-only HTML/source freeze test.
- `docs/homepage-hero-intro-audit.md`: this report.

H1: 서울·경기·인천 출장 자동차 배터리 교체

Supporting sentence: 국산차·수입차 차량별 배터리 확인부터 현장 출장 교체까지 빠르게 도와드립니다.

Visible real HTML, one H1, no hidden copies or aria-hidden. Two inline-block text spans wrap naturally; no manual line breaks. New block is in normal flow. No absolute positioning, transforms, negative margins or hero resizing.

## Typography and intro

Rect notation: x, y, width, height in CSS px.

| Width | H1 font / line-height | Supporting font / line-height | Intro rect | Added Y shift |
|---|---|---|---|---:|
| 1440 | 36 / 46.8 | 16 / 25.6 | 160, 63, 1120, 112.390625 | 112.390625 |
| 390 | 26 / 33.8 | 15 / 24 | 16, 63, 358, 145.59375 | 145.59375 |
| 819 | 26 / 33.8 | 15 / 24 | 16, 63, 787, 87.796875 | 87.796875 |
| 820 | 36 / 46.8 | 16 / 25.6 | 16, 63, 788, 112.390625 | 112.390625 |
| 360 | 26 / 33.8 | 15 / 24 | 12, 63, 336, 145.59375 | 145.59375 |

## Exact desktop DOMRects (1440px)

| Element | Before x,y,w,h | After x,y,w,h |
|---|---|---|
| Header | 0,0,1440,63 | 0,0,1440,63 |
| Hero outer section | 0,63,1440,702 | 0,175.390625,1440,702 |
| Hero slider/image | 160,105,1120,630 | 160,217.390625,1120,630 |
| Phone hotspot | 202.546875,600.1875,252,94.5 | 202.546875,712.578125,252,94.5 |
| Search hotspot | 445.59375,600.1875,330.390625,94.5 | 445.59375,712.578125,330.390625,94.5 |
| First lower service area | 160,765,1120,475.890625 | 160,877.390625,1120,475.890625 |
| Middle service section | 160,1992.140625,1120,328.5 | 160,2104.53125,1120,328.5 |
| Existing SEO summary | 160,4327.390625,1120,102.5 | 160,4439.78125,1120,102.5 |
| Footer | 0,4792.453125,1440,247.4375 | 0,4904.84375,1440,247.4375 |

## Exact mobile DOMRects (390px)

| Element | Before x,y,w,h | After x,y,w,h |
|---|---|---|
| Header | 0,0,390,63 | 0,0,390,63 |
| Hero outer section | 0,63,390,249.375 | 0,208.59375,390,249.375 |
| Hero slider/image | 16,81,358,201.375 | 16,226.59375,358,201.375 |
| Phone hotspot | 29.59375,239.296875,80.546875,30.203125 | 29.59375,384.890625,80.546875,30.203125 |
| Search hotspot | 107.28125,239.296875,105.609375,30.203125 | 107.28125,384.890625,105.609375,30.203125 |
| First lower service area | 16,312.375,358,173.34375 | 16,457.96875,358,173.34375 |
| Middle service section | 16,1168.96875,358,655.03125 | 16,1314.5625,358,655.03125 |
| Existing SEO summary | 16,4231.5625,358,149 | 16,4377.15625,358,149 |
| Footer | 0,4875.125,390,224.984375 | 0,5020.71875,390,224.984375 |

Subtract the added shift from every pre-existing main/footer element's after Y: original positions are retained. Header stays fixed in the same original document position. Every viewport checks 12 existing roots and 290 descendant nodes: identical DOM, dimensions, relative child positions, typography, padding, margins and grid/flex layout (0.6px tolerance). Images retain 16:9 and original sources. No horizontal overflow at any tested width, no header/intro/hero overlap.

Measurement note: original screenshots/DOMRects were captured before editing. A read-only baseline server later served `git show f98442a3:index.html` plus unchanged assets for repeatable comparison. Sliding images and review animation were frozen at frame zero only inside the measurement browser; lazy images were decoded before measuring. Automatic margins use CSS Typed OM's `auto` value, because the browser inconsistently exposed auto margins as 0px or resolved pixels through getComputedStyle; actual positions and spacing were independently checked. No application timers or behavior were changed in source.

## Tests and functional checks

`node tools/test-homepage-hero-intro.js`: PASS. Removing only the new exact intro and stylesheet link restores the complete baseline homepage byte-for-byte (line endings normalized). Shared CSS, existing hero images/DOM/buttons, lower content, title, canonical and schema unchanged. Protected vehicle/area/battery pages, consultation JS/data, blog and sitemap have no diffs.

Browser invariant script: 5 widths x (12 roots + 290 descendants) = 1510 pre-existing element comparisons PASS. Desktop/mobile top and lower screenshots visually inspected; 819/820 breakpoint screenshots inspected. Existing hero slide-2 button works, phone target remains `tel:16449141`, search hotspot navigates to `/search.html`. No telephone call placed.

Actual consultation smoke at 1440/390: 7 turns each, PASS. Required six inputs: AGM105는 얼마인가요? / 40AL 어디 브랜드 쓰나요? / AGM70 어디 브랜드인가요? / 60 / 저녁에도 되나요? / 델코로 할게요. One additional AGM70 brand+price check per viewport. Actual UI messages and session state matched the unchanged canonical engine. Consultation source changes = 0.

BLOG_COUNT=345; SITEMAP_URL_COUNT=1133.

## Hard gates

```text
HOMEPAGE_H1_COUNT_WRONG=0
HOMEPAGE_H1_TEXT_WRONG=0
HOMEPAGE_SUPPORT_TEXT_WRONG=0
HIDDEN_H1_PRESENT=0
HERO_IMAGE_CHANGED=0
HERO_INTERNAL_STRUCTURE_CHANGED=0
HERO_DIMENSION_CHANGED=0
HERO_BUTTON_CHANGED=0
LOWER_SECTION_STRUCTURE_CHANGED=0
LOWER_SECTION_DIMENSION_CHANGED_AFTER_NORMALIZED_SHIFT=0
HORIZONTAL_OVERFLOW_390=0
MOBILE_OVERLAP=0
DESKTOP_OVERLAP=0
UNAUTHORIZED_GLOBAL_CSS_CHANGE=0
UNAUTHORIZED_SHARED_CONTAINER_CHANGE=0
UNAUTHORIZED_SEO_GEO_CHANGE=0
CONSULTATION_SOURCE_CHANGED=0
```

## Evidence paths

External evidence root: `C:/Users/kang1/AppData/Local/Temp/home-h1-audit/`.

- `before.json`, `after.json`: all DOMRects, styles, DOM, headings and metadata.
- `invariants.json`: exact before/after measurements and normalized comparison result.
- `before-1440-top.png`, `after-1440-top.png`, `before-1440-lower.png`, `after-1440-lower.png`.
- `before-390-top.png`, `after-390-top.png`, `before-390-lower.png`, `after-390-lower.png`.
- `after-819-top.png`, `after-820-top.png`, `after-360-top.png`.
- `browser-1440.json`, `browser-390.json`: exact consultation smoke replies/state.

External measurement tools: `C:/Users/kang1/AppData/Local/Temp/home-h1-audit.mjs`, `home-h1-baseline-server.mjs`, `home-h1-consult-smoke.mjs`. Evidence never modifies generated pages. Normal local commit only; no push/deploy.
