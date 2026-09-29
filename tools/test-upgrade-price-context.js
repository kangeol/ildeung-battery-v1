import assert from 'node:assert/strict';
import fs from 'node:fs';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {parseYearRange} from '../js/smart-consult-core.js';
import {priceDescription} from '../js/smart-consult-prices.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';

const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json'),areas=read('seo-data/smart-consult-location-index.json').localities;
const turn=(state,text,catalog=prices)=>conversationTurn(state,text,records,areas,catalog,policy);
const first=text=>turn(createConversationState(),text);
const baseline=process.argv.includes('--baseline');
let offered=0,implicitCorrect=0,explicitCorrect=0;
for(const r of records.filter(r=>r.upgradeBattery&&r.upgradeBattery!==r.defaultBattery)) {
  const state={...createConversationState(),selectedVehicleKey:r.manufacturerId+'|'+r.vehicle,manufacturer:r.manufacturerId,manufacturerName:r.manufacturerName,vehicleFamily:r.vehicle,detailModel:r.detailModel,exactFuel:r.fuel,yearRange:r.year,year:parseYearRange(r.year).start};
  const initial=turn(state,String(state.year));
  if(!initial.messages.some(m=>m.includes('업그레이드')))continue;
  offered++;
  const implicit=turn(initial.state,'업그레이드 가격'),explicit=turn(initial.state,r.upgradeBattery+' 가격');
  const expected=priceDescription(r.upgradeBattery,prices);
  if(implicit.state.quotedSpec===r.upgradeBattery&&implicit.messages.includes(expected))implicitCorrect++;
  if(explicit.state.quotedSpec===r.upgradeBattery&&explicit.messages.includes(expected))explicitCorrect++;
  if(!baseline){assert.deepEqual(implicit.messages,explicit.messages);assert.equal(implicit.state.confirmedBattery,r.defaultBattery);}
}
assert.equal(offered,198);assert.equal(explicitCorrect,198);assert.equal(implicitCorrect,baseline?0:198);
console.log({phase:baseline?'BASELINE':'CANDIDATE',offered,implicitCorrect,explicitCorrect});
if(baseline)process.exit(0);

const vehicles=['bmw 5시리즈 LCI모델 2014년식','아우디 A4 2020년식','벤츠 B클래스 2008년식 가솔린','쉐보레 스파크 2016년식 가솔린','현대 아반떼 2008년식 가솔린','기아 카니발 2016년식 가솔린'];
const references=['업그레이드 가격','업그레이드 진행 시 가격','업그레이드하면 얼마','큰 걸로 하면 얼마','큰 배터리는 얼마','상위 배터리 가격','위에 말한 업그레이드는 얼마','용량 큰 걸로 하면 얼마','용량 큰 걸로 교체하면','큰 걸로 하면','한 단계 큰 걸로 하면'];
for(const input of vehicles){
  const a=first(input),spec=a.state.result.upgradeBattery;
  for(const q of references){const b=turn(a.state,q);assert.equal(b.state.quotedSpec,spec,input+' / '+q);assert.ok(b.messages.includes(priceDescription(spec,prices)));assert.ok(!b.messages.some(m=>m.includes('기본 배터리는')));}
  for(const q of ['가격','기본 가격','교체 가격'])assert.ok(turn(a.state,q).messages.includes(priceDescription(a.state.confirmedBattery,prices)));
  const explicit=turn(a.state,spec+' 가격');
  for(const q of ['그걸로 하면 얼마','그 제품 가격','그 배터리 가격'])assert.equal(turn(explicit.state,q).state.quotedSpec,spec);
  const ambiguous=turn(a.state,'그 제품 가격');assert.ok(!ambiguous.messages.some(m=>m.includes('교체 가격은')));
}
const bmw=first(vehicles[0]);
assert.ok(turn(bmw.state,'바르타 업그레이드 가격').messages.includes(priceDescription('AGM105',prices,'VARTA')));
for(const q of ['AGM105 가격','AGM105는 얼마','바르타 AGM105 가격'])assert.equal(turn(bmw.state,q).state.quotedSpec,'AGM105');
const upgrade=turn(bmw.state,'업그레이드 가격');
assert.equal(turn(decodeSession(encodeSession(upgrade.state,[])).state,'그 배터리 가격').state.quotedSpec,'AGM105');
assert.equal(createConversationState().priceReference,'');
// Old v3 envelope must gain an empty reference, never an invented selection.
const oldState={...bmw.state};delete oldState.priceReference;
const body=JSON.stringify({state:oldState,messages:[],entryId:null});let hash=2166136261;for(const c of body)hash=Math.imul(hash^c.charCodeAt(0),16777619);
assert.equal(decodeSession(JSON.stringify({version:3,savedAt:Date.now(),body,checksum:(hash>>>0).toString(16)})).state.priceReference,'');
const changed=turn(upgrade.state,'현대 아반떼 2008년식 가솔린');
assert.notEqual(turn(changed.state,'그걸로 가격').state.quotedSpec,'AGM105');
const g70=first('BMW 7시리즈 2024년식');assert.equal(g70.state.confirmedBattery,null);assert.ok(turn(g70.state,'업그레이드 가격').actions.includes('phone'));
const noUpgrade=first('현대 그랜저 2024년식 가솔린');
assert.ok(!noUpgrade.state.result?.upgradeBattery);
assert.ok(!turn(noUpgrade.state,'큰 걸로 하면 얼마').messages.some(m=>m.includes('교체 가격은')));
const missing=structuredClone(prices);delete missing.prices.AGM105;missing.unpriced.push('AGM105');
const unknown=turn(bmw.state,'업그레이드 가격',missing);assert.equal(unknown.state.quotedSpec,'AGM105');assert.match(unknown.messages.join(' '),/가격 확인/);assert.doesNotMatch(unknown.messages.join(' '),/22만원/);
for(const q of ['큰 배터리 쓰면 좋은가요?','배터리 용량 큰 거 쓰면 문제 있나요?'])assert.ok(!turn(bmw.state,q).messages.some(m=>m.includes('교체 가격은')));
console.log({naturalVehicles:vehicles.length,upgradeExpressions:references.length,context:'PASS',session:'PASS',safety:'PASS'});
