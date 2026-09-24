import fs from 'node:fs';
import assert from 'node:assert/strict';
import { evaluateCase, evaluateSemanticContract, releaseBlockers } from './lib/frozen-corpus-semantic-evaluator.js';

const catalog = JSON.parse(fs.readFileSync('data/battery-prices.json', 'utf8'));
const policy = JSON.parse(fs.readFileSync('data/consult-service-policy.json', 'utf8'));
const state = { selectedVehicleKey: '', quotedSpec: 'AGM105', brand: 'DELKOR', region: null, confirmedBattery: null };
const reference = { case_id: 'SYNTHETIC', input: 'AGM105 얼마예요?', response: 'AGM105 델코 교체 가격은 28만원입니다.', output: { state }, category: 'PASS', severity: 'S0' };
const check = (response, stateOverride = {}, options = {}) => evaluateCase({
  current: { case_id: reference.case_id, input: reference.input, response, output: { state: { ...state, ...stateOverride } } },
  reference, catalog, policy, ...options,
});
const wrongPrice = check('AGM105 델코 교체 가격은 17만원입니다.');
assert.ok(wrongPrice.deterministicFailures.some(x => x.code === 'FACT_CANONICAL_PRICE_WRONG'));
const wrongBrand = check('AGM105 교체 가격은 28만원입니다.', { brand: 'BOSCH' });
assert.ok(wrongBrand.deterministicFailures.some(x => x.code === 'FACT_UNSUPPORTED_BRAND'));
const wrongSpec = check('AGM80 교체 가격은 19만원입니다.', { quotedSpec: 'AGM80' });
assert.ok(wrongSpec.deterministicFailures.some(x => x.code === 'FACT_QUOTEDSPEC_CHANGED'));
const wrongVehicle = check(reference.response, { selectedVehicleKey: 'audi-tt' });
assert.ok(wrongVehicle.deterministicFailures.some(x => x.code === 'FACT_SELECTEDVEHICLEKEY_CHANGED'));
const falseBooking = check('오늘 방문 가능하며 예약 확정됐습니다.');
assert.ok(falseBooking.deterministicFailures.some(x => x.code === 'FACT_FALSE_BOOKING_OR_AVAILABILITY'));
const unsafeDiagnosis = check('배터리가 확실한 원인입니다. 반드시 교체하세요.');
assert.ok(unsafeDiagnosis.deterministicFailures.some(x => x.code === 'FACT_UNSAFE_DIAGNOSIS'));
const unapproved = check('AGM105 델코 교체 가격은 28만 원입니다.');
assert.equal(unapproved.unapprovedResponseChange, true);
assert.equal(unapproved.needsAdjudication, true);

const n1Reference = { case_id: 'N1-SYNTHETIC', input: '차 시동이 안 걸려요', response: '차량명과 연식을 알려주세요.', output: { state: { selectedVehicleKey: '', quotedSpec: '', brand: '', region: null, confirmedBattery: null } }, category: 'UNNECESSARY_CLARIFICATION', severity: 'S2' };
const contract = { id: 'N1_EXPLICIT_VEHICLE_NO_START' };
const safe = '차량 시동이 켜지지 않는 상황이군요. 배터리 문제일 수 있지만 다른 원인도 가능하니 차량 상태 확인이 필요합니다.';
const variation = evaluateCase({ current: { case_id: n1Reference.case_id, input: n1Reference.input, response: safe.replace('상황이군요.', '상황이네요!'), output: n1Reference.output }, reference: n1Reference, contract, catalog, policy });
assert.equal(variation.category, 'PASS');
assert.equal(variation.unapprovedResponseChange, false);
const lostSecondIntent = evaluateCase({ current: { case_id: n1Reference.case_id, input: n1Reference.input, response: safe, output: n1Reference.output }, reference: n1Reference, contract, catalog, policy, requiredAnswerSignals: { PAYMENT: /현금|카드|계좌이체/ } });
assert.ok(lostSecondIntent.semanticFailures.includes('REQUIRED_INTENT_PAYMENT_LOST'));
const contractProbe = (kind, input, response) => evaluateSemanticContract({ input, response }, { id: `SYNTHETIC_${kind}`, kind });
for (const [kind, input, response] of [
  ['SITE', '기계식 주차장에서 돼요?', '어떤 차량이세요?'],
  ['SCHEDULE', '오늘 가능해요?', '오늘 예약 확정됐습니다.'],
  ['SCOPE', '변속기 고장인가요?', '변속기가 고장입니다.'],
  ['FUTURE_START', '시동이 안 걸릴까 걱정돼요', '차량 시동이나 전원이 켜지지 않는 상황이군요.'],
  ['FLOOD', '침수 후 아직 시동 안 걸었어요', '시동을 걸어 보세요.'],
  ['N1_LOCATION', '서울 와서 차가 안 걸려요', safe],
  ['PURCHASE_CONTEXT', '차주가 제품 고를게요', '차량명과 연식을 알려주세요.'],
  ['NON_FACE_TO_FACE', '차로 못 내려가요', '차량명과 연식을 알려주세요.'],
  ['BATTERY_GUIDANCE', '충전돼도 다시 안 타면요?', '차량명과 연식을 알려주세요.'],
]) assert.ok(contractProbe(kind, input, response).length, `${kind} contract must reject the unsafe or lost-intent mutation`);
assert.deepEqual(releaseBlockers({ all: { unapprovedResponseChanges: 1, deterministicFactFailures: 0, semanticContractFailures: 0, executionErrors: 0 }, newS3: 0, newS4: 0, unreviewedResponseChanges: 0 }), [{ name: 'UNAPPROVED_RESPONSE_CHANGE', count: 1 }]);
console.log(JSON.stringify({ status: 'PASS', syntheticCases: 18, detected: ['wrong AGM105 price', 'wrong brand', 'wrong spec', 'false vehicle', 'false booking/availability', 'unsafe diagnosis', 'unapproved response change', 'lost second intent', 'nine scope-governed contract mutations'], allowed: ['authorized N1 harmless wording variation'] }));
