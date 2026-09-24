import {postSyncBaseline,approvedBlogCount} from './lib/blog-sync-approved-freeze.js';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
import {priceDescription} from '../js/smart-consult-prices.js';
const baseline='b09bc3f3f0995e39820728caacbf37ee594c2886',git=p=>execFileSync('git',['show',baseline+':'+p],{encoding:'utf8'}),url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const oldPlan=url(git('js/smart-consult-purchase-stage.js'));let oldSource=git('js/smart-consult-conversation.js').replace(/from (["'])(\.\/[^"']+)\1/g,(_,q,p)=>'from '+JSON.stringify(p==='./smart-consult-purchase-stage.js'?oldPlan:pathToFileURL(path.resolve('js',p.split('?')[0])).href));
const old=(await import(url(oldSource))).conversationTurn;
const direct=['폐배터리 안 주면 가격 달라져요?','헌 배터리 안 주면 얼마예요?','기존 배터리 안 가져가면 가격 달라요?','폐배터리 제가 가지면 가격이 달라지나요?','반납 안 하면 얼마예요?','수거 안 하면 추가금 있어요?','배터리 가져가면 더 비싸요?','헌 배터리 가지고 싶어요 가격은요?','기존 배터리 제가 보관하면 얼마예요?','폐배터리 반납 안 하고 AGM105 하면 얼마예요?'];
const negatives=['델코랑 바르타 가격 달라요?','델코 바르타 가격 차이?','AGM105 델코랑 바르타 얼마 차이예요?','두 브랜드 가격이 달라요?','바르타가 델코보다 얼마 비싸요?','AGM70이랑 AGM80 가격 달라요?','BMW랑 벤츠 배터리 가격 달라요?','현금이랑 카드 가격 달라요?','지역마다 가격 달라요?','오늘이랑 내일 가격 달라요?'];
const combined=['AGM105 얼마예요? 폐배터리 안 주면 가격 달라져요?','BMW5 2020 델코로 할게요. 헌 배터리 제가 가지면 얼마예요?','현금으로 할게요. 폐배터리 안 주면 추가금 있어요?','폐배터리 안 주고 오늘 교체 가능해요?','회사 주차장에서 교체하고 헌 배터리는 제가 가져갈게요. 가격은요?'];
const flows=[['AGM105','가격','폐배터리 안 주면?','얼마 달라져요?'],['BMW5 2020','델코','총금액','헌 배터리 제가 가지면?'],['폐배터리는 수거해요?','제가 가지고 싶어요','가격은?'],['델코랑 바르타 가격 차이?','폐배터리 안 주면 가격도 달라요?'],['회사 주차장','제가 없어도?','헌 배터리 보관하고 싶어요','가격은?']];
if(process.argv.includes('--browser')){
 let code=fs.readFileSync('tools/test-spec-brand-query-browser.js','utf8').replace("'../js/smart-consult-conversation.js'",JSON.stringify(pathToFileURL(path.resolve('js/smart-consult-conversation.js')).href)).replace("session='brand-query-'+width","session='waste-noncollection-'+width").replace("owner?'non-agm-owner-policy':'spec-brand-query'","'waste-noncollection-browser'");
 code=code.replace(/const questions=owner\?[\s\S]*?;\nfor\(const q of questions\)/,'const questions='+JSON.stringify([...direct,...negatives,...combined])+';\nfor(const q of questions)');
 code=code.replace(/const flows=owner\?[\s\S]*?;\nfor\(const flow of flows\)/,'const flows='+JSON.stringify(flows)+';\nfor(const flow of flows)');
 code=code.replace("reset();ask(owner?'80L 브랜드랑 가격 알려줘':'AGM70 브랜드랑 가격 알려줘');","reset();ask('폐배터리 안 주면 가격 달라져요?');");
 await import(url(code));
}else{
 const j=p=>JSON.parse(fs.readFileSync(p,'utf8')),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,catalog=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json');
 const names=['WASTE_NONCOLLECTION_WRONG_INTENT','WASTE_NONCOLLECTION_BRAND_COMPARISON_HIJACK','WASTE_NONCOLLECTION_CONTEXT_LOST','WASTE_NONCOLLECTION_PRICE_FABRICATED','WASTE_NONCOLLECTION_SURCHARGE_FABRICATED','WASTE_NONCOLLECTION_SAME_PRICE_FALSE_PROMISE','WASTE_NONCOLLECTION_VALUE_FABRICATED','WASTE_NONCOLLECTION_MULTI_INTENT_LOST','WASTE_NONCOLLECTION_SESSION_CONTEXT_LOST','BRAND_COMPARISON_REGRESSION_FROM_WASTE_FIX','UNRELATED_PRICE_DIFFERENCE_FALSE_WASTE_INTENT','SPEC_PRICE_CONTEXT_LOST','PAYMENT_CONTEXT_LOST','SCHEDULE_CONTEXT_LOST','LOCATION_CONTEXT_LOST'];
 const gates=Object.fromEntries(names.map(k=>[k,0])),checks={...gates},evidence=[];const check=(k,ok,q)=>{checks[k]++;if(!ok){gates[k]++;console.error(k,q);}};
 const run=(q,s=createConversationState(),fn=conversationTurn)=>fn(s,q,rows,areas,catalog,policy);
 function turn(q,s=createConversationState(),waste=true){const o=run(q,s),t=o.messages.join(' ');evidence.push({input:q,messages:o.messages,state:o.state});
  if(waste){check(names[0],/폐배터리 수거 조건/.test(t)&&/확인/.test(t)&&o.actions.includes('phone'),q);check(names[1],!/비교라면|어떤 제품이나 브랜드/.test(t),q);check(names[3],!/[0-9]+만/.test(t)||Boolean(o.state.quotedSpec||o.state.confirmedBattery),q);check(names[4],!/(?:추가금|추가비용|미수거 가격)(?:은|는)?\s*\d/.test(t),q);check(names[5],!/수거하지 않아도|보관해도.*같|미수거.*추가비용은 없습니다/.test(t),q);check(names[6],!/(?:고철값|보증금|환급금)은?\s*\d/.test(t),q);}
  if(waste){const quoted=o.messages.filter(m=>/\d+(?:만|천)?원/.test(m));check(names[3],quoted.every(m=>m===priceDescription(o.state.quotedSpec||o.state.confirmedBattery,catalog,o.state.brand)),q);}
  check(names[8],JSON.stringify(decodeSession(encodeSession(o.state,[]))?.state)===JSON.stringify(o.state),q);return o;
 }
 const before=direct.map(input=>({input,messages:run(input,createConversationState(),old).messages}));
 const contexts=[createConversationState(),run('AGM105').state,run('구월동 BMW 5시리즈 2020년식 바르타 배터리 가격').state];
 for(const noun of ['폐배터리','헌배터리','헌 배터리','기존 배터리','쓰던 배터리'])for(const verb of ['안 주면','안 드리면','반납 안 하면','수거 안 하면','안 가져가면','내가 가지면','제가 가지면','보관하면','가지고 있으면'])for(const price of ['가격 달라져요?','얼마예요?','차이 있나요?','추가금 있나요?','추가 비용 있나요?','더 비싸요?','비용은요?'])for(const variant of [q=>q,q=>q.replaceAll(' ',''),q=>'혹시 '+q])for(const s of contexts){const q=variant(`${noun} ${verb} ${price}`),o=turn(q,s);check(names[2],['brand','region','selectedVehicleKey','confirmedBattery','year'].every(k=>JSON.stringify(o.state[k])===JSON.stringify(s[k])),q);check(names[11],o.state.quotedSpec===s.quotedSpec,q);}
 for(const q of direct)turn(q);
 for(const [i,q]of negatives.entries())for(const s of contexts){const o=turn(q,s,false);check(i<5?names[9]:names[10],JSON.stringify(o)===JSON.stringify(run(q,s,old)),q);}
 const wants=[['28만원','수거 조건'],['BMW','수거 조건'],['현금결제','수거 조건'],['실시간','수거 조건'],['현장 조건','수거 조건']];
 for(const [i,q]of combined.entries()){const o=turn(q),t=o.messages.join(' ');check(names[7],wants[i].every(x=>t.includes(x)),q);if(i===2)check(names[12],t.includes('현금결제'),q);if(i===3)check(names[13],t.includes('실시간'),q);if(i===4)check(names[14],t.includes('현장 조건'),q);}
 for(const flow of flows){let s=createConversationState();for(const [i,q]of flow.entries()){const before=s,o=turn(q,s,i===flow.length-1||/폐배터리 안|헌 배터리.*가지|보관/.test(q));s=o.state;if(before.quotedSpec)check(names[11],s.quotedSpec===before.quotedSpec,q);if(before.region)check(names[14],JSON.stringify(s.region)===JSON.stringify(before.region),q);}}
 for(const s of contexts){const kept=turn('폐배터리 안 주면?',s).state;for(const q of negatives){const o=turn(q,kept,false);check(names[10],JSON.stringify(o)===JSON.stringify(run(q,kept,old)),q);}}
 let vehicle=run('구월동 BMW 5시리즈 2020년식 배터리 가격').state;for(const q of ['헌 배터리 제가 가지면?','얼마 달라져요?']){const o=turn(q,vehicle);check(names[2],o.state.confirmedBattery===vehicle.confirmedBattery&&o.state.selectedVehicleKey===vehicle.selectedVehicleKey&&JSON.stringify(o.state.region)===JSON.stringify(vehicle.region),q);vehicle=o.state;}
 for(const code of Object.keys(catalog.prices))for(const brand of ['DELKOR','VARTA']){const q=`폐배터리 반납 안 하고 ${brand} ${code} 총 얼마예요?`,o=turn(q);check(names[11],o.state.quotedSpec===code&&o.state.brand===brand,q);assert.ok(o.messages.includes(priceDescription(code,catalog,brand)),q);}
 const reset=run('처음부터',run('폐배터리 안 주면?').state);assert.equal(reset.state.lastIntent,createConversationState().lastIntent);
 assert.equal(rows.length,917);assert.equal(areas.length,665);assert.equal(j('seo-data/blog-cases.json').posts.length,approvedBlogCount);assert.equal((fs.readFileSync('sitemap.xml','utf8').match(/<loc>/g)||[]).length,1133);
 assert.equal(execFileSync('git',['diff',postSyncBaseline,'--','*.html','*.css','data','seo-data','sitemap.xml','js/smart-consult-brand-comparison.js'],{encoding:'utf8'}),'');
 fs.writeFileSync(path.join(os.tmpdir(),'waste-noncollection-focused.json'),JSON.stringify({count:evidence.length,gates,checks,before,evidence},null,2));
 console.log({count:evidence.length,gates,checks});for(const k of names){assert.ok(checks[k]>0,k);assert.equal(gates[k],0,k);}
}
