# V7 regression harness repair

Baseline: main e71c422e, origin/main d179e306, ahead 6 / behind 0, clean.

Reproduced the unchanged `npm run test:smart-consult-v5` failure in
`tools/test-smart-consult-v5.js`: the whole-page comparison against `90eb274e`
failed on `car-battery/chevrolet/impala.html`. The actual additional
`blogCases-chevrolet-impala` section contains the authorized post 224416785719.
Comparing all 427 vehicle pages against d179e306 after removing their one
smart-consult CTA proves the merged blog content is intact.

The repaired helper pins the owner-authorized remote lineage d179e306 and
verifies it is parent 2 of e71c422e. A moving remote is never trusted implicitly.
Future authorized sync baselines require a reviewed baseline update. Production
HTML is untouched. The comparison still protects the ENTIRE page and removes
only one byte-exact expected CTA line (after LF/CRLF normalization), not arbitrary
matching lines or entire blog regions.

In-memory negative fixtures deliberately mutate title, H1, canonical, schema,
specifications, an existing CTA, duplicate consultation CTA, malformed markup,
and removal of the authorized blog section. All nine must fail the same
assertion; the original fixture must pass again. No production fixture edits.

Result: FALSE_POSITIVE_FIXED=YES; FALSE_NEGATIVE_PROTECTION=PASS.
V5 suite: 4112 assertions, all 427 pages protected. No push.
