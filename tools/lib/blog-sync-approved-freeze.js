import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
export const postSyncBaseline='04d1dc4f9f4412b8a680fe4c38efb82589afabee';
export const approvedBlogCount=357;
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
 ...git('diff','--name-only','76affa80eda0e266ffdc161835cd965cd82c9fff','458ab46419f62584c81eef7c7d4570b95c85e6c7').toString().trim().split(/\r?\n/),
 // Exact audited BLOG357 outputs; never include intervening runtime changes.
 // Reproduced in memory from current generators without writing production files.
 "area/gyeonggi/ansan-si.html",
 "area/gyeonggi/ansan-si/bugok-dong.html",
 "area/gyeonggi/bucheon-si.html",
 "area/gyeonggi/bucheon-si/sosa-dong.html",
 "area/gyeonggi/index.html",
 "area/incheon/geomdan-gu.html",
 "area/incheon/geomdan-gu/dangha-dong.html",
 "area/incheon/index.html",
 "area/incheon/yeonsu-gu.html",
 "area/incheon/yeonsu-gu/yeonsu-dong.html",
 "area/index.html",
 "area/seoul/gangnam-gu.html",
 "area/seoul/gangnam-gu/nonhyeon-dong.html",
 "area/seoul/gangseo-gu.html",
 "area/seoul/gangseo-gu/deungchon-dong.html",
 "area/seoul/index.html",
 "area/seoul/yeongdeungpo-gu.html",
 "assets/blog-cases/224416813963.webp",
 "assets/blog-cases/224416817410.webp",
 "assets/blog-cases/224416821101.webp",
 "assets/blog-cases/224416824321.webp",
 "assets/blog-cases/224418409320.webp",
 "assets/blog-cases/224418415339.webp",
 "assets/blog-cases/224418433356.webp",
 "battery/agm/capacity/agm70.html",
 "battery/agm/capacity/agm80.html",
 "battery/agm/capacity/agm95.html",
 "battery/agm/delkor.html",
 "battery/agm/index.html",
 "battery/agm/price.html",
 "battery/agm/varta.html",
 "battery/battery-discharge.html",
 "battery/battery-life.html",
 "battery/car-battery.html",
 "battery/delkor-battery.html",
 "battery/import-car-battery.html",
 "battery/index.html",
 "battery/mobile-replacement.html",
 "battery/price.html",
 "battery/replacement-cost.html",
 "battery/replacement.html",
 "car-battery/benz.html",
 "car-battery/benz/c-class.html",
 "car-battery/benz/c-class/w204.html",
 "car-battery/benz/c-class/w205.html",
 "car-battery/benz/c-class/w206.html",
 "car-battery/benz/e-class.html",
 "car-battery/benz/e-class/w211.html",
 "car-battery/benz/e-class/w212.html",
 "car-battery/benz/e-class/w213.html",
 "car-battery/benz/e-class/w214.html",
 "car-battery/bmw.html",
 "car-battery/bmw/5-series.html",
 "car-battery/bmw/5-series/g30.html",
 "car-battery/index.html",
 "car-battery/mini.html",
 "car-battery/mini/clubman.html",
 "car-battery/renault.html",
 "car-battery/renault/sm6.html",
 "car-battery/renault/sm6/the-new-sm6.html",
 "car-battery/renault/sm7.html",
 "car-battery/renault/sm7/sm7-nova.html",
 "car-battery/volvo.html",
 "car-battery/volvo/v60.html",
 "car-battery/volvo/v60/v60-2.html",
 "index.html",
 "seo-data/blog-cases.json",
 "work-cases/index.html",
 "work-cases/page/10/index.html",
 "work-cases/page/11/index.html",
 "work-cases/page/12/index.html",
 "work-cases/page/13/index.html",
 "work-cases/page/14/index.html",
 "work-cases/page/15/index.html",
 "work-cases/page/16/index.html",
 "work-cases/page/17/index.html",
 "work-cases/page/18/index.html",
 "work-cases/page/2/index.html",
 "work-cases/page/3/index.html",
 "work-cases/page/4/index.html",
 "work-cases/page/5/index.html",
 "work-cases/page/6/index.html",
 "work-cases/page/7/index.html",
 "work-cases/page/8/index.html",
 "work-cases/page/9/index.html",
]);
export const approvedSyncFiles=new Set([...previousSyncFiles,...latestBlogFiles]);
export function assertApprovedSyncContent(p,now){
 assert.ok(approvedSyncFiles.has(p),p+' is not an audited blog-sync path');
 const before=git('show',(latestBlogFiles.has(p)?postSyncBaseline:previousSyncBaseline)+':'+p);
 if(p.endsWith('.webp'))assert.deepEqual(now,before,p);
 else assert.equal(now.toString().replace(/\r\n/g,'\n'),before.toString().replace(/\r\n/g,'\n'),p+' post-sync freeze');
}
for(const p of approvedSyncFiles)assertApprovedSyncContent(p,fs.readFileSync(p));
