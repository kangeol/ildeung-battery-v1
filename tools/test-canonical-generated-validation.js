import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readCanonicalArtifact } from "./lib/canonical-generated-artifact.js";
import { observeGeneratedFiles, writeGeneratedFile } from "./lib/generated-file-writer.js";

const file = "seo-data/vehicle-detail-groups.json";
const expected = '{"vehiclePages":[],"detailPages":[]}\n';
const options = () => ({ outputs: new Map(), unchanged: new Map(), authorized: new Set([file]), read: () => expected });
const rejects = (fn, message) => assert.throws(fn, (error) => !(error instanceof TypeError) && message.test(error.message));
for (const value of [expected, Buffer.from(expected)]) {
  const o = options();
  o.outputs.set(file, value);
  o.read = () => { throw new Error("Disk must not replace emitted output"); };
  assert.equal(readCanonicalArtifact(file, o).toString(), expected);
}
const noWrite = options();
noWrite.unchanged.set(file, Buffer.from(expected));
assert.equal(readCanonicalArtifact(file, noWrite).toString(), expected);
rejects(() => readCanonicalArtifact(file, options()), /no unchanged marker/);
rejects(() => readCanonicalArtifact(file, { ...noWrite, read: () => { throw new Error("ENOENT"); } }), /source unavailable/);
rejects(() => readCanonicalArtifact(file, { ...noWrite, read: () => "corrupt" }), /mismatch/);
rejects(() => readCanonicalArtifact(file, { ...noWrite, authorized: new Set() }), /Unauthorized/);
const changed = options();
changed.outputs.set(file, "different computed bytes");
rejects(() => assert.equal(readCanonicalArtifact(file, changed).toString(), expected, "canonical mismatch"), /canonical mismatch/);

const root = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(root, "ildeung-generated-writer-test-"));
const target = path.join(temp, "vehicle-detail-groups.json");
const events = [];
const stop = observeGeneratedFiles((event) => events.push(event));
try {
  writeGeneratedFile(target, expected);
  const time = fs.statSync(target).mtimeMs;
  writeGeneratedFile(target, Buffer.from(expected));
  assert.deepEqual(events.map((event) => event.unchanged), [false, true]);
  assert.equal(fs.statSync(target).mtimeMs, time);
  const o = { outputs: new Map(), unchanged: new Map([[target, events[1].expected]]), authorized: new Set([target]), read: fs.readFileSync };
  assert.equal(readCanonicalArtifact(target, o).toString(), expected);
  fs.writeFileSync(target, "corrupt");
  rejects(() => readCanonicalArtifact(target, o), /mismatch/);
  fs.unlinkSync(target);
  rejects(() => readCanonicalArtifact(target, o), /source unavailable/);
} finally {
  stop();
  assert.equal(path.dirname(fs.realpathSync(temp)), root);
  fs.rmSync(temp, { recursive: true });
}
console.log("Canonical generated validation PASS: emitted, no-write marker, missing, unauthorized, corruption, Buffer/string, detail-groups regression");
