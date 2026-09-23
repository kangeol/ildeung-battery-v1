// Recognizers only. Answers/facts are sourced from the injected policy catalog.
export function operationalPlan(text,state) {
  const s=String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase().replace(/^(?:혹시|저기|그럼)/,'');
  const keys=[],queries=[];let topic='';
  const add=k=>{keys.push(k);topic=k;};
  const reservation=/예약|신청|접수/.test(s);
  const scheduleShort=/^(?:오늘|내일|아침|점심|오전|오후|저녁|밤|야간|주말|\d{1,2}시)(?:은|는)(?:요)?[?!.]*$/.test(s);
  const scheduleContext=['OP_REALTIME','OP_RESERVATION','ARRIVAL_TIME','TODAY_SERVICE','LIVE_DISPATCH_AVAILABILITY','URGENT_SERVICE'].includes(state.lastIntent);
  const scheduleMarker=/아침|오전|점심|오후|저녁|야간|밤(?:에|도|은)|퇴근(?:후|하고)|\d{1,2}시(?:반|쯤|에|가능|돼|되)|내일|주말|토요일|일요일/.test(s);
  const businessOnly=/영업|운영|근무|(?:주말|토요일|일요일).*하(?:나요|세요|시나요)|아침부터해/.test(s)&&!/방문|교체|작업|예약/.test(s);
  const schedule=!businessOnly&&(!scheduleShort&&scheduleMarker&&/가능|되|돼|방문|교체|작업|예약|해요|하나요/.test(s)||scheduleShort&&scheduleContext);
  const arrival=/배차|도착|기사(?:님)?.*(?:언제|얼마나|몇분|몇시)|언제와|얼마나.*와|제일빠른|가장빠른/.test(s);
  const realtime=schedule||arrival||/(?:오늘|지금|바로|당일).*(?:가능|되|돼|올수|와|교체)|^(?:오늘|지금)(?:은|은요)?[?!.]*$|언제가능|몇시가능/.test(s);
  const asDetail=/문제생기면|교체하고방전|불량.*바꿔|as어디|a\/s어디/.test(s);
  const symptom=!asDetail&&/딸깍|시동.*안걸|불은들어|배터리문제|방전|점프/.test(s)&&!/방전(?:은|이)?아니/.test(s);
  const life=/수명(?:이|은)?얼마|배터리몇년|\d+년(?:됐|됬|썼|사용)|(?:시동걸리는데|언제).*바꿔|언제바꾸|교체해야|더써도/.test(s);
  const site=/지하주차장|주차장|회사로|집앞|도로에|길가/.test(s);
  const absent=/비대면|제가없|사람없|차만있|(?:차)?키.*(?:두고|맡|인계|보관|어디)|가족.*(?:대신|있)|와이프.*있|남편.*(?:대신|있)/.test(s);
  const product=/새거|새배터리|새제품|중고|재생|리퍼/.test(s)&&!/교환|바꿔/.test(s);
  const reason=/왜.*싸/.test(s);
  const entry=/뭘사야|어떤거넣|제차에뭐|배터리종류.*모르|규격.*몰라|차량만알려/.test(s)||(/^추천해/.test(s)&&!state.quotedSpec&&!state.confirmedBattery);
  const deictic=/여기도|우리동네/.test(s);
  const bareDuration=/^얼마나걸(?:려요|려|리나요|려요요)[?!.]*$/.test(s);
  if(/^(?:가격은|비용은|얼마|그래서얼마예요)[?!.]*$/.test(s)&&state.quotedSpec&&!state.result)queries.push(`${state.brand||''} ${state.quotedSpec} 가격`);
  if(reservation)add('RESERVATION');
  if(realtime)add('REALTIME');
  if(scheduleShort&&!scheduleContext)add('SHORT_CLARIFY');
  if(schedule&&/(?:교체|작업|장착).*(?:얼마나|몇분|시간)|작업시간/.test(s))queries.push('작업시간');
  if(life)add('LIFE');
  if(site)add('SITE');
  if(absent)add('NON_FACE_TO_FACE');
  if(product)add('NEW_PRODUCT');
  if(reason)add('PRICE_REASON');
  if(asDetail)queries.push('무조건 교환되나요?');
  if(/쓰던거.*가져|헌배터리.*어떻게/.test(s))queries.push('폐배터리 수거하나요?');
  if(/기존거.*(?:가져|갖)|기존배터리.*제가.*가져/.test(s))queries.push('폐배터리 보관하고 싶어요');
  if(/등록.*해주|배터리등록|컴퓨터작업|교체후세팅/.test(s))queries.push('코딩비용 포함인가요?');
  if(/이가격이끝|가서돈더받/.test(s))queries.push('현장 추가비용 있나요?');
  if(entry)queries.push('배터리 가격');
  if(deictic||/^출장은[?!.]*$/.test(s))queries.push('출장 가능해요?');
  if(bareDuration)queries.push(state.lastIntent==='OP_WORK_TIME'?'작업시간':['OP_REALTIME','OP_RESERVATION','ARRIVAL_TIME','TODAY_SERVICE','LIVE_DISPATCH_AVAILABILITY','URGENT_SERVICE'].includes(state.lastIntent)?'오늘 가능해요?':'지금 가면 얼마나 걸려요?');
  if(/^(?:돼요|가능)[?!.]*$/.test(s)){
    if(['OP_RESERVATION','OP_REALTIME'].includes(state.lastIntent))add('REALTIME');
    else if(state.lastIntent==='OP_NON_FACE_TO_FACE')add('NON_FACE_TO_FACE');
    else if(state.lastIntent==='OP_SITE')add('SITE');
    else if(state.lastIntent==='SERVICE_AREA_AVAILABILITY'&&state.region)queries.push('출장 가능해요?');
    else add('SHORT_CLARIFY');
  }
  // Only intercept already-recognized symptoms when composing another intent;
  // the existing symptom path and its recovery/session semantics remain intact.
  if(symptom&&(keys.length||queries.length||/딸깍|배터리문제/.test(s)))add('SYMPTOM');
  if(!keys.length&&!queries.length)return null;
  return {keys:[...new Set(keys)],queries:[...new Set(queries)],topic,life,symptom,entry,realtime,bareDuration,schedule};
}
