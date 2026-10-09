import './lib/blog-sync-approved-freeze.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {assertCurrentTaskScope,assertNoCurrentHtml,assertHistoricalFactualHtml,taskBaseline} from './lib/location-task-validation.js';
const baseline='667b555971603325a4504b6f6e74bd282317c939';
const git=a=>execFileSync('git',['-c','core.safecrlf=false',...a],{encoding:'utf8',maxBuffer:50e6});
const before=JSON.parse(git(['show',`${baseline}:data/hyundai.json`]));
const after=JSON.parse(fs.readFileSync('data/hyundai.json','utf8'));
const expected=structuredClone(before);
for(const r of expected)if(r.vehicle==='그랜저'&&r.detailModel.includes('(GN7)')&&r.fuel==='가솔린 3.3'){r.defaultBattery='고객센터문의';r.fuel='가솔린 3.5';}
expected[40].defaultBattery='AGM60';
assert.equal(before[40].detailModel,'더 뉴 싼타페 하이브리드 TM');
assert.deepEqual(after,expected,'only reviewed GN7 and AG60 canonical corrections');
// Historical factual oracles above/below stay fixed; current task permission
// is the exact location repair list, with no generated-file or workflow bypass.
const historicalPages=assertHistoricalFactualHtml();
const paths=assertCurrentTaskScope();
assertNoCurrentHtml(paths);
for(const p of ['css/unrelated-shared.css','js/unrelated-runtime.js','data/hyundai.json','data/battery-prices.json','js/analytics-logger.js','.github/workflows/naver-blog-sync.yml','car-battery/chevrolet/alpheon.html'])assert.throws(()=>assertCurrentTaskScope([p]),/out of current task scope/);
console.log({status:'PASS',taskBaseline,currentTaskPaths:paths,historicalPages,protectedSeoStructure:'unchanged',databaseCorrection:'reviewed GN7 + Owner AG60 and DIN70L typos only'});
