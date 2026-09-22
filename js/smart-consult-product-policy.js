import {brandIntent,batteryPrice,priceDescription,splitBatterySpec,formatWon} from './smart-consult-prices.js?v=product-v1';
import {PHONE_LABEL} from './smart-consult-core.js?v=certainty-v1';

export function extendedPolicyIntent(text) {
  const s=String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase();
  if(/무조건.*교환|새배터리.*(?:바꿔|교환)|어떤경우.*a\/?s|(?:3|삼)개월.*(?:넘|지났|이후)|교환조건|환불/.test(s))return 'AS_DETAIL';
  if(/(?:^|[^a-z])a\/?s(?:[^a-z]|$)|보증|(?:교체하고|설치후).*문제|3개월.*문제/.test(s))return 'AS';
  if(/공휴일|연휴|추석|설날/.test(s))return 'HOLIDAY';
  if(/일요일/.test(s))return 'SUNDAY';
  if(/(?:오늘|지금).*(?:영업|운영|하나요)/.test(s))return 'TODAY';
  if(/영업시간|운영시간|몇시(?:부터|까지)|몇시에문닫|주말.*하|토요일.*하/.test(s))return 'HOURS';
  if(/뭐가.*(?:좋|낫)|더좋|더오래|수명차이|둘.*(?:차이|낫|좋)|할만|사장님이면|추천해/.test(s))return 'COMPARE';
  if(/블랙|black/.test(s))return 'BLACK';
  if(/국산|독일산|중국산|실버|silver|어디서만들|어디제품|어떤브랜드/.test(s))return 'ORIGIN';
  return null;
}

export function extendedPolicyReply(text,state,catalog,policy) {
  const intent=extendedPolicyIntent(text);
  if(!intent || !policy)return null;
  const phone=value=>value.replaceAll('{phone}',PHONE_LABEL);
  if(policy.businessHours?.[intent])return {messages:[phone(policy.businessHours[intent])],actions:['phone']};
  if(['AS','AS_DETAIL'].includes(intent) && policy.afterSales){
    const a=policy.afterSales;
    const statement=`${a.scope}는 ${a.basis} 기준 ${a.periodMonths}개월 이내 A/S가 가능합니다.`;
    return {messages:[(intent==='AS'?'네. ':'')+statement,...(intent==='AS_DETAIL'?[phone(a.detail)]:[])],actions:['phone']};
  }
  const p=policy.product;
  if(!p || !catalog?.brands)return null;
  const names=Object.keys(p.brands);
  const origin=brand=>`${catalog.brands[brand].label}는 ${p.brands[brand]} 제품입니다.`;
  const messages=[];
  if(intent==='BLACK')messages.push(p.black);
  const selected=brandIntent(text,catalog)||state.brand;
  const brands=intent==='ORIGIN'&&names.includes(selected)?[selected]:names;
  messages.push(`${p.scope} ${brands.map(origin).join(' ')}`,p.chinese);
  if(intent==='COMPARE'){
    const spec=state.quotedSpec||state.confirmedBattery;
    if(spec && splitBatterySpec(spec).every(code=>/^AGM/i.test(code)))for(const brand of names)messages.push(priceDescription(spec,catalog,brand));
    const differences=[...new Set(Object.keys(catalog.brands.VARTA?.prices||{}).map(code=>{
      const base=batteryPrice(code,catalog,'DELKOR').amount,other=batteryPrice(code,catalog,'VARTA').amount;
      return base!==null&&other!==null?other-base:null;
    }).filter(n=>n!==null))];
    if(differences.length===1 && differences[0]>0)messages.push(`두 브랜드 모두 판매하는 동일 규격 기준으로 바르타가 델코보다 ${formatWon(differences[0])} 높습니다.`);
    messages.push(p.comparison,p.lifespan);
  }
  return {messages,actions:[]};
}
