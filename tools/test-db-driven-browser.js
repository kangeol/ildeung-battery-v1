// Local UI acceptance through the agent-browser CLI; no direct engine calls.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',['npx --yes agent-browser --session continuation',...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:4e6}).trim();
const scenarios=[
 ['그랜저 GN7 2023년식','2.5'],['그랜저 GN7 2023년식 가솔린 2.5'],['그랜저 GN7 2023년식 가솔린 3.5'],
 ['BMW 5시리즈 2023','네'],['E클래스 2024'],['G70 2024'],['아반떼 2023'],['싼타페 2023'],
 ['배터리 교체비용 얼마예요?'],['BMW 배터리 얼마예요?'],['BMW 5시리즈 배터리 얼마예요?','네'],
 ['구월동교체되나요?'],['구월동배터리교체되나요?'],['구월동출장되나요?'],['인천 구월동 교체 가능?'],['논현동'],
 ['구월동 BMW 배터리 얼마예요?','5시리즈','2020년식'],['구월동 BMW 5시리즈 2020년식 배터리 얼마예요?','네'],
 ['구월동 BMW 520d 2020년식 배터리 얼마예요?']
];
const evidence=[];
for(const width of [1440,390]){
 run('set','viewport',String(width),width===390?'844':'1000');
 run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
 for(const inputs of scenarios){
  run('click','#resetButton');
  for(const input of inputs){
   run('fill','#chatInput',input);run('click','#sendButton');run('snapshot','-i');
   const raw=run('eval',`JSON.stringify({answers:Array.from(document.querySelectorAll('.message-row.bot .message-bubble')).map(e=>e.innerText),chips:Array.from(document.querySelectorAll('button.quick-reply:not(:disabled)')).map(e=>e.innerText),links:Array.from(document.querySelectorAll('#chatLog a')).map(e=>({text:e.innerText,href:e.getAttribute('href')})),overflow:document.documentElement.scrollWidth>innerWidth})`);
   const result=JSON.parse(JSON.parse(raw));assert.equal(result.overflow,false);
   evidence.push({width,inputs,input,...result});
   fs.mkdirSync('docs/evidence/db-driven-flow',{recursive:true});fs.writeFileSync('docs/evidence/db-driven-flow/browser.json',JSON.stringify(evidence,null,2)+'\n');
   console.log(JSON.stringify({width,input,answers:result.answers.slice(-3),chips:result.chips}));
  }
 }
 console.log(run('screenshot'));
}
console.log(`Browser acceptance complete: ${evidence.length} submissions`);
