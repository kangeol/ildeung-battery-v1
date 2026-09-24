# Blog sync and battery knowledge audit

Task: ILDEUNG_BLOG_REMOTE_MOVEMENT_AUDIT_FAST_FORWARD_AND_KNOWLEDGE_RESUME_V1
Date: 2026-09-24. Local implementation only; PUSH=NO, DEPLOY=NO.

## Remote baseline and automation

Initial main: 90b778854867816f317eced828862fccf99a93db.
Fetched and actual remote: 821b74e95cf1b5ffac0503ebbbb9fa060d78c7b7.
Initial ahead/behind 0/2, clean worktree/index, no untracked files.

| Commit | Parent | Message | UTC author/commit time |
|---|---|---|---|
| a463eddbe4e27d62644b86c807cef357d98e6a8b | 90b778854867816f317eced828862fccf99a93db | Sync Naver blog work cases | 2026-09-23T14:21:53Z |
| 821b74e95cf1b5ffac0503ebbbb9fa060d78c7b7 | a463eddbe4e27d62644b86c807cef357d98e6a8b | Sync Naver blog work cases | 2026-09-23T14:50:08Z |

Both author and committer: github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>.
Linear normal ancestry; no replaced commits.
Existing unchanged workflow: .github/workflows/naver-blog-sync.yml.
Verified successful workflow logs:
- https://github.com/kangeol/ildeung-battery-v1/actions/runs/35873555929 — source 90b7788, 346 merged / 1 new post, audits PASS, created/pushed a463edd.
- https://github.com/kangeol/ildeung-battery-v1/actions/runs/35877037529 — source a463edd, 346 merged / 0 new posts, audits PASS, created/pushed 821b74e.

Workflow generated-file allowlist and actual logged commit/push establish automation provenance, not author name alone.

## Complete first-commit file audit

43 files, 864 additions / 679 deletions; new WebP 11,100 bytes.
Generated HTML changes are blog-card/pagination refreshes except the three canonical factual regenerations listed below.

| File | + | - | Classification |
|---|---:|---:|---|
| area/gyeonggi/index.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| area/gyeonggi/seongnam-si.html | 15 | 1 | EXPECTED_GENERATED_CONTENT |
| area/gyeonggi/seongnam-si/taepyeong-dong.html | 25 | 0 | EXPECTED_GENERATED_CONTENT |
| area/index.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| assets/blog-cases/224416789571.webp | - | - | EXPECTED_BLOG_CONTENT |
| battery/agm/capacity/agm60.html | 7 | 0 | EXPECTED_GENERATED_CONTENT |
| battery/agm/capacity/agm80.html | 23 | 30 | EXPECTED_GENERATED_CONTENT |
| battery/agm/delkor.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/agm/index.html | 25 | 25 | EXPECTED_GENERATED_CONTENT |
| battery/agm/price.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/agm/varta.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/battery-discharge.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/battery-life.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/car-battery.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/delkor-battery.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/import-car-battery.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/index.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/mobile-replacement.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/price.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/replacement-cost.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| battery/replacement.html | 23 | 23 | EXPECTED_GENERATED_CONTENT |
| car-battery/benz.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| seo-data/blog-cases.json | 142 | 10 | EXPECTED_BLOG_INDEX_MANIFEST |
| seo-data/vehicle-detail-groups.json | 1 | 1 | EXPECTED_SYNC_METADATA |
| work-cases/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/10/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/11/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/12/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/13/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/14/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/15/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/16/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/17/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/18/index.html | 14 | 0 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/2/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/3/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/4/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/5/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/6/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/7/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/8/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |
| work-cases/page/9/index.html | 14 | 14 | EXPECTED_GENERATED_CONTENT |

Second commit: ONLY seo-data/blog-cases.json, +4/-4, EXPECTED_SYNC_METADATA.
It changes syncedAt and statistics (newPosts 1→0, preservedPreviousPosts 345→346, duplicateRemoved 49→50). Posts remain identical to the first commit.

Expected factual regenerations already supported by unchanged canonical vehicle data:
- battery/agm/capacity/agm60.html: restores Santa Fe TM 20–23 hybrid AGM60 row.
- battery/agm/capacity/agm80.html: removes obsolete GN7 gasoline 3.3 AGM80 row; canonical source already corrected to 3.5 / confirmation required.
- battery/agm/index.html: AGM60 count 38→39; AGM80 count 210→209.
No newly invented vehicle facts. seo-data/vehicle-detail-groups.json changes generatedAt only.
Protected unexpected source/UI/policy/deployment/SEO changes: 0.

