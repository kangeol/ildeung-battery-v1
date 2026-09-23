# Context-aware DELKOR / VARTA comparison

Baseline verified after fetch: main, local/origin/actual remote `79b3744baa671010b4b776999b7b0ea437f54b20`, ahead/behind 0/0, clean/staged 0/untracked 0. Push and deployment are not authorized.

## Proven gaps

The unmodified baseline was exercised before edits: 16 questions in three starting contexts (fresh, BMW AGM95 followed by VARTA, and generic brand comparison). `pre-fix.json` retains exact answers/states and per-case adjudication. Totals: PASS_EXISTING 6, MISUNDERSTOOD 4, WRONG_INTENT 20, CONTEXT_LOST 8, OTHER 10; unsupported superiority/price reasons/brand prices 0. OTHER means a safe existing comparison missing the newly required latest-authentic/latest-manufacture summary, not a fabricated claim. `post-fix.json` replays all 48 starting sequences with semantic checks.

The prior recognizer missed generic difference and short recommendation expressions; the ordinary brand-price route could consume a comparison as a request for the last brand's price. Generic comparison did not record a context marker, and origin follow-ups could answer only the last brand when the question meant both.

## Bounded implementation

- `js/smart-consult-brand-comparison.js`: normalized intent recognition, safe omitted-subject clarification, canonical comparison rendering and computed arithmetic differences.
- `js/smart-consult-conversation.js`: comparison adapter before existing routes. Existing vehicle resolution runs for explicit vehicle facts; product prices never establish vehicle compatibility. Exact candidate actions bypass the adapter. Operational/payment/exact-date components remain independently composed.
- Existing `lastIntent` carries `BRAND_COMPARE`; no new session schema or raw input storage. Existing VARTA + known-spec context is also usable. Reset/new vehicle routing remains unchanged.
- `data/battery-prices.json` is unchanged and remains the only price authority. Existing `data/consult-service-policy.json` product origin, assurance, selection preference and lifespan texts are reused. Only `product.comparisonContext` adds clarification and explicit support/performance/causal boundaries. No duplicated price/origin truth.
- Explicit unknown product codes do not inherit a prior product's price. Unsupported VARTA sizes retain the existing unsupported answer; MINI keeps both specs and field confirmation.
- Cache version changes are limited to the consultation module graph and its HTML entry.

## Verification

`node tools/test-brand-comparison.js`: independent authorized price expectations, variants, omitted subjects, all priceable/unsupported AGM sizes, MINI, BMW/G80, session round-trip, reset, unknown products, compound intents and 48-case replay. Every named gate has exercised assertions; test count and raw responses are in `focused.json`.

`NODE_OPTIONS=--import ./tools/test-brand-comparison-evidence.js node tools/test-final-faq-regression.js`: the existing 20-command suite. The preload redirects evidence writes only; assertions are unchanged except explicitly authorized cache/scope, exact added policy subtree and comparison-context behavior expectations. Old policy truth is compared in full after removing exactly the new subtree. Additional suites: operational, authentic-cash, standalone-spec, vehicle-selection-context and mass vehicle-selection.

`tools/test-brand-comparison-browser.js`: actual local UI at 1440/390; all requested A-E flows, direct/contextual questions, compounds, every A7/G80/G90 candidate and persisted re-entry. Warm the named browser and set `AGENT_BROWSER_BIN` if needed. Home navigation explicitly waits for load and launcher initialization. No arbitrary immediate launcher assertion.

During validation, Windows twice reported an UNKNOWN file-open error while repeatedly overwriting mobile evidence. The harness now accumulates the same checked records in memory and writes once at completion; no UI assertion was removed. The entire mobile run is repeated after this harness-only change. Development also added an explicit unknown-product guard and the named recommendation variant `바르타가 좋나요?`; final regression runs use those final sources.

`node tools/test-brand-comparison-freeze.js`: exact current-task allowlist, cache-only consultation HTML change, no protected SEO/generated-page/data edits, blog 345, sitemap 1133. Evidence scope is the executed test matrix, not every possible utterance.
