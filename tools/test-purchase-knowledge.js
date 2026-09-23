import fs from 'node:fs';import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json'),rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=read('seo-data/smart-consult-location-index.json').localities;
export const families={
 purchase:['그걸로 해주세요','델코로 할게요','바르타로 할게요','그럼 이걸로 할게요','교체할게요','이걸로 교체할래요','신청할게요','진행할게요','이걸로 하죠'],
 summary:['지금까지 뭐였죠?','상담내용 정리해줘','내 차 배터리랑 가격 다시 알려줘','지금 선택한 거 뭐예요?','내가 뭐로 한다고 했죠?','전화할 때 뭐라고 하면 돼요?'],
 contact:['전화번호 뭐예요?','연락처 알려줘','어디로 전화해요?','상담번호는?','전화할게요','어떻게 신청해요?'],
 change:['예약 변경하고 싶어요','시간 바꾸고 싶어요','기사님 오기로 했는데 변경돼요?'],
 cancel:['예약 취소할게요','취소하려고요','예약 취소하려고요'],
 guidance:['전화하면 뭐라고 말하면 돼요?','접수할 때 뭐 말해요?','뭐 준비해야 돼요?'],
 agm:['AGM이 뭐예요?','AGM 배터리가 뭐예요?','AGM은 일반 배터리랑 뭐가 달라요?','AGM이 왜 비싸요?','AGM이 좋은 건가요?','AGM 수명은 더 길어요?'],
 efb:['EFB가 뭐예요?','EFB랑 AGM 차이가 뭐예요?','일반 배터리랑 EFB 차이는?'],
 fit:['AGM 꼭 써야 돼요?','일반 배터리로 바꾸면 안 돼요?','EFB 차량에 AGM 넣어도 돼요?','AGM 대신 EFB 넣어도 돼요?','AGM70인데 AGM80 넣어도 돼요?','AGM95 대신 AGM105 가능해요?','용량 큰 거 넣어도 돼요?','싼 걸로 낮춰도 돼요?','일반 배터리로 바꿔도 돼요?','AGM 꼭 써야 하나요?'],
 reported:['지금 AGM95 달려있어요','현재 배터리가 AGM80이에요','델코 AGM95가 달려있어요','DIN74L 쓰고 있어요','배터리에 AGM105라고 써있어요'],
 symptom:['계기판 불이 약해요','시동이 힘없이 걸려요','시동이 늦게 걸려요','블랙박스 때문에 방전된 것 같아요','며칠 세워뒀더니 안 걸려요','배터리 경고등 떴어요','전압이 낮다고 떠요','ISG가 안돼요','스탑앤고가 안돼요']};
