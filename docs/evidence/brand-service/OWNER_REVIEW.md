# AGM brand and included-service predeploy review

Task: ILDEUNG_AI_CONSULT_AGM_BRAND_AND_SERVICE_INCLUSION_POLICY_V1

## Baseline / scope

Fetched origin; main HEAD 4b7ce6fbb2f0747e05a56bac96a54fc637a56322, origin/main da2e2c0f93e119d82123e5d63b868e30195c00b6, ahead/behind 1/0, clean at start. No remote-only commits or merge required. Previous commits preserved. No push or deployment.

## Canonical sources

data/battery-prices.json remains the only runtime monetary source. Existing 26 prices, normalization aliases and DIN70L unpriced designation are unchanged. defaultAgmBrand is DELKOR; DELKOR references the AGM base prices instead of copying them. DF/DIN/65-900 have no default brand assignment.

| AGM | DELKOR KRW | VARTA KRW |
| --- | ---: | ---: |
| AGM60 | 155000 | unsupported |
| AGM70 | 170000 | 220000 |
| AGM80 | 190000 | 240000 |
| AGM80R | 220000 | unsupported |
| AGM95 | 220000 | 270000 |
| AGM95R | 240000 | unsupported |
| AGM105 | 280000 | 330000 |

The four VARTA prices are stored explicitly. Tests independently check +50000; runtime never derives them by adding a surcharge. VARTA AGM95 270000 is newly authorized and does not restore the obsolete AGM105 270000 price. Unsupported VARTA requests receive supported-size information, no numeric replacement price. DELKOR brand requests outside AGM do not invent a brand-specific price.

data/consult-service-policy.json is the only runtime source for included-service facts, detailed answers and first-price summary. It contains exactly the six Owner-approved flags: mobile service included, labor included, old battery collection required, necessary coding free, basic inspection free, no onsite surcharge when quoted conditions are unchanged. The renderer and intent classifier contain no copies of those policy answers. Test fixtures are independent acceptance evidence, not runtime truth.

## Conversation integration

- DELKOR/VARTA Korean and Latin aliases, case and whitespace variants, attached 배터리 supported. Last named brand handles 델코 말고 바르타.
- AGM quotes identify 델코 기준 by default. Explicit VARTA/DELKOR intent is remembered across price, service and area turns.
- quotedSpec is separate from confirmedBattery: direct product questions and MINI alternatives never falsely establish vehicle fitment.
- MINI AGM70/AGM80 retains both alternatives: DELKOR 17/19만원; VARTA 22/24만원; existing-battery/on-site confirmation always remains.
- A changed vehicle/year invalidates quotedSpec and recalculates candidates. Brand preference survives but cannot override battery uncertainty.
- Fully specified canonical manufacturer + vehicle + year no longer triggers an unnecessary shorthand confirmation. Candidate certainty rules remain in force, including overlapping generations. This is generic, not BMW hardcoding.
- A concise policy summary accompanies the first monetary quote only. Detailed policy questions read the appropriate canonical answer. Old-battery retention requests require telephone confirmation without an invented difference or fee.
- Session schema 3 stores brand, quotedSpec and summary status. Safe schema-2 sessions migrate with empty brand fields and their previously confirmed spec; withdrawn schema-1 sessions remain rejected. Entry/session module cache versions updated consistently.

## Exact policy answers tested

- 출장: 별도 출장비는 없습니다. 안내드린 가격에 출장교체비용이 포함되어 있습니다.
- 공임: 교체 공임이 포함된 가격이라 별도 공임비는 없습니다.
- 폐배터리: 안내드린 가격은 기존 폐배터리 수거 조건입니다. 교체 후 기존 배터리는 수거합니다.
- 코딩: 코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.
- 기본점검: 배터리 교체 시 기본점검도 무료로 진행합니다.
- 현장 추가비: 안내드린 차량·규격·조건 그대로 교체하는 경우 현장에서 별도 추가비용은 없습니다.
- 전체: 안내드린 교체 가격에는 출장교체비용과 공임이 포함되어 있고, 코딩이 필요한 차량은 코딩비도 별도로 받지 않습니다. 기본점검은 무료이며, 기존 폐배터리 수거 조건입니다. 안내된 조건으로 정상 교체 시 현장 추가비용은 없습니다.
- 보관 예외: 안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.

