// Execute the existing production generators in a write-disabled child process.
// The archived sync time is the generation clock, not the day tests happen to run.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const root=fileURLToPath(new URL('../../',import.meta.url));
const lf=value=>value.toString().replace(/\r\n/g,'\n');
export const contentHash=value=>createHash('sha256').update(lf(value)).digest('hex');
export function assertArchive(archive){
 assert.ok(Number.isFinite(Date.parse(archive.syncedAt)),'valid canonical sync clock');
 assert.ok(Array.isArray(archive.posts)&&archive.posts.length>0);
 for(const field of ['id','url']){
  const values=archive.posts.map(p=>String(p[field]||''));
  assert.ok(values.every(Boolean),`missing blog ${field}`);
  assert.equal(new Set(values).size,values.length,`duplicate blog ${field}`);
 }
 for(const post of archive.posts)if(post.thumbnail?.startsWith('/assets/'))assert.ok(fs.existsSync(path.join(root,post.thumbnail)),`missing thumbnail ${post.id}`);
}
export function canonicalGenerated(){
 const archive=JSON.parse(fs.readFileSync(path.join(root,'seo-data/blog-cases.json'),'utf8'));
 assertArchive(archive);
 const script=`
 import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {syncBuiltinESMExports} from 'node:module';import {createHash} from 'node:crypto';
 const read=fs.readFileSync.bind(fs),out=new Map(),log=console.log;console.log=()=>{};
 const archive=JSON.parse(read('seo-data/blog-cases.json','utf8')),D=Date;
 globalThis.Date=class extends D{constructor(...a){super(...(a.length?a:[archive.syncedAt]))}};
 const key=p=>path.resolve(p instanceof URL?fileURLToPath(p):p);
 fs.writeFileSync=(p,c)=>out.set(key(p),Buffer.from(c));fs.mkdirSync=()=>{};
 fs.rmSync=p=>{if(!['area','battery','work-cases'].some(x=>key(p)===path.resolve(x)))throw Error('unexpected deletion '+p)};
 for(const name of ['unlinkSync','renameSync','copyFileSync','appendFileSync'])fs[name]=()=>{throw Error('unexpected mutation '+name)};
 const open=fs.openSync.bind(fs);fs.openSync=(p,flags,...args)=>{if(!['r','rs',0].includes(flags))throw Error('unexpected write-open '+p);return open(p,flags,...args)};
 fs.readFileSync=(p,o)=>{const v=out.get(key(p));return v?(typeof o==='string'||o?.encoding?v.toString():v):read(p,o)};syncBuiltinESMExports();
 for(const p of ['generate-vehicle-seo-pages','generate-area-seo-pages','generate-battery-seo-pages','generate-work-case-pages'])await import('./tools/'+p+'.js');
 const hashes={};for(const [p,v]of out)hashes[path.relative('.',p).replaceAll('\\\\','/')]=createHash('sha256').update(v.toString().replace(/\\r\\n/g,'\\n')).digest('hex');
 log(JSON.stringify({hashes,groups:out.get(path.resolve('seo-data/vehicle-detail-groups.json')).toString()}));
 `;
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:root,encoding:'utf8',maxBuffer:8e6}));
 // Work-case generation leaves the unchanged homepage unwritten. Its non-blog
 // structure remains a separate static contract; a changed blog section is emitted.
 result.hashes['index.html']??=contentHash(fs.readFileSync(path.join(root,'index.html')));
 for(const [p,hash] of Object.entries(result.hashes))assert.equal(contentHash(fs.readFileSync(path.join(root,p))),hash,`${p}: canonical generator mismatch`);
 const generatedHtml=new Set(Object.keys(result.hashes).filter(p=>p.endsWith('.html')));
 for(const folder of ['area','battery','car-battery','work-cases']){
  for(const p of fs.readdirSync(path.join(root,folder),{recursive:true}).filter(p=>p.endsWith('.html')))assert.ok(generatedHtml.has(folder+'/'+p.replaceAll('\\','/')),`extra generated page ${folder}/${p}`);
 }
 return {...result,archive};
}
