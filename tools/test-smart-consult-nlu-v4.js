import assert from "node:assert/strict";
import fs from "node:fs";
import { conversationTurn,createConversationState } from "../js/smart-consult-conversation.js";
import { auditLocations,resolveLocation } from "../js/smart-consult-location.js";
import { buildAliasIndex,resolveVehicleText,SAFE_ALIAS_MAP } from "../js/vehicle-aliases.js";
const read=file=>JSON.parse(fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8"));
const manufacturers=read("data/manufacturers.json");
const records=manufacturers.flatMap(m=>read(`data/${m.file}`).map(row=>({...row,manufacturerId:m.id,manufacturerName:m.name})));
const localities=read("seo-data/smart-consult-location-index.json").localities;
let assertions=0;
const eq=(actual,expected,label="")=>{assert.deepEqual(actual,expected,label);assertions++;};
const ok=(value,label="")=>{assert.ok(value,label);assertions++;};
const forbidden=/DB|조회 결과|매칭 결과|데이터 기준|선택 조건|프로세스|후보군|alias|정규화/i;
function flow(inputs){let state=createConversationState();const outputs=[];for(const input of inputs){const output=conversationTurn(state,input,records,localities);state=output.state;outputs.push(output);ok(!forbidden.test(output.messages.join(" ")+output.chips.map(c=>c.label).join(" ")),input);ok(output.chips.length<=4,input);}return{state,outputs};}

eq(records.length,917);
eq(flow(["동작구 출장돼?"]).state.location.fullLabel,"서울 동작구");
const collision=flow(["시흥 출장돼?"]);
eq(collision.state.pendingLocationDisambiguation.length,3);
ok(collision.outputs[0].messages.join(" ").includes("서울 금천구 시흥동"));
ok(collision.outputs[0].messages.join(" ").includes("경기 성남시 수정구 시흥동"));
ok(collision.outputs[0].messages.join(" ").includes("경기 시흥시"));
const remembered=flow(["경기도","시흥은?"]);
eq(remembered.state.location.province,"경기도");
eq(remembered.state.pendingLocationDisambiguation.length,2);
ok(remembered.state.pendingLocationDisambiguation.every(item=>item.province==="경기도"));
const scoped=flow(["경기도 시흥 출장가능?"]);
eq(scoped.state.pendingLocationDisambiguation.length,2,"real same-province collision must not be guessed");
const corrected=flow(["경기도","시흥시","아니 서울 시흥동이야"]);
eq(corrected.state.location.fullLabel,"서울 금천구 시흥동");
eq(corrected.state.pendingLocationDisambiguation,null);
eq(flow(["인천 송도 출장돼?"]).state.location.fullLabel,"인천 연수구 송도동");
for(const text of ["시흥시 가능?","시흥시에서 출장돼?","경기도 시흥시 근처인데요"]) eq(flow([text]).state.location.fullLabel,"경기 시흥시",text);
for(const text of ["서울","서울시","서울특별시"]) eq(flow([text]).state.location.province,"서울특별시",text);
for(const text of ["인천","인천시","인천광역시"]) eq(flow([text]).state.location.province,"인천광역시",text);
eq(flow(["수원시","정자동"]).state.location.fullLabel,"경기 수원시 장안구 정자동");
eq(flow(["시흥 출장돼?","서울"]).state.location.fullLabel,"서울 금천구 시흥동");
eq(flow(["서울","아니 경기도 시흥시야"]).state.location.fullLabel,"경기 시흥시");
eq(flow(["시흥 출장돼?","경기도","성남시 수정구 시흥동"]).state.location.fullLabel,"경기 성남시 수정구 시흥동");
ok(flow(["서울 부산 출장돼?"]).outputs[0].messages.join(" ").includes("확인되지"),"unknown explicit place should not become Seoul");

for(const family of ["4","5"]){for(const text of [`BMW${family}`,`BMW ${family}`,`비엠더블유 ${family}`,`BMW ${family}시리즈`]){const result=flow([text]);eq(result.state.pendingVehicleConfirmation.key,`bmw|${family}시리즈`,text);eq(result.state.result,null);}}
for(const confirmation of ["응","맞아","네","ㅇㅇ"]){const result=flow(["BMW5 2019년식",confirmation]);eq(result.state.vehicleFamily,"5시리즈");eq(result.state.year,2019);eq(result.state.confirmedBattery,"AGM95");ok(!result.outputs.at(-1).messages.includes("몇 년식 차량인가요?"));}
const seriesCorrection=flow(["BMW5","아니 4","응"]);eq(seriesCorrection.state.manufacturer,"bmw");eq(seriesCorrection.state.vehicleFamily,"4시리즈");
const exact=flow(["BMW520d"]);eq(exact.state.model,"520d");eq(exact.state.pendingVehicleConfirmation,null);
eq(flow(["BMW5","5시리즈","응"]).state.vehicleFamily,"5시리즈");
// V7 intentionally accepts a complete canonical family; bare class tokens stay unsafe.
eq(flow(["5시리즈"]).state.vehicleFamily,"5시리즈");
for(const broad of ["5","4","e","BMW52"]){const result=flow([broad]);eq(result.state.selectedVehicleKey,"",broad);eq(result.state.pendingVehicleConfirmation,null,broad);}

for(const [alias,target] of Object.entries(SAFE_ALIAS_MAP)){
 const result=flow([alias]);eq(result.state.vehicleFamily,target,alias);eq(result.state.pendingVehicleConfirmation,null);
 const canonical=flow([target]);eq(result.state.selectedVehicleKey,canonical.state.selectedVehicleKey);
}
for(const [alias,canonical] of [["소나타dn8","쏘나타 dn8"],["그랜져ig","그랜저 ig"],["아반테cn7","아반떼 cn7"],["산타페tm","싼타페 tm"],["투산nx4","투싼 nx4"]]){
 const a=flow([alias]).state,b=flow([canonical]).state;
 eq(a.selectedVehicleKey,b.selectedVehicleKey,alias);eq(a.detailModel,b.detailModel,alias);ok(a.detailModel.length>0);
}
const sonata=flow(["소나타 2020년식","아니 2019년식"]);eq(sonata.state.vehicleFamily,"쏘나타");eq(sonata.state.year,2019);
const vehicleCorrection=flow(["소나타 2020년식 인천인데","아니 그랜저야"]);eq(vehicleCorrection.state.vehicleFamily,"그랜저");eq(vehicleCorrection.state.location.province,"인천광역시");
const mixed=flow(["소나타 2020년식인데 동작구 출장돼?"]);eq(mixed.state.year,2020);eq(mixed.state.vehicleFamily,"쏘나타");eq(mixed.state.location.district,"동작구");
const mixedBmw=flow(["BMW5 2019년식인데 경기도 시흥이야","응","시흥시"]);eq(mixedBmw.state.year,2019);eq(mixedBmw.state.vehicleFamily,"5시리즈");eq(mixedBmw.state.location.city,"시흥시");eq(mixedBmw.state.confirmedBattery,"AGM95");
const mixedIg=flow(["그랜져 ig 2019년식 인천인데"]);eq(mixedIg.state.detailModel,"그랜저 IG");eq(mixedIg.state.year,2019);eq(mixedIg.state.location.province,"인천광역시");
const fake=[{...records.find(r=>r.vehicle==="쏘나타"),manufacturerId:"other",manufacturerName:"다른제조사"},...records];
ok(buildAliasIndex(fake).audit.collisions.some(item=>item.alias==="소나타"));
eq(resolveVehicleText("소나타",fake).matches.length,2,"collision cannot auto-confirm");
eq(resolveVehicleText("소나타",records.filter(row=>row.vehicle!=="쏘나타")).matches.length,0,"missing canonical target");
for(const text of ["쏘타나","쏘나티","기아 소나타","가짜소나타","투산업","소나타dn888","투산nx44"]){eq(flow([text]).state.selectedVehicleKey,"",text);}
const xss=flow(["<img src=x onerror=alert(1)>"]);eq(xss.state.selectedVehicleKey,"");
for(const item of localities){const result=resolveLocation(item.fullName,localities);eq(result.region?.canonicalId,item.canonicalId,item.fullName);}
const audit=buildAliasIndex(records).audit,locationAudit=auditLocations(localities);
eq(audit.approved,6);eq(audit.collisions.length,0);eq(new Set(localities.map(item=>item.canonicalId)).size,localities.length);
console.log(JSON.stringify({assertions,rows:records.length,locationCounts:locationAudit.counts,locationCollisionAliases:locationAudit.collisions.length,vehicle:audit,sonataRows:records.filter(row=>row.vehicle==="쏘나타").length},null,2));
console.log("Smart consultation NLU V4 PASS");
