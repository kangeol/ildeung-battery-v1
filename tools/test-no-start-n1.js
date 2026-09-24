import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { conversationTurn, createConversationState, explicitVehicleNoStart } from '../js/smart-consult-conversation.js';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const records = read('data/manufacturers.json').flatMap(m => read(`data/${m.file}`).map(r => ({ ...r, manufacturerId: m.id, manufacturerName: m.name })));
const areas = read('seo-data/smart-consult-location-index.json').localities;
const prices = read('data/battery-prices.json');
const policy = read('data/consult-service-policy.json');
const source = [
  ['S0061', '밤 근무 끝났는데 차가 안 켜져요'],
  ['S0391', '강아지 병원 가려는데 차가 안 걸려요'],
  ['S0454', '야간조 출근 전에 차가 안 켜져요'],
  ['S0694', 'My car will not start in Anyang'],
  ['S0732', '장날 가야 하는데 차가 안 켜져요'],
  ['S0931', '새벽 시장 가기 전에 차가 안 돼요'],
  ['S1361', '차를 하루 세웠는데 완전히 먹통입니다'],
  ['N0011', '애등원시켜야되는데 차먹통ㅠㅠ'],
  ['N0081', '캠핑장인데 차안켜짐ㅠ'],
  ['N0160', '기숙사앞 차안켜짐ㅠ'],
  ['N0181', '하남몰 지하에서먹통 ㅠ'],
  ['N0231', 'car no start help pls'],
  ['N0249', '장날나가야는데 먹통이네'],
  ['N0351', '서울왔다가차죽음ㅠ 연천가야돼요'],
  ['N0361', '포천펜션 차먹통 ㅠ'],
  ['N0395', '장보러가야는데차안됨'],
  ['C002-T1', '등원하려고 나왔는데 차가 안 되네요'],
  ['C047-T1', '빌린 차가 안 걸려요'],
  ['C138-T1', '배송 끝나고 교체하려고 했는데 다시 안 걸려요'],
  ['C205-T1', '차 두 대가 있는데 하나만 안 걸려요'],
  ['C265-T1', '장날 가려다 차가 안 걸렸습니다'],
  ['C270-T1', '진료가 끝났는데 차가 안 됩니다'],
  ['C308-T1', '한 달 안 탄 차가 먹통입니다'],
  ['C314-T1', '파주 동물병원에서 차가 안 걸립니다'],
  ['C337-T1', '포천 숙소에서 차가 먹통입니다'],
];
const positives = [
  '차 시동이 안 걸려요', '차가 안켜져요ㅠ', '차량 시동이 걸리지 않습니다',
  '자동차 시동 못 걸겠어요', '차 전원이 안 켜져요', '차를 세워뒀는데 먹통이에요',
  '빌린 차가 안 걸립니다', 'car no start', 'my car won\'t start',
  '장보러 가려는데 차가 안 됩니다', '주차장에서 차먹통', '차가 아예 안 켜지네요',
];
const exclusions = [
  '시동이 약해요', '한 번에 안 걸리고 두세 번 해야 걸려요', '가끔 안 걸려요',
  'LPG 차가 아침에 안 걸리네요', '따닥 소리만 나요', '계기판은 켜져요', '불은 들어오는데요',
  'READY가 안 떠요', '하이브리드 READY 표시', '배터리 죽은 것 같아요', '배터리가 나간 것 같아요',
  '차가 안 움직여요', '차가 멈췄어요', '친구차빌렷는데이래요ㅠ', '안돼요', '이래요',
];
const nonvehicles = [
  '휴대폰이 안 켜져요', '컴퓨터가 안 켜져요', '블랙박스가 안 켜져요', '에어컨이 안 켜져요',
  '라디오가 안 켜져요', '집 전등이 안 켜져요', '주차장에서 휴대폰이 먹통이에요',
];
const multi = [
  ['차 시동이 안 걸리는데 오늘 교체 가능해요?', /실시간/],
  ['차가 안 켜져요 가격은 얼마예요?', /어떤 차량|차량마다/],
  ['시동이 안 걸려요 현금 돼요?', /현금결제/],
  ['차가 아예 안 켜지는데 회사 주차장으로 올 수 있어요?', /안전성|접근/],
];
const sessions = [
  ['차 시동이 안 걸려요', '배터리 문제예요?', '그럼 교체해야 돼요?', '제 차는 BMW 5시리즈 2020이에요'],
  ['차가 아예 안 켜져요', '오늘 가능해요?', '차량은 E300 2020이에요', '가격은요?'],
  ['시동이 안 걸려요', '현금 돼요?', '배터리는 뭘 써요?'],
  ['차가 안 켜져요', '아니 휴대폰 말고 차요'],
  ['BMW5 2020인데 시동이 안 걸려요', '가격은요?', '네', '가격은요?'],
];
const gateNames = 'N1_EXPLICIT_NOSTART_MISSED N1_UNNECESSARY_VEHICLE_FIRST N1_BATTERY_CAUSE_OVERCLAIM N1_OTHER_CAUSE_OVERCLAIM N1_REPLACEMENT_FALSE_CONFIRM N1_SPEC_FABRICATED N1_PRICE_FABRICATED N1_LIVE_AVAILABILITY_FABRICATED N1_MULTI_INTENT_LOST N1_SESSION_CONTEXT_LOST N1_EXCLUSION_FALSE_POSITIVE N1_NONVEHICLE_FALSE_POSITIVE N1_REPEATED_VEHICLE_QUESTION N1_MINIMUM_RESPONSE_MISSING'.split(' ');
const counters = Object.fromEntries(gateNames.map(key => [key, 0]));
const failures = [], evidence = [];
const check = (key, pass, id) => { if (!pass) { counters[key]++; failures.push({ key, id }); } };
const turn = (input, state = createConversationState()) => {
  const output = conversationTurn(state, input, records, areas, prices, policy);
  evidence.push({ input, response: output.messages, state: output.state });
  const answer = output.messages.join(' ');
  check('N1_BATTERY_CAUSE_OVERCLAIM', !/배터리(?:가|때문에).*확실|배터리 고장입니다/.test(answer), input);
  check('N1_OTHER_CAUSE_OVERCLAIM', !/시동모터|알터네이터|이모빌라이저|연료계통.*(?:고장|원인)/.test(answer), input);
  check('N1_REPLACEMENT_FALSE_CONFIRM', !/무조건 교체|반드시 교체/.test(answer), input);
  check('N1_SPEC_FABRICATED', !explicitVehicleNoStart(input, state) || /BMW|벤츠|E300|5시리즈/.test(input) || !/AGM\d+|DIN\d+/.test(answer), input);
  check('N1_PRICE_FABRICATED', !explicitVehicleNoStart(input, state) || /AGM|DIN|DF|BMW|E300/.test(input) || !/\d+만원|\d{2,3},?000원/.test(answer), input);
  check('N1_LIVE_AVAILABILITY_FABRICATED', !/(?:오늘|지금).*(?:확정|예약 완료)|바로 출발합니다/.test(answer), input);
  return output;
};
for (const [id, input] of source) {
  check('N1_EXPLICIT_NOSTART_MISSED', explicitVehicleNoStart(input), id);
  const out = turn(input), answer = out.messages.join(' ');
  check('N1_UNNECESSARY_VEHICLE_FIRST', !/차량명|연식|차량마다|어떤 차량/.test(answer), id);
  check('N1_MINIMUM_RESPONSE_MISSING', /진단을 확정할 수 없습니다/.test(answer) && /차량 상태 확인/.test(answer), id);
}
for (const input of positives) {
  check('N1_EXPLICIT_NOSTART_MISSED', explicitVehicleNoStart(input), input);
  const out = turn(input);
  check('N1_UNNECESSARY_VEHICLE_FIRST', !/차량명|연식|차량마다|어떤 차량/.test(out.messages.join(' ')), input);
}
for (const input of exclusions) check('N1_EXCLUSION_FALSE_POSITIVE', !explicitVehicleNoStart(input), input);
for (const input of nonvehicles) check('N1_NONVEHICLE_FALSE_POSITIVE', !explicitVehicleNoStart(input), input);
for (const [input, otherPattern] of multi) {
  const out = turn(input), answer = out.messages.join(' ');
  check('N1_MULTI_INTENT_LOST', /진단을 확정할 수 없습니다/.test(answer) && otherPattern.test(answer), input);
}
for (const [index, flow] of sessions.entries()) {
  let state = createConversationState();
  for (const [turnIndex, input] of flow.entries()) {
    const out = turn(input, state);
    state = out.state;
    if (turnIndex === 0) check('N1_SESSION_CONTEXT_LOST', Boolean(state.symptom) && state.lastIntent === 'N1_EXPLICIT_NO_START', input);
    if (index === 3 && turnIndex === 1) check('N1_SESSION_CONTEXT_LOST', /차량 시동/.test(out.messages.join(' ')), input);
    if (index === 4 && turnIndex === 1) check('N1_REPEATED_VEHICLE_QUESTION', /5시리즈 말씀/.test(out.messages.join(' ')), input);
  }
}
const result = { source: source.length, focusedTurns: evidence.length, exclusions: exclusions.length, nonvehicles: nonvehicles.length, counters, failures };
fs.writeFileSync(`${os.tmpdir()}/n1-no-start-focused.json`, JSON.stringify({ ...result, evidence }, null, 2));
console.log(JSON.stringify(result));
assert.deepEqual(failures, []);
if (import.meta.url !== pathToFileURL(process.argv[1]).href) throw Error('Run directly');
