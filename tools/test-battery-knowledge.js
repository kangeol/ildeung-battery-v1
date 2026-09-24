import fs from 'node:fs';import os from 'node:os';import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession,safeUserMessage} from '../js/smart-consult-session.js';
import {knowledgeQuestions,knowledgeFlows} from './lib/battery-knowledge-fixtures.js';
const j=p=>JSON.parse(fs.readFileSync(p)),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,catalog=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json');
const names=['BATTERY_REPLACEMENT_DIAGNOSIS_OVERCLAIM','FIXED_LIFESPAN_CLAIM','DISCHARGE_SINGLE_CAUSE_OVERCLAIM','NEW_BATTERY_DISCHARGE_FALSE_IMPOSSIBLE','VOLTAGE_FABRICATED','CCA_VALUE_FABRICATED','ALTERNATOR_RESULT_FABRICATED','FAULT_CODE_FABRICATED','CCA_HIGHER_ALWAYS_BETTER','AH_RUNTIME_GUARANTEE','CAPACITY_BIGGER_ALWAYS_BETTER','UNAUTHORIZED_UPGRADE_CONFIRMATION','UNAUTHORIZED_DOWNGRADE_CONFIRMATION','CODING_ALL_VEHICLES_CLAIM','CODING_BRAND_WIDE_CLAIM','CODING_REQUIREMENT_FABRICATED','CODING_FEE_WRONG','KNOWLEDGE_SESSION_CONTEXT_LOST','KNOWLEDGE_MULTI_INTENT_LOST'];
const gates=Object.fromEntries(names.map(k=>[k,0])),checks=Object.fromEntries(names.map(k=>[k,0])),evidence=[];
function check(k,ok,q){checks[k]++;if(!ok){gates[k]++;console.error(k,q);}}
function turn(q,state=createConversationState()){const o=conversationTurn(state,q,rows,areas,catalog,policy),s=o.messages.join(' ');evidence.push({q,messages:o.messages,state:o.state});check('KNOWLEDGE_SESSION_CONTEXT_LOST',JSON.stringify(decodeSession(encodeSession(o.state,[]))?.state)===JSON.stringify(o.state),q);
 for(const [key,re] of Object.entries({VOLTAGE_FABRICATED:/\d+(?:\.\d+)?\s*(?:볼트|V\b)/i,CCA_VALUE_FABRICATED:/\d+\s*(?:CCA|씨씨에이)/i,ALTERNATOR_RESULT_FABRICATED:/(?:발전기|알터네이터).*(?:정상입니다|고장입니다)/,FAULT_CODE_FABRICATED:/\b[PBCU]\d{4}\b/,FIXED_LIFESPAN_CLAIM:/\d+년마다.*교체|수명은\s*\d+년/,BATTERY_REPLACEMENT_DIAGNOSIS_OVERCLAIM:/배터리(?:가|는)\s*(?:고장입니다|불량입니다)|반드시 교체하세요/,DISCHARGE_SINGLE_CAUSE_OVERCLAIM:/블랙박스 때문입니다|방전 원인은 .*입니다/,NEW_BATTERY_DISCHARGE_FALSE_IMPOSSIBLE:/새 배터리는 방전되지 않습니다/,CCA_HIGHER_ALWAYS_BETTER:/높을수록 (?:무조건 )?좋습니다/,AH_RUNTIME_GUARANTEE:/\d+시간.*(?:보장|사용할 수 있습니다)/,CAPACITY_BIGGER_ALWAYS_BETTER:/클수록 (?:무조건 )?좋습니다/,CODING_ALL_VEHICLES_CLAIM:/모든 차량.*(?:필수입니다|해야 합니다)/,CODING_BRAND_WIDE_CLAIM:/(?:BMW|벤츠|아우디)는 (?:모두|반드시)/,CODING_REQUIREMENT_FABRICATED:/고객님 차량은 코딩이 (?:필수|필요합니다)/}))check(key,!re.test(s),q);
 return o;}
