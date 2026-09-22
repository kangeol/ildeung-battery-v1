import assert from 'node:assert/strict';
import fs from 'node:fs';
import {batteryCertainty,resolveConsultation,parseYearRange,yearMatches,usableBattery,buildVehicleGroups} from '../js/smart-consult-core.js';
import {conversationTurn,createConversationState,filteredRows} from '../js/smart-consult-conversation.js';
const manufacturers=JSON.parse(fs.readFileSync('data/manufacturers.json'));
const records=manufacturers.flatMap(m=>JSON.parse(fs.readFileSync(`data/${m.file}`)).map((r,index)=>({...r,manufacturerId:m.id,manufacturerName:m.name,source:`data/${m.file}`,index})));
assert.equal(records.length,917);
const groups=buildVehicleGroups(records), failures=[],transcripts=[];
let cases=0,ambiguousPrevented=0;
let partialNluCases=0,yearCases=0,ambiguousAutoConfirm=0,unknownRowOverridden=0;
const fuelClass=value=>/하이브리드|\+전기/.test(value)?'하이브리드':/가솔린/.test(value)?'가솔린':/디젤/.test(value)?'디젤':/LPG/.test(value)?'LPG':/전기/.test(value)?'전기':'';
for(const row of records){
 const family=groups.find(g=>g.key===`${row.manufacturerId}|${row.vehicle}`).records;
 const range=parseYearRange(row.year),year=range.start||range.end||2026;
 for(const facts of [{},{year},{year,fuel:row.fuel},{year,yearRange:row.year,fuel:row.fuel,detailModel:row.detailModel}]){
  const candidates=family.filter(r=>(!facts.year||yearMatches(r.year,facts.year))&&(!facts.yearRange||r.year===facts.yearRange)&&(!facts.fuel||r.fuel===facts.fuel)&&(!facts.detailModel||r.detailModel===facts.detailModel));
  const expected=batteryCertainty(candidates),result=resolveConsultation(family,facts);
  assert.equal(result.type==='result',expected.safe);
  if(result.type==='result')assert.ok(candidates.every(r=>r.defaultBattery===result.result.defaultBattery));
  if(new Set(candidates.map(r=>r.defaultBattery)).size>1)ambiguousPrevented++;
  const reverse=resolveConsultation([...family].reverse(),facts);
  assert.equal(reverse.type,result.type);assert.equal(reverse.result?.defaultBattery,result.result?.defaultBattery);
  cases++;
 }
 const text=`${row.manufacturerName} ${row.vehicle} ${row.detailModel} ${year}년식 ${row.fuel}`;
 const out=conversationTurn(createConversationState(),text,records);
 if(out.state.confirmedBattery && out.state.confirmedBattery!==row.defaultBattery)failures.push({source:row.source,index:row.index,text,expected:row.defaultBattery,actual:out.state.confirmedBattery,state:out.state});
 for(const stage of [1,2,3]){
  const fuel=stage===3?fuelClass(row.fuel):'';
  const input=`${row.manufacturerName} ${row.vehicle}${stage>1?` ${year}년식`:''}${fuel?` ${fuel}`:''}`;
  const expected=family.filter(r=>(stage===1||yearMatches(r.year,year))&&(!fuel||!fuelClass(r.fuel)||fuelClass(r.fuel)===fuel));
  let response=conversationTurn(createConversationState(),input,records);
  if(response.state.pendingVehicleConfirmation)response=conversationTurn(response.state,'네',records);
  if(response.state.confirmedBattery&&(!batteryCertainty(expected).safe||expected[0].defaultBattery!==response.state.confirmedBattery))failures.push({source:row.source,index:row.index,stage,text:input,actual:response.state.confirmedBattery,expected:expected.map(r=>r.defaultBattery)});
  partialNluCases++;
 }
}
for(const group of groups){
 const start=Math.min(...group.records.map(r=>parseYearRange(r.year).start).filter(Boolean));
 for(let year=start;year<=2027;year++){
  const candidates=group.records.filter(r=>yearMatches(r.year,year));
  const result=resolveConsultation(group.records,{year});
  if(result.type==='result'){
   if(new Set(candidates.map(r=>r.defaultBattery)).size>1)ambiguousAutoConfirm++;
   if(candidates.some(r=>!usableBattery(r.defaultBattery)))unknownRowOverridden++;
   assert.ok(candidates.length&&candidates.every(r=>r.defaultBattery===result.result.defaultBattery));
  }
  yearCases++;
 }
}
assert.equal(ambiguousAutoConfirm,0);assert.equal(unknownRowOverridden,0);
const template={...records[0],year:'20~26년',detailModel:'같은 모델',fuel:'가솔린'};
for(const batteries of [['AGM70','AGM80'],['AGM70','고객센터문의'],['고객센터문의'],['AGM70 / AGM80'],['AG60']]){
 const result=resolveConsultation(batteries.map(defaultBattery=>({...template,defaultBattery})),{});
 assert.notEqual(result.type,'result');
 if(batteries.length>1)assert.equal(result.type,'manual-confirmation');
}
for(const text of ['그랜저 GN7 2023년식','그랜저 2023년식','그랜저 GN7 2024년식 가솔린 2.5','그랜저 GN7 2024년식 가솔린 3.5','그랜저 GN7 2024년식 LPG','그랜저 2021년식','벤츠 E-클래스 2024년식','BMW 5시리즈 2023년식','제네시스 G70 2024년식','현대 아반떼 2023년식','현대 싼타페 2023년식','기아 카니발 2020년식','르노 QM6 2019년식']){
 let out=conversationTurn(createConversationState(),text,records);
 if(out.state.pendingVehicleConfirmation)out=conversationTurn(out.state,'네',records);
 const candidates=filteredRows(records,out.state);
 if(out.state.confirmedBattery)assert.ok(batteryCertainty(candidates).safe);
 if(text.includes('그랜저')&&!text.includes('2021'))assert.notEqual(out.state.confirmedBattery,'AGM80');
 if(text.includes('2021'))assert.ok(candidates.every(r=>!r.detailModel.includes('GN7')));
 transcripts.push({text,messages:out.messages,choices:out.chips,battery:out.state.confirmedBattery,candidates:candidates.map(r=>({source:r.source,index:r.index,defaultBattery:r.defaultBattery}))});
}
for(const year of [2023,2024,2025,2026,2027,2030])for(const fuel of ['','가솔린','가솔린 2.5','가솔린 3.3','가솔린 3.5','LPG','하이브리드 1.6']){
 const out=conversationTurn(createConversationState(),`그랜저 GN7 ${year}년식 ${fuel}`,records);
 assert.notEqual(out.state.confirmedBattery,'AGM80');
}
const report={cases,partialNluCases,yearCases,ambiguousPrevented,ambiguousAutoConfirm,unknownRowOverridden,wrongBatteryRecommendations:failures.length,failures,transcripts};
const evidenceDir=process.argv.includes('--brand')?'docs/evidence/brand-service':process.argv.includes('--pricing')?'docs/evidence/battery-pricing':process.argv.includes('--continuation')?'docs/evidence/db-driven-flow':'docs/evidence/battery-certainty';
fs.mkdirSync(evidenceDir,{recursive:true});
fs.writeFileSync(`${evidenceDir}/simulation.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases,ambiguousPrevented,wrongBatteryRecommendations:failures.length,firstFailures:failures.slice(0,8),transcripts},null,2));
assert.equal(failures.length,0,'full canonical natural-language condition must not yield another battery');
