import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolveLocation} from '../js/smart-consult-location.js';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const prices=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const turn=(q,s=createConversationState())=>conversationTurn(s,q,rows,areas,prices,policy);
let positive=0,negative=0,transitions=0;
for(const area of areas.filter(a=>a.level!=='province')){
  for(const q of [area.fullName,area.fullLabel,area.fullName.replaceAll(' ',''),area.fullName+'입니다',area.fullName+' 출장되나요?']){
    assert.equal(resolveLocation(q,areas).region?.canonicalId,area.canonicalId,q);positive++;
  }
  for(const suffix of ['시','군','구','읍','면','동','리'].flatMap(unit=>[' 미등록'+unit,'미등록'+unit])){
    const q=area.fullName+suffix,o=resolveLocation(q,areas);
    assert.equal(o.region,null,q);assert.ok(o.unsupportedLocation||o.unresolvedLocation,q);negative++;
  }
}
const excluded=['경기도 화성시 양감','경기도 화성시','화성시 양감면','화성시양감면','경기도 화성시 양감면','경기 화성시','경기도화성시양감','경기도화성시양감면','경기도 파주시','서울특별시 미등록구','인천광역시 미등록구'];
for(const q of excluded){
  const o=turn(q);
  assert.equal(o.locationState,'EXPLICIT_UNSUPPORTED_AREA',q);assert.equal(o.state.region,null,q);
  assert.ok(o.messages.join(' ').includes('포함되어 있지 않습니다'),q);
  assert.ok(!/교체 가능합니다|방문 시간|배차|도착/.test(o.messages.join(' ')),q);negative++;
}
for(const q of ['경기도','경기','서울','인천','경기도 화성','경기도 양감','경기도 미등록동']){
  const o=turn(q);assert.equal(o.locationState,'UNRESOLVED_SPECIFIC_AREA',q);assert.equal(o.state.region,null,q);
  assert.ok(o.messages.join(' ').includes('정확한 시·구·동'),q);negative++;
}
const vehicle=turn('K8 2.5가솔린 AGM80으로 업그레이드');
const incident=turn(excluded[0],vehicle.state);
assert.equal(incident.state.selectedVehicleKey,vehicle.state.selectedVehicleKey);
assert.equal(incident.state.region,null);assert.equal(incident.state.location,null);
assert.deepEqual(incident.state.result,vehicle.state.result);
for(const supported of ['인천 구월동','서울 강남구 역삼동','경기도 수원시']){
  const previous=turn(supported,vehicle.state).state;
  const legacyProvince=areas.find(a=>a.level==='province'&&a.area==='incheon');
  for(const saved of [previous,decodeSession(encodeSession(previous,[])).state,{...previous,region:legacyProvince,location:legacyProvince}]){
    const changed=turn(excluded[0],saved);
    assert.equal(changed.state.region,null);assert.equal(changed.state.location,null);
    assert.equal(changed.state.selectedVehicleKey,vehicle.state.selectedVehicleKey);
    assert.ok(!/가능합니다|방문 시간/.test(turn('출장 가능해요?',changed.state).messages.join(' ')),'blocked location must not imply dispatch');
    const recovered=turn(supported,changed.state);
    assert.ok(recovered.state.region);transitions++;
  }
}
for(const q of ['K8 2.5가솔린','G70','BMW G70','디스커버리','반드시','배터리 관리','배터리 교체하면','장기 주차','오전 방문','이동하는 동안','방문구매 가능해요?','아직시동걸리는데바꿔야해요?']){
  const o=resolveLocation(q,areas);assert.equal(o.region,null,q);assert.ok(!o.unsupportedLocation&&!o.unresolvedLocation,q);negative++;
}
assert.equal(resolveLocation('시흥',areas).ambiguousRegion,true);
const ambiguous=turn('경기도 시흥');assert.equal(ambiguous.state.region,null);assert.ok(ambiguous.state.pendingLocationDisambiguation.length>1);
const province=turn('경기도');assert.equal(province.state.region,null);assert.equal(province.state.location.confidence,'scope');
assert.equal(turn('시흥시',decodeSession(encodeSession(province.state,[])).state).state.region.name,'시흥시');
console.log(JSON.stringify({status:'PASS',areas:areas.length,positive,negative,transitions,incident:{messages:incident.messages,actions:incident.actions,locationState:incident.locationState},priceObservation:vehicle.messages}));
