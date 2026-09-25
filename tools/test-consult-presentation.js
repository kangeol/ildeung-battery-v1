import {approvedSyncFiles,postSyncBaseline,approvedBlogCount} from './lib/blog-sync-approved-freeze.js';
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {presentationIndex,messagePresentation,lookupStatus,lookupDelay,phoneProminence,literalParts} from '../js/smart-consult-presentation.js';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {priceDescription} from '../js/smart-consult-prices.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json'),index=presentationIndex(catalog,policy),rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=read('seo-data/smart-consult-location-index.json').localities;
let checks=0;const check=(condition,label)=>{checks++;assert.ok(condition,label);};
for(const [text,price]of index.prices){const model=messagePresentation(text,index);check(model.lines[0].price===price,'canonical metadata');check(literalParts(text,[price.code,price.brand,price.amount]).map(p=>p.text).join('')===text,'verbatim canonical price');}
for(const text of ['<img src=x onerror=alert(1)>','AGM999 1원','AGM105는 BMW에 장착됩니다','',priceDescription('AGM70 또는 AGM80',catalog),'현재 바르타 AGM60은 확인 필요']){
 check(messagePresentation(text,index).lines.map(l=>l.text).join('\n')===text,'lossless paragraph model');check(literalParts(text,['AGM105','바르타']).map(p=>p.text).join('')===text,'lossless tokens');}
