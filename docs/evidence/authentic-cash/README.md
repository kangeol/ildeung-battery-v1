# Authenticity, recent manufacture and cash policy

Baseline: main, local/origin/actual remote `6ea87f5c0f8fc72821b723b7caf586de6e04c7bd`, 0/0, clean/staged 0/untracked 0 verified after fetch before mutation. This task does not push or deploy.

## Canonical sources and implementation

`data/consult-service-policy.json` remains the single policy source. Added `product.assurance` (AUTHENTIC, RECENT, COMBINED, EXACT_DATE), `finalFaq.facts.CASH_PAYMENT_AVAILABLE`, the CASH reply, and cash in the combined payment reply. No battery prices or vehicle/area mappings changed. The focused test subtracts precisely these additions and compares the entire remaining policy to baseline.

`smart-consult-product-policy.js` only recognizes assurance/date language and renders injected policy templates. Explicit manufacture/shipment/arrival dates, production weeks and current-month questions use the confirmation/phone policy; no date is computed. NFKC and whitespace normalization apply across natural endings, not exact fixture sentences.

`smart-consult-faq.js` recognizes cash/현찰 separately from 현금영수증 and preserves existing unsupported payment-condition routing. The conversation entry point composes the new policy answers with payment answers and canonical vehicle/product context. Product code recognition uses existing catalog normalization and does not confirm vehicle fitment. Vehicle narrowing and all exact-candidate validation continue through the existing conversation core. Manufacture dates are not imported into the vehicle year. Known product prices may be answered alongside a date-confirmation response; a specific date is never inferred from the known price.

Only directly necessary consultation module/cache query versions changed to `authentic-v1`. Existing cache assertions and policy-preservation assertions were adjusted solely for these explicitly authorized additions; the new focused test checks their exact values.

## Evidence / commands

- `node tools/test-authentic-cash.js`: focused question variants, all mandatory combined questions, numeric manufacture-date controls, unknown product controls, source preservation and session flows. `focused.json` records exact answers, context, counts and all 13 gates.
- `NODE_OPTIONS=--import ./tools/test-authentic-evidence.js` with `AUTHENTIC_AUDIT_STAGE=final`: run `tools/test-final-faq-regression.js`, `tools/test-vehicle-selection.js`, `tools/test-vehicle-selection-context.js`, and `tools/test-standalone-spec.js`. The preload only redirects evidence output; assertions are not changed. Final authoritative results are under `final-regression/`. Earlier verification is retained separately under `regression/`.
- `UAT_WIDTH=1440` and `UAT_WIDTH=390`: run `tools/test-authentic-browser.js` and `tools/test-authentic-browser-extra.js` against the actual local UI. Both primary and extra browser JSON files contain exact replies, session contexts, candidate identities and screenshots.
- `node tools/test-authentic-freeze.js`: exact baseline diff allowlist, consultation HTML cache-only comparison, unchanged vehicle/area/price data, blog 345 and sitemap 1133.
- `node tools/test-authentic-summary.js`: verifies the complete final evidence set.

Browser coverage includes all required direct questions and flows A/B/C, A7/G80/G90 every displayed candidate, session reload, focused input/composer/scroll/CTA, combined region+brand+spec+price+policy and unknown-spec no-price behavior. The browser harness explicitly handles the normal absence of sessionStorage immediately after Reset; no application change was needed for that harness setup issue.

## Expected customer-facing replies

- 정품인가요? / 최신정품인가요?: `네. 일등밧데리는 최신 정품만 사용합니다.`
- 최신 제조인가요?: `네. 항상 최신 제조일자 제품만 사용합니다.`
- 정확한 제조일자 / 몇 월 생산 / 언제 출고: `항상 최신 제조일자 제품만 사용합니다. 정확한 현재 제품의 제조일자·출고일·입고일은 제품 확인이 필요하므로 고객센터 1644-9141로 확인해 주세요.` + phone CTA.
- 현금되나요?: `네. 현금결제 가능합니다.`
- 현금 + 현금영수증: `카드결제·현금결제·계좌이체가 가능하고, 현금영수증과 세금계산서 발행도 가능합니다.`
- 최신 정품 + 현금: the AUTHENTIC and CASH answers together.

The approved DELKOR/VARTA origin, grade, supported sizes and prices, A/S, hours, included services and other FAQ facts remain unchanged. No exact date, discount, card surcharge, VAT condition or account number is introduced.
