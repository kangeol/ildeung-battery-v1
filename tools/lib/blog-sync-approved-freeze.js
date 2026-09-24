import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
export const postSyncBaseline='6bb884008c7c33e112cd63a9f0de1346350072c9';
export const approvedBlogCount=347;
const git=(...args)=>execFileSync('git',args,{maxBuffer:30e6});
// Only the exact audited remote diff is exempt from historical pre-sync comparisons.
// Every exempt file must still equal the new baseline byte-for-byte.
export const approvedSyncFiles=new Set([
 ...git('diff','--name-only','90b778854867816f317eced828862fccf99a93db','821b74e95cf1b5ffac0503ebbbb9fa060d78c7b7').toString().trim().split(/\r?\n/),
 ...git('diff','--name-only','c28436a00b74183ddbc1fcb45577f270e4a8bbb3',postSyncBaseline).toString().trim().split(/\r?\n/)
]);
for(const p of approvedSyncFiles){const before=git('show',postSyncBaseline+':'+p),now=fs.readFileSync(p);if(p.endsWith('.webp'))assert.deepEqual(now,before,p);else assert.equal(now.toString().replace(/\r\n/g,'\n'),before.toString().replace(/\r\n/g,'\n'),p+' post-sync freeze');}
