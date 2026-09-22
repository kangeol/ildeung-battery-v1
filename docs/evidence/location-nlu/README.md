# Location NLU predeploy review

Task: ILDEUNG_AI_CONSULT_LOCATION_NLU_MISSING_UNSUPPORTED_SUFFIXLESS_FIX_V1

Baseline: main `de199b25c62cf2d6ef0faa1e0e2bb6f9af65f8c8`, origin/main `da2e2c0f93e119d82123e5d63b868e30195c00b6`, ahead/behind 3/0, clean. Prior price, brand/service, product/A/S commits retained. No push or deployment.

## Root cause and scope

- `resolveLocation.safeEnd` did not accept copular endings such as 입니다/예요/이구요/이고요. Canonical aliases existed for 인천 and 마포 but their spans were rejected.
- `areaAnswer` only asked for a place with a narrow `출장\s*(가능|돼|되)|방문\s*가능` pattern. 출장배터리되나요 did not match and fell through to unsupported.
- A retained PRICE goal also bypassed an area-only follow-up. The area-only route now answers from remembered region without erasing PRICE.
- Endings apply to every indexed alias; no Mapo/Incheon phrase exceptions or support-boundary edits. Existing broad parent rule is retained only when all colliding children belong to that parent. 시흥 remains ambiguous across jurisdictions.
- Manufacturer copulas in embedded sentences (BMW고 지역은…) preserve manufacturer context.
- Explicit unsupported place detection excludes ordinary service words, vehicle/manufacturer names and battery brands; it invalidates the stale region instead of promising service there. Missing places ask for a region.

## State model

MISSING_AREA asks for a place. SUPPORTED_AREA identifies the canonical service area. AMBIGUOUS_AREA returns actual candidate choices. EXPLICIT_UNSUPPORTED_AREA gives the phone confirmation response and clears stale location context. Existing dispatch/time disclaimers are unchanged.

## Evidence

- `matrix.json`: 665 canonical entries × 18 phrase envelopes = 11,970 cases; 2,469 safe aliases × 2 endings = 4,938 additional cases; 16,908 total resolver cases, plus 47 missing-area, unsupported, correction, context and embedded-sentence conversation turns. All eight location gates zero.
- `browser.json`: exact A1–A14 answers at 1440px and 390px; 30 actual UI turns including the remembered-region setup.
- `mobile.json`: focused input, body scroll 0, composer visible, no consultation-page launcher.
- `regression-results.json`: exit-checked existing regression commands and their complete outputs. Historical suites compare against older pre-price/pre-policy baselines; their listed historic factual HTML changes are not changes in this task.
- `regression/`: current certainty, pricing, brand, product-policy and previous area-matrix evidence, without overwriting prior task evidence.
- `freeze.json`: fresh de199b25 comparison. Only smart-consult/index.html changes, solely its module cache token. Generated vehicle/area HTML, SEO/GEO text, title/H1/canonical/schema, all canonical JSON, blog contents and sitemap URLs are unchanged.

## Representative exact answers

- 출장배터리되나요? → 네, 출장 배터리 교체 가능합니다. 차량이 있는 지역을 알려주세요. 동이나 구 이름만 말씀해주셔도 됩니다.
- 지역은 인천입니다 / 인천입니다 → 인천 지역은 출장 교체 가능 지역입니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.
- 지역은 마포입니다 / 마포입니다 → 서울 마포구 말씀하시는 거죠? 출장 교체 가능 지역입니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.
- 마포동입니다 → 서울 마포구 마포동 지역은 출장 교체 가능 지역입니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.
- 지역은 송파예요 → 서울 송파구 말씀하시는 거죠? 출장 교체 가능 지역입니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.
- 송파동입니다 → 서울 송파구 송파동 지역은 출장 교체 가능 지역입니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.
- 구월동입니다 / 구월동인데 출장되나요? → 인천 남동구 구월동 지역은 출장 교체 가능 지역입니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.
- Remembered 구월동 then 출장배터리되나요? → 네, 인천 남동구 구월동에서 출장 교체 가능합니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.
- 부산 출장돼요? → 현재 출장 가능 지역으로 확인되지 않아요. 정확한 가능 여부는 1644-9141로 문의해 주세요.
- 시흥입니다 → 같은 이름의 지역이 여러 곳이에요. 서울 금천구 시흥동 / 경기 성남시 수정구 시흥동 / 경기 시흥시 중 어디인가요?
- A11 retains 인천 + 그랜저 and returns the actual canonical model/year choices; its full multiline answer is stored verbatim in browser.json.

## Reproduction

Run `node tools/test-location-nlu.js`, `node tools/test-location-nlu-regression.js`, `node tools/test-location-nlu-freeze.js`, and with the existing local preview running `node tools/test-location-nlu-browser.js`.

No vehicle facts, prices, brand/product/service/A/S/hours policies or supported-area data were changed. Owner review is required before any push.
