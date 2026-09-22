# Product origin, A/S, hours and DIN74L predeploy review

Task: ILDEUNG_AI_CONSULT_PRODUCT_ORIGIN_AS_HOURS_AND_DIN74L_FIX_V1

## Baseline and authorization

Fetched origin. Branch main; HEAD 851da26adb81d2b608548dcfb00e08326dc35c53; origin/main da2e2c0f93e119d82123e5d63b868e30195c00b6; ahead/behind 2/0; clean at start. No remote-only changes or merge. Both 4b7ce6fb and 851da26 preserved. No push or deployment authorized/performed.

All new product and business policy facts are Owner-authorized, scoped to products handled by this shop, not generalized to all DELKOR/VARTA/black products in the market.

## DIN70L root cause / authorized correction

All 15 manufacturer files, 917 rows checked. Exactly one row had DIN70L:

data/chevrolet.json[30] (zero-based): 쉐보레 / 알페온 / 10~15년 / 가솔린 / detailModel 알페온 / defaultBattery DIN70L / empty upgrade / 완료.

Owner-authorized correction: defaultBattery DIN70L -> DIN74L. Every other manufacturer row matches baseline. Current canonical DIN70L count 0. DIN74L uses the existing 125000 KRW price; no new price or alias added. The prior unpriced DIN70L catalog entry was removed; catalog unpriced list is empty. Existing 26 base prices and four explicit VARTA prices remain identical.

Customer input DIN70L is treated by the generic unknown-code policy: not a registered specification, exact specification/price confirmation needed, no numeric price and no automatic DIN74L substitution. Historical evidence and negative test fixtures still mention DIN70L; they are not runtime product truth. Saved sessions with the withdrawn confirmed DIN70L fitment are rejected rather than replayed. Other valid sessions retain prior migration/restore behavior.

## Source architecture

- data/battery-prices.json: sole monetary source and brand price source. Product comparisons read both exact prices here. The 5만원 difference is derived from the stored supported-brand prices; no VARTA price is created by a runtime surcharge formula.
- data/consult-service-policy.json: existing facts/answers/summary unchanged; new product, afterSales and businessHours sections added.
- product section: shop-scoped origin/grade strings DELKOR 국산 제조 실버 / VARTA 독일산 실버, Chinese non-handling, Chinese black non-handling, neutral selection and lifespan language.
- afterSales: installation-date basis, three-month period, shop-installed battery scope, symptom/vehicle-condition review for detailed eligibility.
- businessHours: HOURS/SUNDAY/HOLIDAY/TODAY exact callback wording. Phone placeholder comes from existing PHONE_LABEL; CTA remains tel:1644-9141.
- No second product-policy source, copied runtime price map, duplicated runtime period/origin definitions, or blanket manufacturer claim. Independent test fixtures are acceptance evidence, not runtime truth.

## Conversation behavior

Policy questions are routed before generic price, brand-selection, symptom or live-dispatch interpretation. They preserve vehicle/year/spec/brand/area and pending choices instead of replacing facts. In particular, mentioning both brands in a comparison does not select the last brand automatically.

AGM95 comparison shows DELKOR 22만원 and VARTA 27만원, origin and silver grade, shared-size 5만원 difference and neutral lifespan guidance. MINI comparison shows DELKOR AGM70/80 17/19만원 and VARTA AGM70/80 22/24만원; both possible sizes and field confirmation remain, confirmedBattery stays null. Unsupported VARTA sizes still never gain an invented price.

A/S default: 네. 일등밧데리에서 설치한 배터리는 설치일 기준 3개월 이내 A/S가 가능합니다.

A/S detailed scope / unconditional-exchange / over-three-month questions: state the period, then 세부 A/S 가능 여부는 증상과 차량 상태를 확인한 뒤 안내해드립니다. 1644-9141로 문의해 주세요. No guaranteed replacement, refund or free replacement invented. A/S phone CTA supplied.

Hours, Sunday, holidays and today/now never receive invented opening times or static open/closed answers. Exact source responses route to customer center. Existing dispatch questions retain real-time confirmation behavior; no arrival-time promise added.

## Tests and evidence

