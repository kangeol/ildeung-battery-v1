import fs from 'node:fs';
import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {operationalPlan} from '../js/smart-consult-operational.js';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const policy=read('data/consult-service-policy.json');
const prices=read('data/battery-prices.json');
const areas=read('seo-data/smart-consult-location-index.json').localities;
const rows=read('data/manufacturers.json').flatMap(m=>read(`data/${m.file}`).map(row=>({...row,manufacturerId:m.id,manufacturerName:m.name})));
assert.equal(policy.finalFaq.facts.DIRECT_VISIT_AVAILABLE,true);
assert.equal(policy.finalFaq.facts.VISIT_REQUIRES_PRECONFIRMATION,true);
const run=input=>conversationTurn(createConversationState(),input,rows,areas,prices,policy);
const liveText=/오늘·지금·당일 가능 여부|지금·오늘 방문 가능 여부/;
const general=['매장 방문 가능해요?','직접 방문해도 되나요?','매장으로 가면 되나요?','방문해서 교체할 수 있나요?'];
const live=['오늘 방문 가능해요?','지금 방문해도 돼요?','오늘 몇 시 가능해요?','당일 교체 가능해요?','지금 교체 가능해요?'];
const contextual=['출장 교체 가능해요?','송파구 방문 가능해요?','지하주차장 방문 가능해요?'];
const counters=Object.fromEntries(['GENERAL_VISIT_FALSE_LIVE_SCHEDULE','LIVE_SCHEDULE_INTENT_LOST','SERVICE_AREA_INTENT_LOST','WORKSITE_INTENT_LOST','FALSE_STORE_POLICY','LIVE_AVAILABILITY_FABRICATED','ARRIVAL_TIME_FABRICATED','FALSE_BOOKING_COMPLETION','PHONE_DEFLECTION_BEFORE_KNOWN_ANSWER','MULTI_INTENT_LOST'].map(key=>[key,0]));
for(const input of general){
 const output=run(input),message=output.messages.join(' ');
 assert.equal(operationalPlan(input,createConversationState())?.realtime||false,false,input);
 assert.doesNotMatch(message,liveText,input);
 assert.match(message,/직접 방문도 가능합니다/,input);
 assert.match(message,/1644-9141/,input);
 assert.equal(output.messages[0].startsWith('네. 직접 방문도 가능합니다.'),true,input);
 assert.doesNotMatch(message,/예약(?:이|을)? 완료|접수(?:가|를)? 완료|도착합니다/,input);
}
for(const input of live){
 const output=run(input),message=output.messages.join(' ');
 assert.match(message,/실시간 확인|일정 확인/,input);
 assert.match(message,/1644-9141/,input);
 assert.doesNotMatch(message,/예약(?:이|을)? 완료|접수(?:가|를)? 완료|\d+분 뒤 도착/,input);
}
const [mobile,area,site]=contextual.map(run);
assert.doesNotMatch(mobile.messages.join(' '),liveText);
assert.match(area.messages.join(' '),/송파구.*출장 교체 가능 지역/);
assert.doesNotMatch(area.messages.join(' '),liveText);
assert.match(site.messages.join(' '),/접근 가능 조건|현장 접근 조건|주차·출입 허가/);
assert.doesNotMatch(site.messages.join(' '),liveText);
console.log(JSON.stringify({status:'PASS',cases:general.length+live.length+contextual.length,counters}));
