import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolveLocation,classifyLocationAliases} from '../js/smart-consult-location.js';
import {normalizeText} from '../js/smart-consult-core.js';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read(`data/${m.file}`).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const aliases=classifyLocationAliases(areas);
const patterns=['{A}','{A}입니다','지역은 {A}입니다','{A}이에요','{A}예요','{A}인데요','{A}이구요','{A}이고요','{A} 출장되나요?','{A}출장되나요?','{A} 배터리교체되나요?','{A}배터리교체되나요?','{A}에요','{A}이고','{A}인데','{A}입니다만','{A}이에요만','{A}예요만'];
const gates=Object.fromEntries(['SUPPORTED_AREA_FALSE_UNSUPPORTED','POLITE_ENDING_FALSE_NEGATIVE','NO_SPACE_AREA_FALSE_NEGATIVE','UNIQUE_AREA_WRONG_RESOLUTION','AMBIGUOUS_AREA_AUTOCONFIRM','MISSING_AREA_FALSE_UNSUPPORTED','EXPLICIT_UNSUPPORTED_FALSE_SUPPORTED','AREA_CONTEXT_LOST'].map(k=>[k,0]));
const failures=[];let cases=0,aliasCases=0;
function check(text,alias){
 const out=resolveLocation(text,areas),expected=alias.candidates.length===1?alias.candidates[0]:alias.broadParent;
 cases++;
 if(out.unsupportedLocation)gates.SUPPORTED_AREA_FALSE_UNSUPPORTED++;
 if(expected){
  if(!out.region){gates.POLITE_ENDING_FALSE_NEGATIVE++;if(!text.includes(' '))gates.NO_SPACE_AREA_FALSE_NEGATIVE++;}
  else if(out.region.canonicalId!==expected.canonicalId)gates.UNIQUE_AREA_WRONG_RESOLUTION++;
  if(out.region?.canonicalId!==expected.canonicalId)failures.push({text,expected:expected.fullName,out});
 }else{
  if(out.region)gates.AMBIGUOUS_AREA_AUTOCONFIRM++;
  if(!out.ambiguousRegion||alias.candidates.some(c=>!out.locationCandidates?.some(r=>r.canonicalId===c.canonicalId)))failures.push({text,out});
 }
}
for(const area of areas)for(const pattern of patterns)check(pattern.replace('{A}',area.name),aliases.find(a=>a.alias===normalizeText(area.name)));
const canonicalCases=cases;
for(const alias of aliases.filter(a=>a.alias.length>=2))for(const suffix of ['입니다','예요']){check(alias.alias+suffix,alias);aliasCases++;}
const transcripts=[];
function flow(inputs){let state=createConversationState(),out;for(const text of inputs){out=conversationTurn(state,text,records,areas,prices,policy);state=out.state;transcripts.push({text,messages:out.messages,region:state.region?.fullName,vehicle:state.vehicleFamily,priceIntent:state.priceIntent,chips:out.chips});}return out;}
const missing=['출장배터리되나요?','출장배터리 되나요?','출장 배터리 되나요?','출장교체되나요?','출장교체 가능해요?','출장 가능해요?','방문교체되나요?','방문 가능해요?','배터리 출장돼요?','배터리 출장 가능한가요?','출장 와주시나요?','출장도 되나요?'];
missing.push('무료 출장 가능해요?','델코 출장 가능해요?','배터리는 출장되나요?','배터리도 출장돼요?');
for(const text of missing){const out=flow([text]);if(!out.messages.join(' ').includes('지역을 알려주세요')||out.messages.join(' ').includes('확인되지'))gates.MISSING_AREA_FALSE_UNSUPPORTED++;}
for(const [text,name] of [['지역은 인천입니다','인천'],['인천입니다','인천'],['지역은 마포입니다','마포구'],['마포입니다','마포구'],['마포동입니다','마포동'],['지역은 송파예요','송파구'],['송파동입니다','송파동'],['구월동입니다','구월동'],['구월동인데 출장되나요?','구월동']])assert.equal(flow([text]).state.region?.name,name,text);
let out=flow(['지역은 인천이고 차량은 그랜저예요']);assert.equal(out.state.region?.name,'인천');assert.equal(out.state.vehicleFamily,'그랜저');
out=flow(['차량은 BMW고 지역은 마포입니다']);assert.equal(out.state.manufacturer,'bmw');assert.equal(out.state.region?.name,'마포구');
assert.ok(!flow(['그랜저인데 출장 가능해요?']).messages.join(' ').includes('확인되지'));
for(const text of ['제 지역은 인천입니다','저는 구월동인데 배터리 교체되나요?','BMW 5시리즈이고 지역은 송파예요','마포인데 출장되나요?','서울인데 BMW 배터리 얼마예요?'])assert.ok(flow([text]).state.region,text);
out=flow(['구월동 BMW 배터리 얼마예요?','출장배터리되나요?']);if(!out.messages.join(' ').includes('구월동')||out.state.manufacturer!=='bmw'||!out.state.priceIntent)gates.AREA_CONTEXT_LOST++;
out=flow(['인천입니다','구월동이요','아니 지역은 마포입니다']);assert.equal(out.state.region?.name,'마포구');
for(const text of ['부산 출장돼요?','부산도 와?','서울 부산 출장돼?','지역은 부산입니다']){out=flow(['구월동입니다',text]);if(!out.messages.join(' ').includes('확인되지')||!out.actions.includes('phone'))gates.EXPLICIT_UNSUPPORTED_FALSE_SUPPORTED++;}
out=flow(['시흥입니다']);assert.ok(out.chips.length>1);assert.equal(out.state.region,null);
for(const text of ['구월동물원','구월동화책','강남스타일','인천공항주차','마포입니다요'])assert.equal(resolveLocation(text,areas).region,null,text);
assert.equal(records.length,917);assert.equal(areas.length,665);
const changed=execFileSync('git',['diff','--name-only','de199b25'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const html=changed.filter(p=>p.endsWith('.html'));assert.ok(html.every(p=>p==='smart-consult/index.html'));
assert.equal(changed.filter(p=>/^(data|seo-data|car-battery|areas|blog)\//.test(p)).length,0,'canonical/SEO freeze');
const evidence={canonicalCases,aliasCases,totalCases:cases,areas:areas.length,rows:records.length,gates,failures,transcripts,changedHTML:html};
fs.mkdirSync('docs/evidence/location-nlu',{recursive:true});fs.writeFileSync('docs/evidence/location-nlu/matrix.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));assert.equal(failures.length,0);for(const [key,value] of Object.entries(gates))assert.equal(value,0,key);
