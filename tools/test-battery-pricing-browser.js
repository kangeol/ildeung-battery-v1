import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',['npx --yes agent-browser --session pricing',...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:4e6}).trim();
const scenarios=[
 {inputs:['AGM105 얼마예요?'],contains:['28만원']},
 {inputs:['AGM60 가격'],contains:['15만5천원']},
 {inputs:['80R 얼마예요?'],contains:['11만원']},
 {inputs:['BMW 배터리 얼마예요?','5시리즈','2020년식'],contains:['AGM95','22만원']},
 {inputs:['그랜저 GN7 2023년식 가솔린 2.5 배터리 얼마예요?'],contains:['AGM70','17만원']},
 {inputs:['미니 쿠퍼 배터리 얼마예요?'],contains:['AGM70','17만원','AGM80','19만원','현장']},
 {inputs:['DIN70L 얼마예요?'],contains:['가격 확인이 필요'],unpriced:true},
 {inputs:['구월동 BMW 배터리 얼마예요?','5시리즈','2020년식'],contains:['AGM95','22만원','구월동']}
];
const evidence=[];
for(const width of [1440,390]){
 run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
 for(const scenario of scenarios){
  run('click','#resetButton');let result;
  for(const input of scenario.inputs){
   run('fill','#chatInput',input);run('click','#sendButton');run('snapshot','-i');
   const raw=run('eval',`JSON.stringify({answers:Array.from(document.querySelectorAll('.message-row.bot .message-bubble')).map(e=>e.innerText),chat:document.querySelector('#chatLog').innerText,overflow:document.documentElement.scrollWidth>innerWidth,links:Array.from(document.querySelectorAll('#chatLog a')).map(e=>e.getAttribute('href'))})`);
   result=JSON.parse(JSON.parse(raw));assert.equal(result.overflow,false);evidence.push({width,input,...result});console.log(JSON.stringify({width,input,answers:result.answers.slice(-2)}));
  }
  for(const text of scenario.contains)assert.ok(result.chat.includes(text),`${width}/${scenario.inputs}/${text}`);
  if(scenario.unpriced){assert.ok(!/\d+(?:만|천)?원/.test(result.answers.join(' ')));assert.ok(result.links.includes('tel:1644-9141'));}
  fs.mkdirSync('docs/evidence/battery-pricing',{recursive:true});fs.writeFileSync('docs/evidence/battery-pricing/browser.json',JSON.stringify(evidence,null,2)+'\n');
 }
 console.log(run('screenshot'));
}
console.log(`PASS ${evidence.length} browser submissions`);
