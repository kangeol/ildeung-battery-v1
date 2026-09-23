import fs from 'node:fs';import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';
import{conversationTurn,createConversationState,filteredRows,canonicalVehicleRowKey}from'../js/smart-consult-conversation.js';import{families,expected}from'./operational-fixtures.js';
const width=Number(process.env.UAT_WIDTH||1440),session='brand-comparison-'+width;
// Warm the named browser once from the calling shell before running this harness.
const run=(...args)=>execFileSync(process.env.AGENT_BROWSER_BIN||'agent-browser',['--session',session,...args],{encoding:'utf8',maxBuffer:5e6}).trim();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=read('seo-data/smart-consult-location-index.json').localities,catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const ev=s=>JSON.parse(JSON.parse(run('eval',`JSON.stringify(${s})`))),evidence=[];
const save=()=>{fs.mkdirSync('docs/evidence/brand-comparison',{recursive:true});fs.writeFileSync(`docs/evidence/brand-comparison/browser-${width}.json`,JSON.stringify(evidence,null,2)+'\n');};
const snapshot=()=>{run('wait','#sendButton:not(:disabled)');run('snapshot','-i');return ev("sessionStorage.getItem('ildeung.smart-consult.v5')?JSON.parse(JSON.parse(sessionStorage.getItem('ildeung.smart-consult.v5')).body):null")||{state:createConversationState(),messages:[{role:'bot'}]};};
const reset=()=>{run('click','#resetButton');snapshot();};
function ask(input,family){const before=snapshot();run('fill','#chatInput',input);run('click','#sendButton');const after=snapshot(),want=conversationTurn(before.state,input,rows,areas,catalog,policy),messages=after.messages.slice(before.messages.length).filter(m=>m.role==='bot').map(m=>m.text);assert.deepEqual(after.state,want.state);assert.deepEqual(messages,want.messages);if(family)for(const re of expected(family,input))assert.match(messages.join(' '),re);evidence.push({width,family,input,messages,state:after.state});return after;}
function click(before,choice){const buttons=ev("Array.from(document.querySelectorAll('.quick-reply:not(:disabled)')).map(b=>({label:b.innerText,id:b.dataset.candidateId}))");assert.ok(buttons.some(b=>b.label===choice.label&&b.id===choice.selection.id));run('find','role','button','click','--name',choice.label);const after=snapshot(),want=conversationTurn(before.state,choice.label,rows,areas,catalog,policy,choice.selection);assert.deepEqual(after.state,want.state);const identities=filteredRows(rows,after.state).map(canonicalVehicleRowKey);assert.deepEqual([...new Set(identities)].sort(),JSON.parse(choice.selection.id)[3].sort());const messages=after.messages.slice(before.messages.length).filter(m=>m.role==='bot').map(m=>m.text);assert.deepEqual(messages,want.messages);assert.notDeepEqual(after.messages.at(-1).chips.map(c=>c.value),before.messages.at(-1).chips.map(c=>c.value));evidence.push({width,candidate:choice.label,identities,messages,loop:false});return after;}
run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');snapshot();
const questions=['델코와 바르타 차이','둘이 뭐가 달라요?','뭐가 더 좋아요?','가격 차이는?','왜 바르타가 더 비싸요?','수명 차이 나요?','성능 차이 있어요?','둘 다 정품이에요?','둘 다 실버인가요?','어디서 만들어요?'];
for(const q of questions){reset();ask(q);reset();ask('델코와 바르타 차이');ask(q);}
for(const flow of [
['BMW 5시리즈 2020년식','가격은?','바르타는?','둘 차이가 뭐야?','가격 차이는?','뭐가 나아요?'],
['AGM105','바르타는?','델코랑 차이가 뭐예요?'],
['미니 쿠퍼','델코/바르타 비교','바르타는?','둘 중 뭐가 나아요?'],
['AGM60','바르타는?','델코랑 바르타 차이는?'],
['델코랑 바르타 차이랑 가격 알려줘'],
['둘 다 정품이고 최신 제조인가요?'],
['BMW 5시리즈 2020년식 델코랑 바르타 가격 차이'],
['AGM105 델코 바르타 차이랑 현금결제 가능해요?'],
['바르타가 더 좋은 건가요? 수명도 더 길어요?'],
['가격은 싼 게 좋은데 뭐가 나아요?'],
['바르타 원하고 오늘 교체 가능한가요?'],
['구월동','BMW 5시리즈 2020년식','바르타는?','델코랑 차이는?','몇 월 생산인가요?','카드']
]){reset();for(const q of flow)ask(q);}
for(const model of ['A7','G80','G90']){let count=0;for(let i=0;i===0||i<count;i++){reset();const before=ask(model);const choices=before.messages.at(-1).chips;count=choices.length;assert.ok(count>=2);click(before,choices[i]);if(model==='G80'&&choices[i].label.includes('RG3')){ask('바르타는?');ask('델코랑 바르타 차이는?');}}}
reset();ask('AGM105');ask('바르타는?');const saved=ask('둘 차이는?').state;
run('click','.header-home');run('wait','--load','load');run('wait','.smart-consult-launcher');run('snapshot','-i');assert.equal(ev("document.querySelectorAll('.smart-consult-launcher').length"),1);run('click','.smart-consult-launcher');assert.deepEqual(snapshot().state,saved);assert.equal(ev("document.querySelectorAll('.smart-consult-launcher').length"),0);ask('수명은?');
run('click','#chatInput');run('scroll','down','500');run('snapshot','-i');
const ui=ev("({focus:document.activeElement.id,bodyScroll:scrollY,overflow:document.documentElement.scrollWidth>innerWidth,composerVisible:document.querySelector('#chatInput').getBoundingClientRect().bottom<=innerHeight})");
assert.ok(ui.composerVisible);assert.equal(ui.focus,'chatInput');assert.equal(ui.overflow,false);if(width===390)assert.equal(ui.bodyScroll,0);
evidence.push({width,ui,reentry:true,screenshot:run('screenshot')});save();run('close');console.log('PASS '+evidence.length+' records');
