import assert from 'node:assert/strict';
import fs from 'node:fs';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const turn=(state,text)=>conversationTurn(state,text,records,[],prices,policy);
const fresh=()=>createConversationState();
const questions=['신품입니까','신품인가요','새거인가요','새 제품인가요','새제품 맞나요','배터리 새거죠','밧데리 신품인가요','정품인가요','정품 맞나요','새 정품인가요','델코 정품인가요','바르타 정품인가요','중고인가요','중고 배터리 쓰나요','재생 배터리인가요','재생품 쓰나요','리퍼인가요','리퍼 제품인가요','중고나 재생도 쓰나요','중고 아니죠','재생 아니죠','리퍼 아니죠','새 제품만 쓰나요','중고 말고 신품인가요','밧데리는신품입니까','중고나 재생 배터리는 아니죠?','리퍼 말고 새거죠?','새 정품만 쓰나요?','폭스바겐 1.6tdi 2013년식 신품입니까'];
let conditions=0,contexts=0;
for(const q of questions)for(const text of [q,q.replace(/\s/g,'')]){
  const out=turn(fresh(),text);
  assert.ok(out.messages.includes(policy.operational.NEW_PRODUCT),text+': '+out.messages);
  assert.doesNotMatch(out.messages.join(' '),/차량명부터|어떤 차종|차량마다 배터리/);
  conditions++;
}
for(const vehicle of ['폭스바겐 폴로 2013년식 1.6 TDI','BMW F10 2014','현대 아반떼 2020']){
  const initial=turn(fresh(),vehicle);
  assert.ok(initial.state.selectedVehicleKey,vehicle);
  for(const q of ['신품입니까','정품인가요','재생 아니죠']){
    const out=turn(initial.state,q);
    assert.ok(out.messages.includes(policy.operational.NEW_PRODUCT));
    for(const key of ['selectedVehicleKey','year','fuel','result','confirmedBattery','priceReference'])assert.deepEqual(out.state[key],initial.state[key],vehicle+' '+key);
    assert.deepEqual(turn(out.state,'가격은요').messages,turn(initial.state,'가격은요').messages);
    contexts++;
  }
}
for(const q of ['제조일자 최신인가요','제조일자가 최근인가요'])assert.match(turn(fresh(),q).messages.join(' '),/최신 제조일자/);
const exact=turn(fresh(),'몇월 생산인가요');assert.ok(exact.actions.includes('phone'));assert.match(exact.messages.join(' '),/1644-9141/);
const mixed=turn(fresh(),'신품이고 제조일자 최신인가요');assert.ok(mixed.messages.includes(policy.operational.NEW_PRODUCT));assert.match(mixed.messages.join(' '),/최신 제조일자/);
for(const q of ['배터리 규격','밧데리 규격','새 배터리 다른 차에 옮겨 쓸수 있나요'])assert.ok(!turn(fresh(),q).messages.includes(policy.operational.NEW_PRODUCT),q);
console.log({status:'PASS',conditions,contexts,manufacturingDate:4,negative:3});
