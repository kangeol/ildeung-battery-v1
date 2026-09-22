# DB-driven continuation — Owner review

Task: ILDEUNG_AI_CONSULT_POST_GN7_AUDIT_DB_DRIVEN_VEHICLE_AREA_PRICE_CONTINUATION_V1

Baseline: main; local 6df1d65216ee8c650cde244ec1652ec563aca9a0; origin/main 667b555971603325a4504b6f6e74bd282317c939; ahead/behind 1/0; worktree and staged clean. Fetch found no remote movement. The previous commit and its historical evidence are preserved. No push, amend, rebase, reset, stash or clean.

## Policy correction

This report supersedes the **all-GN7 manual fallback policy** in the previous audit, not its historical findings. Per this Owner instruction, the three original AGM70 rows are operational canonical truth; restoration is NOT presented as new independent OEM fitment verification.

| Hyundai JSON index (zero-based) | Condition | Previous commit | Continuation |
|---|---|---|---|
| 0 | 26년~현재 / 더 뉴 그랜저 GN7 / LPG | 고객센터문의 | unchanged |
| 1 | 26년~현재 / 더 뉴 그랜저 GN7 / 가솔린 | 고객센터문의 | AGM70 restored |
| 2 | 22~26년 / 그랜저 GN7 / LPG | 고객센터문의 | AGM70 restored |
| 3 | 22~26년 / 그랜저 GN7 / 가솔린 2.5 | 고객센터문의 | AGM70 restored |
| 4 | 22~26년 / 그랜저 GN7 / 가솔린 3.5 | 고객센터문의 | unchanged |

The incorrect 3.3/AGM80 row remains removed. 2023+ GN7 AGM80 source paths = 0. 2023 GN7 now asks LPG / 가솔린 2.5 / 가솔린 3.5. LPG displacement is absent from the canonical row, so no invented “LPG 3.5” choice is displayed. The existing 2026+ LPG unknown condition also remains; it is not correct to claim that 3.5 is the sole unresolved GN7 condition across all years. Hybrid GN7 still has no canonical battery row.

## Universal conversation flow

All 917 rows use the same candidate filter and certainty gate. Every known fact is applied. A unanimous single usable battery is answered; different batteries or specific-plus-unknown rows produce an actual useful canonical discriminator. No useful remaining discriminator means manual confirmation. Row order does not choose a specification.

Pending choices accept their exact button labels and natural input such as 2.5, 3.5 가솔린, 엘피지 and 디젤이요. Short displacement-only answers are no longer interpreted as unrelated vehicle aliases. The existing four-visible-chip limit is retained; full pending choices remain available to typed input.

The extra 917-row interactive question-loop audit exposed a pre-existing normalized-detail collision: data/kia.json[63] 스포티지QL 4세대 (gasoline DIN60HL) versus data/kia.json[64] 스포티지QL4세대 (diesel AGM80), zero-based indices. Both normalize to the same customer-visible identity. The engine previously selected the first spelling and could answer the wrong battery before fuel was known. Equivalent normalized detail names now retain ALL rows and are grouped into one question option, forcing the actual fuel discriminator. Canonical Kia data remain unchanged; the spelling discrepancy is REVIEW_REQUIRED. The final 917-loop rerun passed.

PRICE is stored independently as priceIntent/originalIntent. Manufacturer-only queries ask a canonical vehicle family. Vehicle clarification continues without a terminal “give details” reply. Once the battery is known, the response automatically returns to price guidance and phone/product actions, without fabricating a monetary amount. Region, price and service intent survive subsequent model/year answers, correction and session round-trip.

## Area coverage

The independent walk of seo-data/service-areas.json matches the complete existing canonical location index: province/metro 3, city 14, district 40, neighborhood 608, total 665. No region database or local SEO body was changed.

The generic parser combines longest canonical spans, full-name/short aliases, hierarchy/context, normalized attached service suffixes and real whitespace boundaries. Adjacent invalid substring hits cannot validate a place prefix. There is no 구월동 phrase exception. Duplicate names require actual candidates unless prior hierarchy makes one unique. True same-jurisdiction parent/child short aliases retain the existing broad service-area policy; unrelated names are never collapsed.

