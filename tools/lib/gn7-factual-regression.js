// Exact owner-authorized factual delta; no global SEO/body exclusions.
export function gn7FactualDelta(html, path) {
  if(!['hyundai/grandeur','hyundai/grandeur/gn7'].includes(path.replace(/^car-battery\//,'').replace(/\.html$/,'')))return html;
  let result=html.replace(/<tr>[\s\S]*?<\/tr>/g,row=>{
    if(!row.includes('(GN7)'))return row;
    return row.replace('<td>가솔린 3.3</td>','<td>가솔린 3.5</td>').replace(/<td><strong>AGM(?:70|80)<\/strong><\/td>/,'<td><span class="battery-uncertain">차량 확인 필요</span></td>');
  });
  result=result.replace('현재 차량 DB에는 AGM70, AGM80, DIN90L, DIN74R 등','현재 차량 DB에는 DIN90L, AGM70, AGM80, DIN74R 등');
  result=result.replace('현재 차량 DB 기준으로 그랜저 GN7 페이지는 기본배터리 항목이 다음 값으로 나뉩니다: AGM70, AGM80. 예를 들어 26년~현재 가솔린: AGM70, 22~26년 가솔린 3.3: AGM80 조건이 등록되어 있습니다.','현재 차량 DB 기준으로 그랜저 GN7 페이지는 실차 확인이 필요한 항목으로 등록되어 있습니다. 1644-9141로 문의하시면 차량 확인 후 교체 가능한 배터리를 안내받을 수 있습니다.');
  if(path.includes('gn7'))result=result.replaceAll('현재 DB 표에는 AGM 규격이 포함된 조건이 있습니다. 같은 세대라도 연식과 연료에 따라 달라질 수 있으므로 표의 세부 조건을 함께 확인해 주세요.','AGM 적용 여부는 연식, 연료, 세부모델에 따라 달라질 수 있습니다. 표에 표시된 기본 배터리와 업그레이드 배터리를 기준으로 확인해 주세요.');
  return result;
}
