# Battery shorthand / vehicle routing collision audit

## Identity and scope

Baseline main: `6f1c485736316a2fef23206b51138c46a6ccedd9`.
Origin and actual remote: `6baaf054f841af5bcf47b673dbf4d919312f0649`.
Initial worktree/staged/untracked clean; ahead/behind 1/0, fresh fetch verified.
Parent commit is preserved. No push or deployment in this task.

Only conversation routing is changed at runtime. No vehicle, price, policy or area data changes.
Existing canonical catalog and vehicle matcher remain the only sources of truth.
The inherited unpublished `spec-schedule-v1` asset version is retained.

## Proven cause and original trace

The catalog recognized bare 60 as AGM60/DIN60L, while extractEntities returned
volvo|S60, volvo|V60, volvo|XC60, bmw|5시리즈 and kgm|무쏘.
The old conversationTurn guard required no vehicle matches/manufacturer before
entering catalog ambiguity handling. Incidental numeric/alias matches bypassed
that branch. The downstream VEHICLE_IDENTIFICATION/year clarification set
previousQuestion.field=year, ambiguity=year and returned:
“연식을 정확히 확인하고 싶어요. 네 자리로 알려주시겠어요? 예) 2019년식”.
No exact vehicle or battery was confirmed.

The same wrong year question occurred after a product-only AGM105 quote.
Explicit price language already reached the correct two-code choice.
All 11 mandatory original traces were captured before editing.

| Original input | Detected intent | Battery candidates | Vehicle keys | Original answer |
|---|---|---|---|---|
| 60 | VEHICLE_IDENTIFICATION | AGM60, DIN60L | volvo|S60, volvo|V60, volvo|XC60, bmw|5시리즈, kgm|무쏘 | 연식을 정확히 확인하고 싶어요. 네 자리로 알려주시겠어요? 예) 2019년식 |
| 60은 얼마예요? | PRICE_QUESTION | AGM60, DIN60L | none | 어떤 배터리 규격 말씀하시는 건가요? AGM60 / DIN60L 중 선택해 주세요. |
| 60 가격 | PRICE_QUESTION | AGM60, DIN60L | none | 어떤 배터리 규격 말씀하시는 건가요? AGM60 / DIN60L 중 선택해 주세요. |
| AGM60 | AGM_DIN_QUESTION | AGM60 | none | AGM60 델코 기준 교체 가격은 15만5천원입니다. / 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다. |
| DIN60L | AGM_DIN_QUESTION | DIN60L | none | DIN60L 교체 가격은 10만5천원입니다. / 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다. |
| S60 | VEHICLE_IDENTIFICATION | none | volvo|S60 | 네, 확인됐어요. 고객님 차량의 기본 배터리는 AGM80입니다. / AGM80 델코 기준 교체 가격은 19만원입니다. / 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다. |
| 볼보 S60 | VEHICLE_IDENTIFICATION | none | volvo|S60 | 네, 확인됐어요. 고객님 차량의 기본 배터리는 AGM80입니다. / AGM80 델코 기준 교체 가격은 19만원입니다. / 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다. |
| V60 | VEHICLE_IDENTIFICATION | none | volvo|V60 | 네, 확인됐어요. 고객님 차량의 기본 배터리는 AGM80입니다. / AGM80 델코 기준 교체 가격은 19만원입니다. / 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다. |
| 볼보 V60 | VEHICLE_IDENTIFICATION | none | volvo|V60 | 네, 확인됐어요. 고객님 차량의 기본 배터리는 AGM80입니다. / AGM80 델코 기준 교체 가격은 19만원입니다. / 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다. |
| XC60 | VEHICLE_IDENTIFICATION | none | volvo|XC60 | 네, 확인됐어요. 고객님 차량의 기본 배터리는 AGM70입니다. / 같은 차량에 AGM80 업그레이드도 가능합니다. / AGM70 델코 기준 교체 가격은 17만원입니다. / 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다. |
| 볼보 XC60 | VEHICLE_IDENTIFICATION | none | volvo|XC60 | 네, 확인됐어요. 고객님 차량의 기본 배터리는 AGM70입니다. / 같은 차량에 AGM80 업그레이드도 가능합니다. / AGM70 델코 기준 교체 가격은 17만원입니다. / 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다. |

