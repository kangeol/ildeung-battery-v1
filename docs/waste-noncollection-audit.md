# Waste-battery noncollection price intent audit

Baseline: `b09bc3f3f0995e39820728caacbf37ee594c2886`, parent preserved. Remote: `40d4bf70605982727a5dfe8d5a89887999d86e69`. PUSH=NO, DEPLOY=NO.

## Proven cause and repair

Before repair, `conversationTurn` first called `purchaseStagePlan`. Explicit 폐배터리 made `waste=true`; 안 주면 made `keep=true`. The `keep&&!waste` condition excluded WASTE, the plan returned null, and the existing downstream `comparisonIntent` matched 달라 and returned its brand clarification. No vehicle, price, brand or policy data error caused this failure.

The parent 500-turn matrix tested `안 주면 가격 달라져요?` without the explicit waste noun. It did not cross-product nouns with noncollection verbs and price-comparison vocabulary. The new matrix does. Before correction, 4 of the 10 required direct prompts went to brand comparison, 2 lacked the noncollection condition, and 4 already provided safe collection/confirmation guidance.

The narrow purchase-stage recognizer now handles explicit 폐/헌/기존/쓰던 배터리 + non-return/retention expressions, implied 반납/수거 안 함, and scoped short follow-ups after a retention question. Ambiguous 배터리 가져가면 asks whether keeping the old battery is meant. Generic 달라/차이 and the brand-comparison module are unchanged. A known spec remains in state; a newly explicit spec uses only the existing catalog quote, explicitly followed by the collection-condition policy. No noncollection price is created.

Existing KEEP_OLD_BATTERY/UNCLEAR_OLD policy answers and the telephone CTA are reused. No policy JSON, product prices, facts, UI, or cache tokens change. Payment is composed only from payment vocabulary; retention wording cannot become a store-visit claim. Schedule and work-site answers reuse their existing policy.

## Verification

- Focused matrix: 2,984 turns. All 15 hard counters zero (see exact evidence below).
- Parent purchase-stage: 500 turns, all existing 25 safety counters zero; no assertions removed or weakened.
- Browser skill: agent-browser. Local desktop 1440x1000 and mobile 390x844, 55 turns and 6 real candidate clicks each. UI state and rendered replies compared with runtime, no horizontal overflow. Both screenshots visually inspected.
- A7/G80/G90: all 6 candidates on each viewport resolved; old A7/G80/G90 AGM105=DELKOR280000, G80 RG3 AGM95R=DELKOR240000, A7 4K/G90 RS4 retain confirmation-required output. No loops.
- Full regression: 20/20. Knowledge250, cold423, manufacturer3547, Owner brand215, brand query881, purchase224, comparison625, operational1602, authentic581, standalone178, spec/schedule2696, safety119, collision564, vehicle3668, area16908. Selection499 groups/1277 buttons: 1273 exact and 4 governed confirmation results, all failure categories zero.
- Freeze vs task baseline: all HTML/CSS/data/SEO/sitemap and brand-comparison source unchanged. Vehicles917, areas665, blogs346, sitemap1133. Homepage H1/support unchanged.
- UI presentation: 327 checks after tracking the two new test/report files. Only test scope allowlists expanded for this exact test/report; existing behavioral assertions unchanged.

Screenshots: `C:/Users/kang1/AppData/Local/Temp/waste-noncollection-browser/browser-1440.png` and `browser-390.png` in the same directory. Complete focused machine evidence: `C:/Users/kang1/AppData/Local/Temp/waste-noncollection-focused.json`.

## Exact audit and browser evidence

### Parent 25 counters