matrix.json records 6,650 name-pattern cases, 6,650 qualified-name cases, 219 ambiguous-alias cases, negative substrings, price cases and integrated transcripts. The 10 patterns include joined 교체되나요, 배터리교체되나요 and 출장되나요. Unique misses, wrong resolutions, ambiguous auto-confirmations and no-space misses are all 0 in this matrix.

Area service coverage is not real-time dispatch: 지금 / 오늘 / 몇 시 requests continue to require real-time phone confirmation, without promising arrival.

## Evidence files

- simulation.json: prior certainty suite rerun on all 917 current rows, four structured knowledge stages plus full/partial natural-language cases and all supported family-years through 2027.
- matrix.json: full new area matrix and exact conversation responses for price, integrated, GN7 and collision flows.
- browser.json: actual browser submissions and exact rendered assistant replies, chips, hrefs and overflow checks, separated by desktop 1440px and mobile 390px. Generated incrementally by tools/test-db-driven-browser.js.
- Historical docs/evidence/battery-certainty/REVIEW_REQUIRED.md remains the original review ledger. The three restored AGM70 rows are now Owner-accepted operational values; other suspected data are unchanged and still require review. No speculative correction was added.

## Site/SEO scope

Only three generated HTML files differ from 6df1d652:

1. car-battery/hyundai/grandeur.html: three restored AGM70 table cells and the data-derived summary list ordering.
2. car-battery/hyundai/grandeur/gn7.html: three restored AGM70 cells; data-derived direct answer and AGM FAQ answer return to reflecting AGM availability. FAQ answer text changes in both HTML and JSON-LD; schema structure is unchanged. The existing caution to check exact conditions remains. The manual 3.5 and 2026+ LPG cells remain visible.
3. smart-consult/index.html: runtime script cache-version URL only; this is not a regenerated vehicle page.

Vehicle and area URLs/title/H1/canonical unchanged; no unrelated body edits. All area HTML, blog content, sitemap and CTA destinations are frozen. Existing phone/DIN/AGM hrefs are verified exactly. Floating launcher, mobile focus mode and vehicle-page context transfer are retained. No external AI API or work-case integration.

Runtime modules receive flow-v1 cache versions; canonical manufacturer JSON continues to load without stale cache. Older sessions with a different state schema are rejected, while current price/area state survives session restore.

## Deployment

This task ends with a NEW commit above 6df1d652, only after acceptance checks. Production is not changed. Owner review and separate push authorization are still required.

## Acceptance record

PASS: prior certainty simulation (3,668 structured stages, 917 full natural-language cases, 2,751 partial cases, 3,404 family-years), new 917-row question loops, 13,300 area phrases, 219 collision phrases, price/integrated/correction/session matrices, V7 NLU, core, conversation, V4, V5, viewport, launcher, branding, exact factual SEO scope, sitemap, sitewide service, blog-sync and work-case exclusion checks. No final failures waived. Preliminary negative tests caught a false place-prefix match and an overbroad unknown-place check; both were fixed before the final area/V7 runs. The blog-sync comparison was extended only for the exact three authorized restoration conditions, not by excluding the DB.

Browser UAT: 50 submissions across 1440px desktop and 390px mobile; exact replies/hrefs in browser.json. No horizontal overflow; both screenshots visually inspected. An additional real mobile quick-reply click on 가솔린 2.5 returned AGM70. After reloading the final runtime, 스포티지QL4세대 2015년식 asked fuel instead of guessing; 디젤이요 was tested as a free-input follow-up.

All requested hard counters are zero: WRONG_BATTERY_RECOMMENDATION, AMBIGUOUS_BATTERY_AUTOCONFIRM, UNKNOWN_BATTERY_OVERRIDE, UNIQUE_AREA_FALSE_NEGATIVE, UNIQUE_AREA_WRONG_RESOLUTION, AMBIGUOUS_AREA_AUTOCONFIRM, NO_SPACE_AREA_FALSE_NEGATIVE and FABRICATED_PRICE. These are deterministic coverage results against canonical data, not a claim of universal physical fitment authority.
