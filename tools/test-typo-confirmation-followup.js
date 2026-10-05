import fs from 'node:fs';
import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {buildVehicleTypoIndex,proposeVehicleTypo} from '../js/vehicle-aliases.js';
import {parseYearRange} from '../js/smart-consult-core.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const turn=(q,s=createConversationState(),rows=records)=>conversationTurn(s,q,rows,[],prices,policy);
const initial=turn('펠리세이드 2019년식');
assert.equal(initial.state.pendingVehicleConfirmation.key,'hyundai|팰리세이드');
assert.equal(initial.state.selectedVehicleKey,'');
for(const state of [initial.state,decodeSession(encodeSession(initial.state,[])).state]){
 const o=turn('펠리세이드 교체비용',state);
 assert.equal(o.state.pendingVehicleConfirmation,null);
 assert.equal(o.state.selectedVehicleKey,'hyundai|팰리세이드');
 assert.equal(o.state.year,2019);assert.equal(o.state.priceIntent,true);
 assert.equal(o.state.lastIntent,'PRICE_QUESTION');assert.equal(o.state.turnIndex,2);
 assert.ok(o.messages.some(m=>m.includes('19만원')));
 assert.ok(!o.messages.some(m=>/말씀하시는|어떤 차량/.test(m)));
}
// Every eligible target supplies a deterministic radius-one witness. The
// existing resolver, not the test, decides whether it is uniquely safe.
let targets=0,implicit=0,explicit=0,negative=0,sessions=0;
for(const target of buildVehicleTypoIndex(records).filter(t=>t.eligible)){
 const words=Array.from(target.token,(_,i)=>target.token.slice(0,i)+'뷁'+target.token.slice(i+1));
 const word=words.find(w=>{const p=proposeVehicleTypo(w,records);return p?.key===target.key&&p.detailModel===target.detailModel;});
 assert.ok(word,'safe witness required: '+target.label);
 const row=records.find(r=>`${r.manufacturerId}|${r.vehicle}`===target.key&&(!target.detailModel||r.detailModel===target.detailModel));
 const range=parseYearRange(row.year),year=range.start||range.end;
 assert.ok(year,'valid year: '+row.year);
 const pending=turn(`${word} ${year}년식`).state;
 assert.equal(pending.pendingVehicleConfirmation?.key,target.key,word);
 for(const q of [word+' 가격',word+' 교체비용',target.label+' 가격']){
  const o=turn(q,pending);
  assert.notEqual(o.state.pendingVehicleConfirmation?.typo,true,q);
  assert.equal(o.state.selectedVehicleKey,target.key,q);
  assert.equal(o.state.year,year,q);assert.equal(o.state.priceIntent,true,q);
  assert.ok(!o.messages.some(m=>/말씀하시는 걸까요/.test(m)),q);
  implicit++;
 }
 const yes=turn('네',pending);assert.equal(yes.state.selectedVehicleKey,target.key);explicit++;
 const no=turn('아니요',pending);assert.equal(no.state.pendingVehicleConfirmation,null);assert.equal(no.state.selectedVehicleKey,'');explicit++;
 const bare=turn('가격',pending);assert.equal(bare.state.selectedVehicleKey,'');assert.equal(bare.state.confirmedBattery,null);negative++;
 const other=turn('G70',pending);assert.equal(other.state.selectedVehicleKey,'genesis|G70');assert.notEqual(other.state.pendingVehicleConfirmation?.typo,true);negative++;
 const conflict=turn(word+' 가격', {...pending,year:1900});
 assert.equal(conflict.state.selectedVehicleKey,'');assert.equal(conflict.state.confirmedBattery,null);assert.equal(conflict.state.pendingVehicleConfirmation?.typo,true);negative++;
 const foreign=read('data/manufacturers.json').find(m=>m.id!==target.manufacturerId);
 const mismatch=turn(foreign.name+' '+word+' 가격',pending);assert.notEqual(mismatch.state.selectedVehicleKey,target.key);negative++;
 const restored=decodeSession(encodeSession(pending,[]));assert.ok(restored);
 assert.equal(turn(word+' 교체비용',restored.state).state.selectedVehicleKey,target.key);sessions++;
 targets++;
}
// Revalidate against current data: a newly competing family cannot inherit consent.
const synthetic=[...records,{...records.find(r=>r.vehicle==='팰리세이드'),vehicle:'펠리사이드',detailModel:'펠리사이드'}];
assert.equal(proposeVehicleTypo('펠리세이드',synthetic),null);
assert.equal(turn('펠리세이드 가격',initial.state,synthetic).state.selectedVehicleKey,'');negative++;
for(const q of ['BMW 펠리세이드 가격','BMW 팰리세이드 가격','펠리세이드 W212 가격','펠리세이드 가격 G70','펠리세이드 가격 말리뷰','펠리세이드 말고 가격']){
 assert.notEqual(turn(q,initial.state).state.selectedVehicleKey,'hyundai|팰리세이드',q);negative++;
}
for(const q of ['A4','G70','BMW G70','8S'])assert.notEqual(turn(q).state.pendingVehicleConfirmation?.typo,true);
for(const request of ['규격','배터리','연료','출장','교체 가능','바르타 가격','재고']){
 const o=turn('펠리세이드 '+request,initial.state);
 const canonical=turn('현대 팰리세이드 2019년식 '+request,{...initial.state,pendingVehicleConfirmation:null});
 assert.deepEqual(o.messages,canonical.messages,request+' preserved canonical routing');
 assert.equal(o.state.selectedVehicleKey,'hyundai|팰리세이드');
}
for(const yes of ['네','예','맞아요'])assert.equal(turn(yes,initial.state).state.selectedVehicleKey,'hyundai|팰리세이드');
const fuelPending=turn('펠리세이드 2019년식 디젤').state;
assert.equal(turn('펠리세이드 교체비용',fuelPending).state.fuel,'디젤');
const invalid=turn('펠리세이드 1900년식').state;
assert.equal(turn('펠리세이드 교체비용',invalid).state.selectedVehicleKey,'');
const corrected=turn('펠리세이드 교체비용 2019년식',invalid);
assert.equal(corrected.state.year,2019);assert.equal(corrected.state.selectedVehicleKey,'hyundai|팰리세이드');
assert.equal(turn('가격',createConversationState()).state.pendingVehicleConfirmation,null);
console.log({status:'PASS',rows:records.length,targets,implicit,explicit,negative,sessions,incident:'PASS'});
