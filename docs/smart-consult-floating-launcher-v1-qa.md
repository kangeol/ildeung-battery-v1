# Floating smart consultation launcher V1 — predeploy

Owner task: ILDEUNG_SMART_CONSULT_FLOATING_LAUNCHER_FORWARD_FIX_V1.
Authorized production baseline: b98f98bbc1c062a0985419670e513ddef0abc23c.
Forward-only, local commit only. No push/deployment in this task.

## Implementation and coverage

- Previous inline anchor: `renderSmartConsultLink` in `tools/generate-vehicle-seo-pages.js`, two hero button-row call sites, 427 canonical vehicle/detail pages. It used the existing `btn secondary` styles and `?vehicleId=`; no dedicated inline CSS/JS to remove.
- Removed those source call sites/function and regenerated normally. All 427 inline anchors removed without blank gaps.
- Shared markup: `tools/lib/smart-consult-launcher.js`; included by vehicle/area/battery generators and five hand-authored static shells.
- Included: 443 car-battery pages (427 vehicle/detail + 16 hubs), 647 area pages, 19 battery pages, homepage, search, company, service-area, battery-replacement: 1,114 total.
- Excluded: 18 work-case archive pages, smart-consult itself, admin and verification utility HTML. No work-case/article consultation integration.
- One semantic link with decorative inline SVG and accessible name `스마트 배터리 상담`; visible label `스마트 상담`. No libraries, fonts, auto-open, pulsing, or motion.
- Fixed bottom-right: 24px desktop / 16px mobile + safe-area; minimum 48px height, z-index 30, visible keyboard outline. Footer clearance 88px + safe-area. Search selector overlays temporarily hide the launcher.

## Entry contract

- Canonical production link determines the vehicle ID. The compact 427-page entry index is generated from the current 917-row DB; membership is checked before storing and again when consumed.
- Storage key: `ildeung.smart-consult.launcher.v1`; fields ONLY `schemaVersion:1`, `source:"vehicle-page"`, `canonicalVehicleId`, `timestamp`. Five-minute expiry; future, malformed, unknown, extra-field values rejected. No personal information.
- All new links navigate to `/smart-consult/` without query parameters. Existing old query links remain validated for compatibility; no new ones generated.
- Generic launcher clears pending entry, never infers a vehicle. A valid active same-tab conversation resumes; otherwise a generic greeting starts.
- A conflicting vehicle entry prompts to keep the existing consultation or start a new one. Input is paused until a choice/reset; no automatic overwrite. Same-family compatible entry resumes. Current conversation facts take precedence over historic entry ID after a correction.
- Prefill is removed before consumption. Reload resumes the independent V5 conversation key, never replays entry. Invalid/stale prefill clears and starts generic. Network/storage failure falls back safely.

## Automated evidence

- `npm run test:smart-consult-launcher`: PASS, 1,135 tracked HTML files compared to exact production baseline. Exactly 1,114 launcher blocks, 427 inline removals, 21 excluded pages unchanged. After removing ONLY exact authorized blocks, every remaining HTML byte (LF-normalized) matches. Includes all titles, H1s, descriptions, robots, JSON-LD, breadcrumbs, specs, body, existing links/CTAs, thumbnails, metadata and blog sections. Unexpected diff = 0.
- All 427 entry IDs map to canonical DB rows; expiry, malformed/fake/XSS entry, conflicting vehicle, historical-entry correction and same-entry tests PASS.
- V1 core 110; conversation 3,412; V4 989; V5 4,112 plus nine negative SEO mutations; V7 39,642 assertions / 470 specific models / 940 model phrases: PASS.
- Sitemap stability: 1,133 URLs; standalone and isolated blog generation PASS; consultation canonical occurs once, parameter URLs zero. New helper must be tracked/staged before the isolated-copy audit because it copies `git ls-files`.
- Sitewide/area service audits PASS. Blog-sync regression PASS: 345 posts, no historical loss, broken links zero, canonical changes zero, DB/search behavior protected. The search audit permits only the exact authorized launcher block and now inspects staged and unstaged changes against HEAD.
- Work-case audit PASS: 345 cases / 18 pages, order and latest homepage cases unchanged.
- IndexNow dry-run: submitted 0, SKIPPED_NO_CHANGE. No external submissions.

## Actual browser UAT (localhost:4173)

- 10 representative routes × widths 320/360/390/430/768/1280 at height 780: 60 PASS. Expected launcher visibility, count, 44px minimum target, fixed position, viewport bounds, no horizontal overflow.
- Routes: homepage, BMW 5-series, Benz C-class, Kia Carnival, Hyundai Sonata, Namyeong-dong area, battery hub, search, work-case hub, smart-consult.
- Four actual vehicle launcher clicks preload canonical names without vehicle re-entry; URL always `/smart-consult/`.
- Generic fresh entry, active BMW resume via area, stale BMW pending entry cleared from homepage, expired and injected entry ignored: PASS.
- Sonata → BMW conflict: existing preserved before choice; keep works; explicit switch works; reload restores BMW. Injected test storage consumed/cleared.
- Keyboard Tab from footer reaches launcher with solid 3px outline; Space vehicle entry and Enter generic search entry work. No focus trap.
- Long BMW page scroll: fixed launcher unchanged; at bottom footer ends above launcher clearance.
- Mobile search sheet hides launcher; original BMW → 5-series → G30 diesel 2WD search still returns AGM95 / AGM105.
- Mobile homepage and BMW, desktop BMW screenshots visually inspected. Browser warning/error log empty.

## Release gate

Owner visual inspection required before any push. The current live site remains the previous V7 deployment until separately authorized.
