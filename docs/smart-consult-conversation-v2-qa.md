# Smart consultation V2 predeploy verification

Baseline: `efd81a7ca7b357021c601b9bedfd6afe7f8d80bc`, clean main worktree, two commits ahead of origin. No deployment or push performed.

## Implementation

- `smart-consult-conversation.js`: deterministic entity extraction, intent routing, in-memory context and corrections. Reuses canonical vehicle search and battery resolution.
- `conversation-copy.js`: customer response templates and result labels.
- `smart-consult.js`: safe text rendering, ordered responses, editable composer, reset cancellation, optional chips capped at four. Typing delay is at most 300 ms, omitted for reduced motion.
- `smart-consult-localities.json`: 665 names extracted from canonical service-area data, without work-case content. Region links use existing canonical province pages.
- No AI API, browser persistence, invented prices, coding rules or battery substitution rules.
- E300 aliases identify a family, not a proven fuel. A 2020 E300 requires fuel confirmation because its source rows differ between gasoline and diesel. BMW 520d 2019 and diesel Carnival 2018 resolve without an extra fuel/generation question.

## Automated verification

- Existing suite: 110 assertions PASS. Two source-location checks now inspect the extracted copy module; no old assertions removed.
- Conversation suite: 3,400 assertions PASS, covering the 917 canonical rows, text-only turns, multi-entity input, corrections, yes/no answers, short-year ambiguity, overlapping generations, unknown places, follow-ups, source-backed results and wording checks.
- Sitewide service, sitemap stability, blog sync regression and work-case audits PASS. Sitemap remains 1,133 URLs; broken internal links 0; canonical changes 0.
- Header and footer compared with baseline and identical. Removed intro/guide/FAQ remain absent.
- Existing homepage, vehicle finder, canonical vehicle data, IndexNow and work-case implementation unchanged.

## Real browser UAT

Chrome, 390×780 and 1280×900. Every conversation turn entered using the textbox and Enter, with zero required quick-reply clicks. Reset button used only between independent test flows.

| Flow | Inputs / observation | Result |
| --- | --- | --- |
| 1 | bmw 520d → 2019년식 → 인천인데 출장돼? → agm이야? → 가격은? | AGM95 / AGM105; remembered region; phone/store price fallback |
| 2 | 벤츠 e300 2020년식 → 서울 강남이야 → 가솔린 | Year retained through region interruption; AGM80 |
| 3 | 카니발 18년식 디젤 → 일반 배터리야? | 2018, diesel, DF90L retained |
| 4 | 없는차량테스트 → 벤츠 e300 20년식 → 가솔린 | Recovery without reset; AGM80 |
| 5 | BMW 520d 2019 → 아니 2018년식이야 | Same vehicle, updated year; new 2018 result |

Additional mobile check: “BMW 520d 2019년식이고 인천이야” → “송도도 와?” retained vehicle/year and used canonical 송도동 area information.

Observed in these flows: repeated already-known questions 0, context loss 0, internal wording 0, fabricated facts 0, horizontal overflow 0, console errors/warnings 0. Composer remained enabled after results; latest-message scrolling verified.

Browser XSS check: `<img src=x onerror=alert(1)>` displayed literally, injected image count 0. Phone, DIN, AGM and vehicle detail links checked. No phone call or store purchase initiated.

These counts describe the tested flows and source comparisons, not a guarantee of understanding every possible natural-language sentence. Unrecognized questions use the safe phone fallback.

State: SMART_CONSULT_TRUE_CONVERSATION_V2_PREDEPLOY_READY
