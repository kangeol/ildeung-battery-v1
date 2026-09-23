# Purchase flow and product knowledge audit

Baseline: `3fad967a867c32be161829aeb344db7e43aab832`. Local implementation only; no push or deployment.

## Canonical sources and boundaries

- `data/consult-service-policy.json#purchaseKnowledge`: new wording and technical source metadata.
- Existing `data/battery-prices.json`: unchanged price/brand authority; no duplicated price table.
- Existing manufacturer JSON: unchanged fitment authority (917 rows). Service areas unchanged (665).
- General technical references: https://www.varta-automotive.com/knowledge/articles/article-details/battery-technologies and https://www.varta-automotive.com/en/knowledge/articles/article-details/efb-and-agm-differences
- Sources are used for construction/type distinctions, not sales prices, company margins, guaranteed lifespan or individual vehicle compatibility.
- Reported installed labels have separate customerReportedSpec provenance. They do not establish confirmedBattery. A new vehicle/product supersedes the report. Old sessions migrate with an empty report; malformed report labels are rejected.
- Purchase, cancellation and change requests never perform an order/schedule write. The existing phone CTA handles actual application.

## Pre-fix audit

209 turns, 189 phrase variants classified:

```json
{
  "PASS_EXISTING": 60,
  "WRONG_INTENT": 60,
  "CONTEXT_LOST": 0,
  "FALSE_ORDER_COMPLETION": 0,
  "SUMMARY_HALLUCINATION": 0,
  "PRODUCT_KNOWLEDGE_MISSING": 54,
  "TECHNICAL_OVERCLAIM": 0,
  "FITMENT_OVERCLAIM": 15,
  "OTHER": 0
}
```

Classification caveat: FITMENT_OVERCLAIM includes missing customer-report acknowledgement (15 cases), not 15 proven affirmative false-fitment claims. Likewise the pre-audit symptom/contact counters include missing safe explanations or phone routing, not necessarily invented diagnoses or incorrect telephone digits. These labels are broad acceptance failures, not claims about every old answer.

## Focused verification

224 turns; 189 phrase variants plus integrated/context/safety turns. Session encode/decode checked on each turn. Additional assertions cover stale report replacement, unknown AGM999 without price, MINI composite purchase, unsupported VARTA purchase, empty summary, area retention and old/malformed session data.

```json
{
  "FALSE_ORDER_COMPLETION": 0,
  "FALSE_RESERVATION_CHANGE": 0,
  "FALSE_RESERVATION_CANCEL": 0,
  "SUMMARY_HALLUCINATION": 0,
  "CONTACT_NUMBER_WRONG": 0,
  "PRODUCT_KNOWLEDGE_TECHNICAL_OVERCLAIM": 0,
  "UNSUPPORTED_PRODUCT_SUPERIORITY": 0,
  "UNSUPPORTED_LIFESPAN_CLAIM": 0,
  "UNAUTHORIZED_UPGRADE_CONFIRMATION": 0,
  "UNAUTHORIZED_DOWNGRADE_CONFIRMATION": 0,
  "UNAUTHORIZED_AGM_EFB_SUBSTITUTION": 0,
  "UNAUTHORIZED_GENERAL_BATTERY_SUBSTITUTION": 0,
  "CUSTOMER_REPORTED_SPEC_FALSE_COMPATIBILITY": 0,
  "SYMPTOM_DIAGNOSIS_OVERCLAIM": 0,
  "PRODUCT_MULTI_INTENT_LOST": 0,
  "PURCHASE_CONTEXT_LOST": 0
}
```

## Regression scope

Existing assertions remain in place. Historical source-freeze tests exclude only the new purchaseKnowledge section before deep equality with prior policy; cache tokens and authorized-file allowlists were updated. No prior price or policy truth was relaxed.

Suites: full final-FAQ regression (20 commands), brand comparison625, operational1602, authenticity/cash581, standalone178, spec/schedule2696 and safety119, collision564, candidate context33 (19 rejected invalid selections), mass499 groups/1277 buttons.

All listed suites PASS. Presentation assertions: 244 PASS. Mass selection: 1273 exact-row results and 4 legitimate governed no-match results; repeated ambiguity/wrong row/lost generation/false unsupported/other failure counts all zero. Focused purchase suite: 224 turns, all 16 hard-gate counters zero.

## Actual browser transcripts

agent-browser actual local UI, desktop1440 and mobile390. Each: 52 evidence records (includes final UI metric/screenshot record), all mandatory A–E flows and every displayed A7/G80/G90 candidate. State and returned DOM text compared with the engine; no horizontal overflow. Mobile body scroll0, input16px/48px and visible.

