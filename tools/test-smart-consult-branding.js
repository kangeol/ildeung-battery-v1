import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {launcherMarkup} from './lib/smart-consult-launcher.js';
import {gn7FactualDelta} from './lib/gn7-factual-regression.js';

const baseline='1dc8e19cb260c9d5b88b6c0036f0faf92e20e24c';
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:100e6});
const files=git(['ls-tree','-r','--name-only',baseline]).trim().split('\n').filter(p=>p.endsWith('.html'));
const batch=execFileSync('git',['cat-file','--batch'],{input:files.map(p=>`${baseline}:${p}\n`).join(''),maxBuffer:100e6});
const lf=s=>s.replace(/\r\n/g,'\n');
let offset=0,launchers=0,vehiclePages=0;
for(const p of files){
  const end=batch.indexOf(10,offset),size=Number(batch.subarray(offset,end).toString().split(' ').at(-1));
  const before=lf(batch.subarray(end+1,end+1+size).toString());offset=end+size+2;
  const actual=lf(fs.readFileSync(p,'utf8'));
  let expected=before.replace(/(<a class="smart-consult-launcher"[^>]*aria-label=")스마트 배터리 상담("[^>]*>[\s\S]*?<span>)스마트 상담(<\/span><\/a>)/g,'$1AI 배터리 상담$2AI 배터리 상담$3');
  if(p==='index.html')expected=expected.replaceAll('스마트 배터리 상담','AI 배터리 상담');
  expected=gn7FactualDelta(expected,p);
  if(p==='smart-consult/index.html')expected=expected.replace('/js/smart-consult.js?v=ai-mobile-v1','/js/smart-consult.js?v=brand-query-v1').replace('/css/smart-consult.css?v=ai-mobile-v1','/css/smart-consult.css?v=consult-ui-v1');
  assert.equal(actual,expected,`${p}: only exact authorized labels may change; all SEO/body/blog/hrefs frozen`);
  assert.equal(/스마트 상담|스마트 배터리 상담/.test(actual),false,`${p}: old customer label`);
  if(actual.includes('class="smart-consult-launcher"')){
    launchers++;
    assert.equal(actual.split(launcherMarkup).length-1,1,`${p}: shared exact launcher`);
  }
  if(p.startsWith('car-battery/'))vehiclePages++;
}
const allowed=new Set(['tools/lib/smart-consult-launcher.js','tools/test-smart-consult-launcher.js','tools/test-smart-consult-viewport.js','tools/test-smart-consult-branding.js','tools/audit-blog-sync-regression.js']);
// Historical label-only change scope, plus the separately verified current factual repair.
execFileSync(process.execPath,['tools/test-battery-certainty-scope.js'],{stdio:'pipe'});
for(const p of git(['diff',baseline,'667b555971603325a4504b6f6e74bd282317c939','--name-only']).trim().split('\n').filter(Boolean)){
  assert.ok(files.includes(p)||allowed.has(p),`${p}: forbidden logic/data/style/sitemap/workflow change`);
}
assert.equal(launchers,1114);
assert.equal(vehiclePages,443);
console.log({status:'PASS',baseline,htmlPages:files.length,launchers,vehiclePages,oldLabels:0,seoBodyBlogHrefChanges:0,logicDataChanges:0});
