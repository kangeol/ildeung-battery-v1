# Standalone battery specification remediation

Task: ILDEUNG_AI_CONSULT_STANDALONE_BATTERY_SPEC_PRICE_REMEDIATION_V1

Starting main: `5cd62967fbe7afad871eda6bfef7ff4349705a7e`.
Remote main: `da2e2c0f93e119d82123e5d63b868e30195c00b6`.
Initial baseline: clean, staged 0, untracked 0, ahead/behind 5/0; all five original commits preserved.
No push or deployment is authorized or performed.

## Implementation boundary

`directPriceSpec` now recognizes a whole normalized code using the injected canonical price catalog and its aliases. It also accepts the residual brand follow-up wording only when a brand was explicitly supplied. The existing explicit price-question parser remains in place. The conversation records price intent and quotes the product without assigning vehicle compatibility.

No price, vehicle, area, policy, HTML, cache-version, SEO/GEO, blog or sitemap source changes. `data/battery-prices.json` remains the single pricing truth. A specification plus a vehicle/compatibility sentence does not pass the whole-input product lookup.

## Reproduction

PowerShell, from the repository root:

```powershell
node tools/test-standalone-spec.js
$env:NODE_OPTIONS='--import ./tools/standalone-spec-evidence-route.js'
node tools/test-final-faq-regression.js
Remove-Item Env:NODE_OPTIONS
node tools/test-standalone-spec-browser.js
node tools/test-standalone-spec-freeze.js
```

The test-only preload redirects historical `docs/evidence/final-faq` writes into this task's `regression` directory. The unchanged authoritative runner executes its original 20 commands. One initial attempt stopped because the preload had a relative path in an isolated sitemap build; the hook was corrected to propagate its absolute URL, and the full suite was restarted. No application repair was needed for that test-harness issue.

## Evidence

- `focused.json`: 178 conversation turns: 130 canonical cases (26 specs × five input forms), 12 aliases, 3 normalization cases, 12 supported VARTA cases, 6 unsupported VARTA cases, 4 unknown-code cases, 3 vehicle compatibility cases, 2 session turns, 2 MINI turns, 4 area/vehicle/correction turns. All seven requested focused violation counts are zero.
- `browser.json`: 26 actual UI turns, 13 each at 1440px and 390px. Includes spec queries, unsupported VARTA, BMW follow-up, MINI composite, missing area, card, visit and work time.
- `mobile.json`: input focused, body scroll 0, composer visible, consult launcher count 0.
- `regression/regression-results.json`: authoritative command-by-command results and outputs.
- `freeze.json`: exact diff scope; no HTML/SEO/GEO changes; blog posts 345; sitemap URLs 1133.

## Exact browser answers

Each of `AGM105`, `AGM105 가격`, and `AGM105 얼마야?` returns the same two messages, on both tested widths:

> AGM105 델코 기준 교체 가격은 28만원입니다.
>
> 출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.

`바르타 AGM105` returns `AGM105 바르타 기준 교체 가격은 33만원입니다.` plus the same inclusion summary.
`AGM60 바르타` gives the existing unsupported-size policy without a fabricated VARTA price.

Compatibility controls: `내 차에 AGM105 맞아?` asks for the vehicle/year; `BMW 5시리즈에 AGM105 들어가?` asks vehicle confirmation; adding 2020 uses the vehicle DB's AGM95 default, not the typed AGM105 as a fitment fact.