{
  "count": 500,
  "gates": {
    "PROCESS_UNSAFE_INSTRUCTION": 0,
    "PROCESS_ENGINE_RUNNING_FABRICATED": 0,
    "SETTINGS_PRESERVATION_GUARANTEE": 0,
    "MEMORY_PRESERVATION_GUARANTEE": 0,
    "POST_INSTALL_ACTION_FABRICATED": 0,
    "WASTE_BATTERY_POLICY_WRONG": 0,
    "WASTE_BATTERY_SURCHARGE_FABRICATED": 0,
    "WASTE_BATTERY_VALUE_FABRICATED": 0,
    "AS_PERIOD_FABRICATED": 0,
    "AS_AUTOMATIC_REPLACEMENT_PROMISE": 0,
    "REFUND_PROMISE_FABRICATED": 0,
    "REPEAT_DISCHARGE_DEFECT_OVERCLAIM": 0,
    "LOCATION_ACCESS_PERMISSION_FABRICATED": 0,
    "UNSAFE_LOCATION_WORK_PROMISE": 0,
    "MECHANICAL_PARKING_UNCONDITIONAL_PROMISE": 0,
    "NON_FACE_TO_FACE_CONTEXT_LOST": 0,
    "TOTAL_PRICE_COMPONENT_WRONG": 0,
    "EXTRA_FEE_FABRICATED": 0,
    "VAT_CONDITION_FABRICATED": 0,
    "CASH_DISCOUNT_FABRICATED": 0,
    "CARD_SURCHARGE_FABRICATED": 0,
    "DISTANCE_SURCHARGE_FABRICATED": 0,
    "NIGHT_SURCHARGE_FABRICATED": 0,
    "PURCHASE_STAGE_MULTI_INTENT_LOST": 0,
    "PURCHASE_STAGE_SESSION_CONTEXT_LOST": 0
  }
}

### Focused counters

{
  "count": 2984,
  "gates": {
    "WASTE_NONCOLLECTION_WRONG_INTENT": 0,
    "WASTE_NONCOLLECTION_BRAND_COMPARISON_HIJACK": 0,
    "WASTE_NONCOLLECTION_CONTEXT_LOST": 0,
    "WASTE_NONCOLLECTION_PRICE_FABRICATED": 0,
    "WASTE_NONCOLLECTION_SURCHARGE_FABRICATED": 0,
    "WASTE_NONCOLLECTION_SAME_PRICE_FALSE_PROMISE": 0,
    "WASTE_NONCOLLECTION_VALUE_FABRICATED": 0,
    "WASTE_NONCOLLECTION_MULTI_INTENT_LOST": 0,
    "WASTE_NONCOLLECTION_SESSION_CONTEXT_LOST": 0,
    "BRAND_COMPARISON_REGRESSION_FROM_WASTE_FIX": 0,
    "UNRELATED_PRICE_DIFFERENCE_FALSE_WASTE_INTENT": 0,
    "SPEC_PRICE_CONTEXT_LOST": 0,
    "PAYMENT_CONTEXT_LOST": 0,
    "SCHEDULE_CONTEXT_LOST": 0,
    "LOCATION_CONTEXT_LOST": 0
  },
  "checks": {
    "WASTE_NONCOLLECTION_WRONG_INTENT": 2914,
    "WASTE_NONCOLLECTION_BRAND_COMPARISON_HIJACK": 2914,
    "WASTE_NONCOLLECTION_CONTEXT_LOST": 2837,
    "WASTE_NONCOLLECTION_PRICE_FABRICATED": 5828,
    "WASTE_NONCOLLECTION_SURCHARGE_FABRICATED": 2914,
    "WASTE_NONCOLLECTION_SAME_PRICE_FALSE_PROMISE": 2914,
    "WASTE_NONCOLLECTION_VALUE_FABRICATED": 2914,
    "WASTE_NONCOLLECTION_MULTI_INTENT_LOST": 5,
    "WASTE_NONCOLLECTION_SESSION_CONTEXT_LOST": 2984,
    "BRAND_COMPARISON_REGRESSION_FROM_WASTE_FIX": 15,
    "UNRELATED_PRICE_DIFFERENCE_FALSE_WASTE_INTENT": 45,
    "SPEC_PRICE_CONTEXT_LOST": 2890,
    "PAYMENT_CONTEXT_LOST": 1,
    "SCHEDULE_CONTEXT_LOST": 1,
    "LOCATION_CONTEXT_LOST": 1
  }
}

### Before: required prompts

Input: 폐배터리 안 주면 가격 달라져요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 헌 배터리 안 주면 얼마예요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 기존 배터리 안 가져가면 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 폐배터리 제가 가지면 가격이 달라지나요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 반납 안 하면 얼마예요?

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 수거 안 하면 추가금 있어요?

안내드린 차량·규격·조건 그대로 교체하는 경우 현장에서 별도 추가비용은 없습니다.

