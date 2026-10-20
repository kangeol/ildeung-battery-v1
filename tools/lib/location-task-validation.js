import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gn7FactualDelta} from './gn7-factual-regression.js';

// Owner-approved start, deliberately NOT HEAD: committed task changes must
// remain checked, and old accepted workflow changes are not new permission.
export const taskBaseline='08dad1223abca7f2048144790483084e04f6c5d1';
export const taskPaths=new Set([
 'data/battery-prices.json','tools/test-din74r-price.js','tools/test-battery-pricing.js',
 'tools/lib/din74r-approved-price-delta.js','tools/lib/assert-non-agm-owner-policy.js',
 'tools/test-battery-certainty-scope.js','tools/test-brand-service.js',
 'tools/test-product-as-hours.js','tools/lib/location-task-validation.js',
 'tools/test-location-validation.js','tools/test-location-nlu.js','tools/test-non-agm-owner-policy.js'
]);
for(const p of [
 'master-db/kia.xlsx','data/kia.json','js/smart-consult-core.js','js/vehicle-aliases.js',
 'tools/lib/mohave-approved-data.js','tools/test-mohave.js','tools/generate-vehicle-seo-pages.js',
 'tools/lib/blog-sync-approved-freeze.js',
 'car-battery/index.html','car-battery/kia.html','car-battery/kia/mohave.html',
 'assets/seo/vehicle/kia/mohave.png',
 'seo-data/smart-consult-vehicles.json','seo-data/vehicle-detail-groups.json','sitemap.xml',
 'tools/audit-blog-sync-regression.js','tools/test-smart-consult-v5.js',
 'tools/test-authentic-cash.js','tools/test-battery-certainty.js','tools/test-battery-knowledge.js',
 'tools/test-brand-comparison.js','tools/test-cold-weather.js','tools/test-electrical-load.js',
 'tools/test-operational.js','tools/test-purchase-stage.js','tools/test-smart-consult-conversation.js',
 'tools/test-smart-consult-nlu-v4.js','tools/test-smart-consult.js','tools/test-spec-schedule-safety.js',
 'tools/test-standalone-spec.js','tools/test-vehicle-selection.js','tools/test-waste-noncollection.js'
])taskPaths.add(p);
taskPaths.delete('data/battery-prices.json');
const git=(args,cwd=process.cwd())=>execFileSync('git',['-c','core.safecrlf=false',...args],{cwd,encoding:'utf8',maxBuffer:50e6});
const lines=text=>text.trim().split(/\r?\n/).filter(Boolean);
export function currentTaskChanges(cwd=process.cwd(),baseline=taskBaseline){
 // Owner-approved preexisting untracked files: exclude only exact original bytes.
 // Tracked/staged copies or any edits are still rejected by the task allowlist.
 const preserved={'tools/force_vba_recompile.py':'8fc9d975f52c702edc1362ddfc099d22ee8d1a38a07f7ea26b796698c8d30f20','tools/rebuild_nr_macro.py':'67f0faadefc1081e8c9b98c0dccd1a0fbdb7a0b8dd30ada41b48a60a3ce59756'};
 const untracked=lines(git(['ls-files','--others','--exclude-standard'],cwd)).filter(p=>!preserved[p]||createHash('sha256').update(fs.readFileSync(path.join(cwd,p))).digest('hex')!==preserved[p]);
 return [...new Set([...lines(git(['diff',baseline,'--name-only'],cwd)),...untracked])];
}
export function assertCurrentTaskScope(paths=currentTaskChanges()){
 for(const p of paths)assert.ok(taskPaths.has(p),`out of current task scope: ${p}`);
 return paths;
}
export function assertNoCurrentHtml(paths=currentTaskChanges()){
 const approved=new Set(['car-battery/index.html','car-battery/kia.html','car-battery/kia/mohave.html']);
 assert.deepEqual(paths.filter(p=>p.endsWith('.html')&&!approved.has(p)),[],'current task must not change HTML outside exact Mohave generation');
}
export const productApproval='de199b25c62cf2d6ef0faa1e0e2bb6f9af65f8c8';
const historical=p=>git(['show',p]).replace(/\r\n/g,'\n');
export const traverseApproval='8fa3729ab48a4477c65e6cf411c5e4b1799fe8a7';
export function approvedTraverseRows(before){
 const expected=structuredClone(before);
 const targets=expected.filter(r=>r.manufacturer==='쉐보레'&&r.vehicle==='트래버스'&&r.year==='19년~현재'&&r.fuel==='가솔린'&&r.detailModel==='트래버스');
 assert.equal(targets.length,1,'exactly one approved Traverse row');
 assert.equal(targets[0].defaultBattery,'AGM95','historical Traverse must be AGM95');
 targets[0].defaultBattery='AGM80';
 return expected;
}
let traverseProvenanceChecked=false;
export function assertApprovedTraverseData(current,before){
 if(!traverseProvenanceChecked){
  const parent=JSON.parse(historical(`${traverseApproval}^:data/chevrolet.json`));
  const approved=JSON.parse(historical(`${traverseApproval}:data/chevrolet.json`));
  assert.deepEqual(approved,approvedTraverseRows(parent),'approved commit changes only the exact Traverse specification');
  traverseProvenanceChecked=true;
 }
 assert.deepEqual(current,approvedTraverseRows(before),'only the approved Traverse AGM95 to AGM80 delta');
}
export function assertAlpheonDelta(before,after){
 assert.match(before,/\bDIN70L\b/);
 assert.equal(after,before.replace(/\bDIN70L\b/g,'DIN74L'),'exact approved Alpheon DIN74L correction');
}
export function assertHistoricalProductHtml(baseline){
 const paths=['car-battery/chevrolet/alpheon.html','smart-consult/index.html'];
 assert.deepEqual(lines(git(['diff',baseline,productApproval,'--name-only','--','*.html'])),paths,'fixed historical HTML scope');
 assertAlpheonDelta(historical(`${baseline}:${paths[0]}`),historical(`${productApproval}:${paths[0]}`));
 assert.equal(historical(`${productApproval}:${paths[1]}`),historical(`${baseline}:${paths[1]}`).replace(/\?v=(?:price|brand)-v1/,'?v=product-v1'),'historical consultation entry change only');
 return paths;
}
export function assertHistoricalFactualHtml(){
 const baseline='667b555971603325a4504b6f6e74bd282317c939';
 const paths=['car-battery/hyundai/grandeur.html','car-battery/hyundai/grandeur/gn7.html','car-battery/hyundai/santafe.html','car-battery/hyundai/santafe/tm.html','car-battery/chevrolet/alpheon.html'];
 for(const p of paths)assert.equal(historical(`${productApproval}:${p}`),gn7FactualDelta(historical(`${baseline}:${p}`),p),`${p}: historical factual delta only`);
 return paths;
}
