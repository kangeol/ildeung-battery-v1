# Smart consultation V5 — predeploy QA

## Baseline and scope

- Audited baseline: `main`, `90eb274e2e7e5f06aadd3b15ac430ceeaf725969`, clean, origin/main behind 0 / ahead 4.
- V2 conversation and V4 canonical location / safe vehicle aliases retained.
- No external AI, work-case dependency, production push, deployment, history rewrite or DB modification.
- The HTML chat shell, header/footer, composer and height rules are unchanged. CSS additions target only `.consult-summary` descendants.

## Conversation behavior

- Symptom intents: NO_START, WEAK_START, DISCHARGE, REPEATED_DISCHARGE, JUMP, JUMP_REDISCHARGE, REPLACE, PREVENTIVE_REPLACE.
- Symptom text is an approved normalized label, never arbitrary input. `confirmedAt` is the deterministic confirming turn number. Correction changes the symptom without discarding the vehicle.
- Customer goal records replacement, price, area or battery-type intent. Symptoms are context, never a diagnosis or a recommendation that replacement is necessary.
- Static area availability and LIVE_DISPATCH_AVAILABILITY / ARRIVAL_TIME / TODAY_SERVICE / URGENT_SERVICE are separate. Live timing always uses the fixed phone-confirmation warning.
- Browser UAT found that the V4 right boundary did not accept a location followed by 지금. The boundary now accepts timing words, with a mixed location/time regression test. All 990 V4 assertions still pass.
- Unknown year/fuel/model answers retain the pending question and provide registration-document/fuel-label help, free typing, reset and phone paths.
- One live summary replaces its predecessor. It includes known vehicle/detail/year, explicitly confirmed fuel, resolved battery/upgrade, canonical area and user-provided symptom only. No invented fuel, price, coding or schedule.
- Six copy categories contain two fixed variants each, selected by turn parity; no random generation. Safety warning, facts and exact CTA addresses do not rotate. Generic greeting starts at deterministic variant 0.

## Session contract and privacy

- Key `ildeung.smart-consult.v5`; schema version 1; 12-hour maximum age; current state and up to 100 sanitized message bubbles.
- sessionStorage only; no localStorage or IndexedDB. Storage exceptions preserve in-memory operation.
- User bubbles are stored as canonical vehicle/year/fuel/area facts and fixed intent labels, NOT arbitrary raw customer text. Thus wording may be normalized after reload; context and assistant text are retained. Unknown personal text becomes a privacy placeholder.
- Assistant actions retain their own battery type and area link when restored. Pending choices are restored only for the last bubble; no old active chips.
- Schema, basic nested types, timestamp and payload checksum reject malformed/corrupted/stale data. The checksum detects corruption, not a cryptographic attacker boundary. Rendering always uses textContent.
- Header reset, summary reset and typed reset immediately remove storage and remove vehicleId with replaceState; no new history entry or history trap.
- Synthetic test names, phone, license plate, email and XSS input were absent from serialized data. Real browser synthetic PII test: personalDataStored=false, localStorageKeys=[].

## Canonical deep links and SEO

- Contract: `/smart-consult/?vehicleId=<encoded manufacturer/vehicle[/generation] slug>`.
- `seo-data/smart-consult-vehicles.json` is generated from the same rows and groups as the canonical vehicle pages. Query IDs must exactly match this allowlist; no fuzzy URL identity search.
- 427 integrated pages: 184 vehicle families + 243 generation/detail groups, across all 15 manufacturers. Generic root/manufacturer hubs receive no vehicle context CTA.
- Exactly one `이 차량 스마트 상담하기` link in the existing hero button row, using existing `btn secondary` styles; zero extra vehicle-page JS/CSS requests.
- Examples: `bmw/5-series`, `benz/e-class`, `kia/carnival`, `hyundai/sonata`, `bmw/5-series/g30`.
- There are no exact 520d/E300 canonical pages in this mapping. BMW/Benz family pages correctly preload 5시리즈/E-클래스, not invented trims. Detail pages retain their actual canonical detail-model constraints when the first year is supplied. No guessed year/fuel.
- Unknown/tampered ID → generic greeting, no created fake vehicle or injected HTML.
- Automated comparison of ALL 427 HTML files against baseline removes the one new CTA line and requires exact equality. Therefore title/H1/canonical/schema/SEO text are unchanged.

## Automated verification

