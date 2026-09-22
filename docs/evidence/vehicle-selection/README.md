# Vehicle disambiguation selection audit

Baseline: `881c3f40cd0c009c1a24dc86d88832c8ed700df8` on `main`; origin and actual remote were identical, ahead/behind 0/0, clean worktree, staged/untracked 0 before changes. No push or deployment is authorized by this task.

## Proven production defect

`production-before.json` records real production mobile button clicks for every G90/G80 candidate before editing. The old DOM click handler sent only `choice.value` to `handleMessage` and `conversationTurn`. No row identity/action was carried. The older G90/G80 labels contained years, but their values were just `G90`/`G80`. Generic matching expanded both generations. The plain-answer matcher also used substring matching, so both options matched and no unique choice was applied. `previousQuestion` remained `detailModel` and the same list returned. This is the same handler on desktop and mobile.

| Input | Clicked label | Old router input | Pre-fix outcome |
| --- | --- | --- | --- |
| G90 | 2021~현재년형 · G90 (RS4) | G90 (RS4) | Exact confirmation-required row, no loop |
| G90 | 2018~2021년형 · G90 | G90 | Same ambiguity repeated; no selected detail |
| G80 | 2020~현재년형 · G80 (RG3) | G80 (RG3) | AGM95R, no loop |
| G80 | 2016~2020년형 · G80 | G80 | Same ambiguity repeated; no selected detail |

## Repair and validation

The existing discriminator builder is shared with the selection validator. Each discriminator button carries an identity derived from its field, family, value, and sorted canonical condition keys (manufacturer, vehicle, year range, fuel, detail model). On click the router recomputes the current candidate set, validates the identity against the currently displayed/pending choices, applies that exact discriminator, and skips natural-language re-expansion. Existing certainty, composite, confirmation, price and brand policies then run unchanged. The selected year range is retained; explicit year correction can replace it. Saved pending buttons are rehydrated from the current canonical candidates on restore, including pre-upgrade sessions.

Condition keys intentionally keep duplicate/conflicting facts together. A displayed G80 generation represents two fuel rows with the same battery, not an invented single fuel choice. No canonical data, prices, area logic or policy facts were changed. Generic vehicle-family clarification remains governed by its existing family-key path and is included in the mass audit.

## Full inventory and evidence

`mass-before.json` and `mass-after.json` contain every discovered group's queries, normalized query, manufacturer context, labels, canonical source file/index row sets, governed category, actual selected identities and returned text. The inventory seeds all 917 rows, family/detail names, manufacturer-qualified names, generated/approved aliases, fuel variants and every supported numeric year (open ranges through the audit year). It follows canonical discriminator branches and affirmative family confirmations. Distinct groups are deduplicated by canonical candidate rows, field and choices; only actually displayed buttons are counted.

`summary.json` asserts the pre/post inventory fingerprints are identical and reports final counts. `RESOLVES_GOVERNED_NO_MATCH` is separately reported, not concealed as an exact battery answer: four family-choice controls have no canonical row for the already supplied fuel/drivetrain/engine. They must preserve the selected family and safely return no match without battery inference. They are not false-unsupported failures for an existing matching row.

Final mass counts: 17,496 seed inputs, 499 distinct groups, 1,277 displayed candidate selections in each phase. Before: 1,208 correct exact candidate sets, 62 repeated ambiguities, 3 wrong candidate sets, 4 governed no-matches; all other failure classes 0. After: 1,273 correct exact candidate sets, 4 governed no-matches; all six required hard-gate failure counts 0. The three wrong pre-fix selections were broad `가솔린` values reparsed after an exact-fuel selection and expanded beyond the selected fuel condition; the same structured selection repair prevents this.

Baseline audit execution uses an unmodified `git show 881c3f40:js/smart-consult-conversation.js` snapshot in a temporary directory, changing only its relative import paths to absolute repository module URLs. Those imported dependencies are unchanged. Set `VEHICLE_SELECTION_BASELINE_MODULE` to that file URL when running `tools/test-vehicle-selection.js`; omit it for the repaired implementation.

## G90/G80 results

| Candidate | Canonical rows (zero-based) | Governed result |
| --- | --- | --- |
| G90 (RS4), 21년~현재, 가솔린 | genesis.json:11 | 이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요. |
| G90, 18~21년, 가솔린 | genesis.json:12 | AGM105 델코 기준 교체 가격은 28만원입니다. |
| G80 (RG3), 20년~현재, 가솔린/디젤 2WD | genesis.json:7,8 | AGM95R 델코 기준 교체 가격은 24만원입니다. |
| G80, 16~20년, 가솔린/디젤 | genesis.json:9,10 | AGM105 델코 기준 교체 가격은 28만원입니다. |

All four results have no selection loop. Exact complete responses, condition identities and labels are in `browser.json`. G70 gasoline/diesel buttons are the additional browser fixture.

## Tests and browser evidence

- `test-vehicle-selection.js`: exhaustive discovered candidate selections, pre/post inventories.
- `test-vehicle-selection-context.js`: 33 turns, 19 rejected malformed/fabricated/cross-context/stale actions, session restore, area, VARTA, payment, worktime, correction, replacement and reset.
- `test-standalone-spec.js`: 178 turns, 130 canonical cases; default and supported/unsupported brand rules and compatibility boundary.
- `test-final-faq-regression.js`: 20 authoritative existing commands. Raw command output is preserved in `regression/regression-results.json`.
- `test-vehicle-selection-browser.js`: actual local button clicks at 1440px and 390px, all G90/G80/G70 options, pre-upgrade session reload, mandatory Guwol→G90→VARTA→card→worktime flow, correction/replacement/reset, standalone AGM105 variants, focus, scroll, overflow and phone CTA. `browser.json` has exact text and screenshots.
- `test-vehicle-selection-freeze.js`: explicit authorized path set and exact consultation script cache-only HTML comparison against baseline. Vehicle/area generated HTML, metadata and SEO/GEO body changes are zero; blog 345, sitemap 1133.
- `test-vehicle-selection-summary.js`: cross-checks the complete evidence set.

The evidence preload routes historical suites' output files into this task's directory; it does not alter their assertions. Existing cache/scope assertions were updated only for this authorized consultation change. No historic evidence or generated site pages are overwritten.

Standalone `AGM105`, `AGM105 가격`, `AGM105 얼마야?` return `AGM105 델코 기준 교체 가격은 28만원입니다.` without creating a vehicle fit confirmation.

## Scope / release

Only consultation selection/session restoration logic, directly necessary module cache versions, tests and this evidence are changed. `smart-consult/index.html` changes only its JavaScript version query. This is a local predeploy repair; production remains unchanged until a separate Owner deployment instruction.
