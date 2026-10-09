import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gn7FactualDelta} from './gn7-factual-regression.js';

// Owner-approved start, deliberately NOT HEAD: committed task changes must
// remain checked, and old accepted workflow changes are not new permission.
export const taskBaseline='fb75f056a00b6fb34bc676d5197d587bf14b5f75';
export const taskPaths=new Set([
 'js/smart-consult-location.js','js/smart-consult-conversation.js',
 'tools/test-subregion-coverage.js','tools/test-location-nlu.js',
 'tools/test-db-driven-flow.js','tools/test-smart-consult-conversation.js',
 'tools/test-smart-consult-nlu-v4.js','tools/test-smart-consult-v7.js',
 'tools/test-battery-certainty-scope.js','tools/test-brand-service.js',
 'tools/test-product-as-hours.js','tools/lib/location-task-validation.js',
 'tools/test-location-validation.js'
]);
const git=(args,cwd=process.cwd())=>execFileSync('git',['-c','core.safecrlf=false',...args],{cwd,encoding:'utf8',maxBuffer:50e6});
const lines=text=>text.trim().split(/\r?\n/).filter(Boolean);
export function currentTaskChanges(cwd=process.cwd(),baseline=taskBaseline){
 return [...new Set([...lines(git(['diff',baseline,'--name-only'],cwd)),...lines(git(['ls-files','--others','--exclude-standard'],cwd))])];
}
export function assertCurrentTaskScope(paths=currentTaskChanges()){
 for(const p of paths)assert.ok(taskPaths.has(p),`out of current task scope: ${p}`);
 return paths;
}
export function assertNoCurrentHtml(paths=currentTaskChanges()){
 assert.deepEqual(paths.filter(p=>p.endsWith('.html')),[],'current location task must not change HTML');
}
export const productApproval='de199b25c62cf2d6ef0faa1e0e2bb6f9af65f8c8';
const historical=p=>git(['show',p]).replace(/\r\n/g,'\n');
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