### 그걸로 해주세요

> 아직 확정된 차량·배터리 상담 정보가 없습니다. 알고 계신 차량명이나 궁금한 규격을 알려주세요.
>
> 실제 접수는 고객센터 1644-9141로 연락해 주세요. 이 채팅에서는 주문이나 예약을 확정하지 않습니다.

### 상담내용 정리해줘

> 아직 확정된 차량·배터리 상담 정보가 없습니다. 알고 계신 차량명이나 궁금한 규격을 알려주세요.

### 전화번호 뭐예요?

> 고객센터 전화번호는 1644-9141입니다.

### 예약 변경하고 싶어요

> 예약·방문 시간 변경은 고객센터 1644-9141로 확인해 주세요. 이 채팅에서는 예약을 변경하지 않습니다.

### 예약 취소할게요

> 예약 취소는 고객센터 1644-9141로 확인해 주세요. 이 채팅에서는 예약을 취소하지 않습니다.

### 전화하면 뭐라고 말하면 돼요?

> 아직 확정된 차량·배터리 상담 정보가 없습니다. 알고 계신 차량명이나 궁금한 규격을 알려주세요.
>
> 위 상담 내용과 알고 계신 차량 정보, 원하시는 서비스·지역·일정을 고객센터 1644-9141에 말씀해 주세요. 접수 조건은 상담원과 확인하실 수 있습니다.

### AGM이 뭐예요?

> AGM은 유리섬유 매트에 전해액을 흡수시킨 납산 배터리입니다. 반복 시동과 전력 요구가 큰 차량 등에 사용되지만, 내 차에 필요한지는 차량별 지정 규격을 확인해야 합니다.

### EFB가 뭐예요?

> EFB는 Enhanced Flooded Battery의 약자로, 반복 충·방전에 대응하도록 개선한 액식 납산 배터리입니다. 일반 액식 배터리와 구조·설계에 차이가 있으며, 적용 여부는 차량별 지정 규격으로 확인해야 합니다.

### AGM은 일반 배터리랑 뭐가 달라요?

> 일반 액식과 EFB는 액체 전해액을 사용하는 방식이며, EFB는 반복 충·방전에 대응하도록 개선한 설계입니다. AGM은 전해액을 유리섬유 매트에 흡수시킨 방식입니다. 타입 설명만으로 서로 바꿔 장착할 수 있다고 판단하지 않습니다.

### AGM이 왜 비싸요?

> AGM은 전해액을 유리섬유 매트에 흡수시키는 등 일반 액식 배터리와 구조·설계가 다릅니다. 이런 제품 차이와 현재 판매가격은 구분해야 하며, 회사의 원가나 마진을 임의로 설명하지 않습니다. 정확한 판매가격은 해당 규격의 가격표로 안내합니다.

### AGM 수명은 더 길어요?

> 배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.

### AGM70인데 AGM80 넣어도 돼요?

> 용량 숫자나 현재 장착된 배터리만으로 호환성을 확정할 수 없습니다. 차량 지정 규격, 장착 크기, 단자 방향과 전기적 요구 조건 확인이 필요합니다. 차량명·연식·세부 모델을 알려주시거나 고객센터 1644-9141로 확인해 주세요.

### AGM95 대신 AGM105 가능해요?

> 용량 숫자나 현재 장착된 배터리만으로 호환성을 확정할 수 없습니다. 차량 지정 규격, 장착 크기, 단자 방향과 전기적 요구 조건 확인이 필요합니다. 차량명·연식·세부 모델을 알려주시거나 고객센터 1644-9141로 확인해 주세요.

### 지금 AGM95 달려있어요

> 고객님이 알려주신 현재 장착 규격은 AGM95입니다. 고객님 말씀으로 기록하며, 이 정보만으로 차량에 맞는 규격이라고 확정하지 않습니다.

### 배터리 경고등 떴어요

> 배터리 경고등은 배터리뿐 아니라 충전·전기 계통과 관련될 수 있습니다. 증상만으로 원인을 단정하지 말고 차량 상태 확인을 받아주세요.

### ISG가 안돼요

> ISG·스탑앤고 미작동은 배터리 상태 외에도 차량의 작동 조건과 관련될 수 있습니다. 배터리 불량으로 단정하지 않고 차량 상태를 확인해야 합니다.

### AGM이 뭐예요? 현금돼요?

