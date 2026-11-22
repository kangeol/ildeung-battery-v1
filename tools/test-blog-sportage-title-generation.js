import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBlogCaseIndex, extractFactsFromPost, buildSafeSummary, getBlogCasesForPage } from './lib/blog-case-matcher.js';
import { renderBlogCaseSection } from './lib/blog-case-renderer.js';
const index = createBlogCaseIndex();
const archive = JSON.parse(fs.readFileSync(new URL('../seo-data/blog-cases.json', import.meta.url), 'utf8'));
const refresh = p => { const facts = extractFactsFromPost(p, index); return {...p, facts, summary: buildSafeSummary(p, facts)}; };
const slugs = p => extractFactsFromPost(p, index).detailModels.filter(x => x.vehicleName === '스포티지').map(x => x.slug);
for (const title of ['송죽동 2021 스포티지 5세대 AGM80 교체', '스포티지5세대 배터리', '5세대 스포티지 배터리']) {
  assert.deepEqual(slugs({title, tags: '스포티지ql 스포티지ql배터리', sourceExcerpt:'스포티지 QL 배터리'}), ['nq5']);
}
assert.deepEqual(slugs({title:'2021 스포티지 AGM80 교체'}), []);
assert.deepEqual(slugs({title:'2021 스포티지 AGM80 교체', tags:'스포티지ql'}), ['ql']);
assert.deepEqual(slugs({title:'스포티지 QL 교체'}), ['ql']);
assert.deepEqual(slugs({title:'스포티지 배터리, 다른 차량 5세대', tags:'스포티지ql'}), ['ql']);
assert.deepEqual(slugs({title:'스포티지 5세대와 스포티지 QL 비교'}), ['ql']);
assert.deepEqual(slugs({title:'스포티지 배터리', sourceExcerpt:'스포티지 5세대', tags:'스포티지ql'}), ['ql']);
for (const title of ['15세대 스포티지 배터리', '스포티지 배터리｜스포티지 5세대 사례와 차이는?', '스포티지 출장배터리교체 가격 및 비용 안내 스포티지 5세대 사례', '스포티지 배터리: 5세대 스포티지 이야기']) {
 assert.deepEqual(slugs({title, tags:'스포티지ql'}), ['ql'], title);
}
const mixed = extractFactsFromPost({title:'스포티지 5세대 및 아반떼 CN7 교체', tags:'스포티지ql'}, index);
assert(mixed.detailModels.some(d => d.slug === 'cn7'));
assert(!mixed.detailModels.some(d => d.slug === 'ql'));
const controls = new Map([['224469979969','nq5'],['224440512205','nq5'],['223924448703','ql'],['223912681778','ql'],['220700823336','sportage-r']]);
for (const [id, expected] of controls) {
 const p=archive.posts.find(p=>p.id===id); assert(p,id); assert(slugs(p).includes(expected),id);
 const r=refresh(p); assert.deepEqual(refresh(r),r,`${id}: repeat extraction`);
}
const posts=archive.posts.map(refresh);
for (const [slug,tier,relation] of [['nq5','D1','exact'],['ql','D2','vehicle']]) {
 const selected=getBlogCasesForPage(posts,{type:'vehicle-detail',canonicalPath:`/car-battery/kia/sportage/${slug}.html`,vehiclePath:'/car-battery/kia/sportage.html',manufacturerId:'kia',asOf:'2026-11-22'});
 const p=selected.find(p=>p.id==='224469979969');assert(p);assert.equal(p.caseSelection.tier,tier);assert.equal(p.caseSelection.relation,relation);
 const html=renderBlogCaseSection(selected);
 const card=[...html.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(m=>m[0]).find(s=>s.includes('data-case-id="224469979969"'));
 assert(card.includes('스포티지 · NQ5'));assert(!card.includes('스포티지 · QL'));assert(card.includes(`data-case-tier="${tier}"`));
 if(relation==='vehicle')assert(card.includes('같은 차종의 작업 사례'));
 if(process.argv.includes('--generated')) {
   const page=fs.readFileSync(new URL(`../car-battery/kia/sportage/${slug}.html`,import.meta.url),'utf8');
   assert(page.includes(card),`${slug}: exact renderer output in generated page`);
 }
}
console.log('PASS Sportage title generation: real case + 4 controls, year ambiguity, model scope, conflict, repeat extraction, D1/D2 rendered cards'+(process.argv.includes('--generated')?' and generated pages':''));
