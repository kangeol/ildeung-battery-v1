# Cold-weather battery NLU remediation

Task: ILDEUNG_AI_CONSULT_COLD_WEATHER_DISCHARGE_NLU_REMEDIATION_V1

Approved unchanged parent: 5b2ba42490b96be4f26fc8d63da867e5790abdb9.
Initial main/origin/actual remote: local parent above; origin/remote 821b74e95cf1b5ffac0503ebbbb9fa060d78c7b7, ahead/behind 1/0, clean index/worktree, untracked 0.
PUSH=NO, DEPLOY=NO. No price, brand, vehicle, area, presentation or SEO changes authorized.

## Proven root cause

The knowledge wrapper already runs FIRST; a symptom detector does not preempt a positive cold intent.
Exact old route for `추우면 방전 잘돼요?`:

1. conversationTurn calls batteryKnowledgePlan.
2. Old cold regex matches standalone `추우면?`, `겨울`, `겨울에 약해지나요?`, or a battery/winter/cold token followed by `추우/겨울/약해`.
3. Normalized `추우면방전잘돼요?` matches neither that regex nor the discharge regex (which requires why/repeated/prevention/etc.). Plan returns null.
4. conversationWithoutBatteryKnowledge → conversationWithoutPurchase → conversationWithoutComparison → conversationEstablished → conversationCore.
5. recognizeIntent → symptomIntent sees `방전` → SYMPTOM, with no vehicle → generic symptom acknowledgement and vehicle prompt.

Observed old answer:
> 방전 말씀해 주셨군요. 원인은 여기서 진단하지 않고, 차량에 맞는 배터리 정보를 확인해드릴게요.
> 차량마다 배터리가 달라요. 차량명부터 알려주세요.

The 247-turn parent suite contained `추우면?` and `겨울에 약해지나요?`, but not weather+discharge sentence composition, temperature wording, or cold/schedule/price combinations. This was missing input coverage, not evidence that all natural-language variations passed.

Pre-fix audit: 44 turns (18 direct, 8 controls, 5 combined, 13 session turns). 18 direct questions: 4 had cold explanation; 10 generic SYMPTOM; 2 BATTERY_QUESTION; 1 existing new-battery discharge answer without cold context; 1 existing CCA answer without explicit cold contribution explanation.

## Narrow repair

- Weather families: 추위, 추워, 추우면, 추울, 추운, 겨울/겨울철, 영하, 한파, 기온/온도 낮음 or 내려감.
- Weather words require battery/discharge/starting/CCA subject, or scoped knowledge follow-up. Bare weather reports and unsupported `겨울동` do not become cold battery knowledge.
- Preserve the parent-approved elliptical questions `추우면?` / `겨울에 약해지나요?`; no broad new bare-weather trigger.
- Scoped CCA follow-up retains CCA topic (`추우면 중요한가요?` → `높으면 좋은가요?`).
- Temperature numbers are removed only from cold-query entity extraction, not turned into specification aliases/year/vehicle facts.
- Cold+schedule uses the existing realtime policy and phone CTA. The narrow schedule follow-up is delegated to existing schedule routing.
- Incidental season prefaces on price questions are removed before existing product/vehicle pricing. Cold+price keeps existing price intent and canonical pricing.
- No new service availability, weather dispatch restriction, temperature threshold, measurements or vehicle fitment truth.
- All 26 canonical specifications followed by the Korean particle `도` remain product codes; `AGM70도` / `65-900도` cannot be stripped as temperature tokens.

## Canonical response boundaries

Cold response:
> 추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

Temperature question adds:
> 특정 온도만으로 반드시 방전된다고 판단할 수는 없습니다.

CCA combination retains the parent Cold Cranking Amps explanation and no invented required value.
Cold+today retains the canonical realtime confirmation policy, not a weather availability promise.

## Evidence locations

