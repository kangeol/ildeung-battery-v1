import { MANUFACTURER_ALIASES, batteryStoreType, buildVehicleGroups, normalizeText, parseYearRange, resolveConsultation, yearMatches, batteryCertainty, nextBatteryDiscriminator } from "./smart-consult-core.js?v=certainty-v1";
import { copy, variant, symptomLabels } from "./conversation-copy.js";
import { resolveLocation } from "./smart-consult-location.js?v=location-v1";
import { resolveVehicleText, buildAliasIndex } from "./vehicle-aliases.js";
import { directPriceSpec, priceDescription, splitBatterySpec, brandIntent, withoutBrand, normalizeBatteryCode, catalogSpecMention } from "./smart-consult-prices.js?v=owner-delkor-v1";
import { servicePolicyIntent } from "./smart-consult-policy.js?v=faq-v1";
import { extendedPolicyReply, assuranceReply } from "./smart-consult-product-policy.js?v=owner-delkor-v1";
import { finalFaqReply, finalFaqIntent } from "./smart-consult-faq.js?v=authentic-v1";
import { operationalPlan } from "./smart-consult-operational.js?v=spec-schedule-v1";
import { PHONE_LABEL } from "./smart-consult-core.js?v=certainty-v1";
import { comparisonIntent, comparisonReply } from './smart-consult-brand-comparison.js?v=owner-delkor-v1';
import {purchaseKnowledgePlan,purchaseKnowledgeReply} from './smart-consult-purchase.js?v=owner-delkor-v1';
import {brandQueryPlan,brandQueryReply,productOriginQuestion} from './smart-consult-brand-query.js?v=owner-delkor-v1';
import {batteryKnowledgePlan,batteryKnowledgeCopy} from './smart-consult-battery-knowledge.js';

const unique = values => [...new Set(values.filter(Boolean))];
const affirmative = /^(응|네|예|맞아|맞아요|맞습니다|응맞아|네맞아요|ㅇㅇ)[.!\s]*$/;
const negative = /^(아니|아니요|아냐|아니야)[.!\s]*$/;
const pricePattern = /가격|얼마|비용|견적|배터리값|밧데리값/;
const knownBattery = result => result?.defaultBattery && !/문의|확인/.test(result.defaultBattery);

export function createConversationState() {
  return { customerReportedSpec: "", brand: "", quotedSpec: "", priceSummaryShown: false, originalIntent: "", priceIntent: false, serviceIntent: false, engine: "", drivetrain: "", yearRange: "", symptom: null, customerGoal: "UNKNOWN", turnIndex: 0, manufacturer: "", manufacturerName: "", vehicleFamily: "", model: "", generation: "", year: null, fuel: "", detailModel: "", detailModels: [], exactFuel: "", selectedVehicleKey: "", batteryCandidates: [], confirmedBattery: null, result: null, region: null, location: null, pendingLocationDisambiguation: null, pendingVehicleConfirmation: null, city: "", district: "", lastIntent: "UNKNOWN", previousQuestion: null, ambiguity: null, failures: 0 };
}

export function symptomIntent(text) {
  if (/시동.*약/.test(text)) return "WEAK_START";
  if (/시동.*(?:안\s*걸|못\s*걸)/.test(text)) return "NO_START";
  // Negated discharge must not overwrite a symptom with an invented positive one.
  const positive = text.replace(/방전(?:은|이)?\s*아니(?:고|라|야|에요|요)?/g, "");
  if (/점프/.test(positive) && /방전/.test(positive)) return "JUMP_REDISCHARGE";
  if (/(?:또|다시|반복|자꾸).*방전|재방전/.test(positive)) return "REPEATED_DISCHARGE";
  if (/방전/.test(positive)) return "DISCHARGE";
  if (/점프/.test(positive)) return "JUMP";
  if (/(?:미리|오래\s*써|예방).*(?:바꾸|교체)/.test(text)) return "PREVENTIVE_REPLACE";
  if (/배터리.*(?:바꾸려고|교체하려|교체하고|교체할래)/.test(text)) return "REPLACE";
  return null;
}

const liveIntents = ["LIVE_DISPATCH_AVAILABILITY", "ARRIVAL_TIME", "TODAY_SERVICE", "URGENT_SERVICE"];
function recoveryField(text, state) {
  if (/연식|몇\s*년/.test(text)) return "year";
  if (/연료|디젤|가솔린/.test(text)) return "fuel";
  if (/차량명|차종|모델/.test(text)) return "vehicle";
  return state.previousQuestion?.field || "vehicle";
}

function fuelType(value) {
  if (/하이브리드|hybrid|hev|\+전기/i.test(value)) return "하이브리드";
  if (/디젤|diesel/i.test(value)) return "디젤";
  if (/가솔린|휘발유|gasoline|petrol/i.test(value)) return "가솔린";
  if (/lpg|엘피지/i.test(value)) return "LPG";
  if (/전기|electric/i.test(value)) return "전기";
  return "";
}

function yearFromText(text, rows, nowYear) {
  if (/\d{2,4}\s*[~～–]\s*(?:\d{2,4}|현재)/.test(text)) return {};
  const full = text.match(/(?:^|[^\d])((?:19|20)\d{2})(?!\d|\s*(?:cc|씨씨))/i);
  if (full) return { year: Number(full[1]) };
  const short = text.match(/(?:^|[^\d])(\d{2})\s*년(?:식)?/) || text.match(/^\s*(\d{2})\s*$/);
  if (!short) return {};
  const n = Number(short[1]);
  const years = [1900 + n, 2000 + n].filter(year => year <= nowYear + 1 && rows.some(row => yearMatches(row.year, year)));
  return years.length === 1 ? { year: years[0] } : { ambiguousYear: true };
}

export function recognizeIntent(text, entities) {
  if (/^(처음부터|다시시작|초기화|리셋|새상담)$/.test(normalizeText(text))) return "RESET";
  if (/몰라|모르겠|기억\s*안\s*나|어디서.*(?:봐|보|확인)/.test(text)) return "RECOVERY";
  if (/\d+\s*분\s*(?:안|내)|급해|급하|긴급/.test(text)) return "URGENT_SERVICE";
  if (/몇\s*시|언제.*(?:와|오|방문|도착)|도착|출장.*시간/.test(text)) return "ARRIVAL_TIME";
  if (/지금.*(?:와|오|돼|되|가능|출발|방문)/.test(text)) return "LIVE_DISPATCH_AVAILABILITY";
  if (/(?:오늘|내일).*?(?:와|오|돼|되|가능|방문)/.test(text)) return "TODAY_SERVICE";
  if (/아니|정정|수정|잘못|바꿔/.test(text) && (entities.year || entities.fuel || entities.matches.length)) return "CORRECTION";
  if (pricePattern.test(text)) return "PRICE_QUESTION";
  if (/전화|통화/.test(text)) return "CALL_REQUEST";
  if (/구매|살래|주문|상품/.test(text)) return "BUY_REQUEST";
  if (symptomIntent(text)) return "SYMPTOM";
  if (/agm|din|일반\s*배터리|다른\s*(타입|배터리)/i.test(text)) return "AGM_DIN_QUESTION";
  if (/출장|방문|지역|도\s*와|도와\?|가능해/.test(text) || entities.region || entities.ambiguousRegion) return "SERVICE_AREA_AVAILABILITY";
  if (entities.matches.length) return "VEHICLE_IDENTIFICATION";
  if (entities.year || entities.ambiguousYear) return "YEAR_INFO";
  if (entities.fuel) return "FUEL_INFO";
  if (entities.detailModel || entities.exactFuel || entities.engine || entities.drivetrain) return "MODEL_INFO";
  if (/배터리|밧데리|규격|용량/.test(text)) return "BATTERY_QUESTION";
  return "UNKNOWN";
}