const turn=(state,q)=>conversationTurn(state,q,rows,areas,catalog,policy);
const fresh=createConversationState(),priced=turn(fresh,'BMW 5시리즈 2020년식').state;
for(const state of [fresh,priced,turn(fresh,'구월동').state,turn(priced,'바르타는?').state,turn(fresh,'G90').state])for(const q of ['현금되나요?','정품인가요?','예약되나요?','오늘 되나요?','카드','작업시간','몇 월 생산이에요?']){const r=turn(state,q),status=lookupStatus(r,state,null,index);check(status===null,q+' no lookup feedback');check(lookupDelay(status,0,false)===0,q+' no artificial FAQ delay');}
for(const q of ['BMW 5시리즈 2020년식','AGM105','G90','구월동']){const r=turn(fresh,q),status=lookupStatus(r,fresh,null,index);check(Boolean(status),q+' lookup');for(const elapsed of [0,100,299,300,1000]){check(lookupDelay(status,elapsed,false)<=300,'bounded deterministic delay');check(lookupDelay(status,elapsed,true)===0,'reduced motion no delay');}}
check(lookupStatus(turn(fresh,'G90'),fresh,{type:'vehicle-candidate'},index)==='선택하신 차량을 확인하고 있어요…','candidate-specific feedback');
for(const q of ['예약되나요?','오늘 되나요?','몇 월 생산이에요?'])check(phoneProminence(turn(fresh,q),index),q+' phone emphasis');
for(const q of ['현금되나요?','정품인가요?','AGM105','BMW 5시리즈 2020년식','델코랑 바르타 차이'])check(!phoneProminence(turn(fresh,q),index),q+' answer primary');
const baseline='eb10f9f516ee85e384cd8b01e0e53f7098382034',git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:30e6});
const changed=git(['diff',baseline,'--name-only']).trim().split('\n').filter(Boolean),allowed=new Set(['js/smart-consult.js','js/smart-consult-presentation.js','css/smart-consult.css','smart-consult/index.html','tools/test-smart-consult-viewport.js','tools/test-smart-consult-branding.js','tools/test-battery-certainty-scope.js']);
for(const p of ['tools/test-battery-pricing.js','tools/test-brand-service.js','tools/test-product-as-hours.js'])allowed.add(p);
// Subsequent authorized NLU remediation; presentation assertions stay unchanged.
for(const p of ['js/smart-consult-conversation.js','js/smart-consult-prices.js','js/smart-consult-operational.js','js/smart-consult-product-policy.js','js/smart-consult-entry.js','js/smart-consult-session.js','tools/test-spec-schedule.js','tools/test-spec-schedule-browser.js','tools/test-spec-schedule-safety.js','docs/spec-schedule-audit.md'])allowed.add(p);
for(const p of ['tools/test-spec-vehicle-collision.js','tools/test-spec-vehicle-collision-browser.js','docs/spec-vehicle-collision-audit.md'])allowed.add(p);
for(const p of ['data/consult-service-policy.json','js/smart-consult-purchase.js','tools/test-purchase-knowledge.js','tools/test-purchase-knowledge-browser.js','docs/purchase-knowledge-audit.md','tools/test-brand-comparison.js','tools/test-operational.js','tools/test-authentic-cash.js'])allowed.add(p);
allowed.add('tools/test-final-faq.js');
for(const p of ['tools/test-waste-noncollection.js','docs/waste-noncollection-audit.md'])allowed.add(p);
for(const p of ['js/smart-consult-purchase-stage.js','tools/lib/purchase-stage-fixtures.js','tools/audit-purchase-stage.js','tools/test-purchase-stage.js','tools/test-purchase-stage-browser.js','docs/purchase-stage-audit.md'])allowed.add(p);
for(const p of ['tools/lib/cold-weather-fixtures.js','tools/audit-cold-weather.js','tools/test-cold-weather.js','tools/test-cold-weather-browser.js','docs/cold-weather-audit.md'])allowed.add(p);
allowed.add('tools/test-smart-consult-launcher.js'); // Exact audited blog-sync snapshot update only.
for(const p of ['js/smart-consult-battery-knowledge.js','tools/lib/battery-knowledge-fixtures.js','tools/lib/blog-sync-approved-freeze.js','tools/audit-battery-knowledge.js','tools/test-battery-knowledge.js','tools/test-battery-knowledge-browser.js','docs/battery-knowledge-audit.md'])allowed.add(p);
allowed.add('tools/lib/gn7-factual-regression.js');allowed.add('tools/lib/homepage-approved-freeze.js');
for(const p of ['tools/test-location-nlu.js','tools/lib/assert-non-agm-owner-policy.js'])allowed.add(p);
for(const p of ['data/battery-prices.json','js/smart-consult-brand-comparison.js','tools/test-non-agm-owner-policy.js','tools/test-non-agm-owner-browser.js','docs/non-agm-owner-policy-audit.md'])allowed.add(p);
for(const p of ['js/smart-consult-brand-query.js','tools/test-spec-brand-query.js','tools/test-spec-brand-query-browser.js','docs/spec-brand-query-audit.md','tools/test-battery-pricing.js','tools/test-battery-certainty-scope.js','tools/test-brand-service.js','tools/test-product-as-hours.js','tools/test-smart-consult-branding.js','tools/test-smart-consult-viewport.js'])allowed.add(p);
// Approved homepage stack is frozen byte-for-byte at this task's baseline.
for(const p of ['index.html','css/home-hero-intro.css','docs/homepage-hero-intro-audit.md','docs/homepage-hero-intro-v2-audit.md']){check(git(['diff',postSyncBaseline,'--',p])==='','homepage freeze '+p);allowed.add(p);}
// This task reconciles the stale snapshot test itself; production homepage files stay byte-frozen above.
allowed.add('tools/test-homepage-hero-intro.js');
for(const p of ['tools/test-manufacturer-wording.js','tools/test-manufacturer-browser.js','docs/manufacturer-wording-audit.md'])allowed.add(p);
// Authorized token-boundary remediation changes matching only; all presentation
// byte comparisons below remain mandatory and unchanged.
for(const p of ['js/smart-consult-core.js','js/vehicle-aliases.js','tools/test-vehicle-token-boundary.js'])allowed.add(p);
// Narrow amount-word routing only; the UI and protected-page assertions stay intact.
for(const p of ['js/smart-consult-nonmonetary.js','tools/test-nonmonetary-eolma.js'])allowed.add(p);
for(const p of ['js/smart-consult-electrical-load.js','tools/test-electrical-load.js','tools/lib/smart-consult-page-regression.js'])allowed.add(p);
// Exact P1A follow-up paths; shared UI and unrelated runtime paths remain forbidden.
for(const p of ['js/smart-consult-battery-knowledge.js','tools/test-elliptical-load.js'])allowed.add(p);
allowed.add('tools/test-no-start-n1.js'); // Focused N1 routing regression; no presentation asset is permitted.
for(const p of ['tools/frozen-corpus-change-registry.json','tools/frozen-corpus-unapproved-review.json','tools/lib/frozen-corpus-semantic-evaluator.js','tools/test-frozen-corpus-semantic.js','tools/test-frozen-corpus-semantic-self.js','tools/test-no-start-n1-boundaries.js'])allowed.add(p);
for(const p of ['tools/test-scope-governance.js','docs/evidence/authentic-cash/focused.json','docs/evidence/battery-certainty/simulation.json','docs/evidence/brand-comparison/focused.json','docs/evidence/final-faq/faq.json','docs/evidence/final-faq/location/matrix.json','docs/evidence/final-faq/regression-results.json','docs/evidence/final-faq/regression/brand-service.json','docs/evidence/final-faq/regression/matrix.json','docs/evidence/final-faq/regression/pricing.json','docs/evidence/final-faq/regression/product-as-hours.json','docs/evidence/final-faq/regression/simulation.json','docs/evidence/product-as-hours/product-as-hours.json','docs/evidence/vehicle-selection/mass-after.json'])allowed.add(p);
// Exact Tier2 routing paths; shared CSS and unrelated presentation runtime stay forbidden.
for(const p of ['js/smart-consult-location.js','js/smart-consult-brand-comparison.js','tools/test-smart-consult-nlu-v4.js'])allowed.add(p);
// Exact Tier2 policy-routing and focused-test paths; no presentation assets.
for(const p of ['js/smart-consult-purchase.js','tools/test-tier2-remaining-scope.js','tools/test-tier2-u4-service-followup.js','tools/test-db-driven-flow.js','tools/test-smart-consult-v5.js','tools/test-smart-consult-v7.js'])allowed.add(p);
check(allowed.has('js/smart-consult-battery-knowledge.js'),'authorized P1A knowledge runtime');
check(allowed.has('tools/test-elliptical-load.js'),'authorized P1A focused test');
check(!allowed.has('css/index.css'),'unrelated shared UI remains forbidden');
check(!allowed.has('js/unapproved-presentation-runtime.js'),'unrelated runtime remains forbidden');
for(const p of changed.filter(p=>!approvedSyncFiles.has(p)))check(allowed.has(p)||p.startsWith('tools/test-consult-presentation')||p.startsWith('docs/evidence/consult-ui/'),'scope '+p);
const html=fs.readFileSync('smart-consult/index.html','utf8').replaceAll('\r\n','\n'),before=git(['show',baseline+':smart-consult/index.html']).replaceAll('\r\n','\n');
check(html===before.replace('/css/smart-consult.css?v=ai-mobile-v1','/css/smart-consult.css?v=consult-ui-v1').replace('/js/smart-consult.js?v=brand-compare-v1','/js/smart-consult.js?v=brand-query-v1'),'HTML only two cache tokens');
check(read('seo-data/blog-cases.json').posts.length===approvedBlogCount,'approved blog count');check((fs.readFileSync('sitemap.xml','utf8').match(/<loc>/g)||[]).length===1133,'sitemap1133');
const source=fs.readFileSync('js/smart-consult.js','utf8');check(!source.includes('innerHTML'),'XSS text-only DOM');check(!source.includes('Math.random')&&!source.includes('setInterval'),'no random/typewriter');
console.log(JSON.stringify({status:'PASS',checks,canonicalPriceLines:index.prices.size,vehicleRows:rows.length,areas:areas.length,blog:approvedBlogCount,sitemap:1133,gates:{TYPEWRITER_EFFECT_PRESENT:0,RANDOM_FAKE_DELAY_PRESENT:0,SIMPLE_FAQ_ARTIFICIAL_DELAY:0,LOOKUP_PRESENTATION_DELAY_OVER_600MS:0},changed}));