## Counts and consistency

| Inventory | Before | After | Delta |
|---|---:|---:|---:|
| Blog posts | 345 | 346 | +1 |
| Sitemap URLs | 1133 | 1133 | 0 |
| Vehicle rows | 917 | 917 | 0 |
| Service areas | 665 | 665 | 0 |

New post ID: 224416789571. No existing post removed; duplicate IDs/URLs 0.
Blog audit: invalid URLs/dates, missing thumbnails, unsafe/empty summaries = 0.
Work-case audit: 346 source/unique/rendered posts, 18 pages, latest six homepage cards and order correct.
Sitemap URL set identical, 18 work-case page URLs, no external Naver URLs.
After stripping expected card rotations and the three exact factual regenerations, remaining protected HTML differences = 0.
Homepage H1/support remain:
- 서울·경기·인천 출장 자동차 배터리 교체
- 국산차·수입차 전 차종 배터리 출장 교체

git merge --ff-only origin/main succeeded without a merge commit.
New knowledge baseline: 821b74e95cf1b5ffac0503ebbbb9fa060d78c7b7.
After fast-forward local/origin/actual remote equal; ahead/behind 0/0 and clean.

## Pre-fix knowledge audit

59 recorded turns: 36 direct questions and 23 session turns.
Direct classification:
- PASS_EXISTING: 5
- FITMENT_OVERCLAIM: 3 (CCA expanded to Volkswagen CC and quoted AGM70)
- WRONG_INTENT: 2 (black-box discharge routed to BLACK product; new-battery discharge routed to authenticity)
- KNOWLEDGE_MISSING: 26

Short follow-ups also lost knowledge topic. These findings, not a new vehicle database, define the repair.

## Narrow architecture and authority boundary

js/smart-consult-battery-knowledge.js owns educational copy and topic recognition.
Conversation integration preserves existing vehicle, area, brand, price and session facts; technical CCA/Ah tokens cannot become vehicle aliases.
Session sanitization saves a safe knowledge label, not fabricated vehicle identity or unrestricted raw customer text.
No UI/presentation, canonical vehicle/area/price/brand/service policy data changes.

Canonical vehicle/product data supplies no verified vehicle-specific coding requirement, required CCA measurement or exact AGM95 Ah authority.
Therefore AGM95 suffix is not certified as 95Ah. BMW/Benz/Audi brand alone never proves coding requirement.
Existing service-policy source remains the sole coding-fee authority: when required during replacement, coding is included without separate fee.
Standalone coding-service availability/price is not invented.

## Exact direct browser responses (390px; also checked at 1440px)

### 배터리 갈아야 하나요?

증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.

### 교체해야 돼요?

증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.

### 아직 쓸 수 있나요?

증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.

### 교체시기인가요?

증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.

### 점프하면 그냥 써도 돼요?

점프로 시동이 걸렸다고 배터리가 정상이라고 확정하거나 반드시 교체해야 한다고 판단할 수는 없습니다. 한 번의 방전만으로 교체를 결정하지 말고, 반복되면 배터리 상태와 방전·충전 원인을 함께 점검해 주세요.

### 한번 방전됐는데 바꿔야 하나요?

점프로 시동이 걸렸다고 배터리가 정상이라고 확정하거나 반드시 교체해야 한다고 판단할 수는 없습니다. 한 번의 방전만으로 교체를 결정하지 말고, 반복되면 배터리 상태와 방전·충전 원인을 함께 점검해 주세요.

### 두번 방전됐어요?

점프로 시동이 걸렸다고 배터리가 정상이라고 확정하거나 반드시 교체해야 한다고 판단할 수는 없습니다. 한 번의 방전만으로 교체를 결정하지 말고, 반복되면 배터리 상태와 방전·충전 원인을 함께 점검해 주세요.

### 시동만 걸리면 괜찮은 거죠?

증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.

### 왜 자꾸 방전돼요?

방전은 배터리 상태·노후, 장기주차나 주행 부족, 블랙박스 등 전기 사용, 충전·전기 계통 문제 등 여러 요인과 관련될 수 있습니다. 한 가지 원인으로 단정하지 말고 사용환경과 차량 상태를 함께 점검해 주세요.

### 블랙박스 때문인가요?

