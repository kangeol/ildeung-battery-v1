import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {conversationTurn,createConversationState,filteredRows,canonicalVehicleRowKey} from '../js/smart-consult-conversation.js';
import {encodeSession} from '../js/smart-consult-session.js';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',[`npx --yes agent-browser --session authentic-${process.env.UAT_WIDTH||1440}`,...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:5e6}).trim();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const evaluate=s=>JSON.parse(JSON.parse(run('eval',`JSON.stringify(${s})`)));
const snapshot=()=>{run('snapshot','-i');return evaluate("sessionStorage.getItem('ildeung.smart-consult.v5')?JSON.parse(JSON.parse(sessionStorage.getItem('ildeung.smart-consult.v5')).body):null")||{state:createConversationState(),messages:[{role:'bot'}]};};
const normal=s=>s.replace(/\s+/g,' ').trim();const evidence=[];const save=()=>{fs.mkdirSync('docs/evidence/authentic-cash',{recursive:true});fs.writeFileSync(`docs/evidence/authentic-cash/browser-${process.env.UAT_WIDTH||1440}.json`,JSON.stringify(evidence,null,2)+'\n');};
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
function ask(text,re){const before=snapshot();const out=send(text);const expected=conversationTurn(before.state,text,rows,areas,catalog,policy);assert.deepEqual(out.state,expected.state);const messages=out.messages.slice(before.messages.length).filter(m=>m.role==='bot').map(m=>m.text);assert.deepEqual(messages,expected.messages);if(re)assert.match(messages.join(' '),re);evidence.push({width,input:text,messages,state:out.state});save();return out;}
run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
for(const [text,re]of [
 ['정품인가요?',/최신 정품만/],['최신정품인가요?',/최신 정품만/],['최신 제조인가요?',/항상 최신 제조일자/],['오래된 재고 아니죠?',/최신 제조일자/],['새 배터리인가요?',/최신 제조일자/],
 ['제조일자가 정확히 언제예요?',/1644-9141/],['몇 월 생산이에요?',/1644-9141/],['언제 출고됐어요?',/1644-9141/],['현금되나요?',/현금결제 가능합니다/],['현금 결제돼요?',/현금결제 가능합니다/],
 ['현금으로 하고 현금영수증 돼요?',/현금결제.*현금영수증/],['최신 정품이에요? 현금 되나요?',/최신 정품만.*현금결제/],['AGM105 최신 제조인가요?',/최신 제조일자/],['바르타 AGM105 정품인가요?',/최신 정품만/]
]){run('click','#resetButton');ask(text,re);console.log('PASS '+width+' '+text);}
for(const input of ['A7','G80','G90']){let count=0;for(let i=0;i===0||i<count;i++){run('click','#resetButton');const before=send(input);const choices=before.messages.at(-1).chips;count=choices.length;assert.ok(count>=2);const choice=choices[i];const picked=select(before,choice);assert.deepEqual([...new Set(picked.identity)].sort(),JSON.parse(choice.selection.id)[3].sort());evidence.push({width,input,label:choice.label,identity:picked.identity,messages:picked.messages,loop:false});save();console.log('PASS '+width+' '+choice.label);}}
run('click','#resetButton');ask('BMW 5시리즈 2020년식');let o=ask('바르타로 하면?',/27만원/);const a=o.state;
for(const text of ['정품 맞나요?','최신 제조인가요?','현금 되나요?','현금영수증 되나요?'])assert.deepEqual(ask(text).state,a);
run('click','#resetButton');ask('구월동');const before=ask('G90');const chosen=select(before,before.messages.at(-1).chips.find(c=>c.value==='G90'));const b=chosen.after.state;evidence.push({width,input:'Flow B selection',identity:chosen.identity,messages:chosen.messages,loop:false});save();
for(const text of ['최신정품인가요?','제조일자가 정확히 언제예요?','현금으로 할게요','작업시간'])assert.deepEqual(ask(text).state,b);
run('click','#resetButton');const c=ask('AGM105').state;for(const text of ['최신 제조인가요?','몇 월 생산이에요?','카드','현금'])assert.deepEqual(ask(text).state,c);
run('open','http://127.0.0.1:4173/smart-consult/');assert.deepEqual(snapshot().state,c);
run('click','#chatInput');run('scroll','down','500');const ui=evaluate("({focus:document.activeElement.id,bodyScroll:scrollY,composerVisible:document.querySelector('#chatInput').getBoundingClientRect().bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,phone:Array.from(document.querySelectorAll('a')).some(a=>a.getAttribute('href')==='tel:1644-9141')})");
assert.equal(ui.focus,'chatInput');assert.ok(ui.composerVisible&&ui.phone);assert.equal(ui.overflow,false);if(width===390)assert.equal(ui.bodyScroll,0);evidence.push({width,ui,screenshot:run('screenshot')});save();run('close');console.log('PASS '+evidence.length+' browser evidence records');
