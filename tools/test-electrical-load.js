import fs from 'node:fs';import os from 'node:os';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';
import{conversationTurn,createConversationState}from'../js/smart-consult-conversation.js';
import{electricalLoadPlan}from'../js/smart-consult-electrical-load.js';
import{encodeSession,decodeSession}from'../js/smart-consult-session.js';
export const positives=[
 '차 문을 오래 열어 놔서 그런 걸까요','애가 실내등을 켜 둔 것 같아요','차량 냉장고 때문에 그런 걸까요','차에 연결한 인버터가 있습니다','밤새 전기장판 쓴 뒤 차가 먹통이에요',
 '에어컨을 계속 틀어 둬서 배터리가 닳았나요','택시 표시등도 배터리를 많이 쓰나요','정차 중 TV를 켜 두는 것도 영향 있나요','문을 자주 열면 배터리 소모가 커요','화물칸 조명이 밤새 켜져 있었어요',
 '차에 짐을 많이 실어서 문을 자주 열었어요','제가 라이트를 안 껐는지 기억이 안 나요','차 안에서 대기하며 라디오를 들었습니다','청소하다 실내등을 켜 놓았어요','전조등을 켜 둔 것 같아요',
 '천장 모니터를 오래 켜 놨습니다','상시 녹화 설정이 원인일까요','주차 녹화를 끄면 배터리가 오래 가요','주차 중 충격 녹화는 꼭 쓰고 싶어요','주행 거리가 짧으면 상시 녹화 못 쓰나요',
 '보조배터리 불량일 가능성도 있나요','주차 녹화 시간을 제한하는 게 나을까요','차량 앱도 전기를 소모하나요','스마트폰으로 차를 자주 조회합니다','차 안 공기청정기도 계속 켜져 있어요',
 '실내등을 켜 둔 게 제 실수 같아요','실내등을 켜 두었는지 확인할 수 있나요','원격 냉방을 많이 써서 그럴까요','차량 시거잭에 멀티탭을 연결했습니다','전기 작업 장비가 배터리를 많이 쓰나요',
 '차를 작은 사무실처럼 쓰고 있어요','차문열어놓은게 문제인가ㅠ','냉동기 켜놧더니 이래요','냉장고 밤새켯어요;;','청소하다등켜놧나봐요',
 '애들tv밤새켯대요;;','상시녹화끄면살아나여','보조밧데리달앗는데왜이럼','공청기도꼽아놧는데;;','에어컨때메배터리닳아요?',
 '라이트켜놓은건제잘못같음','애가 뒷좌석 불을 켜 놨나 봐요','원격 냉방을 자주 썼습니다','차 안 인버터를 계속 켜 뒀습니다','뒷좌석 모니터를 밤새 켰습니다',
 '실내등 켜놔서 방전된 거죠?','블랙박스 때문에 방전된 거예요?','주차녹화 몇 시간까지 괜찮아요?','실내등 하루 켜두면 방전돼요?','차에서 전기기기 많이 써요'
];
export const negatives=['실내등 교체해요?','블랙박스 설치해줘요?','블랙박스 가격 얼마예요?','전조등이 안 켜져요','라디오 고장났어요','USB 충전기 추천해줘요','휴대폰 충전돼요?','차량 옵션 알려주세요','집 냉장고 밤새 켰어요','거실 TV 켜놨어요','집에서 라디오 들었어요','가정용 공기청정기 계속 사용해요','실내등','인버터 가격은?','전조등 교체 비용?','휴대폰 보조배터리 추천해요?','BMW X5','CCA가 뭐예요?','AGM105 얼마예요?','블랙박스 설치비 얼마예요?'];
export const combined=['실내등 켜놓고 방전된 것 같은데 오늘 교체 가능해요?','주차녹화 쓰는데 배터리 갈아야 하나요?','블랙박스 때문에 방전된 건가요 AGM105 가격도 알려줘요','차에서 전기 많이 쓰면 방전 잘돼요? 현금 돼요?'];
export const flows=[['방전됐어요','어제 실내등 켜놨어요','그게 원인이에요?','갈아야 하나요?'],['블랙박스 주차녹화 써요','자꾸 방전돼요','몇 시간까지 괜찮아요?'],['AGM105 가격','주차녹화 많이 쓰면 방전돼요?','오늘 가능?'],['최근 배터리 교체','실내등 켜둔 뒤 방전','A/S 되나요?'],['차에서 전기기기 많이 써요','배터리에 안 좋아요?','제 차는 어떤 배터리?']];
negatives.push('애등원시켜야되는데 차먹통ㅠㅠ','라디오혼자껏켯함;;','차 문 열어 두면 고양이가 나갈 수 있어요','냉장고 전원을 차에서 쓴 적은 없어요','대문미리열어놓나요?','사고 후 전조등 한쪽이 계속 켜져요','침수됐는데 실내등이 혼자 켜집니다');
export function run(){
 const j=p=>JSON.parse(fs.readFileSync(p)),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,catalog=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json');
 const names='ELECTRICAL_LOAD_USAGE_WRONG_INTENT ELECTRICAL_LOAD_USAGE_VEHICLE_FALLBACK ELECTRICAL_LOAD_SINGLE_CAUSE_OVERCLAIM ELECTRICAL_LOAD_DURATION_FABRICATED ELECTRICAL_LOAD_CURRENT_DRAW_FABRICATED ELECTRICAL_LOAD_SERVICE_FABRICATED BLACKBOX_CAUSE_OVERCLAIM INTERIOR_LIGHT_CAUSE_OVERCLAIM ACCESSORY_LOAD_FALSE_POSITIVE MULTI_INTENT_LOST SESSION_CONTEXT_LOST UNAUTHORIZED_REPLACEMENT_CONFIRMATION VOLTAGE_FABRICATED CCA_SOH_FABRICATED PHONE_DEFLECTION_WHEN_KNOWLEDGE_AVAILABLE'.split(' '),gates=Object.fromEntries(names.map(k=>[k,0])),checks={...gates},evidence=[];
 const check=(k,ok,q)=>{checks[k]++;if(!ok){gates[k]++;console.error(k,q);}},turn=(q,state=createConversationState())=>{const out=conversationTurn(state,q,rows,areas,catalog,policy),s=out.messages.join(' ');evidence.push({q,before:state,output:out});check('SESSION_CONTEXT_LOST',JSON.stringify(decodeSession(encodeSession(out.state,[]))?.state)===JSON.stringify(out.state),q);
 for(const k of ['ELECTRICAL_LOAD_SINGLE_CAUSE_OVERCLAIM','BLACKBOX_CAUSE_OVERCLAIM','INTERIOR_LIGHT_CAUSE_OVERCLAIM'])check(k,!/(?:블랙박스|실내등|장치)\s*때문입니다|원인은.*(?:확실|입니다)/.test(s),q);
 check('ELECTRICAL_LOAD_DURATION_FABRICATED',!/\d+\s*시간.*(?:안전|반드시|방전됩니다|괜찮습니다)/.test(s),q);check('ELECTRICAL_LOAD_CURRENT_DRAW_FABRICATED',!/\d+(?:\.\d+)?\s*(?:암페어|와트|mA\b|W\b)/i.test(s),q);
 check('ELECTRICAL_LOAD_SERVICE_FABRICATED',!/(?:블랙박스|전조등|라디오).*(?:설치해드립니다|수리해드립니다)/.test(s),q);check('UNAUTHORIZED_REPLACEMENT_CONFIRMATION',!/반드시 교체|무조건 교체|배터리 불량입니다/.test(s),q);check('VOLTAGE_FABRICATED',!/\d+(?:\.\d+)?\s*(?:볼트|V\b)/i.test(s),q);check('CCA_SOH_FABRICATED',!/\d+\s*(?:CCA|SOH|%)/i.test(s),q);return out;};
 for(const q of positives)for(const input of [q,q.replaceAll(' ','')]){const p=electricalLoadPlan(input),o=turn(input),s=o.messages.join(' ');check('ELECTRICAL_LOAD_USAGE_WRONG_INTENT',Boolean(p)&&/KNOWLEDGE_(?:ELECTRICAL_LOAD|LOAD_SCOPE)/.test(o.state.lastIntent),input);check('ELECTRICAL_LOAD_USAGE_VEHICLE_FALLBACK',!/차량명|어떤 차량|차량마다 배터리/.test(s),input);check('PHONE_DEFLECTION_WHEN_KNOWLEDGE_AVAILABLE',!o.actions.includes('phone'),input);if(!p?.clarify)assert.match(s,/여러 요인|한 가지 원인으로 단정하지/);}
 for(const q of negatives){check('ACCESSORY_LOAD_FALSE_POSITIVE',electricalLoadPlan(q)===null,q);const o=turn(q);if(/블랙박스.*(?:설치|가격)/.test(q))assert.match(o.messages.join(' '),/기기 서비스.*별도 확인/);}
 for(const[i,q]of combined.entries()){const o=turn(q),s=o.messages.join(' ');check('MULTI_INTENT_LOST',/여러 요인/.test(s)&&[/실시간/,/교체.*단정|증상만/,/28만원/,/현금결제/][i].test(s),q);}
 for(const[fi,f]of flows.entries()){let state=createConversationState();for(const[ti,q]of f.entries()){const before=state,o=turn(q,state);state=o.state;const relevant=fi===0&&ti>=1||fi===1||fi===2&&ti===1||fi===3&&ti===1||fi===4&&ti<2;if(relevant)check('SESSION_CONTEXT_LOST',!/차량명|어떤 차량|차량마다 배터리/.test(o.messages.join(' ')),q);if(before.quotedSpec)check('SESSION_CONTEXT_LOST',state.quotedSpec===before.quotedSpec,q);}}
 assert.equal(rows.length,917);assert.equal(areas.length,665);fs.writeFileSync(os.tmpdir()+'/electrical-load-focused.json',JSON.stringify({count:evidence.length,gates,checks,evidence},null,2));console.log(JSON.stringify({count:evidence.length,gates,checks}));assert.equal(Object.values(gates).reduce((a,b)=>a+b,0),0);
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)run();
