# GN7 / canonical battery certainty — predeployment review

Date: 2026-09-22. Baseline main/origin/main: `667b555971603325a4504b6f6e74bd282317c939`, ahead/behind 0/0, clean worktree and index. No production push is authorized by this task.

## Evidence and authority

- Hyundai Motor Group launch announcement, 2022-11-14: https://www.hyundaimotorgroup.com/ko/story/CONT0000000000064705 — GN7 gasoline 2.5 / gasoline 3.5 / LPG 3.5 / hybrid 1.6. No gasoline 3.3 in the official launch lineup. High confidence for this powertrain correction, not battery fitment.
- Hyundai GN7 2026 owner manual battery section: https://ownersmanual.hyundai.com/full_webhelp/GN7/2026/ko_KR/id29e0f44e341.html — does not establish an exact engine-to-battery mapping.
- Hankook AtlasBX 2023 fitment leaflet: https://cdn.hankook-atlasbx.com/PRD/CUSTOMER/20230405/450e1cdb-4f4c-4a13-b9b9-61e60fa13dd6/HK_AGM_Leaflet_210x297mm_0329.pdf — GN7(ISG) appears under BOTH AGM70DL and AGM80DL, without the necessary exact engine/year conditions. This is conflicting/incomplete authority, not proof of either per-engine recommendation.
- Owner explicitly rejects unverified GN7 2023+ AGM80. No exact independently supported exception was found. Therefore all GN7 battery answers fail closed. This is not a claim that every physical GN7 battery has been independently certified.

## Exact canonical corrections

Indices are zero-based in data/hyundai.json. Status remains the existing workflow value 완료, not a fitment certificate.

| Index | Year / detail | Before fuel / battery | After fuel / battery | Action / confidence |
|---|---|---|---|---|
| 0 | 26년~현재 / 더 뉴 그랜저 (GN7) | LPG / 고객센터문의 | unchanged | KEEP; battery unresolved |
| 1 | 26년~현재 / 더 뉴 그랜저 (GN7) | 가솔린 / AGM70 | 가솔린 / 고객센터문의 | SET_CUSTOMER_CENTER_CONFIRMATION; exact authority insufficient |
| 2 | 22~26년 / 그랜저 (GN7) | LPG / AGM70 | LPG / 고객센터문의 | SET_CUSTOMER_CENTER_CONFIRMATION; exact authority insufficient |
| 3 | 22~26년 / 그랜저 (GN7) | 가솔린 2.5 / AGM70 | 가솔린 2.5 / 고객센터문의 | SET_CUSTOMER_CENTER_CONFIRMATION; exact authority insufficient |
| 4 | 22~26년 / 그랜저 (GN7) | 가솔린 3.3 / AGM80 | 가솔린 3.5 / 고객센터문의 | CORRECT_WITH_VERIFIED_VALUE for engine only; battery SET_CUSTOMER_CENTER_CONFIRMATION |

No guessed AGM70 replacement. No hybrid row invented. The 2026 facelift naming/range and engine-specific battery specifications still require authoritative review. LPG displacement is not silently rewritten. All five rows affect the existing Grandeur family and GN7 detail page; only four rows actually changed.

## Root cause

The old conversation `그랜저 GN7 2023년식` followed by `가솔린 3.3` narrowed to Hyundai index 4 and returned AGM80. Index 4 was the only GN7 AGM80 source. IG AGM80 rows remain valid *canonical entries* at indices 7, 10, 11 but their ranges end in 2022 or 2019; they do not match 2023. Full before/after Grandeur rows, including IG and HG, are in before.json and after.json.

The old resolver already asked questions for many differing battery signatures; it was not universally a first-row resolver. Remaining risks were the bad canonical row, treating generic fuel as an exact engine-row filter, accepting composite battery strings as an answer, and carrying prior results through follow-ups. These paths are now gated. Session format version 2 discards older saved transcripts; JSON fetch bypasses cache and runtime module URLs are versioned.

Year endpoints are inclusive. 20~23 and 23~현재 both match 2023. The existing HG gasoline `15년~` row remains open-ended and is in REVIEW_REQUIRED; consequently plain `그랜저 2023` asks GN7 versus HG instead of silently choosing. No IG leakage was found.

## Certainty rules and scope

Zero candidates => no-match/phone. A single usable default specification agreed by EVERY candidate => answer. Multiple specifications, unknown mixed with specific, a lone unknown, or composite/unsupported strings => no automatic answer. Upgrade specifications also require unanimous agreement, including empty values. Order reversal cannot choose a battery.

The next question partitions actual candidate values; it minimizes worst remaining battery diversity, then average diversity, then detail/year/fuel/engine/drive priority. A dimension is offered only if at least one branch reduces battery ambiguity. Missing engine/drive information in a row is not grounds to discard it. If no useful question exists, phone confirmation is required. There is no separate GN7 override table.

This guarantees consistency with the canonical candidates, NOT OEM correctness of every unchanged database fact. Non-GN7 engine-generation combinations have structural/lexical checks, not individual manufacturer-document verification.

## Complete inventory and matrix

15 manufacturer files, 917 rows, 184 manufacturer+vehicle families. The JSON inventory includes manufacturer, vehicle, year, fuel, detailModel, defaultBattery, upgradeBattery, status and file/index for every row.

| Knowledge stage | Row simulations | Safe | Ask | Manual/no-match |
|---|---:|---:|---:|---:|
| Vehicle only | 917 | 413 | 460 | 44 |
| Vehicle + representative year | 917 | 544 | 318 | 55 |
| Vehicle + year + exact canonical fuel | 917 | 750 | 100 | 67 |
| All canonical conditions | 917 | 834 | 0 | 83 |