## Common routing policy

- Complete catalog code: product quote, not vehicle compatibility evidence.
- Explicit manufacturer/model: existing vehicle flow.
- Approved shorthand plus price language: catalog choices, retaining multiplicity.
- Bare alias with multiple battery candidates AND vehicle interpretations: ask domain.
- Existing product-only quote context: retain battery interpretation and ask code.
- Established manufacturer-only context: ask actual matching vehicle names.
- Unique approved aliases retain their governed code even with incidental vehicle matches.
- Existing generic quick replies carry text values; exact vehicle row selections still use
  existing validated candidate IDs. No second DB, no model/year-specific branch.
- Case/spacing/punctuation-normalized bare input is supported.
- Topic clarification preserves existing state and does not establish battery compatibility.

## Inventory

26 canonical codes + 26 distinct noncanonical approved/derived aliases = 52 tokens,
checked against all 917 rows and the real matcher.
Seven lexical matcher collisions: 60, 70, 74, 80, 80R, 90, 90R.
Only 60 has multiple governed battery candidates and therefore needs domain clarification.
The six unique governed aliases must NOT be classified as erroneous battery auto-confirmation.

Initial exploratory assertions incorrectly demanded domain questions for all seven overlaps:
wrong-route=7, auto-confirm=6, context=1. The existing standalone suite caught that
overrestriction at approved alias 80R. Expectations were reconciled with the Owner's
explicit multi-battery condition and approved single-alias precedence; no canonical-price
or vehicle-safety assertion was removed. Actual baseline defects under the final policy:
one bare alias routed wrongly and one product-context continuation routed wrongly.
The explicit-price 416-case matrix and explicit vehicle cases already passed.
Final focused suite: 564 turns (557 original plus seven case/punctuation checks), all nine gates zero.

Collision types below are lexical observations, not data defects.
AUTO means a product quote is authorized, never vehicle fit.
Vehicle keys containing | are rendered with / below.

| Input | Battery candidates | Vehicle candidates | Collision type | Route | AUTO | Clarify | Rationale |
|---|---|---|---|---|---|---|---|
| 40AL | DF40AL | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 60L | DF60L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 60R | DF60R | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 80L | DF80L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 80R | DF80R | genesis/G80 | BARE_NUMERIC_OR_ALIAS_MATCHER_COLLISION | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 90L | DF90L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 90R | DF90R | genesis/G90 | BARE_NUMERIC_OR_ALIAS_MATCHER_COLLISION | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 100L | DF100L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 100R | DF100R | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 50L | DIN50L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 60HL | DIN60HL | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 74 | DIN74 | audi/A7, audi/Q7, bmw/2시리즈 | BARE_NUMERIC_OR_ALIAS_MATCHER_COLLISION | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 74L | DIN74L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 74R | DIN74R | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 90 | DIN90 | volvo/S90, volvo/V90, volvo/XC90, genesis/EQ900, genesis/G90, bmw/3시리즈 | BARE_NUMERIC_OR_ALIAS_MATCHER_COLLISION | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 60 | AGM60, DIN60L | volvo/S60, volvo/V60, volvo/XC60, bmw/5시리즈, kgm/무쏘 | BARE_NUMERIC_OR_ALIAS_MATCHER_COLLISION | TOPIC_CLARIFICATION | no | yes | Multiple battery candidates and vehicle interpretations require topic clarification |
| 70 | AGM70 | volvo/XC70, genesis/G70, genesis/GV70, bmw/1시리즈, bmw/7시리즈, bmw/X5 | BARE_NUMERIC_OR_ALIAS_MATCHER_COLLISION | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 80 | AGM80 | volvo/S80, audi/Q5, genesis/G80, genesis/GV80 | BARE_NUMERIC_OR_ALIAS_MATCHER_COLLISION | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 95 | AGM95 | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 95R | AGM95R | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 105 | AGM105 | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 50 | DIN50L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| 100 | DIN100L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| DIN50 | DIN50L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| DIN60 | DIN60L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| DIN100 | DIN100L | none | UNIQUE_ALIAS | BATTERY | yes | no | Preserve approved unique catalog alias; incidental numeric vehicle matches do not override it |
| DF40AL | DF40AL | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DF60L | DF60L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DF60R | DF60R | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DF80L | DF80L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DF80R | DF80R | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DF90L | DF90L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DF90R | DF90R | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DF100L | DF100L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DF100R | DF100R | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN50L | DIN50L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN60L | DIN60L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN60HL | DIN60HL | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN74 | DIN74 | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN74L | DIN74L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN74R | DIN74R | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN90 | DIN90 | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN90L | DIN90L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| DIN100L | DIN100L | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| 65-900 | 65-900 | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| AGM60 | AGM60 | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| AGM70 | AGM70 | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| AGM80 | AGM80 | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| AGM80R | AGM80R | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| AGM95 | AGM95 | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| AGM95R | AGM95R | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |
| AGM105 | AGM105 | none | EXPLICIT_BATTERY | BATTERY | yes | no | Complete canonical specification wins over incidental numeric vehicle matches |

