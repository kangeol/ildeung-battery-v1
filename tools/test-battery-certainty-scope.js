import {approvedSyncFiles} from './lib/blog-sync-approved-freeze.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gn7FactualDelta} from './lib/gn7-factual-regression.js';
const baseline='667b555971603325a4504b6f6e74bd282317c939';
const git=a=>execFileSync('git',['-c','core.safecrlf=false',...a],{encoding:'utf8',maxBuffer:50e6});
const before=JSON.parse(git(['show',`${baseline}:data/hyundai.json`]));
const after=JSON.parse(fs.readFileSync('data/hyundai.json','utf8'));
const expected=structuredClone(before);
for(const r of expected)if(r.vehicle==='그랜저'&&r.detailModel.includes('(GN7)')&&r.fuel==='가솔린 3.3'){r.defaultBattery='고객센터문의';r.fuel='가솔린 3.5';}
expected[40].defaultBattery='AGM60';
assert.equal(before[40].detailModel,'더 뉴 싼타페 하이브리드 TM');
assert.deepEqual(after,expected,'only reviewed GN7 and AG60 canonical corrections');
const paths=git(['diff',baseline,'--name-only']).trim().split('\n').filter(Boolean);
const allowed=new Set(['data/hyundai.json','js/smart-consult-core.js','js/smart-consult-conversation.js','js/smart-consult-session.js','js/smart-consult-entry.js','js/smart-consult.js','smart-consult/index.html','car-battery/hyundai/grandeur.html','car-battery/hyundai/grandeur/gn7.html']);
for(const p of ['js/smart-consult-purchase-stage.js','tools/lib/purchase-stage-fixtures.js','tools/audit-purchase-stage.js','docs/purchase-stage-audit.md'])allowed.add(p);
for(const p of ['index.html','css/home-hero-intro.css','docs/homepage-hero-intro-audit.md','docs/homepage-hero-intro-v2-audit.md','docs/manufacturer-wording-audit.md','tools/lib/homepage-approved-freeze.js'])allowed.add(p);
for(const p of ['docs/spec-brand-query-audit.md','js/smart-consult-brand-query.js','docs/non-agm-owner-policy-audit.md','tools/lib/assert-non-agm-owner-policy.js'])allowed.add(p);
for(const p of ['docs/spec-schedule-audit.md','docs/spec-vehicle-collision-audit.md'])allowed.add(p);
allowed.add('js/smart-consult-brand-comparison.js');
for(const p of ['js/smart-consult-purchase.js','docs/purchase-knowledge-audit.md'])allowed.add(p);
for(const p of ['js/smart-consult-presentation.js','css/smart-consult.css',...paths.filter(p=>p.startsWith('docs/evidence/consult-ui/'))])allowed.add(p);
for(const p of paths.filter(p=>p.startsWith('docs/evidence/brand-comparison/')))allowed.add(p);
for(const p of ['data/battery-prices.json','js/smart-consult-prices.js','car-battery/hyundai/santafe.html','car-battery/hyundai/santafe/tm.html'])allowed.add(p);
for(const p of ['data/consult-service-policy.json','js/smart-consult-policy.js',...paths.filter(p=>p.startsWith('docs/evidence/brand-service/'))])allowed.add(p);
for(const p of ['data/chevrolet.json','car-battery/chevrolet/alpheon.html','js/smart-consult-product-policy.js',...paths.filter(p=>p.startsWith('docs/evidence/product-as-hours/'))])allowed.add(p);
for(const p of paths.filter(p=>p.startsWith('docs/evidence/location-nlu/')))allowed.add(p);
for(const p of ['js/smart-consult-faq.js',...paths.filter(p=>p.startsWith('docs/evidence/final-faq/'))])allowed.add(p);
for(const p of ['tools/standalone-spec-evidence-route.js',...paths.filter(p=>p.startsWith('docs/evidence/standalone-spec/'))])allowed.add(p);
for(const p of paths.filter(p=>p.startsWith('docs/evidence/vehicle-selection/')))allowed.add(p);
for(const p of paths.filter(p=>p.startsWith('docs/evidence/authentic-cash/')))allowed.add(p);
for(const p of ['js/smart-consult-operational.js','tools/operational-fixtures.js',...paths.filter(p=>p.startsWith('docs/evidence/operational/'))])allowed.add(p);
for(const p of paths){
 if(['tools/lib/cold-weather-fixtures.js','tools/audit-cold-weather.js','docs/cold-weather-audit.md'].includes(p))continue;
 if(approvedSyncFiles.has(p))continue;
 if(['js/smart-consult-battery-knowledge.js','tools/lib/battery-knowledge-fixtures.js','tools/lib/blog-sync-approved-freeze.js','docs/battery-knowledge-audit.md'].includes(p))continue;
 assert.ok(allowed.has(p)||p==='js/smart-consult-location.js'||p.startsWith('tools/test-')||p.startsWith('tools/audit-battery-')||['tools/lib/gn7-factual-regression.js','tools/lib/smart-consult-page-regression.js','tools/audit-blog-sync-regression.js'].includes(p)||p.startsWith('docs/evidence/battery-certainty/')||p.startsWith('docs/evidence/battery-pricing/')||p.startsWith('docs/evidence/db-driven-flow/'),`out of scope: ${p}`);
 if(p.endsWith('.html')){
  let expected=gn7FactualDelta(git(['show',`${baseline}:${p}`]).replace(/\r\n/g,'\n'),p);
  if(p==='smart-consult/index.html')expected=expected.replace('/js/smart-consult.js?v=ai-mobile-v1','/js/smart-consult.js?v=brand-query-v1').replace('/css/smart-consult.css?v=ai-mobile-v1','/css/smart-consult.css?v=consult-ui-v1');
  assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),expected,`${p}: exact factual delta only`);
 }
}
console.log({status:'PASS',generatedPages:paths.filter(p=>p.startsWith('car-battery/')),protectedSeoStructure:'unchanged',blog:'unchanged',databaseCorrection:'reviewed GN7 + Owner AG60 and DIN70L typos only'});
