import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {inflateRawSync} from 'node:zlib';
import {maskCaseBlocks} from './lib/blog-case-protection.js';
import {approvedBmw2Rows,approvedBmw2Html,bmw2Baseline,bmw2HtmlPaths} from './lib/bmw2-approved-data.js';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
import {parseYearRange,PHONE_HREF} from '../js/smart-consult-core.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const old=p=>execFileSync('git',['show',`${bmw2Baseline}:${p}`],{maxBuffer:10e6});
const makers=read('data/manufacturers.json'),prices=read('data/battery-prices.json');
for(const m of makers){const before=JSON.parse(old('data/'+m.file));assert.deepEqual(read('data/'+m.file),m.id==='bmw'?approvedBmw2Rows(before):before);}
assert.deepEqual(prices,JSON.parse(old('data/battery-prices.json')));
assert.equal(prices.prices.DIN74R,140000);assert.equal(prices.prices.DF100L,120000);
const records=makers.flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities,policy=read('data/consult-service-policy.json');
const turn=(state,text)=>conversationTurn(state,text,records,areas,prices,policy);
const first=text=>turn(createConversationState(),text);
function inquiry(out){
 assert.equal(out.state.selectedVehicleKey,'bmw|2시리즈');
 assert.equal(out.state.confirmedBattery,null);
 assert.match(out.messages.join(' '),/1644-9141/);
 assert.match(out.messages.join(' '),/규격.*가격.*확인/);
 assert.doesNotMatch(out.messages.join(' '),/AGM80|19만원|업그레이드/);
 assert.deepEqual(out.actions,['phone']);
}
const phrases=['BMW2','BMW 2','BMW 2시리즈','BMW 2시리즈 배터리','BMW 2시리즈 가격','BMW 2시리즈 2023년식','BMW 2시리즈 그란쿠페','BMW G42','BMW F22','BMW F44','BMW F74'];
for(const q of phrases){const out=first(q);inquiry(out);inquiry(turn(out.state,'가격'));inquiry(turn(decodeSession(encodeSession(out.state,[])).state,'가격'));}
let rowYearCases=0;
for(const row of records.filter(r=>r.manufacturerId==='bmw'&&r.vehicle==='2시리즈')){
 const range=parseYearRange(row.year);
 for(let year=range.start;year<=(range.end||new Date().getFullYear());year++){
  const state={...createConversationState(),selectedVehicleKey:'bmw|2시리즈',manufacturer:'bmw',manufacturerName:'BMW',vehicleFamily:'2시리즈',detailModel:row.detailModel,exactFuel:row.fuel,year};
  inquiry(turn(state,'가격'));rowYearCases++;
 }
}
for(const q of ['BMW 218','BMW 220']){const out=first(q);assert.equal(out.state.selectedVehicleKey,'');assert.equal(out.state.confirmedBattery,null);}
const x2=first('BMW X2');assert.equal(x2.state.selectedVehicleKey,'bmw|X2');assert.equal(x2.state.confirmedBattery,'AGM70');
const explicit=turn(first('BMW2').state,'AGM80 가격');assert.equal(explicit.state.quotedSpec,'AGM80');assert.match(explicit.messages.join(' '),/19만원/);assert.equal(explicit.state.confirmedBattery,null);
assert.equal(PHONE_HREF,'tel:1644-9141');
function zipEntries(b){let end=b.length-22;while(end>=0&&b.readUInt32LE(end)!==0x06054b50)end--;assert.ok(end>=0);let at=b.readUInt32LE(end+16);const out=new Map();for(let i=0;i<b.readUInt16LE(end+10);i++){const method=b.readUInt16LE(at+10),size=b.readUInt32LE(at+20),n=b.readUInt16LE(at+28),e=b.readUInt16LE(at+30),c=b.readUInt16LE(at+32),local=b.readUInt32LE(at+42),name=b.subarray(at+46,at+46+n).toString(),start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28),bytes=b.subarray(start,start+size);out.set(name,method===8?inflateRawSync(bytes):bytes);at+=46+n+e+c;}return out;}
const before=zipEntries(old('master-db/bmw.xlsx')),after=zipEntries(fs.readFileSync('master-db/bmw.xlsx'));
assert.deepEqual([...after.keys()],[...before.keys()]);
for(const [p,bytes]of before){
 if(p!=='xl/worksheets/sheet1.xml'){assert.deepEqual(after.get(p),bytes,p);continue;}
 let expected=bytes.toString();
 for(let row=8;row<=15;row++){
  const re=new RegExp(`<c\\b(?=[^>]*\\br="F${row}")[^>]*>.*?</c>`,'g');
  assert.equal([...expected.matchAll(re)].length,1);
 }
 // Independently compare the exact original XML with only F8:F15 replaced.
 expected=bytes.toString();
 for(let row=8;row<=15;row++)expected=expected.replace(new RegExp(`<c\\b(?=[^>]*\\br="F${row}")[^>]*>.*?</c>`),cell=>`<c${cell.match(/^<c([^>]*)>/)[1].replace(/\s+t="[^"]*"/g,'')} t="inlineStr"><is><t>고객센터문의</t></is></c>`);
 assert.equal(after.get(p).toString(),expected,'only eight authored battery cells; native workbook parts/styles unchanged');
}
// Official converter with intercepted writes: never rewrite other manufacturers.
const regenerated=execFileSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const log=console.log;console.log=()=>{};fs.writeFileSync=(p,v)=>{if(String(p).endsWith('bmw.json'))log(v)};fs.mkdirSync=()=>{};syncBuiltinESMExports();await import('./tools/convert-excel-to-json.js');`],{encoding:'utf8'});
assert.deepEqual(JSON.parse(regenerated),read('data/bmw.json'));
let negative=0;
const expected=approvedBmw2Rows(JSON.parse(old('data/bmw.json')));
for(const [pick,value]of [[r=>r.vehicle==='2시리즈','AGM80'],[r=>r.vehicle==='X2','AGM95'],[r=>r.vehicle==='5시리즈','DF100L']]){
 const bad=structuredClone(expected);bad.find(pick).defaultBattery=value;assert.throws(()=>assert.deepEqual(bad,expected));negative++;
}
const badPrices=structuredClone(prices);badPrices.prices.AGM80++;assert.throws(()=>assert.deepEqual(badPrices,prices));negative++;
const badReply=first('BMW2');badReply.messages.push('AGM80 19만원');assert.throws(()=>inquiry(badReply));negative++;
for(const p of bmw2HtmlPaths.filter(p=>p.startsWith('car-battery/'))){
 const html=fs.readFileSync(p,'utf8'),prior=old(p).toString();assert.match(html,/차량 확인 필요/);assert.doesNotMatch(html,/<strong>AGM80<\/strong>/);
 const expected=approvedBmw2Html(prior.replace(/\r\n/g,'\n'),p.replace('car-battery/','').replace('.html',''));
 assert.equal(maskCaseBlocks(html.replace(/\r\n/g,'\n')),maskCaseBlocks(expected),'whole historical non-case page plus exact approved inquiry delta');
 for(const mutated of [html.replace('<title>','<title>changed '),html.replace('차량 확인 필요','AGM80'),html.replace('1644-9141','0000-0000')]){
  assert.notEqual(mutated,html);assert.throws(()=>assert.equal(maskCaseBlocks(mutated.replace(/\r\n/g,'\n')),maskCaseBlocks(expected)));negative++;
 }
 for(const re of [/<title>.*?<\/title>/,/<h1[^>]*>.*?<\/h1>/,/<link rel="canonical"[^>]*>/,/<meta name="description"[^>]*>/])assert.deepEqual(html.match(re)?.[0],prior.match(re)?.[0]);
}
assert.doesNotMatch(fs.readFileSync('battery/agm/capacity/agm80.html','utf8'),/2series/);
console.log({status:'PASS',rows:8,rowYearCases,phrases:phrases.length,negativeProbes:negative,excel:'exact eight cells + official converter',prices:'unchanged',x2:'preserved',explicitProductPrice:'preserved'});
