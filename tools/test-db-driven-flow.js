import fs from 'node:fs';
import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {resolveLocation,classifyLocationAliases,auditLocations} from '../js/smart-consult-location.js';
import {normalizeText,parseYearRange,PHONE_HREF,DIN_STORE_URL,AGM_STORE_URL} from '../js/smart-consult-core.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read(`data/${m.file}`).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const localities=read('seo-data/smart-consult-location-index.json').localities;
const source=read('seo-data/service-areas.json');
const sourceNames=[];
for(const a of Object.values(source.areas)){
 sourceNames.push(a.fullName);
 for(const r of a.regions){
  sourceNames.push(r.fullName);
  for(const d of r.districts||[])sourceNames.push([a.fullName,r.name,d.name].join(' '));
  for(const n of r.neighborhoods||[])sourceNames.push(n.legalName);
 }
}
assert.equal(sourceNames.length,665);assert.equal(localities.length,665);
assert.deepEqual([...sourceNames].sort(),localities.map(r=>r.fullName).sort());
const patterns=['{A}','{A} 교체되나요?','{A}교체되나요?','{A} 배터리교체되나요?','{A}배터리교체되나요?','{A} 출장돼요?','{A}출장되나요?','{A}에서 교체 가능한가요?','지역 {A}','{A} 지역'];
const aliases=classifyLocationAliases(localities),areaMatrix=[],failures=[];
const metrics={UNIQUE_AREA_FALSE_NEGATIVE:0,UNIQUE_AREA_WRONG_RESOLUTION:0,AMBIGUOUS_AREA_AUTOCONFIRM:0,NO_SPACE_AREA_FALSE_NEGATIVE:0,FABRICATED_PRICE:0};
for(const row of localities)for(const [patternIndex,pattern]of patterns.entries()){
 const text=pattern.replace('{A}',row.name),alias=aliases.find(x=>x.alias===normalizeText(row.name));
 const result=resolveLocation(text,localities);
 const expected=alias.candidates.length===1?alias.candidates[0]:alias.broadParent;
 let pass;
 if(expected){pass=result.region?.canonicalId===expected.canonicalId;if(!result.region)metrics.UNIQUE_AREA_FALSE_NEGATIVE++;else if(!pass)metrics.UNIQUE_AREA_WRONG_RESOLUTION++;}
 else {pass=!result.region&&result.locationCandidates?.some(r=>r.canonicalId===row.canonicalId);if(result.region)metrics.AMBIGUOUS_AREA_AUTOCONFIRM++;}
 if(expected&&!pass&&[2,4,6].includes(patternIndex))metrics.NO_SPACE_AREA_FALSE_NEGATIVE++;
 if(!pass)failures.push({text,row:row.fullName,result});
 areaMatrix.push({text,expected:expected?.canonicalId||null,actual:result.region?.canonicalId||null,candidates:result.locationCandidates?.map(r=>r.canonicalId)||[],pass});
 const qualified=resolveLocation(pattern.replace('{A}',row.fullName),localities);
 assert.equal(qualified.region?.canonicalId,row.canonicalId,`qualified ${row.fullName}`);
}
let collisionCases=0;
for(const alias of aliases.filter(x=>x.candidates.length>1&&!x.broadParent&&x.alias.length>=2)){
 for(const suffix of ['','교체되나요?','배터리교체되나요?']){
  const r=resolveLocation(alias.alias+suffix,localities);assert.equal(r.region,null,alias.alias);assert.ok(r.locationCandidates?.length>1);collisionCases++;
 }
}
for(const text of ['구월동물원','구월동화책','구월동네사람','가짜구월동교체되나요?','강남스타일','인천공항주차'])assert.equal(resolveLocation(text,localities).region,null,text);
const transcripts=[];
let questionLoopCases=0;
for(const row of records){
 let state={...createConversationState(),selectedVehicleKey:`${row.manufacturerId}|${row.vehicle}`,manufacturer:row.manufacturerId,manufacturerName:row.manufacturerName,vehicleFamily:row.vehicle};
 let out=conversationTurn(state,`${parseYearRange(row.year).start||parseYearRange(row.year).end||2026}년식`,records,localities);
 for(let turn=0;turn<6&&out.state.previousQuestion&&!out.state.confirmedBattery;turn++){
  const q=out.state.previousQuestion;
  const value=q.field==='detailModel'?row.detailModel:q.field==='year'?row.year:['fuel','exactFuel','engine','drivetrain'].includes(q.field)?row.fuel:'';
  if(!value)break;
  out=conversationTurn(out.state,value,records,localities);
 }
 if(out.state.confirmedBattery)assert.equal(out.state.confirmedBattery,row.defaultBattery,`question loop ${row.manufacturerId}/${row.detailModel}/${row.fuel}`);
 questionLoopCases++;
}
function flow(inputs){let state=createConversationState();const outputs=[];for(const text of inputs){const out=conversationTurn(state,text,records,localities);state=out.state;outputs.push(out);if(/\d[\d,.]*\s*(?:만\s*)?원/.test(out.messages.join(' ')))metrics.FABRICATED_PRICE++;transcripts.push({text,messages:out.messages,chips:out.chips,actions:out.actions,battery:state.confirmedBattery,area:state.region?.fullLabel,priceIntent:state.priceIntent,pending:state.previousQuestion?.field});}return {state,outputs};}
for(const answer of ['2.5','가솔린 2.5','엘피지','LPG'])assert.equal(flow(['그랜저 GN7 2023년식',answer]).state.confirmedBattery,'AGM70');
for(const answer of ['3.5 가솔린','가솔린 3.5']){const f=flow(['그랜저 GN7 2023년식',answer]);assert.equal(f.state.confirmedBattery,null);assert.deepEqual(f.outputs.at(-1).actions,['phone']);}
assert.equal(flow(['그랜저 GN7 2023년식']).state.previousQuestion.field,'exactFuel');
for(const text of ['배터리 얼마예요','배터리 가격','배터리 교체비용','교체비용 얼마','배터리값','출장배터리 얼마','BMW 배터리 얼마인가요','BMW 교체비용 얼마인가요','벤츠 배터리 가격','그랜저 배터리 얼마']){const f=flow([text]);assert.equal(f.state.priceIntent,true);assert.ok(f.state.previousQuestion||f.state.pendingVehicleConfirmation,text);assert.ok(!f.outputs[0].actions.includes('phone'),text);}
for(const input of ['구월동 BMW 배터리 얼마예요?','BMW 배터리 얼마예요?']){
 const f=flow([input,'5시리즈','2020년식']);assert.equal(f.state.manufacturer,'bmw');assert.equal(f.state.confirmedBattery,'AGM95');assert.equal(f.state.priceIntent,true);assert.equal(f.state.originalIntent,'PRICE');assert.deepEqual(f.outputs.at(-1).actions,['phone','stores']);
 if(input.startsWith('구월동'))assert.equal(f.state.region.fullLabel,'인천 남동구 구월동');
 const restored=decodeSession(encodeSession(f.state,[]));assert.ok(restored);assert.equal(restored.state.priceIntent,true);
 const corrected=conversationTurn(restored.state,'아니 2019년식이야',records,localities);assert.equal(corrected.state.year,2019);assert.equal(corrected.state.priceIntent,true);assert.equal(corrected.state.confirmedBattery,'AGM95');
}
for(const text of ['구월동 BMW 520d 2020년식 배터리 얼마예요?','구월동 BMW 5시리즈 2020년식 배터리 얼마예요?']){let f=flow([text]);if(f.state.pendingVehicleConfirmation)f=flow([text,'네']);assert.equal(f.state.confirmedBattery,'AGM95');assert.equal(f.state.region.fullLabel,'인천 남동구 구월동');assert.equal(f.state.priceIntent,true);assert.equal(f.state.previousQuestion,null);}
const integrated=flow(['송파 그랜저 2024년식 교체돼요?']);assert.equal(integrated.state.region.name,'송파구');assert.equal(integrated.state.vehicleFamily,'그랜저');assert.equal(integrated.state.year,2024);assert.equal(integrated.state.serviceIntent,true);
assert.equal(flow(['인천인데','논현동']).state.region.fullLabel,'인천 남동구 논현동');
assert.ok(flow(['논현동']).state.pendingLocationDisambiguation.length>1);
for(const text of ['구월동교체되나요?','구월동배터리교체되나요?','구월동출장되나요?','구월동배터리돼요?','구월동도 와요?','인천 구월동 교체 가능?','남동구 구월동 출장돼요?'])assert.equal(flow([text]).state.region.fullLabel,'인천 남동구 구월동');
for(const text of ['구월동 지금 와요?','구월동 오늘 가능?','구월동 몇 시에 와요?'])assert.ok(flow([text]).outputs[0].messages.some(m=>m.includes('실시간 확인')));
for(const text of ['BMW 5시리즈 2023','E클래스 2024','G70 2024','아반떼 2023','싼타페 2023']){const f=flow([text]);assert.equal(f.state.confirmedBattery,null);assert.ok(f.state.previousQuestion||f.state.pendingVehicleConfirmation);}
assert.equal(PHONE_HREF,'tel:1644-9141');assert.equal(DIN_STORE_URL,'https://smartstore.naver.com/battery1/products/414050800');assert.equal(AGM_STORE_URL,'https://smartstore.naver.com/battery1/products/575288571');
const report={inventory:auditLocations(localities).counts,areaCases:areaMatrix.length,qualifiedAreaCases:areaMatrix.length,collisionCases,questionLoopCases,metrics,failures,transcripts,areaMatrix};
const evidenceDir=process.argv.includes('--pricing')?'docs/evidence/battery-pricing':'docs/evidence/db-driven-flow';
fs.mkdirSync(evidenceDir,{recursive:true});fs.writeFileSync(`${evidenceDir}/matrix.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,areaMatrix:undefined,transcripts:undefined},null,2));
assert.equal(failures.length,0);for(const value of Object.values(metrics))assert.equal(value,0);
