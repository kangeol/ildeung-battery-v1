import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',['npx --yes agent-browser --session product-policy',...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:4e6}).trim();
const scenarios=[
 [['알페온 2013년식 배터리 얼마예요?',['DIN74L','12만5천원']]],
 [['델코 국산인가요?',['저희가 취급하는','국산 제조 실버']]],
 [['바르타 독일산 맞나요?',['독일산 실버']]],
 [['중국산 배터리도 취급해요?',['중국산 제품은 취급하지 않습니다']]],
 [['델코랑 바르타 뭐가 낫나요?',['국산 제조 실버','독일산 실버','5만원','단정하지 않습니다']]],
 [['BMW 5시리즈 2020년식 배터리 얼마예요?',['22만원']],['둘 중 뭐가 낫나요?',['AGM95','22만원','27만원','단정하지 않습니다']]],
 [['AS 되나요?',['일등밧데리에서 설치한 배터리','설치일 기준 3개월 이내']]],
 [['무조건 교환되나요?',['증상과 차량 상태를 확인','1644-9141']]],
 [['일요일도 하나요?',['일요일 운영 여부는 당일 일정에 따라','1644-9141']]],
 [['오늘 영업해요?',['실시간 확인이 필요','1644-9141']]],
 [['BMW 5시리즈 2020년식 배터리 얼마예요?',['22만원']],['바르타로 하면?',['27만원']],['뭐가 더 좋아요?',['22만원','27만원','국산 제조 실버','독일산 실버','단정하지 않습니다']],['출장비는?',['별도 출장비는 없습니다']],['AS는?',['설치일 기준 3개월 이내']],['일요일도 하나요?',['일요일 운영 여부는 당일 일정에 따라','1644-9141']]],
 [['구월동 BMW 5시리즈 2020년식 바르타 배터리 얼마예요?',['구월동','27만원']],['중국산 아니죠?',['바르타는 독일산 실버','중국산 제품은 취급하지 않습니다']],['AS는?',['설치일 기준 3개월 이내']]]
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
   if(/AS|교환|일요일|오늘/.test(input))assert.ok(result.links.includes('tel:1644-9141'));
   evidence.push({width,input,...result});console.log(JSON.stringify({width,input,answers:result.answers}));
   fs.mkdirSync('docs/evidence/product-as-hours',{recursive:true});fs.writeFileSync('docs/evidence/product-as-hours/browser.json',JSON.stringify(evidence,null,2)+'\n');
  }
 }
 console.log(run('screenshot'));
}
console.log(`PASS ${evidence.length} UI turns`);
