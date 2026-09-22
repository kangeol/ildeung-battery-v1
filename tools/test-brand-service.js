import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {conversationTurn,createConversationState,filteredRows} from '../js/smart-consult-conversation.js';
import {batteryPrice,formatWon,brandIntent} from '../js/smart-consult-prices.js';
import {batteryCertainty,parseYearRange} from '../js/smart-consult-core.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const manufacturers=read('data/manufacturers.json');
const rows=manufacturers.flatMap(m=>read(`data/${m.file}`).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const baseline='4b7ce6fbb2f0747e05a56bac96a54fc637a56322';
const git=a=>execFileSync('git',['-c','core.safecrlf=false',...a],{encoding:'utf8',maxBuffer:20e6});
const before=JSON.parse(git(['show',`${baseline}:data/battery-prices.json`]));
assert.deepEqual(catalog.prices,before.prices);assert.deepEqual(catalog.aliases,before.aliases);assert.deepEqual(catalog.unpriced,[]);assert.equal(Object.keys(catalog.prices).length,26);
const varta={AGM70:220000,AGM80:240000,AGM95:270000,AGM105:330000};
assert.deepEqual(catalog.brands.VARTA.prices,varta);assert.equal(catalog.defaultAgmBrand,'DELKOR');
assert.equal(catalog.brands.DELKOR.prices,undefined,'DELKOR references existing base truth');
for(const [code,amount] of Object.entries(varta))assert.equal(amount-catalog.prices[code],50000);
const expectedAnswers={
 MOBILE_SERVICE_FEE:'별도 출장비는 없습니다. 안내드린 가격에 출장교체비용이 포함되어 있습니다.',
 LABOR_FEE:'교체 공임이 포함된 가격이라 별도 공임비는 없습니다.',
 OLD_BATTERY:'안내드린 가격은 기존 폐배터리 수거 조건입니다. 교체 후 기존 배터리는 수거합니다.',
 KEEP_OLD_BATTERY:'안내드린 가격은 기존 폐배터리 수거 조건입니다. 기존 배터리를 보관하시려면 전화로 정확한 조건을 확인해 주세요.',
 CODING:'코딩이 필요한 차량은 필요한 코딩 작업까지 포함하며 별도 코딩비를 추가하지 않습니다.',
 BASIC_INSPECTION:'배터리 교체 시 기본점검도 무료로 진행합니다.',
 ONSITE_SURCHARGE:'안내드린 차량·규격·조건 그대로 교체하는 경우 현장에서 별도 추가비용은 없습니다.',
 COMBINED:'안내드린 교체 가격에는 출장교체비용과 공임이 포함되어 있고, 코딩이 필요한 차량은 코딩비도 별도로 받지 않습니다. 기본점검은 무료이며, 기존 폐배터리 수거 조건입니다. 안내된 조건으로 정상 교체 시 현장 추가비용은 없습니다.'
};
assert.deepEqual(policy.answers,expectedAnswers);
assert.deepEqual(policy.facts,Object.fromEntries(['PRICE_INCLUDES_MOBILE_SERVICE','PRICE_INCLUDES_LABOR','PRICE_REQUIRES_OLD_BATTERY_COLLECTION','REQUIRED_CODING_INCLUDED_FREE','BASIC_INSPECTION_INCLUDED_FREE','NO_ONSITE_SURCHARGE_FOR_QUOTED_CONDITIONS'].map(k=>[k,true])));
assert.equal(policy.summary,'출장·공임 포함, 폐배터리 수거 조건이며 필요한 차량의 코딩과 기본점검도 별도 비용 없이 진행합니다.');
const runtime=['js/smart-consult-prices.js','js/smart-consult-policy.js','js/smart-consult-conversation.js'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
assert.ok(!/\b(?:50000|220000|240000|270000|330000)\b/.test(runtime),'no runtime formula or copied prices');
for(const answer of Object.values(expectedAnswers))assert.ok(!runtime.includes(answer),'policy wording comes only from JSON');
const transcripts=[];
function turn(state,text){const out=conversationTurn(state,text,rows,areas,catalog,policy);transcripts.push({text,messages:out.messages,chips:out.chips,brand:out.state.brand,battery:out.state.confirmedBattery,quotedSpec:out.state.quotedSpec,area:out.state.region?.fullLabel});return out;}
function flow(inputs){let out={state:createConversationState()};for(const text of inputs)out=turn(out.state,text);return out;}
for(const [code,amount] of Object.entries(varta))for(const alias of ['바르타','VARTA','varta','바 르 타','바르타배터리']){
 const o=flow([`${alias} ${code} 얼마예요?`]);assert.ok(o.messages.join(' ').includes(formatWon(amount)));assert.equal(o.state.brand,'VARTA');assert.equal(o.state.confirmedBattery,null);
}
for(const code of Object.keys(catalog.prices).filter(c=>c.startsWith('AGM')))for(const alias of ['델코','DELKOR','delkor','델코배터리']){
 const o=flow([`${alias} ${code} 가격`]);assert.ok(o.messages.join(' ').includes('델코 기준'));assert.ok(o.messages.join(' ').includes(formatWon(catalog.prices[code])));
}
for(const code of ['AGM60','AGM80R','AGM95R','DIN60','DF80L','AGM999'])for(const text of [`바르타 ${code} 얼마예요?`,`${code} 바르타 있어요?`]){
 const o=flow([text]);assert.equal(batteryPrice(code,catalog,'VARTA').amount,null);assert.ok(!/\d+(?:만|천)?원/.test(o.messages.join(' ')));assert.ok(o.messages.join(' ').includes('판매 지원 규격이 아닙니다'));
}
assert.equal(brandIntent('델코 말고 바르타',catalog),'VARTA');
for(const code of ['DIN60','DF60L','65-900'])assert.equal(batteryPrice(code,catalog).brand,'');
const bmw=flow(['BMW 5시리즈 2020년식 배터리 얼마예요?']);assert.equal(bmw.state.confirmedBattery,'AGM95');assert.ok(bmw.messages.join(' ').includes('델코 기준 교체 가격은 22만원'));
for(const text of ['바르타로 하면?','바르타는 얼마예요?','바르타 AGM은?','델코 말고 바르타','VARTA 가격은?','바르타 제품으로 하면 얼마?']){const o=turn(bmw.state,text);assert.ok(o.messages.join(' ').includes('바르타 기준 교체 가격은 27만원'));assert.equal(o.chips.length,0);assert.equal(o.state.year,2020);assert.equal(o.state.confirmedBattery,'AGM95');}
const mini=flow(['미니 쿠퍼 배터리 얼마예요?']);assert.ok(mini.messages.join(' ').includes('17만원'));assert.ok(mini.messages.join(' ').includes('19만원'));
const miniV=turn(mini.state,'바르타로 하면?');assert.equal(miniV.state.confirmedBattery,null);for(const t of ['22만원','24만원','현장','중 하나'])assert.ok(miniV.messages.join(' ').includes(t));
const integrated=flow(['구월동 BMW 5시리즈 2020년식 바르타 배터리 얼마예요?']);assert.equal(integrated.state.region.fullLabel,'인천 남동구 구월동');assert.equal(integrated.state.brand,'VARTA');assert.equal(integrated.state.confirmedBattery,'AGM95');assert.ok(integrated.messages.join(' ').includes('27만원'));
const intentCases={
 MOBILE_SERVICE_FEE:['출장비 있나요?','출장 무료인가요?','출장비 따로예요?','출장교체비용 포함인가요?','출장비 별도인가요?','출장비는?'],
 LABOR_FEE:['공임비 있나요?','공임 별도예요?','장착비 있나요?','교체 공임 포함인가요?','공임비 따로예요?'],
 OLD_BATTERY:['폐배터리 수거하나요?','헌배터리 가져가나요?','기존 배터리 가져가요?','폐배터리 회수하나요?','배터리 반납해야 하나요?'],
 KEEP_OLD_BATTERY:['폐배터리 보관하고 싶어요','폐배터리 수거 안 하면 얼마예요?'],
 CODING:['코딩비 얼마예요?','코딩비용 포함인가요?','코딩 무료인가요?','BMW 코딩비 따로예요?','배터리 코딩도 해주나요?','코딩비는?','코딩은?'],
 BASIC_INSPECTION:['점검도 해주나요?','기본점검 무료인가요?','점검비 있나요?'],
 ONSITE_SURCHARGE:['현장에서 추가비용 있나요?','추가금 있나요?','현장 추가금 있나요?','가서 더 받는 거 아니죠?','안내 가격이 최종인가요?','현장에서 더 받는 거 없어요?'],
 COMBINED:['가격에 뭐가 포함돼요?','교체비용에 포함된 게 뭐예요?','22만원이면 다 포함이에요?','별도 비용 있나요?','22만원이면 공임이랑 출장비 다 포함이에요?']
};
for(const [intent,phrases]of Object.entries(intentCases))for(const text of phrases)for(const previous of [createConversationState(),integrated.state]){
 const o=turn(previous,text);assert.ok(o.messages.includes(expectedAnswers[intent]),`${text}: ${o.messages}`);
 if(previous.selectedVehicleKey){for(const k of ['brand','year','selectedVehicleKey','quotedSpec','priceIntent'])assert.equal(o.state[k],previous[k],`${text}/${k}`);assert.deepEqual(o.state.region,previous.region);}
 assert.ok(!/\d+(?:만|천)?원/.test(o.messages.join(' ')));if(intent==='KEEP_OLD_BATTERY')assert.ok(o.actions.includes('phone'));
}
const saved=decodeSession(encodeSession(miniV.state,[],null));assert.equal(saved.state.brand,'VARTA');assert.equal(saved.state.quotedSpec,miniV.state.quotedSpec);assert.ok(turn(saved.state,'바르타로 하면?').messages.join(' ').includes('24만원'));
const oldState=structuredClone(bmw.state);for(const key of ['brand','quotedSpec','priceSummaryShown'])delete oldState[key];
const oldBody=JSON.stringify({state:oldState,messages:[],entryId:null});let oldHash=2166136261;for(const char of oldBody)oldHash=Math.imul(oldHash^char.charCodeAt(0),16777619);
const oldSession=JSON.stringify({version:2,savedAt:Date.now(),body:oldBody,checksum:(oldHash>>>0).toString(16)});
const migrated=decodeSession(oldSession);assert.equal(migrated.state.confirmedBattery,'AGM95');assert.equal(migrated.state.brand,'');assert.ok(turn(migrated.state,'바르타로 하면?').messages.join(' ').includes('27만원'));
const exactWithoutQuote={...bmw.state,quotedSpec:''};assert.ok(turn(exactWithoutQuote,'바르타 AGM은?').messages.join(' ').includes('27만원'));
const correction=turn(integrated.state,'아니 2023년식이야');assert.equal(correction.state.brand,'VARTA');assert.equal(correction.state.confirmedBattery,null);assert.equal(correction.state.quotedSpec,'');
assert.ok(!turn(correction.state,'바르타로 하면?').messages.join(' ').includes('27만원'));
let massCases=0;
for(const row of rows)for(const brand of ['','DELKOR','VARTA']){
 const state={...createConversationState(),brand,priceIntent:true,selectedVehicleKey:`${row.manufacturerId}|${row.vehicle}`,manufacturer:row.manufacturerId,manufacturerName:row.manufacturerName,vehicleFamily:row.vehicle,year:parseYearRange(row.year).start||2026,yearRange:row.year,detailModel:row.detailModel,exactFuel:row.fuel};
 const o=conversationTurn(state,'배터리 가격',rows,areas,catalog,policy);
 if(o.state.confirmedBattery){assert.ok(batteryCertainty(filteredRows(rows,o.state)).safe);assert.equal(o.state.confirmedBattery,row.defaultBattery);}
 for(const message of o.messages)for(const m of message.matchAll(/([A-Z0-9-]+) (?:(델코|바르타) 기준 )?교체 가격은 ([\d만천]+원)/g)){
  const expected=m[2]==='바르타'?varta[m[1]]:catalog.prices[m[1]];assert.ok(expected);assert.equal(m[3],formatWon(expected));
 }
 if(/또는|\//.test(row.defaultBattery))assert.equal(o.state.confirmedBattery,null);
 massCases++;
}
for(const m of manufacturers){const expected=JSON.parse(git(['show',`${baseline}:data/${m.file}`]));if(m.file==='chevrolet.json')expected[30].defaultBattery='DIN74L';assert.deepEqual(read(`data/${m.file}`),expected);}
const htmlChanged=git(['diff',baseline,'--name-only','--','*.html']).trim().split('\n').filter(Boolean);assert.deepEqual(htmlChanged,['car-battery/chevrolet/alpheon.html','smart-consult/index.html']);
assert.equal(fs.readFileSync('smart-consult/index.html','utf8').replace(/\r\n/g,'\n'),git(['show',`${baseline}:smart-consult/index.html`]).replace(/\r\n/g,'\n').replace('?v=price-v1','?v=product-v1'));
const metrics=Object.fromEntries(['DELKOR_PRICE_WRONG','VARTA_PRICE_WRONG','VARTA_UNSUPPORTED_FABRICATED_PRICE','BRAND_CONTEXT_LOST','COMPOSITE_BRAND_SINGLE_AUTOCONFIRM','SERVICE_POLICY_WRONG_ANSWER','SERVICE_POLICY_UNSUPPORTED_CLAIM','FABRICATED_SURCHARGE','FABRICATED_PRICE','PRICE_TRUTH_DUPLICATION','POLICY_TRUTH_DUPLICATION','WRONG_BATTERY_RECOMMENDATION','AMBIGUOUS_BATTERY_AUTOCONFIRM'].map(k=>[k,0]));
const evidenceDir=process.argv.includes('--product')?'docs/evidence/product-as-hours':'docs/evidence/brand-service';
fs.mkdirSync(evidenceDir,{recursive:true});fs.writeFileSync(`${evidenceDir}/brand-service.json`,JSON.stringify({status:'PASS',massCases,metrics,intentCases,transcripts},null,2)+'\n');console.log({status:'PASS',massCases,metrics,turns:transcripts.length});