Read-only/generated test evidence is outside the repository:
- C:/Users/kang1/AppData/Local/Temp/cold-weather-before.json
- C:/Users/kang1/AppData/Local/Temp/cold-weather-after.json
- C:/Users/kang1/AppData/Local/Temp/cold-weather-focused.json
- C:/Users/kang1/AppData/Local/Temp/cold-weather-browser/browser-1440.json
- C:/Users/kang1/AppData/Local/Temp/cold-weather-browser/browser-390.json
- C:/Users/kang1/AppData/Local/Temp/cold-weather-browser/browser-1440.png
- C:/Users/kang1/AppData/Local/Temp/cold-weather-browser/browser-390.png

## Scope and freeze

Final code verification completed: focused cold 423 turns, parent 250 turns, all required counters 0; complete regression 20/20 PASS; browser 57 turns per viewport PASS.
Additional existing suites PASS: manufacturer wording 3547, Owner brand 215, brand query 881, purchase/product 224, UI 319 checks, brand comparison 625, operational FAQ 1602, authentic/cash 581, standalone 178, spec/schedule 2696, safety 119, collision 564, vehicle certainty 3668, area NLU 16908.
Mass selection: 499 groups / 1277 buttons (1273 exact governed results, four governed no-match results). All six disambiguation hard counters 0. Context/security suite: 33 turns, 19 invalid selections rejected.
Actual A7/G80/G90 buttons on both viewports: A7 2010–2017 AGM105 / 2018-current confirmation; G80 2016–2020 AGM105 / RG3 AGM95R; G90 2018–2021 AGM105 / RS4 confirmation. No loops or wrong rows.
Final raw regression logs: C:/Users/kang1/AppData/Local/Temp/cold-weather-regression/retest-results.json and final-full-results.json (all exit codes 0).

Exact changed files:
- js/smart-consult-battery-knowledge.js
- js/smart-consult-conversation.js
- tools/lib/battery-knowledge-fixtures.js
- tools/lib/cold-weather-fixtures.js
- tools/audit-cold-weather.js
- tools/test-cold-weather.js
- tools/test-cold-weather-browser.js
- tools/test-battery-certainty-scope.js
- tools/test-consult-presentation.js
- docs/cold-weather-audit.md

Protected diff against parent for HTML, CSS, data, seo-data, sitemap, assets and deployment configuration: zero files. No homepage/consult presentation, title/H1/canonical/schema, SEO/GEO, blog or generated vehicle/area changes.

Runtime changes: js/smart-consult-battery-knowledge.js and js/smart-consult-conversation.js only.
Tests: new cold fixtures/audit/matrix/browser scripts, one added parent smoke, exact new test/doc scope allowlist entries. No assertions weakened or deleted.
Homepage H1/support remain:
- 서울·경기·인천 출장 자동차 배터리 교체
- 국산차·수입차 전 차종 배터리 출장 교체

Required protected counts: 917 vehicle rows, 665 service areas, 346 blog posts, 1133 sitemap URLs.

## Focused checks and actual browser answers

Cold matrix: 423 turns PASS. Inventory: 917 rows, 2000 vehicle-alias entries / 1734 unique aliases, 665 areas, 52 product/spec aliases, 10 weather lexemes. Collision audit checks every row/alias/area/spec name and exercises actual entity resolution.

Required cold counters:
- COLD_WEATHER_KNOWLEDGE_WRONG_INTENT = 0 (393 checks)
- COLD_WEATHER_GENERIC_SYMPTOM_FALLBACK = 0 (393 checks)
- COLD_WEATHER_SINGLE_CAUSE_OVERCLAIM = 0 (393 checks)
- COLD_WEATHER_TEMPERATURE_THRESHOLD_FABRICATED = 0 (423 checks)
- COLD_WEATHER_REPLACEMENT_OVERCLAIM = 0 (423 checks)
- COLD_WEATHER_CCA_VALUE_FABRICATED = 0 (423 checks)
- COLD_WEATHER_CONTEXT_LOST = 0 (444 checks)
- COLD_WEATHER_MULTI_INTENT_LOST = 0 (5 checks)
- COLD_WEATHER_FALSE_VEHICLE_MATCH = 0 (29188 checks)
- COLD_WEATHER_FALSE_AREA_MATCH = 0 (6661 checks)
- COLD_WEATHER_FALSE_SPEC_MATCH = 0 (538 checks)
- COLD_WEATHER_FALSE_POSITIVE_NO_BATTERY_CONTEXT = 0 (16 checks)
- SCHEDULE_INTENT_LOST_BY_COLD_WEATHER = 0 (5 checks)
- PRICE_INTENT_LOST_BY_COLD_WEATHER = 0 (30 checks)
- VEHICLE_INTENT_LOST_BY_COLD_WEATHER = 0 (2 checks)

