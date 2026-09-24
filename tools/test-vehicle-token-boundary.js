import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {vehicleAliasOccurs,searchVehicles,MANUFACTURER_ALIASES,FAMILY_ALIASES} from '../js/smart-consult-core.js';
import {buildAliasIndex,resolveVehicleText} from '../js/vehicle-aliases.js';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=read('seo-data/smart-consult-location-index.json').localities,catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const index=buildAliasIndex(records),evidence=[],failures=[],counts={positive:0,negativeBoundary:0,negativeMatcher:0,knowledge:0,session:0};
const check=(ok,kind,input,actual)=>{counts[kind]++;if(!ok)failures.push({kind,input,actual});};
const turn=(q,s=createConversationState())=>{const o=conversationTurn(s,q,records,areas,catalog,policy);evidence.push({q,state:o.state,messages:o.messages});return o;};
const aliases=[...new Set([...index.map.keys(),...index.specificEntries.map(e=>e.alias),...FAMILY_ALIASES.flatMap(e=>e.aliases),...Object.values(MANUFACTURER_ALIASES).flat()].filter(a=>/[a-z]/i.test(a)))];
for(const a of aliases){
 check(vehicleAliasOccurs(a,a),'positive',a);
 for(const q of ['zzq'+a+'zzq','9zz'+a+'77zz','한글zz'+a+'zz문장','word_zz'+a+'zz_end'])check(!vehicleAliasOccurs(q,a),'negativeBoundary',q);
}
const shortAliases=[...new Set([...index.groups.map(g=>g.vehicle),...FAMILY_ALIASES.flatMap(e=>e.aliases)].filter(a=>/^[a-z0-9-]+$/i.test(a)))];
check(searchVehicles('XC',records).matches.length>=3,'positive','XC shared family stem');
for(const alias of shortAliases)for(const q of [`zzq${alias}zzq`,`9zz${alias}77zz`,`문장zz${alias}zz문장`,`(zz${alias}zz)`,`zz${alias}zz 가격`,`zz${alias}zz 배터리`]){
 const direct=searchVehicles(q,records).matches,resolved=resolveVehicleText(q,records).matches;
 check(!direct.length&&!resolved.length,'negativeMatcher',q,{direct:direct.map(g=>g.key),resolved:resolved.map(g=>g.key)});
}
for(const [q,key]of [['아우디 TT','audi|TT'],['audi tt','audi|TT'],['TT','audi|TT'],['tt','audi|TT'],['폭스바겐 CC','volkswagen|CC'],['volkswagen cc','volkswagen|CC'],['CC','volkswagen|CC'],['아우디 A6','audi|A6'],['audi a6','audi|A6'],['A6','audi|A6'],['BMW X5','bmw|X5'],['bmw x5','bmw|X5'],['X5','bmw|X5'],['제네시스 G80','genesis|G80'],['G80','genesis|G80'],['기아 EV6','kia|EV6'],['EV6','kia|EV6']]){
 for(const text of [q,q.toLowerCase(),`(${q})`,q+'입니다',q+'라고 적혀 있어요',q+'구형',q+'가 있어요',q.replaceAll(' ','')])check(resolveVehicleText(text,records).matches.some(g=>g.key===key),'positive',text);
}
for(const g of index.groups){const q=g.manufacturerName+' '+g.vehicle;check(resolveVehicleText(q,records).matches.some(x=>x.key===g.key),'positive',q);}
for(const q of ['How much for battery and coming here','text only korean little','Hello my car battery dead','Battery change today possible','CCA','CCA가 뭐예요?','씨씨에이','blackbox','블랙박스','battery','capacity','accessory','little','battery CCA']){
 const o=turn(q);check(!o.state.selectedVehicleKey&&!o.state.confirmedBattery&&!o.state.quotedSpec,'knowledge',q,o.state);
}
let s=createConversationState();for(const q of ['Hello my car battery dead','I am in Anyang parking lot','한국말 조금 할 수 있어요','전체 비용을 숫자로 알려 주세요']){const o=turn(q,s);s=o.state;check(!s.selectedVehicleKey&&!s.confirmedBattery&&!s.quotedSpec&&!o.messages.join(' ').includes('17만원'),'session',q,o);}
const result={vehicles:records.length,areas:areas.length,registeredAliasCount:index.audit.uniqueAliasCount,latinAliases:aliases.length,shortAliases:shortAliases.length,counts,total:Object.values(counts).reduce((a,b)=>a+b,0),failures,evidence};
fs.writeFileSync(path.join(os.tmpdir(),'vehicle-token-boundary-focused.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,evidence:undefined},null,2));assert.equal(failures.length,0,JSON.stringify(failures.slice(0,10)));
