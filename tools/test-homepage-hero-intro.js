import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const baseline='f98442a3595a80710ed8f22894b52aa7fecab1a2';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:8e6}).replace(/\r\n/g,'\n');
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const before=git('show',baseline+':index.html'),after=read('index.html');
const link='  <link rel="stylesheet" href="css/home-hero-intro.css?v=h1-intro-v1">\n';
const intro='    <div class="homepage-hero-intro">\n      <h1><span>서울·경기·인천</span> <span>출장 자동차 배터리 교체</span></h1>\n      <p>국산차·수입차 차량별 배터리 확인부터 현장 출장 교체까지 빠르게 도와드립니다.</p>\n    </div>\n';
assert.equal((before.match(/<h1\b/gi)||[]).length,0);
assert.equal((after.match(/<h1\b/gi)||[]).length,1);
assert.ok(after.includes(intro));assert.ok(after.includes(link));
assert.equal(after.replace(link,'').replace(intro,''),before,'additive HTML only; all existing content and metadata frozen');
assert.ok(after.includes('<main>\n'+intro+'    <section class="hero-section">'));
const css=read('css/home-hero-intro.css');
for(const selector of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{/g)){
 const s=selector[1].trim();assert.ok(s.startsWith('@media')||s.startsWith('.homepage-hero-intro'),s);
}
assert.doesNotMatch(css,/position\s*:|transform\s*:|(?:margin|padding)[\w-]*\s*:\s*-/);
assert.ok(css.includes('var(--navy)')&&css.includes('var(--blue)')&&css.includes('var(--muted)'));
const allowed=new Set(['index.html','css/home-hero-intro.css','tools/test-homepage-hero-intro.js','docs/homepage-hero-intro-audit.md']);
for(const file of git('diff',baseline,'--name-only').trim().split('\n').filter(Boolean))assert.ok(allowed.has(file),'unexpected changed file: '+file);
assert.equal(read('css/index.css'),git('show',baseline+':css/index.css'),'shared stylesheet frozen');
assert.equal(JSON.parse(read('seo-data/blog-cases.json')).posts.length,345);
assert.equal((read('sitemap.xml').match(/<loc>/g)||[]).length,1133);
console.log(JSON.stringify({status:'PASS',h1Before:0,h1After:1,additiveOnly:true,existingHtmlUnchanged:true,sharedCssUnchanged:true,consultationSourceChanged:0,blog:345,sitemap:1133}));