## Exact post-fix replies

### 60

배터리 규격 60을 말씀하시는 건가요, 차량 모델을 말씀하시는 건가요?

Choices: 배터리 규격 확인 → 60 가격; 차량 모델 확인 → 차량 모델 상담.

### 60은 얼마예요?

어떤 배터리 규격 말씀하시는 건가요? AGM60 / DIN60L 중 선택해 주세요.

Choices: AGM60 → AGM60 가격; DIN60L → DIN60L 가격.

### 60 가격

어떤 배터리 규격 말씀하시는 건가요? AGM60 / DIN60L 중 선택해 주세요.

Choices: AGM60 → AGM60 가격; DIN60L → DIN60L 가격.

### AGM60

AGM60 델코 기준 교체 가격은 15만5천원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Choices: none.

### DIN60L

DIN60L 교체 가격은 10만5천원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Choices: none.

### S60

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM80입니다.

AGM80 델코 기준 교체 가격은 19만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Choices: none.

### 볼보 S60

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM80입니다.

AGM80 델코 기준 교체 가격은 19만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Choices: none.

### V60

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM80입니다.

AGM80 델코 기준 교체 가격은 19만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Choices: none.

### 볼보 V60

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM80입니다.

AGM80 델코 기준 교체 가격은 19만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Choices: none.

### XC60

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM70입니다.

같은 차량에 AGM80 업그레이드도 가능합니다.

AGM70 델코 기준 교체 가격은 17만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Choices: none.

### 볼보 XC60

네, 확인됐어요.
고객님 차량의 기본 배터리는 AGM70입니다.

같은 차량에 AGM80 업그레이드도 가능합니다.

AGM70 델코 기준 교체 가격은 17만원입니다.

출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

Choices: none.


## Reproducible checks

Run `node tools/test-spec-vehicle-collision.js`.
It writes full trace, ledger, session and gate evidence outside the repository in
`%TEMP%/ildeung-collision/after.json` (override with COLLISION_EVIDENCE).
`--before` is for a genuine pre-change checkout, not a simulation of old code.

Classification counts are assertion-based and may overlap:
- BATTERY_EXPLICIT_CORRECT: 55
- VEHICLE_EXPLICIT_CORRECT: 11
- BATTERY_PRICE_SHORTHAND_CORRECT: 416
- TRUE_COLLISION_CLARIFIED: 4
- CONTEXT_RESOLVED_CORRECT: 59
- WRONG_BATTERY_AUTOCONFIRM: 0
- WRONG_VEHICLE_AUTOCONFIRM: 0
- YEAR_MISROUTED: 0
- OTHER_FAILURE: 0

