import fs from 'node:fs';import os from 'node:os';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';
import{conversationTurn,createConversationState}from'../js/smart-consult-conversation.js';
import{electricalLoadPlan}from'../js/smart-consult-electrical-load.js';
import{encodeSession,decodeSession}from'../js/smart-consult-session.js';
export const fresh=['하루 켜두면 방전돼요?','계속 켜두면 방전돼요?','밤새 켜두면 방전돼요?','켜놓으면 방전되나요?','그거 켜두면 방전돼요?','그럼 하루 종일은요?','계속 켜두면요?','밤새는요?','켜놓고 자면요?','얼마나 켜두면 방전돼요?','몇 시간 켜두면 방전돼요?','계속 틀어두면 배터리가 닳나요?','종일 켜놔도 밧데리 괜찮아요?','밤새켜두면방전대요ㅠ','전기를 계속 사용하면 방전되나요?'];
export const explicit=['실내등 하루 켜두면 방전돼요?','블랙박스 하루 종일 켜두면 방전돼요?','주차녹화 계속 쓰면 방전돼요?','차에서 전기기기 많이 쓰면 방전 잘돼요?'];
export const negatives=['시동 하루 켜두면 어떻게 돼요?','에어컨 켜두면요?','라디오 켜두면 고장나요?','휴대폰 켜두면 배터리 닳아요?','집 전등 하루 켜두면 전기세 많이 나와요?','컴퓨터 밤새 켜두면 괜찮아요?','블랙박스 설치해줘요','실내등 교체해요?','내일은요?','하루 주차비 얼마예요?','TV 켜놓고 자면 수면에 안 좋아요?','계속 시동 켜두면요?'];
// An unrecognized but explicit noun is not an omitted object; preserve its existing route.
negatives.push('비상등 켜 놓고 기다리면 더 방전돼요','냉동 장치 켜 두면 방전이 빨라져요','비상등을 오래 켜 두면 더 방전되나요','그럼요','그거요');
export const combined=['하루 켜두면 방전돼요? 오늘 교체 가능해요?','실내등 밤새 켜놨는데 AGM105 가격도 알려줘요','블랙박스 계속 켜두면 방전돼요? 현금 돼요?'];
export const flows=[['실내등 켜놨어요','하루 켜두면 방전돼요?','그게 원인이에요?','갈아야 하나요?'],['블랙박스 주차녹화 써요','계속 켜두면요?','몇 시간까지 괜찮아요?'],['차에서 전기기기 많이 써요','그거 켜두면 방전돼요?','제 차는 어떤 배터리?'],['하루 켜두면 방전돼요?','실내등이요','그럼 밤새는요?'],['AGM105 가격','블랙박스 쓰고 있어요','하루 종일 켜두면요?','오늘 가능?'],['실내등 켜놨어요','그거 하루 켜두면요? 그리고 A/S 되나요?'],['블랙박스 쓰고 있어요','CCA가 뭐예요?','밤새는요?']];
export function run(){
 const j=p=>JSON.parse(fs.readFileSync(p)),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,prices=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json');
 const gates=Object.fromEntries('ELLIPTICAL_LOAD_VEHICLE_FALLBACK ELLIPTICAL_LOAD_OBJECT_FABRICATED ELLIPTICAL_LOAD_REFERENT_HALLUCINATED ELLIPTICAL_LOAD_CONTEXT_LOST ELLIPTICAL_LOAD_WRONG_INTENT ELLIPTICAL_LOAD_DURATION_FABRICATED ELLIPTICAL_LOAD_SINGLE_CAUSE_OVERCLAIM ELLIPTICAL_LOAD_FALSE_POSITIVE ELLIPTICAL_LOAD_UNNECESSARY_PHONE_DEFLECTION EXPLICIT_LOAD_REGRESSION BLACKBOX_CAUSE_OVERCLAIM INTERIOR_LIGHT_CAUSE_OVERCLAIM MULTI_INTENT_LOST SESSION_CONTEXT_LOST PRICE_CONTEXT_LOST SCHEDULE_CONTEXT_LOST AS_CONTEXT_LOST'.split(' ').map(k=>[k,0])),evidence=[];
 const check=(k,ok,input)=>{if(!ok){gates[k]++;console.error(k,input);}};
 const turn=(input,state=createConversationState())=>{const output=conversationTurn(state,input,rows,areas,prices,policy),s=output.messages.join('\n');evidence.push({input,before:state,output});
 check('ELLIPTICAL_LOAD_DURATION_FABRICATED',!/\d+\s*(?:시간|와트|볼트|CCA|SOH)|(?:하루|밤새).*반드시 방전/.test(s),input);
 for(const k of ['ELLIPTICAL_LOAD_SINGLE_CAUSE_OVERCLAIM','BLACKBOX_CAUSE_OVERCLAIM','INTERIOR_LIGHT_CAUSE_OVERCLAIM'])check(k,!/반드시 교체|확실한 원인|때문입니다|무조건 방전/.test(s),input);
 check('SESSION_CONTEXT_LOST',JSON.stringify(decodeSession(encodeSession(output.state,[]))?.state)===JSON.stringify(output.state),input);if(state.quotedSpec)check('PRICE_CONTEXT_LOST',output.state.quotedSpec===state.quotedSpec,input);return output;};
 for(const q of fresh)for(const input of [q,q.replaceAll(' ','')]){const o=turn(input),s=o.messages.join(' ');check('ELLIPTICAL_LOAD_VEHICLE_FALLBACK',!/차량명|연식|차량마다/.test(s),input);check('ELLIPTICAL_LOAD_WRONG_INTENT',o.state.lastIntent==='KNOWLEDGE_LOAD_OBJECT',input);check('ELLIPTICAL_LOAD_OBJECT_FABRICATED',/무엇을.*기기/.test(s)&&!/고객님의 블랙박스|실내등 때문/.test(s),input);check('ELLIPTICAL_LOAD_UNNECESSARY_PHONE_DEFLECTION',!o.actions.includes('phone'),input);}
 for(const input of explicit){const o=turn(input);check('EXPLICIT_LOAD_REGRESSION',o.state.lastIntent==='KNOWLEDGE_ELECTRICAL_LOAD'&&/여러 요인/.test(o.messages.join(' ')),input);}
 for(const input of negatives){const p=electricalLoadPlan(input),o=turn(input);check('ELLIPTICAL_LOAD_FALSE_POSITIVE',!p||p.clarify,input);check('ELLIPTICAL_LOAD_REFERENT_HALLUCINATED',!p?.omittedObject,input);}
 for(const[i,input]of combined.entries()){const o=turn(input),s=o.messages.join(' ');check('MULTI_INTENT_LOST',[/실시간/,/28만원/,/현금결제/][i].test(s)&&/전기 사용|여러 요인/.test(s),input);if(i===0)check('SCHEDULE_CONTEXT_LOST',/실시간/.test(s),input);}
 for(const[fi,f]of flows.entries()){let state=createConversationState();for(const[ti,input]of f.entries()){const o=turn(input,state),s=o.messages.join(' ');state=o.state;if(fi<5&&ti>0&&!(fi===2&&ti===2)&&!(fi===4&&ti===3))check('ELLIPTICAL_LOAD_CONTEXT_LOST',!/차량명|연식을|차량마다/.test(s),input);if(fi===5&&ti===1){check('AS_CONTEXT_LOST',/3개월/.test(s),input);check('MULTI_INTENT_LOST',/여러 요인/.test(s),input);}if(fi===6&&ti===2)check('ELLIPTICAL_LOAD_REFERENT_HALLUCINATED',/무엇을/.test(s),input);}}
 fs.writeFileSync(os.tmpdir()+'/elliptical-load-focused.json',JSON.stringify({count:evidence.length,gates,evidence},null,2));console.log(JSON.stringify({count:evidence.length,gates}));assert.equal(Object.values(gates).reduce((a,b)=>a+b,0),0);
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)run();
