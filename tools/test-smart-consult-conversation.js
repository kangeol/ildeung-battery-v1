import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conversationTurn, createConversationState, extractEntities } from "../js/smart-consult-conversation.js";
import { copy } from "../js/conversation-copy.js";
import { parseYearRange, yearMatches } from "../js/smart-consult-core.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = name => fs.readFileSync(path.join(root,name), "utf8");
const json = name => JSON.parse(read(name));
const records = json("data/manufacturers.json").flatMap(m => json(`data/${m.file}`).map(row => ({...row,manufacturerId:m.id,manufacturerName:m.name})));
const localities = json("seo-data/smart-consult-location-index.json").localities;
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
const forbidden = /DB|조회 결과|선택 조건|데이터 기준|매칭 결과|프로세스|후보군|레코드|등록값|시스템/;
const transcripts = [];
function turn(state, text) {
  const response = conversationTurn(state,text,records,localities);
  transcripts.push(response);
  check(!forbidden.test(response.messages.join("\n") + response.chips.map(chip=>chip.label).join(" ")), `internal language: ${text}`);
  check(response.chips.length <= 4, "too many chips");
  return response;
}
function flow(texts) {
  let state = createConversationState();
  const outputs = texts.map(text => { const output = turn(state,text); state=output.state; return output; });
  return {state,outputs};
}
equal(records.length,917,"canonical row count");
for (const text of ["bmw 520d 2019년식이야", "BMW520d 2019", "520d 19년식", "2019년식 520d"]) {
  const {state,outputs} = flow([text]);
  equal(state.manufacturer,"bmw",text);
  equal(state.model,"520d",text);
  equal(state.year,2019,text);
  equal(state.confirmedBattery,"AGM95",text);
  equal(state.previousQuestion,null,"year must not be re-asked");
  check(outputs[0].result !== null,"one sentence must resolve");
}
const carnival=flow(["카니발 18년식 디젤이야"]);
equal(carnival.state.vehicleFamily,"카니발"); equal(carnival.state.year,2018); equal(carnival.state.fuel,"디젤");
equal(carnival.state.confirmedBattery,"DF90L"); equal(carnival.state.previousQuestion,null);
const benz=flow(["벤츠 e300","2020년식","인천인데","가솔린"]);
equal(benz.state.model,"E300"); equal(benz.state.year,2020); equal(benz.state.region.area,"incheon"); equal(benz.state.confirmedBattery,"AGM80");
equal(benz.outputs[0].state.previousQuestion.field,"detailModel"); equal(benz.outputs[1].state.previousQuestion.field,"fuel");
equal(benz.outputs[2].state.previousQuestion.field,"fuel","area follow-up must preserve pending question");
for (const text of ["벤츠 e300 2020", "20년식 e300이야"]) {
  const {state}=flow([text]); equal(state.year,2020); equal(state.previousQuestion.field,"fuel");
}
const correction=flow(["BMW 520d","2019년식","인천 송도야","아니 2018년식이야","AGM이야?","가격 얼마야?"]);
equal(correction.state.year,2018); equal(correction.state.manufacturer,"bmw"); equal(correction.state.region.name,"송도동");
equal(correction.state.confirmedBattery,"AGM95"); check(correction.outputs[4].messages.join(" ").includes("AGM95"));
equal(correction.outputs[5].actions,["phone","stores"]); check(!/\d+\s*만?원/.test(correction.outputs[5].messages.join(" ")));
equal(correction.outputs[3].state.lastIntent,"CORRECTION");
const oneSentence=flow(["BMW 520d 2019년식이고 인천이야"]);
equal(oneSentence.state.year,2019); equal(oneSentence.state.region.area,"incheon"); equal(oneSentence.state.confirmedBattery,"AGM95");
const preYear=flow(["2019년식","bmw 520d"]); equal(preYear.state.year,2019); equal(preYear.state.confirmedBattery,"AGM95");
const confirmation=flow(["벤츠 e300 2020년식","응"]); equal(confirmation.state.fuel,""); equal(confirmation.state.confirmedBattery,null,"yes without selecting fuel cannot establish diesel");
const fuelCorrection=flow(["벤츠 e300 2020년식 디젤","아니 디젤 아니고 가솔린이야"]); equal(fuelCorrection.state.fuel,"가솔린"); equal(fuelCorrection.state.confirmedBattery,"AGM80");
const negative=flow(["벤츠 e300 2020년식","아니요","가솔린"]); equal(negative.state.confirmedBattery,"AGM80");
const barePrice=flow(["가격 얼마야?"]); equal(barePrice.outputs[0].messages,[copy.needVehicle]);
const unknown=flow(["없는차량테스트","다른없는차량","벤츠 e300 20년식","가솔린","날씨는?"]);
equal(unknown.outputs[1].messages,[copy.noMatchAgain]); equal(unknown.state.confirmedBattery,"AGM80"); equal(unknown.outputs[4].messages,[copy.unsupported]);
const substitution=flow(["BMW 520d 2019","일반 배터리 써도돼?","코딩해야돼?"]);
check(substitution.outputs[1].messages.join(" ").includes("전화로 확인")); equal(substitution.outputs[2].messages,[copy.coding]);
const unresolved=flow(["BMW 520d 2099","AGM이야?"]); equal(unresolved.state.confirmedBattery,null);
const changedCar=flow(["BMW 520d 2019","카니발"]); equal(changedCar.state.year,null); equal(changedCar.state.vehicleFamily,"카니발");
const region=flow(["서울 강남","인천 송도야","출장 가능해?","부산도 와?"]);
equal(region.outputs[0].state.region.name,"강남구"); equal(region.outputs[1].state.region.name,"송도동");
check(region.outputs[2].messages.join(" ").includes("송도동")); equal(region.outputs[3].messages,[copy.serviceUnknown]);
const allFuelRows=records.filter(row=>row.manufacturerId==="benz" && row.vehicle==="E-클래스");
equal(extractEntities("99년식",allFuelRows).ambiguousYear,true,"unmapped short year must clarify");
const ig=flow(["그랜저ig 2018년","가솔린"]); equal(ig.state.detailModel,"그랜저 IG"); equal(ig.state.confirmedBattery,"AGM80");
const overlapping=flow(["BMW 520d 2023","G30"]); equal(overlapping.state.confirmedBattery,"AGM95");
check(overlapping.outputs[0].chips.every(chip=>/^\d{4}/.test(chip.label)),"generation chips must start with year");
const reset=flow(["BMW 520d 2019","처음부터"]); equal(reset.state,createConversationState());
const unknownArea=flow(["인천인데","부산인데 출장돼?"]); equal(unknownArea.outputs[1].messages,[copy.serviceUnknown]);
const changedArea=flow(["인천인데","부산 출장가능해?"]); equal(changedArea.outputs[1].messages,[copy.serviceUnknown]);
const rangeAnswer=flow(["BMW 520d 2023","2017~2023년형 · 5시리즈 (G30)"]); equal(rangeAnswer.state.year,2023); equal(rangeAnswer.state.confirmedBattery,"AGM95");
const xss=flow(["<img src=x onerror=alert(1)>"]); equal(xss.state.confirmedBattery,null);
check(!/innerHTML|insertAdjacentHTML|document\.write/.test(read("js/smart-consult.js")),"safe DOM rendering");
check(!/localStorage|indexedDB/.test(read("js/smart-consult.js")+read("js/smart-consult-conversation.js")),"session only; no persistent storage");
for(const value of Object.values(copy)) {
  if(typeof value==="string") check(!forbidden.test(value),"customer copy contains internal wording");
  if(typeof value==="function") check(!forbidden.test(value(["AGM95"])),"customer template contains internal wording");
}
const runtime=["js/smart-consult.js","js/smart-consult-conversation.js","js/conversation-copy.js","smart-consult/index.html"].map(read).join("\n");
check(!/\/work-cases\/|blog-cases|caseDescription/.test(runtime),"no case integration");
check(!/https?:.*(?:openai|anthropic|gemini)|apiKey|api_key/i.test(runtime),"no AI provider");
check(!/caseDescription|localContent|사례/.test(JSON.stringify(localities)),"no unrelated area case data");
const canonicalAreas=json("seo-data/service-areas.json");
for(const item of localities) {
  check(JSON.stringify(canonicalAreas.areas[item.area]).includes(JSON.stringify(item.name)),"canonical area source missing");
  check(fs.existsSync(path.join(root,"area",item.slug,"index.html")),"area canonical URL missing");
}
// Every resolved specification must correspond to matching source rows, across all canonical rows.
for(const row of records) {
  const range=parseYearRange(row.year); const year=range.start || range.end;
  const state={...createConversationState(),selectedVehicleKey:`${row.manufacturerId}|${row.vehicle}`,manufacturer:row.manufacturerId,manufacturerName:row.manufacturerName,vehicleFamily:row.vehicle,detailModel:row.detailModel,exactFuel:row.fuel,year};
  const response=conversationTurn(state,String(year),records,localities);
  if(response.result) {
    check(records.some(source=>source.manufacturerId===row.manufacturerId && source.vehicle===row.vehicle && yearMatches(source.year,year) && source.defaultBattery===response.result.defaultBattery && source.upgradeBattery===response.result.upgradeBattery),"fabricated battery fact");
    check(!("price" in response.result) && !("coding" in response.result),"fabricated price/coding");
  }
}
console.log(`Conversation tests PASS: ${assertions} assertions; ${records.length} canonical rows; internal wording 0; fabricated battery/price/coding 0.`);
