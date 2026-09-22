# Smart consultation V7 — predeploy audit

Date: 2026-09-22. Local preview only; NO PUSH or production deployment.
Baseline: main/e71c422e, origin/main/d179e306, ahead 6 / behind 0, clean.
Fresh fetch at completion still found origin/main at d179e306.
Harness repair is separately committed as 96a7b93f; see smart-consult-v7-harness.md.

## Canonical area coverage

Source: seo-data/service-areas.json. Search index:
seo-data/smart-consult-location-index.json. Neither file was modified.
An independent source traversal checks every index identity, hierarchy, and label.

- 665 records: 3 provinces/metropolitan groups, 14 cities, 40 districts, 608 localities.
- 620 distinct normalized own names; 57 duplicate normalized stems.
- 2,496 distinct classified aliases, including 27 rejected one-character stems.

| Classification | Count | Example |
| --- | ---: | --- |
| EXACT_UNIQUE | 1,909 | 서울송파구 |
| UNIQUE_SUFFIXLESS | 469 | 송도 (also includes safe metro spelling variants) |
| SAME_JURISDICTION_PARENT_CHILD_COLLISION | 18 | 송파: 송파구 / same district's 송파동 |
| CONTEXT_RESOLVABLE_COLLISION | 26 | 신정동: 서울 마포구 / 양천구 |
| CROSS_JURISDICTION_AMBIGUOUS | 47 | 시흥: 서울 / 경기 |
| UNSAFE_REJECT | 27 | 평 (from 평동) |

2,396 safe aliases resolve without an extra confirmation turn. A same-stem
city/district can win only when ALL canonical candidates are that parent or
its own localities, and no other jurisdiction competes. All listed canonical
areas are serviceable; this is service-area recognition, not a dispatch address.
Explicit 송파동 still resolves to 서울 송파구 송파동.

Actual response to 송파 가능한가요?, 지역 송파?, 송파지역 출장가능?:

> 서울 송파구 말씀하시는 거죠?
> 출장 교체 가능 지역입니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.

Actual 시흥 response:

> 같은 이름의 지역이 여러 곳이에요.
> 서울 금천구 시흥동 / 경기 성남시 수정구 시흥동 / 경기 시흥시 중 어디인가요?

After 경기도, only 경기 성남시 수정구 시흥동 / 경기 시흥시 remain.
시흥시 resolves directly; 아니 서울 시흥동이야 replaces the prior scope.
The response never promises current dispatch or an arrival time.

Generated tests: 1,330 canonical fullName/fullLabel phrases; 11,980 safe alias
phrases (2,396 x 5 wrappers); 365 ambiguous phrases (73 x 5); 27 unsafe stems.
Every safe alias also goes through the full conversation and customer-copy checks.
Canonical and safe alias coverage: 100%; tested false unsupported and ambiguous
auto-confirm counts: 0. Unsupported-place negative cases are tested separately.

## Canonical vehicle audit and fixes

Source: data/manufacturers.json plus data/audi.json, benz.json, bmw.json,
chevrolet.json, ford.json, genesis.json, hyundai.json, jeep.json, kgm.json,
kia.json, landrover.json, mini.json, renault.json, volkswagen.json, volvo.json.
917 rows / 15 manufacturers / 184 unique families / 470 manufacturer-specific
detail-model identities. Rows also carry year range, fuel, default/upgrade battery.

Before: BMW shorthand was a brand-specific regular expression. Mercedes classes
had no equivalent. Seven complete BMW series names were explicitly rejected;
Hyundai 제네시스 was mistaken for the Genesis manufacturer (8 family defects).
Specific 제네시스 DH / 더 뉴 제네시스 쿠페 / 제네시스 쿠페 had the same issue.

Now: canonical specific-model index, existing approved model aliases, canonical
class/series suffix composition, and complete family inputs share the resolver.
Specific models precede family shorthand even when both are in one utterance.
BMW520d stays exact. The six V4 spelling aliases retain collision/missing-target
protection. Only the V4 expectation rejecting the complete name 5시리즈 was
intentionally changed; bare 5 / 4 / e / BMW52 remain rejection tests.

Family alias index: 2,000 entries / 1,734 distinct aliases / 6 approved spelling
aliases / 1,810 generated entries / 0 real collisions. All 184 canonical families
are unique. 24 class/series stems are composed with manufacturer context (17
Mercedes classes, 7 BMW series). Bare C/E/3/5 do not globally select a vehicle.
Synthetic family and class collisions explicitly assert multiple candidates.

All 184 families are tested through exact name, no-space normalization,
manufacturer spellings, available approved spelling aliases, and class stems:
1,052 phrases, 854 direct / 198 confirmation / 0 real-data disambiguation.
470 detail models x bare/branded forms = 940 additional phrases, all recognized.

Mercedes: 벤츠C -> 맞아 -> 2020년식 returns AGM80. 벤츠C -> 아니 E retains
Mercedes context and asks to confirm E-클래스. Mixed known year is not asked again.
Year digits can no longer become a fake C202/E202 model in the V5 saved transcript;
the browser reload and permanent safeUserMessage regression tests cover this.

