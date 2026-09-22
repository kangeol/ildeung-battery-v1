import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-Command',['npx --yes agent-browser --session standalone-spec',...args.map(a=>"'"+a.replaceAll("'","''")+"'")].join(' ')],{encoding:'utf8',maxBuffer:4e6}).trim();
const scenarios=[
 [['AGM105',['델코 기준','28만원']]],
 [['AGM105 가격',['델코 기준','28만원']]],
 [['AGM105 얼마야?',['델코 기준','28만원']]],
 [['바르타 AGM105',['바르타','33만원']]],
 [['AGM60 바르타',['지원 규격이 아닙니다']]],
 [['BMW 5시리즈 2020년식',['AGM95']],['바르타로 하면?',['AGM95','27만원']]],
 [['미니 쿠퍼 배터리 얼마예요?',['17만원','19만원','현장']],['바르타로 하면?',['22만원','24만원','현장']]],
 [['출장배터리되나요?',['지역을 알려주세요']]],
 [['카드',['카드결제 가능합니다']]],
 [['직접 방문',['직접 방문도 가능합니다','1644-9141']]],
 [['작업시간',['10~20분','달라질 수 있습니다']]]
];
const evidence=[];
for(const width of [1440,390]){
 run('set','viewport',String(width),width===390?'844':'1000');run('open','http://127.0.0.1:4173/smart-consult/');run('snapshot','-i');
 for(const scenario of scenarios){run('click','#resetButton');for(const [input,expected] of scenario){
  const count=Number(run('eval',"document.querySelectorAll('.message-row.bot .message-bubble').length"));
  run('fill','#chatInput',input);run('click','#sendButton');run('snapshot','-i');
  const result=JSON.parse(JSON.parse(run('eval',`JSON.stringify({answers:Array.from(document.querySelectorAll('.message-row.bot .message-bubble')).slice(${count}).map(e=>e.innerText),overflow:document.documentElement.scrollWidth>innerWidth})`)));
  evidence.push({width,input,...result});fs.mkdirSync('docs/evidence/standalone-spec',{recursive:true});fs.writeFileSync('docs/evidence/standalone-spec/browser.json',JSON.stringify(evidence,null,2)+'\n');
  assert.equal(result.overflow,false);for(const fragment of expected)assert.ok(result.answers.join(' ').includes(fragment),`${width}/${input}: ${result.answers}`);
  console.log(`PASS ${width} ${input}`);
 }}
 console.log(run('screenshot'));
}
run('click','#chatInput');run('scroll','down','500');
const mobile=JSON.parse(JSON.parse(run('eval',`JSON.stringify({focused:document.activeElement.id,bodyScroll:scrollY,composerVisible:document.querySelector('#chatInput').getBoundingClientRect().bottom<=innerHeight,launcherCount:document.querySelectorAll('.smart-consult-launcher').length})`)));
assert.equal(mobile.focused,'chatInput');assert.equal(mobile.bodyScroll,0);assert.ok(mobile.composerVisible);assert.equal(mobile.launcherCount,0);
fs.writeFileSync('docs/evidence/standalone-spec/mobile.json',JSON.stringify(mobile,null,2)+'\n');run('close');console.log(`PASS ${evidence.length} UI turns`);
