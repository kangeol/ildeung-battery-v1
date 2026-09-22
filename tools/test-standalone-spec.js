import fs from 'node:fs';
import assert from 'node:assert/strict';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {directPriceSpec,formatWon} from '../js/smart-consult-prices.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const rows=read('data/manufacturers.json').flatMap(m=>read(`data/${m.file}`).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
assert.equal(rows.length,917);assert.equal(areas.length,665);assert.equal(Object.keys(catalog.prices).length,26);
const transcripts=[];
function turn(input,state=createConversationState()) {const o=conversationTurn(state,input,rows,areas,catalog,policy);transcripts.push({input,messages:o.messages,state:o.state});return o;}
const wording=['',' 가격',' 얼마',' 얼마예요?',' 얼마야?'];
for(const [code,amount] of Object.entries(catalog.prices))for(const suffix of wording){
 const o=turn(code+suffix);assert.ok(o.messages.join(' ').includes(formatWon(amount)),code+suffix);assert.equal(o.state.quotedSpec,code);assert.equal(o.state.confirmedBattery,null);assert.equal(o.state.priceIntent,true);
 if(code.startsWith('AGM'))assert.match(o.messages.join(' '),/델코 기준/);
}
for(const [alias,code] of Object.entries(catalog.aliases)){const o=turn(alias);assert.ok(o.messages.join(' ').includes(formatWon(catalog.prices[code])));}
for(const input of ['agm105','AGM 105','Agm105?'])assert.match(turn(input).messages.join(' '),/28만원/);
for(const [code,amount] of Object.entries(catalog.brands.VARTA.prices))for(const input of [`바르타 ${code}`,`${code} 바르타로 하면?`,`VARTA ${code} 가격`])assert.ok(turn(input).messages.join(' ').includes(formatWon(amount)));
for(const code of ['AGM60','AGM80R','AGM95R'])for(const suffix of ['',' 가격']){const o=turn(`${code} 바르타${suffix}`);assert.match(o.messages.join(' '),/지원 규격이 아닙니다/);assert.doesNotMatch(o.messages.join(' '),/\d+(?:만|천)?원/);}
for(const input of ['AGM999','AGM999 가격','DIN70L','DIN70L 얼마예요?'])assert.doesNotMatch(turn(input).messages.join(' '),/\d+(?:만|천)?원/);
for(const input of ['내 차에 AGM105 맞아?','BMW 5시리즈에 AGM105 들어가?','BMW 5시리즈 2020년식 AGM105 맞아?']){assert.equal(directPriceSpec(input,catalog),null);const o=turn(input);assert.notEqual(o.state.confirmedBattery,'AGM105');assert.notEqual(o.state.quotedSpec,'AGM105');}
let o=turn('AGM105');const saved=decodeSession(encodeSession(o.state,[],null));assert.ok(saved);o=turn('바르타로 하면?',saved.state);assert.match(o.messages.join(' '),/33만원/);assert.equal(o.state.quotedSpec,'AGM105');
o=turn('미니 쿠퍼 배터리 얼마예요?');assert.equal(o.state.confirmedBattery,null);assert.match(o.messages.join(' '),/17만원/);assert.match(o.messages.join(' '),/19만원/);o=turn('바르타로 하면?',o.state);assert.match(o.messages.join(' '),/22만원/);assert.match(o.messages.join(' '),/24만원/);assert.match(o.messages.join(' '),/현장/);assert.equal(o.state.confirmedBattery,null);
o=turn('구월동 BMW 배터리 얼마예요?');o=turn('5시리즈',o.state);o=turn('2020년식',o.state);assert.equal(o.state.confirmedBattery,'AGM95');assert.match(o.state.region.fullLabel,/구월동/);o=turn('아니 2019년식이야',o.state);assert.equal(o.state.year,2019);assert.equal(o.state.priceIntent,true);
const evidence={canonicalCases:26*wording.length,aliasCases:Object.keys(catalog.aliases).length,totalTurns:transcripts.length,gates:{STANDALONE_CANONICAL_SPEC_FALSE_VEHICLE_PROMPT:0,CANONICAL_SPEC_PRICE_WRONG:0,UNKNOWN_SPEC_PRICE_FABRICATED:0,VARTA_UNSUPPORTED_PRICE_FABRICATED:0,VEHICLE_COMPATIBILITY_FALSE_INFERENCE:0,MINI_COMPOSITE_AUTOCONFIRM:0,SPEC_CONTEXT_LOST:0},transcripts};
fs.mkdirSync('docs/evidence/standalone-spec',{recursive:true});fs.writeFileSync('docs/evidence/standalone-spec/focused.json',JSON.stringify(evidence,null,2)+'\n');console.log(`PASS ${evidence.totalTurns} turns, ${evidence.canonicalCases} canonical cases`);
