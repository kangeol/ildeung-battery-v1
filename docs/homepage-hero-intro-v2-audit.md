# Homepage mobile intro V2 audit

Parent: `33b8d5c19bd5723baf3c80de2978f70b6f4f84ea`.
Remote baseline: `f98442a3595a80710ed8f22894b52aa7fecab1a2`.
Initial main clean, staged/untracked 0, ahead/behind 1/0; fetch and actual remote matched.
No push or deployment.

H1 unchanged: 서울·경기·인천 출장 자동차 배터리 교체

Support: 국산차·수입차 전 차종 배터리 출장 교체

Only production edits: support sentence in index.html; four base declarations in the homepage-only stylesheet (top padding 20→14, H1 26→22, gap 10→6, support 15→12 pixels). Desktop overrides unchanged. No cache change needed: parent intro has not deployed. Test updated for the approved copy and exact parent delta.

## Real browser measurements

Agent-browser Chromium; fonts and images loaded. Carousel/ticker frozen at initial frame only in measurement fixture, mouse outside content. H1 remains one visible semantic element; no hidden duplicate.

| Width | H1 px/line-height/lines | Support px/line-height/lines | Intro height | Hero x/y/w/h | Horizontal overflow |
|---|---|---|---|---|---|
|360|22/28.6/2|12/19.2/1|96.375|12/177.375/336/189|0|
|390|22/28.6/2|12/19.2/1|96.375|16/177.375/358/201.375|0|
|430|22/28.6/1|12/19.2/1|67.78125|16/148.78125/398/223.875|0|
|819|22/28.6/1|12/19.2/1|67.78125|16/148.78125/787/442.6875|0|
|820|36/46.8/1|16/25.6/1|112.390625|16/217.390625/788/443.25|0|
|1440|36/46.8/1|16/25.6/1|112.390625|160/217.390625/1120/630|0|

390 parent/candidate intro height: 145.59375 / 96.375, reduction 49.21875.
390 hero Y: 226.59375 / 177.375; first lower section Y: 457.96875 / 408.75.
1440 intro height: 112.390625 / 112.390625; hero Y: 217.390625 / 217.390625; first lower Y: 877.390625 / 877.390625.

At every width, all 12 existing roots (header, ten main sections, footer) and 290 descendants retain DOM, computed styles, x/width/height and internal relative position (subpixel tolerance 0.6px). Header remains fixed in original place; content moves by exactly the normal-flow intro height delta. Hero sources, aspect ratio, buttons, sizes and internal placement unchanged. Desktop intro/H1 geometry and styles unchanged. Auto CSS margins normalized as auto for style comparison, with rendered coordinates independently compared.

Screenshots inspected: parent/candidate 390, candidate 360, parent/candidate 1440. Mobile heading no longer dominates; original hero remains focal point. No introduction overlap/clipping; support naturally one line without nowrap or scaling.

Evidence directory: `C:/Users/kang1/AppData/Local/Temp/home-intro-v2/`

- before-390-top.png / after-390-top.png
- after-360-top.png
- before-1440-top.png / after-1440-top.png
- before.json / after.json / invariants.json
- browser-390.json / browser-1440.json

## System and SEO freeze

Focused source test verifies exact allowed delta, shared CSS unchanged, all pre-intro production HTML byte-equivalent after removing authorized intro/link, blog 345, sitemap 1133. Title/canonical/schema unchanged in all browser measurements. No vehicle/area/battery generated HTML, SEO/GEO body, consultation JS, policy, vehicle DB, area DB, prices, blog or sitemap edits.

Actual consultation smoke at 390 and 1440: AGM105는 얼마인가요?, 40AL 어디 브랜드 쓰나요?, 60, 저녁에도 되나요? plus existing AGM70 brand/price fixture. Five turns per viewport; rendered replies/session state match canonical conversation engine, no horizontal overflow. Source remains unchanged.

All requested focused failure gates zero: H1_TEXT_CHANGED, H1_COUNT_WRONG, SUPPORT_TEXT_WRONG, HIDDEN_H1_PRESENT, MOBILE_H1_TOO_LARGE, MOBILE_SUPPORT_UNREADABLE, MOBILE_SUPPORT_OVERFLOW, MOBILE_HORIZONTAL_OVERFLOW, MOBILE_OVERLAP, DESKTOP_H1_STYLE_UNEXPECTED_CHANGE, DESKTOP_INTRO_LAYOUT_UNEXPECTED_CHANGE, HERO_CHANGED, LOWER_SECTION_STRUCTURE_CHANGED, UNAUTHORIZED_GLOBAL_CSS_CHANGE, UNAUTHORIZED_SEO_GEO_CHANGE, CONSULTATION_SOURCE_CHANGED.