방전은 배터리 상태·노후, 장기주차나 주행 부족, 블랙박스 등 전기 사용, 충전·전기 계통 문제 등 여러 요인과 관련될 수 있습니다. 한 가지 원인으로 단정하지 말고 사용환경과 차량 상태를 함께 점검해 주세요.

### 며칠 세워두면 방전되나요?

방전은 배터리 상태·노후, 장기주차나 주행 부족, 블랙박스 등 전기 사용, 충전·전기 계통 문제 등 여러 요인과 관련될 수 있습니다. 한 가지 원인으로 단정하지 말고 사용환경과 차량 상태를 함께 점검해 주세요.

### 장기주차하면?

방전은 배터리 상태·노후, 장기주차나 주행 부족, 블랙박스 등 전기 사용, 충전·전기 계통 문제 등 여러 요인과 관련될 수 있습니다. 한 가지 원인으로 단정하지 말고 사용환경과 차량 상태를 함께 점검해 주세요.

### 새 배터리도 방전돼요?

새 배터리도 주차 기간, 전기 사용량이나 충전 상태에 따라 방전될 수 있습니다. 교체나 점프 후 다시 방전됐다면 곧바로 재교체를 결정하기보다 배터리 상태와 충전·전기 계통, 사용환경을 함께 확인해야 합니다.

### 교체했는데 또 방전됐어요?

새 배터리도 주차 기간, 전기 사용량이나 충전 상태에 따라 방전될 수 있습니다. 교체나 점프 후 다시 방전됐다면 곧바로 재교체를 결정하기보다 배터리 상태와 충전·전기 계통, 사용환경을 함께 확인해야 합니다.

### 점프했는데 또 방전됐어요?

새 배터리도 주차 기간, 전기 사용량이나 충전 상태에 따라 방전될 수 있습니다. 교체나 점프 후 다시 방전됐다면 곧바로 재교체를 결정하기보다 배터리 상태와 충전·전기 계통, 사용환경을 함께 확인해야 합니다.

### 추우면?

추운 환경에서는 배터리의 시동 성능이 약해질 수 있습니다. 추위만으로 고장을 단정할 수는 없으니 시동 상태와 충전 상태를 함께 확인해 주세요.

### 겨울에 약해지나요?

추운 환경에서는 배터리의 시동 성능이 약해질 수 있습니다. 추위만으로 고장을 단정할 수는 없으니 시동 상태와 충전 상태를 함께 확인해 주세요.

### 방전 안 되게 하려면?

방전은 배터리 상태·노후, 장기주차나 주행 부족, 블랙박스 등 전기 사용, 충전·전기 계통 문제 등 여러 요인과 관련될 수 있습니다. 한 가지 원인으로 단정하지 말고 사용환경과 차량 상태를 함께 점검해 주세요.

장기주차와 짧은 주행이 반복될 때는 충전 상태를 확인하고, 블랙박스 등 주차 중 전기 사용을 차량·기기 안내에 맞게 관리해 주세요. 주기적인 상태 점검이 도움이 되지만 방전을 완전히 예방한다고 보장할 수는 없습니다.

### CCA가 뭐예요?

CCA는 Cold Cranking Amps의 약자로, 추운 조건에서 시동 전류를 공급하는 능력과 관련된 지표입니다. 숫자가 높다고 무조건 더 좋거나 내 차에 맞는 것은 아니며 차량 지정 규격과 제품 정보를 확인해야 합니다.

### CCA 높으면 좋은가요?

CCA는 Cold Cranking Amps의 약자로, 추운 조건에서 시동 전류를 공급하는 능력과 관련된 지표입니다. 숫자가 높다고 무조건 더 좋거나 내 차에 맞는 것은 아니며 차량 지정 규격과 제품 정보를 확인해야 합니다.

### CCA 몇이어야 돼요?

필요한 CCA 값은 차량별 지정 규격을 확인해야 하며 여기서 숫자를 추정할 수 없습니다. 차량명·연식·세부 모델과 제품 정보를 확인한 뒤 안내받아 주세요.

### Ah가 뭐예요?

Ah(암페어아워)는 배터리의 전하 저장 용량을 나타내는 정격 단위입니다. 실제 사용시간이나 수명은 사용량·환경에 따라 달라지므로 용량 숫자만으로 보장할 수 없고, 큰 용량이 무조건 더 좋거나 적합한 것도 아닙니다.

### 80Ah가 뭐예요?

