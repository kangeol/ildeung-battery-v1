import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(repo,name),'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read(`data/${m.file}`).map(row=>({...row,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const catalog=read('data/battery-prices.json');
const policy=read('data/consult-service-policy.json');
const turn=(state,input)=>conversationTurn(state,input,records,areas,catalog,policy);
const keys='AFTER_SALES_KNOWN_ANSWER_LOST DOCUMENT_POLICY_FABRICATED PAYMENT_POLICY_FABRICATED CANCELLATION_FEE_FABRICATED WORKSITE_ACCESS_GUARANTEE_FABRICATED WORKSITE_INTENT_LOST PURCHASE_REFERENT_LOST PURCHASE_STAGE_RESTART SCHEDULE_CHANGE_LOST FALSE_BOOKING_COMPLETION PAYMENT_DETAIL_LOST INCLUDED_COST_PARTIAL FALSE_PRICE FALSE_SPEC FALSE_BRAND FALSE_VEHICLE BATTERY_GUIDANCE_LOST BATTERY_DIAGNOSIS_OVERCLAIM UNNECESSARY_VEHICLE_RESTART MULTI_INTENT_PARTIAL'.split(' ');
const counters=Object.fromEntries(keys.map(key=>[key,0]));
const vehicle=/차량명과 연식을|차량마다 배터리가 달라요|어떤 차량이세요|차량을 정확하게 찾지 못했어요/;
let turns=0;const failures=[];
function check(input,needed=[],forbidden=[],state=createConversationState(),label='MULTI_INTENT_PARTIAL'){
 const out=turn(state,input),answer=out.messages.join('\n');turns++;
 for(const re of needed)if(!re.test(answer)){counters[label]++;failures.push({input,missing:String(re),answer});}
 for(const re of forbidden)if(re.test(answer)){counters[re===vehicle?'UNNECESSARY_VEHICLE_RESTART':label]++;failures.push({input,forbidden:String(re),answer});}
 if(/예약(?:이|을)?\s*(?:완료|확정)(?:됐|했습니다)|방문해드리겠습니다/.test(answer))counters.FALSE_BOOKING_COMPLETION++;
 if(/취소\s*비용은\s*\d|통행료는\s*\d/.test(answer))counters.CANCELLATION_FEE_FABRICATED++;
 if(/주차타워.*(?:들어갈수|가능합니다)|출입.*보장합니다/.test(answer))counters.WORKSITE_ACCESS_GUARANTEE_FABRICATED++;
 if(/배터리가\s*원인입니다|반드시\s*교체해야/.test(answer))counters.BATTERY_DIAGNOSIS_OVERCLAIM++;
 return out;
}
const as=/설치일 기준 3개월 이내 A\/S/;
const boundary=/현재 상담 자료만으로 확정할 수 없습니다|현장 조건을 확인|고객센터/;
for(const input of ['여기서 교체하면 보증은 어디서 받나요','출장 교체한 배터리 A/S 기간이요'])
 check(input,[as],[vehicle],undefined,'AFTER_SALES_KNOWN_ANSWER_LOST');
for(const input of ['제조사 보증과 업체 보증이 같은가요','다른 업체에서도 제조사 보증되나요','외부 교체가 제조사 보증에 영향 있나요'])
 check(input,[/제조사 보증의 적용 범위/],[/무조건 보증|제조사 보증도 3개월/],undefined,'DOCUMENT_POLICY_FABRICATED');
for(const input of ['작업 영수증을 제 이름으로 받을 수 있나요','등록증 번호를 가려도 되나요','수리 전후 사진을 받을 수 있나요','예약 취소 후 주소를 지울 수 있나요'])
 check(input,[boundary],[vehicle],undefined,'DOCUMENT_POLICY_FABRICATED');
for(const input of ['주차 타워에서 작업하나요','부천 지하 4층에서 가능해요','회사 방문 차량 등록이 필요해요'])
 check(input,[/안전성과 차량 접근 가능 조건/],[vehicle],undefined,'WORKSITE_INTENT_LOST');
for(const input of ['비행기 지연으로 방문 시간을 바꿔야 해요','진료 예약 때문에 시간 변경할게요','시간변경좀요'])
 check(input,[/이 채팅에서는 예약을 변경하지 않/],[vehicle,/증상만으로 교체가 필요한지/],undefined,'SCHEDULE_CHANGE_LOST');
for(const input of ['현금이면 가격이 달라요','입금자와 예약자 이름이 달라도 되나요','현금이 없는데 카드나 이체 되나요'])
 check(input,[/현금결제 가능|카드결제 가능|결제자 명의/],[vehicle],undefined,'PAYMENT_DETAIL_LOST');
for(const input of ['다른 차도 같이 보면 출장비가 달라지나요','통행료가 견적에 포함되나요','교체 후 거래를 취소하면 비용은요'])
 check(input,[/표준 교체 가격만으로 확정할 수 없습니다/],[vehicle,/현장 추가비용은 없습니다/],undefined,'INCLUDED_COST_PARTIAL');
for(const input of ['차종이 같아도 배터리가 달라요?','가솔린과 디젤 배터리가 달라요?','모델3는 연식마다 배터리가 다른가요?'])
 check(input,[/차량 지정 규격/],[vehicle],undefined,'BATTERY_GUIDANCE_LOST');
for(const input of ['한 달 차를 세워뒀는데요','장마 동안 차를 방치해도 되나요','한 달 동안 운전을 안 할 예정입니다'])
 check(input,[/장기주차와 짧은 주행/],[vehicle],undefined,'BATTERY_GUIDANCE_LOST');
check('배터리 바꾸면 차박 시간이 늘어나나요',[/실제 사용시간이나 수명/],[/예약·방문 시간 변경/],undefined,'BATTERY_GUIDANCE_LOST');
check('점프만 하러 출장 오시나요',[/점프만 별도로 하는 출장 서비스/],[vehicle],undefined,'BATTERY_GUIDANCE_LOST');
check('배터리 교체 중에 차가 굴러가나요',[/차량 이동·고정 상태/],[vehicle],undefined,'BATTERY_GUIDANCE_LOST');
let state=createConversationState();
for(const input of ['예약 문자에 차량번호가 틀렸어요','끝자리가 7이 아니라 1입니다','동네와 차종은 맞아요']){
 const out=check(input,[/정정은 고객센터/],[vehicle],state,'PURCHASE_STAGE_RESTART');state=out.state;
}
state=createConversationState();
for(const input of ['차량 등록증을 요청받았어요','주소와 주민번호는 가려도 되나요','차종과 연식만 남기겠습니다']){
 const out=check(input,[boundary],[vehicle],state,'DOCUMENT_POLICY_FABRICATED');state=out.state;
}
check('AGM105 얼마예요?',[/AGM105/,/원/],[/제조사 보증의 적용 범위/],undefined,'FALSE_PRICE');
check('델코랑 바르타 가격이 달라요?',[/델코/,/바르타/],[/취소 비용/],undefined,'FALSE_BRAND');
check('오늘 교체 가능해요?',[/실시간 확인/],[/예약 완료/],undefined,'FALSE_BOOKING_COMPLETION');
assert.equal(Object.values(counters).reduce((a,b)=>a+b,0),0,JSON.stringify({counters,failures}));
console.log(JSON.stringify({turns,counters}));
