// Exact owner-authorized factual delta; no global SEO/body exclusions.
export function gn7FactualDelta(html, path) {
  const page=path.replace(/^car-battery\//,'').replace(/\.html$/,'');
  if(page==='chevrolet/alpheon')return html.replace(/\bDIN70L\b/g,'DIN74L');
  if(page==='hyundai/santafe')return html.replace('AGM70, AGM60, AGM80, AG60 등','AGM70, AGM60, AGM80, AGM95 등').replace('<strong>AG60</strong>','<strong>AGM60</strong>');
  if(page==='hyundai/santafe/tm')return html.replace(/\bAG60\b/g,'AGM60');
  if(!['hyundai/grandeur','hyundai/grandeur/gn7'].includes(path.replace(/^car-battery\//,'').replace(/\.html$/,'')))return html;
  let result=html.replace(/<tr>[\s\S]*?<\/tr>/g,row=>{
    if(!row.includes('(GN7)'))return row;
    return row.replace('<td>가솔린 3.3</td>','<td>가솔린 3.5</td>').replace(/<td><strong>AGM80<\/strong><\/td>/,'<td><span class="battery-uncertain">차량 확인 필요</span></td>');
  });
  result=result.replace('현재 차량 DB에는 AGM70, AGM80, DIN90L, DIN74R 등','현재 차량 DB에는 AGM70, DIN90L, AGM80, DIN74R 등');
  result=result.replace('현재 차량 DB 기준으로 그랜저 GN7 페이지는 기본배터리 항목이 다음 값으로 나뉩니다: AGM70, AGM80. 예를 들어 26년~현재 가솔린: AGM70, 22~26년 가솔린 3.3: AGM80 조건이 등록되어 있습니다.','현재 차량 DB 기준으로 그랜저 GN7 등록 조건의 기본배터리는 AGM70입니다. AGM 적용 조건이 포함되어 있습니다.');
  return result;
}