product-as-hours.json: 112 recorded turns, all new required phrases and both integrated flows. Independent Owner fixtures verify every added policy value, all catalog preservation, exact one-row correction, zero remaining canonical DIN70L and exact HTML changes. Policy turns preserve state via deep equality. Includes MINI neutral comparisons, expired-period fallback, session restoration and withdrawn-DIN70L session rejection. All task-specific hard counters and runtime-truth duplication counters are zero.

pricing.json: existing 26-price suite and 3668 vehicle-stage price simulations. Current nonempty battery strings: 29; 25 priced single strings, three fully priced composite strings, one customer-center string, zero unpriced canonical strings, zero unhandled strings.

brand-service.json: 2751 canonical brand cases and 153 recorded turns; DELKOR/VARTA price correctness, unsupported sizes, composite safety, brand memory and all existing service inclusion policies pass.

simulation.json: universal certainty suite (3668 stages plus NLU/year checks), wrong battery, ambiguous auto-confirm and unknown override zero; 877 ambiguous cases prevented.

matrix.json: all 665 areas (608 neighborhoods), 6650 short-name and 6650 qualified-name phrases, 219 collision cases and 917 vehicle question loops. All wrong-resolution/ambiguous-auto-confirm/no-space false-negative counters zero. Previous evidence folders are preserved; new runs write here.

All regression commands PASS: test-smart-consult (110), conversation (3254), NLU V4 (989), V5 (4112), V7 (39636 plus 470-model coverage), viewport, launcher (1114 included, 427 vehicle contexts), branding, certainty scope, audit-sitemap-stability (1133 URLs), audit-sitewide-service, audit-blog-sync-regression (345 posts, historical loss 0), audit-work-cases (18 pages, 345 cases). No external AI API or work-case integration added. Existing phone/DIN/AGM hrefs unchanged. Full-page regression negative fixtures still reject unrelated title/H1/canonical/schema/body changes.

## SEO factual delta

Only generated page: car-battery/chevrolet/alpheon.html.

1. Direct-answer paragraph: basic battery DIN70L -> DIN74L.
2. Exact canonical row table cell: DIN70L -> DIN74L.

URL/title/H1/canonical/schema and all unrelated page bytes unchanged. No new origin/A/S/hours/price prose injected into vehicle/area SEO pages. Other HTML: smart-consult/index.html cache version brand-v1 -> product-v1 only. No mass formatting or SEO copy changes.

## Browser UAT

agent-browser skill used for actual local UI, desktop 1440px and mobile viewport 390px. All 40 submissions PASS. browser.json captures exact new assistant messages per submission for all 12 requested scenarios, including BMW -> VARTA -> compare -> 출장 -> A/S -> Sunday, and 구월동 BMW VARTA -> origin -> A/S. Both screenshots visually inspected. Browser viewport emulation is not physical-device keyboard certification.

Mobile focus chatInput, body scroll 0 even after scroll, messages pane scrollable, composer bottom 819.5 inside height 844, horizontal overflow false, consult floating launcher count 0. After reload, 바르타는? still returns AGM95 VARTA 27만원 with BMW/2020/구월동 retained.

Representative answers:

- DIN74L 교체 가격은 12만5천원입니다.
- 저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다.
- 저희가 취급하는 AGM 제품 기준으로 바르타는 독일산 실버 제품입니다.
- 중국산 제품은 취급하지 않습니다.
- 네. 일등밧데리에서 설치한 배터리는 설치일 기준 3개월 이내 A/S가 가능합니다.
- 일요일 운영 여부는 당일 일정에 따라 달라질 수 있어 고객센터 1644-9141로 확인해 주세요.
- 오늘 운영 여부와 가능한 시간은 실시간 확인이 필요합니다. 고객센터 1644-9141로 문의해 주세요.

## Boundary

GN7 unresolved conditions and other previous review items remain unchanged. No new unsupported fitment/product/performance/AS eligibility facts were added. All regression/browser gates passed; new commit only, PUSH = NO. State: AI_CONSULT_PRODUCT_AS_HOURS_DIN74L_PREDEPLOY_READY. Production is not changed by this task.