Ah(암페어아워)는 배터리의 전하 저장 용량을 나타내는 정격 단위입니다. 실제 사용시간이나 수명은 사용량·환경에 따라 달라지므로 용량 숫자만으로 보장할 수 없고, 큰 용량이 무조건 더 좋거나 적합한 것도 아닙니다.

### AGM95에서 95가 용량이에요?

AGM95의 숫자만으로 정확히 95Ah라고 확정하지 않겠습니다. 현재 상담 자료에는 해당 제품의 Ah를 증명하는 사양 정보가 없어 실제 제품 라벨이나 제조사 사양 확인이 필요합니다.

### 용량 큰 게 좋은가요?

Ah(암페어아워)는 배터리의 전하 저장 용량을 나타내는 정격 단위입니다. 실제 사용시간이나 수명은 사용량·환경에 따라 달라지므로 용량 숫자만으로 보장할 수 없고, 큰 용량이 무조건 더 좋거나 적합한 것도 아닙니다.

### 큰 용량 넣으면 더 오래 써요?

Ah(암페어아워)는 배터리의 전하 저장 용량을 나타내는 정격 단위입니다. 실제 사용시간이나 수명은 사용량·환경에 따라 달라지므로 용량 숫자만으로 보장할 수 없고, 큰 용량이 무조건 더 좋거나 적합한 것도 아닙니다.

### 코딩이 뭐예요?

일부 차량은 배터리·에너지 관리 시스템이 교체 사실을 인식하도록 등록·리셋·코딩 관련 작업이 필요할 수 있습니다. 모든 차량에 필요한 것은 아니며 브랜드만으로 필요 여부를 판단하지 않습니다.

코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.

### 배터리 등록이 뭐예요?

일부 차량은 배터리·에너지 관리 시스템이 교체 사실을 인식하도록 등록·리셋·코딩 관련 작업이 필요할 수 있습니다. 모든 차량에 필요한 것은 아니며 브랜드만으로 필요 여부를 판단하지 않습니다.

코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.

### 코딩 왜 해요?

일부 차량은 배터리·에너지 관리 시스템이 교체 사실을 인식하도록 등록·리셋·코딩 관련 작업이 필요할 수 있습니다. 모든 차량에 필요한 것은 아니며 브랜드만으로 필요 여부를 판단하지 않습니다.

코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.

### 코딩 꼭 해야 돼요?

일부 차량은 배터리·에너지 관리 시스템이 교체 사실을 인식하도록 등록·리셋·코딩 관련 작업이 필요할 수 있습니다. 모든 차량에 필요한 것은 아니며 브랜드만으로 필요 여부를 판단하지 않습니다.

코딩 필요 여부는 브랜드만으로 확정할 수 없습니다. 정확한 모델·연식·배터리 규격과 차량별 작업 기준 확인이 필요하며, 현재 상담 자료만으로 고객님 차량의 필요 여부를 확정하지 않습니다.

코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.

### 모든 차 코딩해야 돼요?

일부 차량은 배터리·에너지 관리 시스템이 교체 사실을 인식하도록 등록·리셋·코딩 관련 작업이 필요할 수 있습니다. 모든 차량에 필요한 것은 아니며 브랜드만으로 필요 여부를 판단하지 않습니다.

코딩 필요 여부는 브랜드만으로 확정할 수 없습니다. 정확한 모델·연식·배터리 규격과 차량별 작업 기준 확인이 필요하며, 현재 상담 자료만으로 고객님 차량의 필요 여부를 확정하지 않습니다.

코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.

### BMW는 코딩하나요?

일부 차량은 배터리·에너지 관리 시스템이 교체 사실을 인식하도록 등록·리셋·코딩 관련 작업이 필요할 수 있습니다. 모든 차량에 필요한 것은 아니며 브랜드만으로 필요 여부를 판단하지 않습니다.

코딩 필요 여부는 브랜드만으로 확정할 수 없습니다. 정확한 모델·연식·배터리 규격과 차량별 작업 기준 확인이 필요하며, 현재 상담 자료만으로 고객님 차량의 필요 여부를 확정하지 않습니다.

코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.

### 벤츠는?

벤츠 어떤 차종이세요? A-클래스, B-클래스, C-클래스처럼 알려주세요.

### 아우디는?

아우디 어떤 차종이세요? A1, A3, A4처럼 알려주세요.

### 코딩 비용 얼마예요?

코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.

### 코딩비 따로예요?

코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.

## Verification evidence

