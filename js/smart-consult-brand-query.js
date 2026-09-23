import {catalogSpecMention,splitBatterySpec,priceDescription,batteryPrice} from './smart-consult-prices.js?v=owner-delkor-v1';

// Brand availability is derived from the same governed catalog as pricing.
// Only catalog-backed products can inherit the explicit Owner non-AGM policy.
export function authoritativeBrands(code,catalog) {
  if(!Object.hasOwn(catalog?.prices||{},code))return [];
  return Object.keys(catalog.brands||{}).filter(id=>batteryPrice(code,catalog,id).supported);
}
export function productOriginQuestion(text) {
  return /어느나라|원산지|어디서(?:생산|제조|만들)|국산|독일산|중국산/.test(String(text).normalize('NFKC').replace(/\s/g,''));
}
export function brandQueryPlan(text,catalog) {
  const s=String(text).normalize('NFKC').replace(/\s/g,'');
  if(productOriginQuestion(text)||/차이|비교|더좋|더낫|오래|수명|왜|맞아|맞나요|호환|넣어|대신|달려|장착|쓰고있|써있|제조일|정품|실버|silver|블랙|black|어디제품/i.test(s))return null;
  const brands=Object.entries(catalog?.brands||{}).filter(([,b])=>b.aliases.some(a=>s.toLowerCase().includes(a.toLowerCase()))).map(([id])=>id);
  const manufacturerWording=/제조회사|제조사|제조업체|메이커|(?:어느|어디|무슨|어떤)회사|회사(?:는|가|인가|예요|에요|제품|어디|뭐|[?!.]|$)|누가만(?:든|드는)제품/.test(s);
  if(!(/브랜드|어디(?:꺼|거)/.test(s)||manufacturerWording||(brands.length&&/있나요|있어요|쓰나요|써요|취급|인가요/.test(s))))return null;
  // Extend only the query's lexical boundary, not global shorthand/vehicle rules.
  let bounded=String(text).replace(/(?<=[A-Za-z0-9])(?=(?:은|는|이|가|의)?(?:어디|무슨|어느|어떤|제조\s*(?:회사|사|업체)|메이커|회사|누가|브랜드))/g,' ');
  for(const b of Object.values(catalog.brands||{}))for(const alias of b.aliases)bounded=bounded.replace(new RegExp(alias,'gi'),alias+' ');
  const mention=catalogSpecMention(bounded,catalog);
  const explicit=[...bounded.matchAll(/(?:AGM|DIN|DF)\s*\d+(?:HL|AL|L|R)?/gi)].map(m=>m[0].replace(/\s/g,'').toUpperCase());
  const unknown=!mention&&explicit.find(code=>!Object.hasOwn(catalog.prices,code));
  return {mention,unknown,explicit,brands,manufacturerWording,price:/가격|얼마|비용/.test(s),generalConventional:/일반.*배터리/.test(s)&&!mention,generalAgm:/^AGM(?:은|배터리|브랜드|어떤|무슨)/i.test(s)&&!mention};
}
export function brandQueryReply(plan,previous,catalog) {
  const state={...previous},messages=[],actions=[],chips=[];
  if(plan.unknown)return {state,messages:[`${plan.unknown}는 현재 등록된 규격이 아닙니다. 정확한 규격과 취급 브랜드 확인이 필요합니다.`,...plan.brands.filter(id=>catalog.brands[id].prices&&!Object.hasOwn(catalog.brands[id].prices,plan.unknown)).map(id=>`${plan.unknown}는 ${catalog.brands[id].label} 판매 지원 규격이 아닙니다.`)],actions:['phone'],chips,result:null,region:state.region};
  if(plan.mention?.candidates.length>1)return {state,messages:[`어떤 배터리 규격 말씀하시는 건가요? ${plan.mention.candidates.join(' / ')} 중 선택해 주세요.`],actions,chips:plan.mention.candidates.map(code=>({label:code,value:code+' 브랜드'+(plan.price?' 가격':'')})),result:null,region:state.region};
  const spec=plan.mention?.candidates[0]||plan.explicit.join(' 또는 ')||(!plan.generalAgm&&!plan.generalConventional&&(state.quotedSpec||state.confirmedBattery||state.customerReportedSpec))||'';
  if(plan.mention||plan.explicit.length){state.quotedSpec=spec;if(state.customerReportedSpec!==spec)state.customerReportedSpec='';}
  if(plan.brands.length===1)state.brand=plan.brands[0];
  if(!spec){
    const base=catalog.brands[catalog.defaultAgmBrand]?.label;
    const alternatives=Object.entries(catalog.brands).filter(([,b])=>b.prices).map(([,b])=>`${Object.keys(b.prices).join('·')} 규격은 ${b.label}도 선택 가능합니다.`);
    if(!plan.generalConventional)messages.push(`AGM은 기본적으로 ${base} 제품을 취급하고 있으며, ${alternatives.join(' ')} 규격에 따라 취급 브랜드가 다릅니다.`);
    if(!plan.generalAgm){const brand=catalog.nonAgmBrandPolicy?.scope==='canonical_non_agm'&&catalog.brands[catalog.nonAgmBrandPolicy.brand]?.label;messages.push(brand?`저희가 취급하는 일반 배터리(등록된 비AGM 규격)는 모두 ${brand} 제품입니다.`:'일반 배터리는 정확한 규격별 취급 브랜드 확인이 필요합니다.');}
  }else{
    for(const code of splitBatterySpec(spec)){
      const brands=authoritativeBrands(code,catalog);
      if(!brands.length){messages.push(`${code}의 취급 브랜드는 정확한 확인이 필요합니다. 고객센터 1644-9141로 확인해 주세요.`);actions.push('phone');}
      else messages.push(`${code} 규격은 ${brands.map(id=>catalog.brands[id].label).join('와 ')} 제품을 안내하고 있습니다.`);
      for(const id of plan.brands)if(!brands.includes(id))messages.push(brands.length||catalog.brands[id].prices?`${code}는 현재 ${catalog.brands[id].label} 판매 지원 규격이 아닙니다.`:`${code}의 ${catalog.brands[id].label} 취급 여부는 확인이 필요합니다.`);
      if(plan.price){
        const selected=plan.brands.length?plan.brands:brands;
        for(const id of selected.filter(id=>brands.includes(id)))messages.push(priceDescription(code,catalog,id));
        if(!brands.length&&!plan.brands.length)messages.push(priceDescription(code,catalog));
      }
    }
    if(splitBatterySpec(spec).length>1)messages.push('정확한 장착 규격은 현재 배터리를 현장에서 확인해야 합니다.');
  }
  state.lastIntent='BRAND_QUERY';
  return {state,messages,actions:[...new Set(actions)],chips,result:null,region:state.region};
}