const before=process.argv.includes('--before'),evidence=[],failures=[],totals=Object.fromEntries(['PASS_EXISTING','WRONG_INTENT','CONTEXT_LOST','FALSE_ORDER_COMPLETION','SUMMARY_HALLUCINATION','PRODUCT_KNOWLEDGE_MISSING','TECHNICAL_OVERCLAIM','FITMENT_OVERCLAIM','OTHER'].map(k=>[k,0]));
const names=['FALSE_ORDER_COMPLETION','FALSE_RESERVATION_CHANGE','FALSE_RESERVATION_CANCEL','SUMMARY_HALLUCINATION','CONTACT_NUMBER_WRONG','PRODUCT_KNOWLEDGE_TECHNICAL_OVERCLAIM','UNSUPPORTED_PRODUCT_SUPERIORITY','UNSUPPORTED_LIFESPAN_CLAIM','UNAUTHORIZED_UPGRADE_CONFIRMATION','UNAUTHORIZED_DOWNGRADE_CONFIRMATION','UNAUTHORIZED_AGM_EFB_SUBSTITUTION','UNAUTHORIZED_GENERAL_BATTERY_SUBSTITUTION','CUSTOMER_REPORTED_SPEC_FALSE_COMPATIBILITY','SYMPTOM_DIAGNOSIS_OVERCLAIM','PRODUCT_MULTI_INTENT_LOST','PURCHASE_CONTEXT_LOST'];
const gates=Object.fromEntries(names.map(n=>[n,0])),checks=Object.fromEntries(names.map(n=>[n,0]));
const check=(name,ok,input)=>{checks[name]++;if(!ok){gates[name]++;failures.push({name,input});}};
const turn=(q,state=createConversationState(),selection=null)=>{const o=conversationTurn(state,q,rows,areas,catalog,policy,selection);evidence.push({input:q,messages:o.messages,state:o.state,chips:o.chips});if(!before)assert.deepEqual(decodeSession(encodeSession(o.state,[])).state,o.state);return o;};
const confirmed=turn('BMW 5시리즈 2020년식').state;
for(const [family,phrases] of Object.entries(families))for(const q of phrases)for(const input of [q,q.replaceAll(' ',''),'혹시 '+q]){
 const o=turn(input,['purchase','summary','guidance','change','cancel'].includes(family)?confirmed:undefined),s=o.messages.join(' ');
 let ok=true,category='WRONG_INTENT';
 if(['purchase','contact','change','cancel','guidance'].includes(family))ok=/1644-9141/.test(s)&&o.actions.includes('phone');
 if(['purchase','summary','guidance'].includes(family)){ok=ok&&/5시리즈/.test(s)&&/AGM95/.test(s)&&/(?:22|27)만원/.test(s);check('SUMMARY_HALLUCINATION',!/AGM105|33만원|2019/.test(s),input);check('PURCHASE_CONTEXT_LOST',o.state.selectedVehicleKey===confirmed.selectedVehicleKey&&o.state.year===2020,input);}
 if(family==='agm'){ok=/유리|수명.*환경|구조/.test(s);category='PRODUCT_KNOWLEDGE_MISSING';}
 if(family==='efb'){ok=/액식/.test(s)&&/EFB/i.test(s);category='PRODUCT_KNOWLEDGE_MISSING';}
 if(family==='fit'){ok=/확인|차종|차량명/.test(s)&&!/가능합니다|넣어도 됩니다/.test(s);category='FITMENT_OVERCLAIM';for(const gate of names.filter(x=>x.startsWith('UNAUTHORIZED_')))check(gate,ok,input);}
 if(family==='reported'){ok=/고객님.*알려|말씀.*장착/.test(s)&&!o.state.confirmedBattery;category='FITMENT_OVERCLAIM';check('CUSTOMER_REPORTED_SPEC_FALSE_COMPATIBILITY',!o.state.confirmedBattery,input);}
 if(family==='symptom'){ok=/확정|단정|다른 원인|확인/.test(s)&&!/배터리 교체가 필요합니다/.test(s);category='PRODUCT_KNOWLEDGE_MISSING';check('SYMPTOM_DIAGNOSIS_OVERCLAIM',ok,input);}
 check('FALSE_ORDER_COMPLETION',!/접수(?:가)? 완료|주문(?:이)? 완료|예약(?:이)? 완료/.test(s),input);
 check('FALSE_RESERVATION_CHANGE',!/예약.*변경했|시간.*바꿨/.test(s),input);check('FALSE_RESERVATION_CANCEL',!/취소(?:가)? 완료|취소했/.test(s),input);
 if(['contact','change','cancel','purchase','guidance'].includes(family))check('CONTACT_NUMBER_WRONG',/1644-9141/.test(s),input);
 for(const gate of ['PRODUCT_KNOWLEDGE_TECHNICAL_OVERCLAIM','UNSUPPORTED_PRODUCT_SUPERIORITY','UNSUPPORTED_LIFESPAN_CLAIM'])check(gate,!/\d+%|\d+배|무조건.*오래(?:갑니다|가요)|수명은 \d+년|마진.*때문/.test(s),input);
 totals[ok?'PASS_EXISTING':category]++;if(!ok)failures.push({family,input,messages:o.messages});
}
let o=turn('BMW 5시리즈 2020년식');for(const q of ['가격은?','바르타는?','델코로 할게요','상담내용 정리해줘','전화번호 알려줘'])o=turn(q,o.state);check('PURCHASE_CONTEXT_LOST',o.state.brand!=='VARTA'&&o.state.confirmedBattery==='AGM95','flow A');
o=turn('G90');const choice=o.chips.find(c=>c.label.includes('2018'));o=turn(choice.label,o.state,choice.selection);for(const q of ['이걸로 교체할게요','전화하면 뭐라고 말하면 돼요?'])o=turn(q,o.state);check('PURCHASE_CONTEXT_LOST',o.state.confirmedBattery==='AGM105'&&o.messages.join(' ').includes('28만원'),'flow B');
o=turn('AGM105는 얼마인가요?');for(const q of ['바르타는?','바르타로 할게요','예약 변경하고 싶어요'])o=turn(q,o.state);check('PURCHASE_CONTEXT_LOST',o.state.brand==='VARTA'&&o.state.quotedSpec==='AGM105','flow C');
o=turn('지금 AGM95 달려있어요');o=turn('얼마예요?',o.state);check('PRODUCT_MULTI_INTENT_LOST',/22만원/.test(o.messages.join(' ')),'flow D price');o=turn('제 차에 맞는 거죠?',o.state);check('CUSTOMER_REPORTED_SPEC_FALSE_COMPATIBILITY',!o.state.confirmedBattery&&/확인/.test(o.messages.join(' '))&&!/맞습니다|맞아요/.test(o.messages.join(' ')),'flow D fit');
for(const q of ['AGM이 뭐예요? 현금돼요?','EFB가 뭐예요? 카드돼요?']){o=turn(q);check('PRODUCT_MULTI_INTENT_LOST',/가능합니다/.test(o.messages.join(' '))&&/유리|액식/.test(o.messages.join(' ')),q);}
if(!before){
 o=turn('지금 AGM105 달려있어요');o=turn('BMW 5시리즈 2020년식',o.state);o=turn('가격은?',o.state);assert.match(o.messages.join(' '),/AGM95.*22만원/);assert.equal(o.state.customerReportedSpec,'');
 o=turn('지금 AGM105 달려있어요');o=turn('BMW 5시리즈 2020년식 AGM이 뭐예요?',o.state);o=turn('가격은?',o.state);assert.match(o.messages.join(' '),/AGM95.*22만원/);assert.equal(o.state.customerReportedSpec,'');
 o=turn('지금 AGM999 달려있어요');o=turn('얼마예요?',o.state);assert.ok(!/\d+만/.test(o.messages.join(' ')));assert.equal(o.state.confirmedBattery,null);
 o=turn('상담내용 정리해줘');assert.ok(!/\d+만|AGM\d/.test(o.messages.join(' ')));
 o=turn('미니 쿠퍼 2020년식');o=turn('그걸로 해주세요',o.state);assert.equal(o.state.confirmedBattery,null);assert.match(o.messages.join(' '),/17만원[\s\S]*19만원[\s\S]*현장/);
 assert.equal(decodeSession(encodeSession({...createConversationState(),customerReportedSpec:'<script>alert(1)</script>'},[])),null);
 const old=createConversationState();delete old.customerReportedSpec;assert.equal(decodeSession(encodeSession(old,[])).state.customerReportedSpec,'');
 o=turn('AGM60 가격');o=turn('바르타로 할게요',o.state);assert.match(o.messages.join(' '),/지원 규격이 아닙니다/);assert.ok(!/바르타 기준 교체 가격은/.test(o.messages.join(' ')));
 o=turn('구월동 BMW 5시리즈 2020년식');const region=o.state.region;o=turn('델코로 할게요',o.state);assert.deepEqual(o.state.region,region);assert.match(o.messages.join(' '),/구월동/);
}
const result={phase:before?'before':'after',turns:evidence.length,totals,gates,checks,failures,evidence};const dir='C:/Users/kang1/AppData/Local/Temp/ildeung-purchase';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/'+result.phase+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,evidence:undefined,failures:failures.slice(0,12)},null,2));if(!before){assert.equal(failures.length,0);for(const n of names)assert.ok(checks[n]>0,n);}
