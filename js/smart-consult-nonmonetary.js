// Amount words are not price evidence when their complement measures time,
// frequency or distance. Keep this separate from the general unknown fallback.
const compact = value => String(value).normalize('NFKC').replace(/\s/g, '').toLowerCase();
const quantity = /얼마(?:나)?(?:동안|오래|자주|멀|먼|가까|걸|기다|남|안남|안됐|안됬|안되|안된|안지났|지났|보관|저장|보유|유지|사용|주행|충전|빨리|빨라|늦|시간|기간|지속|버텨|버티)/;

export function nonmonetaryEolma(text) {
  const s=compact(text);
  return quantity.test(s) || /얼마(?:나)?(?:더)?(?:빨리|오래|자주|멀|걸|기다|남)/.test(s) || /시간.*얼마(?:나)?잡/.test(s);
}

export function monetaryQuestion(text) {
  if(!/가격|얼마|비용|견적|배터리값|밧데리값/.test(text))return false;
  // Remove only non-monetary amount expressions, not another monetary clause.
  const clauses=String(text).split(/[?？!。\n]|그리고|(?<=걸리고)|(?<=걸리는데)/);
  return clauses.some(c=>/가격|얼마|비용|견적|배터리값|밧데리값/.test(c)&&!nonmonetaryEolma(c));
}

export function nonmonetaryPlan(text, state={}) {
  const s=compact(text),followup=state.lastIntent==='NONMONETARY_PRIVACY'&&/개인정보|제정보|차량정보/.test(s);
  if(!nonmonetaryEolma(text)&&!followup)return null;
  let kind='CLARIFY';
  if(/개인정보|제정보|상담(?:내용|기록)|정보.*(?:보관|저장|보유)/.test(s)||followup)kind='PRIVACY';
  else if(/보관|저장|보유/.test(s))kind='RETENTION';
  else if(/얼마(?:나)?안(?:남|됐|됬|되|지났)/.test(s))kind='SITUATION';
  else if(/보증|warranty|a\/?s|에이에스|교체후.*문제/.test(s))kind=/대응|빨리|기다/.test(s)?'AS_RESPONSE':'AS_PERIOD';
  else if(/(?:교체|설치|장착)후|설치하고/.test(s)&&/운전|주행/.test(s))kind='POST_INSTALL';
  else if(/오는|오는데|오시는|오실|올수|와요|도착|방문|대기|출동|배차/.test(s)||/출장.*시간/.test(s)&&!/교체|작업|장착/.test(s))kind='ARRIVAL';
  else if(/여러차|여러대|몇대|두대|세대/.test(s)&&/걸|시간/.test(s))kind='MULTIPLE_WORK';
  else if(/교체|작업|장착/.test(s)&&/걸|시간|동안/.test(s))kind='WORK';
  else if(/걸|기다|빨리/.test(s))kind=state.lastIntent==='OP_WORK_TIME'?'WORK':/예약|OP_REALTIME|OP_RESERVATION|ARRIVAL_TIME/.test(s+' '+(state.lastIntent||''))?'ARRIVAL':'DURATION';
  else if(/배터리|밧데리|충전|주행/.test(s)&&/사용|오래|주행|충전|버텨|버티/.test(s))kind='USE';
  else if(/멀|먼|가까/.test(s))kind='DISTANCE';
  // Explicit monetary clauses retain the existing price and service-policy paths.
  const priceQueries=String(text).split(/[?？!。\n]|그리고|(?<=걸리고)|(?<=걸리는데)/)
    .map(c=>c.trim()).filter(c=>c&&monetaryQuestion(c)&&!nonmonetaryEolma(c));
  return {kind,priceQueries};
}

// These are semantic clarifications, not new prices, legal retention facts or ETAs.
export const nonmonetaryCopy = Object.freeze({
  PRIVACY:'개인정보 보관기간을 문의하시는군요. 현재 상담 자료로는 정확한 보관기간을 확인할 수 없습니다. 웹 상담 기록, 예약 접수 정보 등 어떤 정보의 보관기간을 말씀하시는지 알려주세요.',
  SITUATION:'말씀하신 상황을 이해했습니다. 지금 어떤 도움이 필요하신가요?',
  CLARIFY:'어떤 기간이나 정도를 말씀하시는지 조금 더 알려주시겠어요?',
  RETENTION:'무엇을 보관하는 기간이 궁금하신가요? 보관 대상과 이용하신 서비스를 알려주시면 확인할 내용을 안내하겠습니다.',
  DISTANCE:'출발지와 목적지를 말씀해 주시겠어요? 거리나 이동시간은 경로와 교통 상황 확인이 필요합니다.',
  USE:'정확한 사용·주행·충전 시간을 일률적으로 정할 수는 없습니다. 배터리 상태와 사용환경, 충전 상태에 따라 달라지므로 실제 배터리와 충전 상태를 점검해 주세요.',
  MULTIPLE_WORK:'여러 차량의 전체 작업시간은 대수와 작업 상황에 따라 달라집니다. 전체 일정은 고객센터 {phone}로 확인해 주세요.'
});
