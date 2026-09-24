// Recognition only. Replies reuse the injected service policy and existing knowledge.
export function purchaseStagePlan(text,state) {
 const s=String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase().replace(/^(?:혹시|그럼|저기)/,''),keys=[];
 const settings=/설정|메모리/.test(s)&&/초기화|날아|유지|보존|라디오|블랙박스/.test(s);
 const process=/(?:교체|작업)(?:는|를|은)?어떻게|(?:교체|작업)(?:방법|절차|과정)|시동(?:을)?(?:켜놓|켜고|끄고|끈채)/.test(s);
 const post=/교체후.*(?:바로운전|해야할|해야되)|따로해야할것/.test(s);
 const waste=/(?:폐|헌|기존)배터리|배터리반납|^반납해야/.test(s);
 const keep=/(?:제가)?(?:가지고|갖고).*(?:있어|싶|되)|안주면|반납안|미수거|수거하지|보관/.test(s)&&(waste||/^제가(?:가지고|갖고)|^안주면|^반납안/.test(s)||state.lastIntent==='STAGE_WASTE');
 const wasteFee=/수거비|폐배터리(?:값|가격)|고철값/.test(s);
 const detail=/불량(?:이면|인가|일까|[?!.]|$)|출장a\/?s|교체후시동.*안걸|교체후재방전/.test(s)||/방전/.test(s)&&/a\/?s|보증/.test(s);
 const site=/공항주차장|갓길|기계식|차가안쪽|낮은지하/.test(s)||/^(?:회사|공영|마트|아파트지하|도로|공항)(?:주차장)?[?!.]*$/.test(s);
 const total=/총(?:금액|가격|비용|얼마)|전체(?:금액|가격|비용)/.test(s);
 const extra=/현장.*더내|추가금|추가비용/.test(s);
 const unknownFee=/(?:카드.*(?:더비싸|더받)|(?:멀면|거리|야간|밤).*(?:추가|요금|더받|비용)|수거비|고철값)/.test(s);
 const composite=/(?:가격|얼마).*(?:출장비|공임)|(?:현금|카드).*(?:추가금|추가비용)/.test(s);
 if(settings)keys.push('SETTINGS');if(process)keys.push('PROCESS');if(post)keys.push('POST_INSTALL');
 // Already-correct standalone waste/inclusion/AS/site replies remain on their original paths.
 if(keep&&!waste||wasteFee||/^반납해야/.test(s))keys.push('WASTE');
 if(detail)keys.push('AS_DETAIL');if(site)keys.push('SITE');if(total)keys.push('TOTAL');
 if(unknownFee)keys.push('FEE_CONFIRM');if(/현장.*더내/.test(s)||composite&&extra)keys.push('EXTRA');
 if(composite)keys.push('INCLUDED');
 if(!keys.length)return null;
 return {keys,settings,keep,waste,wasteFee,detail,site,total,extra,unknownFee,composite};
}
