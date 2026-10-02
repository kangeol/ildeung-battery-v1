import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildVehicleGroups,normalizeText} from '../js/smart-consult-core.js';
import {buildVehicleTypoIndex,isOneVehicleEdit,proposeVehicleTypo,resolveVehicleText,SAFE_ALIAS_MAP} from '../js/vehicle-aliases.js';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const records=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const turn=(text,state=createConversationState())=>conversationTurn(state,text,records,[],prices,policy);
const groups=buildVehicleGroups(records),targets=buildVehicleTypoIndex(records);
const id=t=>JSON.stringify([t.key,t.detailModel]);
let exact=0,safe=0,refused=0,negative=0;
for(const g of groups){
 for(const name of new Set([g.vehicle,...g.records.map(r=>r.detailModel)])){
  assert.equal(proposeVehicleTypo(name,records),null,name+' exact precedence');exact++;
 }
}
for(const [alias,target] of Object.entries(SAFE_ALIAS_MAP)){
 assert.equal(proposeVehicleTypo(alias,records),null);
 assert.ok(resolveVehicleText(alias,records).matches.some(g=>g.vehicle===target));
}
function neighbors(s,alphabet){
 const set=new Set();
 for(let i=0;i<=s.length;i++){
  for(const c of alphabet)set.add(s.slice(0,i)+c+s.slice(i));
  if(i<s.length){set.add(s.slice(0,i)+s.slice(i+1));for(const c of alphabet)if(c!==s[i])set.add(s.slice(0,i)+c+s.slice(i+1));}
 }
 return set;
}
// Exhaustive radius-one intersections: a shared witness needs only letters in
// either canonical name, or one representative outside that alphabet.
const collisions=[];
for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
 const a=targets[i],b=targets[j];if((!a.eligible&&!b.eligible)||id(a)===id(b)||Math.abs(a.token.length-b.token.length)>2)continue;
 const alphabet=new Set([...a.token,...b.token,'뷁']);
 const witness=[...neighbors(a.token,alphabet)].find(s=>s.length>=3&&isOneVehicleEdit(s,b.token));
 if(!witness)continue;
 collisions.push({a:id(a),b:id(b),witness});
 assert.equal(proposeVehicleTypo(witness,records),null,witness+' competing targets');negative++;
}
for(const t of targets.filter(t=>t.eligible)){
 for(const word of neighbors(t.token,new Set(['뷁']))){
  const p=proposeVehicleTypo(word,records);
  if(!p){refused++;continue;}
  const matches=new Set(targets.filter(v=>isOneVehicleEdit(word,v.token)).map(id));
  assert.equal(matches.size,1,word);assert.equal(id(p),id(t));assert.equal(p.candidateCount,1);safe++;
 }
}
const corpus=['2016년식 올뉴말리뷰 2.0터보 가솔린','올뉴말리뷰 2.0터보 가솔린','말리뷰 2016','말리뷰 2016년식 배터리 가격'];
for(const text of corpus){
 const o=turn(text);
 assert.equal(o.state.selectedVehicleKey,'');assert.equal(o.state.confirmedBattery,null);assert.equal(o.result,null);
 assert.equal(o.state.pendingVehicleConfirmation.key,'chevrolet|말리부');
 assert.ok(!o.messages.some(m=>/AGM|DIN|만원/.test(m)));
 const restored=decodeSession(encodeSession(o.state,[]));assert.ok(restored);
 const yes=turn('네',restored.state);assert.equal(yes.state.selectedVehicleKey,'chevrolet|말리부');
 const no=turn('아니요',o.state);assert.equal(no.state.pendingVehicleConfirmation,null);assert.equal(no.state.selectedVehicleKey,'');
 const switched=turn('G70',o.state);assert.equal(switched.state.selectedVehicleKey,'genesis|G70');assert.notEqual(switched.state.pendingVehicleConfirmation?.typo,true);
}
const invalid=turn('네',turn('말리뷰 1900').state);
assert.equal(invalid.state.year,1900);assert.ok(invalid.state.pendingVehicleConfirmation);assert.equal(invalid.state.confirmedBattery,null);
assert.equal(turn('올 뉴 말리부 2016').state.pendingVehicleConfirmation,null);
for(const text of ['무지개구름','오늘 날씨','AGM96','DIN91','비엠더블유','쉐보래','말뷰뷰','BMW 말리뷰','A4','A5','A6','X3','X5','G70','G80','Q5','BMW G70','BMW F10','벤츠 W212','8S']){
 assert.equal(proposeVehicleTypo(text,records),null,text);negative++;
}
assert.equal(createConversationState().pendingVehicleConfirmation,null);
assert.equal(proposeVehicleTypo('말리뷰',records,{manufacturer:'bmw'}),null,'remembered manufacturer constraint');
assert.equal(proposeVehicleTypo('말리뷰',records,{manufacturer:'chevrolet'}).key,'chevrolet|말리부');
const synthetic=[...records,{...records.find(r=>r.vehicle==='말리부'),vehicle:'말리보',detailModel:'말리보'}];
assert.equal(proposeVehicleTypo('말리뷰',synthetic),null,'future competing family');negative++;
console.log(JSON.stringify({status:'PASS',rows:records.length,families:groups.length,details:new Set(records.map(r=>r.detailModel)).size,targets:targets.length,eligibleTargets:targets.filter(t=>t.eligible).length,excludedShortAlphanumeric:groups.filter(g=>/^[a-z0-9]{1,4}$/i.test(normalizeText(g.vehicle))).length,exact,safe,refused,negative,corpus:corpus.length,collisionCount:collisions.length,collisions},null,2));
