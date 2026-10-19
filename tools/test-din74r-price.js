import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {batteryPrice,priceDescription} from '../js/smart-consult-prices.js';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
import {approvedDin74rPrices} from './lib/din74r-approved-price-delta.js';
import {assertApprovedTraverseData,assertCurrentTaskScope,traverseApproval} from './lib/location-task-validation.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const raw=fs.readFileSync('data/battery-prices.json','utf8').replace(/\r\n/g,'\n');
const oldRaw=execFileSync('git',['show','b0331533daed15ac897f0e38d730859ec7a2de38:data/battery-prices.json'],{encoding:'utf8'}).replace(/\r\n/g,'\n');
assert.equal(raw,oldRaw.replace('"DIN74R": 130000','"DIN74R": 140000'),'only one price token changes');
const before=JSON.parse(oldRaw),catalog=JSON.parse(raw),expected={...before,prices:approvedDin74rPrices(before.prices)};
assert.deepEqual(catalog,expected);
const oldChevrolet=JSON.parse(execFileSync('git',['show',`${traverseApproval}^:data/chevrolet.json`],{encoding:'utf8'}));
const chevrolet=read('data/chevrolet.json');assertApprovedTraverseData(chevrolet,oldChevrolet);
const traverseIndex=chevrolet.findIndex(r=>r.vehicle==='트래버스'&&r.year==='19년~현재'&&r.fuel==='가솔린'&&r.detailModel==='트래버스');
let controls=0;
for(const spec of ['AGM95','AGM105']){const bad=structuredClone(chevrolet);bad[traverseIndex].defaultBattery=spec;assert.throws(()=>assertApprovedTraverseData(bad,oldChevrolet));controls++;}
const badChevrolet=structuredClone(chevrolet);badChevrolet[0].defaultBattery='AGM105';assert.throws(()=>assertApprovedTraverseData(badChevrolet,oldChevrolet));controls++;
for(const p of ['data/hyundai.json','seo-data/service-areas.json','area/gyeonggi/index.html']){assert.throws(()=>assertCurrentTaskScope([p]),/out of current task scope/);controls++;}
for(const [spec,amount]of [['DIN74R',130000],['AGM80',200000]]){const bad=structuredClone(catalog);bad.prices[spec]=amount;assert.throws(()=>assert.deepEqual(bad,expected));controls++;}
assert.equal(controls,8);
let negative=0;
for(const spec of Object.keys(catalog.prices)){const bad=structuredClone(catalog);bad.prices[spec]++;assert.throws(()=>assert.deepEqual(bad,expected));negative++;}
for(const key of ['aliases','brands','currency','version','effectiveAt','nonAgmBrandPolicy']){const bad=structuredClone(catalog);bad[key]=null;assert.throws(()=>assert.deepEqual(bad,expected));negative++;}
assert.throws(()=>approvedDin74rPrices({...before.prices,DIN74R:120000}));negative++;
for(const brand of ['', 'DELKOR'])assert.equal(batteryPrice('DIN74R',catalog,brand).amount,140000);
assert.equal(batteryPrice('DIN74L',catalog).amount,125000);assert.equal(batteryPrice('DIN74',catalog).amount,125000);
assert.match(priceDescription('DIN74R',catalog),/DIN74R.*14만원/);
assert.equal(batteryPrice('DIN74R',catalog,'VARTA').amount,null);
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,policy=read('data/consult-service-policy.json');
const turn=(s,q,c=catalog)=>conversationTurn(s,q,rows,areas,c,policy);
const vehicle=turn(createConversationState(),'BMW 5시리즈 2014년식').state;
let turns=0;
for(const state of [createConversationState(),vehicle])for(const q of ['DIN74R 가격','DIN74R 얼마예요?','DIN74R 교체비용','DIN74R  얼마','델코 DIN74R 가격','델코 DIN74R 교체비용','DIN74R 갸격','din74r 가격','DIN 74R 가격']){
 const out=turn(state,q);assert.equal(out.state.quotedSpec,'DIN74R',q);assert.match(out.messages.join(' '),/DIN74R.*14만원/);assert.doesNotMatch(out.messages.join(' '),/13만원|DIN74L|DIN90|기본 배터리/);
 assert.equal(out.state.confirmedBattery,state.confirmedBattery);assert.equal(out.state.selectedVehicleKey,state.selectedVehicleKey);turns++;
}
const quoted=turn(vehicle,'DIN74R 가격');
const restored=decodeSession(encodeSession(quoted.state,[]));assert.ok(restored);
assert.match(turn(restored.state,'그 배터리 가격').messages.join(' '),/DIN74R.*14만원/);
assert.match(turn(quoted.state,'DIN74L 가격').messages.join(' '),/DIN74L.*12만5천원/);
const missing=structuredClone(catalog);delete missing.prices.DIN74R;missing.unpriced.push('DIN74R');
assert.equal(batteryPrice('DIN74R',missing).amount,null);assert.doesNotMatch(priceDescription('DIN74R',missing),/14만원|13만원/);
assert.doesNotMatch(turn(vehicle,'AGM999 가격').messages.join(' '),/\d+(?:만|천)?원/);
console.log({status:'PASS',price:140000,otherPricesUnchanged:Object.keys(catalog.prices).length-1,explicitTurns:turns,negativePriceProbes:negative,negativeControls:controls,traverse:'AGM80',session:'PASS',fitmentUnchanged:'PASS'});
