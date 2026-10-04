import assert from 'node:assert/strict';
import fs from 'node:fs';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {priceDescription} from '../js/smart-consult-prices.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const turn=(s,q,c=prices)=>conversationTurn(s,q,records,[],c,policy);
// Exact customer-message order recovered from the 2026-10-04 incident; no PII.
const initial=turn(turn(createConversationState(),'쉐보레 크루즈 14년식').state,'가솔린');
assert.equal(initial.state.result.defaultBattery,'DIN60HL');
assert.equal(initial.state.result.upgradeBattery,'DIN74L');
const incident=turn(initial.state,'DIN74L 갸격');
assert.deepEqual(incident.messages,turn(initial.state,'DIN74L 가격').messages);
assert.equal(incident.state.quotedSpec,'DIN74L');
assert.doesNotMatch(incident.messages.join(' '),/기본 배터리|상품 안내/);
let combinations=0,missing=0;
for(const state of [createConversationState(),initial.state])for(const spec of Object.keys(prices.prices))for(const word of ['가격','얼마','갸격'])for(const brand of ['',...Object.keys(prices.brands)]){
  const q=[brand,spec,word].filter(Boolean).join(' '),o=turn(state,q);
  assert.equal(o.state.quotedSpec,spec,q);
  assert.ok(o.messages.includes(priceDescription(spec,prices,brand)),q);
  assert.doesNotMatch(o.messages.join(' '),/기본 배터리|상품 안내/);
  assert.equal(o.state.confirmedBattery,state.confirmedBattery);
  assert.equal(o.state.selectedVehicleKey,state.selectedVehicleKey);
  combinations++;
}
// No unpriced entries currently exist: exercise missing prices without editing data.
for(const spec of [...new Set([...Object.keys(prices.prices),...prices.unpriced])]){
  const c=structuredClone(prices);delete c.prices[spec];c.unpriced=[...new Set([...c.unpriced,spec])];
  for(const b of Object.values(c.brands))if(b.prices)delete b.prices[spec];
  for(const word of ['가격','갸격']){const o=turn(initial.state,spec+' '+word,c);assert.equal(o.state.quotedSpec,spec);assert.ok(o.messages.includes(priceDescription(spec,c)));assert.doesNotMatch(o.messages.join(' '),/기본 배터리|교체 가격은/);missing++;}
}
for(const q of ['DIN74L갸격','din74l 갸격','DIN74L 갸격은요?'])assert.equal(turn(initial.state,q).state.quotedSpec,'DIN74L');
assert.deepEqual(turn(initial.state,'DIN 배터리가 뭐예요').messages,['고객님 차량의 기본 배터리는 DIN60HL입니다.','일반 · DIN 상품 안내에서 확인하실 수 있어요.']);
assert.match(turn(initial.state,'AGM과 DIN 차이').messages.join(' '),/유리섬유 매트/);
assert.match(turn(initial.state,'일반 DIN 상품 보고 싶어요').messages.join(' '),/구매 전 장착 규격/);
assert.ok(turn(initial.state,'일반 DIN 상품 보고 싶어요').actions.includes('stores'));
for(const q of ['DIN 갸격','AGM 갸격','갸격','크루즈 갸격'])assert.notEqual(turn(initial.state,q).state.quotedSpec,'DIN74L');
assert.equal(turn(decodeSession(encodeSession(incident.state,[])).state,'그 배터리 가격').state.quotedSpec,'DIN74L');
console.log({status:'PASS',exactIncident:true,pricedSpecs:Object.keys(prices.prices).length,canonicalUnpriced:prices.unpriced.length,combinations,syntheticMissing:missing,session:'PASS',store:'PASS'});
