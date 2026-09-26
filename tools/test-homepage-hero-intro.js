import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {assertApprovedSyncContent} from './lib/blog-sync-approved-freeze.js';
const baseline='f98442a3595a80710ed8f22894b52aa7fecab1a2';
const approvedPostSyncBaseline='458ab46419f62584c81eef7c7d4570b95c85e6c7';
const approvedP1AHead='eeebe36f0ab793478ff5faf99f9709a03c09472c';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:8e6}).replace(/\r\n/g,'\n');
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const before=git('show',baseline+':index.html'),after=read('index.html');
const approvedPostSyncHtml=git('show',approvedPostSyncBaseline+':index.html');
const link='  <link rel="stylesheet" href="css/home-hero-intro.css?v=h1-intro-v1">\n';
const intro='    <div class="homepage-hero-intro">\n      <h1><span>서울·경기·인천</span> <span>출장 자동차 배터리 교체</span></h1>\n      <p>국산차·수입차 전 차종 배터리 출장 교체</p>\n    </div>\n';
assert.equal((before.match(/<h1\b/gi)||[]).length,0);
assert.equal((after.match(/<h1\b/gi)||[]).length,1);
assert.ok(after.includes(intro));assert.ok(after.includes(link));
assert.equal(after,approvedPostSyncHtml,'homepage HTML exactly matches the audited post-blog-sync baseline');
assert.ok(after.includes('<main>\n'+intro+'    <section class="hero-section">'));
const css=read('css/home-hero-intro.css');
for(const selector of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{/g)){
 const s=selector[1].trim();assert.ok(s.startsWith('@media')||s.startsWith('.homepage-hero-intro'),s);
}
assert.doesNotMatch(css,/position\s*:|transform\s*:|(?:margin|padding)[\w-]*\s*:\s*-/);
assert.ok(css.includes('var(--navy)')&&css.includes('var(--blue)')&&css.includes('var(--muted)'));
const parent='33b8d5c19bd5723baf3c80de2978f70b6f4f84ea';
assert.ok(git('show',parent+':index.html').includes('서울·경기·인천</span> <span>출장 자동차 배터리 교체'),'approved parent contains exact H1');
assert.equal(css,git('show',parent+':css/home-hero-intro.css').replace('padding-top: 20px','padding-top: 14px').replace('font-size: 26px','font-size: 22px').replace('margin-top: 10px','margin-top: 6px').replace('font-size: 15px','font-size: 12px'),'V2 only four scoped mobile values; desktop overrides unchanged');
const allowed=new Set(['index.html','css/home-hero-intro.css','tools/test-homepage-hero-intro.js','docs/homepage-hero-intro-audit.md','docs/homepage-hero-intro-v2-audit.md']);
const approvedPaths=new Set(git('diff',baseline,approvedP1AHead,'--name-only').trim().split('\n').filter(Boolean));
const auditedBlogPaths=new Set([
 ...git('diff','c2a9556b8105995852bdec6c29635eea1cada509','c26840e91c3bdad49178fa0bafae77334f108a76','--name-only').trim().split('\n').filter(Boolean),
 ...git('diff','76affa80eda0e266ffdc161835cd965cd82c9fff',approvedPostSyncBaseline,'--name-only').trim().split('\n').filter(Boolean)
]);
const approvedN1TestPath='tools/test-no-start-n1.js';
assert.ok(git('diff-tree','--no-commit-id','--name-only','-r','83b8fe7496f2c6e078b4ca764afab329418446a8').split('\n').includes(approvedN1TestPath),'N1 commit must contain the exact focused test');
const currentValidationPaths=new Set(['tools/test-consult-presentation.js','tools/lib/blog-sync-approved-freeze.js','tools/frozen-corpus-change-registry.json','tools/frozen-corpus-unapproved-review.json','tools/lib/frozen-corpus-semantic-evaluator.js','tools/test-frozen-corpus-semantic.js','tools/test-frozen-corpus-semantic-self.js','tools/test-no-start-n1-boundaries.js','tools/test-scope-governance.js','js/smart-consult-conversation.js','js/smart-consult-purchase.js','tools/test-tier2-remaining-scope.js','docs/evidence/authentic-cash/focused.json','docs/evidence/battery-certainty/simulation.json','docs/evidence/brand-comparison/focused.json','docs/evidence/final-faq/faq.json','docs/evidence/final-faq/location/matrix.json','docs/evidence/final-faq/regression-results.json','docs/evidence/final-faq/regression/brand-service.json','docs/evidence/final-faq/regression/matrix.json','docs/evidence/final-faq/regression/pricing.json','docs/evidence/final-faq/regression/product-as-hours.json','docs/evidence/final-faq/regression/simulation.json','docs/evidence/product-as-hours/product-as-hours.json','docs/evidence/vehicle-selection/mass-after.json']);
for(const path of ['js/smart-consult-launcher.js','js/smart-consult-store-open.js','tools/test-smartstore-open.js'])currentValidationPaths.add(path); // Exact shared SmartStore opener scope only.
currentValidationPaths.add('tools/lib/canonical-release-runtime.js'); // Already committed current release identity utility.
for(const path of ['js/smart-consult-brand-comparison.js','js/smart-consult-location.js','tools/test-smart-consult-nlu-v4.js','tools/test-location-nlu.js','docs/evidence/location-nlu/matrix.json'])currentValidationPaths.add(path); // Exact Tier2 NLU scope only.
for(const path of ['docs/evidence/location-nlu/regression-results.json','docs/evidence/location-nlu/regression/brand-service.json','docs/evidence/location-nlu/regression/matrix.json','docs/evidence/location-nlu/regression/pricing.json','docs/evidence/location-nlu/regression/product-as-hours.json','docs/evidence/location-nlu/regression/simulation.json'])currentValidationPaths.add(path); // Existing reviewed location-NLU evidence, not a directory allowance.
// Exact previously approved Tier2 state-test baselines; no directory allowance.
for(const file of ['tools/test-db-driven-flow.js','tools/test-smart-consult-v5.js','tools/test-smart-consult-v7.js','tools/test-tier2-u4-service-followup.js'])currentValidationPaths.add(file);
// Reviewed, exact core-workstream regression paths; keep arbitrary tests barred.
for(const file of ['tools/test-minimal-core-ws1-ws2.js','tools/test-minimal-core-ws3-ws4.js','tools/test-store-visit-schedule-boundary.js','js/smart-consult-faq.js'])currentValidationPaths.add(file);
const allowedScopePath=file=>allowed.has(file)||approvedPaths.has(file)||auditedBlogPaths.has(file)||file===approvedN1TestPath||currentValidationPaths.has(file);
assert.equal(allowedScopePath('js/unapproved-homepage-runtime.js'),false,'unrelated runtime path must remain forbidden');
assert.equal(allowedScopePath('tools/test-unapproved-feature.js'),false,'unrelated test path must remain forbidden');
for(const file of git('diff',baseline,'--name-only').trim().split('\n').filter(Boolean))assert.ok(allowedScopePath(file),'unexpected changed file: '+file);
assert.ok(!allowed.has('css/index.css')&&!approvedPaths.has('css/index.css'),'unapproved shared CSS remains forbidden');
assert.equal(read('css/index.css'),git('show',approvedPostSyncBaseline+':css/index.css'),'shared stylesheet frozen at audited baseline');
assert.equal(JSON.parse(read('seo-data/blog-cases.json')).posts.length,350);
assert.equal((read('sitemap.xml').match(/<loc>/g)||[]).length,1133);
const blogPath='seo-data/blog-cases.json',blogBytes=fs.readFileSync(blogPath),blog=JSON.parse(blogBytes);
const newest=['224416803646','224416807190'];
for(const id of newest)assert.ok(blog.posts.some(post=>String(post.id)===id),'audited newest blog ID '+id);
assertApprovedSyncContent(blogPath,blogBytes);
const rejectsBlog=posts=>assert.throws(()=>assertApprovedSyncContent(blogPath,Buffer.from(JSON.stringify({...blog,posts}))));
rejectsBlog(blog.posts.slice(0,-1)); // BLOG349
rejectsBlog([...blog.posts,{...blog.posts[0],id:'synthetic-extra-blog'}]); // BLOG351 / extra ID
for(const id of newest)rejectsBlog(blog.posts.filter(post=>String(post.id)!==id));
assert.throws(()=>assertApprovedSyncContent('css/index.css',Buffer.from('synthetic CSS change')));
assert.throws(()=>assertApprovedSyncContent('js/smart-consult-conversation.js',Buffer.from('synthetic runtime change')));
assert.throws(()=>assertApprovedSyncContent('data/battery-prices.json',Buffer.from('synthetic price change')));
assert.throws(()=>assertApprovedSyncContent('data/hyundai.json',Buffer.from('synthetic vehicle DB change')));
assert.throws(()=>assertApprovedSyncContent('sitemap.xml',Buffer.from('<loc>synthetic</loc>')));
assertApprovedSyncContent('index.html',Buffer.from(after));
assert.throws(()=>assertApprovedSyncContent('index.html',Buffer.from(after.replace('<h1><span>서울·경기·인천</span> <span>출장 자동차 배터리 교체</span></h1>','<h1>synthetic H1</h1>'))));
assert.throws(()=>assertApprovedSyncContent('index.html',Buffer.from(after.replace('<p>국산차·수입차 전 차종 배터리 출장 교체</p>','<p>synthetic support</p>'))));
console.log(JSON.stringify({status:'PASS',h1Before:(before.match(/<h1\b/gi)||[]).length,h1After:(after.match(/<h1\b/gi)||[]).length,approvedPostSyncSnapshot:true,sharedCssUnchanged:true,consultationSourceChanged:0,blog:350,sitemap:1133}));
