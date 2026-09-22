import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {conversationTurn,filteredRows,canonicalVehicleRowKey} from '../js/smart-consult-conversation.js';
import {encodeSession} from '../js/smart-consult-session.js';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',['npx --yes agent-browser --session selection-local',...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:5e6}).trim();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const evaluate=s=>JSON.parse(JSON.parse(run('eval',`JSON.stringify(${s})`)));
const snapshot=()=>{run('snapshot','-i');return evaluate("JSON.parse(JSON.parse(sessionStorage.getItem('ildeung.smart-consult.v5')).body)");};
const normal=s=>s.replace(/\s+/g,' ').trim();const evidence=[];const save=()=>{fs.mkdirSync('docs/evidence/vehicle-selection',{recursive:true});fs.writeFileSync('docs/evidence/vehicle-selection/browser.json',JSON.stringify(evidence,null,2)+'\n');};
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
for(const width of [1440,390]){
 run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
 for(const input of ['G90','G80','제네시스 G70 2024년식']){let count=0;for(let i=0;i===0||i<count;i++){
  run('click','#resetButton');const before=send(input);const choices=before.messages.at(-1).chips;count=choices.length;assert.ok(count>=2);const c=choices[i];assert.ok(c.selection);const selected=select(before,c);
  evidence.push({width,input,label:c.label,value:c.value,selection:c.selection,identity:selected.identity,battery:selected.after.state.confirmedBattery,messages:selected.messages,loop:false});save();console.log(`PASS ${width} ${input} -> ${c.label}`);
 }}
 run('click','#resetButton');const pending=send('G90');const legacy=structuredClone(pending);
 for(const chip of legacy.state.previousQuestion.choices)delete chip.selection;
 for(const message of legacy.messages)for(const chip of message.chips)delete chip.selection;
 const encoded=Buffer.from(encodeSession(legacy.state,legacy.messages,legacy.entryId)).toString('base64');
 run('eval',`sessionStorage.setItem('ildeung.smart-consult.v5',decodeURIComponent(escape(atob('${encoded}'))))`);
 run('open','http://127.0.0.1:4173/smart-consult/');snapshot();
 const legacyChoice=pending.messages.at(-1).chips.find(c=>c.value==='G90');const legacySelected=select(legacy,legacyChoice);
 assert.equal(legacySelected.after.state.confirmedBattery,'AGM105');
 evidence.push({width,input:'legacy pending G90 session reload',label:legacyChoice.label,identity:legacySelected.identity,messages:legacySelected.messages,loop:false});save();
 run('click','#resetButton');send('구월동');const before=send('G90');const c=before.messages.at(-1).chips.find(c=>c.value==='G90');const selected=select(before,c);
 evidence.push({width,input:'구월동 -> G90',label:c.label,identity:selected.identity,messages:selected.messages,loop:false});save();
 for(const [text,expected] of [['바르타로 하면?',/33만원/],['카드',/카드결제/],['작업시간',/10~20분/],['가격',/33만원/],['출장배터리되나요?',/구월동/]]){const out=send(text);assert.equal(out.state.detailModel,'G90');assert.equal(out.state.confirmedBattery,'AGM105');assert.match(out.state.region.fullLabel,/구월동/);assert.match(out.messages.at(-1).text,expected);evidence.push({width,input:text,messages:out.messages.slice(-2),state:out.state});save();}
 run('open','http://127.0.0.1:4173/smart-consult/');const restored=snapshot();assert.equal(restored.state.detailModel,'G90');assert.equal(restored.state.confirmedBattery,'AGM105');
 const corrected=send('아니 2024년식이야');assert.equal(corrected.state.confirmedBattery,null);assert.ok(filteredRows(rows,corrected.state).every(r=>r.detailModel==='G90 (RS4)'));
 const replacement=send('BMW 5시리즈 2020년식');assert.equal(replacement.state.confirmedBattery,'AGM95');
 run('click','#resetButton');for(const [input,expected] of [['AGM105',/28만원/],['AGM105 가격',/28만원/],['AGM105 얼마야?',/28만원/]]){const out=send(input);assert.equal(out.state.confirmedBattery,null);assert.match(out.messages.map(m=>m.text).join(' '),expected);evidence.push({width,input,messages:out.messages.slice(-2)});save();}
 run('click','#chatInput');run('scroll','down','500');const ui=evaluate("({focused:document.activeElement.id,bodyScroll:scrollY,composerVisible:document.querySelector('#chatInput').getBoundingClientRect().bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,phone:Array.from(document.querySelectorAll('a')).some(a=>a.getAttribute('href')==='tel:1644-9141')})");
 assert.equal(ui.focused,'chatInput');assert.ok(ui.composerVisible);assert.ok(ui.phone);assert.equal(ui.overflow,false);if(width===390)assert.equal(ui.bodyScroll,0);
 evidence.push({width,ui,restored:true,correction:true,replacement:true,screenshot:run('screenshot')});save();
}
run('close');console.log(`PASS ${evidence.filter(e=>e.loop===false).length} actual candidate clicks, ${evidence.length} evidence records`);
