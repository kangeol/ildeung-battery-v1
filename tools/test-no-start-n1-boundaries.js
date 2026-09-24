import assert from 'node:assert/strict';
import fs from 'node:fs';
import { conversationTurn, createConversationState, explicitVehicleNoStart } from '../js/smart-consult-conversation.js';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const records = read('data/manufacturers.json').flatMap(m => read(`data/${m.file}`).map(r => ({ ...r, manufacturerId: m.id, manufacturerName: m.name })));
const areas = read('seo-data/smart-consult-location-index.json').localities;
const prices = read('data/battery-prices.json');
const policy = read('data/consult-service-policy.json');
const names = 'N1_GENERIC_NEGATION_FALSE_POSITIVE N1_HYPOTHETICAL_AS_ACTUAL N1_NOT_ATTEMPTED_AS_FAILURE N1_ACTUAL_FAILURE_MISSED N1_OTHER_INTENT_DROPPED N1_PRICE_INTENT_DROPPED N1_LOCATION_ACCESS_INTENT_DROPPED N1_STALE_CONTEXT_OVERRIDE N1_BATTERY_CAUSE_OVERCLAIM N1_OTHER_CAUSE_OVERCLAIM N1_UNSAFE_FLOOD_GUIDANCE N1_PRICE_FABRICATED N1_LIVE_AVAILABILITY_FABRICATED N1_VEHICLE_FIRST_UNNECESSARY'.split(' ');
const counters = Object.fromEntries(names.map(name => [name, 0]));
const failures = [], evidence = [];
const check = (name, passed, input) => { if (!passed) { counters[name]++; failures.push({ name, input }); } };
const turn = (input, previous = createConversationState()) => {
  const output = conversationTurn(previous, input, records, areas, prices, policy);
  const answer = output.messages.join(' ');
  evidence.push({ input, answer, lastIntent: output.state.lastIntent, symptom: output.state.symptom });
  check('N1_BATTERY_CAUSE_OVERCLAIM', !/배터리(?:가|때문에).{0,12}(?:확실|원인입니다|고장입니다)/.test(answer), input);
  check('N1_OTHER_CAUSE_OVERCLAIM', !/(?:시동모터|알터네이터|이모빌라이저|연료계통).{0,12}(?:고장입니다|원인입니다)/.test(answer), input);
  check('N1_PRICE_FABRICATED', !/\d+\s*만원|\d{2,3},?000\s*원/.test(answer) || /AGM|DIN|DF|BMW/.test(input), input);
  check('N1_LIVE_AVAILABILITY_FABRICATED', !/(?:예약|접수).{0,8}(?:완료|확정(?!하지))|바로 출발합니다/.test(answer), input);
  return { output, answer };
};

const positives = ['차 시동이 안 걸려요', '차가 아예 안 켜져요', '시동 버튼 눌러도 차가 안 켜져요', '지금 시동이 안 걸립니다', 'BMW5 2020인데 시동이 안 걸려요'];
for (const input of positives) {
  const { output, answer } = turn(input);
  check('N1_ACTUAL_FAILURE_MISSED', explicitVehicleNoStart(input) && output.state.lastIntent === 'N1_EXPLICIT_NO_START' && /진단을 확정할 수 없습니다/.test(answer), input);
  check('N1_VEHICLE_FIRST_UNNECESSARY', !/차량명과 연식|어떤 차량이세요/.test(answer), input);
}
const negatives = ['회차가 안 됩니다', '주차가 안 됩니다', '결제가 안 됩니다', '예약이 안 됩니다', '문이 안 열립니다', '블랙박스가 안 켜져요', '휴대폰이 안 켜져요'];
for (const input of negatives) {
  const { output, answer } = turn(input);
  check('N1_GENERIC_NEGATION_FALSE_POSITIVE', !explicitVehicleNoStart(input) && output.state.lastIntent !== 'N1_EXPLICIT_NO_START' && !/차량 시동이나 전원이/.test(answer), input);
}
for (const input of ['시동이 안 걸리면 가격이 얼마예요?', '만약 시동이 안 걸리면 와주시나요?', '시동 안 걸릴 경우 교체비는 어떻게 되나요']) {
  const { output, answer } = turn(input);
  check('N1_HYPOTHETICAL_AS_ACTUAL', !explicitVehicleNoStart(input) && output.state.symptom?.intent !== 'NO_START' && !/차량 시동이나 전원이/.test(answer), input);
}
for (const input of ['아직 시동 안 걸었어요', '아직 시동 안 걸어봤어요', '오늘은 시동 안 걸고 세워뒀어요']) {
  const { output, answer } = turn(input);
  check('N1_NOT_ATTEMPTED_AS_FAILURE', !explicitVehicleNoStart(input) && output.state.symptom?.intent !== 'NO_START' && !/차량 시동이나 전원이/.test(answer), input);
}

const site = turn('골목이 막다른 길이라 회차가 안 됩니다');
check('N1_LOCATION_ACCESS_INTENT_DROPPED', /접근 가능 조건/.test(site.answer) && site.output.state.lastIntent === 'OP_SITE', 'S0489');
const price = turn('시동이 안 걸리면 교체비는 어떻게 되나요');
check('N1_PRICE_INTENT_DROPPED', price.output.state.priceIntent && /배터리 규격|차량/.test(price.answer) && !/시동이나 전원/.test(price.answer), 'S1020');
let state = createConversationState();
for (const input of ['침수된 건지 방전인지 모르겠어요', '주차장에 물이 차서 타이어 반쯤 잠겼습니다']) state = turn(input, state).output.state;
const flooded = turn('물은 빠졌지만 아직 시동 안 걸었어요', state);
check('N1_STALE_CONTEXT_OVERRIDE', flooded.output.state.lastIntent === 'SAFETY_FLOOD_SCOPE' && flooded.output.state.symptom?.intent !== 'NO_START', 'C057-T3');
check('N1_UNSAFE_FLOOD_GUIDANCE', /현장 전문가/.test(flooded.answer) && !/시동을 걸어보세요|안전하게 시동/.test(flooded.answer), 'C057-T3');
for (const input of ['차 시동이 안 걸리는데 오늘 교체 가능해요?', '시동이 안 걸려요 현금 돼요?']) {
  const { answer } = turn(input);
  check('N1_OTHER_INTENT_DROPPED', /실시간|현금결제/.test(answer), input);
}

console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', focusedTurns: evidence.length, counters, failures, evidence }));
assert.deepEqual(failures, []);