Input: 배터리 가져가면 더 비싸요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 헌 배터리 가지고 싶어요 가격은요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 기존 배터리 제가 보관하면 얼마예요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 폐배터리 반납 안 하고 AGM105 하면 얼마예요?

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

안내드린 가격은 기존 폐배터리 수거 조건입니다. 교체 후 기존 배터리는 수거합니다.

### Browser 1440

Input: 폐배터리 안 주면 가격 달라져요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 헌 배터리 안 주면 얼마예요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 기존 배터리 안 가져가면 가격 달라요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 폐배터리 제가 가지면 가격이 달라지나요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 반납 안 하면 얼마예요?

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 수거 안 하면 추가금 있어요?

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 배터리 가져가면 더 비싸요?

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 헌 배터리 가지고 싶어요 가격은요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 기존 배터리 제가 보관하면 얼마예요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 폐배터리 반납 안 하고 AGM105 하면 얼마예요?

AGM105 델코 기준 교체 가격은 28만원입니다.

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 델코랑 바르타 가격 달라요?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 5만원 높습니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: 델코 바르타 가격 차이?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 5만원 높습니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: AGM105 델코랑 바르타 얼마 차이예요?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

AGM105 바르타 기준 교체 가격은 33만원입니다.

AGM105의 두 브랜드 가격 차이는 5만원입니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: 두 브랜드 가격이 달라요?

AGM은 기본적으로 델코 제품을 취급하고 있으며, AGM70·AGM80·AGM95·AGM105 규격은 바르타도 선택 가능합니다. 규격에 따라 취급 브랜드가 다릅니다.

저희가 취급하는 일반 배터리(등록된 비AGM 규격)는 모두 델코 제품입니다.

Input: 바르타가 델코보다 얼마 비싸요?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 5만원 높습니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: AGM70이랑 AGM80 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: BMW랑 벤츠 배터리 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 현금이랑 카드 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 지역마다 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 오늘이랑 내일 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: AGM105 얼마예요? 폐배터리 안 주면 가격 달라져요?

AGM105 델코 기준 교체 가격은 28만원입니다.

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: BMW5 2020 델코로 할게요. 헌 배터리 제가 가지면 얼마예요?

BMW 5시리즈 말씀하시는 걸까요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 현금으로 할게요. 폐배터리 안 주면 추가금 있어요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

네. 현금결제 가능합니다.

Input: 폐배터리 안 주고 오늘 교체 가능해요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

오늘·지금·당일 가능 여부와 배차·도착 시간은 실시간 확인이 필요합니다. 고객센터 1644-9141로 가능한 일정을 확인해 주세요.

Input: 회사 주차장에서 교체하고 헌 배터리는 제가 가져갈게요. 가격은요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

해당 장소의 안전성과 차량 접근 가능 조건에 따라 작업 가능 여부가 달라집니다. 주차·출입 허가를 보장할 수는 없으므로 고객센터 1644-9141로 현장 조건을 확인해 주세요.

Input: AGM105

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: 가격

차량마다 배터리 규격이 달라요. 어떤 차량이세요?

Input: 폐배터리 안 주면?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 얼마 달라져요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: BMW5 2020

BMW 5시리즈 말씀하시는 걸까요?

Input: 델코

BMW 어떤 차종이세요? 1시리즈, 2시리즈, 3시리즈처럼 알려주세요.

Input: 총금액

총 교체 금액은 차량에 맞는 배터리 규격과 적용 조건 확인이 필요합니다. 차량명·연식이나 궁금한 배터리 규격을 알려주세요.

안내드린 교체 가격에는 출장교체비용과 공임이 포함되어 있고, 코딩이 필요한 차량은 코딩비도 별도로 받지 않습니다. 기본점검은 무료이며, 기존 폐배터리 수거 조건입니다. 안내된 조건으로 정상 교체 시 현장 추가비용은 없습니다.

Input: 헌 배터리 제가 가지면?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 폐배터리는 수거해요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 교체 후 기존 배터리는 수거합니다.

Input: 제가 가지고 싶어요

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 가격은?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 델코랑 바르타 가격 차이?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 5만원 높습니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: 폐배터리 안 주면 가격도 달라요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 회사 주차장