> AGM은 유리섬유 매트에 전해액을 흡수시킨 납산 배터리입니다. 반복 시동과 전력 요구가 큰 차량 등에 사용되지만, 내 차에 필요한지는 차량별 지정 규격을 확인해야 합니다.
>
> 네. 현금결제 가능합니다.

### 예약 취소하려고요

> 예약 취소는 고객센터 1644-9141로 확인해 주세요. 이 채팅에서는 예약을 취소하지 않습니다.

### AGM이 일반 배터리랑 뭐가 달라요?

> 일반 액식과 EFB는 액체 전해액을 사용하는 방식이며, EFB는 반복 충·방전에 대응하도록 개선한 설계입니다. AGM은 전해액을 유리섬유 매트에 흡수시킨 방식입니다. 타입 설명만으로 서로 바꿔 장착할 수 있다고 판단하지 않습니다.

### EFB랑 AGM 차이가 뭐예요?

> 일반 액식과 EFB는 액체 전해액을 사용하는 방식이며, EFB는 반복 충·방전에 대응하도록 개선한 설계입니다. AGM은 전해액을 유리섬유 매트에 흡수시킨 방식입니다. 타입 설명만으로 서로 바꿔 장착할 수 있다고 판단하지 않습니다.

### BMW 5시리즈 2020년식

> 네, 확인됐어요.
> 고객님 차량의 기본 배터리는 AGM95입니다.
>
> 같은 차량에 AGM105 업그레이드도 가능합니다.
>
> AGM95 델코 기준 교체 가격은 22만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### 가격은?

> 네, 확인됐어요.
> 고객님 차량의 기본 배터리는 AGM95입니다.
>
> AGM95 델코 기준 교체 가격은 22만원입니다.

### 바르타는?

> AGM95 바르타 기준 교체 가격은 27만원입니다.

### 델코로 할게요

> 현재 상담 내용은 BMW 5시리즈 / 2020년식입니다.
>
> AGM95 델코 기준 교체 가격은 22만원입니다.
>
> 실제 접수는 고객센터 1644-9141로 연락해 주세요. 이 채팅에서는 주문이나 예약을 확정하지 않습니다.

### 상담내용 정리해줘

> 현재 상담 내용은 BMW 5시리즈 / 2020년식입니다.
>
> AGM95 델코 기준 교체 가격은 22만원입니다.

### 전화번호 알려줘

> 고객센터 전화번호는 1644-9141입니다.

### G90

> 같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
> 2021~현재년형 · G90 (RS4) / 2018~2021년형 · G90 중 어떤 차량인가요?

### Button: 2018~2021년형 · G90

> 네, 확인됐어요.
> 고객님 차량의 기본 배터리는 AGM105입니다.
>
> AGM105 델코 기준 교체 가격은 28만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### 이걸로 교체할게요

> 현재 상담 내용은 제네시스 G90 / G90입니다.
>
> AGM105 델코 기준 교체 가격은 28만원입니다.
>
> 실제 접수는 고객센터 1644-9141로 연락해 주세요. 이 채팅에서는 주문이나 예약을 확정하지 않습니다.

### 전화하면 뭐라고 말하면 돼요?

> 현재 상담 내용은 제네시스 G90 / G90입니다.
>
> AGM105 델코 기준 교체 가격은 28만원입니다.
>
> 위 상담 내용과 알고 계신 차량 정보, 원하시는 서비스·지역·일정을 고객센터 1644-9141에 말씀해 주세요. 접수 조건은 상담원과 확인하실 수 있습니다.

### AGM105는 얼마인가요?

> AGM105 델코 기준 교체 가격은 28만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### 바르타는?

> AGM105 바르타 기준 교체 가격은 33만원입니다.

### 바르타로 할게요

> 문의하신 제품 규격이며 차량 적합성을 확정한 것은 아닙니다.
>
> AGM105 바르타 기준 교체 가격은 33만원입니다.
>
> 실제 접수는 고객센터 1644-9141로 연락해 주세요. 이 채팅에서는 주문이나 예약을 확정하지 않습니다.

### 예약 변경하고 싶어요

> 예약·방문 시간 변경은 고객센터 1644-9141로 확인해 주세요. 이 채팅에서는 예약을 변경하지 않습니다.

### 지금 AGM95 달려있어요

> 고객님이 알려주신 현재 장착 규격은 AGM95입니다. 고객님 말씀으로 기록하며, 이 정보만으로 차량에 맞는 규격이라고 확정하지 않습니다.

### 얼마예요?