export function extractEntities(text, records, state = createConversationState(), localities = [], nowYear = new Date().getFullYear()) {
  const vehicle = resolveVehicleText(text, records, state);
  const brandHits = Object.entries(MANUFACTURER_ALIASES).filter(([,aliases]) => aliases.some(alias => text.toLowerCase().split(/\s+/).some(word => normalizeText(word).replace(/(?:이고요|이구요|이고|고|인데요|인데|입니다|이에요|예요)$/,'')===normalizeText(alias)) || normalizeText(text).startsWith(normalizeText(alias))));
  const manufacturer = brandHits.length===1 ? brandHits[0][0] : "";
  if (state.selectedVehicleKey && /^(?:\s*(?:[1-9]\.\d|\d{3,4}\s*cc|가솔린|휘발유|디젤|엘피지|LPG|이요|예요|요)\s*)+$/i.test(text)) {
    vehicle.matches=[]; vehicle.shorthand=false; vehicle.detailModels=undefined; vehicle.generation="";
  }
  const normalized = vehicle.rejected ? "" : normalizeText(vehicle.text);
  // Search recognises family aliases; an exact detail phrase inside a sentence is retained too.
  let matches = vehicle.matches;
  const detailRows = matches.length ? matches.flatMap(group=>group.records) : records.filter(row=>`${row.manufacturerId}|${row.vehicle}`===state.selectedVehicleKey);
  // A detail sharing the family name is not evidence for that older generation.
  // For example "트랙스 2018" must consider every Trax row, not only 2013~2016.
  const detailMatches = unique(detailRows.filter(row=>normalizeText(row.detailModel)!==normalizeText(row.vehicle)).map(row => row.detailModel)).filter(detail => normalized.includes(normalizeText(detail))).sort((a,b) => normalizeText(b).length - normalizeText(a).length);
  const equivalentDetails=detailMatches.length ? detailMatches.filter(detail=>normalizeText(detail)===normalizeText(detailMatches[0])) : [];
  let detailModel = equivalentDetails.length===1 ? equivalentDetails[0] : "";
  if (!detailModel && /그랜저ig/.test(normalized)) detailModel = "그랜저 IG";
  if (detailModel) matches = buildVehicleGroups(records.filter(row => row.detailModel === detailModel)).map(group => ({ ...group, records: records.filter(row => `${row.manufacturerId}|${row.vehicle}` === group.key), matchedDetail: detailModel }));
  const key = matches.length === 1 ? matches[0].key : state.selectedVehicleKey;
  const rows = records.filter(row => `${row.manufacturerId}|${row.vehicle}` === key);
  const generation = text.match(/\b([gfw]\d{2,3})\b/i)?.[1]?.toUpperCase() || "";
  if (generation && rows.length) {
    const details = unique(rows.filter(row => row.detailModel.toUpperCase().includes(generation)).map(row => row.detailModel));
    if (details.length === 1) detailModel = details[0];
  }
  const positiveText = text.replace(/(?:디젤|가솔린|휘발유|하이브리드|LPG)\s*(?:이\s*)?아니(?:고|라|야|에요|요)?/gi, "");
  const fuel = fuelType(positiveText);
  const exactFuels = unique(rows.map(row => row.fuel)).filter(value => normalizeText(positiveText).includes(normalizeText(value)));
  // Generic fuel words are not evidence for a particular engine/drive source row.
  const exactFuel = exactFuels.filter(value=>normalizeText(value)!==normalizeText(fuel)).sort((a,b) => b.length - a.length)[0] || "";
  const engineMatch=positiveText.match(/(?:^|[^\d])([1-9]\.\d)(?!\d)/) || positiveText.match(/(?:^|[^\d])(\d{3,4})\s*(?:cc|씨씨)/i);
  const engine=engineMatch ? String(Number(engineMatch[1]) * (engineMatch[1].includes('.') ? 1000 : 1)) : "";
  const drivetrain=positiveText.match(/\b([24]WD)\b/i)?.[1]?.toUpperCase() || "";
  const trim = vehicle.shorthand ? "" : text.match(/(?:^|[^a-z0-9])((?:[235]\d{2}[di]|[ecs]\s?\d{3}d?))(?![a-z0-9])/i)?.[1]?.replace(/\s/g, "") || text.normalize("NFKC").match(/(?:bmw|벤츠)\s*([235]\d{2}[di]|[ecs]\d{3}d?)(?![a-z0-9])/i)?.[1] || "";
  return { manufacturer, engine, drivetrain, matches, shorthand:vehicle.shorthand, detailModels:equivalentDetails.length>1?equivalentDetails:vehicle.detailModels, detailModel, generation:vehicle.generation || generation, fuel, exactFuel, trim: trim.toUpperCase().replace(/D$/, "d").replace(/I$/, "i"), ...yearFromText(text, rows.length ? rows : records, nowYear), ...resolveLocation(text, localities, state.location || state.region, state.pendingLocationDisambiguation) };
}

function engineMatches(fuel, engine) {
  if (!engine) return true;
  const match=fuel.match(/(\d{3,4})\s*cc/i) || fuel.match(/(\d\.\d)/);
  if (!match) return true; // Missing discriminator is not proof of exclusion.
  const value=Number(match[1])*(match[1].includes('.')?1000:1);
  return /이상/.test(fuel)?Number(engine)>=value:/이하/.test(fuel)?Number(engine)<=value:Number(engine)===value;
}

function engineLabel(fuel) {
  const match=fuel.match(/\d{3,4}\s*cc(?:\s*(?:이상|이하))?/i) || fuel.match(/\d\.\d/);
  if(!match)return "";
  return match[0].includes('.')?`${Number(match[0])*1000}cc`:match[0];
}

export function filteredRows(records, state) {
  return records.filter(row => `${row.manufacturerId}|${row.vehicle}` === state.selectedVehicleKey && (!state.year || yearMatches(row.year, state.year)) && (!state.yearRange || row.year===state.yearRange) && (!state.detailModel || row.detailModel === state.detailModel) && (!state.detailModels?.length || state.detailModels.includes(row.detailModel)) && (!state.generation || row.detailModel.toUpperCase().includes(state.generation.toUpperCase())) && (!state.fuel || !fuelType(row.fuel) || fuelType(row.fuel) === state.fuel) && (!state.exactFuel || row.fuel === state.exactFuel) && engineMatches(row.fuel,state.engine) && (!state.drivetrain || !/[24]WD/i.test(row.fuel) || row.fuel.toUpperCase().includes(state.drivetrain)));
}

function detailLabel(detail, rows) {
  const ranges = unique(rows.filter(row => row.detailModel === detail).map(row => row.year)).map(range => {
    const {start, end} = parseYearRange(range);
    return start ? `${start}~${end || "현재"}년형` : range;
  });
  return `${ranges.join(" / ")} · ${detail}`;
}

export function vehicleLabel(state) {
  return [state.manufacturerName, state.model || state.vehicleFamily].filter(Boolean).join(" ") + (state.year ? ` · ${state.year}년식` : "");
}

export function canonicalVehicleRowKey(row) {
  return JSON.stringify([row.manufacturerId,row.vehicle,row.year,row.fuel,row.detailModel]);
}

