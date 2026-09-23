// Intent detection and composition only. Facts/copy come from the injected policy.
import {brandIntent,priceDescription,normalizeBatteryCode} from './smart-consult-prices.js?v=spec-schedule-v1';
import {PHONE_LABEL} from './smart-consult-core.js?v=certainty-v1';
export function purchaseKnowledgePlan(text,state,catalog){
 const s=String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase();
 const codes=[...String(text).matchAll(/(?<![a-z0-9])(?:AGM\s*\d+R?|DIN\s*\d+(?:HL|L|R)?|DF\s*\d+(?:AL|L|R)|65\s*-\s*900)(?![a-z0-9])/gi)].map(m=>normalizeBatteryCode(m[0],catalog));
 const report=/달려있|장착되어|쓰고있|라고써있|현재배터리가/.test(s)&&codes.length===1;
 const fit=/(?:넣어도|바꿔도|바꾸면|낮춰도|대신.*가능|꼭써야|제차에맞|내차에맞|큰거.*(?:돼|되))/.test(s);
 const cancel=/취소(?:할|하려|하고|가능|해|되)/.test(s),change=/예약.*변경|시간바꾸|오기로.*변경/.test(s);
 const guidance=/전화.*뭐(?:라고|라).*말|전화할때뭐|접수할때뭐|뭐준비/.test(s);
 const summary=guidance||/지금까지뭐|상담내용정리|내차배터리랑가격다시|지금선택한거|내가뭐로/.test(s);
 const purchase=!cancel&&!change&&/(?:그걸로|이걸로).*(?:해주세요|할게|교체할|하죠)|(?:델코|바르타)(?:로|으로)할게|(?:교체|신청|진행)할게/.test(s);
 const contact=/전화번호|연락처|어디로전화|상담번호|전화할게|어떻게신청/.test(s);
 const agm=/agm(?!\d)/.test(s)&&!brandIntent(text,catalog)&&/뭐|달라|차이|왜비싸|좋은|수명/.test(s),efb=/efb(?!\d)/.test(s)&&/뭐|달라|차이/.test(s);
 const symptom=/계기판불.*약|시동.*(?:힘없이|늦게)|블랙박스.*방전|며칠.*(?:안걸|안켜)|배터리경고등|전압.*낮|isg.*안|스탑앤고.*안/.test(s);
 if(![report,fit,cancel,change,summary,purchase,contact,agm,efb,symptom].some(Boolean))return null;
 return {report,reportedCode:report?codes[0]:'',fit,cancel,change,guidance,summary,purchase,contact,agm,efb,symptom,warning:/배터리경고등/.test(s),isg:/isg|스탑앤고/.test(s),life:/수명/.test(s),cost:/왜비싸/.test(s),compare:/차이|달라/.test(s),brand:brandIntent(text,catalog),codes};
}
export function purchaseKnowledgeReply(plan,state,catalog,policy){
 const p=policy.purchaseKnowledge,phone=s=>s.replaceAll('{phone}',PHONE_LABEL),messages=[],actions=[];
 const add=s=>{messages.push(phone(s));if(s.includes('{phone}'))actions.push('phone');};
 if(plan.report)add(p.reported.replace('{spec}',plan.reportedCode));
 if(plan.summary||plan.purchase){
  const facts=[state.manufacturerName&&state.vehicleFamily?`${state.manufacturerName} ${state.vehicleFamily}`:'',state.year?`${state.year}년식`:'',state.detailModel||'',state.region?.fullLabel||''].filter(Boolean);
  const spec=state.confirmedBattery||state.quotedSpec;
  if(facts.length)messages.push('현재 상담 내용은 '+facts.join(' / ')+'입니다.');
  if(spec){if(!state.confirmedBattery)messages.push(state.customerReportedSpec===spec?'고객님이 알려주신 장착 규격이며 차량 적합성은 확인되지 않았습니다.':'문의하신 제품 규격이며 차량 적합성을 확정한 것은 아닙니다.');messages.push(priceDescription(spec,catalog,state.brand));}
  if(!facts.length&&!spec)add(p.empty);
 }
 if(plan.guidance)add(p.guidance);else if(plan.purchase)add(p.application);
 if(plan.cancel)add(p.cancel);if(plan.change)add(p.change);if(plan.contact)add(p.contact);
 if(plan.agm||plan.efb){
  add(plan.life?policy.product.lifespan:plan.cost?p.cost:plan.compare?p.compare:plan.efb?p.efb:p.agm);
 }
 if(plan.fit)add(p.fit);
 if(plan.symptom)add(plan.warning?p.warning:plan.isg?p.isg:policy.operational.SYMPTOM);
 return {messages:[...new Set(messages)],actions:[...new Set(actions)]};
}
