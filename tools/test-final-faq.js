import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {finalFaqIntent,finalFaqReply} from '../js/smart-consult-faq.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const policy=read('data/consult-service-policy.json'),catalog=read('data/battery-prices.json');
const rows=read('data/manufacturers.json').flatMap(m=>read(`data/${m.file}`).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const old=JSON.parse(execFileSync('git',['show','d43217e:data/consult-service-policy.json'],{encoding:'utf8'}));
assert.deepEqual({...policy,purchaseStage:undefined,purchaseKnowledge:undefined,operational:undefined,product:{...policy.product,assurance:undefined,comparisonContext:undefined},version:old.version,finalFaq:undefined},{...old,purchaseStage:undefined,purchaseKnowledge:undefined,operational:undefined,product:{...old.product,assurance:undefined,comparisonContext:undefined},finalFaq:undefined},'existing policy unchanged except authorized policy additions');
assert.deepEqual(policy.finalFaq.facts,{CARD_PAYMENT_AVAILABLE:true,CASH_PAYMENT_AVAILABLE:true,CASH_RECEIPT_AVAILABLE:true,TAX_INVOICE_AVAILABLE:true,BANK_TRANSFER_AVAILABLE:true,DIRECT_VISIT_AVAILABLE:true,VISIT_REQUIRES_PRECONFIRMATION:true,BATTERY_REPLACEMENT_TYPICAL_MINUTES_MIN:10,BATTERY_REPLACEMENT_TYPICAL_MINUTES_MAX:20,WORK_TIME_CAN_VARY:true});
const groups={
 CARD:['카드 되나요?','카드결제 가능해요?','신용카드 돼요?','체크카드 돼요?','카드로 계산할 수 있나요?','카드돼요?','카드 가능해요?'],
 CASH_RECEIPT:['현금영수증 되나요?','현금영수증 발행돼요?','현금영수증 해주시나요?','현금영수증도?','현금영수증은?'],
 TAX_INVOICE:['세금계산서 되나요?','세금계산서 발행 가능해요?','사업자인데 세금계산서 돼요?','세금계산서 가능해요?','세금계산서도 돼요?'],
 BANK_TRANSFER:['계좌이체 되나요?','이체 가능해요?','계좌로 보내도 돼요?'],
 PAYMENT_COMBINED:['결제는 뭐로 돼요?','결제수단 뭐 있어요?','카드나 계좌이체 돼요?','영수증이나 세금계산서 돼요?'],
 VISIT:['직접 가도 되나요?','방문해도 되나요?','매장 방문 가능해요?','출장 말고 제가 가도 되나요?','직접 방문해서 교체할 수 있나요?','방문구매 가능해요?','배터리 사러 가도 돼요?','방문하려고 하는데요','직접 방문해도 되나요?','그냥 제가 방문해도 돼요?'],
 VISIT_ADDRESS:['주소로 가면 되나요?','방문 주소 알려주세요'],
 VISIT_NOW:['지금 방문해도 돼요?','오늘 매장 방문 가능해요?'],
 WORK_TIME:['교체시간 얼마나 걸려요?','작업시간 얼마나 걸리나요?','배터리 교체 몇 분 걸려요?','장착하는데 얼마나 걸려요?','작업 오래 걸려요?','교체하는 데 시간 얼마나 걸려요?','10분이면 되나요?','20분 안에 끝나요?','20분 안에 무조건 끝나요?','작업시간은?','교체하는데 얼마나 걸려요?','출장 배터리 교체시간 얼마나 걸려요?'],
 DURATION_CLARIFY:['지금 가면 얼마나 걸려요?'],
 PAYMENT_CONFIRM:['카드 수수료 있나요?','현금 할인 되나요?','세금계산서 부가세 별도인가요?','계좌번호 알려주세요']
};
const transcripts=[];
const keys=['selectedVehicleKey','manufacturer','vehicleFamily','year','brand','quotedSpec','confirmedBattery','region','priceIntent','originalIntent'];
function turn(state,text){const out=conversationTurn(state,text,rows,areas,catalog,policy);transcripts.push({input:text,messages:out.messages,actions:out.actions,context:Object.fromEntries(keys.map(k=>[k,out.state[k]]))});return out;}
function assertCashReceiptReply(messages){
 const receipt=policy.finalFaq.answers.CASH_RECEIPT;
 const cash=policy.finalFaq.answers.CASH;
 assert.ok(Array.isArray(messages));
 assert.ok(messages.length===1||messages.length===2);
 assert.equal(messages[0],receipt);
 if(messages.length===2)assert.equal(messages[1],cash);
}
function assertTaxInvoiceReply(input,messages){
 const base=policy.finalFaq.answers.TAX_INVOICE;
 const condition='발행 명의와 세부 증빙 조건은 고객센터 1644-9141로 확인해 주세요.';
 const expected=/사업자/.test(input)?[base,condition]:[base];
 assert.deepEqual(messages,expected,input);
}
function assertCombinedPaymentReply(input,messages){
 const base=policy.finalFaq.answers.PAYMENT_COMBINED;
 const expected=/카드나계좌이체/.test(input.replaceAll(' ',''))
  ?[base,policy.finalFaq.answers.CARD,policy.finalFaq.answers.BANK_TRANSFER]
  :/영수증이나세금계산서/.test(input.replaceAll(' ',''))
   ?[base,policy.finalFaq.answers.CASH_RECEIPT,policy.finalFaq.answers.TAX_INVOICE]
   :[base];
 assert.deepEqual(messages,expected,input);
}
function assertPaymentConditionReply(input,messages){
 const base=policy.finalFaq.answers.PAYMENT_CONFIRM.replaceAll('{phone}','1644-9141');
 const extra=/^카드 수수료/.test(input)?policy.finalFaq.answers.CARD
  :/^현금 할인/.test(input)?policy.finalFaq.answers.CASH
   :/^세금계산서 부가세/.test(input)?policy.finalFaq.answers.TAX_INVOICE:null;
 assert.deepEqual(messages,extra?[base,extra]:[base],input);
}
assertCashReceiptReply([policy.finalFaq.answers.CASH_RECEIPT]);
assertCashReceiptReply([policy.finalFaq.answers.CASH_RECEIPT,policy.finalFaq.answers.CASH]);
assertTaxInvoiceReply('세금계산서 되나요?',[policy.finalFaq.answers.TAX_INVOICE]);
assertTaxInvoiceReply('사업자인데 세금계산서 돼요?',[policy.finalFaq.answers.TAX_INVOICE,'발행 명의와 세부 증빙 조건은 고객센터 1644-9141로 확인해 주세요.']);
assertCombinedPaymentReply('카드나 계좌이체 돼요?',[policy.finalFaq.answers.PAYMENT_COMBINED,policy.finalFaq.answers.CARD,policy.finalFaq.answers.BANK_TRANSFER]);
assertCombinedPaymentReply('영수증이나 세금계산서 돼요?',[policy.finalFaq.answers.PAYMENT_COMBINED,policy.finalFaq.answers.CASH_RECEIPT,policy.finalFaq.answers.TAX_INVOICE]);
assertPaymentConditionReply('카드 수수료 있나요?',[policy.finalFaq.answers.PAYMENT_CONFIRM.replaceAll('{phone}','1644-9141'),policy.finalFaq.answers.CARD]);
assertPaymentConditionReply('계좌번호 알려주세요',[policy.finalFaq.answers.PAYMENT_CONFIRM.replaceAll('{phone}','1644-9141')]);
for(const invalid of [
 [],['현금영수증 발행은 불가능합니다.'],['현금영수증은 카드 결제 시에만 발행됩니다.'],
 [policy.finalFaq.answers.CASH_RECEIPT,'현금 할인됩니다.'],
 [policy.finalFaq.answers.CASH_RECEIPT,'수수료가 추가됩니다.'],
 [policy.finalFaq.answers.CASH_RECEIPT,'암호화폐로 결제 가능합니다.'],
 ['정확한 내용은 1644-9141로 문의해 주세요.'],['차종과 연식을 알려주세요.']
])assert.throws(()=>assertCashReceiptReply(invalid));
for(const invalid of [[],['세금계산서 발행은 불가능합니다.'],[policy.finalFaq.answers.TAX_INVOICE,'부가세가 면제됩니다.'],['1644-9141로 문의해 주세요.']])assert.throws(()=>assertTaxInvoiceReply('세금계산서 되나요?',invalid));
for(const invalid of [[],[policy.finalFaq.answers.PAYMENT_COMBINED,'현금 할인됩니다.'],[policy.finalFaq.answers.PAYMENT_COMBINED,'카드 수수료가 없습니다.']])assert.throws(()=>assertCombinedPaymentReply('결제수단 뭐 있어요?',invalid));
for(const invalid of [[],['카드 수수료는 없습니다.'],[policy.finalFaq.answers.PAYMENT_CONFIRM.replaceAll('{phone}','1644-9141'),'카드 수수료는 없습니다.']])assert.throws(()=>assertPaymentConditionReply('카드 수수료 있나요?',invalid));
const contexts=[createConversationState(),turn(createConversationState(),'BMW 5시리즈 2020년식 배터리 얼마예요?').state,turn(createConversationState(),'구월동 BMW 5시리즈 2020년식 바르타 배터리 얼마예요?').state,turn(createConversationState(),'바르타 AGM95 얼마예요?').state];
for(const state of contexts)for(const [kind,inputs]of Object.entries(groups))for(const input of inputs){
 assert.equal(finalFaqIntent(input),kind,input);const out=turn(state,input);
 assert.deepEqual(out.state,kind==='WORK_TIME'&&/얼마나|몇\s*분/.test(input)?{...state,lastIntent:'OP_WORK_TIME'}:state,`context ${input}`);
 if(kind==='CASH_RECEIPT')assertCashReceiptReply(out.messages);
 else if(kind==='TAX_INVOICE')assertTaxInvoiceReply(input,out.messages);
 else if(kind==='PAYMENT_COMBINED')assertCombinedPaymentReply(input,out.messages);
 else if(kind==='PAYMENT_CONFIRM')assertPaymentConditionReply(input,out.messages);
 else assert.deepEqual(out.messages,[policy.finalFaq.answers[kind].replaceAll('{phone}','1644-9141').replace('{min}','10').replace('{max}','20')],input);
 if(kind==='WORK_TIME'){assert.match(out.messages[0],/보통 10~20분/);assert.match(out.messages[0],/차량과 작업 상황.*달라질/);assert.doesNotMatch(out.messages[0],/무조건|보장/);}
 if(/^VISIT|CONFIRM|CLARIFY/.test(kind))assert.ok(out.actions.includes('phone'));
 assert.doesNotMatch(out.messages.join(' '),/만원|수수료.*없|할인.*가능|부가세.*(?:포함|별도)/);
}
for(const input of ['언제 와요?','몇 분 뒤 도착해요?','오늘 몇 시에 와요?','10분 안에 도착해요?','출장시간 얼마나 걸려요?'])for(const state of contexts){
 const out=turn(state,input);assert.equal(finalFaqIntent(input),null);assert.ok(out.actions.includes('phone'));assert.ok(out.messages.join(' ').includes('실시간 확인'));assert.doesNotMatch(out.messages.join(' '),/10~20/);
}
for(const input of ['폐배터리 제가 가져가도 돼요?','기존 배터리 안 주면 얼마예요?','헌 배터리 제가 보관하고 싶어요','배터리 반납 안 하면요?','폐배터리 제가 가져가면요?','폐배터리 제가 갖고 있으면?'])for(const state of contexts){
 const out=turn(state,input);assert.deepEqual(out.messages,[policy.answers.KEEP_OLD_BATTERY]);assert.ok(out.actions.includes('phone'));assert.doesNotMatch(out.messages.join(' '),/\d+.*원/);for(const k of keys.filter(k=>!['priceIntent','originalIntent'].includes(k)))assert.deepEqual(out.state[k],state[k],`keep-old ${k}`);if(state.priceIntent)assert.equal(out.state.priceIntent,true);
}
for(const inputs of [
 ['BMW 5시리즈 2020년식 배터리 얼마예요?','카드돼요?','현금영수증은?','작업시간은?','AS는?','일요일도 하나요?'],
 ['구월동 BMW 5시리즈 2020년식 바르타 배터리 얼마예요?','세금계산서 돼요?','직접 방문해도 돼요?','폐배터리 제가 갖고 있으면?'],
 ['바르타 AGM95 얼마예요?','카드 가능해요?','세금계산서도 돼요?','출장비는?']
]){
 let out=turn(createConversationState(),inputs[0]);const start=out.state;
 for(const input of inputs.slice(1))out=turn(out.state,input);
 for(const k of keys)assert.deepEqual(out.state[k],start[k],`integrated ${k}`);
 const restored=decodeSession(encodeSession(out.state,[]));assert.ok(restored);assert.deepEqual(turn(restored.state,'작업시간은?').state,restored.state);
}
const runtime=fs.readFileSync('js/smart-consult-faq.js','utf8');for(const value of Object.values(policy.finalFaq.answers))assert.ok(!runtime.includes(value));
assert.deepEqual(finalFaqReply('작업시간은?',{finalFaq:{...policy.finalFaq,facts:{...policy.finalFaq.facts,BATTERY_REPLACEMENT_TYPICAL_MINUTES_MIN:31,BATTERY_REPLACEMENT_TYPICAL_MINUTES_MAX:42}}}).messages,['배터리 교체 작업은 보통 31~42분 정도 소요됩니다. 차량과 작업 상황에 따라 시간은 약간 달라질 수 있습니다.'],'runtime consumes source');
const gates=Object.fromEntries(['PAYMENT_WRONG_ANSWER','PAYMENT_UNSUPPORTED_CLAIM','VISIT_WRONG_ANSWER','VISIT_STATIC_TIME_FABRICATION','OLD_BATTERY_SURCHARGE_FABRICATED','WORKTIME_WRONG_RANGE','WORKTIME_GUARANTEE_CLAIM','WORKTIME_ARRIVAL_CONFUSION','FAQ_CONTEXT_LOST','PAYMENT_POLICY_TRUTH_DUPLICATION','VISIT_POLICY_TRUTH_DUPLICATION','WORKTIME_POLICY_TRUTH_DUPLICATION'].map(k=>[k,0]));
fs.mkdirSync('docs/evidence/final-faq',{recursive:true});fs.writeFileSync('docs/evidence/final-faq/faq.json',JSON.stringify({status:'PASS',turns:transcripts.length,groups,gates,transcripts},null,2)+'\n');console.log({status:'PASS',turns:transcripts.length,gates});