// The ID binds a displayed discriminator to its exact canonical condition set.
// Duplicate/conflicting facts for the same conditions stay together for certainty checks.
export function vehicleCandidateOptions(records, state) {
  const rows=filteredRows(records,state);
  if(batteryCertainty(rows).safe)return null;
  const details=new Map();
  for(const row of rows)if(!details.has(normalizeText(row.detailModel)))details.set(normalizeText(row.detailModel),row.detailModel);
  const dimensions=[
    ...(!state.detailModel?[{field:'detailModel',value:r=>details.get(normalizeText(r.detailModel))}]:[]),
    ...(!state.year&&!state.yearRange?[{field:'year',value:r=>r.year}]:[]),
    ...(!state.fuel?[{field:'fuel',value:r=>fuelType(r.fuel)}]:[]),
    ...(!state.engine?[{field:'engine',value:r=>engineLabel(r.fuel)}]:[]),
    ...(!state.drivetrain?[{field:'drivetrain',value:r=>r.fuel.match(/[24]WD/i)?.[0]?.toUpperCase()||''}]:[]),
    ...(!state.exactFuel?[{field:'exactFuel',value:r=>r.fuel}]:[])
  ];
  const next=nextBatteryDiscriminator(rows,dimensions);
  if(!next)return null;
  return {field:next.field,choices:next.values.map(value=>({value,label:next.field==='detailModel'?detailLabel(value,rows):value,selection:{type:'vehicle-candidate',id:JSON.stringify([next.field,state.selectedVehicleKey,value,unique(rows.filter(r=>next.value(r)===value).map(canonicalVehicleRowKey)).sort()])}}))};
}

export function conversationTurn(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  const knowledge=selection===null&&servicePolicy&&batteryKnowledgePlan(text,previous);
  if(!knowledge)return conversationWithoutBatteryKnowledge(previous,text,records,localities,priceCatalog,servicePolicy,selection);
  let state={...previous},chips=[],messages=[],actions=[];
  // Strip educational vocabulary before vehicle matching (CCA is not a vehicle alias).
  const vehicleText=text.replace(/CCA|씨씨에이|\d*Ah|암페어아워/gi,'');
  const e=extractEntities(vehicleText,records,previous,localities);
  const explicit=e.matches.filter(m=>normalizeText(vehicleText).includes(normalizeText(m.vehicle)));
  if(explicit.length){
    const query=[...explicit.map(m=>`${m.manufacturerName} ${m.vehicle}`),e.year?`${e.year}년식`:'',e.detailModel,e.fuel].filter(Boolean).join(' ');
    const out=conversationWithoutBatteryKnowledge(previous,query,records,localities,priceCatalog,servicePolicy);
    state=out.state;chips=out.chips;
    if(/가격|얼마/.test(text)&&!/코딩/.test(text)){messages.push(...out.messages);actions.push(...out.actions);}
  }
  if(e.region){state.region=e.region;state.location=e.region;state.city=e.region.city;state.district=e.region.district;}
  const spec=catalogSpecMention(text,priceCatalog);
  if(spec?.candidates.length===1&&!knowledge.fit)state.quotedSpec=spec.candidates[0];
  const brand=brandIntent(text,priceCatalog);if(brand)state.brand=brand;
  messages.push(...knowledge.keys.map(k=>batteryKnowledgeCopy[k]));
  if(knowledge.fit){messages.push(servicePolicy.purchaseKnowledge.fit.replaceAll('{phone}',PHONE_LABEL));actions.push('phone');}
  if(knowledge.topic==='CODING')messages.push(servicePolicy.answers.CODING);
  const faq=finalFaqReply(text,servicePolicy);if(faq){messages.push(...faq.messages);actions.push(...faq.actions);}
  const inclusion=servicePolicyIntent(text);if(inclusion&&inclusion!=='CODING')messages.push(servicePolicy.answers[inclusion]);
  if(/가격/.test(text)&&!/코딩/.test(text)&&!knowledge.fit&&state.quotedSpec){messages.push(priceDescription(state.quotedSpec,priceCatalog,state.brand));state.priceIntent=true;state.originalIntent='PRICE';}
  const symptom=symptomIntent(text);if(symptom)state.symptom={intent:symptom,rawSafeText:symptomLabels[symptom],confirmedAt:state.turnIndex};
  state.lastIntent='KNOWLEDGE_'+knowledge.topic;
  if(knowledge.keys.includes('standaloneCoding'))actions.push('phone');
  return {state,messages:unique(messages),actions:unique(actions),chips,result:null,region:state.region};
}

function conversationWithoutBatteryKnowledge(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  // Route explicit origin wording to existing product authority, never to brand identity.
  const originMention=selection===null&&priceCatalog&&productOriginQuestion(text)?catalogSpecMention(text,priceCatalog):null;
  const originSpec=originMention?.candidates.length===1?originMention.candidates[0]:previous.quotedSpec||previous.confirmedBattery||'';
  const conventionalOrigin=originSpec&&splitBatterySpec(originSpec).some(code=>!/^AGM/.test(code));
  if(selection===null&&priceCatalog&&servicePolicy&&productOriginQuestion(text)&&!comparisonIntent(text,previous,priceCatalog)&&(conventionalOrigin||/어느\s*나라|원산지|어디서\s*(?:생산|제조)/.test(text))){
    const spec=originSpec;
    const state={...previous,...(spec?{quotedSpec:spec}:{}),lastIntent:'ORIGIN'};
    const reply=spec&&!splitBatterySpec(spec).every(code=>/^AGM/.test(code))
      ?{messages:['해당 규격의 원산지는 정확한 제품 확인이 필요합니다. 고객센터 1644-9141로 확인해 주세요.'],actions:['phone']}
      :extendedPolicyReply(text+' 어디 제품',state,priceCatalog,servicePolicy);
    if(reply)return {state,...reply,chips:[],result:null,region:state.region};
  }
  const brandQuery=selection===null&&priceCatalog&&brandQueryPlan(text,priceCatalog);
  if(brandQuery){
    const entities=extractEntities(text,records,previous,localities);
    let context=previous,vehicleOutput=null;
    const explicit=entities.matches.filter(m=>normalizeText(text).includes(normalizeText(m.vehicle)));
    const makerSubject=normalizeText(String(text).split(/제조\s*(?:회사|사|업체)|메이커|(?:어느|어디|무슨|어떤)?\s*회사|누가\s*만(?:든|드는)/)[0]);
    const namedVehicle=explicit.length||buildAliasIndex(records).map.has(makerSubject)||records.some(row=>normalizeText(row.vehicle)&&normalizeText(text).includes(normalizeText(row.vehicle)));
    if(brandQuery.manufacturerWording&&namedVehicle&&!/배터리/.test(text))return {state:{...previous},messages:['차량 자체의 제조사를 말씀하시는 건가요, 교체할 배터리 제품의 브랜드를 말씀하시는 건가요?'],actions:[],chips:[],result:null,region:previous.region};
    if(!brandQuery.mention&&explicit.length){
      const query=[...explicit.map(m=>`${m.manufacturerName} ${m.vehicle}`),entities.year?`${entities.year}년식`:'',entities.detailModel,entities.fuel,entities.engine?`${entities.engine}cc`:''].filter(Boolean).join(' ');
      vehicleOutput=conversationWithoutPurchase(previous,query,records,localities,priceCatalog,servicePolicy);
      context=vehicleOutput.state;
    }
    const out=brandQueryReply(brandQuery,context,priceCatalog);
    if(vehicleOutput?.chips.length)out.chips=vehicleOutput.chips;
    if(entities.region){out.state.region=entities.region;out.state.location=entities.region;out.state.city=entities.region.city;out.state.district=entities.region.district;out.region=entities.region;}
    for(const reply of [finalFaqReply(text,servicePolicy),assuranceReply(text,servicePolicy)])if(reply){out.messages.push(...reply.messages);out.actions=unique([...out.actions,...reply.actions]);}
    return out;
  }
  if(selection===null&&previous.customerReportedSpec&&/^(?:가격은?|얼마(?:예요)?|비용은?)[?!.\s]*$/.test(text))return conversationWithoutPurchase(previous,`${previous.brand||''} ${previous.customerReportedSpec} 가격`,records,localities,priceCatalog,servicePolicy);
  const plan=selection===null&&servicePolicy?.purchaseKnowledge?purchaseKnowledgePlan(text,previous,priceCatalog):null;
    if(!plan){
      const out=conversationWithoutPurchase(previous,text,records,localities,priceCatalog,servicePolicy,selection);
      // An explicit replacement vehicle/product supersedes a previously reported label.
      if(out.state.confirmedBattery||out.state.selectedVehicleKey!==previous.selectedVehicleKey||out.state.quotedSpec!==previous.quotedSpec)out.state.customerReportedSpec='';
      return out;
    }
  let state={...previous},messages=[],actions=[],chips=[];
  const e=extractEntities(text,records,previous,localities);
  // Only explicit vehicle facts re-enter the existing fitment resolver; product
  // knowledge and customer-reported labels cannot establish vehicle compatibility.
  const explicit=e.matches.filter(m=>normalizeText(text).includes(normalizeText(m.vehicle)));
  if(!plan.report&&explicit.length){
    const q=[...explicit.map(m=>`${m.manufacturerName} ${m.vehicle}`),e.year?`${e.year}년식`:'',e.detailModel,e.fuel,e.engine?`${e.engine}cc`:''].filter(Boolean).join(' ');
    const out=conversationWithoutPurchase(state,q,records,localities,priceCatalog,servicePolicy);
    state=out.state;state.customerReportedSpec='';chips=out.chips;
    if(!plan.fit){messages.push(...out.messages);actions.push(...out.actions);}
  }
  if(e.region){state.region=e.region;state.location=e.region;state.city=e.region.city;state.district=e.region.district;}
  if(plan.brand)state.brand=plan.brand;
  if(plan.report){state.customerReportedSpec=plan.reportedCode;state.quotedSpec=plan.reportedCode;state.confirmedBattery=null;state.result=null;state.priceIntent=true;state.originalIntent='PRICE';}
  const reply=purchaseKnowledgeReply(plan,state,priceCatalog,servicePolicy);
  messages.push(...reply.messages);actions.push(...reply.actions);
  if(!plan.fit&&!plan.summary&&!plan.purchase&&/가격|얼마|비용/.test(text)){
    const spec=plan.codes.length===1?plan.codes[0]:state.quotedSpec||state.confirmedBattery;
    if(spec)messages.push(priceDescription(spec,priceCatalog,state.brand));
  }
  const faq=finalFaqReply(text,servicePolicy),included=servicePolicyIntent(text),assurance=assuranceReply(text,servicePolicy);
  for(const r of [faq,assurance])if(r){messages.push(...r.messages);actions.push(...r.actions);}
  if(included)messages.push(servicePolicy.answers[included]);
  const operation=operationalPlan(text,state);
  if(operation?.realtime){messages.push(servicePolicy.operational.REALTIME.replaceAll('{phone}',PHONE_LABEL));actions.push('phone');}
  state.lastIntent=plan.report?'CUSTOMER_REPORTED_SPEC':plan.fit?'FITMENT_CONFIRMATION':plan.purchase?'PURCHASE_COMMITMENT':plan.summary?'CONSULTATION_SUMMARY':previous.lastIntent;
  return {state,messages:unique(messages),actions:unique(actions),chips,result:null,region:state.region};
}

