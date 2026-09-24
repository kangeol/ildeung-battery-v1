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

// Tier2 conversion contracts: independent service requests must survive a
// symptom/urgency plan, while location/product homonyms remain separate.
const tier2Names='TIER2_INTENT_DISPLACED_BY_SYMPTOM SERVICE_AREA_WRONG LOCATION_CONTEXT_LOST WORKSITE_CONTEXT_LOST NON_FACE_TO_FACE_INTENT_LOST SCHEDULE_INTENT_LOST LIVE_AVAILABILITY_FABRICATED ARRIVAL_TIME_FABRICATED ACCESS_GUARANTEE_FABRICATED PRICE_WRONG TOTAL_PRICE_WRONG INCLUDED_COST_WRONG PAYMENT_POLICY_WRONG PURCHASE_CHOICE_LOST FALSE_RESERVATION_COMPLETION CHANGE_CANCEL_CONTEXT_LOST MULTI_INTENT_PARTIAL SHORT_FOLLOWUP_CONTEXT_LOST UNNECESSARY_VEHICLE_RESTART BRAND_COMPARISON_FALSE_POSITIVE TEMPORAL_DONGAN_FALSE_LOCATION SUPPORTED_AREA_FALSE_NEGATIVE DIAGNOSIS_OVERCLAIM'.split(' ');
const tier2Counters=Object.fromEntries(tier2Names.map(name=>[name,0]));
const tier2Failures=[];
let tier2Turns=0;
const verify=(name,good,input)=>{if(!good){tier2Counters[name]++;tier2Failures.push({name,input});}};
const tier2Turn=(input,state=createConversationState())=>{
  tier2Turns++;
  const out=conversationTurn(state,input,records,areas,prices,policy),answer=out.messages.join(' ');
  verify('FALSE_RESERVATION_COMPLETION',!/예약.{0,8}(?:완료|확정됐)|접수.{0,8}(?:완료|확정됐)/.test(answer),input);
  verify('LIVE_AVAILABILITY_FABRICATED',!/오늘.{0,15}(?:확정|출발합니다)|바로 배차됐/.test(answer),input);
  verify('ARRIVAL_TIME_FABRICATED',!/(?:도착|방문).{0,8}\d{1,2}시.{0,6}(?:예정|확정)/.test(answer),input);
  verify('ACCESS_GUARANTEE_FABRICATED',!/출입을 보장합니다|진입이 확정됐|주차 허가를 받았습니다/.test(answer),input);
  verify('DIAGNOSIS_OVERCLAIM',!/배터리(?:가|때문에).{0,12}(?:확실|원인입니다)|반드시 배터리/.test(answer),input);
  verify('BRAND_COMPARISON_FALSE_POSITIVE',!/어떤 제품이나 브랜드를 비교/.test(answer)||/브랜드|델코|바르타|제품/.test(input),input);
  return {out,answer};
};
const tier2Session=questions=>{let state=createConversationState();return questions.map(input=>{const reply=tier2Turn(input,state);state=reply.out.state;return reply;});};
const symptomServices=[
  ['차 시동이 안 걸리는데 회사 지하주차장에서 비대면 교체돼요?',/진단을 확정.*접근 가능 조건.*비대면 교체/],
  ['방전된 것 같은데 오늘 현금으로 교체 가능해요?',/실시간 확인.*진단을 확정.*현금결제/],
  ['서울 마포구 오피스텔 지하 3층에 차가 있는데 아침 출근 전에 시동이 안 걸려요 출장비와 설치비, 기존 배터리 회수까지 견적에 들어가나요?',/출장교체비용과 공임이 포함/],
  ['서울 마포구 오피스텔 지하 3층에 차가 있는데 아침 출근 전에 시동이 안 걸려요 제가 자리를 비우더라도 비대면으로 작업을 맡길 수 있을까요?',/비대면 교체가 가능/],
  ['서울 마포구 오피스텔 지하 3층에 차가 있는데 아침 출근 전에 시동이 안 걸려요 차 키를 기사님께 전달해야 한다면 안전하게 맡기는 방법이 있나요?',/키 인계·보관 방법/],
  ['서울 마포구 오피스텔 지하 3층에 차가 있는데 아침 출근 전에 시동이 안 걸려요 접수한 뒤 위치나 시간을 바꾸거나 취소하려면 어떻게 해야 하나요?',/변경.*취소|취소.*변경/],
  ['서울 마포구 오피스텔 지하 3층에 차가 있는데 아침 출근 전에 시동이 안 걸려요 교체 후 같은 증상이 생기면 A\/S 접수는 어디로 하면 되나요?',/설치일 기준 3개월/],
  ['인천 송도 아파트에 장기 주차한 차가 한 달 만에 시동이 안 걸려요 이곳으로 출장 배터리 교체를 요청할 수 있을까요?',/출장.*가능 지역|동이나 구/],
  ['인천 송도 아파트에 장기 주차한 차가 한 달 만에 시동이 안 걸려요 접수할 때 인천 송도 아파트 안에서 정확히 어디에 있는지 어떻게 전달하면 될까요?',/정확한 위치와 현장 접근 조건/],
  ['인천 송도 아파트에 장기 주차한 차가 한 달 만에 시동이 안 걸려요 기사님 배정이 되면 대략 몇 시쯤 도착하는지 알 수 있을까요?',/실시간 확인/]
];
for(const [input,expected] of symptomServices){const {answer}=tier2Turn(input);verify('TIER2_INTENT_DISPLACED_BY_SYMPTOM',expected.test(answer),input);verify('MULTI_INTENT_PARTIAL',expected.test(answer),input);}
for(const input of ['주소가 달라졌어요','차 있는 곳이 달라요','예약 장소가 달라졌는데요','시간이 달라졌어요','아까 말한 위치랑 달라요','접수한 주소와 실제 차량 위치가 달라졌습니다 변경된 차량 위치까지 출장 가능한 지역인지 확인해 주실 수 있나요?']){
  const {answer}=tier2Turn(input);verify('BRAND_COMPARISON_FALSE_POSITIVE',!/브랜드를 비교|델코와 바르타 비교/.test(answer),input);
}
for(const input of ['델코랑 바르타 가격 달라요?','두 브랜드 뭐가 달라요?','AGM70 델코 바르타 차이?']){
  const {answer}=tier2Turn(input);verify('PRICE_WRONG',/델코|바르타/.test(answer),input);
}
for(const input of ['기다리는 동안','작업하는 동안','점심시간 동안','한 시간 동안','오는 동안','교체하는 동안','주차해두는 동안','기다리는 동안 차를 다른 자리로 옮기면 알려드려야 하나요?']){
  const {answer,out}=tier2Turn(input);verify('TEMPORAL_DONGAN_FALSE_LOCATION',!/동안구/.test(answer)&&out.state.region?.district!=='동안구',input);
}
for(const input of ['안양 동안구','동안구','경기 안양시 동안구','동안구 평촌동','안양 동안구로 와주세요']){
  const {answer,out}=tier2Turn(input);verify('SERVICE_AREA_WRONG',out.state.region?.district==='동안구'&&/출장/.test(answer),input);
}
for(const input of ['송파구','서울 송파구','송파구 지하주차장','송파구인데 지하에서 교체돼요?','송파구 회사 주차장','송파구 아파트 방문 차량인데 지하 2층에서 배터리가 나갔어요 송파구 아파트 지하 2층까지 출장 가능한 지역인지 확인해 주실 수 있나요?']){
  const {answer,out}=tier2Turn(input);verify('SUPPORTED_AREA_FALSE_NEGATIVE',out.state.region?.district==='송파구'&&!/출장 가능 지역으로 확인되지/.test(answer),input);
}
for(const input of ['차 시동이 안 걸려요 현금 돼요?','블랙박스 쓰는데 오늘 카드로 교체 가능해요?']){
  const {answer}=tier2Turn(input);verify('PAYMENT_POLICY_WRONG',/현금결제|카드결제/.test(answer),input);verify('SCHEDULE_INTENT_LOST',!input.includes('오늘')||/실시간 확인/.test(answer),input);
}
for(const input of ['출장비랑 공임 폐배터리까지 포함인가요?','출장비 공임 코딩 기본점검 다 포함인가요?']){
  const {answer}=tier2Turn(input);verify('INCLUDED_COST_WRONG',/출장교체비용과 공임이 포함/.test(answer)&&/기존 폐배터리 수거 조건/.test(answer),input);
}
for(const input of ['예약 시간 바꾸거나 취소하려면요?','접수한 뒤 위치나 시간을 바꾸거나 취소하려면 어떻게 해야 하나요?']){
  const {answer}=tier2Turn(input);verify('CHANGE_CANCEL_CONTEXT_LOST',/변경/.test(answer)&&/취소/.test(answer)&&/고객센터/.test(answer),input);
}
for(const input of ['델코로 할게요','바르타로 해주세요','AGM105 델코로 할게요']){
  const {answer,out}=tier2Turn(input);verify('PURCHASE_CHOICE_LOST',/이 채팅에서는 주문이나 예약을 확정하지/.test(answer)&&Boolean(out.state.brand),input);
}
const flows=[
  ['BMW 5시리즈 2020년식','가격은요?','송파구입니다','오늘 가능해요?','거기로 와주세요'],
  ['AGM105 얼마예요?','델코로 할게요','현금 돼요?','접수해주세요'],
  ['송파구 가능해요?','주소가 달라졌어요','서울 마포구예요','오늘 가능한가요?'],
  ['안양 동안구','기다리는 동안 차를 다른 자리로 옮기면 알려드려야 하나요?'],
  ['송파구','지하주차장이에요','비대면으로 가능해요?'],
  ['차 시동이 안 걸려요','회사 주차장으로 와요?','현금 돼요?','오늘 가능한가요?'],
  ['AGM105 가격','출장비랑 공임 포함?','폐배터리 안 주면요?'],
  ['방문 시간 바꾸고 싶어요','취소할게요','새로 접수하려면요?']
];
for(const questions of flows){const replies=tier2Session(questions),last=replies.at(-1);verify('SHORT_FOLLOWUP_CONTEXT_LOST',Boolean(last.answer)&&!/차량을 정확하게 찾지 못/.test(last.answer),questions.join(' → '));verify('LOCATION_CONTEXT_LOST',!questions.some(q=>q.includes('기다리는 동안'))||!last.out.state.region||last.out.state.region.district!=='동안구'||questions[0].includes('동안구'),questions.join(' → '));}
const changed=tier2Session(['송파구 가능해요?','주소가 달라졌어요']);
verify('LOCATION_CONTEXT_LOST',changed.at(-1).out.state.region===null,'주소가 달라졌어요');
const moved=tier2Session(['송파구 가능해요?','기다리는 동안 차를 다른 자리로 옮기면 알려드려야 하나요?']);
verify('WORKSITE_CONTEXT_LOST',/변경된 차량 위치/.test(moved.at(-1).answer)&&!/차량명과 연식/.test(moved.at(-1).answer),'기다리는 동안 차를 다른 자리로 옮기면 알려드려야 하나요?');
const unknownPrice=tier2Turn('BMW 5시리즈 2020년식 총 얼마예요?');
verify('TOTAL_PRICE_WRONG',!/예약 완료|임의의 총액/.test(unknownPrice.answer),'BMW 5시리즈 2020년식 총 얼마예요?');
verify('UNNECESSARY_VEHICLE_RESTART',!/차량명과 연식/.test(tier2Turn('출장비랑 공임 폐배터리까지 포함인가요?').answer),'출장비랑 공임 폐배터리까지 포함인가요?');

console.log(JSON.stringify({ status: failures.length||tier2Failures.length ? 'FAIL' : 'PASS', focusedTurns: turns, counters, failures, tier2Turns, tier2Counters, tier2Failures }));
assert.deepEqual(failures, []);
assert.deepEqual(tier2Failures, []);
