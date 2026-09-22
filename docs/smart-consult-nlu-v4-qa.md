# Smart consultation location / vehicle NLU V4

Baseline: main, `e81beb43dcc5ec0defb752f96418a969e3391671`, clean worktree, ahead 3 / behind 0 against the locally known origin/main. No fetch, push, deployment, reset, clean, stash, rebase or squash.

## Reproduced before implementation

Real preview reproduced all six reported failures: 경기 → 시흥, 동작구, explicit 경기 시흥 returned a generic province question; BMW5, BMW4 and 소나타 were unrecognized.

The old location matcher compared suffix-stripped names without hierarchy and chose by name length. This made 동작구 collide with 동작동 and lost real collision candidates. The flat index also omitted city/district distinctions. Vehicle search lacked brand-series shorthand and the approved spelling map.

## Canonical sources and audit

Location source: `seo-data/service-areas.json`. Generated projection: `seo-data/smart-consult-location-index.json`. No manual locality list or case content. The previous `data/smart-consult-localities.json` remains unchanged for compatibility.

Hierarchy counts: province/metropolitan 3, city 14, district 40, locality 608; total 665. All 665 full canonical addresses resolve back to their original canonical IDs. There are 91 colliding normalized/suffixless location aliases (including full-name and suffixless forms).

Real collision examples:

- 시흥: 서울 금천구 시흥동, 경기 성남시 수정구 시흥동, 경기 시흥시.
- 논현동: 인천 남동구 논현동, 서울 강남구 논현동.
- 정자동: 경기 수원시 장안구 정자동, 경기 성남시 분당구 정자동.

Therefore 경기 + 시흥 is still a real two-way collision. The resolver asks those two full names, never a generic province question and never invents certainty. Explicit 시흥시 resolves directly. Current explicit province overrides remembered context; remembered province/city/district only narrow when compatible. Pending collision choices can be answered by typing.

Vehicle sources: `data/manufacturers.json` and each referenced manufacturer JSON, 917 rows unchanged. Actual BMW families in `data/bmw.json`: 1시리즈, 2시리즈, 3시리즈, 4시리즈, 5시리즈, 6시리즈, 7시리즈, 그란투리스모 (GT), X1, X2, X3, X4, X5, X6, X7, Z4.

Approved spelling aliases (6): 소나타→쏘나타, 아반테→아반떼, 그랜져→그랜저, 산타페→싼타페, 소렌토→쏘렌토, 투산→투싼. All target families exist. No speculative additional spelling corrections added. Manufacturer aliases reuse the existing canonical module.

Alias audit: 1,915 entries, 1,649 distinct normalized strings; 6 approved spelling entries, 1,725 safely generated manufacturer/family/detail/shorthand entries. The remainder are canonical family entries. Multiple entries may normalize to one string. Cross-family collisions: 0. Synthetic collision tests confirm ambiguous mappings return multiple candidates. Globally rejected aliases: `5`, `4`, `e`; bare numbers only work as a BMW-context correction. Unknown suffixes such as 투산nx44 are rejected, not partially interpreted as BMW X4.

소나타 resolves to `hyundai|쏘나타`, using the 20 existing 쏘나타 rows in `data/hyundai.json`. Year/fuel/detail are still resolved from those rows; a spelling alias does not imply a battery specification.

## Tests and browser UAT

- Existing core: 110 assertions PASS.
- Conversation: 3,401 assertions PASS.
- NLU V4: 990 assertions PASS (location, BMW, six spellings, generation tokens, mixed turns, corrections, collisions, invalid aliases, all canonical location IDs).
- Real browser: 20 flows on mobile 390×780 and the same 20 on desktop 1280×900, using text input + Enter for every conversational turn. Reset was used only between independent test flows.
- Covered all requested location inputs; BMW5→응→2019, BMW4, BMW520d, BMW5 2019→네, BMW5→아니4→ㅇㅇ; all six spellings, 소나타 2020, 그랜져 IG; three mixed vehicle/year/location sentences.
- Final desktop smoke check after projection-path change: 그랜져 IG with year/region, rejected 투산nx44, mixed 소나타 + 동작구, 경기→시흥→시흥시.
- XSS string rendered literally; injected images 0. Browser errors/warnings 0. Horizontal overflow 0. Composer remained enabled after replies.
- Observed required metrics in these flows: context loss 0, repeated already-known question 0, generic wrong province question 0, required chip clicks 0, approved alias unresolved 0, wrong vehicle auto-confirmation 0, invented location/vehicle facts 0, forbidden customer wording 0.

## Preservation

No changes to HTML/CSS, header/footer, composer/result layout, existing finder, homepage, canonical vehicle/area sources, sitemap, IndexNow or work-case pages. No external AI API. Phone and store CTA targets unchanged.

Sitewide-service, sitemap-stability and work-case audits PASS. Blog-sync regression initially flagged the intentionally changed derived file under its blanket protected `data/` rule. The hierarchical projection was moved into `seo-data/`, the legacy data file restored exactly, and the unchanged audit was rerun: PASS, protectedDbChanged 0, brokenInternalLinks 0, canonicalChanged 0, 1,133 sitemap URLs.

Predeploy ready. Production push NO.
