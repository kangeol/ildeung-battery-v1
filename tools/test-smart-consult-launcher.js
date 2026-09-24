import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {launcherMarkup} from "./lib/smart-consult-launcher.js";
import {gn7FactualDelta} from './lib/gn7-factual-regression.js';
import {approvedSyncFiles} from './lib/blog-sync-approved-freeze.js';
import {LAUNCHER_KEY,ENTRY_MAX_AGE,vehicleIdFromCanonical,encodeLauncherContext,decodeLauncherContext,hasEntryConflict} from "../js/smart-consult-launcher-context.js";
import {entryState} from "../js/smart-consult-entry.js";
import {createConversationState} from "../js/smart-consult-conversation.js";
const baseline="b98f98bbc1c062a0985419670e513ddef0abc23c";
const read=p=>fs.readFileSync(p,"utf8").replace(/\r\n/g,"\n");
const index=JSON.parse(read("seo-data/smart-consult-vehicles.json"));
const records=JSON.parse(read("data/manufacturers.json")).flatMap(m=>JSON.parse(read(`data/${m.file}`)).map(r=>({...r,manufacturerId:m.id})));
const files=execFileSync("git",["ls-tree","-r","--name-only",baseline],{encoding:"utf8"}).trim().split("\n").filter(p=>p.endsWith(".html"));
// One read-only Git batch, preserving exact file boundaries by byte length.
const batch=execFileSync("git",["cat-file","--batch"],{input:files.map(p=>`${baseline}:${p}\n`).join(""),maxBuffer:100e6});
let offset=0, included=0, excluded=0, vehiclePages=0;
const staticPages=["index.html","search.html","company/index.html","service-area.html","battery-replacement.html"];
for(const p of files) {
  const end=batch.indexOf(10,offset),size=Number(batch.subarray(offset,end).toString().split(" ").at(-1));
  const before=batch.subarray(end+1,end+1+size).toString().replace(/\r\n/g,"\n"); offset=end+size+2;
  const html=read(p),include=/^(car-battery|area|battery)\//.test(p)||staticPages.includes(p);
  if(include) {
    included++;
    assert.equal(html.split(launcherMarkup).length-1,1,p);
    assert.equal(html.includes("이 차량 스마트 상담하기"),false,p);
    const oldLine=/^              <a class="btn secondary smart-consult-link" href="\/smart-consult\/\?vehicleId=[^"]+">이 차량 스마트 상담하기<\/a>\n/m;
    if(oldLine.test(before)) vehiclePages++;
    const expected = p === 'index.html' ? before.replaceAll('스마트 배터리 상담','AI 배터리 상담') : before;
    if(!approvedSyncFiles.has(p))assert.equal(html.replace(launcherMarkup,""),gn7FactualDelta(expected.replace(oldLine,""),p),`${p}: full HTML SEO/body/blog freeze`);
    assert.equal(/href="\/smart-consult\/\?/.test(html),false,p);
  } else {
    excluded++;
    if (p === 'smart-consult/index.html') {
      assert.equal(html.includes('class="smart-consult-launcher"'),false,'consultation remains launcher-free');
      assert.ok(html.includes('<link rel="canonical" href="https://battery1.co.kr/smart-consult/">'));
    } else if(!approvedSyncFiles.has(p))assert.equal(html,before,`${p}: excluded unchanged`);
  }
}
for(const entry of index.vehicles) {
  assert.equal(vehicleIdFromCanonical(`https://battery1.co.kr/car-battery/${entry.id}.html`),entry.id);
  assert.ok(records.some(r=>r.manufacturerId===entry.manufacturerId&&r.vehicle===entry.vehicle));
  assert.deepEqual(decodeLauncherContext(encodeLauncherContext(entry,1000),index,1001),entry);
  assert.equal(hasEntryConflict({state:entryState(entry),entryId:entry.id,messages:[]},entry),false);
}
const bmw=index.vehicles.find(e=>e.id==="bmw/5-series"),benz=index.vehicles.find(e=>e.id==="benz/c-class");
const saved={state:entryState(bmw),entryId:bmw.id,messages:[]};
assert.equal(hasEntryConflict(saved,benz),true);
assert.equal(hasEntryConflict({...saved,state:entryState(benz)},bmw),true,"corrected vehicle must override historic entryId");
assert.equal(hasEntryConflict(saved,null),false);
assert.equal(hasEntryConflict(null,bmw),false);
assert.equal(hasEntryConflict({state:createConversationState(),messages:[{role:"user"}]},bmw),true);
for(const raw of ["{","null","{}",encodeLauncherContext({id:"bmw/fake"},1000),encodeLauncherContext({id:"<img onerror=x>"},1000),encodeLauncherContext(bmw,2000),encodeLauncherContext(bmw,1)]) assert.equal(decodeLauncherContext(raw,index,raw===encodeLauncherContext(bmw,1)?ENTRY_MAX_AGE+2:1001),null);
for(const url of ["https://evil.example/car-battery/bmw/5-series.html","https://battery1.co.kr/car-battery/bmw/5-series.html?x=1","https://battery1.co.kr/","garbage"]) assert.equal(vehicleIdFromCanonical(url),null);
const xml=read("sitemap.xml");
assert.equal((xml.match(/<loc>https:\/\/battery1.co.kr\/smart-consult\/<\/loc>/g)||[]).length,1);
assert.equal(/vehicleId=/.test(xml),false);
assert.notEqual(LAUNCHER_KEY,"ildeung.smart-consult.v5");
assert.equal(/innerHTML|insertAdjacentHTML|localStorage|apiKey/.test(read("js/smart-consult-launcher.js")),false);
console.log({status:"PASS",baseline,included,excluded,vehiclePages,canonicalRows:records.length,vehicleEntries:index.vehicles.length,unexpectedFullHtmlDiffs:0});
