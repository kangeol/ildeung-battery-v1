import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {assertApprovedSyncContent} from './blog-sync-approved-freeze.js';
export function assertHomepageFreeze(){
 const staticBaseline='04d1dc4f9f4412b8a680fe4c38efb82589afabee';
 const withoutCases=s=>s.replace(/<!-- WORK_CASE_HOME_START -->[\s\S]*?<!-- WORK_CASE_HOME_END -->/,'<!-- CANONICAL CASES -->');
 for(const p of ['index.html','css/home-hero-intro.css']){
  const actual=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),expected=execFileSync('git',['show',staticBaseline+':'+p],{encoding:'utf8'}).replace(/\r\n/g,'\n');
  assert.equal(withoutCases(actual),withoutCases(expected),p+' static homepage contract');
  if(p==='index.html')assertApprovedSyncContent(p,Buffer.from(actual));
 }
}
