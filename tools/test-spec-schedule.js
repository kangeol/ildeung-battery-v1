import fs from 'node:fs';
import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {formatWon} from '../js/smart-consult-prices.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const audit=process.argv.includes('--before'),evidence=[];
const run=(text,state=createConversationState())=>conversationTurn(state,text,rows,areas,catalog,policy);
const record=(family,input,predicate,state)=>{const out=run(input,state),ok=predicate(out);evidence.push({family,input,ok,messages:out.messages,state:out.state});return out;};
const particles=['','은','는','이','가','도','만','의','은요','는요','이요','가요','도요','만요'];
const forms=['얼마인가요?','얼마예요?','얼마죠?','가격은?','가격 알려줘','비용은?','교체 가격은?'];
for(const [code,price]of Object.entries(catalog.prices))for(const particle of particles)for(const form of forms){
 record('PARTICLE_PARSE_FAILURE',`${code}${particle} ${form}`,o=>o.state.quotedSpec===code&&o.messages.join(' ').includes(formatWon(price))&&!o.state.confirmedBattery);
}
const aliasLedger=new Map();
for(const [name,code]of [...Object.keys(catalog.prices).map(c=>[c,c]),...Object.entries(catalog.aliases)]){const stem=name.replace(/^(?:DF|DIN|AGM)/,'');if(stem!==name){if(!aliasLedger.has(stem))aliasLedger.set(stem,[]);if(!aliasLedger.get(stem).includes(code))aliasLedger.get(stem).push(code);}}
const ledger=[...aliasLedger].map(([alias,candidates])=>({alias,candidates,selected:catalog.aliases[alias]|| (candidates.length===1?candidates[0]:null),rationale:catalog.aliases[alias]?'Owner-approved explicit alias':candidates.length===1?'Unique catalog family-stripped token':'Multiple catalog families; clarify'}));
for(const item of ledger)record(item.selected?'SHORTHAND_UNIQUE_ALIAS_MISSED':'SHORTHAND_AMBIGUOUS_AUTOCONFIRM',`${item.alias}은 얼마인가요?`,o=>item.selected?o.state.quotedSpec===item.selected&&o.messages.join(' ').includes(formatWon(catalog.prices[item.selected])):!o.state.quotedSpec&&o.chips.length>1&&!/\d+만/.test(o.messages.join(' ')));
export const scheduleQuestions=['아침에 되나요?','아침에 가능한가요?','오전에 가능해요?','오전에도 되나요?','점심때 되나요?','점심시간에 가능해요?','오후에 되나요?','오후 가능해요?','저녁에도 되나요?','저녁에 가능해요?','밤에도 되나요?','야간에도 되나요?','퇴근 후 가능해요?','퇴근하고 가능해요?','7시에 가능해요?','저녁 7시 가능해요?','오전 10시에 돼요?','3시쯤 가능해요?','6시 반 가능해요?',...['오늘 아침','오늘 점심','오늘 저녁','내일 아침','내일 오후','내일 저녁','주말 오후','토요일 아침','일요일 저녁'].map(x=>x+' 가능해요?')];
for(const input of scheduleQuestions)for(const q of [input,input.replace(/\s/g,''),'혹시 '+input])record('SCHEDULE_WRONG_INTENT',q,o=>/1644-9141/.test(o.messages.join(' '))&&/실시간|확인/.test(o.messages.join(' '))&&!/10~20/.test(o.messages.join(' ')));
for(const input of ['저녁에도 영업해요?','아침부터 해요?','몇 시까지 해요?','영업시간?','밤에도 영업하나요?'])record('SCHEDULE_WRONG_INTENT',input,o=>/1644-9141/.test(o.messages.join(' '))&&!/\d+시부터|\d+시까지/.test(o.messages.join(' ')));
for(const input of ['저녁 7시에 교체하는 데 얼마나 걸려요?','내일 아침에 교체하면 작업시간은?','오늘 저녁 가능해요? 교체는 얼마나 걸려요?','오전에 방문 가능해요? 작업은 몇 분 걸려요?'])record('WORKTIME_SCHEDULE_CONFUSION',input,o=>/1644-9141/.test(o.messages.join(' '))&&/10~20/.test(o.messages.join(' '))&&/달라|상황/.test(o.messages.join(' ')));
const multi=[['AGM105는 바르타 얼마예요?',/33만원/],['AGM80은 델코랑 바르타 얼마예요?',/19만원.*24만원/s],['AGM95는 델코 바르타 차이가 얼마예요?',/22만원.*27만원/s],['AGM60은 바르타 얼마예요?',/지원 규격이 아닙니다/],['AGM70은 얼마고 현금돼요?',/17만원.*현금/s],['AGM105는 정품인가요?',/정품/],['AGM80은 최신 제조인가요?',/최신 제조/],['DIN74L은 얼마고 출장비 포함인가요?',/12만5천원.*출장/s],['오늘 저녁 가능한가요? 현금도 돼요?',/1644-9141.*현금/s],['내일 아침 예약하고 싶어요',/1644-9141/],['점심때 가능해요? BMW 5시리즈 2020년식 가격도 알려줘',/22만원.*1644-9141/s],['오전 10시에 가능해요? AGM105는 얼마인가요?',/28만원.*1644-9141/s],['주말 오후 가능한가요? 카드 돼요?',/1644-9141.*카드/s],['일요일 저녁 되나요? 현금영수증도 돼요?',/1644-9141.*현금영수증/s]];
for(const [q,re]of multi)record('MULTI_INTENT_LOST',q,o=>re.test(o.messages.join(' ')));
const established=run('아침에 가능한가요?').state;
for(const q of ['오늘은?','내일은?','아침은?','점심은?','오후는?','저녁은?','7시는?','주말은?']){record('CONTEXT_LOST',q,o=>/1644-9141/.test(o.messages.join(' ')),established);record('CONTEXT_LOST',q,o=>/말씀|확인할|일정/.test(o.messages.join(' ')));}
for(const q of ['AGM999는 얼마인가요?','DIN999L은 얼마예요?'])record('SPEC_WRONG_RESOLUTION',q,o=>!/\d+만/.test(o.messages.join(' ')));
const failures=evidence.filter(e=>!e.ok),totals={PASS_EXISTING:evidence.length-failures.length};for(const e of failures)totals[e.family]=(totals[e.family]||0)+1;
const result={phase:audit?'before':'after',catalogCount:Object.keys(catalog.prices).length,particleCount:Object.keys(catalog.prices).length*particles.length*forms.length,total:evidence.length,totals,ledger,failures,evidence};
const dir=process.env.SPEC_SCHEDULE_EVIDENCE||'C:/Users/kang1/AppData/Local/Temp/ildeung-spec-schedule';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(`${dir}/${audit?'before':'after'}.json`,JSON.stringify(result,null,2));console.log({phase:result.phase,catalog:result.catalogCount,particleCount:result.particleCount,total:result.total,totals});if(!audit)assert.equal(failures.length,0,JSON.stringify(failures.slice(0,3),null,2));