for(const [family,qs] of Object.entries(knowledgeQuestions))for(const q of qs)for(const input of [q,q.replaceAll(' ',''),'혹시 '+q]){
 const o=turn(input),s=o.messages.join(' ');if(['벤츠는?','아우디는?'].includes(q))continue;
 if(family==='condition')assert.match(s,/단정|판단할 수는 없/);
 if(family==='discharge'){assert.match(s,/방전|시동 성능/);assert.doesNotMatch(s,/중국산 블랙/);}
 if(family==='cca'){assert.match(s,/CCA|Cold Cranking Amps/);assert.equal(o.state.confirmedBattery,null);assert.equal(o.state.selectedVehicleKey,'');}
 if(family==='capacity'){assert.match(s,/용량|Ah/);assert.equal(o.state.confirmedBattery,null);}
 if(family==='coding')check('CODING_FEE_WRONG',s.includes(policy.answers.CODING),input);
}
for(const q of ['씨씨에이가 뭐예요?','cca가 뭐야?','AH가 뭐야?','암페어아워가 뭐예요?','배터리등록이 뭐예요?','배터리 리셋이 뭐예요?','갈아야?','바꿔야?','AGM95 대신 AGM105?','AGM105 대신 AGM95?']){const o=turn(q);assert.match(o.state.lastIntent,/KNOWLEDGE_/);if(q.includes('대신')){for(const k of ['UNAUTHORIZED_UPGRADE_CONFIRMATION','UNAUTHORIZED_DOWNGRADE_CONFIRMATION'])check(k,!o.state.confirmedBattery&&o.messages.join(' ').includes('호환성을 확정할 수 없습니다'),q);}}
for(const flow of knowledgeFlows){let s=createConversationState();for(const q of flow){const before=s,o=turn(q,s);s=o.state;if(before.selectedVehicleKey&&q.includes('코딩')||q==='제 차도?')check('KNOWLEDGE_SESSION_CONTEXT_LOST',s.selectedVehicleKey===before.selectedVehicleKey&&s.year===before.year,q);}}
for(const brand of ['BMW','벤츠','아우디'])for(const q of [brand+' 코딩 필요한가요?',brand+' 코딩이 뭐예요?']){const o=turn(q);assert.match(o.messages.join(' '),/브랜드만으로/);}
for(const q of ['코딩만 비용 얼마예요?','코딩만 해주나요?']){const o=turn(q);assert.match(o.messages.join(' '),/별도로.*확인/);assert.ok(o.actions.includes('phone'));}
for(const q of ['CCA가 뭐예요? 현금 되나요?','Ah가 뭐예요? 카드 되나요?','AGM95에서 95가 용량이에요? 가격도 알려줘']){const o=turn(q),s=o.messages.join(' ');check('KNOWLEDGE_MULTI_INTENT_LOST',/현금결제 가능합니다|카드결제 가능합니다|22만원/.test(s)&&/CCA|Ah/.test(s),q);}
let s=turn('구월동 BMW 5시리즈 2020년식 바르타 배터리 가격').state;for(const q of ['코딩이 뭐예요?','제 차도?','코딩비?','CCA가 뭐예요?','높으면?','제 차는 몇?']){const o=turn(q,s);check('KNOWLEDGE_SESSION_CONTEXT_LOST',o.state.region?.canonicalId===s.region?.canonicalId&&o.state.year===s.year&&o.state.brand===s.brand&&o.state.confirmedBattery===s.confirmedBattery,q);s=o.state;}
const reset=turn('처음부터',s);assert.equal(reset.state.lastIntent,'UNKNOWN');
assert.equal(safeUserMessage('CCA가 뭐예요?',createConversationState(),rows,areas),'배터리 상태·규격·코딩 정보 문의');
for(const spec of Object.keys(catalog.prices))for(const q of [spec+' CCA 높으면 좋은가요?',spec+' Ah가 뭐예요?',spec+' 코딩 필요한가요?']){const o=turn(q);assert.equal(o.state.confirmedBattery,null);assert.equal(o.state.selectedVehicleKey,'');assert.equal(o.state.quotedSpec,spec);}
for(const [q,patterns] of [['왜 방전돼요? 갈아야 하나요?',['교체','여러 요인']],['CCA랑 Ah가 뭐예요?',['Cold Cranking Amps','암페어아워']],['코딩이 뭐고 비용도 포함인가요?',['등록','별도 코딩비']]]){const o=turn(q);check('KNOWLEDGE_MULTI_INTENT_LOST',patterns.every(p=>o.messages.join(' ').includes(p)),q);}
assert.equal(rows.length,917);assert.equal(areas.length,665);for(const k of names){assert.ok(checks[k]>0,k+' untested');assert.equal(gates[k],0,k);}
fs.writeFileSync(os.tmpdir()+'/battery-knowledge-focused.json',JSON.stringify({count:evidence.length,gates,checks,evidence},null,2));console.log({status:'PASS',count:evidence.length,gates,checks});
