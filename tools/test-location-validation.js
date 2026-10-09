import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {currentTaskChanges,assertCurrentTaskScope,assertNoCurrentHtml,assertHistoricalProductHtml,assertHistoricalFactualHtml,assertAlpheonDelta,productApproval} from './lib/location-task-validation.js';
import {canonical,assertApprovedSyncContent} from './lib/blog-sync-approved-freeze.js';

assertHistoricalProductHtml('4b7ce6fbb2f0747e05a56bac96a54fc637a56322');
assertHistoricalProductHtml('851da26adb81d2b608548dcfb00e08326dc35c53');
assertHistoricalFactualHtml();
assertCurrentTaskScope();assertNoCurrentHtml();
const tempRoot=fs.realpathSync(os.tmpdir());
const fixture=fs.mkdtempSync(path.join(tempRoot,'ildeung-location-validator-'));
const git=args=>execFileSync('git',['-c','core.autocrlf=false',...args],{cwd:fixture,encoding:'utf8'}).trim();
const write=(p,value)=>{const target=path.resolve(fixture,p);assert.ok(target.startsWith(fixture+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);};
const blocked=['.github/workflows/naver-blog-sync.yml','data/battery-prices.json','data/hyundai.json','css/smart-consult.css','area/gyeonggi/index.html','js/analytics-logger.js','js/unrelated-runtime.js'];
let rejected=0;
try{
 git(['init','--quiet']);git(['config','user.name','Isolated validation fixture']);git(['config','user.email','fixture@example.invalid']);
 for(const p of blocked)write(p,'approved before task\n');
 write('js/smart-consult-location.js','baseline\n');write('tools/test-subregion-coverage.js','baseline\n');
 git(['add','.']);git(['commit','--quiet','-m','Accepted pre-task files']);
 // Model an accepted sync BEFORE the fixed task baseline, not a blanket exemption.
 write('area/gyeonggi/index.html','approved sync output\n');git(['add','.']);git(['commit','--quiet','-m','Sync Naver blog work cases']);
 const baseline=git(['rev-parse','HEAD']);
 assert.deepEqual(currentTaskChanges(fixture,baseline),[]);
 write('js/smart-consult-location.js','authorized runtime change\n');write('tools/test-subregion-coverage.js','authorized test change\n');
 assertCurrentTaskScope(currentTaskChanges(fixture,baseline));
 git(['add','.']);git(['commit','--quiet','-m','Authorized task changes']);
 assert.equal(currentTaskChanges(fixture,baseline).length,2,'committed changes must remain visible');
 assertCurrentTaskScope(currentTaskChanges(fixture,baseline));
 for(const p of blocked){
  const original=fs.readFileSync(path.join(fixture,p));write(p,'unauthorized mutation\n');
  assert.throws(()=>assertCurrentTaskScope(currentTaskChanges(fixture,baseline)),/out of current task scope/);
  if(p.endsWith('.html'))assert.throws(()=>assertNoCurrentHtml(currentTaskChanges(fixture,baseline)),/must not change HTML/);
  write(p,original);rejected++;
 }
 // Rejection also holds AFTER an unauthorized file has been committed.
 write(blocked[0],'committed unauthorized workflow\n');git(['add','.']);git(['commit','--quiet','-m','Negative committed workflow probe']);
 assert.throws(()=>assertCurrentTaskScope(currentTaskChanges(fixture,baseline)),/out of current task scope/);rejected++;
 const page='car-battery/chevrolet/alpheon.html';
 const old=execFileSync('git',['show','851da26adb81d2b608548dcfb00e08326dc35c53:'+page],{encoding:'utf8'}).replace(/\r\n/g,'\n');
 const approved=execFileSync('git',['show',productApproval+':'+page],{encoding:'utf8'}).replace(/\r\n/g,'\n');
 write(page,approved);assertAlpheonDelta(old,fs.readFileSync(path.join(fixture,page),'utf8'));
 write(page,approved.replace(/DIN74L/g,'DIN70L'));
 assert.throws(()=>assertAlpheonDelta(old,fs.readFileSync(path.join(fixture,page),'utf8')),/exact approved Alpheon/);rejected++;
 assert.ok(canonical.hashes[page]);
 write(page,fs.readFileSync(page));assertApprovedSyncContent(page,fs.readFileSync(path.join(fixture,page)));
 write(page,fs.readFileSync(page,'utf8')+'<!-- corruption -->');
 assert.throws(()=>assertApprovedSyncContent(page,fs.readFileSync(path.join(fixture,page))),/canonical generation/);rejected++;
}finally{
 const resolved=fs.realpathSync(fixture);assert.equal(path.dirname(resolved),tempRoot);assert.ok(path.basename(resolved).startsWith('ildeung-location-validator-'));
 fs.rmSync(resolved,{recursive:true});
}
console.log({status:'PASS',negativeProbes:rejected,approvedRuntimeAndTest:'PASS',acceptedPreTaskSync:'PASS',committedScopeProtection:'PASS',historicalOracles:'PASS',canonicalCorruption:'REJECTED'});
