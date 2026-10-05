import assert from "node:assert/strict";
import { validatedBatches, submitBatches, caseContentFingerprint } from "./lib/indexnow-batches.js";
const card='<article class="blog-case-card"><a href="/actual">Actual title</a></article>';
assert.equal(caseContentFingerprint(card),caseContentFingerprint(card.replace('class="blog-case-card"','class="blog-case-card" data-case-id="1" data-case-tier="V1" data-case-relation="exact"')));
assert.notEqual(caseContentFingerprint(card),caseContentFingerprint(card.replace('Actual title','Other title')));
assert.notEqual(caseContentFingerprint(card+card.replace('Actual title','Other title')),caseContentFingerprint(card.replace('Actual title','Other title')+card));
for (const n of [0, 1, 100, 101, 200, 201]) {
  const input = Array.from({ length: n }, (_, i) => `https://battery1.co.kr/area/test-${i}.html`);
  const { urls, batches } = validatedBatches([...input].reverse());
  assert.equal(batches.length, Math.ceil(n / 100));
  assert.deepEqual(batches.flat(), urls);
  assert.deepEqual(validatedBatches([...input, ...input]).urls, urls);
  assert.deepEqual(validatedBatches(input), validatedBatches([...input].reverse()));
  const result = await submitBatches(input, async () => ({ status: "ACCEPTED", httpStatus: 200 }));
  assert.equal(result.submittedUrls, n);
  assert.equal(result.omitted, 0);
}
assert.equal(validatedBatches(["https://other.test/", "http://battery1.co.kr/", "https://battery1.co.kr/?q=1", "https://battery1.co.kr/#x", "bad"]).urls.length, 0);
let calls = 0;
const failed = await submitBatches(Array.from({ length: 201 }, (_, i) => `https://battery1.co.kr/${i}.html`), async () => ({ status: ++calls === 2 ? "FAILED" : "ACCEPTED", httpStatus: calls === 2 ? 500 : 200 }));
assert.equal(failed.status, "FAILED");
assert.equal(failed.failedBatches, 1);
assert.equal(failed.attemptedUrls, 201);
assert.equal(failed.submittedUrls, 101);
assert.equal(failed.omitted, 0);
assert.equal(calls, 3);
console.log("IndexNow batching tests PASS");
