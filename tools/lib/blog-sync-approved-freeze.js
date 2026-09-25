import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
export const postSyncBaseline='458ab46419f62584c81eef7c7d4570b95c85e6c7';
export const approvedBlogCount=350;
const git=(...args)=>execFileSync('git',args,{maxBuffer:30e6});
// Only the exact audited remote diff is exempt from historical pre-sync comparisons.
// Every exempt file must still equal the new baseline byte-for-byte.
const previousSyncBaseline='6bb884008c7c33e112cd63a9f0de1346350072c9';
const previousSyncFiles=new Set([
 ...git('diff','--name-only','90b778854867816f317eced828862fccf99a93db','821b74e95cf1b5ffac0503ebbbb9fa060d78c7b7').toString().trim().split(/\r?\n/),
 ...git('diff','--name-only','c28436a00b74183ddbc1fcb45577f270e4a8bbb3',previousSyncBaseline).toString().trim().split(/\r?\n/)
]);
// Pin both audited blog-sync ranges. The intervening local consultation commits
// are intentionally excluded from the generated-content exemption.
const latestBlogFiles=new Set([
 ...git('diff','--name-only','c2a9556b8105995852bdec6c29635eea1cada509','c26840e91c3bdad49178fa0bafae77334f108a76').toString().trim().split(/\r?\n/),
 ...git('diff','--name-only','76affa80eda0e266ffdc161835cd965cd82c9fff',postSyncBaseline).toString().trim().split(/\r?\n/)
]);
export const approvedSyncFiles=new Set([...previousSyncFiles,...latestBlogFiles]);
export function assertApprovedSyncContent(p,now){
 assert.ok(approvedSyncFiles.has(p),p+' is not an audited blog-sync path');
 const before=git('show',(latestBlogFiles.has(p)?postSyncBaseline:previousSyncBaseline)+':'+p);
 if(p.endsWith('.webp'))assert.deepEqual(now,before,p);
 else assert.equal(now.toString().replace(/\r\n/g,'\n'),before.toString().replace(/\r\n/g,'\n'),p+' post-sync freeze');
}
for(const p of approvedSyncFiles)assertApprovedSyncContent(p,fs.readFileSync(p));
