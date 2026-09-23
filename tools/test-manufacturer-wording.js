import fs from 'node:fs';import os from 'node:os';import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {authoritativeBrands} from '../js/smart-consult-brand-query.js';
import {batteryAliasLedger,priceDescription} from '../js/smart-consult-prices.js';
import {buildAliasIndex} from '../js/vehicle-aliases.js';
const read=p=>JSON.parse(fs.readFileSync(p));const catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json'),rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=read('seo-data/smart-consult-location-index.json').localities;
const evidence=[];const turn=(q,s=createConversationState())=>{const o=conversationTurn(s,q,rows,areas,catalog,policy);evidence.push({q,messages:o.messages,state:o.state});return o;};
const wording=['제조회사는 어디예요?','제조 회사는?','제조사는요?','제조업체는?','제조 업체 어디예요?','메이커가 어디예요?','회사인가요?','어느 회사 제품이에요?','어디 회사 제품이에요?','누가 만든 제품이에요?','누가 만드는 제품인가요?'];
for(const [alias,codes] of batteryAliasLedger(catalog))for(const w of wording)for(const q of [alias+' '+w,(alias+' '+w).replaceAll(' ','')]){
 const o=turn(q);if(codes.length>1){assert.equal(o.state.quotedSpec,'',q);assert.deepEqual(o.chips.map(c=>c.label),codes,q);continue;}
 const code=codes[0];assert.equal(o.state.quotedSpec,code,q);assert.equal(o.state.lastIntent,'BRAND_QUERY',q);assert.ok(o.messages.includes(`${code} 규격은 ${authoritativeBrands(code,catalog).map(b=>catalog.brands[b].label).join('와 ')} 제품을 안내하고 있습니다.`),q);assert.equal(o.state.confirmedBattery,null);
}
for(const code of Object.keys(catalog.prices))for(const w of wording){const o=turn(code+' '+w+' 가격 알려줘');for(const brand of authoritativeBrands(code,catalog))assert.ok(o.messages.includes(priceDescription(code,catalog,brand)),code);}
for(const w of wording){const o=turn(w);assert.equal(o.state.lastIntent,'BRAND_QUERY',w);assert.match(o.messages.join(' '),/비AGM.*델코/);}
for(const flow of [['80L은 얼마인가요?','제조사는요?'],['BMW 5시리즈 2020년식','가격은?','제조회사는?'],['AGM60','제조사는?','바르타도 있어요?'],['AGM70','제조사는?','바르타 가격은?'],['40AL 어디 브랜드예요?','제조회사는?']]){let s=createConversationState();for(const q of flow)s=turn(q,s).state;assert.ok(s.quotedSpec||s.confirmedBattery);}
for(const q of ['AGM70 어느 나라 제품이에요?','AGM70 원산지가 어디예요?','델코 AGM 어디서 제조돼요?','바르타 AGM 어디서 제조돼요?'])assert.match(turn(q).messages.join(' '),/실버/);
assert.doesNotMatch(turn('80L 원산지가 어디예요?').messages.join(' '),/국산|독일산/);
for(const q of ['80L 국산이에요?','DIN74L 독일산이에요?'])assert.doesNotMatch(turn(q).messages.join(' '),/국산|독일산/);
assert.equal(turn('AGM70 회사?').state.lastIntent,'BRAND_QUERY');
assert.notEqual(turn('회사로 와도 돼요?').state.lastIntent,'BRAND_QUERY');
assert.match(turn('AGM70 제조사랑 현금결제 가능해요?').messages.join(' '),/현금결제 가능/);
assert.match(turn('AGM60 바르타 제조회사 제품 있어요?').messages.join(' '),/지원 규격이 아닙니다/);
for(const row of rows){const o=turn(`${row.manufacturerName} ${row.vehicle} 제조사는?`);assert.doesNotMatch(o.messages.join(' '),/델코|바르타/,row.vehicle);}
for(const alias of buildAliasIndex(rows).map.keys())assert.doesNotMatch(turn(alias+' 제조사는?').messages.join(' '),/델코|바르타/,alias);
for(const q of ['BMW 5시리즈 배터리 제조사는?','G80 배터리 제조회사는?'])assert.match(turn(q).messages.join(' '),/델코/);
assert.ok(turn('60').chips.length>1);
for(const e of evidence)assert.doesNotMatch(e.messages.join(' '),/제조법인|OEM|공장에서|클라리오스|Clarios/i);
const gates=Object.fromEntries(['MANUFACTURER_WORDING_WRONG_INTENT','MANUFACTURER_WORDING_SPEC_LOST','MANUFACTURER_WORDING_ALIAS_LOST','MANUFACTURER_WORDING_CONTEXT_LOST','MANUFACTURER_WORDING_BRAND_WRONG','MANUFACTURER_WORDING_VARTA_BOUNDARY_WRONG','MANUFACTURER_WORDING_PRICE_MULTI_INTENT_LOST','MANUFACTURER_WORDING_AMBIGUOUS_AUTOCONFIRM','BRAND_ORIGIN_CONFUSION','ORIGIN_FABRICATED','LEGAL_MANUFACTURER_ENTITY_FABRICATED','VEHICLE_MANUFACTURER_FALSE_BATTERY_BRAND','CANONICAL_PRICE_WRONG'].map(k=>[k,0]));
const result={count:evidence.length,rows:rows.length,areas:areas.length,gates,evidence};fs.writeFileSync(os.tmpdir()+'/manufacturer-after.json',JSON.stringify(result,null,2));console.log({status:'PASS',count:result.count,rows:rows.length,areas:areas.length,gates});
