import fs from 'node:fs';import assert from 'node:assert/strict';
import {conversationTurn,createConversationState,filteredRows} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const transcripts=[];let rejected=0;
function turn(state,text,selection){const o=conversationTurn(state,text,rows,areas,catalog,policy,selection);transcripts.push({text,selection,messages:o.messages,state:o.state});return o;}
const fresh=()=>createConversationState();
let o=turn(fresh(),'구월동');o=turn(o.state,'G90');const question=o;
const older=o.chips.find(c=>c.value==='G90');assert.ok(older.selection);
const pending=decodeSession(encodeSession(o.state,[{role:'bot',text:o.messages[0],actions:[],chips:o.chips}],null));assert.ok(pending);assert.deepEqual(pending.messages[0].chips,o.chips);
o=turn(pending.state,older.label,older.selection);assert.equal(o.state.detailModel,'G90');assert.equal(o.state.yearRange,'18~21년');assert.equal(o.state.confirmedBattery,'AGM105');assert.match(o.messages.join(' '),/28만원/);assert.equal(o.chips.length,0);
const selected=o.state;const saved=decodeSession(encodeSession(selected,[],null));assert.ok(saved);
for(const [input,pattern] of [['바르타로 하면?',/33만원/],['카드',/카드결제 가능합니다/],['작업시간',/10~20분/],['가격',/33만원/],['출장배터리되나요?',/구월동/]]){o=turn(o.state,input);assert.match(o.messages.join(' '),pattern);assert.equal(o.state.detailModel,'G90');assert.equal(o.state.confirmedBattery,'AGM105');assert.match(o.state.region.fullLabel,/구월동/);}
assert.match(turn(saved.state,'바르타로 하면?').messages.join(' '),/33만원/);
o=turn(selected,'아니 2024년식이야');assert.equal(o.state.year,2024);assert.equal(o.state.confirmedBattery,null);assert.ok(filteredRows(rows,o.state).every(r=>r.detailModel==='G90 (RS4)'));
o=turn(selected,'BMW 5시리즈 2020년식');assert.equal(o.state.vehicleFamily,'5시리즈');assert.equal(o.state.confirmedBattery,'AGM95');
assert.deepEqual(turn(selected,'처음부터').state,fresh());
const other=turn(fresh(),'G80').chips[0].selection;
for(const state of [fresh(),question.state,selected])for(const payload of [{},{type:'vehicle-candidate',id:'<script>alert(1)</script>'},{type:'vehicle-candidate',id:'__proto__'},{type:'vehicle-candidate',id:[]},{type:'vehicle-candidate',id:older.selection.id+'x'},other]){
 const before=structuredClone(state);const r=turn(state,'AGM105 가격',payload);assert.deepEqual(r.state,before);assert.deepEqual(state,before);assert.doesNotMatch(r.messages.join(' '),/만원|<script>/);rejected++;
}
const stale=turn(selected,older.label,older.selection);assert.deepEqual(stale.state,selected);assert.doesNotMatch(stale.messages.join(' '),/만원/);rejected++;
const injected=turn(question.state,'<img src=x onerror=alert(1)>',older.selection);assert.equal(injected.state.confirmedBattery,'AGM105');assert.doesNotMatch(injected.messages.join(' '),/img|onerror/);
const gates={DISAMBIGUATION_SELECTION_LOOP:0,DISAMBIGUATION_WRONG_ROW:0,DISAMBIGUATION_SELECTION_LOST:0,DISAMBIGUATION_YEAR_GENERATION_LOST:0,DISAMBIGUATION_FALSE_UNSUPPORTED:0,DISAMBIGUATION_UNAUTHORIZED_BATTERY_INFERENCE:0};
fs.mkdirSync('docs/evidence/vehicle-selection',{recursive:true});fs.writeFileSync('docs/evidence/vehicle-selection/context.json',JSON.stringify({turns:transcripts.length,rejected,gates,transcripts},null,2)+'\n');console.log({status:'PASS',turns:transcripts.length,rejected,gates});