Browser: `tools/test-spec-vehicle-collision-browser.js`, UAT_WIDTH=1440/390,
local port 4173. Actual fill/click, rendered-text checks, session round-trip,
battery/domain choices, Volvo choices, every A7/G80/G90 candidate, input/choice
dimensions, no horizontal overflow. Evidence is outside the repo.

Historical test scope manifests explicitly allow the parent audit document and this
audit/test pair. All original price, DB, protected HTML and presentation assertions remain.

## Verification results

- Collision focused: 564 turns PASS; all nine requested hard gates = 0.
- Parent spec/schedule: 2,696 cases PASS, including 2,548 particle cases.
- Parent safety: 119 conversation turns + 1,092 parser variants; all 17 gates = 0.
- Presentation/UI: 235 assertions PASS after staging the new audit/tests.
- Brand comparison: 625 PASS; operational FAQ: 1,602 PASS.
- Authentic/manufacture/cash: 581 PASS; standalone specification: 178 PASS.
- Full authoritative final-FAQ regression: 20/20 PASS.
- Vehicle selection: 17,496 queries, 499 groups, 1,277 buttons; 1,273 exact row
  results and 4 legitimate governed no-match results. All failure categories zero.
- Selection context/security: 33 turns PASS; 19 invalid/stale payloads rejected.
- Actual desktop 1440px and mobile 390px: each 50 records, including 14 actual
  choice-button clicks. Both PASS; input 16px, heights 54px/48px, choice height
  48px, composer visible, body scroll 0, horizontal overflow false.
- A7: 2018-current 4K confirmation required; 2010-2017 AGM105.
- G80: 2020-current RG3 AGM95R; 2016-2020 AGM105.
- G90: 2021-current RS4 confirmation required; 2018-2021 AGM105.
  Every candidate was actually clicked on both viewports, canonical row keys matched,
  and the original ambiguity did not repeat.
- 80L은 얼마인가요?: DF80L 10만원. AGM105는 얼마인가요?: DELKOR 28만원.
- 저녁에도 되나요? / 오전 10시에 가능해요?: existing real-time phone confirmation;
  no operating-time promise. The time-only question has region=null.
- 오전동에서 오전 10시 가능해요?: 경기 의왕시 오전동 retained with phone schedule confirmation.
- No tracked HTML/CSS/data/seo-data/sitemap changes versus parent 6f1c4857.
  Unexpected title/H1/canonical/schema/SEO-GEO/body/generated vehicle/area differences: 0.
- BLOG_COUNT=345; SITEMAP_URL_COUNT=1133. Existing blog/site/sitemap audits PASS.
- Fresh remote recheck unchanged at 6baaf054f841af5bcf47b673dbf4d919312f0649.
- No new cache version is necessary: parent spec-schedule-v1 is still unpublished.
- Push=NO; deploy=NO. The delivery is one new normal local commit over 6f1c4857.

### Final collision hard gates

```text
SPEC_VEHICLE_COLLISION_WRONG_ROUTE = 0
BARE_COLLISION_AUTOCONFIRM = 0
EXPLICIT_VEHICLE_MISROUTED_TO_BATTERY = 0
EXPLICIT_BATTERY_MISROUTED_TO_VEHICLE = 0
BATTERY_PRICE_SHORTHAND_MISROUTED = 0
YEAR_INPUT_MISROUTED = 0
COLLISION_CONTEXT_LOST = 0
COLLISION_CHOICE_WRONG_RESOLUTION = 0
UNKNOWN_SPEC_PRICE_FABRICATED = 0
```

The first browser restart was an automation-daemon startup pipe wait, not a failed
application assertion. Only the task's own test process was stopped; sessions were
opened before rerunning. Final browser runs exited successfully on both viewports.
Legacy suites' evidence writes were routed to an external temporary evidence folder;
their source reads and assertions were unchanged. No tracked evidence was overwritten.