해당 장소의 안전성과 차량 접근 가능 조건에 따라 작업 가능 여부가 달라집니다. 주차·출입 허가를 보장할 수는 없으므로 고객센터 1644-9141로 현장 조건을 확인해 주세요.

Input: 제가 없어도?

고객님이 없어도 키를 맡기거나 가족·대리인이 함께하는 비대면 교체가 가능합니다. 정확한 키 인계·보관 방법과 작업 장소·일정은 고객센터 1644-9141로 확인해 주세요.

Input: 헌 배터리 보관하고 싶어요

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 가격은?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: A7

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2018~현재년형 · A7 (4K) / 2010~2017년형 · A7 중 어떤 차량인가요?

Input: 2018~현재년형 · A7 (4K) [real button]

이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요.

Input: A7

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2018~현재년형 · A7 (4K) / 2010~2017년형 · A7 중 어떤 차량인가요?

Input: 2010~2017년형 · A7 [real button]

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM105입니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: G80

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2020~현재년형 · G80 (RG3) / 2016~2020년형 · G80 중 어떤 차량인가요?

Input: 2020~현재년형 · G80 (RG3) [real button]

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM95R입니다.

AGM95R 델코 기준 교체 가격은 24만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: G80

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2020~현재년형 · G80 (RG3) / 2016~2020년형 · G80 중 어떤 차량인가요?

Input: 2016~2020년형 · G80 [real button]

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM105입니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: G90

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2021~현재년형 · G90 (RS4) / 2018~2021년형 · G90 중 어떤 차량인가요?

Input: 2021~현재년형 · G90 (RS4) [real button]

이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요.

Input: G90

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2021~현재년형 · G90 (RS4) / 2018~2021년형 · G90 중 어떤 차량인가요?

Input: 2018~2021년형 · G90 [real button]

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM105입니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: 폐배터리 안 주면 가격 달라져요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

### Browser 390

Input: 폐배터리 안 주면 가격 달라져요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 헌 배터리 안 주면 얼마예요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 기존 배터리 안 가져가면 가격 달라요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 폐배터리 제가 가지면 가격이 달라지나요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 반납 안 하면 얼마예요?

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 수거 안 하면 추가금 있어요?

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 배터리 가져가면 더 비싸요?

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 헌 배터리 가지고 싶어요 가격은요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 기존 배터리 제가 보관하면 얼마예요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 폐배터리 반납 안 하고 AGM105 하면 얼마예요?

AGM105 델코 기준 교체 가격은 28만원입니다.

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 델코랑 바르타 가격 달라요?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 5만원 높습니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: 델코 바르타 가격 차이?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 5만원 높습니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: AGM105 델코랑 바르타 얼마 차이예요?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

AGM105 바르타 기준 교체 가격은 33만원입니다.

AGM105의 두 브랜드 가격 차이는 5만원입니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: 두 브랜드 가격이 달라요?

AGM은 기본적으로 델코 제품을 취급하고 있으며, AGM70·AGM80·AGM95·AGM105 규격은 바르타도 선택 가능합니다. 규격에 따라 취급 브랜드가 다릅니다.

저희가 취급하는 일반 배터리(등록된 비AGM 규격)는 모두 델코 제품입니다.

Input: 바르타가 델코보다 얼마 비싸요?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 5만원 높습니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: AGM70이랑 AGM80 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: BMW랑 벤츠 배터리 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 현금이랑 카드 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 지역마다 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: 오늘이랑 내일 가격 달라요?

어떤 제품이나 브랜드를 비교하시는 건가요? 델코와 바르타 비교라면 말씀해 주세요.

Input: AGM105 얼마예요? 폐배터리 안 주면 가격 달라져요?

AGM105 델코 기준 교체 가격은 28만원입니다.

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: BMW5 2020 델코로 할게요. 헌 배터리 제가 가지면 얼마예요?

BMW 5시리즈 말씀하시는 걸까요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 현금으로 할게요. 폐배터리 안 주면 추가금 있어요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

네. 현금결제 가능합니다.

Input: 폐배터리 안 주고 오늘 교체 가능해요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

오늘·지금·당일 가능 여부와 배차·도착 시간은 실시간 확인이 필요합니다. 고객센터 1644-9141로 가능한 일정을 확인해 주세요.

