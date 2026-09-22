import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {conversationTurn,createConversationState,filteredRows} from '../js/smart-consult-conversation.js';
import {batteryCertainty,parseYearRange} from '../js/smart-consult-core.js';
import {batteryPrice,priceDescription,splitBatterySpec,formatWon} from '../js/smart-consult-prices.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const catalog=read('data/battery-prices.json');
const manufacturers=read('data/manufacturers.json');
const records=manufacturers.flatMap(m=>read(`data/${m.file}`).map((r,index)=>({...r,manufacturerId:m.id,manufacturerName:m.name,source:m.file,index})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
// Independent Owner acceptance fixture, not a runtime price source.
const expected={DF40AL:75000,DF60L:95000,DF60R:100000,DF80L:100000,DF80R:110000,DF90L:110000,DF90R:110000,DF100L:120000,DF100R:125000,DIN50L:90000,DIN60L:105000,DIN60HL:105000,DIN74:125000,DIN74L:125000,DIN74R:130000,DIN90:140000,DIN90L:140000,DIN100L:150000,'65-900':155000,AGM60:155000,AGM70:170000,AGM80:190000,AGM80R:220000,AGM95:220000,AGM95R:240000,AGM105:280000};
assert.deepEqual(catalog.prices,expected);assert.equal(catalog.currency,'KRW');assert.ok(catalog.version&&catalog.effectiveAt);
assert.equal(records.length,917);assert.equal(areas.length,665);
const transcripts=[];
function assertAuthorizedAmounts(messages){for(const message of messages)for(const match of message.matchAll(/([A-Z0-9-]+) (?:델코 기준 )?교체 가격은 ([\d만천]+원)/g)){assert.ok(Object.hasOwn(expected,match[1]),match[1]);assert.equal(match[2],formatWon(expected[match[1]]));}}
function flow(inputs){let state=createConversationState(),out;for(const text of inputs){out=conversationTurn(state,text,records,areas,catalog);state=out.state;transcripts.push({text,messages:out.messages,chips:out.chips,battery:state.confirmedBattery,area:state.region?.fullLabel,priceIntent:state.priceIntent});}return out;}
for(const [code,amount] of Object.entries(expected))for(const variant of [code,code.toLowerCase(),code.replace(/(AGM|DIN|DF)/,'$1 ')]){
 const out=flow([`${variant} 얼마예요?`]);assert.ok(out.messages.join(' ').includes(formatWon(amount)),code);assert.equal(out.state.confirmedBattery,null);
}
for(const [alias,target]of Object.entries(catalog.aliases))assert.equal(batteryPrice(alias,catalog).amount,expected[target]);
for(const text of ['DIN70L 얼마예요?','AGM999 가격']){const o=flow([text]);assert.ok(!/\d+(?:만|천)?원/.test(o.messages.join(' ')));assert.deepEqual(o.actions,['phone']);}
for(const fuel of ['가솔린 2.5','LPG']){const out=flow([`그랜저 GN7 2023년식 ${fuel} 배터리 얼마예요?`]);assert.equal(out.state.confirmedBattery,'AGM70');assert.ok(out.messages.join(' ').includes('17만원'));}
const unresolved=flow(['그랜저 GN7 2023년식 가솔린 3.5 배터리 얼마예요?']);assert.equal(unresolved.state.confirmedBattery,null);assert.ok(!/\d+(?:만|천)?원/.test(unresolved.messages.join(' ')));
const bmw=flow(['구월동 BMW 배터리 얼마예요?','5시리즈','2020년식']);assert.equal(bmw.state.confirmedBattery,'AGM95');assert.ok(bmw.messages.join(' ').includes('22만원'));assert.ok(bmw.state.region.fullLabel.includes('구월동'));assert.equal(bmw.state.priceIntent,true);
const saved=decodeSession(encodeSession(bmw.state,[],null));assert.ok(saved);
const corrected=conversationTurn(bmw.state,'아니 2019년식이야',records,areas,catalog);assert.equal(corrected.state.year,2019);assert.equal(corrected.state.priceIntent,true);
const mini=flow(['미니 쿠퍼 배터리 얼마예요?']);assert.equal(mini.state.confirmedBattery,null);assert.ok(mini.messages.join(' ').includes('17만원'));assert.ok(mini.messages.join(' ').includes('19만원'));assert.ok(mini.messages.join(' ').includes('현장'));
for(const spec of ['AGM70 / AGM80','DF80L 또는 AGM70','AGM70 / DIN70L','AGM70 / AGM999']){
 const text=priceDescription(spec,catalog);for(const p of splitBatterySpec(spec)){const price=batteryPrice(p,catalog);assert.ok(text.includes(price.amount===null?'가격 확인이 필요':formatWon(price.amount)));}assert.ok(text.includes('현장'));
 const row={...records[0],defaultBattery:spec};const state={...createConversationState(),selectedVehicleKey:`${row.manufacturerId}|${row.vehicle}`,priceIntent:true};const o=conversationTurn(state,'배터리 가격',[row],[],catalog);assert.equal(o.state.confirmedBattery,null);assert.ok(o.messages.join(' ').includes('현장'));
}
const strings=[...new Set(records.flatMap(r=>[r.defaultBattery,r.upgradeBattery]).filter(Boolean))];
const coverage=strings.map(spec=>{
 const parts=splitBatterySpec(spec),prices=parts.map(p=>batteryPrice(p,catalog));
 const category=/문의|확인/.test(spec)?'CUSTOMER_CENTER':prices.every(p=>p.amount!==null)?(parts.length>1?'COMPOSITE_ALL_COMPONENTS_PRICED':'EXACT_PRICED_SINGLE'):parts.length===1&&catalog.unpriced.includes(prices[0].code)?'UNPRICED_SINGLE':'MALFORMED_OR_REVIEW_REQUIRED';
 assert.notEqual(category,'MALFORMED_OR_REVIEW_REQUIRED',spec);return {spec,category,prices,rows:records.filter(r=>[r.defaultBattery,r.upgradeBattery].includes(spec)).map(r=>`${r.source}[${r.index}]`)};
});
let cases=0;
for(const row of records)for(let stage=0;stage<4;stage++){
 const state={...createConversationState(),selectedVehicleKey:`${row.manufacturerId}|${row.vehicle}`,manufacturer:row.manufacturerId,manufacturerName:row.manufacturerName,vehicleFamily:row.vehicle,priceIntent:true};
 if(stage>=1)state.year=parseYearRange(row.year).start||parseYearRange(row.year).end||2026;
 if(stage>=2)state.exactFuel=row.fuel;
 if(stage>=3){state.detailModel=row.detailModel;state.yearRange=row.year;}
 const out=conversationTurn(state,'배터리 가격',records,areas,catalog),candidates=filteredRows(records,out.state);
 assertAuthorizedAmounts(out.messages);
 if(out.state.confirmedBattery){assert.ok(batteryCertainty(candidates).safe);assert.equal(out.state.confirmedBattery,row.defaultBattery);const p=batteryPrice(out.state.confirmedBattery,catalog);assert.ok(out.messages.join(' ').includes(p.amount===null?'가격 확인이 필요':formatWon(p.amount)));}
 else if(out.messages.join(' ').includes('교체 가격은'))assert.ok(new Set(candidates.map(r=>r.defaultBattery)).size===1&&splitBatterySpec(row.defaultBattery).length>1);
 cases++;
}
const hyundai=read('data/hyundai.json');assert.equal(hyundai[40].defaultBattery,'AGM60');assert.ok(!records.some(r=>[r.defaultBattery,r.upgradeBattery].includes('AG60')));
for(const t of transcripts)assertAuthorizedAmounts(t.messages);
assert.equal(catalog.prices.AGM105,280000); // VARTA AGM95 now legitimately costs 270000.
for(const path of ['js/smart-consult-prices.js','js/smart-consult-conversation.js','js/smart-consult.js'])assert.ok(!/270000|27만원/.test(fs.readFileSync(path,'utf8')),path);
const baseline='da2e2c0f93e119d82123e5d63b868e30195c00b6';
const git=args=>execFileSync('git',['-c','core.safecrlf=false',...args],{encoding:'utf8',maxBuffer:20e6});
for(const m of manufacturers){const old=JSON.parse(git(['show',`${baseline}:data/${m.file}`]));if(m.file==='hyundai.json')old[40].defaultBattery='AGM60';if(m.file==='chevrolet.json')old[30].defaultBattery='DIN74L';assert.deepEqual(read(`data/${m.file}`),old);}
const htmlChanges=git(['diff',baseline,'--name-only','--','*.html']).trim().split('\n').filter(Boolean);
assert.deepEqual(htmlChanges.sort(),['car-battery/chevrolet/alpheon.html','car-battery/hyundai/santafe.html','car-battery/hyundai/santafe/tm.html','smart-consult/index.html'].sort());
for(const path of htmlChanges){let expectedHtml=git(['show',`${baseline}:${path}`]).replace(/\r\n/g,'\n');if(path==='smart-consult/index.html')expectedHtml=expectedHtml.replace('?v=flow-v1','?v=product-v1');else if(path==='car-battery/chevrolet/alpheon.html')expectedHtml=expectedHtml.replace(/\bDIN70L\b/g,'DIN74L');else if(path.endsWith('/tm.html'))expectedHtml=expectedHtml.replace(/\bAG60\b/g,'AGM60');else expectedHtml=expectedHtml.replace('AGM70, AGM60, AGM80, AG60 등','AGM70, AGM60, AGM80, AGM95 등').replace('<strong>AG60</strong>','<strong>AGM60</strong>');assert.equal(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'),expectedHtml,path);}
const metrics=Object.fromEntries(['PRICE_MAP_WRONG_VALUE','AGM105_OLD_270000_REMAINING','AG60_STANDALONE_REMAINING','FABRICATED_PRICE','COMPOSITE_SINGLE_AUTOCONFIRM','UNPRICED_NUMERIC_PRICE','UNHANDLED_BATTERY_STRING','WRONG_BATTERY_RECOMMENDATION','AMBIGUOUS_BATTERY_AUTOCONFIRM'].map(k=>[k,0]));
const evidenceDir=process.argv.includes('--product')?'docs/evidence/product-as-hours':process.argv.includes('--brand')?'docs/evidence/brand-service':'docs/evidence/battery-pricing';
fs.mkdirSync(evidenceDir,{recursive:true});fs.writeFileSync(`${evidenceDir}/pricing.json`,JSON.stringify({status:'PASS',cases,metrics,coverage,transcripts,htmlChanges},null,2)+'\n');
console.log({status:'PASS',cases,metrics,distinctStrings:strings.length,htmlChanges});
