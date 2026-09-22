import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {conversationTurn,createConversationState} from "../js/smart-consult-conversation.js";
import {copy,variants,variant} from "../js/conversation-copy.js";
import {findEntry,entryState} from "../js/smart-consult-entry.js";
import {encodeSession,decodeSession,clearSession,safeUserMessage,summaryFields,SESSION_KEY} from "../js/smart-consult-session.js";
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const json=p=>JSON.parse(read(p));
const records=json("data/manufacturers.json").flatMap(m=>json(`data/${m.file}`).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=json("seo-data/smart-consult-location-index.json").localities;
const index=json("seo-data/smart-consult-vehicles.json");
let assertions=0;
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);assertions++;};
const ok=(a,label)=>{assert.ok(a,label);assertions++;};
function flow(inputs,initial=createConversationState()) {
  let state=initial; const outputs=[],messages=[];
  for(const text of inputs) {
    messages.push({role:"user",text:safeUserMessage(text,state,records,areas),actions:[],chips:[]});
    const out=conversationTurn(state,text,records,areas); state=out.state; outputs.push(out);
    out.messages.forEach(text=>messages.push({role:"bot",text,actions:[],chips:[]}));
    ok(!/DB|조회 결과|후보군|alias|정규화|고장입니다|교체가 필요합니다/.test(out.messages.join(" ")),text);
    ok(out.chips.length<=4,text);
  }
  return {state,outputs,messages};
}
for(const [text,intent] of [["시동이 안 걸려요","NO_START"],["시동이 약해요","WEAK_START"],["방전됐어요","DISCHARGE"],["또 방전됐어요","REPEATED_DISCHARGE"],["점프했어요","JUMP"],["점프했는데 또 방전됐어요","JUMP_REDISCHARGE"],["배터리 바꾸려고요","REPLACE"],["오래 써서 미리 바꾸려고요","PREVENTIVE_REPLACE"]]) {
  const f=flow([text]);eq(f.state.symptom.intent,intent);ok(f.outputs[0].messages.includes(copy.needVehicle));
}
eq(flow(["가격 궁금해요"]).state.customerGoal,"PRICE");
const symptom=flow(["점프했는데 또 방전됐어요","BMW 520d 2019년식","아니 방전은 아니고 시동만 약해"]);
eq(symptom.state.symptom.intent,"WEAK_START");eq(symptom.state.confirmedBattery,"AGM95");eq(symptom.state.year,2019);
for(const text of ["영등포구 지금 와?","오늘 가능해?","몇 시에 올 수 있어?","30분 안에 와?","지금 출발 가능?"]) {
  const f=flow(["영등포구 가능?",text]);
  eq(f.state.location.fullLabel,"서울 영등포구");ok(f.outputs.at(-1).messages.includes(copy.dispatch));eq(f.outputs.at(-1).actions,["phone"]);
  ok(!/네.*지금 가능합니다|오늘 방문 가능합니다/.test(f.outputs.at(-1).messages.join(" ")));
}
eq(flow(["영등포구 가능?"]).state.lastIntent,"SERVICE_AREA_AVAILABILITY");
const mixed=flow(["BMW 520d 2019년식","영등포구 지금 와?"]);
eq(mixed.state.location.fullLabel,"서울 영등포구");ok(mixed.outputs[1].messages.join(" ").includes("출장 교체 가능"));
for(const input of ["몰라요","잘 모르겠어요","모르겠는데","기억 안 나요","잘 몰라","어디서 봐요?","그건 모르겠어요"]) {
  const f=flow(["BMW 520d",input]);ok(f.outputs.at(-1).messages.includes(copy.recoveryYear));eq(f.state.previousQuestion.field,"year");eq(f.outputs.at(-1).actions,["phone"]);
}
const fuel=flow(["벤츠 e300","2020년식","잘 모르겠어요","가솔린"]);eq(fuel.state.confirmedBattery,"AGM80");ok(fuel.outputs[2].messages.includes(copy.recoveryFuel));
for(const text of ["연식 어디서 봐?","차량명도 모르겠는데","차량명 어디서 확인해?","연료 모르겠어"]) ok(flow([text]).outputs[0].messages.join(" ").includes("차량등록증"));
const session=flow(["BMW 520d","2019년식","인천"]);
const encoded=encodeSession(session.state,session.messages,null,100000);
const restored=decodeSession(encoded,100001);eq(restored.state,session.state);eq(restored.messages,session.messages);
eq(flow(["가격은?"],restored.state).outputs[0].actions,["phone","stores"]);
for(const raw of ["{", "null", "{}",encoded.replace('"version":1','"version":0'),encoded.replace('AGM95','FAKE')]) eq(decodeSession(raw,100001),null);
eq(decodeSession(encoded,100000+13*60*60*1000),null);
eq(decodeSession(encoded,99999),null);
let removed;clearSession({removeItem:key=>removed=key});eq(removed,SESSION_KEY);
clearSession({removeItem:()=>{throw new Error("blocked");}});
for(const text of ["홍길동 010-1234-5678 12가3456 BMW520d 2019년식","김철수인데 인천 송도에요","<img src=x onerror=alert(1)>","test@example.com 시동이 약해요"]) {
  const f=flow([text]);const raw=encodeSession(f.state,f.messages);
  ok(!/홍길동|김철수|010-1234|12가3456|<img|onerror|test@example/.test(raw),"no raw personal content");
}
eq(index.vehicles.length,427);eq(new Set(index.vehicles.map(e=>e.id)).size,427);
const mapping=json("seo-data/vehicle-detail-groups.json");
for(const entry of index.vehicles) {
  eq(findEntry(entry.id,index),entry);
  const state=entryState(entry);
  const rows=records.filter(r=>`${r.manufacturerId}|${r.vehicle}`===state.selectedVehicleKey);
  ok(rows.length>0,entry.id);ok(entry.details.every(d=>rows.some(r=>r.detailModel===d)));
  eq(state.year,null);eq(state.fuel,"");eq(state.model,"");
  const page=`car-battery/${entry.id}.html`,html=read(page);
  eq((html.match(/이 차량 스마트 상담하기/g)||[]).length,1,page);
  ok(html.includes(`/smart-consult/?vehicleId=${encodeURIComponent(entry.id)}`));
  // These pages must differ from the audited baseline ONLY by the single CTA line.
  const before=execFileSync("git",["show",`90eb274e:${page}`],{encoding:"utf8",maxBuffer:5e6}).replace(/\r\n/g,"\n");
  eq(html.replace(/\r\n/g,"\n").replace(/^.*class="btn secondary smart-consult-link".*\n/gm,""),before,page);
}
for(const id of ["bmw/5-series","benz/e-class","kia/carnival","hyundai/sonata"]) ok(findEntry(id,index),id);
for(const id of ["fake/car","bmw/520d-fake","<img>","__proto__","../bmw/5-series",null]) eq(findEntry(id,index),null);
const detail=index.vehicles.find(e=>e.id==="bmw/5-series/g30");
ok(detail);const detailFlow=flow(["2019년식"],entryState(detail));eq(detailFlow.state.detailModels,detail.details);eq(detailFlow.state.confirmedBattery,"AGM95");
const summary=summaryFields(flow(["점프했는데 또 방전됐어요","BMW 520d 2019년식","인천 송도"]).state);
ok(summary.some(([k,v])=>k==="문의"&&v==="점프 후 재방전"));ok(summary.some(([k,v])=>k==="지역"&&v==="인천 연수구 송도동"));
ok(!summary.some(([k])=>/가격|코딩|시간|연료/.test(k)),"omit unknown fuel and unavailable facts");
const corrected=summaryFields(flow(["소나타 2020년식","아니 2019년식"]).state);
ok(JSON.stringify(corrected).includes("2019"));ok(!JSON.stringify(corrected).includes("2020"));
eq(summaryFields(createConversationState()),[]);
for(const category of Object.keys(variants)) {
  eq(variants[category].length,2);
  eq(variant(category,2,"BMW 520d"),variant(category,0,"BMW 520d"));
  ok(variant(category,0,"BMW 520d")!==variant(category,1,"BMW 520d"));
}
const runtime=["smart-consult.js","smart-consult-conversation.js","smart-consult-entry.js","smart-consult-session.js","conversation-copy.js"].map(p=>read(`js/${p}`)).join("\n");
ok(!/localStorage|indexedDB|Math\.random|innerHTML|insertAdjacentHTML|document\.write|\/work-cases\/|blog-cases|apiKey/.test(runtime));
for(const value of ["tel:1644-9141","https://smartstore.naver.com/battery1/products/414050800","https://smartstore.naver.com/battery1/products/575288571"]) ok(read("js/smart-consult-core.js").includes(value));
const modified=["js/smart-consult.js","js/smart-consult-conversation.js","js/smart-consult-location.js","js/conversation-copy.js"];
const addedBytes=modified.reduce((sum,p)=>sum+Buffer.byteLength(read(p))-execFileSync("git",["show",`90eb274e:${p}`]).length,0)+Buffer.byteLength(read("js/smart-consult-entry.js"))+Buffer.byteLength(read("js/smart-consult-session.js"));
console.log(JSON.stringify({status:"PASS",assertions,vehiclePages:427,initialAddedJsBytes:addedBytes,typicalSessionBytes:Buffer.byteLength(encoded),entryIndexBytes:Buffer.byteLength(read("seo-data/smart-consult-vehicles.json")),canonicalMappingPages:mapping.vehiclePages.length+mapping.detailPages.length},null,2));