Focused deterministic tests: 247 turns. Required counters:
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

Actual local browser: 1440px and 390px, 78 total turns per viewport, including six A7/G80/G90 candidate-button clicks.
All candidate buttons preserve exact selected identity and governed battery/confirmation result; no loop, lost selection, or wrong row.
Knowledge sessions include CCA follow-up, capacity fitment boundary, repeated discharge, BMW coding, Benz/Audi follow-up and combined fee/payment questions.
No horizontal overflow in the browser checks.

External raw evidence (not generated into tracked production files):
- C:/Users/kang1/AppData/Local/Temp/knowledge-remote-audit.json
- C:/Users/kang1/AppData/Local/Temp/battery-knowledge-before.json
- C:/Users/kang1/AppData/Local/Temp/battery-knowledge-focused.json
- C:/Users/kang1/AppData/Local/Temp/battery-knowledge-browser/browser-1440.json
- C:/Users/kang1/AppData/Local/Temp/battery-knowledge-browser/browser-390.json
- C:/Users/kang1/AppData/Local/Temp/battery-knowledge-browser/browser-1440.png
- C:/Users/kang1/AppData/Local/Temp/battery-knowledge-browser/browser-390.png
- C:/Users/kang1/AppData/Local/Temp/knowledge-final-regression/

Historical regression freeze baselines now recognize ONLY the exact audited remote files. The helper asserts those files still equal 821b74e (text line endings normalized, binary byte equality); no arbitrary HTML exemption.
Knowledge changes must leave blog 346 / sitemap 1133 and all protected content unchanged.

## Regression details and changed-file scope

Manufacturer wording 3547, Owner non-AGM policy 215, brand query 881, purchase/product 224, brand comparison 625, operational FAQ 1602, authentic/manufacture/cash 581, standalone spec 178, spec/schedule 2696, safety 119, collision 564: PASS.
Mass selection: 499 groups / 1277 buttons; 1273 exact results and four governed no-match results. Repeated ambiguity / wrong row / lost year-generation / unsupported / other failures: all 0. Selection context: 33 turns PASS.
Vehicle certainty: 3668 staged-knowledge simulations, wrong recommendations 0, ambiguous recommendations prevented 877.
Area polite-ending matrix: 16908 cases (11970 canonical, 4938 alias), all area counters 0.
Initial 20-suite run passed 17 tests; three launcher/branding/viewport tests still used pre-blog-sync HTML snapshots. Exact audited-sync equality was applied to launcher/branding historical snapshot comparisons. All launcher structure, label, viewport, scroll, security and CTA assertions remain active. These three then passed individually. No production code/UI was changed to accommodate these tests.
Final complete 20-test rerun: 20 PASS / 0 failed (knowledge-final-regression/final-full-results.json). Presentation/UI scope recheck: 314 checks PASS. Staged diff check PASS; no unapproved repository outputs remain.

Actual candidate-button outcomes on BOTH viewports:
- A7 2018–current (4K): phone confirmation; A7 2010–2017: AGM105 / DELKOR 28만원.
- G80 2020–current (RG3): AGM95R / DELKOR 24만원; G80 2016–2020: AGM105 / DELKOR 28만원.
- G90 2021–current (RS4): phone confirmation; G90 2018–2021: AGM105 / DELKOR 28만원.
All exact range/context checks pass; no selection loop or wrong row.

Exact knowledge-commit files:
- js/smart-consult-battery-knowledge.js
- js/smart-consult-conversation.js
- js/smart-consult-session.js
- tools/audit-battery-knowledge.js
- tools/lib/battery-knowledge-fixtures.js
- tools/lib/blog-sync-approved-freeze.js
- tools/lib/homepage-approved-freeze.js
- tools/test-battery-certainty-scope.js
- tools/test-battery-knowledge-browser.js
- tools/test-battery-knowledge.js
- tools/test-battery-pricing.js
- tools/test-brand-service.js
- tools/test-consult-presentation.js
- tools/test-location-nlu.js
- tools/test-product-as-hours.js
- tools/test-smart-consult-branding.js
- tools/test-smart-consult-launcher.js
- tools/test-spec-brand-query.js
- tools/test-spec-schedule-safety.js
- docs/battery-knowledge-audit.md

New baseline comparison for HTML, CSS, data, seo-data, sitemap, assets and workflow files: zero changed files. Existing homepage/consult presentation and SEO/GEO content are unchanged by this knowledge commit.
