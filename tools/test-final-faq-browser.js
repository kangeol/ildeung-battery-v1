import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',['npx --yes agent-browser --session final-faq',...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:4e6}).trim();
const scenarios=[
 [['BMW 5시리즈 2020년식 배터리 얼마예요?',['AGM95','델코 기준','22만원']],['카드돼요?',['카드결제 가능합니다']],['현금영수증은?',['현금영수증 발행 가능합니다']],['작업시간은?',['보통 10~20분','차량과 작업 상황']],['AS는?',['설치일 기준 3개월']],['일요일도 하나요?',['당일 일정','1644-9141']]],
 [['구월동 BMW 5시리즈 2020년식 바르타 배터리 얼마예요?',['구월동','바르타','AGM95','27만원']],['세금계산서 돼요?',['세금계산서 발행 가능합니다']],['직접 방문해도 돼요?',['직접 방문도 가능합니다','방문 전 고객센터 1644-9141']],['폐배터리 제가 갖고 있으면?',['폐배터리 수거 조건','전화로 정확한 조건']]],
 [['결제수단 뭐 있어요?',['카드결제','계좌이체','현금영수증','세금계산서']]],
 [['지금 방문해도 돼요?',['실시간 확인','1644-9141']]],
 [['20분 안에 무조건 끝나요?',['보통 10~20분','달라질 수 있습니다']]],
 [['몇 분 뒤 도착해요?',['실시간 확인']]]
];
const evidence=[];
for(const width of [1440,390]){
 run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
 for(const [index,scenario] of scenarios.entries()){
  run('click','#resetButton');
  for(const [input,expected] of scenario){
   const count=Number(run('eval',"document.querySelectorAll('.message-row.bot .message-bubble').length"));
   run('fill','#chatInput',input);run('click','#sendButton');run('snapshot','-i');
   const result=JSON.parse(JSON.parse(run('eval',`JSON.stringify({answers:Array.from(document.querySelectorAll('.message-row.bot .message-bubble')).slice(${count}).map(e=>e.innerText),overflow:document.documentElement.scrollWidth>innerWidth,links:Array.from(document.querySelectorAll('#chatLog a')).map(e=>e.getAttribute('href'))})`)));
   assert.equal(result.overflow,false);for(const fragment of expected)assert.ok(result.answers.join(' ').includes(fragment),`${width}/${input}/${fragment}: ${result.answers}`);
   if(/도착/.test(input))assert.doesNotMatch(result.answers.join(' '),/10~20/);
   if(/방문|폐배터리|일요일|도착/.test(input))assert.ok(result.links.includes('tel:1644-9141'));
   evidence.push({width,scenario:index+1,input,...result});console.log(JSON.stringify(evidence.at(-1)));
   fs.mkdirSync('docs/evidence/final-faq',{recursive:true});fs.writeFileSync('docs/evidence/final-faq/browser.json',JSON.stringify(evidence,null,2)+'\n');
  }
 }
 console.log(run('screenshot'));
}
run('click','#chatInput');run('scroll','down','500');
const mobile=JSON.parse(JSON.parse(run('eval',`JSON.stringify({focused:document.activeElement.id,bodyScroll:scrollY,composerVisible:document.querySelector('#chatInput').getBoundingClientRect().bottom<=innerHeight,launcherCount:document.querySelectorAll('.smart-consult-launcher').length})`)));
assert.equal(mobile.focused,'chatInput');assert.equal(mobile.bodyScroll,0);assert.ok(mobile.composerVisible);assert.equal(mobile.launcherCount,0);
fs.writeFileSync('docs/evidence/final-faq/mobile.json',JSON.stringify(mobile,null,2)+'\n');run('close');console.log(`PASS ${evidence.length} UI turns`);