Trax: ONE family, FIVE rows, THREE details:

- 트랙스, 2013–2016: gasoline DIN60L, diesel DIN74L (AGM70 upgrade).
- 더 뉴 트랙스, 2016–2022: gasoline DIN60L, diesel DIN74L (AGM70 upgrade).
- 트랙스 크로스오버, 2023–current: gasoline AGM70.

The family name no longer selects the identically named old detail prematurely.
트랙스 asks year; 트랙스 2018년식 asks fuel; gasoline/diesel return canonical
DIN60L/DIN74L. 아니 트랙스 크로스오버 selects that actual detail and retains
region/symptom context. Invented variants: 0 in the test matrix.

## Final automated verification

- test:smart-consult: 110 assertions PASS.
- test:smart-consult-conversation: 3,412 assertions PASS.
- test:smart-consult-nlu-v4: 989 assertions PASS.
- test:smart-consult-v5: 4,112 assertions PASS, 427 protected pages, nine negative mutations.
- test:smart-consult-v7: 39,642 assertions PASS.
- audit:sitemap-stability: 1,133 URLs PASS, no-write/metadata/fixture checks PASS.
- audit:sitewide-service: 647 area + 488 non-area pages PASS; FAQ mismatch 0.
- audit:area-service: 647 pages PASS.
- audit:blog-sync-regression: 345 posts, broken links 0, canonical changes 0,
  historical loss 0; 443 car-battery / 647 area / 19 battery / 18 work-case pages PASS.
- audit:work-cases: 345 rendered cases, 18 pages PASS. No consultation integration.
- indexnow:dry-run: SKIPPED_NO_CHANGE, submitted URLs 0, no network submission.
- XSS: automated suites and real browser text input PASS; injected onerror elements 0.
- git diff --check: PASS.

## Real-browser verification

The agent-browser skill workflow was applied using available CUA browser control;
agent-browser CLI is not installed. Local static preview at 127.0.0.1:4173.
No UI/HTML/CSS redesign; actual screenshot checks at 390x780 and 1280x900.
All cases below were entered into the real textbox with Enter, without option
buttons, and bot DOM output checked. The full 42-case matrix was rerun on final code.

| ID | Input sequence | Both sizes |
| --- | --- | --- |
| A1 | 송파 가능한가요? | PASS |
| A2 | 지역 송파? | PASS |
| A3 | 송파지역 출장가능? | PASS |
| A4 | 송파동 가능? | PASS |
| A5 | 영등포 가능? | PASS |
| A6 | 동작지역 출장돼? | PASS |
| A7 | 시흥 출장돼? | PASS |
| A8 | 경기도 -> 시흥은? | PASS |
| A9 | 경기도 시흥시 출장가능? | PASS |
| A10 | 경기도 -> 시흥시 -> 아니 서울 시흥동이야 | PASS |
| A11 | 인천 송도 가능해? | PASS |
| V1 | 벤츠C -> 맞아 -> 2020년식 | PASS |
| V2 | 벤츠E 2021년식 | PASS |
| V3 | 벤츠C -> 아니 E | PASS |
| V4 | 트랙스 | PASS |
| V5 | 트랙스 2018년식 | PASS |
| V6 | BMW3 | PASS |
| V7 | BMW520d | PASS |
| V8 | 아우디A6 2021 | PASS: canonical 고객센터문의 |
| V9 | 소나타 2020년식 | PASS |
| V10 | 벤츠C 2020년식인데 송파 가능? | PASS |

An initial browser expectation of AGM95 for Audi A6 2021 was corrected against
the actual C8 rows (고객센터문의); production data/code was NOT changed to satisfy it.
The rendered summary correctly retains 아우디 A6 / 2021년식.

Twelve additional real-browser family inputs across twelve other brands passed:
스파크, 레인저, EQ900, 그랜저, 랭글러, 렉스턴, 카니발, 디스커버리 스포츠,
쿠퍼, QM6, CC, C30. Summary labels were checked, not inferred from user bubbles.
Mixed Benz C/2020/Songpa -> 맞아 -> reload retained all known fields and AGM80.
Warnings/errors: 0 observed. Consult resources were same-origin static files;
external AI API requests 0 and work-case requests 0.

Within the tested matrix: supported-area false negatives, wrong ambiguity prompts,
context loss, known-info re-questioning, safe-family no-match, wrong auto-confirm,
hallucinated area/vehicle, and required option-button clicks were all 0.
This is a finite canonical/phrase test matrix, not an unrestricted-language guarantee.

## Preservation and owner handoff

Compared with e71c422e, canonical source data, derived data, all generated HTML,
thumbnails/assets, sitemap, smart-consult/index.html and css/smart-consult.css are
unchanged. The remote blog-sync merge and V1–V5 commit history remain intact.
No external AI, work-case hookup, production push, or history rewriting.
Owner should inspect 송파 / 시흥 / 벤츠C / 트랙스 locally before authorizing deployment.
