# Owner non-AGM DELKOR policy

Task: ILDEUNG_AI_CONSULT_OWNER_NON_AGM_DELKOR_BRAND_POLICY_V1.
Parent: `14deabe851b137eb2682a77512f98aa8b2805168` preserved unchanged.
Remote baseline: `0d22a762363e3e77686e4ab3ff0f74e31f6e6752`.
Push/deploy not authorized.

## Single authoritative rule

`data/battery-prices.json.nonAgmBrandPolicy` persists:

```json
{"brand":"DELKOR","scope":"canonical_non_agm","authority":"Owner: ILDEUNG_AI_CONSULT_OWNER_NON_AGM_DELKOR_BRAND_POLICY_V1"}
```

Only a canonical key in `prices` that does not start with AGM inherits this policy. Aliases first resolve through the existing catalog parser. Ambiguous aliases remain plural. Unknown strings cannot inherit a brand. AGM continues to use `brands.DELKOR.baseFamily` and `brands.VARTA.prices`. The brand query uses the same support predicate as price lookup; no per-spec runtime override table was added.

All existing integer prices, alias mappings, VARTA values/support, metadata and previous AGM rules are unchanged. Brandless standalone non-AGM price requests retain their prior wording; explicit DELKOR and brand+price requests now render the authorized brand with the same price. Manufacturing origin/grade is not inferred for non-AGM.

## Complete current ledger

Price source: `data/battery-prices.json.prices` for every row. NON_AGM Owner source: `nonAgmBrandPolicy`; AGM source: existing `brands`. Safe aliases below exclude the canonical key itself. Bare `60` remains ambiguous between AGM60 and DIN60L.

| Canonical spec | Type | Brands | Canonical KRW | Safe aliases | VARTA |
|---|---|---|---:|---|---|
| DF40AL | NON_AGM | DELKOR | 75000 | 40AL | no |
| DF60L | NON_AGM | DELKOR | 95000 | 60L | no |
| DF60R | NON_AGM | DELKOR | 100000 | 60R | no |
| DF80L | NON_AGM | DELKOR | 100000 | 80L | no |
| DF80R | NON_AGM | DELKOR | 110000 | 80R | no |
| DF90L | NON_AGM | DELKOR | 110000 | 90L | no |
| DF90R | NON_AGM | DELKOR | 110000 | 90R | no |
| DF100L | NON_AGM | DELKOR | 120000 | 100L | no |
| DF100R | NON_AGM | DELKOR | 125000 | 100R | no |
| DIN50L | NON_AGM | DELKOR | 90000 | 50L, 50, DIN50 | no |
| DIN60L | NON_AGM | DELKOR | 105000 | DIN60 | no |
| DIN60HL | NON_AGM | DELKOR | 105000 | 60HL | no |
| DIN74 | NON_AGM | DELKOR | 125000 | 74 | no |
| DIN74L | NON_AGM | DELKOR | 125000 | 74L | no |
| DIN74R | NON_AGM | DELKOR | 130000 | 74R | no |
| DIN90 | NON_AGM | DELKOR | 140000 | 90 | no |
| DIN90L | NON_AGM | DELKOR | 140000 | — | no |
| DIN100L | NON_AGM | DELKOR | 150000 | 100, DIN100 | no |
| 65-900 | NON_AGM | DELKOR | 155000 | — | no |
| AGM60 | AGM | DELKOR | 155000 | — | no |
| AGM70 | AGM | DELKOR, VARTA | 170000 | 70 | yes |
| AGM80 | AGM | DELKOR, VARTA | 190000 | 80 | yes |
| AGM80R | AGM | DELKOR | 220000 | — | no |
| AGM95 | AGM | DELKOR, VARTA | 220000 | 95 | yes |
| AGM95R | AGM | DELKOR | 240000 | 95R | no |
| AGM105 | AGM | DELKOR, VARTA | 280000 | 105 | yes |

Actual counts: 26 total, 7 AGM, 19 NON_AGM. Unresolved brand authority: 0. Existing VARTA prices remain 220000 / 240000 / 270000 / 330000 for AGM70 / 80 / 95 / 105 respectively.

