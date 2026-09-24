import fs from 'node:fs';import os from 'node:os';import assert from 'node:assert/strict';
import {conversationTurn,createConversationState,extractEntities} from '../js/smart-consult-conversation.js';
import {batteryKnowledgePlan,batteryKnowledgeCopy} from '../js/smart-consult-battery-knowledge.js';
import {buildAliasIndex} from '../js/vehicle-aliases.js';
import {batteryAliasLedger,catalogSpecMention} from '../js/smart-consult-prices.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
import {coldQuestions,coldControls,coldCombined,coldFlows} from './lib/cold-weather-fixtures.js';
const j=p=>JSON.parse(fs.readFileSync(p)),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,catalog=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json');
const names=['COLD_WEATHER_KNOWLEDGE_WRONG_INTENT','COLD_WEATHER_GENERIC_SYMPTOM_FALLBACK','COLD_WEATHER_SINGLE_CAUSE_OVERCLAIM','COLD_WEATHER_TEMPERATURE_THRESHOLD_FABRICATED','COLD_WEATHER_REPLACEMENT_OVERCLAIM','COLD_WEATHER_CCA_VALUE_FABRICATED','COLD_WEATHER_CONTEXT_LOST','COLD_WEATHER_MULTI_INTENT_LOST','COLD_WEATHER_FALSE_VEHICLE_MATCH','COLD_WEATHER_FALSE_AREA_MATCH','COLD_WEATHER_FALSE_SPEC_MATCH','COLD_WEATHER_FALSE_POSITIVE_NO_BATTERY_CONTEXT','SCHEDULE_INTENT_LOST_BY_COLD_WEATHER','PRICE_INTENT_LOST_BY_COLD_WEATHER','VEHICLE_INTENT_LOST_BY_COLD_WEATHER'];
const gates=Object.fromEntries(names.map(n=>[n,0])),checks={...gates},evidence=[];
function check(name,ok,label){checks[name]++;if(!ok){gates[name]++;console.error(name,label);}}
function turn(q,state=createConversationState(),cold=false){
 const o=conversationTurn(state,q,rows,areas,catalog,policy),s=o.messages.join(' ');evidence.push({q,messages:o.messages,state:o.state});
 check('COLD_WEATHER_CONTEXT_LOST',JSON.stringify(decodeSession(encodeSession(o.state,[]))?.state)===JSON.stringify(o.state),q);
 if(cold){check('COLD_WEATHER_KNOWLEDGE_WRONG_INTENT',o.messages.includes(batteryKnowledgeCopy.cold),q);check('COLD_WEATHER_GENERIC_SYMPTOM_FALLBACK',!/원인은 여기서 진단하지 않고|차량명부터 알려주세요/.test(s),q);check('COLD_WEATHER_SINGLE_CAUSE_OVERCLAIM',s.includes('추위만이 원인이라고 단정할 수 없'),q);}
 check('COLD_WEATHER_TEMPERATURE_THRESHOLD_FABRICATED',!/(?:영하|온도|기온).{0,8}\d|\d+\s*(?:도|°C|볼트|V\b)|SOH\s*\d|발전기.*(?:정상입니다|고장입니다)|\b[PBCU]\d{4}\b/i.test(s),q);
 check('COLD_WEATHER_REPLACEMENT_OVERCLAIM',!/(?:반드시|무조건)\s*(?:배터리를?\s*)?교체|배터리(?:가|는)\s*(?:불량|고장)입니다/.test(s),q);
 check('COLD_WEATHER_CCA_VALUE_FABRICATED',!/\d+\s*(?:CCA|씨씨에이)|CCA\s*(?:값은?|수치는?)?\s*\d/i.test(s),q);
 return o;
}
const variants=q=>[q,q.replace(/\s/g,''),'혹시 '+q,q.replace(/[?？]$/,'')];
for(const q of coldQuestions)for(const v of variants(q)){const o=turn(v,undefined,true);assert.equal(o.state.confirmedBattery,null);assert.equal(o.state.selectedVehicleKey,'');}
const weather=['추워서','추우면','추울 때','추운 날','추위 때문에','겨울에','겨울철에','영하에서','한파에','기온이 낮으면','온도가 낮으면'];
const subjects=['방전 잘돼요?','재방전되나요?','시동이 약해요','시동이 안 걸려요','배터리가 약해요','CCA가 중요한가요?'];
for(const w of weather)for(const subject of subjects)for(const q of variants(w+' '+subject))turn(q,undefined,true);
for(const degree of [0,10,40,60,70,80,95,105]){const o=turn(`영하 ${degree}도면 방전돼요?`,undefined,true);assert.ok(o.messages.includes(batteryKnowledgeCopy.coldThreshold));check('COLD_WEATHER_FALSE_SPEC_MATCH',!o.state.quotedSpec,String(degree));check('COLD_WEATHER_FALSE_VEHICLE_MATCH',!o.state.selectedVehicleKey,String(degree));}
for(const spec of Object.keys(catalog.prices)){const o=turn(`추우면 방전 잘돼요? ${spec}도 가격 알려줘`,undefined,true);check('PRICE_INTENT_LOST_BY_COLD_WEATHER',o.state.quotedSpec===spec&&o.state.priceIntent&&o.messages.some(s=>s.includes('교체 가격')),spec+' Korean particle is not temperature');}
for(const q of coldControls){const o=turn(q),s=o.messages.join(' ');check('COLD_WEATHER_FALSE_POSITIVE_NO_BATTERY_CONTEXT',!o.messages.includes(batteryKnowledgeCopy.cold),q);
 if(/예약|가능/.test(q))check('SCHEDULE_INTENT_LOST_BY_COLD_WEATHER',/1644-9141/.test(s)&&/확인|확정하지/.test(s),q);
 if(q.includes('AGM70'))check('PRICE_INTENT_LOST_BY_COLD_WEATHER',/AGM70.*17만원/.test(s)&&o.state.quotedSpec==='AGM70',q);
 if(q.includes('BMW')){check('PRICE_INTENT_LOST_BY_COLD_WEATHER',o.state.priceIntent,q);check('VEHICLE_INTENT_LOST_BY_COLD_WEATHER',o.state.vehicleFamily==='5시리즈'||Boolean(o.state.pendingVehicleConfirmation),q);}
 if(q==='겨울동')check('COLD_WEATHER_FALSE_AREA_MATCH',!o.region&&!o.state.region,q);
}
for(const q of ['겨울','영하','한파','추위','추워요','날씨가 추워요','겨울옷 예뻐요','한파 뉴스 알려줘']){const o=turn(q);check('COLD_WEATHER_FALSE_POSITIVE_NO_BATTERY_CONTEXT',!batteryKnowledgePlan(q,createConversationState())&&!o.messages.includes(batteryKnowledgeCopy.cold),q);}
for(const q of coldCombined){const o=turn(q,undefined,true),s=o.messages.join(' ');let ok=true;
 if(q.includes('오늘')){ok=o.actions.includes('phone')&&s.includes(policy.operational.REALTIME.replaceAll('{phone}','1644-9141'));check('SCHEDULE_INTENT_LOST_BY_COLD_WEATHER',ok,q);}
 if(q.includes('AGM105')){ok=/AGM105.*28만원/.test(s)&&o.state.priceIntent;check('PRICE_INTENT_LOST_BY_COLD_WEATHER',ok,q);}
 if(q.includes('갈아야'))ok=s.includes(batteryKnowledgeCopy.condition);
 if(q.includes('BMW')){ok=o.state.vehicleFamily==='5시리즈'&&o.chips.length>1&&o.state.priceIntent;check('VEHICLE_INTENT_LOST_BY_COLD_WEATHER',ok,q);check('PRICE_INTENT_LOST_BY_COLD_WEATHER',o.state.priceIntent,q);}
 if(q.includes('블랙박스'))ok=s.includes(batteryKnowledgeCopy.discharge);
 check('COLD_WEATHER_MULTI_INTENT_LOST',ok,q);
}
for(let i=0;i<coldFlows.length;i++){let state=createConversationState();for(const q of coldFlows[i]){const before=state,o=turn(q,state);state=o.state;
 if(before.selectedVehicleKey||before.quotedSpec)check('COLD_WEATHER_CONTEXT_LOST',['selectedVehicleKey','confirmedBattery','quotedSpec','year','brand','priceIntent'].every(k=>state[k]===before[k]),q);
 if(q==='겨울이라 그런가요?')assert.ok(o.messages.includes(batteryKnowledgeCopy.cold));
 if(i===1)assert.ok(o.messages.includes(batteryKnowledgeCopy.cca));
 if(q==='추운 날에도 가능한가요?')check('SCHEDULE_INTENT_LOST_BY_COLD_WEATHER',o.actions.includes('phone')&&/실시간|확인/.test(o.messages.join(' '))&&!o.messages.includes(batteryKnowledgeCopy.cold),q);
 }}
