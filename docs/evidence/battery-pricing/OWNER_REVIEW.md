# Battery pricing predeploy review

Task: ILDEUNG_AI_CONSULT_BATTERY_PRICE_CATALOG_AND_COMPOSITE_HANDLING_V1

Baseline: main, local and fetched origin/main both da2e2c0f93e119d82123e5d63b868e30195c00b6; ahead/behind 0/0; clean. No merge needed. No push or production deployment performed.

## Authority and implementation

- Owner price table is the only runtime monetary source: data/battery-prices.json, version owner-2026-09-22-v1, effectiveAt 2026-09-22, KRW integers, 26 prices and 12 aliases.
- AGM105 280000; AGM60 155000; DF60R 100000; DF80R 110000; DIN60L/DIN60HL 105000. DIN60 normalizes to DIN60L for pricing only; no assertion that L/HL fitments are interchangeable.
- UI loads the price catalog once with no-store alongside canonical manufacturer and area data. Conversation receives the catalog explicitly; no price truth in vehicle rows or JS constants.
- Direct battery price questions do not set a vehicle's confirmedBattery. Existing vehicle/area facts and pending questions remain intact.
- A resolved default battery receives its exact catalog price. Retained PRICE intent survives vehicle questions, year correction, and session encode/decode.
- After useful canonical questions are exhausted, a single remaining composite specification shows every component price and current-battery/on-site confirmation. confirmedBattery stays null. Distinct conflicting canonical specifications still cannot auto-confirm.
- Unknown codes, DIN70L, and customer-center results never acquire an invented monetary amount. Phone href remains tel:1644-9141. Both store hrefs unchanged.

## Canonical correction and SEO

Only Hyundai index 40 (zero based), 싼타페 / 20~23년 / 가솔린+전기 / 더 뉴 싼타페 하이브리드 TM: defaultBattery AG60 -> AGM60, explicit Owner authority. All other manufacturer rows byte-equivalent after JSON parsing to baseline.

Generated HTML changes (complete list):

1. car-battery/hyundai/santafe.html: corrected table cell; direct answer's first four distinct battery names now include AGM95 instead of obsolete AG60.
2. car-battery/hyundai/santafe/tm.html: AG60 -> AGM60 in table and direct answer.

Other HTML change: smart-consult/index.html module cache version flow-v1 -> price-v1. No price insertion into SEO pages. All title/H1/canonical/schema, other body text, blog, area pages, URL sets and sitemap unchanged. Exact full-HTML comparison tests retain negative mutation checks. Historical evidence remains untouched.

## Coverage and safety

15 files, 917 rows; 30 distinct nonempty default/upgrade strings: 25 EXACT_PRICED_SINGLE, 3 COMPOSITE_ALL_COMPONENTS_PRICED, 1 CUSTOMER_CENTER, 1 UNPRICED_SINGLE (DIN70L, chevrolet.json[30]); malformed/unhandled 0. Empty upgrade cells mean no upgrade, not an unpriced product.

pricing.json: independent Owner fixture checks all 26 prices, aliases/case/space variants, unknowns, composites, vehicle flows, 3668 row-stage consultations with the catalog, and exact HTML/data scope.

simulation.json: prior certainty suite, 3668 stages plus natural-language/year checks; wrong battery 0, ambiguous auto-confirm 0, unknown override 0; 877 ambiguous cases prevented.

matrix.json: 665 areas (608 neighborhoods), 6650 short-name phrases, 6650 parent-qualified phrases, 219 collision cases, 917 follow-up loops. Unique/no-space false negatives, wrong areas and ambiguous auto-confirm all 0. This compatibility suite intentionally omits catalog injection to also verify safe unavailable-price behavior; current priced integration is covered by pricing.json and browser.json.

All new price gates 0: wrong map value, obsolete AGM105 270000, current-data AG60, fabricated price, composite single auto-confirm, unpriced numeric price, unhandled battery string. Historical audit/test fixtures mentioning AG60 are retained as evidence and negative tests, not live data.

## Regression execution

PASS: test-smart-consult (110), conversation (3254), NLU V4 (989), V5 (4112), V7 (39636 plus 470 model coverage), viewport, launcher (1114 included / 21 excluded / 427 vehicle contexts), branding (1135 HTML), certainty scope, sitemap stability (1133 URLs), sitewide service, blog-sync regression, work-case audit.

Blog preservation: 345 posts, historicalLoss 0, original URL/title changes 0. Work-case pages remain 18 with 345 cases; no consultation integration introduced. Phone/DIN/AGM hrefs unchanged. Existing XSS, session, correction, symptom/recovery and context-transfer assertions passed.

## Browser evidence

agent-browser skill used for actual local UI interactions. browser.json records exact answers for 24 submissions at 1440px and 390px, all eight requested flows at both sizes:

- AGM105: 28만원; AGM60: 15만5천원; 80R: DF80R 11만원.
- BMW -> 5시리즈 -> 2020년식: AGM95 22만원.
- GN7 2023 가솔린 2.5: AGM70 17만원.
- MINI: AGM70 17만원 and AGM80 19만원, 둘 중 하나, 현장/기존 배터리 확인; no single confirmed battery.
- DIN70L: 정확한 가격 확인이 필요합니다, no monetary number, phone link.
- 구월동 BMW -> 5시리즈 -> 2020년식: area retained and AGM95 22만원.

Screenshots visually inspected at both sizes. Mobile focus was chatInput; window.scrollY remained 0 after scroll; messages pane scrollable; composer bottom 819.5 < viewport height 844; horizontal overflow false; consultation launcher count 0. This is desktop-browser viewport emulation, not physical-device keyboard certification.

Additional manual UI checks: navigation reload restored 구월동/BMW/2020/AGM95/22만원; GN7 engine quick-reply button 가솔린 2.5 returned AGM70/17만원, in addition to free-text coverage.

## Review required

DIN70L remains unpriced pending Owner amount. GN7 3.5 remains customer-center confirmation, no fabricated battery or price. Previously recorded unrelated DB suspicions remain unchanged; no speculative corrections.

State: AI_CONSULT_BATTERY_PRICE_CATALOG_PREDEPLOY_READY. New commit only, PUSH = NO. Production still uses the baseline until separately authorized deployment.
