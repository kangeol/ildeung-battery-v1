import assert from 'node:assert/strict';
// Owner: ILDEUNG_BMW_2_SERIES_ALL_ROWS_CUSTOMER_CENTER_INQUIRY_V1.
// Keep the historical source fixed. Only these eight battery cells may change.
export const bmw2Baseline='35b39f030aa2d93c2f94fdd5cccc6e054269b474';
export const bmw2Conditions=[
 ['22년~현재','가솔린 4WD','2시리즈 (G42)'],
 ['13~15년','가솔린','2시리즈 (F22)'],
 ['13~15년','디젤','2시리즈 (F22)'],
 ['25년~현재','가솔린 2WD','2시리즈 그란쿠페 (F74)'],
 ['25년~현재','가솔린 4WD','2시리즈 그란쿠페 (F74)'],
 ['20~25년','가솔린 2WD','2시리즈 그란쿠페 (F44)'],
 ['20~25년','가솔린 4WD','2시리즈 그란쿠페 (F44)'],
 ['20~25년','디젤 2WD','2시리즈 그란쿠페 (F44)']
];
export function approvedBmw2Rows(before){
 const expected=structuredClone(before),targets=expected.filter(r=>r.manufacturer==='BMW'&&r.vehicle==='2시리즈');
 assert.deepEqual(targets.map(r=>[r.year,r.fuel,r.detailModel]),bmw2Conditions,'exact eight historical BMW 2 Series conditions');
 for(const r of targets){assert.equal(r.defaultBattery,'AGM80');assert.equal(r.upgradeBattery,'');assert.equal(r.status,'완료');r.defaultBattery='고객센터문의';}
 return expected;
}
export const bmw2HtmlPaths=[
 'car-battery/bmw/2series.html',...['g42','f22','f44','f74'].map(code=>`car-battery/bmw/2series/${code}.html`),
 'battery/agm/capacity/agm80.html','battery/agm/index.html'
];
// Independent historical HTML oracle: no arbitrary current-page snapshot.
export function approvedBmw2Html(html,id){
 const counts={'bmw/2series':8,'bmw/2series/g42':1,'bmw/2series/f22':2,'bmw/2series/f44':3,'bmw/2series/f74':2};
 if(!Object.hasOwn(counts,id))return html;
 const cell='<td><strong>AGM80</strong></td>';
 assert.equal(html.split(cell).length-1,counts[id],'exact approved battery cell count');
 let out=html.replaceAll(cell,'<td><span class="battery-uncertain">차량 확인 필요</span></td>');
 const old='등록 조건의 기본배터리는 AGM80입니다. AGM 적용 조건이 포함되어 있습니다.</p>';
 assert.equal(out.split(old).length-1,1);
 out=out.replace(old,'페이지는 실차 확인이 필요한 항목으로 등록되어 있습니다. 1644-9141로 문의하시면 차량 확인 후 교체 가능한 배터리를 안내받을 수 있습니다.</p>');
 out=out.replace(/(<p class="direct-answer-text">[^\n]+<\/p>\n\n)/,'$1        <p class="vehicle-check-notice">해당 차량은 연식, 세부모델 및 차량 사양에 따라 장착되는 배터리가 달라질 수 있어 실차 확인이 필요합니다. 1644-9141로 문의하시면 차량 확인 후 정확한 적용 배터리와 교체 상담을 안내해드립니다.</p>\n');
 out=out.replace('          </table>\n        </div>\n      </div>\n','          </table>\n        </div>\n      </div>\n      <p class="table-note">* 차량 확인 필요로 표시된 항목은 확정 규격이 아니므로 전문기사 상담을 권장합니다.</p>\n');
 if(id!=='bmw/2series'){
  const faq='현재 DB 표에는 AGM 규격이 포함된 조건이 있습니다. 같은 세대라도 연식과 연료에 따라 달라질 수 있으므로 표의 세부 조건을 함께 확인해 주세요.';
  assert.equal(out.split(faq).length-1,2);
  out=out.replaceAll(faq,'AGM 적용 여부는 연식, 연료, 세부모델에 따라 달라질 수 있습니다. 표에 표시된 기본 배터리와 업그레이드 배터리를 기준으로 확인해 주세요.');
 }
 return out;
}