112 distinct families can answer vehicle-only. At stage 2, 200 row scenarios require fuel/engine discrimination and 118 require detail; stage 3 has 100 requiring detail. Year questions compete with better discriminators rather than being compulsory. Stage samples use each row's start year; the separate exhaustive year sweep covers 3,404 family-years through 2027. Open ranges are not treated as ending in 2027.

57 families / 435 family-year instances contain different battery outputs. Classifications C1 fuel/engine, C2 generation/boundary, C3 detail, C4 unknown mixture, C5 unexplained are stored per instance. Overlap is not automatically a data defect.

Five duplicate groups, zero exact-condition/default-battery conflicts. REVIEW_REQUIRED contains 109 entries covering 114 distinct rows; reasons can overlap. It includes 31 composite/unrecognized battery entries, 52 manual-confirmation rows, 26 open-range overlaps, two suspicious fuel strings, five GN7 authority flags and five duplicate groups. Detailed exact rows are in REVIEW_REQUIRED.md. No speculative cleanup was performed.

## Simulation evidence

simulation.json: 3,668 structured stage cases, 917 full natural-language cases, 2,751 partial natural-language cases, 3,404 family-year checks. Wrong canonical battery recommendations 0, ambiguous auto-confirmations 0, unknown overrides 0. 878 ambiguous structured scenarios correctly withheld a recommendation; this is coverage, not a claim that all 878 were previous defects. Fully specified old answers decrease from 869 to 834: 31 composite/unrecognized entries and four withdrawn GN7 specifications.

## Generated-page / SEO impact

Only car-battery/hyundai/grandeur.html and car-battery/hyundai/grandeur/gn7.html changed as generated vehicle pages. Four GN7 battery table cells become 고객센터문의; the invalid engine label becomes 3.5. Data-derived battery-summary wording changes accordingly. GN7 FAQ answer text changes in both HTML and the corresponding JSON-LD answer; schema STRUCTURE is unchanged, not byte-identical FAQ text.

URLs, titles, H1s, canonicals, existing CTAs and floating launcher are unchanged. No unrelated SEO copy or blog content changes. smart-consult/index.html changes only its runtime script cache version. Exact factual-delta regression permits only these changes and continues rejecting SEO/schema/CTA mutations.

## Browser UAT

Local http://127.0.0.1:4173/smart-consult/; real Chromium through agent-browser, mobile 390x844 and desktop 1440x1000. All required inputs were submitted independently with reset; no horizontal overflow. Mobile and desktop screenshots were visually inspected. E-Class and BMW shorthand first ask family confirmation; after `네` they ask generation. Exact assistant response bodies follow (summary cards and phone links omitted).

- G1 `그랜저 GN7 2023년식`, G3 `그랜저 GN7 2024년식 가솔린 2.5`, G4 `그랜저 GN7 2024년식 가솔린 3.5`, G5 `그랜저 GN7 2024년식 LPG`: “이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요.”
- G2 `그랜저 2023년식`: “같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.\n2022~2026년형 · 그랜저 (GN7) / 2015~현재년형 · 그랜저 HG 중 어떤 차량인가요?”
- G6 `그랜저 2021년식`: “같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.\nLPG / 가솔린 2.5 / 가솔린 3.3 / 가솔린+전기 / 가솔린 중 어떤 차량인가요?” (3.3 here is IG, not GN7.)
- `벤츠 E클래스 2024년식` → “벤츠 E-클래스 말씀하시는 걸까요?” → `네` → “같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.\n2024~현재년형 · E-클래스 W214 / 2016~2024년형 · E-클래스 W213 중 어떤 차량인가요?”
- `BMW5 2023년식` → “BMW 5시리즈 말씀하시는 걸까요?” → `네` → “같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.\n2023~현재년형 · 5시리즈 (G60) / 2017~2023년형 · 5시리즈 (G30) 중 어떤 차량인가요?”
- `G70 2024년식`: “어떤 연료를 사용하는 차량인가요?” Choices 가솔린 / 디젤.
- `아반떼 2023년식`: “같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.\n2023~현재년형 · 더 뉴 아반떼 (CN7) / 2020~2023년형 · 아반떼 (CN7) 중 어떤 차량인가요?”
- `싼타페 2023년식`: “같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.\n2023~현재년형 · 싼타페 (MX5) / 2023~현재년형 · 싼타페 하이브리드 (MX5) / 2020~2023년형 · 더 뉴 싼타페 TM / 2020~2023년형 · 더 뉴 싼타페 하이브리드 TM 중 어떤 차량인가요?”

## Final regression results

PASS: test-smart-consult (110 assertions), test-smart-consult-conversation (3,246), test-smart-consult-nlu-v4 (989), test-smart-consult-v5 (4,112), test-smart-consult-v7 (917 rows / 470 detail models / 940 model phrases / 1,052 family phrases), test-smart-consult-viewport, test-smart-consult-launcher (1,114 included pages / 427 canonical vehicle pages), test-smart-consult-branding, test-battery-certainty, test-battery-certainty-scope, audit-sitemap-stability (1,133 URLs), audit-sitewide-service, audit-blog-sync-regression and audit-work-cases.

These include location, symptom, recovery/session, XSS, launcher/mobile-focus and SEO freeze checks. Blog regression: 345 historical posts, loss 0, URL/title changes 0. No work-case integration or external AI API was added. Historical branding/viewport scope assertions retain their original commit interval; the new certainty scope test separately checks all current changes against this task's baseline and exact approved generated-page deltas.

One preliminary sitemap stability run overlapped an intentional runtime source edit and correctly failed its live-file hash check. The final run, after source edits stopped, passed. No test failure was waived.

Production has NOT received these changes. Owner review of GN7 rows, REVIEW_REQUIRED ledger and conversation output is required before a separate push approval.
