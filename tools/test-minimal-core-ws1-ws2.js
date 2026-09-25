import assert from 'node:assert/strict';
import fs from 'node:fs';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';

const read=path=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read(`data/${m.file}`).map(row=>({...row,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const prices=read('data/battery-prices.json');
const policy=read('data/consult-service-policy.json');
const phone='1644-9141';
const counters=Object.fromEntries([
  'FALSE_SERVICE_AREA','FALSE_CONFIRMED_REGION','LOCATION_INTENT_LOST','WORKSITE_INTENT_LOST',
  'SCHEDULE_INTENT_LOST','CHANGE_INTENT_LOST','GENERIC_LANDMARK_FALSE_REGION',
  'ACCESS_GUARANTEE_FABRICATED','LIVE_AVAILABILITY_FABRICATED','ARRIVAL_TIME_FABRICATED',
  'FALSE_BOOKING_COMPLETION','UNNECESSARY_VEHICLE_RESTART','PAYMENT_INTENT_LOST',
  'PAYMENT_POLICY_FABRICATED','RECEIPT_POLICY_FABRICATED','AS_POLICY_FABRICATED',
  'KNOWN_POLICY_WITHHELD','AS_FALSE_POSITIVE','MULTI_INTENT_PARTIAL',
  'NON_PHONE_INTAKE_FABRICATED','OUT_OF_SCOPE_FEATURE_EXPANSION','STALE_CONTEXT_OVERRIDE'
].map(name=>[name,0]));
const failures=[];
let turns=0;
function flow(inputs,contract){
  let state=createConversationState(),out;
  for(const input of inputs){out=conversationTurn(state,input,records,areas,prices,policy);state=out.state;turns++;}
  const answer=out.messages.join(' ');
  function check(ok,counter){if(!ok){counters[counter]++;failures.push({inputs,counter,answer,region:state.region?.fullName,lastIntent:state.lastIntent});}}
  contract({answer,state,out,check});
}
const has=(text,pattern)=>pattern.test(text);

flow(['회사 주차장은 방문 차량 등록이 필요합니다'],({answer,check})=>{
  check(has(answer,/주차·출입 허가/),'WORKSITE_INTENT_LOST');
  check(!has(answer,/코딩이 필요한 차량/),'MULTI_INTENT_PARTIAL');
});
for(const input of ['거래처 주차장이라 오래 머물 수 없어요','주차장까지 걸어가는 데 오래 걸려요','T2 장기주차장요'])
  flow([input],({answer,check})=>{
    check(has(answer,/현장 조건|주차 위치|차량 접근/),'WORKSITE_INTENT_LOST');
    check(!has(answer,/장기주차와 짧은 주행|방전은 배터리 상태/),'MULTI_INTENT_PARTIAL');
  });
flow(['장기 렌터카도 출장 교체받을 수 있나요'],({answer,state,check})=>{
  check(!state.region&&!has(answer,/현재 출장 가능 지역으로 확인되지/),'GENERIC_LANDMARK_FALSE_REGION');
});
for(const input of ['공항 호텔 주차장으로 장소 바꿔도 돼요','공항 주차장 근처예요','기다리는 동안 결제는 어떻게 해요'])
  flow([input],({state,check})=>check(!state.region,'GENERIC_LANDMARK_FALSE_REGION'));
for(const input of ['서울 강서구 공항동','인천 계양구 장기동','안양 동안구','수원 권선동'])
  flow([input],({state,check})=>check(Boolean(state.region),'FALSE_SERVICE_AREA'));
flow(['방문 장소를 공연장에서 집으로 바꾸고 싶어요'],({answer,state,check})=>{
  check(state.lastIntent==='LOCATION_CHANGE'&&has(answer,/변경된 차량 위치/),'CHANGE_INTENT_LOST');
  check(!has(answer,/예약·방문 시간 변경/),'MULTI_INTENT_PARTIAL');
});
flow(['공장 주소는 길지만 정문 이름이 달라요'],({answer,check})=>{
  check(has(answer,/실제 출입구 명칭과 차량 접근 경로/),'WORKSITE_INTENT_LOST');
  check(!has(answer,/변경된 차량 위치의 동이나 구/),'CHANGE_INTENT_LOST');
});
flow(['비가 와서 현장이 취소되면 장소 변경할게요'],({answer,check})=>{
  check(has(answer,/변경된 차량 위치/)&&!has(answer,/예약 취소는/),'CHANGE_INTENT_LOST');
});
flow(['휴게소에서 시동이 안 되네요','서울 방향인지 확인하고 있습니다'],({answer,state,check})=>{
  check(!state.region&&has(answer,/이동 방향만으로/),'FALSE_CONFIRMED_REGION');
});
flow(['휴게소에서 시동이 안 되네요','서울 방향인지 확인하고 있습니다','차는 주차면 안에 안전하게 있어요','휴게소 이름 보내면 와 주실 수 있죠'],({answer,state,check})=>{
  check(!state.region&&has(answer,/휴게소 이름과 상·하행 방향/),'LOCATION_INTENT_LOST');
  check(has(answer,new RegExp(phone)),'SCHEDULE_INTENT_LOST');
});
flow(['교체 후 보증이 궁금합니다','저는 연천에 살아 서울로 다시 오기 어렵습니다','문제가 생기면 집에서도 도움받나요'],({answer,state,check})=>{
  check(has(answer,/설치일 기준 3개월/) && has(answer,new RegExp(phone)),'KNOWN_POLICY_WITHHELD');
  check(!state.region,'FALSE_CONFIRMED_REGION');
});
flow(['차 위치가 바뀌었습니다','물류센터 직원이 다른 구역으로 밀어 줬어요','처음 말한 삼 번 게이트가 아닙니다','새 위치 사진 보내 드릴게요'],({answer,state,check})=>{
  check(state.lastIntent==='LOCATION_CHANGE'&&has(answer,/변경된 실제 차량 위치/),'LOCATION_INTENT_LOST');
  check(!has(answer,/작업 사진 제공 여부/),'OUT_OF_SCOPE_FEATURE_EXPANSION');
});
flow(['아이 등원 전에 와 주실 수 있어요'],({answer,check})=>check(has(answer,/실시간 확인/) && has(answer,new RegExp(phone)),'SCHEDULE_INTENT_LOST'));
flow(['교체 전에 이동도 도와주실 수 있나요'],({answer,state,check})=>{
  check(!state.region,'FALSE_CONFIRMED_REGION');
  check(has(answer,/차량 이동·견인 자체는/),'OUT_OF_SCOPE_FEATURE_EXPANSION');
});
for(const input of ['현금 없어요 해외 카드 돼요','교체비를 나눠 결제할 수 있나요','제가 돌아온 뒤 결제할 수도 있나요','결제는 호텔 직원이 대신할 예정입니다'])
  flow([input],({answer,check})=>{
    check(has(answer,/확정할 수 없습니다/) && has(answer,new RegExp(phone)),'PAYMENT_INTENT_LOST');
    check(!has(answer,/해외 카드(?:도)? (?:가능|됩니다)/),'PAYMENT_POLICY_FABRICATED');
  });
flow(['계좌 입금만 가능한 업체인가요'],({answer,check})=>check(has(answer,/카드결제·현금결제·계좌이체가 가능/),'KNOWN_POLICY_WITHHELD'));
for(const input of ['개인택시 사업자로 영수증 필요합니다','회사 명의로 계산서가 필요해요','영수증 필요합니다'])
  flow([input],({answer,check})=>check(has(answer,/현금영수증 발행 가능|세금계산서 발행 가능/),'KNOWN_POLICY_WITHHELD'));
flow(['차는 Kia small car입니다'],({answer,check})=>check(!has(answer,/설치일 기준 3개월/),'AS_FALSE_POSITIVE'));
flow(['안 되면 cash 준비할게요'],({answer,check})=>check(has(answer,/현금결제 가능/)&&!has(answer,/설치일 기준 3개월/),'AS_FALSE_POSITIVE'));
flow(['광명철산이구 결제는제가요'],({answer,state,check})=>{
  check(state.region?.name==='철산동'&&has(answer,/출장 교체 가능 지역/),'FALSE_SERVICE_AREA');
  check(has(answer,/카드결제·현금결제·계좌이체가 가능/),'MULTI_INTENT_PARTIAL');
});
flow(['교체해주세요'],({answer,check})=>check(has(answer,new RegExp(phone))&&!has(answer,/예약이 완료|접수 완료/),'FALSE_BOOKING_COMPLETION'));
flow(['통화가 어려운데 채팅으로 예약할게요'],({answer,check})=>{
  check(has(answer,new RegExp(phone))&&!has(answer,/예약이 완료|접수 완료/),'FALSE_BOOKING_COMPLETION');
  check(!has(answer,/문자(?:로)?\s*접수|웹(?:으로)?\s*접수|카톡(?:으로)?\s*접수/),'NON_PHONE_INTAKE_FABRICATED');
});
for(const failure of failures)console.error(JSON.stringify(failure));
assert.equal(failures.length,0,JSON.stringify(counters));
console.log(JSON.stringify({status:'PASS',turns,counters}));
