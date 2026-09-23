# Battery specification brand-query audit

Baseline: `0d22a762363e3e77686e4ab3ff0f74e31f6e6752`. No push/deploy authorized.

## Proven gap

Twenty required pre-fix questions were exercised through `conversationTurn`.
Nineteen did not answer brand identity/availability and instead asked for a vehicle or routed to general/service intent. One (`어떤 브랜드 사용해요?`) already provided the governed AGM brand/origin policy. The initial mechanical classification based only on `lastIntent` counted all twenty as WRONG_INTENT; reviewing exact replies corrects the semantic total to PASS_EXISTING=1, WRONG_INTENT=19. This correction does not discard the original transcript.

The generic price recognizer did not accept brand-identity language, while an explicit brand name was treated as a price request. A catalog-driven brand query now precedes these paths. Vehicle-fit questions, customer-reported installation, origin/authenticity and comparison questions remain in their existing handlers. Product quoting never sets `confirmedBattery`.

## Authority and full catalog ledger

Single runtime source: `data/battery-prices.json`: `defaultAgmBrand`, `brands.DELKOR.baseFamily`, `brands.VARTA.prices`, `prices`, `aliases`. Origin policy remains `data/consult-service-policy.json` at `product.scope` / `product.brands`. Neither source was edited.

An existing numeric price is not brand authority. No exact conventional-spec brand mapping is present in the governed catalog/policy. DF prefixes and generic Delkor marketing pages are not used to infer per-spec sales availability. These 19 cases are safely unresolved rather than invented. They are not missing prices.

All rows below pass direct, particle and brand+price queries. Price source is `battery-prices.json.prices` throughout; VARTA overrides are only `brands.VARTA.prices`. For unresolved rows, known base price is returned with an explicit brand-confirmation message, never a guessed brand. For supported AGM rows, both approved brand prices are available when requested.

| Canonical spec | Authoritative brands | VARTA supported | Unresolved authority |
|---|---|---|---|
| DF40AL | not established | no | yes |
| DF60L | not established | no | yes |
| DF60R | not established | no | yes |
| DF80L | not established | no | yes |
| DF80R | not established | no | yes |
| DF90L | not established | no | yes |
| DF90R | not established | no | yes |
| DF100L | not established | no | yes |
| DF100R | not established | no | yes |
| DIN50L | not established | no | yes |
| DIN60L | not established | no | yes |
| DIN60HL | not established | no | yes |
| DIN74 | not established | no | yes |
| DIN74L | not established | no | yes |
| DIN74R | not established | no | yes |
| DIN90 | not established | no | yes |
| DIN90L | not established | no | yes |
| DIN100L | not established | no | yes |
| 65-900 | not established | no | yes |
| AGM60 | DELKOR | no | no |
| AGM70 | DELKOR, VARTA | yes | no |
| AGM80 | DELKOR, VARTA | yes | no |
| AGM80R | DELKOR | no | no |
| AGM95 | DELKOR, VARTA | yes | no |
| AGM95R | DELKOR | no | no |
| AGM105 | DELKOR, VARTA | yes | no |

## Tests and evidence

`node tools/test-spec-brand-query.js`: 881 turns PASS; canonical matrix, safe and ambiguous aliases, unsupported/unknown products, exact price equivalence, session roundtrip, area/vehicle context, MINI composite and all required multi-intent examples. All twelve requested error gates are zero. Runtime evidence and full ledger are written outside the repository to the OS temp `spec-brand-query/after.json`.

`node tools/test-spec-brand-query-browser.js`: actual desktop 1440 and mobile 390 (set UAT_WIDTH), nineteen direct fixtures, flows A-E, every A7/G80/G90 candidate button. Each viewport passes 45 turns including six real candidate clicks. Exact DOM replies and state are compared against the engine. Browser JSON/screenshots are under the same external evidence directory.