## Verification and evidence

`tools/test-non-agm-owner-policy.js` exercises every canonical direct/particle/price/session path, all safe and ambiguous aliases, unsupported brands and unknown products. Its independent numeric/brand expectations use the preserved parent catalog and explicit Owner policy. Evidence: OS temp `non-agm-owner-policy/focused.json` (includes every gate's check count and full ledger).

The existing 881-turn brand suite changes only non-AGM expectations plus exact policy-only freeze validation. Historical location and schedule freezes now permit the one policy addition while `tools/lib/assert-non-agm-owner-policy.js` checks the complete catalog against the parent, with no other changes allowed. Origin/A/S suite's full catalog expectation includes this exact policy object. No test bypasses or relaxed price assertions.

Actual-browser UAT: `tools/test-spec-brand-query-browser.js --non-agm-owner`, at 1440px and 390px. Exact engine/state/DOM reply comparisons, all requested direct examples, all four session flows, every A7/G80/G90 candidate. Per viewport: 44 turns, six candidate clicks. External JSON and screenshots under OS temp `non-agm-owner-policy`.

## UI and protected-content freeze

No HTML, CSS, title, H1, canonical, schema, vehicle/area/battery pages, SEO/GEO body, blog or sitemap changes. Existing primary purchase phone CTA unchanged. Cache-import-only changes in callers ensure the shared price/support module is refreshed; renderer behavior and styles remain byte-identical after those exact cache tokens are normalized.

BLOG_COUNT=345; SITEMAP_URL_COUNT=1133; vehicle rows=917; service areas=665.

## Representative exact replies

40AL / DF40AL:
> DF40AL 규격은 델코 제품을 안내하고 있습니다.

80L / DF80L:
> DF80L 규격은 델코 제품을 안내하고 있습니다.

DIN74L:
> DIN74L 규격은 델코 제품을 안내하고 있습니다.

65-900:
> 65-900 규격은 델코 제품을 안내하고 있습니다.

General conventional:
> 저희가 취급하는 일반 배터리(등록된 비AGM 규격)는 모두 델코 제품입니다.

Price follow-ups retain canonical values: DF40AL 델코 7만5천원, DF80L 델코 10만원, DIN74L 델코 12만5천원, 65-900 델코 15만5천원. AGM60/80R/95R remain DELKOR only; AGM70/80/95/105 retain DELKOR+VARTA. No fitment inferred from brand identity.

Exact AGM replies (desktop and mobile):

- AGM60 규격은 델코 제품을 안내하고 있습니다.
- AGM70 규격은 델코와 바르타 제품을 안내하고 있습니다.
- AGM80 규격은 델코와 바르타 제품을 안내하고 있습니다.
- AGM80R 규격은 델코 제품을 안내하고 있습니다.
- AGM95 규격은 델코와 바르타 제품을 안내하고 있습니다.
- AGM95R 규격은 델코 제품을 안내하고 있습니다.
- AGM105 규격은 델코와 바르타 제품을 안내하고 있습니다.
- AGM은 기본적으로 델코 제품을 취급하고 있으며, AGM70·AGM80·AGM95·AGM105 규격은 바르타도 선택 가능합니다. 규격에 따라 취급 브랜드가 다릅니다.

Both ambiguous 60 brand questions:
> 어떤 배터리 규격 말씀하시는 건가요? AGM60 / DIN60L 중 선택해 주세요.

Exact brand+price lines, following the brand sentence:

- DF40AL 델코 기준 교체 가격은 7만5천원입니다.
- DF80L 델코 기준 교체 가격은 10만원입니다.
- DIN74L 델코 기준 교체 가격은 12만5천원입니다.
- 65-900 델코 기준 교체 가격은 15만5천원입니다.

## Focused and additional regression results

Focused: 215 turns PASS. Each of the following failure counts is exactly zero:

```text
NON_AGM_BRAND_CONFIRMATION_FALLBACK_REMAINING=0
NON_AGM_BRAND_WRONG=0
AGM_BRAND_SUPPORT_CHANGED=0
VARTA_UNSUPPORTED_BRAND_FALSE_SUPPORTED=0
VARTA_UNSUPPORTED_PRICE_FABRICATED=0
UNSUPPORTED_BRAND_FABRICATED=0
BRAND_QUERY_SPEC_LOST=0
BRAND_QUERY_ALIAS_LOST=0
BRAND_PRICE_MULTI_INTENT_LOST=0
BRAND_SESSION_CONTEXT_LOST=0
AMBIGUOUS_ALIAS_BRAND_AUTOCONFIRM=0
CANONICAL_PRICE_WRONG=0
```

Existing brand query: 881 PASS, unresolved authority 0. Purchase knowledge: 224 PASS. Presentation/UI: 292 PASS (including the staged new report/test/helper paths). Brand comparison: 625 PASS. Operational FAQ: 1602 PASS. Authentic/manufacture/cash: 581 PASS. Standalone spec: 178 PASS. Spec/schedule: 2696 PASS, safety: 119 PASS. Vehicle/spec collision: 564 PASS. Selection context: 33 turns PASS, 19 tampered payloads rejected.

Mass vehicle selection: 917 rows, 17496 queries, 499 groups, 1277 buttons. Exact-row resolutions 1273, governed no-match results 4; loops/wrong-row/year-generation-loss/false-unsupported/other failures all 0. Actual A7/G80/G90 buttons also passed at both browser widths (six per viewport). Desktop/mobile screenshots inspected: existing layout and primary phone CTA retained; no consultation-breaking overflow.

| Actual button, each viewport | Preserved result |
|---|---|
| 2018~현재년형 · A7 (4K) | Phone confirmation |
| 2010~2017년형 · A7 | AGM105 DELKOR 280000 |
| 2020~현재년형 · G80 (RG3) | AGM95R DELKOR 240000 |
| 2016~2020년형 · G80 | AGM105 DELKOR 280000 |
| 2021~현재년형 · G90 (RS4) | Phone confirmation |
| 2018~2021년형 · G90 | AGM105 DELKOR 280000 |

## Exact change scope

Policy: `data/battery-prices.json`.
Logic: `js/smart-consult-prices.js`, `js/smart-consult-brand-query.js`.
Cache import tokens only: `js/smart-consult-brand-comparison.js`, `js/smart-consult-conversation.js`, `js/smart-consult-presentation.js`, `js/smart-consult-product-policy.js`, `js/smart-consult-purchase.js`, `js/smart-consult.js`.
Tests: `tools/test-battery-certainty-scope.js`, `tools/test-consult-presentation.js`, `tools/test-location-nlu.js`, `tools/test-product-as-hours.js`, `tools/test-spec-brand-query-browser.js`, `tools/test-spec-brand-query.js`, `tools/test-spec-schedule-safety.js`, `tools/test-non-agm-owner-policy.js`, `tools/lib/assert-non-agm-owner-policy.js`.
Report: `docs/non-agm-owner-policy-audit.md`.

The historical certainty-scope whitelist also lacked the unchanged parent brand-query module/report; only those exact paths and this task's report/helper were added. Existing HTML factual-delta, price, alias and database assertions remain intact.

## Final precommit verification

Authoritative `node tools/test-final-faq-regression.js`: 20/20 PASS. This includes final FAQ, location NLU, base conversation, V4/V5/V7, battery pricing, brand service, product/A/S/hours, battery certainty, DB-driven flow, launcher, viewport, branding, historical factual-delta scope, sitemap, sitewide, blog sync and work-case exclusion. Output artifacts were redirected outside the repository; assertions were not intercepted.

Location matrix: 16908 cases, 665 areas, all eight failure gates zero. Protected content unchanged from task parent; generated vehicle/area HTML diffs zero. Sitemap stability: 1133 URLs, duplicate loc zero. Blog sync: 345 posts, historical loss zero, original URL/title changes zero, canonical changes zero, broken internal links zero. UI freeze and prior 881-turn suite also verify the catalog is identical except the exact Owner policy object.

Remote main was rechecked as `0d22a762363e3e77686e4ab3ff0f74e31f6e6752`. All required precommit gates PASS; blockers 0. New normal local commit only; PUSH=NO, DEPLOY=NO.
