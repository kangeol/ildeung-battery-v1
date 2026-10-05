import assert from "node:assert/strict";

export function readCanonicalArtifact(file, { outputs, unchanged, authorized, read }) {
  assert(authorized.has(file), `Unauthorized canonical generated artifact: ${file}`);
  if (outputs.has(file)) return Buffer.from(outputs.get(file));
  assert(unchanged.has(file), `Missing canonical generated artifact: ${file}; no unchanged marker`);
  let actual;
  try { actual = Buffer.from(read(file)); }
  catch { throw new Error(`Missing canonical generated artifact: ${file}; unchanged source unavailable`); }
  assert(actual.equals(Buffer.from(unchanged.get(file))), `Unchanged canonical artifact mismatch: ${file}`);
  return actual;
}
