import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(repo,name),'utf8'));
const manufacturers=read('data/manufacturers.json');
const records=manufacturers.flatMap(m=>read(`data/${m.file}`).map(row=>({...row,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const catalog=read('data/battery-prices.json');
const policy=read('data/consult-service-policy.json');
const turn=(state,input)=>conversationTurn(state,input,records,areas,catalog,policy);
const counters=Object.fromEntries('WRONG_POLICY_ROUTE KNOWN_CONTEXT_LOST UNNECESSARY_VEHICLE_RESTART MULTI_INTENT_PARTIAL PRODUCT_CHOICE_LOST CHANGE_CANCEL_LOST PAYMENT_RECEIPT_LOST FALSE_BRAND_COMPARISON FALSE_SERVICE_AREA FALSE_PRICE FALSE_SPEC FALSE_VEHICLE FALSE_BOOKING_COMPLETION LIVE_AVAILABILITY_FABRICATED UNSUPPORTED_POLICY_FABRICATED STALE_CONTEXT_OVERRIDE'.split(' ').map(k=>[k,0]));
let turns=0;
function check(input,required,forbidden=[]){
  const out=turn(createConversationState(),input),answer=out.messages.join('\n');turns++;
  for(const signal of required)if(!signal.test(answer))counters.WRONG_POLICY_ROUTE++;
  for(const signal of forbidden)if(signal.test(answer))counters[signal===vehicleFirst?'UNNECESSARY_VEHICLE_RESTART':'WRONG_POLICY_ROUTE']++;
  if(/예약(?:이|을)?\s*(?:완료|확정)(?:됐|했습니다)|오늘.{0,12}방문해드리겠습니다/.test(answer))counters.FALSE_BOOKING_COMPLETION++;
  if(/(?:오늘|지금|당일).{0,12}(?:확정|출동하겠습니다|방문해드리겠습니다)/.test(answer))counters.LIVE_AVAILABILITY_FABRICATED++;
  if(!/델코|바르타/.test(input)&&/어떤 제품이나 브랜드를 비교/.test(answer))counters.FALSE_BRAND_COMPARISON++;
  if(!/\d+\s*원|만원|가격/.test(input)&&/\d+\s*만원/.test(answer))counters.FALSE_PRICE++;
  if(!/AGM\s*\d+|DIN\s*\d+|DF\s*\d+|\d+(?:AL|L|R)/i.test(input)&&out.state.quotedSpec)counters.FALSE_SPEC++;
  if(!/차종|연식|차량명|BMW|벤츠/.test(input)&&out.state.selectedVehicleKey)counters.FALSE_VEHICLE++;
  if(/서명 가능합니다|취소 비용은 \d|현장 추가비용은 무조건 없습니다/.test(answer))counters.UNSUPPORTED_POLICY_FABRICATED++;
  return out;
}
const vehicleFirst=/차량명과 연식을|차량마다 배터리가 달라요|어떤 차량이세요|차량을 정확하게 찾지 못했어요/;
const nonface=/키를 맡기거나 가족·대리인|비대면 교체가 가능/;
const site=/안전성과 차량 접근 가능 조건/;
const realtime=/실시간 확인이 필요/;
for(const input of ['작업하는 동안 옆에 있어야 하나요','점심 먹이는 동안 작업 맡겨도 되죠','일하는 동안 차 맡겨 둘 수 있나요','강아지 데리고 산책하는 동안 작업 맡길게요','운전자가 없는 동안 교체 가능합니까','입원 수속하는 동안 교체해 주실 수 있나요','작업하시는 동안 집 안에 있어도 됩니까'])
  check(input,[nonface],[vehicleFirst,/진단|원인입니다/]);
for(const input of ['물건 내리는 동안 작업할 수 있습니까','다른 차량으로 옮겨 싣는 동안 될까요','작업할 동안 다른 차 입출고가 멈춥니다'])
  check(input,[site],[vehicleFirst,/작업 가능합니다/]);
for(const input of ['승인 기다리는 동안 방문 시간 잡을 수 있어요','짐 찾는 동안 기사님 먼저 가실 수 있나요'])
  check(input,[realtime],[vehicleFirst,/예약 완료|도착 시간은 \d/]);
for(const input of ['대리인이 확인 서명해도 되나요','집 주인이 없어도 차키 전달하면 되나요','공연 쉬는 시간에 차키 전달할게요','차키를 매니저에게 전달해 뒀어요','차주해외라답이없음'])
  check(input,[nonface],[vehicleFirst]);
check('대리인이 확인 서명해도 되나요',[/서명·확인 가능 여부는 고객센터/],[/서명 가능합니다/]);
for(const input of ['출장 취소 비용도 비교하고 싶습니다','현장서더비싸지면취소됨?'])
  check(input,[/예약 취소는 고객센터/,/취소 비용이나 현장 조건에 따른 금액은 이 상담에서 확정할 수 없습니다/],[vehicleFirst,/어떤 제품이나 브랜드를 비교/]);
check('델코랑 바르타 가격 달라요?',[/델코/,/바르타/],[/취소 비용이나/]);
check('취소 말고 델코랑 바르타 가격 비교해 주세요',[/델코/,/바르타/],[/취소 비용이나/]);
check('AGM105 가격은요?',[/AGM105/,/원/],[/취소 비용이나/]);
check('오늘 교체 가능해요?', [realtime], [/예약 완료/]);
check('동안구 출장 가능해요?', [/동안구/], [/비대면 교체가 가능/]);
check('컴퓨터 켜두는 동안 괜찮아요?', [], [/비대면 교체가 가능/,site,realtime]);
check('실내등 켜두는 동안 방전돼요?', [], [/비대면 교체가 가능/,site]);
const mixed=check('차키는 경비실에 맡길게요. 오늘 방문 가능해요?', [nonface,realtime], [vehicleFirst]);
if(!nonface.test(mixed.messages.join('\n'))||!realtime.test(mixed.messages.join('\n')))counters.MULTI_INTENT_PARTIAL++;
const payment=check('현금 결제하고 차키는 경비실에 맡길게요', [/현금결제 가능/,nonface],[vehicleFirst]);
if(!/현금결제 가능/.test(payment.messages.join('\n')))counters.PAYMENT_RECEIPT_LOST++;
const cancellation=check('출장 취소 비용은 어떻게 되나요?', [/예약 취소는 고객센터/,/취소 비용이나 현장 조건/],[vehicleFirst]);
if(!/예약 취소는 고객센터/.test(cancellation.messages.join('\n')))counters.CHANGE_CANCEL_LOST++;
const product=check('델코로 할게요', [/델코|접수|차량/], []);
if(!/델코|접수|차량/.test(product.messages.join('\n')))counters.PRODUCT_CHOICE_LOST++;
const noArea=check('작업하는 동안 옆에 있어야 하나요',[nonface],[/지역은 출장 배터리 교체 가능/]);
if(/지역은 출장 배터리 교체 가능/.test(noArea.messages.join('\n')))counters.FALSE_SERVICE_AREA++;
const station=check('부천역 근처 오피스텔도 와 주시나요',[/경기 부천시 지역은 출장 교체 가능/],[vehicleFirst]);
if(station.state.region)counters.FALSE_SERVICE_AREA++;
const query=check('영등포구 지금 와?',[/출장 교체 가능|출장 가능/],[vehicleFirst]);
if(query.state.region)counters.FALSE_SERVICE_AREA++;
const correction=check('오늘 현장이 바뀌어서 부를 곳도 달라졌어요',[/변경된 차량 위치의 동이나 구/],[vehicleFirst]);
if(correction.state.region)counters.STALE_CONTEXT_OVERRIDE++;
const twoSites=check('오늘 김포 현장이고 내일은 서울로 갑니다',[/방문을 원하시는 차량의 현재 동이나 구/],[vehicleFirst]);
if(twoSites.state.region)counters.FALSE_SERVICE_AREA++;
const conditional=check('일산 집 주소로 변경하면 비용이 달라지나요',[/장소 변경에 따른 최종 금액/,/변경된 차량 위치/],[vehicleFirst]);
if(conditional.state.region)counters.FALSE_SERVICE_AREA++;
let state=createConversationState();
for(const input of ['BMW 5시리즈 2020년식이에요','차키는 경비실에 맡길게요','제가 없는 동안 작업해 주세요']){
  const out=turn(state,input);state=out.state;turns++;
  if(input.includes('없는 동안')){
    if(!nonface.test(out.messages.join('\n')))counters.KNOWN_CONTEXT_LOST++;
    if(vehicleFirst.test(out.messages.join('\n')))counters.UNNECESSARY_VEHICLE_RESTART++;
  }
}
const known=turn(state,'그럼 차키는 경비실에 맡길게요');turns++;
if(vehicleFirst.test(known.messages.join('\n')))counters.STALE_CONTEXT_OVERRIDE++;
assert.equal(Object.values(counters).reduce((a,b)=>a+b,0),0);
console.log(JSON.stringify({turns,counters}));
