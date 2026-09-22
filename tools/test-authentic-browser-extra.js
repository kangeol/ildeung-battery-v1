import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {conversationTurn,createConversationState,filteredRows,canonicalVehicleRowKey} from '../js/smart-consult-conversation.js';
import {encodeSession} from '../js/smart-consult-session.js';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',[`npx --yes agent-browser --session authentic-extra-${process.env.UAT_WIDTH||1440}`,...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:5e6}).trim();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const evaluate=s=>JSON.parse(JSON.parse(run('eval',`JSON.stringify(${s})`)));
const snapshot=()=>{run('snapshot','-i');return evaluate("sessionStorage.getItem('ildeung.smart-consult.v5')?JSON.parse(JSON.parse(sessionStorage.getItem('ildeung.smart-consult.v5')).body):null")||{state:createConversationState(),messages:[{role:'bot'}]};};
const normal=s=>s.replace(/\s+/g,' ').trim();const evidence=[];const save=()=>{fs.mkdirSync('docs/evidence/authentic-cash',{recursive:true});fs.writeFileSync(`docs/evidence/authentic-cash/browser-extra-${process.env.UAT_WIDTH||1440}.json`,JSON.stringify(evidence,null,2)+'\n');};
function send(text){run('fill','#chatInput',text);run('click','#sendButton');return snapshot();}
function select(before,choice){
 const buttons=evaluate("Array.from(document.querySelectorAll('.quick-reply:not(:disabled)')).map(b=>({label:b.innerText,id:b.dataset.candidateId}))");assert.ok(buttons.some(b=>b.label===choice.label&&b.id===choice.selection.id));
 run('find','role','button','click','--name',choice.label);const after=snapshot();
 const expected=conversationTurn(before.state,choice.label,rows,areas,catalog,policy,choice.selection);
 assert.deepEqual(after.state,expected.state);
 assert.equal(after.messages[before.messages.length].text.includes('<script>'),false);
 const messages=after.messages.slice(before.messages.length).filter(m=>m.role==='bot').map(m=>m.text);assert.deepEqual(messages,expected.messages);
 assert.ok(after.state.previousQuestion?.field!==before.state.previousQuestion.field||JSON.stringify(after.messages.at(-1).chips.map(c=>c.value))!==JSON.stringify(before.messages.at(-1).chips.map(c=>c.value)));
 return {after,messages,identity:filteredRows(rows,after.state).map(canonicalVehicleRowKey)};
}


const width=Number(process.env.UAT_WIDTH||1440);
run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
for(const input of ['AGM105 최신 제조 제품 가격이랑 현금결제 돼요?','구월동 바르타 AGM105 정품이고 현금결제 가격은?','AGM105 정확한 제조일자와 가격 알려주세요','BMW 5시리즈 2020년식 배터리 정품인가요?','최신정품 맞고 제조일자도 최근인가요?','AGM999 정품인가요 가격은?']){
 run('click','#resetButton');const out=send(input),expected=conversationTurn(createConversationState(),input,rows,areas,catalog,policy);assert.deepEqual(out.state,expected.state);const messages=out.messages.filter(m=>m.role==='bot').slice(1).map(m=>m.text);assert.deepEqual(messages,expected.messages);
 if(input.includes('구월동')){assert.match(out.state.region.fullLabel,/구월동/);assert.match(messages.join(' '),/33만원/);assert.equal(out.state.brand,'VARTA');}
 if(input.includes('정확한')){assert.match(messages.join(' '),/28만원/);assert.match(messages.join(' '),/1644-9141/);}
 if(input.includes('AGM999'))assert.doesNotMatch(messages.join(' '),/\d+(?:만|천)?원/);
 evidence.push({width,input,messages,state:out.state});save();console.log('PASS '+width+' '+input);
}
run('close');console.log('PASS extra compound '+evidence.length);
