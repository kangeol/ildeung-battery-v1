import { batteryPrice, formatWon, priceDescription, splitBatterySpec } from './smart-consult-prices.js?v=owner-delkor-v1';

// Intent recognition only; policy assertions and prices are injected canonical data.
export function comparisonIntent(text,state,catalog) {
  const s=String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase().replace(/^(?:혹시|그럼|저기)/,'');
  const brands=Object.entries(catalog?.brands||{}).filter(([,b])=>b.aliases.some(a=>s.includes(a.replace(/\s/g,'').toLowerCase()))).map(([id])=>id);
  const context=state.lastIntent==='BRAND_COMPARE'||Boolean(state.brand==='VARTA'&&(state.quotedSpec||state.confirmedBattery));
  // A changed address or appointment is not a request to compare products,
  // even when an earlier turn selected a brand.
  const changedServiceFact=/(?:주소|위치|장소|시간|시각|일정|예약|접수|주차|현장|작업지|도착).{0,16}(?:달라|변경|바뀌)|(?:달라|변경|바뀌).{0,16}(?:주소|위치|장소|시간|시각|일정|예약|접수|주차|현장|도착)/.test(s);
  if(changedServiceFact&&!brands.length)return null;
  // Payment, calendar, location and vehicle-to-vehicle price differences are
  // not DELKOR/VARTA comparisons. Nor are two different battery capacities.
  if(!brands.length&&/(?:현금|카드|지역|주소|위치|시간|오늘|내일|bmw|벤츠|기아|현대|agm\d+.*agm\d+)/.test(s)&&/달라/.test(s))return null;
  const productSubject=brands.length>0||/브랜드|제품|배터리규격|성능|수명|둘|가격이달라|왜가격.*달라/.test(s)||(context&&/가격/.test(s));
  const compare=/차이|비교|뭐가.*(?:좋|나아|낫)|어떤.*(?:나아|낫|추천)|더좋|안좋|별로|더길|더오래|추천|뭘로할|가격생각|싼게좋|비싸|할만|사장님이면/.test(s)||(productSubject&&/달라/.test(s))||brands.length>0&&/좋|나아|낫|별로|성능|수명/.test(s);
  const product=/정품|새제품|최신.*제조|실버|원산지|어디서만들|성능|수명/.test(s);
  if(!compare&&!product)return null;
  // Explicit single-brand origin/authenticity and ordinary battery-life questions
  // keep their established paths. Deictic product questions require context.
  const omitted=/둘|^원산지|^어디서만들|^성능|^수명(?:은|차이)|^차이|^가격차이|^얼마차이|^뭐가|^어떤게|^추천은|^뭘로할/.test(s);
  if(!compare&&!(brands.length===2||context&&omitted||!brands.length&&omitted))return null;
  if(!brands.length&&!context){
    if(/^추천해/.test(s))return null; // Existing vehicle-entry request.
    return {clarify:true};
  }
  return {clarify:false,causal:/왜.*(?:비싸|가격|달라)|비싸.*이유/.test(s)};
}

export function comparisonReply(state,catalog,policy,causal=false) {
  const p=policy.product,messages=[`${p.scope} ${Object.entries(p.brands).map(([id,origin])=>`${catalog.brands[id].label}는 ${origin} 제품입니다.`).join(' ')}`,p.chinese,p.assurance.COMBINED];
  const spec=state.quotedSpec||state.confirmedBattery;
  const codes=spec?splitBatterySpec(spec):[];
  if(codes.length){
    for(const brand of Object.keys(p.brands))messages.push(priceDescription(spec,catalog,brand));
    for(const code of codes){const a=batteryPrice(code,catalog,'DELKOR'),b=batteryPrice(code,catalog,'VARTA');if(a.amount!==null&&b.amount!==null&&b.amount>a.amount)messages.push(`${a.code}의 두 브랜드 가격 차이는 ${formatWon(b.amount-a.amount)}입니다.`);}
  }else{
    const differences=[...new Set(Object.keys(catalog.brands.VARTA.prices).map(code=>batteryPrice(code,catalog,'VARTA').amount-batteryPrice(code,catalog,'DELKOR').amount))];
    if(differences.length===1&&differences[0]>0)messages.push(`두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 ${formatWon(differences[0])} 높습니다.`);
  }
  messages.push(p.comparison,p.comparisonContext.support,p.comparisonContext.performance,p.lifespan);
  if(causal)messages.push(p.comparisonContext.causal);
  return messages;
}
