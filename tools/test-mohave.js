import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertMohaveDataset,assertMohaveSitemap,assertMohaveThumbnail,approvedMohaveRows} from './lib/mohave-approved-data.js';
import {searchVehicles,vehicleAliasOccurs} from '../js/smart-consult-core.js';
import {resolveVehicleText} from '../js/vehicle-aliases.js';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
assertMohaveDataset();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const turn=(q,s=createConversationState())=>conversationTurn(s,q,rows,areas,prices,policy);
let cases=0;
for(const q of ['모하비','기아 모하비','모하비 더마스터','모하비 더 마스터','기아 모하비더마스터','기아 모하비 더 마스터','모하비 배터리','모하비 더 마스터 배터리 가격','모하비더마스터 가격','기아 모하비 배터리 얼마예요']){
 const o=turn(q);assert.equal(o.state.selectedVehicleKey,'kia|모하비',q);assert.equal(o.state.confirmedBattery,'DF100L',q);
 assert.match(o.messages.join(' '),/12만원/);assert.doesNotMatch(o.messages.join(' '),/AGM95|르노/);cases++;
}
let s=createConversationState();
for(const q of ['모하비 더마스터','모하비 더마스터','델코100L','100L 가격']){
 const o=turn(q,s);s=o.state;assert.equal(s.selectedVehicleKey,'kia|모하비');assert.match(o.messages.join(' '),/DF100L.*12만원/);cases++;
}
for(const [q,spec,price] of [['DIN100L 가격','DIN100L','15만원'],['DIN74R 가격','DIN74R','14만원']]){
 const o=turn(q,s);assert.match(o.messages.join(' '),new RegExp(spec+'.*'+price));assert.equal(o.state.selectedVehicleKey,'kia|모하비');cases++;
}
for(const q of ['르노 마스터','마스터']){
 const o=turn(q);assert.equal(o.state.selectedVehicleKey,'renault|마스터');assert.equal(o.state.confirmedBattery,'AGM95');assert.match(o.messages.join(' '),/22만원/);cases++;
}
for(const q of ['없는차더마스터','가짜마스터','마스터미등록차','없는차 더마스터','기아 모하비 르노 마스터','모하비 르노 마스터']){
 const o=turn(q);assert.equal(o.state.confirmedBattery,null,q);cases++;
}
const restored=decodeSession(encodeSession(turn('르노 마스터').state,[]));
const changed=turn('기아 모하비 더 마스터',restored.state);assert.equal(changed.state.selectedVehicleKey,'kia|모하비');assert.equal(changed.state.confirmedBattery,'DF100L');cases++;
const preRegistration=rows.filter(r=>r.vehicle!=='모하비');
assert.equal(searchVehicles('모하비 더마스터',preRegistration).matches.length,0,'unregistered compound cannot become Master');
assert.equal(resolveVehicleText('모하비 더마스터',preRegistration).matches.length,0);
assert.equal(vehicleAliasOccurs('없는차마스터','마스터','renault'),false);
for(const battery of ['AGM95','AGM80']){
 const original=read('data/kia.json'),expected=approvedMohaveRows(original.slice(0,-1)),bad=structuredClone(expected);
 bad.at(-1).defaultBattery=battery;assert.throws(()=>assert.deepEqual(bad,expected));cases++;
}
assert.equal(prices.prices.DF100L,120000);assert.equal(prices.prices.DIN100L,150000);assert.equal(prices.prices.AGM95,220000);
let rejected=0;
// Exercise the actual historical oracle with isolated in-memory corruptions.
for(const [file,mutate] of [
 ['data/kia.json',r=>{r.at(-1).defaultBattery='AGM95';}],
 ['data/kia.json',r=>{r.at(-1).manufacturer='르노';}],
 ['data/kia.json',r=>{r[0].defaultBattery='DF100L';}],
 ['data/renault.json',r=>{r.find(x=>x.vehicle==='마스터').defaultBattery='DF100L';}],
 ['data/battery-prices.json',p=>{p.prices.DF100L=150000;}],
 ['data/battery-prices.json',p=>{p.prices.DIN74R=130000;}]
]){
 const bad=read(file);mutate(bad);
 assert.throws(()=>assertMohaveDataset(p=>p===file?bad:read(p)),assert.AssertionError,file);
 rejected++;
}
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const badThumbnail=Buffer.from(fs.readFileSync('assets/seo/vehicle/kia/mohave.png'));badThumbnail[100]^=1;
assert.throws(()=>assertMohaveThumbnail(badThumbnail),assert.AssertionError);rejected++;
assertMohaveSitemap(sitemap);
assert.throws(()=>assertMohaveSitemap(sitemap.replace('/kia/mohave.html','/renault/mohave.html')),assert.AssertionError);rejected++;
assert.throws(()=>assertMohaveSitemap(sitemap.replace('/kia/k5.html','/kia/not-approved.html')),assert.AssertionError);rejected++;
const incorrectRows=structuredClone(rows);incorrectRows.find(r=>r.vehicle==='모하비').defaultBattery='AGM95';
assert.throws(()=>assert.equal(conversationTurn(createConversationState(),'모하비 더마스터',incorrectRows,areas,prices,policy).state.confirmedBattery,'DF100L'));rejected++;
console.log({status:'PASS',cases,negativeProbes:rejected,rows:rows.length,family:'kia|모하비',battery:'DF100L',price:120000});
