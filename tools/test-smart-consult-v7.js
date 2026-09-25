import assert from "node:assert/strict";
import fs from "node:fs";
import {normalizeText,buildVehicleGroups,MANUFACTURER_ALIASES} from "../js/smart-consult-core.js";
import {auditLocations,classifyLocationAliases,resolveLocation} from "../js/smart-consult-location.js";
import {buildAliasIndex,resolveVehicleText,SAFE_ALIAS_MAP} from "../js/vehicle-aliases.js";
import {conversationTurn,createConversationState} from "../js/smart-consult-conversation.js";
import {safeUserMessage} from "../js/smart-consult-session.js";
const read=path=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8"));
const manufacturers=read("data/manufacturers.json");
const records=manufacturers.flatMap(m=>read(`data/${m.file}`).map(row=>({...row,manufacturerId:m.id,manufacturerName:m.name})));
const localities=read("seo-data/smart-consult-location-index.json").localities;
let assertions=0;
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);assertions++;};
const ok=(a,label)=>{assert.ok(a,label);assertions++;};
const ids=items=>items.map(item=>item.canonicalId).sort();
// Independent canonical traversal: the derived search index must not omit/add places.
const canonical=[];
for(const area of Object.values(read("seo-data/service-areas.json").areas)) {
  const add=(node,city="",district="",locality="")=>canonical.push({canonicalId:node.code||node.legalCode||`${area.id}/${city}/${district}/${locality}`,fullName:[area.fullName,city,district,locality].filter(Boolean).join(" "),fullLabel:[area.name,city,district,locality].filter(Boolean).join(" "),city,district,locality,area:area.id});
  add(area);
  for(const region of area.regions||[]) {
    const city=region.type==="si"?region.name:"",district=city?"":region.name;
    add(region,city,district);
    for(const child of region.districts||[]) add(child,city,child.name);
    for(const child of region.neighborhoods||[]) add(child,city,child.district||district,child.name);
  }
}
eq(localities.map(({canonicalId,fullName,fullLabel,city,district,locality,area})=>({canonicalId,fullName,fullLabel,city,district,locality,area})),canonical,"canonical source/index hierarchy");
for(const item of canonical) for(const label of [item.fullName,item.fullLabel]) eq(resolveLocation(`${label} 출장가능?`,localities).region?.canonicalId,item.canonicalId,label);
const aliases=classifyLocationAliases(localities),safe=aliases.filter(item=>["EXACT_UNIQUE","UNIQUE_SUFFIXLESS","SAME_JURISDICTION_PARENT_CHILD_COLLISION"].includes(item.classification));
const wrappers=[a=>`${a} 가능?`,a=>`${a} 출장돼?`,a=>`지역 ${a}?`,a=>`${a}지역 출장가능?`,a=>`${a}도 와요?`];
let phrases=0,ambiguous=0,unsafe=0;
for(const entry of aliases) {
  // Independently check each classifier decision, not just its resolver output.
  if(entry.classification==="SAME_JURISDICTION_PARENT_CHILD_COLLISION") {
    const parent=entry.broadParent;
    ok(["city","district"].includes(parent.level),entry.alias);
    ok(entry.candidates.every(child=>child.canonicalId===parent.canonicalId||(child.level==="locality"&&child.area===parent.area&&(!parent.city||child.city===parent.city)&&(!parent.district||child.district===parent.district))),entry.alias);
  }
  if(entry.classification==="UNSAFE_REJECT") {eq(resolveLocation(`${entry.alias} 가능?`,localities).region,null,entry.alias);unsafe++;continue;}
  if(safe.includes(entry)) {
    const target=entry.broadParent||entry.candidates[0];
    for(const wrap of wrappers) {const phrase=wrap(entry.alias),result=resolveLocation(phrase,localities);eq(result.region?.canonicalId,target.canonicalId,phrase);ok(!result.ambiguousRegion,phrase);phrases++;}
  } else {
    for(const wrap of wrappers) {const phrase=wrap(entry.alias),result=resolveLocation(phrase,localities);eq(result.region,null,entry.alias);if(entry.alias==='이동'&&phrase==='이동도 와요?'){eq(result.locationCandidates??[],[],'movement wording must not create a service-area candidate');continue;}eq(ids(result.locationCandidates),ids(entry.candidates),entry.alias);ambiguous++;}
  }
}
const forbidden=/DB|조회 결과|매칭 결과|데이터 기준|선택 조건|후보군|alias|정규화|프로세스/i;
function flow(inputs) {let state=createConversationState();const outputs=[];for(const input of inputs){const output=conversationTurn(state,input,records,localities);state=output.state;outputs.push(output);ok(!forbidden.test(output.messages.join(" ")+output.chips.map(c=>c.label).join(" ")),input);ok(output.chips.length<=4,input);if(state.confirmedBattery)ok(records.some(row=>row.manufacturerId===state.manufacturer&&row.vehicle===state.vehicleFamily&&row.defaultBattery===state.confirmedBattery),"canonical battery only");}return{state,outputs};}
for(const alias of safe) {const result=flow([`${alias.alias} 가능?`]);eq(result.state.location,null,`Area query must not confirm a service site: ${alias.alias}`);ok(!result.outputs[0].messages.join(" ").includes("확인되지"),alias.alias);}
for(const input of ["부산 출장돼?","대전 출장돼?","대구 가능?","제주도 와요?","서울 부산 출장돼?","가짜송파지역 출장돼?","없는동 출장돼?"]) {const result=flow([input]);ok(!result.outputs[0].region,input);ok(!result.outputs[0].messages.join(" ").includes("교체 가능 지역"),input);}
for(const input of ["송파 가능한가요?","지역 송파?","송파지역 출장가능?","지역은 송파 쪽 교체 가능?","송파 근처 방문 가능?"]) {const result=flow([input]);eq(result.state.location,null,input);ok(result.outputs[0].messages.join(" ").includes("서울 송파구"),input);eq(result.state.pendingLocationDisambiguation,null,input);}
{const result=flow(["송파동 가능?"]);eq(result.state.location,null);ok(result.outputs[0].messages.join(" ").includes("서울 송파구 송파동"));}
const siheung=["경기 성남시 수정구 시흥동","경기 시흥시","서울 금천구 시흥동"];
eq(flow(["시흥 출장돼?"]).state.pendingLocationDisambiguation.map(x=>x.fullLabel).sort(),siheung);
eq(flow(["경기도","시흥은?"]).state.pendingLocationDisambiguation.map(x=>x.fullLabel).sort(),siheung.slice(0,2));
eq(flow(["경기도","시흥시","아니 서울 시흥동이야"]).state.location.fullLabel,siheung[2]);
{const result=flow(["인천 송도 가능해?"]);eq(result.state.location,null);ok(result.outputs[0].messages.join(" ").includes("인천 연수구 송도동"));}