// A vehicle/area/product context must survive the entire cold-weather family.
let context=turn('구월동 BMW 5시리즈 2020년식 바르타 배터리 가격').state;
for(const q of coldQuestions){const o=turn(q,context,true);check('COLD_WEATHER_CONTEXT_LOST',['selectedVehicleKey','confirmedBattery','quotedSpec','year','brand','priceIntent','region'].every(k=>JSON.stringify(o.state[k])===JSON.stringify(context[k])),q);}
const aliasIndex=buildAliasIndex(rows),specs=new Set([...Object.keys(catalog.prices),...batteryAliasLedger(catalog).keys()]);
const lexemes=['추위','추워','추우면','추울','겨울','겨울철','영하','한파','기온','온도'];
const compact=s=>String(s).normalize('NFKC').replace(/\s/g,'').toLowerCase();
for(const word of lexemes){const e=extractEntities(word,rows,createConversationState(),areas);
 check('COLD_WEATHER_FALSE_VEHICLE_MATCH',e.matches.length===0,word);check('COLD_WEATHER_FALSE_AREA_MATCH',!e.region&&!e.ambiguousRegion,word);check('COLD_WEATHER_FALSE_SPEC_MATCH',!catalogSpecMention(word,catalog),word);
 for(const r of rows)check('COLD_WEATHER_FALSE_VEHICLE_MATCH',![r.vehicle,r.detailModel].some(s=>compact(s).includes(word)),word);
 for(const a of aliasIndex.entries)check('COLD_WEATHER_FALSE_VEHICLE_MATCH',!a.alias.includes(word),word);
 for(const a of areas)check('COLD_WEATHER_FALSE_AREA_MATCH',![a.name,a.fullName,a.fullLabel].some(s=>compact(s).includes(word)),word);
 for(const s of specs)check('COLD_WEATHER_FALSE_SPEC_MATCH',!compact(s).includes(word),word);
}
assert.equal(rows.length,917);assert.equal(areas.length,665);
const inventory={rows:rows.length,vehicleAliasEntries:aliasIndex.entries.length,uniqueVehicleAliases:aliasIndex.map.size,areas:areas.length,productSpecAliases:specs.size,weatherLexemes:lexemes.length};
fs.writeFileSync(os.tmpdir()+'/cold-weather-focused.json',JSON.stringify({turns:evidence.length,inventory,gates,checks,evidence},null,2));
console.log({turns:evidence.length,inventory,gates,checks});for(const k of names){assert.ok(checks[k]>0,k+' untested');assert.equal(gates[k],0,k);}
