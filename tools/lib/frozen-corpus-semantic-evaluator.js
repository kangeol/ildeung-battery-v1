import crypto from 'node:crypto';

export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

const money = text => [...text.matchAll(/(\d{1,3}(?:,\d{3})+|\d{4,7})\s*원|(\d{1,3})\s*만원/g)]
  .map(match => match[2] ? Number(match[2]) * 10000 : Number(match[1].replaceAll(',', '')));
const vehicleFirst = text => /차량명(?:과 연식)?(?:을|부터)?|차종(?:과 연식)?(?:을|부터)?|어떤 차량|차량마다 배터리/.test(text);
const priceNeed = text => /가격|교체비|총액|총\s*얼마|배터리\s*얼마/.test(text);
const noStartClaim = text => /차량\s*시동.{0,8}켜지지|차량 시동이나 전원이 켜지지|시동이 안 걸|차가 안 켜/.test(text);
const bookingClaim = text => /(?:예약|접수|주문)(?:이|을|은|도)?\s*(?:완료|확정)(?:됐|되었|했|합니다|입니다)|(?:오늘|지금|당일).{0,12}(?:방문해드리겠습니다|출동하겠습니다|교체 가능합니다)/.test(text);
const diagnosisClaim = text => {
  if (/배터리(?:가|는|때문에).{0,15}(?:확실한 원인입니다|고장입니다|방전됐습니다)|(?:시동모터|알터네이터|이모빌라이저|연료계통).{0,12}(?:고장입니다|원인입니다)/.test(text)) return true;
  return [...text.matchAll(/반드시\s*교체|무조건\s*교체/g)].some(match => !/않|없|아니|단정|판단할 수 없/.test(text.slice(match.index, match.index + 60)));
};

export function scopeDomain(input) {
  if (/배터리|밧데리|AGM|EFB|CCA|암페어아워|방전|점프|코딩|충전/.test(input)) return 'CORE_BATTERY';
  if (/시동|차가\s*안\s*켜|차먹통|차가\s*먹통/.test(input)) return 'BATTERY_TRIAGE';
  if (/가격|얼마|출장|교체|예약|방문|도착|오늘|내일|주차장|현금|카드|영수증|주소|지역|A\/S|보증/.test(input)) return 'CONVERSION_SERVICE';
  return 'OUT_OF_SCOPE';
}

const compactRegionText = value => String(value ?? '').normalize('NFKC').replace(/\s/g, '').toLowerCase();
export function regionStateContract(input, currentRegion, previousRegion = null, localities = []) {
  if (!currentRegion) return [];
  const failures = [];
  if (localities.length && !localities.some(item => item.canonicalId === currentRegion.canonicalId))
    failures.push({ code: 'FACT_UNSUPPORTED_REGION', basis: 'seo-data/smart-consult-location-index.json' });
  if (previousRegion?.canonicalId === currentRegion.canonicalId) return failures;
  const s = compactRegionText(input);
  const full = compactRegionText(currentRegion.fullLabel || currentRegion.fullName);
  const canonical = compactRegionText(currentRegion.name);
  const stem = canonical.replace(/[시구동읍면]$/, '');
  const explicit = (canonical && s.includes(canonical)) || (full && s.includes(full))
    || (stem.length >= 2 && stem !== '장기' && s.includes(stem));
  const travelOnly = /(?:로(?:다시)?(?:가|오|올라|내려)|에살|에서살|쪽(?:입니다|이에요))/.test(s)
    && !/(?:차량|차|현장|주차|집|회사|아파트|주소|위치).{0,20}(?:있|세워|에|에서)/.test(s);
  const queryOnly = /(?:도|까지|지역|동네).{0,10}(?:출장|방문|와요|오나요|가능|되나요|돼요)[?？]?$/.test(s)
    && !/(?:차량|차|현장|주차|집|회사|아파트|주소|위치).{0,20}(?:있|세워|에|에서)/.test(s);
  if (!explicit || travelOnly || queryOnly)
    failures.push({ code: 'FACT_FALSE_REGION_STATE', basis: 'explicit customer service-location evidence' });
  return failures;
}

