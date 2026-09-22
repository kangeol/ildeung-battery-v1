import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',['npx --yes agent-browser --session location-fix',...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:4e6}).trim();
const scenarios=[
 [['출장배터리되나요?',['지역을 알려주세요']]],
 [['지역은 인천입니다',['인천','가능']]],
 [['인천입니다',['인천','가능']]],
 [['지역은 마포입니다',['서울 마포구','가능']]],
 [['마포입니다',['서울 마포구','가능']]],
 [['마포동입니다',['서울 마포구 마포동','가능']]],
 [['지역은 송파예요',['서울 송파구','가능']]],
 [['송파동입니다',['서울 송파구 송파동','가능']]],
 [['구월동입니다',['인천 남동구 구월동','가능']]],
 [['구월동인데 출장되나요?',['인천 남동구 구월동','가능']]],
 [['지역은 인천이고 차량은 그랜저예요',['인천','그랜저']]],
 [['구월동 BMW 배터리 얼마예요?',['구월동','BMW']],['출장배터리되나요?',['구월동','가능']]],
 [['부산 출장돼요?',['확인되지','1644-9141']]],
 [['시흥입니다',['서울 금천구 시흥동','경기 성남시 수정구 시흥동','경기 시흥시']]]
];
const evidence=[];
for(const width of [1440,390]){
 run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
 for(const [i,scenario] of scenarios.entries()){
  run('click','#resetButton');
  for(const [input,expected] of scenario){
   const count=Number(run('eval',"document.querySelectorAll('.message-row.bot .message-bubble').length"));
   run('fill','#chatInput',input);run('click','#sendButton');run('snapshot','-i');
   const result=JSON.parse(JSON.parse(run('eval',`JSON.stringify({answers:Array.from(document.querySelectorAll('.message-row.bot .message-bubble')).slice(${count}).map(e=>e.innerText),overflow:document.documentElement.scrollWidth>innerWidth,links:Array.from(document.querySelectorAll('#chatLog a')).map(e=>e.getAttribute('href'))})`)));
   assert.equal(result.overflow,false);for(const fragment of expected)assert.ok(result.answers.join(' ').includes(fragment),`${width}/${input}/${fragment}: ${result.answers}`);
   evidence.push({id:`A${i+1}`,width,input,...result});console.log(JSON.stringify(evidence.at(-1)));
   fs.mkdirSync('docs/evidence/location-nlu',{recursive:true});fs.writeFileSync('docs/evidence/location-nlu/browser.json',JSON.stringify(evidence,null,2)+'\n');
  }
 }
 console.log(run('screenshot'));
}
run('click','#chatInput');run('scroll','down','500');
const mobile=JSON.parse(JSON.parse(run('eval',`JSON.stringify({focused:document.activeElement.id,bodyScroll:scrollY,composerVisible:document.querySelector('#chatInput').getBoundingClientRect().bottom<=innerHeight,launcherCount:document.querySelectorAll('.smart-consult-launcher').length})`)));
assert.equal(mobile.focused,'chatInput');assert.equal(mobile.bodyScroll,0);assert.ok(mobile.composerVisible);assert.equal(mobile.launcherCount,0);
fs.writeFileSync('docs/evidence/location-nlu/mobile.json',JSON.stringify(mobile,null,2)+'\n');
run('close');console.log(`PASS ${evidence.length} UI turns`);
