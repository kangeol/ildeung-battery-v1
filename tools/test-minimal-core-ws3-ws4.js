import assert from 'node:assert/strict';
import fs from 'node:fs';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {resolveLocation} from '../js/smart-consult-location.js';

const read=path=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read(`data/${m.file}`).map(row=>({...row,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
assert.equal(resolveLocation('배터리 옆면에 금이 보입니다',areas).region,null);
assert.equal(resolveLocation('시흥 금이동',areas).region?.name,'금이동');
const prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const failures=[],counts={};let turns=0;
function flow(id,inputs,checks){
  let state=createConversationState(),out;
  for(const input of inputs){out=conversationTurn(state,input,records,areas,prices,policy);state=out.state;turns++;}
  const answer=out.messages.join(' ');
  for(const [counter,ok] of Object.entries(checks({answer,state,out}))){
    counts[counter]??=0;if(!ok){counts[counter]++;failures.push({id,counter,inputs,answer,vehicle:state.vehicleFamily,region:state.region?.fullName});}
  }
}
const condition=({answer})=>({BATTERY_GUIDANCE_LOST:/교체가 필요한지 단정할 수 없습니다/.test(answer),BATTERY_DIAGNOSIS_OVERCLAIM:!/반드시 교체|원인은 배터리|확실히 배터리/.test(answer)});
const inspect=({answer})=>({...condition({answer}),MEASUREMENT_FABRICATED:!/\b\d+(?:\.\d+)?\s*(?:v|볼트|cca)\b/i.test(answer)});
for(const [id,inputs,check] of [
  ['S0580',['한 달 주차했는데 충전만 해도 될까요'],condition],
  ['S0600',['장기주차 후 배터리 상태를 확인받고 싶어요'],x=>({...inspect(x),BATTERY_GUIDANCE_LOST:/기본점검도 무료/.test(x.answer)})],
  ['S0675',['배터리 상태 사진과 결과를 받고 싶어요'],x=>({...inspect(x),PHOTO_CAPABILITY_FABRICATED:/작업 사진 제공 여부.*확정할 수 없습니다/.test(x.answer)})],
  ['S0922',['점검 수치를 사진으로 받을 수 있나요'],x=>({PHOTO_CAPABILITY_FABRICATED:/현재 상담 자료만으로 확정할 수 없습니다/.test(x.answer)})],
  ['S0992',['오래 세운 차도 배터리만 바꾸면 될까요'],condition],
  ['S1208',['배터리를 바꾸면 문부터 닫을 수 있나요'],condition],
  ['S1572',['이 경우 배터리만 바꾸면 해결될까요'],condition],
  ['C043-T2',['사고 수리 후 배터리 경고가 나와요','공업사에서 일주일 세워 놨다고 합니다'],condition],
  ['C058-T4',['중고 전기차를 처음 샀어요','큰 배터리 충전은 충분한데 문이 안 열려요','앱도 응답이 없습니다','보조배터리 문제라면 출장 해결되나요'],x=>({HYBRID_DIAGNOSIS_EXPANDED:/다른 차량 시스템의 원인은 이 상담에서 진단할 수 없습니다/.test(x.answer)})],
  ['C116-T4',['휴게소 직원이 안전 구역으로 옮겨 줬어요','차는 이제 도로와 떨어져 있습니다','주행 중 빨간 배터리 등이 먼저 떴어요','시동 배터리만 바꾸면 되는지 걱정됩니다'],condition],
  ['C163-T4',['배터리 옆면에 금이 보입니다','사고 난 쪽과 같은 방향입니다','액체는 안 보이지만 만지지 않았어요','사진 확인 후 교체 가능 여부 알려 주세요'],x=>({PHOTO_CAPABILITY_FABRICATED:/사진을 수신·판독하거나/.test(x.answer),FALSE_SERVICE_AREA:!x.state.region,BATTERY_DIAGNOSIS_OVERCLAIM:/현장 전문가에게 안전 상태/.test(x.answer)})],
  ['C178-T4',['원격 냉방을 자주 썼습니다','차를 일주일 동안 운전하지 않았고요','오늘 보조배터리 경고가 떴습니다','사용 습관을 바꾸면 교체를 미룰 수 있나요'],condition],
  ['C334-T2',['장기 방치한 차를 되살리려 합니다','안성 부모님 집에 반년 서 있었습니다'],condition],
  ['C341-T4',['주차 녹화는 계속 쓰고 싶습니다','요즘 배터리가 자주 약해집니다','평일 운전은 하루 십 분 정도예요','배터리를 큰 걸로 바꾸면 해결될까요'],condition],
  ['C344-T3',['보험 기사님과 이야기했습니다','발전기는 괜찮고 배터리 수명이 낮다고 합니다','측정한 사진도 받았습니다'],x=>({PHOTO_CAPABILITY_FABRICATED:!/작업 사진 제공 여부/.test(x.answer),BATTERY_GUIDANCE_LOST:/교체가 필요한지 단정할 수 없습니다/.test(x.answer)})],
  ['S0175',['다른 차를 밀어야 작업 공간이 나오나요'],x=>({OTHER_CAR_FALSE_MULTI_CAR:!/두 차량의 배터리 교체 견적/.test(x.answer),WORKSITE_INTENT_LOST:/차량 접근 가능 조건/.test(x.answer)})],
  ['S0531',['다른 차량으로 옮겨 싣는 동안 될까요'],x=>({OTHER_CAR_FALSE_MULTI_CAR:!/두 차량의 배터리 교체 견적/.test(x.answer)})],
  ['S0987',['친구 차와 같이 바꾸면 저렴해져요'],x=>({GENUINE_MULTI_CAR_INTENT_LOST:/두 차량의 배터리 교체 견적/.test(x.answer),FALSE_PRICE:!/\d[\d,]*원/.test(x.answer)})],
  ['S1028',['새 배터리를 다른 차로 옮겨 쓸 수 있어요'],x=>({FITMENT_INTENT_LOST:/두 차량의 지정 규격/.test(x.answer)&&!/항상 최신 제조일자/.test(x.answer)})],
  ['S1463',['차대번호 일부만 보내도 규격 확인돼요'],x=>({FALSE_SPEC:/차대번호 일부만으로 배터리 규격을 확정할 수 없습니다/.test(x.answer)})],
  ['S1549',['주차 브레이크 해제도 도와주실 수 있어요'],x=>({FALSE_VEHICLE:!x.state.vehicleFamily&&!/기아 레이/.test(x.answer),GENERAL_REPAIR_SCOPE_EXPANDED:/배터리 교체 상담 범위/.test(x.answer)})],
  ['C018-T3',['배송차가 시동이 안 걸립니다','시흥 물류센터 상차장에 있어요','짐은 다른 차로 옮기는 중입니다'],x=>({OTHER_CAR_FALSE_MULTI_CAR:!/두 차량의 배터리 교체 견적/.test(x.answer),UNNECESSARY_VEHICLE_RESTART:!/차량명과 연식을/.test(x.answer)})],
  ['C132-T4',['안산 기숙사 주차장입니다','수입차 배터리 가격이 부담됩니다','제 차에 국산 브랜드도 맞나요','규격이 맞으면 후보를 두 개만 알려 주세요'],x=>({FITMENT_INTENT_LOST:/호환 제품 후보/.test(x.answer),FALSE_PRODUCT:!/확정된 제품은/.test(x.answer)})],
  ['C205-T2',['차 두 대가 있는데 하나만 안 걸려요','다른 차로 점프할 수는 있습니다'],x=>({OTHER_CAR_FALSE_MULTI_CAR:!/두 차량의 배터리 교체 견적/.test(x.answer),BATTERY_DIAGNOSIS_OVERCLAIM:!/점프 경험 말씀/.test(x.answer)})],
  ['C307-T4',['오늘 납품차가 방전됐습니다','봉고이고 김포 양촌입니다','짐을 다 실은 상태입니다','일단 납품은 다른 차로 보내겠습니다'],x=>({OTHER_CAR_FALSE_MULTI_CAR:!/두 차량의 배터리 교체 견적/.test(x.answer),UNNECESSARY_VEHICLE_RESTART:!/차량명과 연식을/.test(x.answer)})],
  ['C344-T4',['보험 기사님과 이야기했습니다','발전기는 괜찮고 배터리 수명이 낮다고 합니다','측정한 사진도 받았습니다','이 사진 보내면 제품 준비할 수 있어요'],x=>({PHOTO_CAPABILITY_FABRICATED:/사진을 수신·판독하거나/.test(x.answer),FITMENT_INTENT_LOST:/차량명·연식·세부 모델/.test(x.answer)})]
])flow(id,inputs,check);

// Negative controls: no photo workflow, general repair expertise, or spurious
// car quote from another vehicle's logistics. Valid vehicle candidates remain.
for(const input of ['사진 보내면 분석해줘요?','엔진 소리가 이상해요','문이 고장났어요','하이브리드 고전압 시스템 수리해요?','주차 브레이크 해제해요?'])
  flow('boundary', [input],x=>({PHOTO_CAPABILITY_FABRICATED:!/사진을 받았습니다|사진을 분석했습니다/.test(x.answer),FALSE_VEHICLE:!x.state.vehicleFamily}));
for(const input of ['레이 2020 배터리','기아 레이 배터리','A7 배터리','G80 배터리','G90 배터리'])
  flow('vehicle-control',[input],x=>({FALSE_VEHICLE:Boolean(x.state.vehicleFamily||x.out.chips?.length)}));
for(const input of ['A7','G80','G90'])
  flow('ambiguous-vehicle',[input],x=>({AMBIGUITY_AUTO_CONFIRMED:!x.state.confirmedBattery||Boolean(x.out.chips?.length)}));
flow('product-followup',['G80 2020 배터리','델코로 할게요'],x=>({PRODUCT_CHOICE_CONTEXT_LOST:x.state.brand==='DELKOR',FALSE_PRODUCT:!/예약이 완료|주문이 완료/.test(x.answer)}));
flow('coding-boundary',['배터리 등록 코딩이 필요한가요?'],x=>({REGISTRATION_CODING_COLLISION:/코딩 필요 여부|코딩이 필요한/.test(x.answer)&&!x.state.vehicleFamily}));
flow('missing-referent',['3주주차햇더니 이럼'],x=>({REPLACEMENT_CERTAINTY_OVERCLAIM:/어떤 변화나 증상이 있었는지/.test(x.answer)&&!/반드시 교체|교체해야 합니다/.test(x.answer),EXACT_DURATION_FABRICATED:!/\d+\s*(?:시간|일|주).*방전/.test(x.answer)}));
flow('common-word',['주차 브레이크 해제도 도와주실 수 있어요'],x=>({UNSAFE_SUBSTRING_VEHICLE_MATCH:!x.state.vehicleFamily&&!/기아 레이/.test(x.answer)}));
flow('battery-and-price',['방전됐는데 AGM105 가격은요?'],x=>({MULTI_INTENT_PARTIAL:/방전|배터리/.test(x.answer)&&/AGM105|28만원/.test(x.answer)}));

if(failures.length)console.error(JSON.stringify(failures,null,2));
assert.equal(failures.length,0,JSON.stringify(counts));
console.log(JSON.stringify({status:'PASS',exactCases:26,turns,counters:counts}));
