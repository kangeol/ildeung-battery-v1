# Battery specification particles, aliases and schedule NLU

Baseline: `6baaf054f841af5bcf47b673dbf4d919312f0649` (main, local/origin/actual remote, clean, 0/0 before edits).
No push or deployment is authorized by this task.

## Source and scope

Price truth remains `data/battery-prices.json`: 26 canonical prices, unchanged.
Product/service policies, 917 vehicle rows and 665 areas are unchanged.
The price parser validates a complete longest catalog token and an allowed Korean particle; it never strips arbitrary suffixes. Explicit L/R/HL/AL and 65-900 identities remain intact.
Derived aliases remove only the family prefix from canonical codes and existing approved aliases. Explicit Owner aliases retain precedence. Other collisions ask the customer, even if the candidate prices happen to agree. This is a product quote, not vehicle compatibility evidence.

Schedule recognition reuses the existing operational REALTIME policy and existing work-duration answer. It does not create availability, opening hours or prices. Short schedule follow-ups require established schedule context; otherwise clarification is added. Existing fresh `오늘은?` retains its safe real-time confirmation message alongside clarification.
In schedule sentences, temporal spans are masked before area extraction: `오전 10시` must not resolve to 오전동. Explicit `오전동에서 오전 10시` still resolves that locality. Area data and the area resolver are unchanged.

## Pre-fix audit

2,694 cases: PASS_EXISTING 223; PARTICLE_PARSE_FAILURE 2,366; SHORTHAND_UNIQUE_ALIAS_MISSED 21; SCHEDULE_WRONG_INTENT 58; WORKTIME_SCHEDULE_CONFUSION 4; MULTI_INTENT_LOST 8; CONTEXT_LOST 14. Other requested pre-fix categories: 0 in this fixture set.
The post-fix inventory adds two alias cases derived from approved DIN aliases (50, 100), bringing the main suite to 2,696.

## Alias ledger

Candidates below include lexical collisions before explicit Owner alias precedence. AUTO=YES means the governed rule uniquely determines the code, not that arbitrary family stripping is allowed.

| Shorthand | Candidate canonical codes | AUTO / selected | Rationale |
|---|---|---|---|
| 40AL | DF40AL | YES DF40AL | explicit Owner alias |
| 60L | DF60L, DIN60L | YES DF60L | explicit Owner alias |
| 60R | DF60R | YES DF60R | explicit Owner alias |
| 80L | DF80L | YES DF80L | explicit Owner alias |
| 80R | DF80R, AGM80R | YES DF80R | explicit Owner alias |
| 90L | DF90L, DIN90L | YES DF90L | explicit Owner alias |
| 90R | DF90R | YES DF90R | explicit Owner alias |
| 100L | DF100L, DIN100L | YES DF100L | explicit Owner alias |
| 100R | DF100R | YES DF100R | explicit Owner alias |
| 50L | DIN50L | YES DIN50L | unique exact suffix-preserving stem |
| 60HL | DIN60HL | YES DIN60HL | unique exact suffix-preserving stem |
| 74 | DIN74 | YES DIN74 | unique exact suffix-preserving stem |
| 74L | DIN74L | YES DIN74L | unique exact suffix-preserving stem |
| 74R | DIN74R | YES DIN74R | unique exact suffix-preserving stem |
| 90 | DIN90 | YES DIN90 | unique exact suffix-preserving stem |
| 60 | AGM60, DIN60L | NO / ask | canonical AGM60 and approved DIN60 alias collide |
| 70 | AGM70 | YES AGM70 | unique exact suffix-preserving stem |
| 80 | AGM80 | YES AGM80 | unique exact suffix-preserving stem |
| 95 | AGM95 | YES AGM95 | unique exact suffix-preserving stem |
| 95R | AGM95R | YES AGM95R | unique exact suffix-preserving stem |
| 105 | AGM105 | YES AGM105 | unique exact suffix-preserving stem |
| 50 | DIN50L | YES DIN50L | approved DIN50 alias stem |
| 100 | DIN100L | YES DIN100L | approved DIN100 alias stem |

Unstripped DIN50 / DIN60 / DIN100 remain the existing explicitly approved aliases. There are 26 runtime noncanonical aliases including these three; 25 deterministic mappings and one unresolved collision. Tests also inject a synthetic future DIN105/AGM105 collision; no synthetic code or price is added to production data.

## Reproducible verification

- `node tools/test-spec-schedule.js --before`: baseline audit mode (run against baseline source).
- `node tools/test-spec-schedule.js`: 2,548 particle/price combinations (26 × 14 × 7), plus aliases, schedule, multi-intent, short-context and negative controls; 2,696 cases total.
- `node tools/test-spec-schedule-safety.js`: 119 conversation turns plus 1,092 parser variants, every named hard gate exercised; session roundtrips, unknown/malformed tokens, unsupported VARTA, compatibility boundaries, temporal/locality collision and protected-source freeze.
- `node tools/test-spec-schedule-browser.js`: real browser, UAT_WIDTH=1440 or 390, 50 records per viewport including every A7/G80/G90 candidate click and a real ambiguous `60` → DIN60L choice click.
- Existing presentation, comparison, operational, authenticity, standalone, vehicle-selection and final-FAQ full-regression scripts remain in use. Historical snapshot tests change only approved cache expectations; presentation scope permits the narrowly authorized NLU files without removing its UI/performance assertions.

Evidence is outside the repository at `C:/Users/kang1/AppData/Local/Temp/ildeung-spec-schedule/` (`before.json`, `after.json`, `safety.json`, `browser-1440.json`, `browser-390.json`). Existing regression evidence is redirected only on write from `docs/evidence/` to `C:/Users/kang1/AppData/Local/Temp/ildeung-ui-deploy/evidence/`; assertions and reads are unchanged.

## Browser response examples

- AGM105는 얼마인가요? → `AGM105 델코 기준 교체 가격은 28만원입니다.`
- AGM80은 얼마예요? → `AGM80 델코 기준 교체 가격은 19만원입니다.`
- DIN74L은 얼마인가요? → `DIN74L 교체 가격은 12만5천원입니다.`
- DF80L은 얼마예요? / 80L은 얼마인가요? → `DF80L 교체 가격은 10만원입니다.`
- 65-900은 얼마죠? → `65-900 교체 가격은 15만5천원입니다.`
- Morning/lunch/evening/specific-time/tomorrow/weekend schedules reuse: `오늘·지금·당일 가능 여부와 배차·도착 시간은 실시간 확인이 필요합니다. 고객센터 1644-9141로 가능한 일정을 확인해 주세요.` No date/time availability is asserted.
- Evening opening hours: `정확한 운영시간은 일정에 따라 달라질 수 있어 고객센터 1644-9141로 확인해 주세요.`
- Schedule + work duration adds: `배터리 교체 작업은 보통 10~20분 정도 소요됩니다. 차량과 작업 상황에 따라 시간은 약간 달라질 수 있습니다.`

## Freeze

No data/policy/SEO/GEO/CSS/vehicle/area/battery/blog/sitemap content change. BLOG_COUNT=345, SITEMAP_URL_COUNT=1133. The only HTML change is the consultation JS cache query. Dependent JS import cache queries are advanced together; no UI redesign.
