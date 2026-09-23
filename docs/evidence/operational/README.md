# Real-customer operational and short-context consultation

Baseline: `main`, local/origin/actual remote `0ae7d7537dd86250d9ed34dce0edcda1622af39f`, ahead/behind 0/0, clean/staged 0/untracked 0 verified after fetch before implementation. No push or deployment is authorized.

## Audit and bounded repair

`pre-fix.json` records 146 baseline cases, including six short-context pairs. Totals: PASS_EXISTING 64, MISUNDERSTOOD 9, WRONG_INTENT 71, CONTEXT_LOST 1, NEEDS_CLARIFICATION 1; all other categories 0. The baseline module was read from the exact baseline commit, with imports resolved to unchanged dependencies. `post-fix.json` replays the same fixtures. Classifications use the semantic assertions in `tools/operational-fixtures.js`; they are not a claim that every possible customer utterance was audited.

Proven gaps included reservation/application being treated as unknown vehicle information, site/non-face-to-face/product questions being treated as vehicle questions, missing parts of compound operational/payment questions, and bare duration being treated as a price request. Existing correct pricing, payment, origin/grade, symptom, time and service-area paths remain in use. No vehicle, area, battery-price or SEO truth was changed.

Canonical Owner-authorized new facts/templates are confined to `data/consult-service-policy.json` under `operational`. Existing fields are compared in full against baseline after excluding exactly the new section and version. Recognition lives in `js/smart-consult-operational.js`; the conversation adapter composes those replies with the existing canonical vehicle/area/pricing/policy engines. Existing A/S, coding, old-battery and surcharge variants route to existing policy replies, not new copies of those facts. A product code does not confirm vehicle compatibility.

Short replies use canonical quoted battery/vehicle/area state or a safe operational intent marker. Explicit work-duration questions record a work-duration topic; an arrival/reservation topic instead routes to live confirmation. Without a duration topic the engine asks which duration is meant. Session restore retains the existing state schema and privacy projection. Exact candidate-selection actions bypass the new natural-language adapter.

## Test changes and evidence

- `node tools/test-operational.js`: spacing, polite prefix, family/context/no-context variants, every mandatory combined question, restored duration context, explicit unsupported and ambiguous area controls, canonical-policy preservation, 27 exercised safety gates. `focused.json` records executed turn count separately from transcript record count.
- `node tools/test-operational-audit.js`: post-fix replay. `OPERATIONAL_BASELINE_MODULE` selects the original module when reproducing the pre-fix audit.
- `NODE_OPTIONS=--import ./tools/test-operational-evidence.js`: redirects newly generated regression evidence into this task's directory, preserving historical evidence. Assertions are not bypassed. Existing full regression is `node tools/test-final-faq-regression.js` (20 commands), plus authenticity/cash, mass vehicle selection, selection security/context and standalone-spec suites.
- Existing test updates are limited to the authorized cache version/scope and exact policy additions. The old context-free `추천해주세요` brand-comparison expectation now explicitly requires a vehicle question; resolved BMW/MINI brand comparisons remain tested. Work-duration tests permit only the specified operational topic marker while asserting all other state fields and exact existing answer text are unchanged.
- `tools/test-operational-browser.js`: actual local UI at 1440/390, every family, mandatory compound questions and sequences, duration-topic restore, all A7/G80/G90 displayed candidates, G90 selected-row flow, home launcher/re-entry and input/scroll/CTA. Warm its named `operational-1440` or `operational-390` agent-browser session first, and set `AGENT_BROWSER_BIN` when the CLI is not on PATH. Every mutation is followed by a fresh snapshot and response-completion wait.
- `node tools/test-operational-freeze.js`: baseline allowlist, consultation cache-only HTML comparison, vehicle/area/price data freeze, blog 345 and sitemap 1133.

Local browser execution had one transient evidence-file write error; the complete 390px run was rerun, not waived. During development, tests detected a missing exact-date + realtime response component; the final compound assertion checks both. No runtime code changes are made by tests.

See `summary.json` for final gate counts, `changed-files.txt` for the exact commit-scope manifest, and `browser-1440.json` / `browser-390.json` for exact responses, selected canonical identities and UI evidence.