Input: 회사 주차장에서 교체하고 헌 배터리는 제가 가져갈게요. 가격은요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

해당 장소의 안전성과 차량 접근 가능 조건에 따라 작업 가능 여부가 달라집니다. 주차·출입 허가를 보장할 수는 없으므로 고객센터 1644-9141로 현장 조건을 확인해 주세요.

Input: AGM105

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: 가격

차량마다 배터리 규격이 달라요. 어떤 차량이세요?

Input: 폐배터리 안 주면?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 얼마 달라져요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: BMW5 2020

BMW 5시리즈 말씀하시는 걸까요?

Input: 델코

BMW 어떤 차종이세요? 1시리즈, 2시리즈, 3시리즈처럼 알려주세요.

Input: 총금액

총 교체 금액은 차량에 맞는 배터리 규격과 적용 조건 확인이 필요합니다. 차량명·연식이나 궁금한 배터리 규격을 알려주세요.

안내드린 교체 가격에는 출장교체비용과 공임이 포함되어 있고, 코딩이 필요한 차량은 코딩비도 별도로 받지 않습니다. 기본점검은 무료이며, 기존 폐배터리 수거 조건입니다. 안내된 조건으로 정상 교체 시 현장 추가비용은 없습니다.

Input: 헌 배터리 제가 가지면?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 폐배터리는 수거해요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 교체 후 기존 배터리는 수거합니다.

Input: 제가 가지고 싶어요

기존 폐배터리를 보관하시려는 말씀인가요? 안내 가격은 기존 폐배터리 수거 조건이며, 보관을 원하시면 고객센터 1644-9141로 정확한 조건을 확인해 주세요.

Input: 가격은?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 델코랑 바르타 가격 차이?

저희가 취급하는 AGM 제품 기준으로 델코는 국산 제조 실버 제품입니다. 바르타는 독일산 실버 제품입니다.

중국산 제품은 취급하지 않습니다.

네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.

두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 5만원 높습니다.

차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.

바르타는 해당 차량 규격이 현재 판매 지원 규격인 경우에 선택하실 수 있습니다.

한 브랜드의 성능이 무조건 더 우수하다고 단정하지 않습니다.

배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

Input: 폐배터리 안 주면 가격도 달라요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 회사 주차장

해당 장소의 안전성과 차량 접근 가능 조건에 따라 작업 가능 여부가 달라집니다. 주차·출입 허가를 보장할 수는 없으므로 고객센터 1644-9141로 현장 조건을 확인해 주세요.

Input: 제가 없어도?

고객님이 없어도 키를 맡기거나 가족·대리인이 함께하는 비대면 교체가 가능합니다. 정확한 키 인계·보관 방법과 작업 장소·일정은 고객센터 1644-9141로 확인해 주세요.

Input: 헌 배터리 보관하고 싶어요

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: 가격은?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

Input: A7

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2018~현재년형 · A7 (4K) / 2010~2017년형 · A7 중 어떤 차량인가요?

Input: 2018~현재년형 · A7 (4K) [real button]

이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요.

Input: A7

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2018~현재년형 · A7 (4K) / 2010~2017년형 · A7 중 어떤 차량인가요?

Input: 2010~2017년형 · A7 [real button]

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM105입니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: G80

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2020~현재년형 · G80 (RG3) / 2016~2020년형 · G80 중 어떤 차량인가요?

Input: 2020~현재년형 · G80 (RG3) [real button]

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM95R입니다.

AGM95R 델코 기준 교체 가격은 24만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: G80

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2020~현재년형 · G80 (RG3) / 2016~2020년형 · G80 중 어떤 차량인가요?

Input: 2016~2020년형 · G80 [real button]

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM105입니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: G90

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2021~현재년형 · G90 (RS4) / 2018~2021년형 · G90 중 어떤 차량인가요?

Input: 2021~현재년형 · G90 (RS4) [real button]

이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요.

Input: G90

같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
2021~현재년형 · G90 (RS4) / 2018~2021년형 · G90 중 어떤 차량인가요?

Input: 2018~2021년형 · G90 [real button]

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM105입니다.

AGM105 델코 기준 교체 가격은 28만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Input: 폐배터리 안 주면 가격 달라져요?

안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.
