# Manufacturer wording → existing battery brand intent

Baseline: main `ec9efc0b64b59394105c1d956786bdec7591c3ae`, local/origin/actual remote equal; ahead/behind 0/0, clean, staged/untracked 0. Fetch only. No push/deployment.

## Pre-fix evidence

26 requested queries captured before implementation in `C:/Users/kang1/AppData/Local/Temp/manufacturer-before.json`.
10 PASS_EXISTING; 11 manufacturer-wording queries falsely requested vehicle/year; 5 origin contrasts also fell through instead of routing to product policy. No corporate manufacturer entity or origin was fabricated in these 26 replies.
Cause: brand-query lexical recognition included 제조사 but not 제조회사/제조업체/메이커/누가 만든 제품. Origin recognition did not cover the requested explicit 나라/원산지/어디서 제조 expressions.

## Narrow repair

Existing `brandQueryPlan` recognizes normalized spacing and particles for 제조 회사/제조회사/제조사/제조 업체/제조업체/메이커/어느·어디·무슨·어떤 회사/누가 만든·만드는 제품 and company identity questions. `회사로 와도 돼요?` remains service/operational, not brand identity.
Catalog alias extraction and existing `brandQueryReply` remain the source of supported brands and prices. No manufacturer database, policy-data change or corporate/OEM facts were introduced.
Explicit origin questions reuse existing product-policy formatting. Non-AGM origin is not inferred from DELKOR brand identity. Existing context-sensitive brand-comparison origin follow-ups keep their original route. Explicit vehicle-maker questions without battery scope ask which entity is intended; 917 canonical rows exercised.

## Exact representative answers

- DF40AL / DF80L / DIN74L / 65-900: `{규격} 규격은 델코 제품을 안내하고 있습니다.`
- AGM60 / AGM80R / AGM95R: same DELKOR-only sentence.
- AGM70 / AGM80 / AGM95 / AGM105: `{규격} 규격은 델코와 바르타 제품을 안내하고 있습니다.`
- General: `AGM은 기본적으로 델코 제품을 취급하고 있으며, AGM70·AGM80·AGM95·AGM105 규격은 바르타도 선택 가능합니다. 규격에 따라 취급 브랜드가 다릅니다.` / `저희가 취급하는 일반 배터리(등록된 비AGM 규격)는 모두 델코 제품입니다.`
- 40AL manufacturer + price: DF40AL DELKOR, `DF40AL 델코 기준 교체 가격은 7만5천원입니다.`
- AGM70 manufacturer + price: DELKOR 17만원 and VARTA 22만원 via canonical formatter.
- 60 manufacturer: `어떤 배터리 규격 말씀하시는 건가요? AGM60 / DIN60L 중 선택해 주세요.` Bare 60 keeps battery-versus-vehicle clarification.
- AGM70 origin: `저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.` / `중국산 제품은 취급하지 않습니다.`
- DELKOR / VARTA explicit origin: existing selected-brand 국산 제조 실버 / 독일산 실버 policy, respectively.
- 80L origin: `해당 규격의 원산지는 정확한 제품 확인이 필요합니다. 고객센터 1644-9141로 확인해 주세요.`
- Volvo S60 manufacturer: `차량 자체의 제조사를 말씀하시는 건가요, 교체할 배터리 제품의 브랜드를 말씀하시는 건가요?`
- BMW 5-series / G80 with explicit 배터리 scope: governed general brand answer and existing vehicle candidate selection, without inferred fitment.

## Verification and evidence

Focused test: `node tools/test-manufacturer-wording.js`; 3,547 turns, 26 canonical prices, safe/ambiguous battery alias ledger, all 1,734 unique generated/canonical/approved vehicle aliases, 917 vehicle rows, 665 areas, session flows A–E. Thirteen requested failure gates zero after assertions. No legal manufacturer/OEM/factory claims. Vehicle-maker subjects are checked against the existing cached alias index, not a new manufacturer database.
Actual browser: `tools/test-manufacturer-browser.js`, desktop 1440/mobile 390. Each: 51 turns including six actual A7/G80/G90 candidate clicks, exact rendered replies and serialized state compared with conversation engine; no horizontal overflow. Exact answers/screenshots: OS temp `manufacturer-browser/browser-1440.json`, `browser-390.json`, corresponding PNG files.
Candidate mass: 499 groups / 1,277 buttons; 1,273 exact results and four pre-existing governed no-match results; loop/wrong-row/lost-generation/false-unsupported/other errors zero.

Historical freeze assertions in brand-query, presentation, schedule-safety, location, pricing, brand-service, product/A/S/hours and factual-scope tests were updated for the already-approved homepage baseline (not Git history). The shared historical HTML transformation adds only the exact authorized H1/support/link; `assertHomepageFreeze` checks current homepage/CSS byte-for-byte against ec9efc0b before excluding index.html from older change inventories. Data/policy comparisons remain intact. No expectation for brand, price, UI or conversation answers was weakened. Initial full-run failures were stale homepage expectations plus an external runner argument error; final results must come from the corrected rerun.
Test artifacts routed outside the repo under OS temp `manufacturer-regression`; the full regression driver executes its existing 20 constituent commands with output-only routing to prevent tracked evidence rewrites.

## Freeze

Only consultation intent/router and directly necessary tests/documentation changed. Homepage H1 intro, consultation HTML/CSS/presentation/launcher, all price/brand/origin/service policies, 917 vehicle rows, 665 areas, generated vehicle/area/battery pages, SEO/GEO, blog and sitemap unchanged from ec9efc0b. BLOG_COUNT=345; SITEMAP_URL_COUNT=1133. No new cache/UI changes.

## Final regression results

PASS: Owner non-AGM 215; existing brand-query 881; purchase/product 224; presentation (303 checks before staging new test files); brand comparison 625; operational FAQ 1,602; authenticity/manufacture/cash 581; standalone 178; spec/schedule 2,696; schedule safety 119; collision 564; vehicle-selection context 33; mass candidate selection 499 groups / 1,277 buttons. Final full regression: 20/20 PASS, including location, GN7/certainty, pricing, service/product/A/S, V4/V5/V7, launcher/viewport/branding, sitemap, sitewide, blog-sync and work-case exclusion. All requested error gates zero. Original failing run retained in external results.json; corrected per-suite logs and retest-results.json plus final 20/20 execution establish the final result.