function factFailures({ input, current, reference, catalog, policy, previousCurrentState, localities = [] }) {
  const response = current.response ?? '';
  const state = current.output?.state ?? {};
  const oldState = reference.output?.state ?? {};
  const failures = [];
  const strictFields = ['selectedVehicleKey', 'quotedSpec', 'brand'];
  for (const field of strictFields) {
    const oldValue = JSON.stringify(oldState[field] ?? null);
    const newValue = JSON.stringify(state[field] ?? null);
    if (oldValue !== newValue) failures.push({ code: `FACT_${field.toUpperCase()}_CHANGED`, basis: `approved reference state.${field}` });
  }
  failures.push(...regionStateContract(input, state.region, previousCurrentState?.region, localities));
  if (previousCurrentState?.region && !state.region && !/(?:주소|위치|장소|지역).{0,16}(?:달라|변경|바뀌|수정)|(?:달라|변경|바뀌).{0,16}(?:주소|위치|장소|지역)/.test(input))
    failures.push({ code: 'FACT_CONFIRMED_REGION_LOST', basis: 'prior confirmed service location without correction' });
  if (JSON.stringify(oldState.confirmedBattery ?? null) !== JSON.stringify(state.confirmedBattery ?? null))
    failures.push({ code: 'FACT_CONFIRMED_BATTERY_CHANGED', basis: 'approved reference confirmedBattery' });
  const spec = state.quotedSpec || state.confirmedBattery?.spec || '';
  const allowedPrices = spec ? [catalog.prices?.[spec], catalog.brands?.VARTA?.prices?.[spec]].filter(Number.isInteger) : [];
  for (const amount of money(response)) {
    if (allowedPrices.length && !allowedPrices.includes(amount)) failures.push({ code: 'FACT_CANONICAL_PRICE_WRONG', basis: `data/battery-prices.json:${spec}`, observed: amount, allowed: allowedPrices });
    if (!allowedPrices.length && !money(reference.response ?? '').includes(amount)) failures.push({ code: 'FACT_UNSUPPORTED_PRICE', basis: 'data/battery-prices.json and approved reference', observed: amount });
  }
  if (state.brand && !Object.hasOwn(catalog.brands ?? {}, state.brand)) failures.push({ code: 'FACT_UNSUPPORTED_BRAND', basis: 'data/battery-prices.json:brands' });
  if (bookingClaim(response)) failures.push({ code: 'FACT_FALSE_BOOKING_OR_AVAILABILITY', basis: 'data/consult-service-policy.json:operational.RESERVATION,REALTIME' });
  const afterSalesMonths = policy.afterSales?.periodMonths;
  const period = response.match(/(?:A\/S|AS|보증).{0,30}?(\d+)\s*개월|(\d+)\s*개월.{0,30}?(?:A\/S|AS|보증)/);
  if (period && Number(period[1] ?? period[2]) !== afterSalesMonths) failures.push({ code: 'FACT_AS_PERIOD_WRONG', basis: 'data/consult-service-policy.json:afterSales.periodMonths' });
  if (/폐배터리|헌\s*배터리|기존\s*배터리/.test(input) && /안\s*(?:주|드리|반납)|보관|가지고/.test(input) && /같은\s*가격|가격\s*그대로|추가금\s*\d/.test(response))
    failures.push({ code: 'FACT_WASTE_NONCOLLECTION_WRONG', basis: 'data/consult-service-policy.json:answers.KEEP_OLD_BATTERY' });
  if (diagnosisClaim(response)) failures.push({ code: 'FACT_UNSAFE_DIAGNOSIS', basis: 'data/consult-service-policy.json:operational.SYMPTOM' });
  return failures;
}

export function evaluateSemanticContract(current, contract, extras = {}) {
  const answer = current.response ?? '';
  const failures = [];
  const kind = contract.kind ?? (contract.id === 'N1_EXPLICIT_VEHICLE_NO_START' ? 'N1_GUIDANCE' : '');
  if (kind === 'N1_GUIDANCE' || kind === 'N1_LOCATION') {
    if (!noStartClaim(answer)) failures.push('N1_SYMPTOM_NOT_ACKNOWLEDGED');
    if (!/다른\s*원인|원인을\s*확정할\s*수\s*없|진단을\s*확정할\s*수\s*없/.test(answer)) failures.push('N1_UNCERTAINTY_MISSING');
    if (vehicleFirst(answer)) failures.push('N1_VEHICLE_FIRST');
    if (money(answer).length || /AGM\d+|DIN\d+/.test(answer)) failures.push('N1_SPEC_OR_PRICE_INVENTED');
  }
  if (kind === 'N1_LOCATION' && !/출장.*(?:가능 지역|가능 권역)/.test(answer)) failures.push('SUPPORTED_AREA_LOST');
  if (kind === 'SITE' && (!/안전성과 차량 접근 가능 조건/.test(answer) || vehicleFirst(answer))) failures.push('SITE_BOUNDARY_LOST');
  if (kind === 'SCHEDULE' && (!/실시간 확인/.test(answer) || vehicleFirst(answer))) failures.push('LIVE_SCHEDULE_BOUNDARY_LOST');
  if (kind === 'SCOPE' && (!/배터리 교체 상담/.test(answer) || !/배터리 상태·방전·교체 상담/.test(answer) || vehicleFirst(answer))) failures.push('SCOPE_TO_BATTERY_BOUNDARY_LOST');
  if (kind === 'FUTURE_START' && (noStartClaim(answer) || !/단정할 수 없|확인된 것은 아닙니다/.test(answer))) failures.push('FUTURE_START_AS_PRESENT');
  if (kind === 'FLOOD' && (!/침수 후 차량 상태와 안전 여부/.test(answer) || !/현장 전문가/.test(answer) || /안전하게 시동|시동을 걸어 보세요/.test(answer))) failures.push('FLOOD_SAFETY_BOUNDARY_LOST');
  if (kind === 'HYPOTHETICAL_PRICE' && (noStartClaim(answer) || !vehicleFirst(answer) || money(answer).length)) failures.push('HYPOTHETICAL_PRICE_BOUNDARY_LOST');
  if (kind === 'BATTERY_GUIDANCE') {
    if (/같은\s*문제/.test(current.input) && !/같은 원인.*판단할 수 없습니다/.test(answer)) failures.push('SYMPTOM_CORRELATION_OVERCLAIM');
    if (/충전/.test(current.input) && !/장기주차/.test(answer)) failures.push('DISCHARGE_PREVENTION_MISSING');
    if (vehicleFirst(answer)) failures.push('BATTERY_GUIDANCE_VEHICLE_FIRST');
  }
  if (kind === 'PURCHASE_CONTEXT' && (!/제품 선택|출장 배터리 교체/.test(answer) || vehicleFirst(answer) || bookingClaim(answer))) failures.push('PURCHASE_CONTEXT_LOST');
  if (kind === 'NON_FACE_TO_FACE' && (!/비대면 교체/.test(answer) || !/키 인계/.test(answer) || vehicleFirst(answer))) failures.push('NON_FACE_TO_FACE_BOUNDARY_LOST');
  for (const [name, expression] of Object.entries(extras.requiredAnswerSignals ?? {}))
    if (!expression.test(answer)) failures.push(`REQUIRED_INTENT_${name}_LOST`);
  return failures;
}