function conversationWithoutPurchase(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  if(selection===null&&text==='차량 모델 상담')return {state:{...previous},messages:['차량 제조사와 모델명을 알려주세요.'],chips:[],actions:[],result:null,region:null};
  // Catalog recognition establishes a product quote, never vehicle compatibility.
  if(selection===null && !/맞아|맞나요|맞는|들어가|호환|장착.*가능/.test(text)) {
    const mention=catalogSpecMention(text,priceCatalog);
    if(mention && (pricePattern.test(text)||mention.particle||normalizeText(text)===normalizeText(mention.token))) {
      const entities=extractEntities(text,records,previous,localities);
      const canonical=Object.hasOwn(priceCatalog.prices,mention.token);
      const bare=normalizeText(text)===normalizeText(mention.token);
      const batteryContext=Boolean(previous.quotedSpec&&(!previous.selectedVehicleKey||previous.quotedSpec!==previous.confirmedBattery));
      if(bare&&!canonical&&mention.candidates.length>1&&entities.matches.length&&!batteryContext){
        const contextual=previous.manufacturer&&!previous.selectedVehicleKey&&!previous.quotedSpec?entities.matches.filter(m=>m.manufacturerId===previous.manufacturer):[];
        if(contextual.length)return {state:{...previous},messages:['어떤 차량 모델인지 한 번 더 확인할게요. 정확한 모델명을 알려주세요.'],chips:contextual.slice(0,4).map(m=>({label:`${m.manufacturerName} ${m.vehicle}`,value:`${m.manufacturerName} ${m.vehicle}`})),actions:[],result:null,region:null};
        return {state:{...previous},messages:[`배터리 규격 ${mention.token}을 말씀하시는 건가요, 차량 모델을 말씀하시는 건가요?`],chips:[{label:'배터리 규격 확인',value:`${mention.token} 가격`},{label:'차량 모델 확인',value:'차량 모델 상담'}],actions:[],result:null,region:null};
      }
      // Complete vehicle names/manufacturers remain vehicle evidence. Incidental
      // numeric substring matches must not defeat explicit product-price language.
      const explicitVehicle=Boolean(entities.manufacturer)||entities.matches.some(m=>normalizeText(m.vehicle)!==normalizeText(mention.token)&&normalizeText(text).includes(normalizeText(m.vehicle)));
      if(!explicitVehicle&&(canonical||bare||!entities.matches.length||batteryContext||pricePattern.test(text))) {
        if(mention.candidates.length>1)return {state:{...previous},messages:[`어떤 배터리 규격 말씀하시는 건가요? ${mention.candidates.join(' / ')} 중 선택해 주세요.`],chips:mention.candidates.map(code=>({label:code,value:code+' 가격'})),actions:[],result:null,region:null};
        const code=mention.candidates[0],source=String(text).normalize('NFKC');
        text=source.slice(0,mention.start)+code+' '+source.slice(mention.end);
        const brands=Object.values(priceCatalog.brands||{}).filter(b=>b.aliases.some(a=>text.toLowerCase().includes(a.toLowerCase())));
        if(brands.length>1&&pricePattern.test(text)&&!comparisonIntent(text,previous,priceCatalog))text+=' 비교';
        const included=servicePolicyIntent(text),faq=finalFaqReply(text,servicePolicy);
        if(pricePattern.test(text)&&(included||faq)&&!assuranceReply(text,servicePolicy)&&!entities.region&&!entities.ambiguousRegion&&!operationalPlan(text,previous)&&brands.length<2){
          const out=conversationWithoutComparison(previous,`${brandIntent(text,priceCatalog)||''} ${code} 가격`,records,localities,priceCatalog,servicePolicy);
          if(faq){out.messages.push(...faq.messages);out.actions=unique([...out.actions,...faq.actions]);}
          if(included&&servicePolicy?.answers[included])out.messages.push(servicePolicy.answers[included]);
          out.messages=unique(out.messages);return out;
        }
      }
    }
  }
  const intent=selection===null&&servicePolicy?.product?.comparisonContext?comparisonIntent(text,previous,priceCatalog):null;
  if(!intent)return conversationWithoutComparison(previous,text,records,localities,priceCatalog,servicePolicy,selection);
  if(intent.clarify)return {state:{...previous},messages:[servicePolicy.product.comparisonContext.clarify],chips:[],actions:[],result:null,region:null};
  const entities=extractEntities(text,records,previous,localities),context=[];
  if(entities.region)context.push(entities.region.fullLabel);
  if(entities.matches.length){context.push(...entities.matches.map(m=>`${m.manufacturerName} ${m.vehicle}`));if(entities.detailModel)context.push(entities.detailModel);if(entities.year)context.push(`${entities.year}년식`);if(entities.fuel)context.push(entities.fuel);if(entities.engine)context.push(`${entities.engine}cc`);}
  const token=String(text).match(/(?<![a-z0-9])(?:AGM\s*\d+R?|DIN\s*\d+(?:HL|L|R)?|DF\s*\d+(?:AL|L|R)|65\s*-\s*900)(?![a-z0-9])/i)?.[0];
  let out=context.length?conversationWithoutComparison(previous,context.join(' '),records,localities,priceCatalog,servicePolicy):{state:{...previous},messages:[],chips:[],actions:[],result:null,region:null};
  if(token&&!entities.matches.length){const code=normalizeBatteryCode(token,priceCatalog);if(Object.hasOwn(priceCatalog.prices,code))out.state.quotedSpec=code;}
  // An unknown explicit product must not inherit a previous product's price.
  const comparisonState=token&&!entities.matches.length?{...out.state,quotedSpec:normalizeBatteryCode(token,priceCatalog)}:out.state;
  out.messages.push(...comparisonReply(comparisonState,priceCatalog,servicePolicy,intent.causal));
  // Preserve independent policy components without re-entering the comparison path.
  const operational=operationalPlan(text,out.state);
  if(operational)for(const key of operational.keys){if(['PRICE_REASON','LIFE'].includes(key))continue;const message=servicePolicy.operational[key];if(message){out.messages.push(message.replaceAll('{phone}',PHONE_LABEL));if(message.includes('{phone}'))out.actions=unique([...out.actions,'phone']);}}
  for(const reply of [assuranceReply(text,servicePolicy),finalFaqReply(text,servicePolicy)])if(reply){out.messages.push(...reply.messages);out.actions=unique([...out.actions,...reply.actions]);}
  out.state.lastIntent='BRAND_COMPARE';out.messages=unique(out.messages);return out;
}

