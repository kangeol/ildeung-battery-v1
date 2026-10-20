import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {reconcileSitemap} from '../generate-sitemap.js';

export const mohaveBaseline='08dad1223abca7f2048144790483084e04f6c5d1';
// Owner supplies battery authority. Kia's 2019 and 2024 price/catalogue documents
// establish this detail/fuel range, not a battery-fitment or upgrade assumption:
// https://www.kia.com/content/dam/kwcms/kr/ko/files/NJS/price/price_mohave_the_master.pdf
// https://www.kia.com/content/dam/kwcms/kr/ko/files/RJS/price/price_mohave.pdf
export const approvedMohaveRow=Object.freeze({
 manufacturer:'기아',vehicle:'모하비',year:'19~24년',fuel:'디젤',
 detailModel:'모하비 더 마스터',defaultBattery:'DF100L',upgradeBattery:'',status:'완료'
});
export function approvedMohaveRows(before){
 assert.equal(before.filter(r=>r.vehicle==='모하비'||r.detailModel.includes('모하비')).length,0,'historical Kia contains no Mohave');
 return [...before,structuredClone(approvedMohaveRow)];
}
export const approvedVehicleCount=917+1;
export const approvedVehiclePageCount=427+1;
// Output of the unchanged official thumbnail generator, visually reviewed.
export function assertMohaveThumbnail(bytes=fs.readFileSync('assets/seo/vehicle/kia/mohave.png')){
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'3d68b102b6fc010d2b157e9b20cd15e1a3f304fc05aee095c2cccaf3e8c3cb18','exact approved Mohave thumbnail');
}
export function assertMohaveProtectedPaths(diffPaths){
 const allowed=new Set(['data/kia.json','seo-data/smart-consult-vehicles.json','seo-data/vehicle-detail-groups.json','car-battery/index.html','car-battery/kia.html','car-battery/kia/mohave.html','sitemap.xml']);
 for(const p of diffPaths.trim().split(/\r?\n/).filter(Boolean))assert.ok(allowed.has(p),`unapproved protected change: ${p}`);
 assertMohaveDataset();
 assertMohaveSitemap(fs.readFileSync('sitemap.xml'));
}
export function assertMohaveSitemap(current){
 const before=execFileSync('git',['show',`${mohaveBaseline}:sitemap.xml`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
 const text=current.toString().replace(/\r\n/g,'\n');
 const matches=[...text.matchAll(/  <url>\n\s*<loc>https:\/\/battery1\.co\.kr\/car-battery\/kia\/mohave\.html<\/loc>[\s\S]*?  <\/url>\n/g)];
 assert.equal(matches.length,1,'exactly one new Mohave sitemap entry');
 // Keep historical non-blog entries exact; normal canonical pagination may grow.
 const entries=[...before.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m=>({
  loc:m[1].match(/<loc>(.*?)<\/loc>/)[1],priority:m[1].match(/<priority>(.*?)<\/priority>/)[1]
 })).filter(e=>!e.loc.includes('/work-cases/'));
 entries.push({loc:'https://battery1.co.kr/car-battery/kia/mohave.html',priority:'0.8'});
 for(const p of fs.readdirSync('work-cases',{recursive:true}).filter(p=>p.endsWith('.html'))){
  const relative=p.replaceAll('\\','/'),loc='https://battery1.co.kr/work-cases/'+relative.replace(/index\.html$/,'');
  entries.push({loc,priority:relative==='index.html'?'0.85':'0.65'});
 }
 assert.equal(text,reconcileSitemap(before,entries),'exact approved Mohave addition and canonical blog pagination only');
}
function zipEntries(buffer){
 let end=buffer.length-22;
 while(end>=0&&buffer.readUInt32LE(end)!==0x06054b50)end--;
 assert.ok(end>=0,'valid XLSX ZIP');
 let at=buffer.readUInt32LE(end+16);
 const entries=new Map();
 for(let i=0;i<buffer.readUInt16LE(end+10);i++){
  assert.equal(buffer.readUInt32LE(at),0x02014b50);
  const method=buffer.readUInt16LE(at+10),size=buffer.readUInt32LE(at+20),length=buffer.readUInt16LE(at+28),extra=buffer.readUInt16LE(at+30),comment=buffer.readUInt16LE(at+32),local=buffer.readUInt32LE(at+42);
  const name=buffer.subarray(at+46,at+46+length).toString();
  const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28),data=buffer.subarray(start,start+size);
  assert.ok(method===0||method===8);
  entries.set(name,method===8?inflateRawSync(data):data);
  at+=46+length+extra+comment;
 }
 return entries;
}
export function assertMohaveWorkbook(current=fs.readFileSync('master-db/kia.xlsx')){
 const before=zipEntries(execFileSync('git',['show',`${mohaveBaseline}:master-db/kia.xlsx`],{maxBuffer:2e6})),after=zipEntries(current);
 assert.deepEqual([...after.keys()],[...before.keys()],'workbook native parts preserved');
 for(const [name,bytes] of before){
  if(name!=='xl/worksheets/sheet1.xml'){assert.deepEqual(after.get(name),bytes,name+' unchanged');continue;}
  const values=Object.values(approvedMohaveRow);
  const row='<row r="154">'+values.map((v,i)=>`<c r="${String.fromCharCode(65+i)}154" t="inlineStr"><is><t>${v}</t></is></c>`).join('')+'</row>';
  const expected=bytes.toString().replace('</sheetData>',row+'</sheetData>').replace('ref="A1:H153"','ref="A1:H154"');
  assert.equal(after.get(name).toString(),expected,'only approved appended worksheet row; existing values/styles unchanged');
 }
}
export function assertMohaveDataset(read=p=>JSON.parse(fs.readFileSync(p,'utf8'))){
 const old=p=>JSON.parse(execFileSync('git',['show',`${mohaveBaseline}:${p}`],{encoding:'utf8',maxBuffer:5e6}));
 const manufacturers=read('data/manufacturers.json');
 assert.deepEqual(manufacturers,old('data/manufacturers.json'));
 let count=0;
 for(const m of manufacturers){
  const p='data/'+m.file,current=read(p),before=old(p);
  assert.deepEqual(current,m.id==='kia'?approvedMohaveRows(before):before,`${p}: exact approved Mohave delta only`);
  count+=current.length;
 }
 assert.equal(count,approvedVehicleCount);
 assert.deepEqual(read('data/battery-prices.json'),old('data/battery-prices.json'),'all prices unchanged');
 assertMohaveWorkbook();
 assertMohaveThumbnail();
 return count;
}
