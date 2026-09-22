# Final FAQ predeploy review

Task: ILDEUNG_AI_CONSULT_PAYMENT_VISIT_WORKTIME_FINAL_FAQ_V1

Baseline: main `d43217e431073aeb9dbb0343bbae941749cf8f75`; origin/main `da2e2c0f93e119d82123e5d63b868e30195c00b6`; ahead/behind 4/0; worktree and staged set clean. All preceding predeploy commits preserved. No push or deployment.

## Single source

`data/consult-service-policy.json` now contains `finalFaq.facts` and `finalFaq.answers`. All prior facts, service replies, product policy, A/S and business-hours fields remain exactly unchanged. The version is updated. No vehicle, area or price catalog data changes.

Payment, visit and replacement-duration replies are rendered from this source by `js/smart-consult-faq.js`. The duration is interpolated from integer minimum/maximum facts, not hardcoded into JavaScript. Telephone placeholders use the existing canonical `PHONE_LABEL` and phone action uses the existing `tel:1644-9141` CTA. No account number, address, appointment or operating time is added.

The old-battery collection condition is reused from the existing policy answers. Only intent recognition is expanded for customers asking to take their old battery. No second old-battery policy or surcharge table is created.

## Routing

FAQ recognition runs before generic price/area intent handling, without changing vehicle, spec, brand, price, area or pending-question context. Old-battery statements are excluded from direct-visit recognition. Arrival/dispatch questions are excluded from work-duration recognition. An unclear `지금 가면 얼마나 걸려요?` asks whether the customer means replacement work or waiting time.

Card fees, cash discounts, VAT conditions and bank-account details are not inferred: the response asks the customer to confirm those details by phone. A shop visit is possible but requires schedule confirmation, including real-time visit requests.

## Tested replies

- 카드 → 네. 카드결제 가능합니다.
- 현금영수증 → 네. 현금영수증 발행 가능합니다.
- 세금계산서 → 네. 세금계산서 발행 가능합니다.
- 계좌이체 → 네. 계좌이체 가능합니다.
- 결제수단 → 카드결제와 계좌이체가 가능하고, 현금영수증과 세금계산서 발행도 가능합니다.
- 직접 방문 → 네. 직접 방문도 가능합니다. 다만 방문 가능 시간은 일정 확인이 필요하니 방문 전 고객센터 1644-9141로 확인해 주세요.
- 지금 방문 → 직접 방문은 가능하지만 지금 방문 가능한 일정은 실시간 확인이 필요합니다. 방문 전 고객센터 1644-9141로 확인해 주세요.
- 폐배터리 보관 → 안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요. (Existing phone CTA shown.)
- 작업시간 → 배터리 교체 작업은 보통 10~20분 정도 소요됩니다. 차량과 작업 상황에 따라 시간은 약간 달라질 수 있습니다.
- Arrival questions reuse the existing real-time dispatch confirmation response, never the 10~20 minute work duration.

## Evidence and reproduction

- `faq.json`: direct phrasing, multiple existing contexts, unapproved-condition controls, work-time/arrival separation, integrated conversations and restored sessions. All new FAQ gates and three source-duplication gates are zero.
- `browser.json`: exact desktop/390px replies for required Flow A/Flow B and combined payment, immediate visit, deadline and arrival controls.
- `mobile.json`: input focus, body scroll 0, visible composer and no consultation-page floating launcher.
- `location/matrix.json`: 16,908 area/alias cases plus 47 conversation turns, preserving polite endings and suffixless behavior.
- `regression-results.json` and `regression/`: complete current suite outputs without modifying historical evidence. Older suite baselines list historical GN7/AG60/DIN74L changes; those are not changes in this task.
- `freeze.json`: fresh d43217e comparison; smart-consult HTML cache token only, zero generated vehicle/area HTML, SEO/GEO, metadata, blog or sitemap changes.

Run `node tools/test-final-faq.js`, `node tools/test-final-faq-regression.js`, `node tools/test-final-faq-freeze.js`, and `node tools/test-final-faq-browser.js` with the existing local preview available.

Production remains unchanged until Owner separately authorizes final deployment.