function conversationWithoutComparison(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  const plan=selection===null&&servicePolicy?.operational?operationalPlan(text,previous):null;
  if(!plan){
    const out=conversationEstablished(previous,text,records,localities,priceCatalog,servicePolicy,selection);
    if(selection===null&&finalFaqIntent(text)==='WORK_TIME'&&/얼마나|몇\s*분/.test(text))out.state.lastIntent='OP_WORK_TIME';
    return out;
  }
  if(!plan.schedule&&plan.keys.length===1&&plan.keys[0]==='REALTIME'&&!plan.queries.length&&!assuranceReply(text,servicePolicy)&&!/현금|카드|영수증|세금|이체/.test(text)){
    const intent=recognizeIntent(text,extractEntities(text,records,previous,localities));
    if(liveIntents.includes(intent)||/^VISIT/.test(finalFaqIntent(text)||''))return conversationEstablished(previous,text,records,localities,priceCatalog,servicePolicy);
  }
  // Compose operational facts with the existing canonical vehicle/area/price flow.
  // Manufacture dates and battery age never become model years.
  let out={state:{...previous},messages:[],chips:[],actions:[],result:null,region:null};
  const merge=reply=>{if(!reply)return;out.messages.push(...reply.messages);out.actions=unique([...out.actions,...reply.actions]);};
  // Temporal spans are not suffixless locality aliases (e.g. 오전 vs 오전동).
  // Mask only in an established schedule utterance; explicit locality names stay.
  const entityText=plan.schedule?String(text).replace(/(?:오늘|내일)?\s*(?:아침|오전|점심|오후|저녁|밤|야간)(?=\s*(?:\d|에|때|시간|가능|되|돼|방문|교체|작업|[?!.,]|$))/g,' '):text;
  const entities=extractEntities(entityText,records,previous,localities),context=[];
  if(entities.region)context.push(entities.region.fullLabel);
  if(entities.matches.length){context.push(...entities.matches.map(m=>`${m.manufacturerName} ${m.vehicle}`));if(entities.detailModel)context.push(entities.detailModel);if(entities.year&&/년식/.test(text))context.push(`${entities.year}년식`);if(entities.fuel)context.push(entities.fuel);if(entities.engine)context.push(`${entities.engine}cc`);}
  const explicitPrice=/가격|비용|견적|얼마(?:인가요|예요|야|요)?[?!.\s]*$/.test(text)&&!plan.life&&!plan.bareDuration&&(!plan.realtime||plan.schedule)&&!plan.keys.includes('PRICE_REASON')&&!/추가|코딩|공임|출장비|끝/.test(text);
  if(entities.ambiguousRegion||entities.unsupportedLocation||/지역(?:은|이)\s*/.test(text))out=conversationCore(previous,text,records,localities,priceCatalog,servicePolicy);
  else if(context.length)out=conversationEstablished(previous,context.join(' ')+(explicitPrice?' 가격':''),records,localities,priceCatalog,servicePolicy);
  const brand=brandIntent(text,priceCatalog);if(brand)out.state.brand=brand;
  const spec=String(text).match(/(?<![a-z0-9])(?:AGM\s*\d+R?|DIN\s*\d+(?:HL|L|R)?|DF\s*\d+(?:AL|L|R)|65\s*-\s*900)(?![a-z0-9])/i)?.[0];
  if(spec&&!entities.matches.length){const code=normalizeBatteryCode(spec,priceCatalog);if(Object.hasOwn(priceCatalog?.prices||{},code))out.state.quotedSpec=code;}
  if(explicitPrice){const priced=conversationEstablished(out.state,spec?`${brand||''} ${spec} 가격`:'배터리 가격',records,localities,priceCatalog,servicePolicy);merge(priced);out.state=priced.state;out.result=priced.result;out.chips=priced.chips;}
  for(const query of plan.queries){const reply=conversationEstablished(out.state,query,records,localities,priceCatalog,servicePolicy);merge(reply);out.state=reply.state;out.result=reply.result||out.result;out.region=reply.region||out.region;if(reply.chips.length)out.chips=reply.chips;}
  for(const key of plan.keys){const message=servicePolicy.operational[key];if(message){out.messages.push(message.replaceAll('{phone}',PHONE_LABEL));if(message.includes('{phone}'))out.actions=unique([...out.actions,'phone']);}}
  merge(assuranceReply(text,servicePolicy));
  if(!plan.entry)merge(extendedPolicyReply(text,out.state,priceCatalog,servicePolicy));
  // Collect payment and included-service facts independently of operational timing.
  if(/현금|현찰|카드|계좌|이체|세금계산서|영수증|부가세|할인|수수료|vat/i.test(text))merge(finalFaqReply(text.replace(/(?:폐|헌|기존)\s*배터리|배터리\s*반납|도착|언제.*(?:와|오)/g,''),servicePolicy));
  const included=servicePolicyIntent(text);if(included&&servicePolicy.answers[included]){out.messages.push(servicePolicy.answers[included]);if(included==='KEEP_OLD_BATTERY')out.actions=unique([...out.actions,'phone']);}
  if(['RESERVATION','REALTIME','SITE','NON_FACE_TO_FACE'].includes(plan.topic))out.state.lastIntent='OP_'+plan.topic;
  out.messages=unique(out.messages);return out;
}

