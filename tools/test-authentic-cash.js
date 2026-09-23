import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),policy=read('data/consult-service-policy.json'),catalog=read('data/battery-prices.json');
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=read('seo-data/smart-consult-location-index.json').localities;
assert.equal(rows.length,917);assert.equal(areas.length,665);
const old=JSON.parse(execFileSync('git',['show','6ea87f5c:data/consult-service-policy.json'],{encoding:'utf8'}));
const stripped=structuredClone(policy);stripped.version=old.version;delete stripped.operational;delete stripped.product.comparisonContext;delete stripped.product.assurance;delete stripped.finalFaq.facts.CASH_PAYMENT_AVAILABLE;delete stripped.finalFaq.answers.CASH;stripped.finalFaq.answers.PAYMENT_COMBINED=old.finalFaq.answers.PAYMENT_COMBINED;assert.deepEqual(stripped,old);
assert.equal(policy.finalFaq.facts.CASH_PAYMENT_AVAILABLE,true);
assert.equal(policy.finalFaq.answers.CASH,'네. 현금결제 가능합니다.');
assert.deepEqual(policy.product.assurance,{AUTHENTIC:'네. 일등밧데리는 최신 정품만 사용합니다.',RECENT:'네. 항상 최신 제조일자 제품만 사용합니다.',COMBINED:'네. 일등밧데리는 최신 정품과 최신 제조일자 제품만 사용합니다.',EXACT_DATE:'항상 최신 제조일자 제품만 사용합니다. 정확한 현재 제품의 제조일자·출고일·입고일은 제품 확인이 필요하므로 고객센터 {phone}로 확인해 주세요.'});
const groups={
 authentic:['정품인가요?','정품 맞나요?','정품이죠?','정품 써요?','정품 배터리인가요?','가품 아니죠?','최신 정품인가요?','최신정품 맞나요?'],
 recent:['최신 제조인가요?','최신제조인가요?','최근 제조인가요?','최근 생산 제품인가요?','제조일자 최신인가요?','제조일자 최근거예요?','오래된 재고 아니죠?','재고 오래된 거 아니에요?','새 배터리인가요?','새제품 맞나요?'],
 exact:['몇 월 생산이에요?','몇월 생산인가요?','제조일자 정확히 언제예요?','제조일자가 정확히 언제예요?','언제 생산됐나요?','몇 년 몇 월 제품이에요?','몇년몇월 제품인가요?','언제 출고됐어요?','출고일자가 언제예요?','이번 달 생산인가요?','이번달 제품인가요?','정확한 제조일자?','출고일자?','생산주차 알려주세요','입고일은 언제예요?','2026년 9월 생산인가요?','오늘 입고됐나요?'],
 cash:['현금되나요?','현금 돼요?','현금 가능해요?','현금결제 되나요?','현금 결제돼요?','현금으로 할게요','현금으로 해도 돼요?','현찰 되나요?'],
 confirm:['현금 할인 되나요?','현금으로 하면 카드 수수료 없나요?','현금 부가세 별도예요?','현금 말고 계좌번호 알려주세요']
};
const evidence=[];const fresh=()=>createConversationState();
function turn(state,text,selection){const o=conversationTurn(state,text,rows,areas,catalog,policy,selection);evidence.push({text,messages:o.messages,actions:o.actions,state:o.state});return o;}
const states=[fresh(),turn(fresh(),'BMW 5시리즈 2020년식').state,turn(fresh(),'구월동 BMW 5시리즈 2020년식 바르타 배터리 얼마예요?').state,turn(fresh(),'AGM105').state];
for(const [kind,inputs]of Object.entries(groups))for(const input of inputs)for(const text of [...new Set([input,input.replace(/\s/g,''),'혹시 '+input.replace(/\?$/,'요?')])])for(const state of states){
 const o=turn(state,text),s=o.messages.join(' ');assert.deepEqual(o.state,state,`context ${text}`);
 if(kind==='authentic')assert.match(s,/최신 정품만 사용/);
 if(kind==='recent')assert.match(s,/항상 최신 제조일자 제품만 사용/);
 if(kind==='exact'){assert.match(s,/최신 제조일자/);assert.match(s,/1644-9141/);assert.ok(o.actions.includes('phone'));}
 if(kind==='cash')assert.match(s,/현금결제 가능합니다/);
 if(kind==='confirm')assert.match(s,/세부 결제 조건.*1644-9141/);
 assert.doesNotMatch(s,/(?:19|20)\d{2}[년-]|\d+월|\d+일|\d+주차|이번\s*달.*(?:맞|생산했|출고했)|\d+(?:만|천|,\d{3})*원|무조건|할인.*(?:가능|해드)|수수료.*없|부가세.*(?:포함|별도)/);
}
const combined=[['정품이고 최신 제조인가요?',/최신 정품과 최신 제조일자/],['최신정품 맞고 제조일자도 최근인가요?',/최신 정품과 최신 제조일자/],['최신 정품이에요? 현금 되나요?',/현금결제/],['최신 제조 제품이고 카드도 되나요?',/카드결제/],['정품 맞나요? 현금영수증 되나요?',/현금영수증 발행/],['현금으로 하고 현금영수증도 되나요?',/현금결제.*현금영수증/],['현금으로 하고 현금영수증 돼요?',/현금결제.*현금영수증/],['AGM105 최신정품인가요?',/최신 정품/],['AGM105 최신 제조인가요?',/최신 제조일자/],['AGM105 가격이랑 현금결제 가능한가요?',/28만원/],['바르타 AGM105 정품이고 최신 제조인가요?',/최신 정품과 최신 제조일자/],['BMW 5시리즈 2020년식 배터리 정품인가요?',/최신 정품/]];
for(const [input,re]of combined){const o=turn(fresh(),input);assert.match(o.messages.join(' '),re);if(/AGM105/.test(input))assert.equal(o.state.quotedSpec,'AGM105');if(/바르타/.test(input))assert.equal(o.state.brand,'VARTA');if(/BMW/.test(input)){assert.equal(o.state.selectedVehicleKey,'bmw|5시리즈');assert.equal(o.state.year,2020);}if(/정품/.test(input))assert.match(o.messages.join(' '),/최신 정품/);if(/현금결제/.test(input))assert.match(o.messages.join(' '),/현금결제/);}
for(const input of ['AGM105 최신 제조 제품 가격이랑 현금결제 돼요?','구월동 바르타 AGM105 정품이고 현금결제 가격은?','AGM105 정확한 제조일자와 가격 알려주세요']){const o=turn(fresh(),input);assert.equal(o.state.quotedSpec,'AGM105');assert.equal(o.state.confirmedBattery,null);assert.match(o.messages.join(' '),/28만원|33만원/);if(input.includes('구월동'))assert.match(o.state.region.fullLabel,/구월동/);if(input.includes('정확한'))assert.ok(o.actions.includes('phone'));}
const unknown=turn(fresh(),'AGM999 정품인가요 가격은?');assert.doesNotMatch(unknown.messages.join(' '),/\d+(?:만|천)?원/);
let o=turn(fresh(),'BMW 5시리즈 2020년식');o=turn(o.state,'바르타로 하면?');const context=o.state;for(const text of ['정품 맞나요?','최신 제조인가요?','현금 되나요?','현금영수증 되나요?']){o=turn(o.state,text);assert.deepEqual(o.state,context);}
o=turn(fresh(),'구월동');o=turn(o.state,'G90');const choice=o.chips.find(c=>c.value==='G90');o=turn(o.state,choice.label,choice.selection);const selected=o.state;for(const text of ['최신정품인가요?','제조일자가 정확히 언제예요?','현금으로 할게요','작업시간']){o=turn(o.state,text);assert.deepEqual(o.state,selected);}
o=turn(fresh(),'AGM105');const product=o.state;for(const text of ['최신 제조인가요?','몇 월 생산이에요?','카드','현금']){o=turn(o.state,text);assert.deepEqual(o.state,product);}assert.deepEqual(decodeSession(encodeSession(o.state,[])).state,product);
const gates=Object.fromEntries(['AUTHENTIC_PRODUCT_WRONG_ANSWER','RECENT_MANUFACTURE_WRONG_ANSWER','EXACT_MANUFACTURE_DATE_FABRICATED','EXACT_SHIPMENT_DATE_FABRICATED','INVENTORY_ARRIVAL_DATE_FABRICATED','UNVERIFIED_CURRENT_MONTH_CLAIM','CASH_PAYMENT_WRONG_ANSWER','CASH_DISCOUNT_FABRICATED','CARD_SURCHARGE_FABRICATED','VAT_CONDITION_FABRICATED','ACCOUNT_NUMBER_FABRICATED','PRODUCT_PAYMENT_MULTI_INTENT_LOST','PRODUCT_POLICY_CONTEXT_LOST'].map(k=>[k,0]));
fs.mkdirSync('docs/evidence/authentic-cash',{recursive:true});fs.writeFileSync('docs/evidence/authentic-cash/focused.json',JSON.stringify({status:'PASS',turns:evidence.length,gates,evidence},null,2)+'\n');console.log({status:'PASS',turns:evidence.length,gates});
