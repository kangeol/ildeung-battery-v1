import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gn7FactualDelta} from './lib/gn7-factual-regression.js';
const baseline='667b555971603325a4504b6f6e74bd282317c939';
const git=a=>execFileSync('git',['-c','core.safecrlf=false',...a],{encoding:'utf8',maxBuffer:50e6});
const before=JSON.parse(git(['show',`${baseline}:data/hyundai.json`]));
const after=JSON.parse(fs.readFileSync('data/hyundai.json','utf8'));
const expected=structuredClone(before);
for(const r of expected)if(r.vehicle==='그랜저'&&r.detailModel.includes('(GN7)')){r.defaultBattery='고객센터문의';if(r.fuel==='가솔린 3.3')r.fuel='가솔린 3.5';}
assert.deepEqual(after,expected,'only reviewed GN7 canonical correction');
const paths=git(['diff',baseline,'--name-only']).trim().split('\n').filter(Boolean);
const allowed=new Set(['data/hyundai.json','js/smart-consult-core.js','js/smart-consult-conversation.js','js/smart-consult-session.js','js/smart-consult-entry.js','js/smart-consult.js','smart-consult/index.html','car-battery/hyundai/grandeur.html','car-battery/hyundai/grandeur/gn7.html']);
for(const p of paths){
 assert.ok(allowed.has(p)||p.startsWith('tools/test-')||p.startsWith('tools/audit-battery-')||['tools/lib/gn7-factual-regression.js','tools/lib/smart-consult-page-regression.js','tools/audit-blog-sync-regression.js'].includes(p)||p.startsWith('docs/evidence/battery-certainty/'),`out of scope: ${p}`);
 if(p.endsWith('.html')){
  let expected=gn7FactualDelta(git(['show',`${baseline}:${p}`]).replace(/\r\n/g,'\n'),p);
  if(p==='smart-consult/index.html')expected=expected.replace('/js/smart-consult.js?v=ai-mobile-v1','/js/smart-consult.js?v=certainty-v1');
  assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),expected,`${p}: exact factual delta only`);
 }
}
console.log({status:'PASS',generatedPages:paths.filter(p=>p.startsWith('car-battery/')),protectedSeoStructure:'unchanged',blog:'unchanged',databaseCorrection:'GN7 only'});
