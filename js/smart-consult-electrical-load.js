// Usage recognition only: no accessory specifications, diagnosis or new service facts.
const compact=text=>String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase();
export function electricalLoadPlan(text,state={}) {
 const s=compact(text),context=state.lastIntent==='KNOWLEDGE_ELECTRICAL_LOAD';
 // Damage/fault observations and expressly denied usage are not parked-load history.
 if(/침수|충돌|사고후|누액|부풀|불꽃|연기|타는냄새|쓴적.*없|사용한적.*없|혼자.*(?:껏켯|꺼|켜)/.test(s))return null;
 const vehicle=/차량|차안|차에서|차에|차를|차가|차문|차앱|시동|정차|택시|배터리|밧데리|시거잭|화물칸|전조등|주차녹화|상시녹화|원격냉방/.test(s);
 if(/집에서|집냉장고|가정용|거실|방에서/.test(s)&&!vehicle)return null;
 const device=/실내등|전조등|라이트|화물칸조명|뒷좌석(?:불|모니터)|천장모니터|주차.*녹화|상시녹화|블랙박스|보조(?:배터리|밧데리)|인버터|냉장고|냉동기|전기장판|에어컨|원격냉방|라디오|공기청정기|공청기|멀티탭|전기(?:기기|장비|작업)|차량앱|스마트폰.*차|tv|표시등/.test(s);
 const history=/켜(?:둔|두|뒀|놓|놔|놨|놧|져있)|켰|켯|껐|끄|틀어|쓰|써|썼|쓴|들었|사용|연결|꽂|꼽|녹화|전기.*소모|불량.*가능|원인|때문|영향|방전|닳|달앗|달았|조회|소모|밤새/.test(s);
 const door=/문.*(?:오래열|열어놓|열어놔|자주열|자주엽)|승하차.*자주/.test(s)&&!/대문|현관|출입문/.test(s);
 const vagueUsage=/(?:청소하다.*등켜|라이트.*실수|차를.*사무실)/.test(s);
 const unrelatedDeviceService=device&&/설치|교체해|교체하|가격|추천|고장|안켜/.test(s)&&!/(?:방전|소모|닳|밤새|켜둔|켜놓|켰|켯|원인|때문)/.test(s);
 if(unrelatedDeviceService)return null;
 const followup=context&&(/그게.*원인|그것.*때문|배터리.*안좋|몇시간|하루.*방전|얼마나.*(?:켜|사용)|자꾸방전|갈아야|바꿔야/.test(s));
 const explicit=(device&&history)||door||vagueUsage||/차(?:에서|에).*전기.*(?:쓰|사용|많)/.test(s);
 if(!explicit&&!followup)return null;
 // Domestic appliance histories without vehicle evidence need scope, not a car/year.
 const priorBattery=context||Boolean(state.symptom||state.selectedVehicleKey||state.quotedSpec)||/^KNOWLEDGE_(?:DISCHARGE|CONDITION)$/.test(state.lastIntent||'');
 const clear=vehicle||/실내등|라이트|주차.*녹화|상시녹화|블랙박스|보조(?:배터리|밧데리)|뒷좌석|천장모니터|승하차/.test(s)||priorBattery;
 return {clarify:!clear,duration:/몇시간|며칠|몇일|하루|얼마나|밤새.*괜찮/.test(s),deviceService:false};
}
export const electricalLoadClarification='차량에서 전기기기를 사용한 상황을 말씀하시는 건가요? 어떤 기기를 사용했고 배터리나 시동에 어떤 변화가 있었는지 알려주세요.';
