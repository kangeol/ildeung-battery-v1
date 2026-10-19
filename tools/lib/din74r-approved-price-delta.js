import assert from 'node:assert/strict';

// Owner-approved 2026-10-19 delta; historical inputs must retain the old value.
export function approvedDin74rPrices(before) {
  assert.equal(before.DIN74R,130000,'historical DIN74R price');
  return {...before,DIN74R:140000};
}