export function evaluateCase({ current, reference, contract, review, catalog, policy, requiredAnswerSignals, previousCurrentState, localities }) {
  if (!reference || current.case_id !== reference.case_id || current.input !== reference.input) throw Error(`Frozen input/reference mismatch ${current.case_id}`);
  const responseChanged = current.response !== reference.response;
  const deterministicFailures = factFailures({ input: current.input, current, reference, catalog, policy, previousCurrentState, localities });
  const semanticFailures = contract ? evaluateSemanticContract(current, contract, { requiredAnswerSignals }) : [];
  const unapprovedResponseChange = responseChanged && !contract;
  let category = reference.category, severity = reference.severity;
  if (contract && responseChanged && !semanticFailures.length && !deterministicFailures.length) { category = 'PASS'; severity = 'S0'; }
  if (unapprovedResponseChange && review) { category = review.category; severity = review.severity; }
  if (unapprovedResponseChange && !review) category = 'UNAPPROVED_RESPONSE_CHANGE';
  if (semanticFailures.length) { category = 'SEMANTIC_CONTRACT_FAILURE'; severity = 'S3'; }
  if (deterministicFailures.length) {
    category = 'DETERMINISTIC_FACT_FAILURE';
    severity = deterministicFailures.some(x => /BOOKING|AVAILABILITY|UNSAFE_DIAGNOSIS/.test(x.code)) ? 'S4' : 'S3';
  }
  return {
    case_id: current.case_id, input: current.input, response: current.response,
    scopeDomain: scopeDomain(current.input), category, severity,
    previousCategory: reference.category, previousSeverity: reference.severity,
    responseChanged, contractId: contract?.id ?? null, unapprovedResponseChange,
    reviewedButUnapproved: Boolean(unapprovedResponseChange && review),
    reviewReason: unapprovedResponseChange ? review?.reason ?? 'Current response differs from the approved reference and needs semantic review.' : null,
    deterministicFailures, semanticFailures,
    needsAdjudication: unapprovedResponseChange || deterministicFailures.length > 0 || semanticFailures.length > 0,
    basis: deterministicFailures.map(x => x.basis).concat(contract ? [`registry:${contract.id}`] : [`approved reference:${reference.case_id}`], review ? ['frozen-corpus-unapproved-review.json:caseId'] : []),
  };
}

export function releaseBlockers(summary) {
  const checks = {
    UNAPPROVED_RESPONSE_CHANGE: summary.all.unapprovedResponseChanges,
    NEW_S3: summary.newS3,
    NEW_S4: summary.newS4,
    DETERMINISTIC_FACT_FAILURE: summary.all.deterministicFactFailures,
    SEMANTIC_CONTRACT_FAILURE: summary.all.semanticContractFailures,
    EXECUTION_ERROR: summary.all.executionErrors,
    UNREVIEWED_RESPONSE_CHANGE: summary.unreviewedResponseChanges,
  };
  return Object.entries(checks).filter(([, count]) => count > 0).map(([name, count]) => ({ name, count }));
}