function conversationEstablished(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  const assurance=selection===null?assuranceReply(text,servicePolicy):null;
  const cash=/현금|현찰/.test(String(text).replace(/현금\s*영수증/g,''));
  if(selection!==null||(!assurance&&!cash))return conversationCore(previous,text,records,localities,priceCatalog,servicePolicy,selection);
  // A policy question may also supply a new vehicle/product. Keep product pricing
  // separate from fitment, and never parse manufacture dates as a vehicle year.
  const state={...previous},entities=extractEntities(text,records,previous,localities);
  const brand=brandIntent(text,priceCatalog);if(brand)state.brand=brand;
  const token=String(text).match(/(?<![a-z0-9])(?:AGM\s*\d+R?|DIN\s*\d+(?:HL|L|R)?|DF\s*\d+(?:AL|L|R)|65\s*-\s*900|\d+(?:AL|L|R))(?![a-z0-9])/i)?.[0];
  const spec=token?normalizeBatteryCode(token,priceCatalog):'';
  const context=[];
  if(entities.region)context.push(entities.region.fullName||entities.region.fullLabel);
  if(entities.matches.length){
    context.push(...entities.matches.map(m=>`${m.manufacturerName} ${m.vehicle}`));
    if(entities.detailModel)context.push(entities.detailModel);
    if(entities.year&&(!assurance?.actions.includes('phone')||/년식/.test(text)))context.push(`${entities.year}년식`);
    if(entities.fuel)context.push(entities.fuel);
    if(entities.engine)context.push(`${entities.engine}cc`);
    if(entities.drivetrain)context.push(entities.drivetrain);
  }else if(entities.manufacturer)context.push(records.find(r=>r.manufacturerId===entities.manufacturer)?.manufacturerName||'');
  const pricing=pricePattern.test(text)&&(!assurance?.actions.includes('phone')||/가격|비용|견적|배터리값|밧데리값/.test(text));
  const productOnly=Boolean(token)&&!entities.matches.length&&!entities.manufacturer;
  let out={state,messages:[],chips:[],actions:[],result:null,region:null};
  if(context.length)out=conversationCore(state,context.join(' ')+(pricing&&!productOnly?' 가격':''),records,localities,priceCatalog,servicePolicy);
  if(productOnly){
    if(Object.hasOwn(priceCatalog?.prices||{},spec))out.state.quotedSpec=spec;
    if(pricing){
      const priced=conversationCore(out.state,`${brand||''} ${token} 가격`,records,localities,priceCatalog,servicePolicy);
      out={...priced,messages:[...out.messages,...priced.messages],actions:unique([...out.actions,...priced.actions])};
    }
  }else if(!context.length&&pricing&&!/수수료|할인|부가세|vat|계좌번호/i.test(text))out=conversationCore(state,'배터리 가격',records,localities,priceCatalog,servicePolicy);
  const faq=finalFaqReply(text,servicePolicy),existing=assurance?extendedPolicyReply(text,out.state,priceCatalog,servicePolicy):null;
  for(const reply of [assurance,existing,faq])if(reply){out.messages.push(...reply.messages);out.actions=unique([...out.actions,...reply.actions]);}
  return out;
}