Initial test-only issues found during development: browser transcript included the greeting because its empty-session baseline omitted that message; corrected the fixture. Composite VARTA assertion initially treated a two-spec string as an unsupported single SKU; corrected to check single canonical codes only. An actual interception of customer-reported installation was fixed and purchase regressions rerun.

## Freeze

No price, product policy, vehicle, area, homepage, CSS, renderer, SEO/GEO, blog or sitemap changes. Consultation HTML changes only its module cache token. Seven legacy freeze tests update the expected cache token (presentation scope also admits the new narrow module/tests/report). The existing origin suite's generic “어떤 브랜드 제품 써요?” case now expects the authorized BRAND_QUERY route and unchanged vehicle/brand context; explicit origin/grade cases retain their old assertions. All protected-content assertions remain intact.

Owner-accepted primary purchase phone CTA is unchanged. BLOG_COUNT=345; SITEMAP_URL_COUNT=1133.

## Exact changed files

- `js/smart-consult-brand-query.js` — catalog-derived recognition/support/replies.
- `js/smart-consult-conversation.js` — narrow router integration and context preservation.
- `js/smart-consult.js` — conversation import cache version only.
- `smart-consult/index.html` — module cache version only.
- `tools/test-spec-brand-query.js` — focused matrix, ledger, state and freeze checks.
- `tools/test-spec-brand-query-browser.js` — real browser UAT.
- `tools/test-battery-certainty-scope.js` — cache expectation only.
- `tools/test-battery-pricing.js` — cache expectation only.
- `tools/test-brand-service.js` — cache expectation only.
- `tools/test-consult-presentation.js` — cache expectation / narrow allowed file scope.
- `tools/test-product-as-hours.js` — cache expectation / authorized generic-brand intent expectation.
- `tools/test-smart-consult-branding.js` — cache expectation only.
- `tools/test-smart-consult-viewport.js` — cache expectation only.
- `docs/spec-brand-query-audit.md` — this audit and complete authority ledger.

## Sample exact replies

80L / DF80L:
> DF80L의 취급 브랜드는 정확한 확인이 필요합니다. 고객센터 1644-9141로 확인해 주세요.

AGM70 brand + price:
> AGM70 규격은 델코와 바르타 제품을 안내하고 있습니다.
> AGM70 델코 기준 교체 가격은 17만원입니다.
> AGM70 바르타 기준 교체 가격은 22만원입니다.

AGM105 brand + price:
> AGM105 규격은 델코와 바르타 제품을 안내하고 있습니다.
> AGM105 델코 기준 교체 가격은 28만원입니다.
> AGM105 바르타 기준 교체 가격은 33만원입니다.

Ambiguous 60:
> 어떤 배터리 규격 말씀하시는 건가요? AGM60 / DIN60L 중 선택해 주세요.

Session A retains BMW / 2020 / AGM95 and answers DELKOR+VARTA. B retains AGM70 then VARTA 22만원. C retains AGM60 then explicitly declines unsupported VARTA. D retains DF80L and unresolved brand authority. E switches from comparison to exact AGM70 support. MINI composite retains both sizes and field confirmation, never one automatic fitment.

## Final verification

PASS: focused 881; presentation 244; purchase/product knowledge 224; brand comparison 625; operational 1602; authenticity/manufacture/cash 581; standalone 178; spec/schedule 2696; schedule safety 119; collision 564; candidate context 33 (19 invalid IDs rejected); candidate mass 499 groups / 1277 clicks (1273 exact, 4 governed no-match, zero errors); authoritative final-FAQ regression 20/20. Both actual-browser viewports: 45 turns / 6 candidate clicks PASS. Vehicle rows 917, service areas 665. All requested focused hard gates zero. Unresolved conventional brand authority remains explicit for 19 catalog specifications, as authorized by the task's safe-insufficient-authority rule.

No push or deployment. A new normal local commit only; previous baseline/history preserved.