Parent knowledge suite: 250 turns (247 previous + three forms of the missed smoke). All previous tests retained. Counters:
- BATTERY_REPLACEMENT_DIAGNOSIS_OVERCLAIM = 0
- FIXED_LIFESPAN_CLAIM = 0
- DISCHARGE_SINGLE_CAUSE_OVERCLAIM = 0
- NEW_BATTERY_DISCHARGE_FALSE_IMPOSSIBLE = 0
- VOLTAGE_FABRICATED = 0
- CCA_VALUE_FABRICATED = 0
- ALTERNATOR_RESULT_FABRICATED = 0
- FAULT_CODE_FABRICATED = 0
- CCA_HIGHER_ALWAYS_BETTER = 0
- AH_RUNTIME_GUARANTEE = 0
- CAPACITY_BIGGER_ALWAYS_BETTER = 0
- UNAUTHORIZED_UPGRADE_CONFIRMATION = 0
- UNAUTHORIZED_DOWNGRADE_CONFIRMATION = 0
- CODING_ALL_VEHICLES_CLAIM = 0
- CODING_BRAND_WIDE_CLAIM = 0
- CODING_REQUIREMENT_FABRICATED = 0
- CODING_FEE_WRONG = 0
- KNOWLEDGE_SESSION_CONTEXT_LOST = 0
- KNOWLEDGE_MULTI_INTENT_LOST = 0

Actual browser: 1440px and 390px, each 57 total turns, including all six displayed A7/G80/G90 candidate buttons. Both PASS. No horizontal overflow; mandatory smoke screenshot inspected at both widths. The first 44 turns below are the exact rendered replies, common to both widths:

### 추우면 방전 잘돼요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 추울 때 방전 잘돼요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 날씨가 추우면 방전되나요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 겨울에 방전 잘돼요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 겨울철에 방전되기 쉬워요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 겨울에 배터리가 약해지나요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 추우면 배터리가 약해져요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 추우면 배터리 빨리 닳아요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 영하로 내려가면 배터리가 약해져요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

특정 온도만으로 반드시 방전된다고 판단할 수는 없습니다.

### 기온이 낮으면 배터리에 영향 있나요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

특정 온도만으로 반드시 방전된다고 판단할 수는 없습니다.

### 추울 때 시동이 잘 안 걸려요

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 겨울철 시동이 약해요

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 날씨가 추워서 방전된 건가요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 추워서 시동이 안 걸리는 건가요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 겨울에 새 배터리도 방전될 수 있어요?

새 배터리도 주차 기간, 전기 사용량이나 충전 상태에 따라 방전될 수 있습니다. 교체나 점프 후 다시 방전됐다면 곧바로 재교체를 결정하기보다 배터리 상태와 충전·전기 계통, 사용환경을 함께 확인해야 합니다.

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 한파에 방전됐어요

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 영하 10도면 방전돼요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

특정 온도만으로 반드시 방전된다고 판단할 수는 없습니다.

### 추우면 CCA가 중요한가요?

CCA는 Cold Cranking Amps의 약자로, 추운 조건에서 시동 전류를 공급하는 능력과 관련된 지표입니다. 숫자가 높다고 무조건 더 좋거나 내 차에 맞는 것은 아니며 차량 지정 규격과 제품 정보를 확인해야 합니다.

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 겨울동

차량명과 연식을 조금 더 알려주시겠어요? 예) 벤츠 E300 2020년식

### 겨울에 예약돼요?

예약·신청·접수는 고객센터 1644-9141로 문의해 주세요. 이 채팅에서는 예약을 확정하지 않습니다.

### 추운 날 저녁에 가능해요?

