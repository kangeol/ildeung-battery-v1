import assert from 'node:assert/strict';
import fs from 'node:fs';
import { conversationTurn, createConversationState } from '../js/smart-consult-conversation.js';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const records = read('data/manufacturers.json').flatMap(m => read(`data/${m.file}`).map(row => ({ ...row, manufacturerId: m.id, manufacturerName: m.name })));
const areas = read('seo-data/smart-consult-location-index.json').localities;
const prices = read('data/battery-prices.json');
const policy = read('data/consult-service-policy.json');
const names = 'CORE_BATTERY_INTENT_LOST CONVERSION_SERVICE_INTENT_LOST LOCATION_WORKSITE_INTENT_LOST SCHEDULE_INTENT_LOST PAYMENT_PRICE_INTENT_LOST MULTI_INTENT_LOST SHORT_FOLLOWUP_CONTEXT_LOST STALE_CONTEXT_OVERRIDE OUT_OF_SCOPE_VEHICLE_INTERROGATION OUT_OF_SCOPE_DIAGNOSIS_FABRICATED UNSUPPORTED_SERVICE_FABRICATED FLOOD_UNSAFE_GUIDANCE FALSE_BOOKING_CONFIRMATION FALSE_PRICE FALSE_SPEC FALSE_BRAND FALSE_VEHICLE TIER3_DIAGNOSIS_OVERCLAIM'.split(' ');
const counters = Object.fromEntries(names.map(name => [name, 0]));
const failures = [];
let turns = 0;
const check = (name, good, input) => { if (!good) { counters[name]++; failures.push({ name, input }); } };
const one = (input, state = createConversationState()) => {
  turns++;
  const out = conversationTurn(state, input, records, areas, prices, policy);
  const answer = out.messages.join(' ');
  check('FALSE_BOOKING_CONFIRMATION', !/(?:예약|접수).{0,8}(?:완료|확정됐)/.test(answer), input);
  check('TIER3_DIAGNOSIS_OVERCLAIM', !/(?:배터리|시동모터|발전기|연료계통).{0,16}(?:확실한 원인|고장입니다)/.test(answer), input);
  check('FALSE_PRICE', !/\d+\s*만원/.test(answer) || /AGM\s*\d+|BMW\s*5/.test(input), input);
  return { out, answer };
};
const session = inputs => { let state = createConversationState(); return inputs.map(input => { const answer = one(input, state); state = answer.out.state; return answer; }); };
const vehiclePrompt = /차량명과 연식|어떤 차량이세요|차량을 정확하게 찾지 못/;

for (const input of ['시동을 끄면 또 안 걸릴까 걱정돼요', '시동 끄고 나면 안 걸릴 수 있다던데요', 'V2L 뒤에 시동이 안 켜질 수도 있나요']) {
  const { out, answer } = one(input);
  check('STALE_CONTEXT_OVERRIDE', out.state.symptom?.intent !== 'NO_START' && !/켜지지 않는 상황이군요/.test(answer), input);
}
for (const input of ['차 시동이 안 걸려요', '지금 시동이 안 걸립니다', '차가 아예 안 켜져요']) {
  const { answer } = one(input);
  check('CORE_BATTERY_INTENT_LOST', /진단을 확정할 수 없습니다/.test(answer) && !vehiclePrompt.test(answer), input);
}
for (const input of ['시동이 안 걸리면 기계식 주차장에서 못 빼는데요', '주차장 바닥이 경사져 있어요', '보닛 앞 공간은 넓어요', '관리자가 외부 작업을 허락했어요']) {
  const { answer } = one(input);
  check('LOCATION_WORKSITE_INTENT_LOST', /접근 가능 조건/.test(answer) && !vehiclePrompt.test(answer), input);
}
for (const input of ['서울에 왔는데 차가 안 걸려요', '연천에서 서울 왔다가 차가 먹통이에요']) {
  const { answer } = one(input);
  check('MULTI_INTENT_LOST', /출장 배터리 교체 가능 권역/.test(answer) && /진단을 확정할 수 없습니다/.test(answer), input);
}
for (const input of ['주차장에 물이 들어온 뒤 차가 안 켜져요', '차가 물에 잠겼는데 아직 시동 안 걸어봤어요']) {
  const { answer } = one(input);
  check('FLOOD_UNSAFE_GUIDANCE', /현장 전문가/.test(answer) && !/안전하게 시동|시동을 걸어 보/.test(answer), input);
}
for (const input of ['전기차 화면만 안 켜져요', '리모컨도 안 되고 문이 잠겼어요', '제가 연결을 잘못했을 수도 있어요', '직접 해도 되는지 물어봐요']) {
  const { answer } = one(input);
  check('OUT_OF_SCOPE_VEHICLE_INTERROGATION', /배터리 교체 상담/.test(answer) && !vehiclePrompt.test(answer), input);
  check('OUT_OF_SCOPE_DIAGNOSIS_FABRICATED', !/원인은|고장입니다|반드시 교체/.test(answer), input);
}
const contextCases = [
  { turns: ['차가 안 걸려요', '아이들이 기다려서 집으로 보냈어요'], last: /실시간 확인/ },
  { turns: ['차가 안 걸려요', '진료 중이라 차로 못 내려가요'], last: /비대면 교체/ },
  { turns: ['차가 안 걸려요', '주차장 바닥이 경사져 있어요', '보닛 앞 공간은 넓어요'], last: /접근 가능 조건/ },
  { turns: ['차가 안 걸려요', '한 달 넘게 안 탔어요', '충전돼도 다시 안 타면 똑같겠죠'], last: /장기주차/ },
];
for (const item of contextCases) {
  const answers = session(item.turns);
  check('SHORT_FOLLOWUP_CONTEXT_LOST', item.last.test(answers.at(-1).answer) && !vehiclePrompt.test(answers.at(-1).answer), item.turns.join(' -> '));
}
const schedule = one('시동이 안 걸리는데 오늘 교체 가능해요?');
check('SCHEDULE_INTENT_LOST', /실시간 확인/.test(schedule.answer), '시동이 안 걸리는데 오늘 교체 가능해요?');
const payment = one('시동이 안 걸리는데 현금 되나요?');
check('PAYMENT_PRICE_INTENT_LOST', /현금/.test(payment.answer), '시동이 안 걸리는데 현금 되나요?');
const price = one('AGM105 얼마예요?');
check('FALSE_SPEC', /AGM105/.test(price.answer), 'AGM105 얼마예요?');
check('FALSE_BRAND', !/바르타/.test(price.answer) || /델코/.test(price.answer), 'AGM105 얼마예요?');
check('FALSE_VEHICLE', !/아우디 TT|폭스바겐 CC/.test(price.answer), 'AGM105 얼마예요?');
check('CONVERSION_SERVICE_INTENT_LOST', /가격|만원/.test(price.answer), 'AGM105 얼마예요?');
check('UNSUPPORTED_SERVICE_FABRICATED', !/블랙박스 설치|견인해 드리|수리해 드리/.test(session(['블랙박스가 안 켜져요'])[0].answer), '블랙박스가 안 켜져요');

console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', focusedTurns: turns, counters, failures }));
assert.deepEqual(failures, []);
