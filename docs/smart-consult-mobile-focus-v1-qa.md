# AI battery consultation — mobile focus V1

Task: ILDEUNG_AI_BATTERY_CONSULT_MOBILE_FOCUS_FLOATING_FINAL_DEPLOY_V1.
Starting local HEAD: 7117e98b785e8dfa61a8d0b5d4dc2cdc1537dff2.
Starting origin/main: b98f98bbc1c062a0985419670e513ddef0abc23c; ahead 1 / behind 0; clean.

## Root cause reproduced before editing

Chrome local preview, 390×780, then focus/type and shrink to 390×420:

- Before: document height 1004px, body overflow auto, chat shell 716px.
- After shrink: shell retained minimum height 610px; document height 898px; scrollY drift 405px; footer visible.
- The document and message pane both scrolled. `100svh` plus fixed minimum height did not follow keyboard-only visual viewport reduction.

## Page-only implementation

- Exact title `AI 배터리 상담 | 일등밧데리`; H1 `AI 배터리 상담`; combined chat header `일등밧데리 AI 배터리 상담`.
- Fresh greeting: `안녕하세요. 일등밧데리 AI 배터리 상담입니다.\n차량명이나 궁금한 내용을 편하게 입력해 주세요.`
- Existing support line replaced with `일등밧데리 차량 정보를 바탕으로 안내합니다.` No new explanatory section.
- Mobile page-local fixed flex body, dynamic viewport height/offset, hidden document overflow and mobile-only hidden footer. Other site footers unchanged; desktop footer remains.
- Shell uses available flex height, min-height zero; only message pane scrolls. Safe-area-aware help/composer region; input remains 16px.
- Small-device landscape covered through 1000px width / 600px height media query.
- VisualViewport resize/scroll, window resize/orientation/pageshow updates coalesce through requestAnimationFrame. `100dvh` fallback, `100vh` last fallback. Pinch-zoom is not forcibly resized.
- Near-bottom readers stay anchored; old-message readers retain their scroll position. No timers/polling in production viewport module.
- No vehicle/generator/floating/home/area/battery/search/data/sitemap changes in this commit.

## Local browser UAT

Actual desktop Chrome browser with mobile viewport emulation, NOT physical Android/iOS keyboard testing:

- 390×780 → focused 390×420: footer visible 0, scrollY 0, shell bottom 420, composer bottom 395.5.
- Six multi-turn inputs: BMW 520d 2019년식, 송파 가능?, 가격은?, 점프했는데 또 방전됐어요, 지금 와요?, 잘 모르겠어요. 17 message rows; only log scrolls; summary/AGM95/AGM105/region/symptom retained.
- Blur/full-size restoration: shell bottom 780, composer bottom 755.5, footer 0, scrollY 0.
- 360×740, 360×380, 430×932, 430×480, 780×390, 740×360, 390×780: PASS after resize animation frames settle.
- Reading scrollTop 100 preserved after shrink; bottom reader restored with bottom gap 0. Wheel at log boundaries does not move document.
- Separate synthetic VisualViewport-only height 420 / offsetTop 60 while layout stays 780: shell bottom 480, composer bottom 455.5. Test-only overrides removed immediately.
- Reload restores full-screen layout and existing consultation summary. Vehicle-page floating entry still prefills BMW and follows reduced viewport.
- Desktop 1280×900 screenshot inspected; exact title/H1/header/greeting verified. Mobile reduced viewport screenshot inspected. Console warning/error count 0.
- Physical phone keyboard, browser chrome, safe-area and OS rubber-band behavior remain a recommended owner device check; no claim of real-device execution.

## Automated gates before commit

- `node tools/test-smart-consult-viewport.js`: naming, viewport fallback/offset/orientation/throttling/zoom, reading preservation/bottom anchor and page-only scope PASS.
- Core 110, conversation V2 3412, V4 989, V5 4112 + 9 negative mutations, V7 full canonical audit 39642: PASS.
- Floating/SEO freeze: 427 canonical vehicle pages, 1114 launchers, 917 DB rows. Only previously authorized inline removal + floating addition differ from b98f98bb. All other vehicle HTML bytes match (LF-normalized).
- Consultation HTML is now an explicitly scoped exception to the prior excluded-page byte freeze; launcher absence and canonical still asserted, and this task's exact copy/scope test covers it. Other exclusions remain byte-frozen.
- Sitemap stability 1133 URLs; sitewide/area, blog-sync 345 posts, work-case 345 cases / 18 pages: PASS. No historical blog loss, DB change, broken links or canonical change.
- IndexNow dry-run, submitted 0. No external AI API or work-case integration added.

## Release governance

Separate forward commit; no amend/history rewrite. Fetch/audit remote before push; only authorized automatic blog updates may merge. Normal push only after clean tree and all gates pass. Production verification reported in task response after deployment.

## Returning-browser cache correction

Initial f328cb53 Pages deployment succeeded and 65 production resources matched local content. A previously opened browser nevertheless mixed new HTML with cached old CSS/copy; disabling cache confirmed the cause. Page-local CSS/main/viewport imports and the UI copy import now use `?v=ai-mobile-v1` asset versions. These are asset URLs, not consultation/vehicle URLs, and do not enter sitemap. Added cache-contract tests; separate forward follow-up commit, no history rewrite or vehicle/floating-source edits.
