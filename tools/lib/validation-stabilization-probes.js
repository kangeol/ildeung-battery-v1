import fs from 'node:fs';
import assert from 'node:assert/strict';
import {canonical,assertApprovedSyncContent} from './blog-sync-approved-freeze.js';
import {assertArchive,contentHash} from './canonical-generated-validation.js';
import {assertHomepageFreeze} from './homepage-approved-freeze.js';
assertHomepageFreeze();
let rejected=0;
const rejects=fn=>{assert.throws(fn);rejected++;};
const html=fs.readFileSync('area/gyeonggi/index.html','utf8');
const firstCase=html.match(/blog\.naver\.com\/kang10107\/(\d+)/)?.[1];
assert.ok(firstCase,'generated page has a canonical blog card');
rejects(()=>assertApprovedSyncContent('area/gyeonggi/index.html',html.replace(firstCase,'invalid-case')));
rejects(()=>assertApprovedSyncContent('area/gyeonggi/index.html',''));
rejects(()=>assertApprovedSyncContent('area/gyeonggi/index.html',html.replace('<h1>','<h1>wrong')));
for(const field of ['id','url']){const a=structuredClone(canonical.archive);a.posts[1][field]=a.posts[0][field];rejects(()=>assertArchive(a));}
const groups=JSON.parse(canonical.groups);
const equalGroups=value=>assert.equal(contentHash(JSON.stringify(value,null,2)+'\n'),contentHash(canonical.groups));
equalGroups(groups);
for(const mutate of [
 a=>{a.generatedAt='1900-01-01'},
 a=>{a.vehiclePages.pop()},
 a=>{a.vehiclePages.push(structuredClone(a.vehiclePages[0]))},
 a=>{a.vehiclePages[0].urlPath='/wrong-mapping/'},
 a=>{a.vehiclePages[0].aliases=['wrong-alias']},
 a=>{a.vehiclePages.reverse()}
]){const a=structuredClone(groups);mutate(a);rejects(()=>equalGroups(a));}
for(const p of ['css/smart-consult-launcher.css','data/hyundai.json','data/battery-prices.json','js/analytics-logger.js','js/unrelated-runtime.js','.github/workflows/deploy.yml'])rejects(()=>assertApprovedSyncContent(p,'unauthorized'));
console.log({canonicalOutputs:Object.keys(canonical.hashes).length,negativeProbes:rejected,status:'PASS'});