function conversationCore(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  let state = { ...previous };
  let selected=null;
  if(selection!==null){
    const current=vehicleCandidateOptions(records,state);
    selected=selection?.type==='vehicle-candidate'&&typeof selection.id==='string'&&current&&current.field===state.previousQuestion?.field&&Array.isArray(state.previousQuestion?.choices)
      ? current.choices.slice(0,4).find(c=>c.selection.id===selection.id&&state.previousQuestion.choices.some(p=>p.value===c.value&&p.label===c.label)) : null;
    if(!selected)return {state:previous,messages:[copy.needDetails],chips:[],actions:['phone'],result:null,region:null};
    const value=selected.value;
    if(current.field==='detailModel'){
      state.detailModels=unique(filteredRows(records,state).filter(r=>normalizeText(r.detailModel)===normalizeText(value)).map(r=>r.detailModel));
      state.detailModel=state.detailModels.length===1?state.detailModels[0]:'';
    } else if(current.field==='year')state.yearRange=value;
    else if(current.field==='engine')state.engine=String(parseInt(value,10));
    else state[current.field]=value;
    const selectedRanges=unique(filteredRows(records,state).map(row=>row.year));
    if(selectedRanges.length===1)state.yearRange=selectedRanges[0];
    // Labels are presentation, not natural-language input. Do not re-expand aliases.
    text='';
  }
  let entities = selected ? {matches:[]} : extractEntities(text, records, state, localities);
  const intent = selected ? 'MODEL_INFO' : recognizeIntent(text, entities);
  const messages = [];
  const output = { state, messages, chips: [], actions: [], result: null, region: null };
  const say = value => messages.push(value);
  const quote = spec => {
    state.quotedSpec=spec;
    const answer=priceDescription(spec,priceCatalog,state.brand);
    say(answer);
    if(servicePolicy?.summary && !state.priceSummaryShown && /교체 가격은/.test(answer)) {say(servicePolicy.summary);state.priceSummaryShown=true;}
  };
  const ask = (field, prompt, choices = [], extra = {}) => {
    state.previousQuestion = { field, prompt, choices, ...extra };
    state.ambiguity = field;
    output.chips = choices.slice(0,4).map(choice => ({ label: choice.label, value: choice.value, ...(choice.selection?{selection:choice.selection}:{}) }));
    say(prompt);
  };
  if (intent === "RESET") { output.state = createConversationState(); say(copy.greeting); return output; }
  // Policy questions must not be mistaken for a new vehicle, price, year or brand selection.
  const faqReply=finalFaqReply(text,servicePolicy);
  if(faqReply){output.messages.push(...faqReply.messages);output.actions=faqReply.actions;return output;}
  const policyReply=extendedPolicyReply(text,state,priceCatalog,servicePolicy);
  if(policyReply){output.messages.push(...policyReply.messages);output.actions=policyReply.actions;return output;}
  if (pricePattern.test(text)) { state.priceIntent=true; state.originalIntent="PRICE"; }
  const requestedBrand=brandIntent(text,priceCatalog);
  const policyIntent=servicePolicy && servicePolicyIntent(text);
  if(requestedBrand){state.brand=requestedBrand;state.priceIntent=true;state.originalIntent='PRICE';}
  const directSpec = directPriceSpec(withoutBrand(text,priceCatalog),priceCatalog,Boolean(requestedBrand));
  if (directSpec) {
    // A price lookup is not a vehicle fitment confirmation. Preserve vehicle/area facts.
    state.priceIntent=true; state.originalIntent="PRICE";
    quote(directSpec);
    output.actions = ["phone"];
    return output;
  }
  if (entities.region || entities.ambiguousRegion || /출장|교체.*(?:돼|되|가능)|와요/.test(text)) state.serviceIntent=true;
  if (entities.manufacturer && !entities.matches.length && !state.selectedVehicleKey) {
    state.manufacturer=entities.manufacturer;
    state.manufacturerName=records.find(r=>r.manufacturerId===entities.manufacturer)?.manufacturerName || "";
  }
  state.turnIndex = (state.turnIndex || 0) + 1;
  state.lastIntent = intent;
  const symptom = symptomIntent(text);
  if (symptom) state.symptom = { intent: symptom, rawSafeText: symptomLabels[symptom], confirmedAt: state.turnIndex };
  const goal = {PRICE_QUESTION:"PRICE",BUY_REQUEST:"REPLACE",SERVICE_AREA_AVAILABILITY:"AREA",AGM_DIN_QUESTION:"BATTERY_TYPE"}[intent];
  if (goal) state.customerGoal = goal;
  if (symptom && !goal) state.customerGoal = "REPLACE";
  if (liveIntents.includes(intent)) state.customerGoal = "AREA";
  if (intent === "RECOVERY") {
    const field = recoveryField(text, state);
    say(field === "year" ? copy.recoveryYear : /fuel/i.test(field) ? copy.recoveryFuel : copy.recoveryModel);
    say(copy.recoveryNext); output.actions = ["phone"]; output.chips = [{label:copy.restart,value:"처음부터"}]; return output;
  }

  const explicitFamilyAnswer=state.previousQuestion?.field==="vehicle" && entities.matches.length===1 && normalizeText(text)===normalizeText(entities.matches[0].vehicle);
  const canonicalNamedWithYear=entities.matches.length===1 && entities.year && normalizeText(text).includes(normalizeText(entities.matches[0].manufacturerName)) && normalizeText(text).includes(normalizeText(entities.matches[0].vehicle));
  const shorthand = entities.shorthand && !explicitFamilyAnswer && !canonicalNamedWithYear && entities.matches.length === 1 ? entities.matches[0] : null;
  if (shorthand) {
    if (state.selectedVehicleKey && state.selectedVehicleKey !== shorthand.key) {
      state = {...createConversationState(),brand:state.brand,originalIntent:state.originalIntent,priceIntent:state.priceIntent,serviceIntent:state.serviceIntent,symptom:state.symptom,customerGoal:state.customerGoal,turnIndex:state.turnIndex,region:state.region,location:state.location,city:state.city,district:state.district,lastIntent:intent}; output.state=state;
    }
    state.manufacturer = shorthand.manufacturerId;
    state.manufacturerName = shorthand.manufacturerName;
    state.pendingVehicleConfirmation = {key:shorthand.key,label:`${shorthand.manufacturerName} ${shorthand.vehicle}`};
    state.result = null; state.confirmedBattery = null;
    entities.matches = [];
  } else if (state.pendingVehicleConfirmation && affirmative.test(text)) {
    entities.matches = buildVehicleGroups(records).filter(group=>group.key===state.pendingVehicleConfirmation.key);
    state.pendingVehicleConfirmation = null;
  } else if (state.pendingVehicleConfirmation && negative.test(text)) {
    state.pendingVehicleConfirmation=null; say(copy.needVehicle); return output;
  }

  // Plain answers can resolve any displayed option; no chip is required.
  const question = state.previousQuestion;
  let answered = Boolean(selected);
  if (!selected && question && !/가격|얼마|전화|출장|agm|배터리/i.test(text)) {
    const normalized = normalizeText(text).replace(/(이야|이에요|예요|맞아|입니다)$/, "");
    const choices = question.choices.filter(choice => [choice.value, choice.label].some(value => normalizeText(value) === normalized || (normalized.length >= 2 && normalizeText(value).includes(normalized))));
    const choice = choices.length === 1 ? choices[0] : null;
    if (question.field === "fuel" && question.confirm && affirmative.test(text)) { entities.fuel = question.confirm; answered = true; }
    else if (question.field === "fuel" && negative.test(text)) {
      ask("fuel", copy.fuel, question.choices); return output;
    } else if (choice) {
      if (question.field === "vehicle") entities.matches = buildVehicleGroups(records).filter(group => group.key === choice.key);
      if (question.field === "detailModel") {
        entities.detailModels=unique(records.filter(r=>`${r.manufacturerId}|${r.vehicle}`===state.selectedVehicleKey&&normalizeText(r.detailModel)===normalizeText(choice.value)).map(r=>r.detailModel));
        entities.detailModel=entities.detailModels.length===1?choice.value:"";
        state.detailModel="";
      }
      if (question.field === "fuel") entities.fuel = choice.value;
      if (question.field === "exactFuel") entities.exactFuel = choice.value;
      if (question.field === "year") entities.yearRange = choice.value;
      if (question.field === "engine") entities.engine = String(parseInt(choice.value,10));
      if (question.field === "drivetrain") entities.drivetrain = choice.value;
      answered = true;
    }
  }
  if (entities.matches.length === 1) {
    const match = entities.matches[0];
    if (state.selectedVehicleKey && state.selectedVehicleKey !== match.key) {
      state = { ...createConversationState(), brand:state.brand, originalIntent:state.originalIntent,priceIntent:state.priceIntent,serviceIntent:state.serviceIntent,symptom:state.symptom,customerGoal:state.customerGoal,turnIndex:state.turnIndex,region: state.region, location:state.location, pendingLocationDisambiguation:state.pendingLocationDisambiguation, city: state.city, district: state.district, lastIntent: intent };
      output.state = state;
    }
    state.selectedVehicleKey = match.key;
    state.pendingVehicleConfirmation = null;
    state.manufacturer = match.manufacturerId;
    state.manufacturerName = match.manufacturerName;
    state.vehicleFamily = match.vehicle;
    if (entities.trim) state.model = entities.trim;
    if (match.matchedDetail && !(entities.detailModels?.length>1)) entities.detailModel = match.matchedDetail;
    answered = true;
  }
  const changedYear = entities.year && entities.year !== state.year;
  if (changedYear) {
    if (state.year || (intent==='CORRECTION' && state.yearRange)) { state.detailModel = ""; state.detailModels=[]; state.generation = ""; }
    state.yearRange = "";
    state.year = entities.year;
  }
  if (entities.detailModel) state.detailModel = entities.detailModel;
  if (entities.detailModels) state.detailModels = entities.detailModels;
  if (entities.generation) state.generation = entities.generation;
  if (entities.fuel) { state.fuel = entities.fuel; state.exactFuel = ""; }
  if (entities.exactFuel) state.exactFuel = entities.exactFuel;
  if (entities.engine) state.engine = entities.engine;
  if (entities.drivetrain) state.drivetrain = entities.drivetrain;
  if (entities.yearRange) state.yearRange = entities.yearRange;
  if (entities.region) {
    state.region = entities.region;
    state.location = entities.region;
    state.city = entities.region.city;
    state.district = entities.region.district;
    state.pendingLocationDisambiguation = null;
  }
  if (entities.ambiguousRegion) {
    state.pendingLocationDisambiguation=entities.locationCandidates;
    if(entities.locationScope) { state.location=entities.locationScope;state.region=entities.locationScope; }
  }
  if (entities.year || entities.fuel || entities.detailModel || entities.exactFuel || entities.engine || entities.drivetrain || entities.yearRange) answered = true;
  if(answered || shorthand)state.quotedSpec="";
  if (intent === "CORRECTION") say(copy.correction(entities.year));

  let rows = filteredRows(records, state);
  // Revalidate even a restored session or a follow-up asking for price/AGM.
  {
    state.result = null; state.confirmedBattery = null;
    if (answered) { state.previousQuestion = null; state.ambiguity = null; }
    state.batteryCandidates = unique(rows.map(row => row.defaultBattery));
    if (batteryCertainty(rows).safe) {
      state.result = resolveConsultation(rows, {}).result;
      state.confirmedBattery = knownBattery(state.result) ? state.result.defaultBattery : null;
      state.generation = state.result.detailModel?.match(/\b([GFW]\d{2,3})\b/i)?.[1]?.toUpperCase() || state.generation;
    }
  }
  const areaAnswer = () => {
    output.locationState=entities.ambiguousRegion ? "AMBIGUOUS_AREA" : state.region ? "SUPPORTED_AREA" : "MISSING_AREA";
    if (entities.ambiguousRegion) {
      const candidates=entities.locationCandidates;
      say(copy.locationChoices(candidates.map(item=>item.fullLabel)));
      output.chips=candidates.slice(0,4).map(item=>({label:item.fullLabel,value:item.fullName}));
      return;
    }
    if (entities.unsupportedLocation) { state.region=null;state.location=null;state.city="";state.district="";state.pendingLocationDisambiguation=null;output.locationState="EXPLICIT_UNSUPPORTED_AREA";say(copy.serviceUnknown); output.actions=["phone"]; return; }
    // An explicit unknown place must not be replaced with the old remembered place.
    const placeBeforeService = (text.match(/(?:^|\s)([가-힣]{2,}?)(?=\s*(?:출장|방문|도\s*와))/)?.[1]
      || text.match(/지역(?:은|이)?\s*([가-힣]{2,}?)(?:입니다만|입니다|이에요|예요|인데요|인데|이구요|이고요|이고|$)/)?.[1])?.replace(/(?:인데요|인데|이고요|이고|입니다|이에요|예요)$/,'');
    const noun=placeBeforeService?.replace(/(?:으로|이요|은|는|도|로)$/,'');
    const explicitPlace = placeBeforeService && !["여기", "거기", "오늘", "내일", "지금", "배터리", "밧데리", "근처", "쪽", "지역", "방문", "출장", "교체", "무료", "유료", "차량", "자동차", "가능", "혹시", "정말", "타이어", "장착", "서비스"].includes(noun);
    const placeResult=explicitPlace ? resolveLocation(placeBeforeService,localities) : null;
    const explicitUnsupported=explicitPlace && !placeResult.region && !placeResult.ambiguousRegion && !records.some(row=>[row.vehicle,row.manufacturerName].includes(placeBeforeService)||[row.vehicle,row.manufacturerName].includes(noun)) && !brandIntent(noun,priceCatalog);
    const newUnknownPlace = explicitUnsupported;
    if (newUnknownPlace) { state.region=null;state.location=null;state.city="";state.district="";state.pendingLocationDisambiguation=null;output.locationState="EXPLICIT_UNSUPPORTED_AREA";say(copy.serviceUnknown); output.actions = ["phone"]; return; }
    if (state.region) { say(entities.shortLocation ? copy.serviceShort(state.region.fullLabel) : variant("area", state.turnIndex, state.region.fullLabel || state.region.name)); output.region = state.region; output.actions = ["phone"]; }
    else say("네, 출장 배터리 교체 가능합니다. 차량이 있는 지역을 알려주세요. 동이나 구 이름만 말씀해주셔도 됩니다.");
  };
  if (liveIntents.includes(intent)) {
    if (entities.region || entities.ambiguousRegion || entities.unsupportedLocation || state.region) areaAnswer();
    say(copy.dispatch); output.actions = ["phone"]; return output;
  }
  if (symptom) {
    say(copy.symptomAck(symptomLabels[symptom]));
    if (!answered) {
      if (!state.selectedVehicleKey) say(copy.needVehicle);
      else if (state.previousQuestion) { say(state.previousQuestion.prompt); output.chips=state.previousQuestion.choices.slice(0,4); }
      else if (state.result) output.result=state.result;
      output.actions=["phone"]; return output;
    }
  }
  if (shorthand && state.pendingVehicleConfirmation) {
    if(entities.region || entities.ambiguousRegion) areaAnswer();
    say(copy.vehicleConfirm(state.pendingVehicleConfirmation.label));
    return output;
  }
  if (!entities.region && state.pendingLocationDisambiguation && answered) {
    entities.ambiguousRegion=true;entities.locationCandidates=state.pendingLocationDisambiguation;
  }
  if (entities.ambiguousRegion) {
    if(state.result) {say(copy.result(state.result.defaultBattery));output.result=state.result;}
    areaAnswer(); return output;
  }
  if (intent === "CALL_REQUEST") { say(copy.call); output.actions = ["phone"]; return output; }
  if(policyIntent && servicePolicy.answers?.[policyIntent]) {
    if(entities.region)areaAnswer();
    say(servicePolicy.answers[policyIntent]);
    if(policyIntent==='KEEP_OLD_BATTERY')output.actions=['phone'];
    return output;
  }
  if(requestedBrand && !answered && (state.quotedSpec || state.result?.defaultBattery)) {
    quote(state.quotedSpec || state.result.defaultBattery);output.actions=['phone'];return output;
  }
  // PRICE is a retained goal, not a terminal reply before vehicle narrowing.
  if (intent === "PRICE_QUESTION" && state.result) {
    if(entities.region) areaAnswer();
    say(copy.result(state.result.defaultBattery)); if(priceCatalog)quote(state.result.defaultBattery);else say(variant("price",state.turnIndex));
    output.result=state.result; output.actions=["phone","stores"]; return output;
  }
  if (intent === "BUY_REQUEST") { say(knownBattery(state.result) ? copy.buy : copy.needDetails); output.actions = knownBattery(state.result) ? ["phone", "stores"] : ["phone"]; return output; }
  if (["AGM_DIN_QUESTION", "BATTERY_QUESTION"].includes(intent) && knownBattery(state.result)) {
    {
      if (/agm.*뭐|agm.*뜻/i.test(text)) say(copy.agm);
      const substitute = /써도|써두|대신|다른|바꿔|사용.*돼/.test(text);
      say(substitute ? copy.substitution(state.result.defaultBattery) : copy.battery(state.result.defaultBattery));
      const type = batteryStoreType(state.result.defaultBattery);
      if (!substitute && intent === "AGM_DIN_QUESTION" && type !== "unknown") say(copy.batteryType(type));
      if (substitute) output.actions = ["phone"];
    }
    return output;
  }
  if (intent === "SERVICE_AREA_AVAILABILITY" && !answered) { areaAnswer(); return output; }
  if (/코딩/.test(text)) { say(copy.coding); output.actions = ["phone"]; return output; }
  if (entities.ambiguousYear) { state.result = null; state.confirmedBattery = null; ask("year", copy.yearAmbiguous); return output; }
  if (entities.matches.length > 1) {
    const choices = entities.matches.map(match => ({ value: `${match.manufacturerName} ${match.vehicle}`, label: `${match.manufacturerName} ${match.vehicle}`, key: match.key }));
    ask("vehicle", copy.model(choices.map(choice => choice.label)), choices); return output;
  }
  if (!state.selectedVehicleKey && (state.priceIntent || entities.manufacturer)) {
    if(entities.region) areaAnswer();
    const families=unique(records.filter(r=>r.manufacturerId===state.manufacturer).map(r=>r.vehicle));
    ask("vehicle",state.manufacturer ? `${state.manufacturerName} 어떤 차종이세요? ${families.slice(0,3).join(", ")}처럼 알려주세요.` : "차량마다 배터리 규격이 달라요. 어떤 차량이세요?",families.map(value=>({value,label:value,key:`${state.manufacturer}|${value}`})));
    return output;
  }
  if (!answered && !state.priceIntent && !["BATTERY_QUESTION","PRICE_QUESTION"].includes(intent)) {
    if (state.selectedVehicleKey) { say(copy.unsupported); output.actions = ["phone"]; }
    else { state.failures += 1; say(state.failures > 1 ? copy.noMatchAgain : variant("fallback",state.turnIndex)); if (state.failures > 1) output.actions = ["phone"]; }
    return output;
  }
  if (!state.selectedVehicleKey) { say(copy.needVehicle); return output; }
  state.failures = 0;
  if (entities.region) areaAnswer();
  if (!rows.length) { say(copy.noCombination); output.actions = ["phone"]; return output; }
  if (state.result) {
    say(knownBattery(state.result) ? copy.result(state.result.defaultBattery) : copy.needsCheck);
    if (state.result.upgradeBattery) say(copy.upgrade(state.result.upgradeBattery));
    output.result = state.result;
    if(priceCatalog) { quote(state.result.defaultBattery); output.actions=["phone","stores"]; }
    else if(state.priceIntent) { say(variant("price",state.turnIndex)); output.actions=["phone","stores"]; }
    return output;
  }
  const next=vehicleCandidateOptions(records,state);
  if(next){
    const choices=next.choices;
    const prompt=next.field==='year'?copy.year:next.field==='fuel'?copy.fuel:copy.detail(choices.map(c=>c.label));
    ask(next.field,prompt,choices); return output;
  }
  // Identical known attributes with conflicting facts must never be guessed.
  const specs = unique(rows.map(row=>row.defaultBattery));
  if (priceCatalog && specs.length === 1 && splitBatterySpec(specs[0]).length > 1) {
    quote(specs[0]); output.actions=["phone"]; return output;
  }
  say(copy.needsCheck); output.actions = ["phone"]; return output;
}
