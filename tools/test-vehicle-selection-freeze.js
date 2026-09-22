import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:10e6}).trim();const base='881c3f40cd0c009c1a24dc86d88832c8ed700df8';
const changed=git('diff','--name-only',base).split('\n').filter(Boolean);
const allowed=new Set(['js/smart-consult-conversation.js','js/smart-consult.js','js/smart-consult-entry.js','js/smart-consult-session.js','smart-consult/index.html','tools/test-battery-certainty-scope.js','tools/test-battery-pricing.js','tools/test-brand-service.js','tools/test-product-as-hours.js','tools/test-smart-consult-branding.js','tools/test-smart-consult-viewport.js']);
for(const p of [...changed,...git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean)])assert.ok(allowed.has(p)||p.startsWith('tools/test-vehicle-selection')||p.startsWith('docs/evidence/vehicle-selection/'),p);
assert.deepEqual(changed.filter(p=>p.endsWith('.html')),['smart-consult/index.html']);
assert.equal(fs.readFileSync('smart-consult/index.html','utf8').replace(/\r\n/g,'\n').trim(),git('show',base+':smart-consult/index.html').replace(/\r\n/g,'\n').replace('?v=faq-v1','?v=selection-v1'));
const result={status:'PASS',baseline:base,changed,unexpectedHtml:0,generatedVehicleHtml:0,generatedAreaHtml:0,metadataDiff:0,seoGeoBodyDiff:0,blogCount:JSON.parse(fs.readFileSync('seo-data/blog-cases.json')).posts.length,sitemapCount:(fs.readFileSync('sitemap.xml','utf8').match(/<loc>/g)||[]).length};assert.equal(result.blogCount,345);assert.equal(result.sitemapCount,1133);
fs.mkdirSync('docs/evidence/vehicle-selection',{recursive:true});fs.writeFileSync('docs/evidence/vehicle-selection/freeze.json',JSON.stringify(result,null,2)+'\n');console.log(result);
