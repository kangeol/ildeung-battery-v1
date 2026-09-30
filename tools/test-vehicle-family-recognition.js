import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildVehicleGroups,normalizeText,parseYearRange,yearMatches} from '../js/smart-consult-core.js';
import {resolveVehicleText} from '../js/vehicle-aliases.js';
import {conversationTurn,createConversationState,filteredRows} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manufacturers=read('data/manufacturers.json');
const records=manufacturers.flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const turn=(text,state=createConversationState(),rows=records)=>conversationTurn(state,text,rows,areas,prices,policy);
const groups=buildVehicleGroups(records),keys=new Map();
let variants=0,boundaries=0;
for(const g of groups){
 const key=normalizeText(g.vehicle);if(!keys.has(key))keys.set(key,[]);keys.get(key).push(g.key);
 const starts=g.records.map(r=>parseYearRange(r.year).start).filter(Boolean),year=Math.min(...starts);
 for(const text of [g.vehicle,g.vehicle.toLowerCase(),g.vehicle.toUpperCase(),g.vehicle.replace(/\s/g,''),g.manufacturerName+' '+g.vehicle,g.manufacturerName+g.vehicle,g.vehicle+' '+year+'년식 배터리']){
  assert.deepEqual(resolveVehicleText(text,records).matches.map(m=>m.key),[g.key],text);variants++;
 }
 // No nearest-year coercion: the original year survives, and nothing is quoted.
 if(year>1900&&!g.records.some(r=>yearMatches(r.year,year-1))){
  const out=turn(g.manufacturerName+' '+g.vehicle+' '+(year-1)+'년식 배터리 가격');
  assert.equal(out.state.year,year-1,g.key);
  assert.equal(out.state.confirmedBattery,null,g.key);
  assert.ok(out.state.pendingVehicleConfirmation,g.key);
  assert.ok(!out.messages.some(m=>m.includes('교체 가격은')),g.key);boundaries++;
 }
}
const inputs=['Sm6 2017년식 밧데리 교체비용','sm6 2017년식 배터리 가격','SM6 17년식 배터리 얼마','르노삼성 sm6 2017년식 밧데리 가격','르노 SM6 2017년식 배터리 가격','SM6 배터리 가격','SM6 2015년식 배터리 가격','토레스 2023년식 배터리','더뉴토레스 2023년식 배터리','더 뉴 토레스 2023년식 배터리','bmw5시리즈 2014 배터리','BMW 5 시리즈 2014년식','5시리즈 2014년식','x5 2020 배터리','벤츠e클래스 2018 배터리','벤츠 E 클래스 2018년식','E클래스 2018 배터리','a6 2020 배터리','아우디a6 2020년식','g80 2021 배터리','k5 2020 배터리','아반떼 2020 배터리'];
const matrix=inputs.map(text=>{const o=turn(text);assert.ok(o.state.selectedVehicleKey||o.state.pendingVehicleConfirmation,text);return {text,key:o.state.selectedVehicleKey,year:o.state.year,candidates:filteredRows(records,o.state).length,messages:o.messages};});
let invalid=turn('SM6 2015년식 배터리 가격');
assert.ok(invalid.state.pendingVehicleConfirmation);
const restored=decodeSession(encodeSession(invalid.state,[]));assert.ok(restored);
invalid=turn('네',restored.state);assert.equal(invalid.state.year,2015);assert.equal(invalid.state.confirmedBattery,null);assert.match(invalid.messages.join(' '),/연식/);
const corrected=turn('2017년식',invalid.state);assert.equal(corrected.state.year,2017);assert.equal(corrected.state.pendingVehicleConfirmation,null);assert.ok(filteredRows(records,corrected.state).length);
const changed=turn('BMW 5시리즈 2014년식',invalid.state);assert.equal(changed.state.selectedVehicleKey,'bmw|5시리즈');assert.equal(changed.state.pendingVehicleConfirmation,null);
for(const input of ['더뉴토레스 2023년식','더 뉴 토레스 2023년식']){const o=turn(input);assert.equal(o.state.vehicleFamily,'토레스');assert.equal(o.state.year,2023);assert.equal(o.state.confirmedBattery,null);assert.ok(o.state.pendingVehicleConfirmation);}
// Same spelling at another manufacturer must not silently select either vehicle.
const synthetic=[...records,{...records.find(r=>r.vehicle==='SM6'),manufacturerId:'other',manufacturerName:'기타'}];
assert.equal(turn('SM6 배터리 가격',undefined,synthetic).state.confirmedBattery,null);
assert.ok(resolveVehicleText('SM6',synthetic).matches.length>1);
for(const text of ['5','e','4'])assert.equal(turn(text).state.confirmedBattery,null);
console.log(JSON.stringify({status:'PASS',rows:records.length,manufacturers:manufacturers.length,families:groups.length,normalizedFamilies:keys.size,collisions:[...keys].filter(([,v])=>v.length>1),variants,boundaries,matrix},null,2));