> AGM95 델코 기준 교체 가격은 22만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### 제 차에 맞는 거죠?

> 용량 숫자나 현재 장착된 배터리만으로 호환성을 확정할 수 없습니다. 차량 지정 규격, 장착 크기, 단자 방향과 전기적 요구 조건 확인이 필요합니다. 차량명·연식·세부 모델을 알려주시거나 고객센터 1644-9141로 확인해 주세요.

### AGM70인데 AGM80 넣어도 돼요?

> 용량 숫자나 현재 장착된 배터리만으로 호환성을 확정할 수 없습니다. 차량 지정 규격, 장착 크기, 단자 방향과 전기적 요구 조건 확인이 필요합니다. 차량명·연식·세부 모델을 알려주시거나 고객센터 1644-9141로 확인해 주세요.

### A7

> 같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
> 2018~현재년형 · A7 (4K) / 2010~2017년형 · A7 중 어떤 차량인가요?

### Button: 2018~현재년형 · A7 (4K)

> 이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요.

### A7

> 같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
> 2018~현재년형 · A7 (4K) / 2010~2017년형 · A7 중 어떤 차량인가요?

### Button: 2010~2017년형 · A7

> 네, 확인됐어요.
> 고객님 차량의 기본 배터리는 AGM105입니다.
>
> AGM105 델코 기준 교체 가격은 28만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### G80

> 같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
> 2020~현재년형 · G80 (RG3) / 2016~2020년형 · G80 중 어떤 차량인가요?

### Button: 2020~현재년형 · G80 (RG3)

> 네, 확인됐어요.
> 고객님 차량의 기본 배터리는 AGM95R입니다.
>
> AGM95R 델코 기준 교체 가격은 24만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### G80

> 같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
> 2020~현재년형 · G80 (RG3) / 2016~2020년형 · G80 중 어떤 차량인가요?

### Button: 2016~2020년형 · G80

> 네, 확인됐어요.
> 고객님 차량의 기본 배터리는 AGM105입니다.
>
> AGM105 델코 기준 교체 가격은 28만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### G90

> 같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
> 2021~현재년형 · G90 (RS4) / 2018~2021년형 · G90 중 어떤 차량인가요?

### Button: 2021~현재년형 · G90 (RS4)

> 이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요.

### G90

> 같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.
> 2021~현재년형 · G90 (RS4) / 2018~2021년형 · G90 중 어떤 차량인가요?

### Button: 2018~2021년형 · G90

> 네, 확인됐어요.
> 고객님 차량의 기본 배터리는 AGM105입니다.
>
> AGM105 델코 기준 교체 가격은 28만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

### AGM이 뭐예요?

> AGM은 유리섬유 매트에 전해액을 흡수시킨 납산 배터리입니다. 반복 시동과 전력 요구가 큰 차량 등에 사용되지만, 내 차에 필요한지는 차량별 지정 규격을 확인해야 합니다.

## Freeze

Protected homepage/vehicle/area/battery SEO/GEO, title/H1/canonical/schema, CSS, manufacturer data, area data, price data, blog content and sitemap are unchanged from baseline. Only smart-consult/index.html script cache token changes. BLOG_COUNT=345; SITEMAP_URL_COUNT=1133. Generated vehicle/area HTML diffs=0.

Detailed raw evidence is written outside the repository under C:/Users/kang1/AppData/Local/Temp/ildeung-purchase; legacy evidence output is redirected to C:/Users/kang1/AppData/Local/Temp/ildeung-ui-deploy/evidence to avoid overwriting tracked historical evidence.

## Changed files

- `data/consult-service-policy.json`
- `docs/purchase-knowledge-audit.md`
- `js/smart-consult-conversation.js`
- `js/smart-consult-entry.js`
- `js/smart-consult-purchase.js`
- `js/smart-consult-session.js`
- `js/smart-consult.js`
- `smart-consult/index.html`
- `tools/test-authentic-cash.js`
- `tools/test-battery-certainty-scope.js`
- `tools/test-battery-pricing.js`
- `tools/test-brand-comparison.js`
- `tools/test-brand-service.js`
- `tools/test-consult-presentation.js`
- `tools/test-final-faq.js`
- `tools/test-operational.js`
- `tools/test-product-as-hours.js`
- `tools/test-purchase-knowledge-browser.js`
- `tools/test-purchase-knowledge.js`
- `tools/test-smart-consult-branding.js`
- `tools/test-smart-consult-viewport.js`
- `tools/test-spec-schedule-safety.js`