오늘·지금·당일 가능 여부와 배차·도착 시간은 실시간 확인이 필요합니다. 고객센터 1644-9141로 가능한 일정을 확인해 주세요.

### 영하인데 오늘 교체 가능해요?

지금·오늘 방문 가능 여부와 도착 시간은 실시간 확인이 필요해요. 1644-9141로 전화주시면 가능한 시간을 확인해드릴게요.

### 겨울에 AGM70 얼마예요?

AGM70 델코 기준 교체 가격은 17만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### 겨울에 BMW 5시리즈 배터리 얼마예요?

BMW 5시리즈 말씀하시는 걸까요?

### 추워요

차량명과 연식을 조금 더 알려주시겠어요? 예) 벤츠 E300 2020년식

### 날씨가 추워요

차량명과 연식을 조금 더 알려주시겠어요? 예) 벤츠 E300 2020년식

### 겨울에 방전됐는데 오늘 교체 가능해요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

오늘·지금·당일 가능 여부와 배차·도착 시간은 실시간 확인이 필요합니다. 고객센터 1644-9141로 가능한 일정을 확인해 주세요.

### 추우면 방전 잘돼요? AGM105 가격도 알려줘

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

### 한파에 시동이 약한데 배터리 갈아야 하나요?

증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 추울 때 시동이 안 걸리는데 BMW 5시리즈 배터리 얼마예요?

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2023~현재년형 · 5시리즈 (G60) / 2017~2023년형 · 5시리즈 (G30) / 2010~2016년형 · 5시리즈 (F10) 중 어떤 차량인가요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 겨울철 방전이랑 블랙박스도 관계 있나요?

방전은 배터리 상태·노후, 장기주차나 주행 부족, 블랙박스 등 전기 사용, 충전·전기 계통 문제 등 여러 요인과 관련될 수 있습니다. 한 가지 원인으로 단정하지 말고 사용환경과 차량 상태를 함께 점검해 주세요.

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 왜 자꾸 방전돼요?

방전은 배터리 상태·노후, 장기주차나 주행 부족, 블랙박스 등 전기 사용, 충전·전기 계통 문제 등 여러 요인과 관련될 수 있습니다. 한 가지 원인으로 단정하지 말고 사용환경과 차량 상태를 함께 점검해 주세요.

### 겨울이라 그런가요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 갈아야 하나요?

증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.

### CCA가 뭐예요?

CCA는 Cold Cranking Amps의 약자로, 추운 조건에서 시동 전류를 공급하는 능력과 관련된 지표입니다. 숫자가 높다고 무조건 더 좋거나 내 차에 맞는 것은 아니며 차량 지정 규격과 제품 정보를 확인해야 합니다.

### 추우면 중요한가요?

CCA는 Cold Cranking Amps의 약자로, 추운 조건에서 시동 전류를 공급하는 능력과 관련된 지표입니다. 숫자가 높다고 무조건 더 좋거나 내 차에 맞는 것은 아니며 차량 지정 규격과 제품 정보를 확인해야 합니다.

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 높으면 좋은가요?

CCA는 Cold Cranking Amps의 약자로, 추운 조건에서 시동 전류를 공급하는 능력과 관련된 지표입니다. 숫자가 높다고 무조건 더 좋거나 내 차에 맞는 것은 아니며 차량 지정 규격과 제품 정보를 확인해야 합니다.

### BMW 5시리즈 2020년식

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM95입니다.

같은 차량에 AGM105 업그레이드도 가능합니다.

AGM95 델코 기준 교체 가격은 22만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### 겨울에 시동이 약해요

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.

### 배터리 갈아야 하나요?

증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.

### 오늘 교체돼요?

지금·오늘 방문 가능 여부와 도착 시간은 실시간 확인이 필요해요. 1644-9141로 전화주시면 가능한 시간을 확인해드릴게요.

### 추운 날에도 가능한가요?

지금·오늘 방문 가능 여부와 도착 시간은 실시간 확인이 필요해요. 1644-9141로 전화주시면 가능한 시간을 확인해드릴게요.

### AGM105 가격

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### 겨울에 방전 잘돼요?

추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.
