// No business-policy answers outside the injected canonical source.
export function servicePolicyIntent(text) {
  const s=String(text).replace(/\s/g,'');
  if(/(?:폐|헌|기존)배터리|배터리반납/.test(s)) {
    if(/보관|안(?:가져|가져가|줘|주|내|반납|수거|하면|할)|수거하지|반납하지|갖고|가지고|제가.*(?:갖|가지)|돌려/.test(s))return 'KEEP_OLD_BATTERY';
    return 'OLD_BATTERY';
  }
  const kinds=[];
  if(/출장비|출장무료|출장교체비용.*포함/.test(s))kinds.push('MOBILE_SERVICE_FEE');
  if(/공임|장착비/.test(s))kinds.push('LABOR_FEE');
  if(/코딩/.test(s))kinds.push('CODING');
  if(/점검/.test(s))kinds.push('BASIC_INSPECTION');
  if(/추가(?:비용|금)|더받|가격이최종/.test(s))kinds.push('ONSITE_SURCHARGE');
  if(kinds.length>1||/뭐가포함|포함된게뭐|다포함/.test(s))return 'COMBINED';
  return kinds[0]||(/별도비용|가격.*포함|교체비용.*포함/.test(s)?'COMBINED':null);
}
