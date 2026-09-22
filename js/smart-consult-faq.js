import {PHONE_LABEL} from './smart-consult-core.js?v=certainty-v1';

// Only recognition lives here. All commercial facts and reply templates are injected.
export function finalFaqIntent(text) {
  const s=String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase();
  if(/(?:폐|헌|기존)배터리|배터리반납/.test(s))return null;
  // ETA must never borrow the replacement duration, including numeric deadlines.
  if(/도착|언제.*(?:와|오)|몇(?:분|시).*뒤.*(?:와|오)/.test(s) || (/출장.*시간/.test(s)&&!/교체|작업|장착/.test(s)))return null;
  if(/(?:지금|오늘).*가면.*(?:얼마나|시간)/.test(s) && !/교체|작업|장착/.test(s))return 'DURATION_CLARIFY';
  if(/(?:교체|작업|장착)(?:하는데|하는데에|시간|하는시간)|(?:교체|작업|장착).*(?:몇분|얼마나|오래)|^(?:10|20)분.*(?:되|끝)/.test(s))return 'WORK_TIME';
  if(/수수료|할인|부가세|vat|계좌번호/.test(s))return 'PAYMENT_CONFIRM';
  const payments=[];
  if(/카드/.test(s))payments.push('CARD');
  if(/현금영수증/.test(s))payments.push('CASH_RECEIPT');
  if(/세금계산서/.test(s))payments.push('TAX_INVOICE');
  if(/계좌이체|이체|계좌로/.test(s))payments.push('BANK_TRANSFER');
  if(payments.length>1 || /결제(?:수단|는뭐|방법)|영수증이나세금계산서/.test(s))return 'PAYMENT_COMBINED';
  if(payments.length)return payments[0];
  // Customer visiting the shop is different from a technician visiting the vehicle.
  const visit=/직접.*(?:가|방문)|제가.*가도|매장.*방문|방문(?:해도|해서|구매|하려)|사러가도|주소/.test(s);
  if(visit){
    if(/지금|오늘/.test(s))return 'VISIT_NOW';
    if(/주소/.test(s))return 'VISIT_ADDRESS';
    return 'VISIT';
  }
  return null;
}

export function finalFaqReply(text,policy) {
  const intent=finalFaqIntent(text),faq=policy?.finalFaq;
  const template=faq?.answers[intent];
  if(!template)return null;
  const message=template.replaceAll('{phone}',PHONE_LABEL)
    .replaceAll('{min}',String(faq.facts.BATTERY_REPLACEMENT_TYPICAL_MINUTES_MIN))
    .replaceAll('{max}',String(faq.facts.BATTERY_REPLACEMENT_TYPICAL_MINUTES_MAX));
  return {messages:[message],actions:/^VISIT|CONFIRM|CLARIFY/.test(intent)?['phone']:[]};
}