- `npm run test:smart-consult`: PASS, 110 assertions / 917 rows.
- `npm run test:smart-consult-conversation`: PASS, 3411 assertions.
- `npm run test:smart-consult-nlu-v4`: PASS, 990 assertions; 665 regions, six safe aliases, BMW4/5/520d and region ambiguity intact.
- `npm run test:smart-consult-v5`: PASS, 4093 assertions (symptoms, dispatch, recovery, sessions, privacy, summaries, variations, all 427 identities/pages, XSS-safe rendering, exact CTA constants).
- `npm run audit:sitewide-service`: PASS; 647 area pages, 488 other pages, FAQ mismatch 0.
- `npm run audit:sitemap-stability`: PASS; 1133 URLs, stable fixtures/encoding/build cycles.
- `npm run audit:blog-sync-regression`: PASS; broken links 0, canonical changes 0, protected search/DB changes 0, source blog posts 343 retained, direct answers 427 valid.
- `npm run audit:work-cases`: PASS; existing 18 pages/343 posts unchanged. These pages are not loaded or linked by smart consultation.
- `npm run indexnow:dry-run`: SKIPPED_NO_CHANGE, submissions 0; no live IndexNow request.
- `git diff --check`: PASS.

## Real browser UAT

Chrome local static preview at 127.0.0.1:4173, mobile **390×780** and desktop **1280×900**. Browser interaction/verification workflow was used; agent-browser CLI was unavailable, so the connected browser was used. No API backend/env variables are needed: the flow is UI → same-origin canonical JSON → pure resolver → safe DOM.

| Flow | Mobile | Desktop | Observed result |
| --- | --- | --- | --- |
| A: jump/re-discharge → BMW520d 2019 → Yeongdeungpo now → price | PASS | PASS | Symptom retained, AGM95/AGM105, canonical Seoul district, live-time warning and AGM/phone CTA |
| B: E300 → 2020 → don't know → gasoline | PASS | PASS | Fuel help keeps context, typed gasoline resolves AGM80 |
| C: Carnival 18 diesel → Incheon Songdo → reload → AGM? | PASS | PASS | 2018/diesel/Songdo retained; DF90L and DIN guidance, no AGM invention |
| D: actual BMW vehicle-page CTA → year | PASS | PASS | 5시리즈 preloaded, no vehicle re-entry, 2019 resolves AGM95 |
| E: Sonata2020 → correction2019 | PASS | PASS | Single current summary shows 2019 only; fuel remains unconfirmed |

Additional browser checks:

- BMW/2019/Incheon reload then price retains context and matching product CTA.
- BMW, Benz, Kia and Hyundai actual page buttons each preload the correct family.
- Deep-link reset removes query + session immediately; reload stays generic; back returns to original vehicle page.
- Malformed JSON and old schema injected into the disposable local test tab both silently reset; temporary data was removed afterwards.
- Tampered HTML-like vehicleId yields generic greeting; chat-log injected images 0.
- Horizontal overflow false; composer enabled after summary; summaryCount=1; console error/warn list empty.
- Browser viewport override restored after testing. User's existing V4 preview was not overwritten.

## Performance

- Added initial JS: about **16.1 KB uncompressed** versus baseline (seven changed/new runtime modules; exact script output retained by test). Two additional static module requests; no added library or external dependency.
- Actual browser session for BMW520d → 2019 → Incheon: **2938 UTF-8 bytes**. Pure unit fixture without greeting/action metadata: 2435 bytes. Bounded to 100 messages / 200000 input characters on restore.
- Canonical entry index: **54648 bytes**, fetched only when vehicleId is present, one extra JSON request.
- Generic initial and generic restored session: **0 JSON requests** before next input.
- First input: **17 JSON requests**, versus baseline 18. Removed the unnecessary 264786-byte full vehicle-page mapping request. Deep-link + first input totals 18.
- Vehicle-page CTA: **138–183 UTF-8 bytes/page**, average **150**, no extra network request until clicked.

## Observed UX metrics

In the specified automated and browser test corpus: fabricated diagnosis 0; false live dispatch 0; don't-know dead ends 0; context loss 0; repeated known questions 0; mandatory answer-chip clicks 0; stored PII 0; localStorage writes 0; invalid vehicle IDs accepted 0; customer-facing internal DB wording 0; smart-consult work-case CTA/dependency/request 0.

These are test results, not a claim that arbitrary Korean natural language is universally understood. The implementation remains deterministic and API-free.

## Release boundary

PREDEPLOY ONLY. Preserve the existing four-commit chain, add one reviewed V5 commit, and do not push or deploy.
