import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',['npx --yes agent-browser --session brand-policy',...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:4e6}).trim();
const scenarios=[
 [['BMW 5시리즈 2020년식 배터리 얼마예요?',['AGM95 델코 기준 교체 가격은 22만원']],['바르타로 하면?',['AGM95 바르타 기준 교체 가격은 27만원']],['출장비 따로 있어요?',['별도 출장비는 없습니다']],['코딩비는?',['코딩이 필요한 차량','별도 코딩비를 추가하지 않습니다']]],
 [['바르타 AGM105 얼마예요?',['바르타 기준 교체 가격은 33만원']]],
 [['바르타 AGM60 얼마예요?',['바르타 판매 지원 규격이 아닙니다']]],
 [['미니 쿠퍼 배터리 얼마예요?',['AGM70 델코 기준 교체 가격은 17만원','AGM80 델코 기준 교체 가격은 19만원','현장']],['바르타로 하면?',['AGM70 바르타 기준 교체 가격은 22만원','AGM80 바르타 기준 교체 가격은 24만원','현장']]],
 [['폐배터리 수거하나요?',['기존 폐배터리 수거 조건']]],
 [['22만원이면 공임이랑 출장비 다 포함이에요?',['출장교체비용과 공임이 포함']]],
 [['현장에서 더 받는 거 없어요?',['조건 그대로 교체하는 경우','별도 추가비용은 없습니다']]],
 [['구월동 BMW 5시리즈 2020년식 바르타 배터리 얼마예요?',['구월동','AGM95 바르타 기준 교체 가격은 27만원']],['출장비는?',['별도 출장비는 없습니다']]]
];
const evidence=[];
for(const width of [1440,390]){
 run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
 for(const scenario of scenarios){
  run('click','#resetButton');
  for(const [input,expected] of scenario){
   const count=Number(run('eval',"document.querySelectorAll('.message-row.bot .message-bubble').length"));
   run('fill','#chatInput',input);run('click','#sendButton');run('snapshot','-i');
   const result=JSON.parse(JSON.parse(run('eval',`JSON.stringify({answers:Array.from(document.querySelectorAll('.message-row.bot .message-bubble')).slice(${count}).map(e=>e.innerText),chat:document.querySelector('#chatLog').innerText,overflow:document.documentElement.scrollWidth>innerWidth,links:Array.from(document.querySelectorAll('#chatLog a')).map(e=>e.getAttribute('href'))})`)));
   assert.equal(result.overflow,false);for(const fragment of expected)assert.ok(result.answers.join(' ').includes(fragment),`${width}/${input}/${fragment}`);
   if(input.includes('바르타 AGM60'))assert.ok(!/\d+(?:만|천)?원/.test(result.answers.join(' ')));
   evidence.push({width,input,...result});console.log(JSON.stringify({width,input,answers:result.answers}));
   fs.mkdirSync('docs/evidence/brand-service',{recursive:true});fs.writeFileSync('docs/evidence/brand-service/browser.json',JSON.stringify(evidence,null,2)+'\n');
  }
 }
 console.log(run('screenshot'));
}
console.log(`PASS ${evidence.length} UI turns`);
