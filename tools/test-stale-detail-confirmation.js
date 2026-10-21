import fs from 'node:fs';
import assert from 'node:assert/strict';
import {conversationTurn,createConversationState,filteredRows} from '../js/smart-consult-conversation.js';
import {resolveVehicleText} from '../js/vehicle-aliases.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
import {buildVehicleGroups,parseYearRange,yearMatches} from '../js/smart-consult-core.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const turn=(text,state=createConversationState())=>conversationTurn(state,text,rows,areas,prices,policy);
const stale=()=>({...createConversationState(),manufacturer:'kia',manufacturerName:'기아',selectedVehicleKey:'kia|K5',vehicleFamily:'K5',year:2020,detailModel:'더 뉴 K5',detailModels:['더 뉴 K5'],pendingVehicleConfirmation:{key:'kia|K5',label:'기아 더 뉴 K5'}});
let checks=0;
for(const initial of [createConversationState(),stale(),decodeSession(encodeSession(stale(),[])).state]){
 let state=initial;
 for(const q of ['기아k5 20년식','네','K5 2020년8월','기아k53세대','K5 2020년']){
  const o=turn(q,state);state=o.state;
  assert.equal(state.selectedVehicleKey,'kia|K5');assert.equal(state.year,2020);
  assert.deepEqual([...new Set(filteredRows(rows,state).map(r=>r.detailModel))],['K5 DL3']);
  assert.equal(state.confirmedBattery,null);assert.doesNotMatch(o.messages.join(' '),/2013|2015|DF80L|교체 가격/);checks++;
  assert.equal(state.previousQuestion.field,'fuel');
 }
 for(const [fuel,spec,amount,copy] of [['가솔린','AGM70',170000,'17만원'],['LPG','DIN60HL',105000,'10만5천원']]){
  const o=turn(fuel,state);assert.equal(o.state.result.defaultBattery,spec);assert.equal(prices.prices[spec],amount);assert.ok(o.messages.join(' ').includes(copy));checks++;
 }
}
for(const q of ['K5 2020년식','K5 2020년 8월','기아 K5 DL3 2020','K5 2020년 3세대']){
 const o=turn(q,stale());assert.equal(o.state.previousQuestion.field,'fuel');assert.equal(o.state.result,null);checks++;
}
for(const q of ['기아 K5 3세대','기아k53세대','K5 3세대']){
 const o=turn(q);assert.equal(o.state.selectedVehicleKey,'kia|K5');
 assert.ok(filteredRows(rows,o.state).every(r=>r.detailModel.includes('DL3')));assert.equal(o.state.result,null);checks++;
}
for(const [q,detail] of [['K5 2014','더 뉴 K5'],['K5 2018','2세대'],['K5 2020','K5 DL3']]){
 const o=turn(q);assert.ok(filteredRows(rows,o.state).some(r=>r.detailModel.includes(detail)),q);checks++;
}
const boundary=turn('K5 2023');assert.ok(new Set(filteredRows(rows,boundary.state).map(r=>r.detailModel)).size>1);checks++;
const yes=turn('네',stale());assert.equal(yes.state.year,2020);assert.equal(yes.state.result,null);checks++;
const staleRange=turn('K5 2020년',{...stale(),detailModel:'',detailModels:[],yearRange:'13~15년'});
assert.equal(staleRange.state.yearRange,'');assert.equal(filteredRows(rows,staleRange.state).length,2);checks++;
for(const q of ['더 뉴 K5 2020년','K5 DL3 2014','K5 9세대','기아 K53','K3 3세대']){
 const o=turn(q);assert.equal(o.state.result,null,q);checks++;
}
assert.equal(resolveVehicleText('K3',rows).matches[0].key,'kia|K3');checks++;
let recoveredFamilies=0;
for(const g of buildVehicleGroups(rows)){
 const target=g.records.find(r=>parseYearRange(r.year).start&&g.records.some(old=>old.detailModel!==r.detailModel&&!yearMatches(old.year,parseYearRange(r.year).start)));
 if(!target)continue;
 const year=parseYearRange(target.year).start,old=g.records.find(r=>r.detailModel!==target.detailModel&&!yearMatches(r.year,year));
 // All rows of the old detail must conflict; shared detail labels are not stale.
 if(g.records.some(r=>r.detailModel===old.detailModel&&yearMatches(r.year,year)))continue;
 const state={...createConversationState(),manufacturer:g.manufacturerId,manufacturerName:g.manufacturerName,selectedVehicleKey:g.key,vehicleFamily:g.vehicle,year,detailModel:old.detailModel,detailModels:[old.detailModel]};
 const o=turn(`${g.manufacturerName} ${g.vehicle} ${year}년식`,state);
 assert.equal(o.state.selectedVehicleKey,g.key);assert.equal(o.state.year,year);
 assert.ok(filteredRows(rows,o.state).length,g.key+' stale detail recovery');
 assert.ok(filteredRows(rows,o.state).every(r=>yearMatches(r.year,year)));recoveredFamilies++;
}
console.log(JSON.stringify({checks,recoveredFamilies,result:'PASS',dataRows:rows.length}));
