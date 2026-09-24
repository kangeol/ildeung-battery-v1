import fs from 'node:fs';import os from 'node:os';import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {nonmonetaryPlan,monetaryQuestion} from '../js/smart-consult-nonmonetary.js';
const j=p=>JSON.parse(fs.readFileSync(p)),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,catalog=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json');
export const nonmonetaryCases=`수원 권선동으로 오시는 데 얼마나 걸려요
상사에게 얼마나 걸린다고 말하면 될까요
여러 차를 같은 날 하면 얼마나 걸려요
제 정보가 얼마나 보관되는지 궁금해요
지각각인데 얼마나걸려요ㅠ
면접 시간이 얼마 안 남았어요
차를 출고한 지 얼마 안 됐습니다
교체하는 데 얼마나 걸려요
배터리 장착 얼마나 걸리나요
작업은 얼마나 오래 하나요
교체 시간 얼마나 잡으면 돼요
일반적인 교체 작업 얼마나 걸릴까요
얼마나 걸리죠
얼마나걸려여
기사님 오시는 데 얼마나 걸립니까
오는데얼마나걸림
도착까지 얼마나 기다려야 해요
방문까지 얼마나 오래 기다리죠
지금 출동하면 얼마나 걸려요
주차장으로 와 주시는 데 얼마나 걸려요
오늘 얼마나 빨리 올 수 있어요
회사로 오는데 얼마나 기다리면 되죠
얼마나 더 기다려야 할까요
교체를 마칠 때까지 얼마나 걸릴까요
두 대 교체하면 얼마나 걸립니까
세 대 작업은 얼마나 오래 하나요
여러 대 같은 장소면 얼마나 걸릴까요
대기 시간이 얼마나 남았어요
얼마나 남았나요
시간이 얼마 안 남았는데요
출근까지 얼마 안 남았습니다
약속까지 시간이 얼마 안 남았어
비행기 시간 얼마 안 남았어요
수업까지 얼마 안 남았는데 걱정돼요
아직 차 산 지 얼마 안 됐어요
배터리 바꾼 지 얼마 안 됐는데요
면허 딴 지 얼마 안 됐습니다
여기 이사 온 지 얼마 안 됐어요
정비 받은 지 얼마 안 됐어요
제 개인정보는 얼마나 보관하나요
웹 상담 기록 얼마나 오래 저장돼요
상담내용 얼마나 저장해요
제 정보 얼마나 보유하나요
개인정보를 얼마 동안 보관합니까
제정보얼마나보관돼여
번호 같은 개인정보 얼마나 보관되는 건지요
예약 정보가 얼마나 보관되나요
정보를 얼마나 오래 보관하는지 알고 싶어요
얼마 동안 보관하시는 거예요
얼마나 오래 저장해 두죠
데이터 얼마나 보유하나요
얼마나 자주 해야 돼요
얼마나 멀어요
거리가 얼마나 먼가요
매장까지 얼마나 멀죠
여기서 얼마나 가까워요
얼마나 더 멀리 가야 돼요
얼마나 오래 유지돼요
이 상태가 얼마나 지속되죠
얼마나 남은 건지 알 수 있나요
배터리는 얼마나 오래 사용해요
얼마나 주행해야 충전되나요
얼마나 충전해야 하나요
차를 얼마나 오래 주행해야 하죠
충전은 얼마 동안 하면 돼요
배터리를 얼마나 자주 점검해요
배터리는 얼마나 버텨요
블랙박스를 얼마나 오래 사용해도 돼요
장기주차 얼마나 오래 해도 될까요
얼마나 사용해야 하죠
얼마나 오래 세워둬도 되죠
얼마나 자주 시동 걸어요
배터리 방전 뒤 얼마나 충전해야 돼요
점프 뒤 얼마나 주행해야 하나요
얼마 동안 주행하면 되나요
주행을 얼마나 오래 해야 돼요
얼마나 기다려야 되나요
얼마나걸리는지요
얼마나오래걸릴까여
작업하는데얼마나걸려
교체얼마나걸립니까
오는덴얼마나걸려요
오시는데얼마나걸리나여
얼마나빨리올수있나요
얼마나더걸려여
약속얼마안남앗어요
얼마안남았음
제정보얼마동안보관함
얼마나오래보관해두시나요
배터리얼마나주행해야충전됨
얼마나자주봐야돼
얼마나멀어여
얼마나기다려야함
설치 작업을 얼마나 오래 하는지요
아이 하원까지 얼마 안 남았어요
병원 예약 시간이 얼마 안 남았네요
주차 요금 마감 시간이 얼마 안 남았어요
버스 출발까지 얼마 안 남았어요
출장 와서 교체하는 데 얼마나 걸려요
오늘 작업 얼마나 오래 걸려요
아파트까지 오시는 데 얼마나 걸릴까요
방문 대기가 얼마나 걸릴까요
정확히 얼마 동안 저장되는 정보인가요
이런 점검은 얼마나 자주 하나요
얼마나 오래 써야 하는 건가요
충전 완료까지 얼마나 기다려야 하죠
입고 후 얼마나 보관하나요
얼마 동안 사용할 수 있는 건가요
멀리서 오시면 얼마나 걸려요
수원까지 얼마나 걸리는지 알고 싶어요
여러 차 연속 작업이면 얼마나 걸려요
오늘 시간이 얼마 안 남았어요
차량 정보가 얼마나 저장되는 건가요`.split('\n');
export const prices=['AGM105 얼마예요?','AGM80 얼마인가요?','80L 얼마예요?','BMW 5시리즈 2020년식 배터리 얼마예요?','출장비 얼마예요?','공임 얼마예요?','코딩비 얼마예요?','총 얼마예요?','델코랑 바르타 얼마 차이예요?','폐배터리 안 주면 가격 얼마 달라져요?'];
export const multi=['권선동까지 오는데 얼마나 걸리고 AGM105는 얼마예요?','오늘 얼마나 빨리 올 수 있어요? 현금 돼요?','교체하는 데 얼마나 걸려요? 총 얼마예요?','제 정보 얼마나 보관돼요? 그리고 현금영수증 돼요?','얼마 안 남았는데 오늘 가능해요?'];
export const flows=[['AGM105 얼마예요?','오시는 데는 얼마나 걸려요?','오늘 가능해요?'],['권선동 가능해요?','얼마나 걸려요?','BMW5 2020 가격은요?'],['교체시간 얼마나 걸려요?','총 얼마예요?','현금돼요?'],['제 정보 얼마나 보관돼요?','아니 차량정보 말고 제 개인정보요'],['폐배터리 안 주면 가격 얼마 달라져요?','그럼 수거하면 총 얼마예요?']];
const names=['NONMONETARY_EOLMA_FALSE_PRICE_INTENT','NONMONETARY_EOLMA_VEHICLE_FALLBACK','NONMONETARY_EOLUM_DURATION_PRICE_CONFUSION','NONMONETARY_REMAINING_TIME_PRICE_CONFUSION','NONMONETARY_RETENTION_PRICE_CONFUSION','NONMONETARY_DISTANCE_PRICE_CONFUSION','ETA_FABRICATED','PRIVACY_RETENTION_FABRICATED','MINIMUM_CLARIFICATION_WRONG','PRICE_QUERY_REGRESSION','CANONICAL_PRICE_WRONG','WASTE_NONCOLLECTION_POLICY_REGRESSION','MULTI_INTENT_EOLUM_LOST','SESSION_PRICE_INTENT_STALE','SCHEDULE_CONTEXT_LOST','PAYMENT_CONTEXT_LOST'];
const gates=Object.fromEntries(names.map(n=>[n,0])),checks={...gates},evidence=[];
const check=(k,ok,q)=>{checks[k]++;if(!ok){gates[k]++;console.error(k,q);}};
function turn(q,state=createConversationState()){const o=conversationTurn(state,q,rows,areas,catalog,policy);evidence.push({q,before:state,output:o});return o;}
const vehicleFallback=/어떤 차량|차량명.*알려|차량명부터|차량마다 배터리/;
for(const q of nonmonetaryCases){const o=turn(q),s=o.messages.join(' '),plan=nonmonetaryPlan(q);assert.ok(plan,q);check('NONMONETARY_EOLMA_FALSE_PRICE_INTENT',!o.state.priceIntent&&!monetaryQuestion(q),q);check('NONMONETARY_EOLMA_VEHICLE_FALLBACK',!vehicleFallback.test(s),q);check('MINIMUM_CLARIFICATION_WRONG',!o.state.previousQuestion&&s.length>0,q);
 const key=plan.kind==='PRIVACY'?'NONMONETARY_RETENTION_PRICE_CONFUSION':plan.kind==='SITUATION'?'NONMONETARY_REMAINING_TIME_PRICE_CONFUSION':/멀|가까/.test(q)?'NONMONETARY_DISTANCE_PRICE_CONFUSION':'NONMONETARY_EOLUM_DURATION_PRICE_CONFUSION';check(key,!o.state.priceIntent,q);
 if(plan.kind==='ARRIVAL')check('ETA_FABRICATED',s.includes(policy.operational.REALTIME.replace('{phone}','1644-9141'))&&!/\d+분.*도착/.test(s),q);
 if(plan.kind==='PRIVACY')check('PRIVACY_RETENTION_FABRICATED',s.includes('확인할 수 없습니다')&&!/\d+\s*(?:일|개월|시간|년)/.test(s),q);
}
for(const [i,q] of prices.entries()){const o=turn(q),s=o.messages.join(' ');check('PRICE_QUERY_REGRESSION',monetaryQuestion(q)&&!nonmonetaryPlan(q),q);if(i<4)check('CANONICAL_PRICE_WRONG',s.includes(['28만원','19만원','10만원','22만원'][i]),q);if(i===9)check('WASTE_NONCOLLECTION_POLICY_REGRESSION',s.includes('수거 조건')&&o.actions.includes('phone'),q);}
const wanted=[['실시간','28만원'],['실시간','현금결제'],['10~20분','총 교체 금액'],['보관기간','현금영수증'],['실시간']];
for(const [i,q] of multi.entries()){const o=turn(q),s=o.messages.join(' ');check('MULTI_INTENT_EOLUM_LOST',wanted[i].every(x=>s.includes(x)),q);}
for(const flow of flows){let state=createConversationState();for(const q of flow){const before=state,o=turn(q,state),s=o.messages.join(' ');state=o.state;if(nonmonetaryPlan(q,before)){check('SESSION_PRICE_INTENT_STALE',!vehicleFallback.test(s),q);if(before.quotedSpec)check('SCHEDULE_CONTEXT_LOST',o.state.quotedSpec===before.quotedSpec,q);}if(/현금/.test(q))check('PAYMENT_CONTEXT_LOST',s.includes('현금결제'),q);}}
const report={count:evidence.length,matrix:nonmonetaryCases.length,gates,checks,evidence};fs.writeFileSync(os.tmpdir()+'/nonmonetary-eolma-focused.json',JSON.stringify(report,null,2));console.log(JSON.stringify({count:report.count,matrix:report.matrix,gates,checks}));assert.equal(Object.values(gates).reduce((a,b)=>a+b,0),0);