No promises of arrival time, universal coding, invented inspection items, exceptional work or invented surcharge amounts.

## Tests / evidence

brand-service.json: Owner fixtures; 153 recorded turns; 39 service phrases tested fresh and with integrated context; 917 rows x three brand states = 2751 canonical cases. DELKOR/VARTA wrong prices, unsupported VARTA numeric prices, lost brand context, composite single confirmation, wrong/unsupported service claims, fabricated surcharge/price and duplicated runtime truth all zero. Prior price map and all manufacturer files compared against 4b7ce6fb.

pricing.json: prior 26-price acceptance plus 3668 vehicle-stage cases, all pass. simulation.json: prior universal certainty checks, 3668 stages, 877 ambiguous cases prevented, wrong battery/ambiguous auto-confirm/unknown override zero. matrix.json: 665 areas, 608 neighborhoods, 6650 short-name plus 6650 qualified-name cases, 219 collision cases, 917 question loops; wrong/ambiguous/no-space failures zero. Historical evidence files were not overwritten.

Regression PASS: smart-consult 110 assertions, conversation 3254, NLU V4 989, V5 4112, V7 39636 plus 470-model coverage, viewport, launcher, branding, certainty scope, sitemap stability, sitewide service, blog-sync, work-case audit. V5's invalid-version fixture was updated to explicitly construct version 1 instead of replacing a hardcoded version 2 string; its rejection guarantee remains tested.

SEO: zero generated vehicle/area HTML changes. Only smart-consult/index.html module cache version price-v1 -> brand-v1 changes. No title/H1/meta/canonical/schema or SEO body changes. 1133 sitemap URLs preserved, 345 blog posts preserved, historical loss 0. 1114 launchers and 427 vehicle contexts preserved. Phone and DIN/AGM store hrefs unchanged. Existing XSS, recovery, correction and session tests pass; no AI API or work-case integration added.

## Browser UAT

Local preview, agent-browser skill, desktop 1440px and mobile viewport 390px. All 26 UI turns passed; browser.json records each exact assistant answer for the eight requested conversations. Both screenshots visually inspected. Representative strings:

- AGM95 델코 기준 교체 가격은 22만원입니다.
- AGM95 바르타 기준 교체 가격은 27만원입니다.
- AGM105 바르타 기준 교체 가격은 33만원입니다.
- 현재 바르타 AGM은 AGM70·AGM80·AGM95·AGM105 규격을 안내하고 있습니다. AGM60는 바르타 판매 지원 규격이 아닙니다.
- MINI: both component prices plus 정확한 규격은 현재 장착된 배터리를 현장에서 확인해야 합니다.
- Integrated 구월동 BMW 5시리즈 2020: region announcement, AGM95 VARTA 27만원, first-price inclusion summary; subsequent 출장비 question retains context.

Mobile focus was chatInput; body scroll remained 0 after scroll; messages pane scrollable; composer bottom 819.5 within viewport height 844; horizontal overflow false; consultation launcher count 0. Reload restored the integrated BMW/2020/구월동 context; subsequent 바르타로 하면? still returned AGM95 VARTA 27만원 without re-questioning. Mobile viewport checks are browser emulation, not physical-phone keyboard certification. No production changes are claimed.

## Review / deployment boundary

DIN70L still requires price confirmation. GN7 3.5 remains unresolved; no new canonical vehicle corrections. VARTA is limited to the four Owner-supported sizes. All other pending data reviews remain unchanged.

Browser and regression gates passed. New commit only; PUSH = NO. State: AI_CONSULT_AGM_BRAND_SERVICE_POLICY_PREDEPLOY_READY.