const groups=buildVehicleGroups(records),familyMap=new Map();
for(const group of groups) {const alias=normalizeText(group.vehicle);if(!familyMap.has(alias))familyMap.set(alias,[]);familyMap.get(alias).push(group.key);}
let vehiclePhrases=0;const resolutionClasses={direct:0,confirmation:0,disambiguation:0};
for(const group of groups) {
  const brands=MANUFACTURER_ALIASES[group.manufacturerId]||[group.manufacturerName];
  const inputs=new Set([group.vehicle,normalizeText(group.vehicle),...brands.map(brand=>brand+group.vehicle),group.vehicle+" 2020년식"]);
  const stem=normalizeText(group.vehicle).replace(/(?:시리즈|클래스)$/ ,"");
  if(stem!==normalizeText(group.vehicle)) for(const brand of brands)inputs.add(brand+stem);
  for(const [alias,target] of Object.entries(SAFE_ALIAS_MAP))if(group.vehicle===target)inputs.add(alias);
  for(const input of inputs) {
    const result=resolveVehicleText(input,records);
    ok(result.matches.some(item=>item.key===group.key),`${group.key}: ${input}`);
    ok(result.matches.every(item=>groups.some(g=>g.key===item.key)),input);
    if(result.matches.length>1)resolutionClasses.disambiguation++;else if(result.shorthand)resolutionClasses.confirmation++;else resolutionClasses.direct++;
    vehiclePhrases++;
  }
  const result=flow([group.vehicle]);
  ok(result.state.selectedVehicleKey===group.key||result.state.pendingVehicleConfirmation?.key===group.key||result.outputs[0].chips.some(c=>c.value===`${group.manufacturerName} ${group.vehicle}`),group.key);
}
for(const input of ["C","E","3","5","4","BMW52","벤츠Z","없는차량테스트","소나타dn888","투산nx44"]) {const result=flow([input]);eq(result.state.selectedVehicleKey,"",input);eq(result.state.pendingVehicleConfirmation,null,input);}
const details=[...new Map(records.map(row=>[`${row.manufacturerId}|${row.detailModel}`,row])).values()];
for(const row of details)for(const input of [row.detailModel,row.manufacturerName+row.detailModel])ok(resolveVehicleText(input,records).matches.some(group=>group.key===`${row.manufacturerId}|${row.vehicle}`),input);
for(const input of ["벤츠C","벤츠E","벤츠GLC","벤츠GLE","BMW3","BMW4","BMW5"])ok(flow([input]).state.pendingVehicleConfirmation,input);
const benz=flow(["벤츠C 2020년식","맞아"]);eq(benz.state.vehicleFamily,"C-클래스");eq(benz.state.year,2020);eq(benz.state.confirmedBattery,"AGM80");ok(!/몇 년식|차량 연식/.test(benz.outputs.at(-1).messages.join(" ")));
for(const input of ["벤츠C 2020년식","벤츠 E 2021년식","벤츠C 2020년식인데 송파 가능?"]) {const saved=safeUserMessage(input,createConversationState(),records,localities);ok(!/[CE]20[12]/i.test(saved),saved);ok(saved.includes("클래스"),saved);}
eq(flow(["벤츠C","아니 E","맞아"]).state.vehicleFamily,"E-클래스");
eq(flow(["BMW3 2019년식","맞아"]).state.year,2019);
eq(flow(["BMW520d"]).state.model,"520d");eq(flow(["BMW520d"]).state.pendingVehicleConfirmation,null);
for(const input of ["BMW5 2019년식 520d","벤츠C 2020년식 C220d"]) {const result=flow([input]);eq(result.state.pendingVehicleConfirmation,null,input);ok(result.state.model,input);}
const traxRows=records.filter(row=>row.vehicle==="트랙스");
eq(flow(["트랙스"]).state.detailModel,"");eq(flow(["트랙스"]).state.previousQuestion.field,"fuel");
eq(flow(["트랙스 2018년식"]).state.previousQuestion.field,"fuel");
eq(flow(["트랙스 2018년식","가솔린"]).state.confirmedBattery,"DIN60L");
eq(flow(["트랙스 2018년식","디젤"]).state.confirmedBattery,"DIN74L");
for(const detail of new Set(traxRows.map(row=>row.detailModel))) {const result=flow([detail]);eq(result.state.vehicleFamily,"트랙스");if(detail!=="트랙스")eq(result.state.detailModel,detail);}
const corrected=flow(["송파 가능?","시동이 안 걸려","트랙스","아니 트랙스 크로스오버"]);eq(corrected.state.detailModel,"트랙스 크로스오버");eq(corrected.state.location,null);ok(corrected.outputs[0].messages.join(" ").includes("서울 송파구"));eq(corrected.state.symptom.intent,"NO_START");
for(const [input,key,year,label] of [["벤츠C 2020년식인데 송파 가능?","benz|C-클래스",2020,"서울 송파구"],["트랙스 2018년식 영등포구 출장돼?","chevrolet|트랙스",2018,"서울 영등포구"],["소나타 2020년식 동작지역 가능?","hyundai|쏘나타",2020,"서울 동작구"]]) {const result=flow([input]);eq(result.state.selectedVehicleKey||result.state.pendingVehicleConfirmation?.key,key);eq(result.state.year,year);eq(result.state.location,null);ok(result.outputs[0].messages.join(" ").includes(label));ok(!/몇 년식|차량 연식/.test(result.outputs[0].messages.join(" ")));}
const mixed=flow(["BMW5 2019년식인데 경기도 시흥이야","응","시흥시"]);eq(mixed.state.vehicleFamily,"5시리즈");eq(mixed.state.year,2019);eq(mixed.state.location.city,"시흥시");ok(mixed.outputs[0].messages.join(" ").includes(siheung[0]));
// Synthetic collisions prove candidates are not silently collapsed or invented.
const synthetic=[...records,{...records.find(row=>row.vehicle==="트랙스"),manufacturerId:"other",manufacturerName:"다른제조사"}];
eq(resolveVehicleText("트랙스",synthetic).matches.length,2);
const syntheticClass=[...records,{...records.find(row=>row.vehicle==="C-클래스"),vehicle:"C 클래스"}];
eq(resolveVehicleText("벤츠C",syntheticClass).matches.length,2);
const xss=flow(["<img src=x onerror=alert(1)>"]);eq(xss.state.selectedVehicleKey,"");eq(xss.state.location,null);
console.log(JSON.stringify({assertions,area:{canonical:canonical.length,fullNamePhrases:canonical.length*2,...auditLocations(localities),safeAliases:safe.length,generatedSafePhrases:phrases,ambiguousPhrases:ambiguous,unsafe},vehicle:{sources:manufacturers.map(m=>`data/${m.file}`),rows:records.length,manufacturers:manufacturers.length,families:groups.length,uniqueFamilies:familyMap.size,ambiguousFamilies:[...familyMap].filter(([,keys])=>keys.length>1),generatedPhrases:vehiclePhrases,resolutionClasses,aliasAudit:buildAliasIndex(records).audit,traxRows:traxRows.length,traxDetails:[...new Set(traxRows.map(row=>row.detailModel))]},metrics:{supportedFalseNegative:0,ambiguousAutoConfirm:0,safeFamilyNoMatch:0,fakeVehicle:0}},null,2));
console.log(`Specific canonical model coverage: ${details.length} models, ${details.length*2} phrases`);
console.log("Smart consultation V7 full canonical audit PASS");
