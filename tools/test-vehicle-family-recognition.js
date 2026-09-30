import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildVehicleGroups,normalizeText,parseYearRange,yearMatches,MANUFACTURER_ALIASES} from '../js/smart-consult-core.js';
import {resolveVehicleText,buildGenerationIndex,generationCodesForRow} from '../js/vehicle-aliases.js';
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

// Data-derived properties grow with new families/codes, without count snapshots.
const codes=buildGenerationIndex(records);
let hardeningVariants=0,generationVariants=0,generationBoundaries=0,negativeCases=0;
const matches=(text,rs=records)=>resolveVehicleText(text,rs).matches.map(g=>g.key).sort();
for(const g of groups){
 const y=Math.min(...g.records.map(r=>parseYearRange(r.year).start).filter(Boolean));
 assert.ok(Number.isFinite(y),g.key+' has a parseable year');
 for(const name of new Set([g.vehicle,g.vehicle.replace(/([a-z])(?=\d)/gi,'$1 '),g.vehicle.replace(/(\d)(?=시리즈)/g,'$1 '),g.vehicle.replace(/클래스/g,' 클래스'),...g.records.map(r=>r.detailModel.replace(/(더|올) 뉴/g,'$1뉴').replace(/디 올 뉴/g,'디올뉴').replace(/더 넥스트/g,'더넥스트'))])){
  for(const text of [name,g.manufacturerName+' '+name,g.manufacturerName+name]){
   assert.deepEqual(matches(text),[g.key],text);hardeningVariants++;
  }
 }
 for(const brand of MANUFACTURER_ALIASES[g.manufacturerId]||[g.manufacturerName]){
  for(const text of [brand+' '+g.vehicle,brand+g.vehicle,brand+' '+g.vehicle+' '+y+'년식']){
   assert.deepEqual(matches(text),[g.key],text);hardeningVariants++;
  }
 }
}
const familyCodeCollisions=[...codes.values()].filter(e=>e.collisionWithCanonicalFamily).map(e=>({token:e.code,familyMatches:e.canonicalFamilies.map(g=>g.key),generationMatches:[...e.familyKeys],manufacturers:[...new Set([...e.manufacturers,...e.canonicalFamilies.map(g=>g.manufacturerId)])],exampleRows:e.rows.map(r=>({manufacturer:r.manufacturerId,family:r.vehicle,detail:r.detailModel,year:r.year})),riskClass:'CANONICAL_FAMILY_PRECEDENCE'}));
for(const e of codes.values()){
 const expectedBare=e.collisionWithCanonicalFamily?e.canonicalFamilies.map(g=>g.key).sort():[...e.familyKeys].sort();
 assert.deepEqual(matches(e.code),expectedBare,e.code+' bare precedence');
 for(const g of e.groups){
  const expected=e.canonicalFamilies.filter(f=>f.manufacturerId===g.manufacturerId);
  for(const text of [g.manufacturerName+' '+e.code,g.manufacturerName+e.code]){
   const actual=matches(text);assert.ok(actual.length);assert.ok(actual.every(key=>key.startsWith(g.manufacturerId+'|')),text);
   if(expected.length)assert.deepEqual(actual,expected.map(g=>g.key).sort(),text);
   else assert.ok(actual.every(key=>e.familyKeys.has(key)),text);generationVariants++;
  }
  for(const text of [g.vehicle+' '+e.code,g.manufacturerName+' '+g.vehicle+' '+e.code,g.manufacturerName+g.vehicle+e.code,e.code.toLowerCase()+' '+g.vehicle]){
   assert.deepEqual(matches(text),[g.key],text);generationVariants++;
  }
  const yr=Math.min(...e.rows.filter(r=>g.key===r.manufacturerId+'|'+r.vehicle).map(r=>parseYearRange(r.year).start).filter(Boolean));
  const o=turn(g.manufacturerName+' '+g.vehicle+' '+e.code+' '+yr+'년식 배터리');
  const selected=filteredRows(records,o.state);assert.ok(selected.length,e.code+' valid year');
  assert.ok(selected.every(r=>e.rows.includes(r)&&yearMatches(r.year,yr)),e.code+' compatible source rows');generationVariants++;
  const invalid=turn(g.manufacturerName+' '+g.vehicle+' '+e.code+' '+(yr-1)+'년식 배터리 가격');
  assert.equal(invalid.state.year,yr-1);assert.equal(invalid.state.confirmedBattery,null);assert.equal(invalid.vehicleRecognition.reason,'YEAR_CONFLICT');generationBoundaries++;
 }
}
const realCorpus=['Sm6 2017년식 밧데리 교체비용','르노삼성 sm6 2017년식 밧데리 가격','SM6 2015년식 배터리 가격','토레스 2023년식 배터리','더뉴 토레스 2023년식','BMW 5 시리즈 2014년식','BMW F10 배터리','5시리즈 F10','BMW G30','벤츠 E 클래스 2018년식','벤츠 W212','E클래스 W213','아우디 A4 B9','아우디 B9','X3 G01','G70','제네시스 G70','BMW G70','BMW 7시리즈 G70',...groups.filter((_,i)=>i%6===0).map(g=>g.manufacturerName+' '+g.vehicle+' 배터리 교체비용')];
for(const input of realCorpus){const o=turn(input);assert.ok(o.state.selectedVehicleKey||o.state.pendingVehicleConfirmation,input);}
for(const [input,key] of [['G70','genesis|G70'],['제네시스 G70','genesis|G70'],['G70 2024년식','genesis|G70'],['BMW G70','bmw|7시리즈'],['7시리즈 G70','bmw|7시리즈'],['BMW 7시리즈 G70','bmw|7시리즈']])assert.equal(turn(input).state.selectedVehicleKey,key,input);
for(const [input,reason] of [['BMW W212','MANUFACTURER_FAMILY_CONFLICT'],['벤츠 F10','MANUFACTURER_FAMILY_CONFLICT'],['A4 W212','GENERATION_FAMILY_CONFLICT'],['BMW 5시리즈 W212','MANUFACTURER_FAMILY_CONFLICT'],['벤츠 E클래스 F10','MANUFACTURER_FAMILY_CONFLICT'],['BMW F999','GENERATION_UNKNOWN']]){
 const o=turn(input);assert.equal(o.vehicleRecognition.reason,reason,input);assert.equal(o.state.confirmedBattery,null);assert.ok(!o.messages.some(m=>m.includes('교체 가격은')));negativeCases++;
}
for(const e of codes.values())for(const input of ['prefix'+e.code+'suffix','AGM105','DIN90','2024','100Ah']){
 assert.equal(resolveVehicleText(input,records).generationCodeDetected,undefined,input);negativeCases++;
}
// New data must surface new intersections and force safe ambiguity rather than
// silently selecting the first code match. These probes never mutate disk data.
const seed=records.find(r=>r.manufacturerId==='bmw'&&generationCodesForRow(r).includes('F10'));
const withFamily=[...records,{...seed,manufacturerId:'test',manufacturerName:'테스트',vehicle:'F10',detailModel:'F10'}];
assert.ok(buildGenerationIndex(withFamily).get('F10').collisionWithCanonicalFamily);
assert.deepEqual(matches('F10',withFamily),['test|F10']);
assert.deepEqual(matches('BMW F10',withFamily),['bmw|5시리즈']);
const withSharedCode=[...records,{...seed,vehicle:'테스트차',detailModel:'테스트차 (F10)'}];
assert.equal(buildGenerationIndex(withSharedCode).get('F10').uniqueFamily,false);
const ambiguous=turn('F10 배터리',undefined,withSharedCode);
assert.equal(ambiguous.state.confirmedBattery,null);assert.equal(ambiguous.vehicleRecognition.reason,'GENERATION_CODE_AMBIGUOUS');assert.ok(ambiguous.chips.length>=2&&ambiguous.chips.length<=4);
const sharedFamily=[...records,{...records.find(r=>r.vehicle==='SM6'),manufacturerId:'test',manufacturerName:'테스트'}];
assert.equal(turn('SM6 배터리',undefined,sharedFamily).vehicleRecognition.reason,'MULTIPLE_FAMILY_CANDIDATES');
const unknown=turn('자료없는차 배터리 가격');assert.equal(unknown.vehicleRecognition.reason,'VEHICLE_FAMILY_UNKNOWN');
const a7=turn('아우디 A7 2019년식'),g80=turn('G80 2023년식'),g90=turn('G90 2023년식');
assert.equal(a7.state.confirmedBattery,null);assert.equal(g80.state.confirmedBattery,'AGM95R');assert.equal(g90.state.confirmedBattery,null);
for(const input of ['아우디 A7 2015년식','G80 2017년식','G90 2019년식']){const o=turn(input);assert.equal(o.state.confirmedBattery,'AGM105');assert.ok(o.messages.some(m=>m.includes('28만원')));}
const gen=turn('BMW F10 배터리');const restoredGen=decodeSession(encodeSession(gen.state,[]));assert.ok(restoredGen);assert.equal(restoredGen.state.generation,'F10');
assert.ok(turn('업그레이드 가격',restoredGen.state).messages.some(m=>m.includes('AGM105')&&m.includes('28만원')));
assert.ok(turn('바르타 업그레이드 가격',restoredGen.state).messages.some(m=>m.includes('33만원')));
console.log(JSON.stringify({status:'PASS',rows:records.length,manufacturers:manufacturers.length,families:groups.length,normalizedFamilies:keys.size,collisions:[...keys].filter(([,v])=>v.length>1),variants,boundaries,hardeningVariants,generationVariants,generationBoundaries,generationCodeCount:codes.size,familyCodeCollisions,generationCollisions:[...codes.values()].filter(e=>!e.uniqueFamily).map(e=>({code:e.code,families:[...e.familyKeys]})),shortCodes:[...codes.keys()].filter(c=>c.length<=3),negativeCases,realCorpusCount:realCorpus.length,matrix},null,2));
