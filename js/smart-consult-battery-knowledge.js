import {electricalLoadPlan,electricalLoadClarification} from './smart-consult-electrical-load.js';
// Customer education only. No measurements, fitment or vehicle coding authority.
export const batteryKnowledgeCopy = Object.freeze({
 loadClarify:electricalLoadClarification,
 loadObject:'무엇을 켜두거나 사용하시는 상황인가요? 차량의 어떤 기기인지 알려주세요. 전기 사용이 방전에 영향을 줄 수 있지만, 사용환경과 배터리 상태를 확인하지 않고 원인이나 방전 시간을 단정할 수는 없습니다.',
 loadServiceScope:'블랙박스 설치·수리·가격은 배터리 교체 가격과 구분해 확인해야 합니다. 문의하신 기기 서비스의 취급 여부와 조건은 별도 확인이 필요합니다.',
 condition:'증상만으로 교체가 필요한지 단정할 수 없습니다. 실제 배터리 상태, 시동 상태, 방전 이력, 충전 계통과 사용패턴을 함께 확인한 뒤 교체 여부를 판단해야 합니다.',
 jump:'점프로 시동이 걸렸다고 배터리가 정상이라고 확정하거나 반드시 교체해야 한다고 판단할 수는 없습니다. 한 번의 방전만으로 교체를 결정하지 말고, 반복되면 배터리 상태와 방전·충전 원인을 함께 점검해 주세요.',
 discharge:'방전은 배터리 상태·노후, 장기주차나 주행 부족, 블랙박스 등 전기 사용, 충전·전기 계통 문제 등 여러 요인과 관련될 수 있습니다. 한 가지 원인으로 단정하지 말고 사용환경과 차량 상태를 함께 점검해 주세요.',
 fresh:'새 배터리도 주차 기간, 전기 사용량이나 충전 상태에 따라 방전될 수 있습니다. 교체나 점프 후 다시 방전됐다면 곧바로 재교체를 결정하기보다 배터리 상태와 충전·전기 계통, 사용환경을 함께 확인해야 합니다.',
 cold:'추운 환경에서는 배터리 성능이 낮아지고 시동에 더 많은 힘이 필요할 수 있어, 추위가 시동 약화나 방전 상황에 영향을 줄 수 있습니다. 다만 추위만이 원인이라고 단정할 수 없으며 배터리 상태·주차와 사용량·전기 부하·충전 및 차량 상태도 함께 확인해야 합니다.',
 coldThreshold:'특정 온도만으로 반드시 방전된다고 판단할 수는 없습니다.',
 prevention:'장기주차와 짧은 주행이 반복될 때는 충전 상태를 확인하고, 블랙박스 등 주차 중 전기 사용을 차량·기기 안내에 맞게 관리해 주세요. 주기적인 상태 점검이 도움이 되지만 방전을 완전히 예방한다고 보장할 수는 없습니다.',
 cca:'CCA는 Cold Cranking Amps의 약자로, 추운 조건에서 시동 전류를 공급하는 능력과 관련된 지표입니다. 숫자가 높다고 무조건 더 좋거나 내 차에 맞는 것은 아니며 차량 지정 규격과 제품 정보를 확인해야 합니다.',
 ccaRequired:'필요한 CCA 값은 차량별 지정 규격을 확인해야 하며 여기서 숫자를 추정할 수 없습니다. 차량명·연식·세부 모델과 제품 정보를 확인한 뒤 안내받아 주세요.',
 capacity:'Ah(암페어아워)는 배터리의 전하 저장 용량을 나타내는 정격 단위입니다. 실제 사용시간이나 수명은 사용량·환경에 따라 달라지므로 용량 숫자만으로 보장할 수 없고, 큰 용량이 무조건 더 좋거나 적합한 것도 아닙니다.',
 suffix:'AGM95의 숫자만으로 정확히 95Ah라고 확정하지 않겠습니다. 현재 상담 자료에는 해당 제품의 Ah를 증명하는 사양 정보가 없어 실제 제품 라벨이나 제조사 사양 확인이 필요합니다.',
 coding:'일부 차량은 배터리·에너지 관리 시스템이 교체 사실을 인식하도록 등록·리셋·코딩 관련 작업이 필요할 수 있습니다. 모든 차량에 필요한 것은 아니며 브랜드만으로 필요 여부를 판단하지 않습니다.',
 codingRequired:'코딩 필요 여부는 브랜드만으로 확정할 수 없습니다. 정확한 모델·연식·배터리 규격과 차량별 작업 기준 확인이 필요하며, 현재 상담 자료만으로 고객님 차량의 필요 여부를 확정하지 않습니다.',
 standaloneCoding:'코딩만 별도로 진행하는 서비스의 가능 여부와 가격은 고객센터 1644-9141로 확인해 주세요.'
});
const compactKnowledge = text => String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase().replace(/^혹시/,'');
const coldWeatherWords = /추위|추워|추우(?:면|니)|추울|추운|겨울(?:철)?|영하|한파|(?:기온|온도)(?:이|가|은|는)?(?:낮|내려)/;
// Weather words alone are not a battery question. A subject or scoped follow-up is required.
function coldWeatherQuestion(s,state) {
 const batterySubject=/방전|시동|cca(?![a-z])|씨씨에이|배터리.*(?:약|닳|영향|성능)|영향.*배터리/.test(s);
 const topicContext=/^KNOWLEDGE_(?:CONDITION|DISCHARGE|CCA)$/.test(state.lastIntent||'')||Boolean(state.symptom);
 const followup=topicContext&&/그런가|때문|중요|영향|약해|어때/.test(s)&&!/예약|가능|얼마|가격/.test(s);
 // Preserve the previously approved elliptical battery questions, not bare weather reports.
 const legacyQuestion=/^(?:추우면|겨울에약해지나요)[?？.!]*$/.test(s);
 return coldWeatherWords.test(s)&&(batterySubject||followup||legacyQuestion);
}
export function coldScheduleFollowup(text,state) {
 return ['OP_REALTIME','OP_RESERVATION','ARRIVAL_TIME','TODAY_SERVICE','LIVE_DISPATCH_AVAILABILITY','URGENT_SERVICE'].includes(state.lastIntent)
  && /^(?:추운날|추울때|추워도|겨울(?:철)?|영하|한파)(?:에|에도|라도|인데|여도|도)?(?:가능(?:한가요|해요|할까요)?|되나요|돼요)[?？.!]*$/.test(compactKnowledge(text));
}
export function withoutColdPricePreface(text) {
 // An incidental season prefix is not part of a product/vehicle name.
 return String(text).replace(/^(?:겨울(?:철)?(?:에도|에)|추운\s*날(?:에도|에)|한파(?:에도|에)|영하인데)\s*/,'');
}
export function batteryKnowledgePlan(text,state){
 const s=compactKnowledge(text),topic=state.lastIntent||'',keys=[],cold=coldWeatherQuestion(s,state),load=electricalLoadPlan(text,state);
 if(load?.clarify)return {keys:[load.omittedObject?'loadObject':'loadClarify'],fit:false,fee:false,cold:false,load,topic:load.omittedObject?'LOAD_OBJECT':'LOAD_SCOPE'};
 if(load)keys.push('discharge','prevention');
 const coding=/코딩|배터리등록|배터리리셋|배터리초기화|(?:등록|리셋).*(?:뭐|왜|필요)/.test(s)||topic==='KNOWLEDGE_CODING'&&/^(?:제차도|내차도|벤츠는|아우디는|bmw는)[?？.!]*$/.test(s);
 const fee=coding&&/비용|코딩비|얼마|별도|따로|무료|포함/.test(s);
 if(coding&&(!fee||/뭐|왜|필요|꼭|해야/.test(s))){keys.push('coding');if(/필요|꼭|해야|모든|bmw|벤츠|아우디|제차|내차/.test(s)||s==='코딩?')keys.push('codingRequired');}
 if(coding&&/코딩만|코딩서비스만/.test(s))keys.push('standaloneCoding');
 const cca=/cca(?![a-z])|씨씨에이/.test(s)||topic==='KNOWLEDGE_CCA'&&(/^(?:높으면(?:좋은가요|좋아요|좋나요)?|제차는몇|내차는몇|몇이어야)[?？.!]*$/.test(s)||cold);
 if(cca)keys.push(/몇|필요|제차|내차/.test(s)?'ccaRequired':'cca');
 const capacity=/ah(?![a-z])|암페어아워|용량.*(?:뭐|큰|좋|오래|높|작)|큰용량|agm95.*95.*용량/.test(s)||topic==='KNOWLEDGE_CAPACITY'&&/큰게|높으면/.test(s);
 if(capacity)keys.push(/agm95.*95.*용량/.test(s)?'suffix':'capacity');
 const fit=/(?:agm|din|df)\d+.*대신.*(?:agm|din|df)\d+|용량.*(?:넣어도|바꿔도|낮춰도)/.test(s);
 const condition=/(?:갈아야|바꿔야|교체해야|교체시기|아직.*(?:쓸|써도)|시동만.*괜찮)/.test(s)||/^KNOWLEDGE_(?:CONDITION|DISCHARGE)$/.test(topic)&&/^교체[?？.!]*$/.test(s);
 if(condition)keys.push(/점프|방전/.test(s)?'jump':'condition');
 const deviceService=/블랙박스.*(?:설치(?:해|하|비|가능)|가격|추천|고장)/.test(s)&&!/방전|소모|원인|때문/.test(s);
 if(deviceService&&!keys.length&&!fit)return {keys:['loadServiceScope'],fit:false,fee:false,cold:false,load:null,topic:'LOAD_SCOPE'};
 const discharge=!deviceService&&/방전.*(?:왜|원인|예방|안되게)|(?:왜|자꾸|다시|또|한번|두번|1번|2번).*방전|블랙박스|장기주차|세워두면|재방전|(?:새배터리|교체했|점프).*방전/.test(s);
 if(discharge&&(!condition||/왜|블랙박스|원인/.test(s)))keys.push(/새배터리|교체했|점프했/.test(s)?'fresh':/(?:한번|두번|1번|2번).*방전/.test(s)?'jump':'discharge');
 if(/방전.*(?:예방|안되게)|방전예방/.test(s)||topic==='KNOWLEDGE_DISCHARGE'&&/^예방[?？.!]*$/.test(s))keys.push('prevention');
 if(cold){keys.push('cold');if(/(?:영하|기온|온도)|(?<![a-z0-9-])\d+(?:\.\d+)?(?:도|°c)/.test(s))keys.push('coldThreshold');}
 if(/점프.*(?:그냥|써도|괜찮)/.test(s))keys.push('jump');
 if(!keys.length&&!fit)return null;
 return {keys:[...new Set(keys)],fit,fee,cold,load,topic:coding?'CODING':cca?'CCA':capacity||fit?'CAPACITY':load?'ELECTRICAL_LOAD':discharge||cold?'DISCHARGE':'CONDITION'};
}
