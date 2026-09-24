import { MANUFACTURER_ALIASES, batteryStoreType, buildVehicleGroups, normalizeText, parseYearRange, resolveConsultation, yearMatches, batteryCertainty, nextBatteryDiscriminator } from "./smart-consult-core.js?v=certainty-v1";
import { copy, variant, symptomLabels } from "./conversation-copy.js";
import { resolveLocation } from "./smart-consult-location.js?v=location-v1";
import { resolveVehicleText, buildAliasIndex } from "./vehicle-aliases.js";
import { directPriceSpec, priceDescription, splitBatterySpec, brandIntent, withoutBrand, normalizeBatteryCode, catalogSpecMention } from "./smart-consult-prices.js?v=owner-delkor-v1";
import { servicePolicyIntent } from "./smart-consult-policy.js?v=faq-v1";
import { extendedPolicyReply, assuranceReply } from "./smart-consult-product-policy.js?v=owner-delkor-v1";
import { finalFaqReply, finalFaqIntent } from "./smart-consult-faq.js?v=authentic-v1";
import { operationalPlan } from "./smart-consult-operational.js?v=spec-schedule-v1";
import { PHONE_LABEL } from "./smart-consult-core.js?v=certainty-v1";
import { comparisonIntent, comparisonReply } from './smart-consult-brand-comparison.js?v=owner-delkor-v1';
import {purchaseKnowledgePlan,purchaseKnowledgeReply} from './smart-consult-purchase.js?v=owner-delkor-v1';
import {brandQueryPlan,brandQueryReply,productOriginQuestion} from './smart-consult-brand-query.js?v=owner-delkor-v1';
import {batteryKnowledgePlan,batteryKnowledgeCopy,coldScheduleFollowup,withoutColdPricePreface} from './smart-consult-battery-knowledge.js';
import {purchaseStagePlan} from './smart-consult-purchase-stage.js';
import {nonmonetaryPlan, nonmonetaryEolma, monetaryQuestion, nonmonetaryCopy} from './smart-consult-nonmonetary.js';

const unique = values => [...new Set(values.filter(Boolean))];
const affirmative = /^(응|네|예|맞아|맞아요|맞습니다|응맞아|네맞아요|ㅇㅇ)[.!\s]*$/;
const negative = /^(아니|아니요|아냐|아니야)[.!\s]*$/;
const pricePattern = {test:text=>monetaryQuestion(text)||/배터리값|밧데리값/.test(text)};
const knownBattery = result => result?.defaultBattery && !/문의|확인/.test(result.defaultBattery);

const compactStartText = text => String(text).toLowerCase().replace(/\s+/g, '');
const unattemptedStart = text => /(?:아직|오늘은?|여태)(?:.{0,12})시동(?:을)?안걸(?:어봤|었|어|았습니다|었습니다)|시동(?:을)?안걸고(?:.{0,8})(?:세워|두었|뒀)/.test(compactStartText(text));
const hypotheticalStart = text => /(?:만약)?시동(?:이)?(?:안걸리면|안걸면|안걸릴경우|걸리지않으면|안걸릴때)/.test(compactStartText(text));
const actualStartEvidenceAfterCondition = text => /(?:지금|현재|오늘도|실제로).{0,12}(?:시동.{0,6}(?:안걸|못걸)|차.{0,6}(?:안켜|먹통))/.test(compactStartText(text).replace(/(?:만약)?시동(?:이)?(?:안걸리면|안걸면|안걸릴경우|걸리지않으면|안걸릴때)/g, ''));
const nonActualStart = text => unattemptedStart(text) || (hypotheticalStart(text) && !actualStartEvidenceAfterCondition(text));
const blockedTurnaround = text => /(?:회차|차량회전)(?:가|는|를|도|할|하기)?(?:안됩|안되|안돼|못|불가)/.test(compactStartText(text));
const possibleFutureStart = text => /(?:시동|차|차량).{0,18}(?:안걸릴까|안걸릴거라|안걸릴수|안켜질수|못걸까)|(?:다시|또)안걸릴까/.test(compactStartText(text));
const floodContext = text => /침수|(?:주차장|차량|차).{0,12}(?:물|잠겼|잠긴)|물.{0,12}(?:주차장|차량|차)/.test(compactStartText(text));
const servicePlaceAfterTravel = text => /서울(?:에|로)?(?:왔|와)|경기(?:에|로)?(?:왔|와)|인천(?:에|로)?(?:왔|와)/.test(compactStartText(text));
const siteCondition = text => /(?:회차|팔레트|기계식|작업구역|작업공간|본넷앞공간|보닛앞공간|주차장바닥|경사|진입로|차량접근).*(?:안|못|불가|넓|좁|있|없|됩니다|돼요|지정)/.test(compactStartText(text)) || /(?:외부정비|외부작업).*(?:허락|가능|괜찮)|(?:차|차량).{0,8}(?:옮겨야|이동해야)/.test(compactStartText(text));
const vehicleScopeBoundary = '배터리 교체 상담만으로 해당 차량 증상의 원인이나 작업 방법을 판단할 수 없습니다. 배터리 상태·방전·교체 상담은 도와드릴 수 있으며, 다른 차량 문제나 안전 확인은 현장 전문가에게 확인해 주세요.';

// A clear report that the customer's vehicle will not start needs useful symptom
// guidance before the fitment flow asks for a model/year. This is deliberately
// separate from weak/intermittent starts, READY interpretation and vague "안돼요".
export function explicitVehicleNoStart(text, previous = createConversationState()) {
  const compact = compactStartText(text);
  if (nonActualStart(text) || blockedTurnaround(text) || possibleFutureStart(text)) return false;
  if (/(?:휴대폰|핸드폰|컴퓨터|노트북|블랙박스|에어컨|라디오|집전등|집의전등)(?:이|가|은|는)?(?:안(?:켜|되)|먹통)/.test(compact) && !/(?:시동|차(?:가|는|량|안|못|먹통|죽|전원)|자동차|\bcar\b)/i.test(text)) return false;
  if (/ready|레디|예열/i.test(text)) return false;
  if (/가끔|아침만|아침에.*안걸|두세번|여러번|덜덜|약하게|시동이약|시동약/.test(compact)) return false;
  if (/\b(?:my\s+)?car\b.*\b(?:will\s+not\s+start|won't\s+start|no\s+start|doesn't\s+start)\b/i.test(text)) return true;
  if (/시동.{0,8}(?:안걸|못걸|걸리지않|걸리지못|안켜)/.test(compact)) return true;
  if (/(?:배터리|밧데리|교체).{0,30}다시안걸/.test(compact)) return true;
  const car = /(?:차량|자동차|(?<![주회])차(?:가|는|를|도|두대|안|못|먹통|죽|전원|하나|를하루)|빌린차|친구차)/.test(compact);
  if (car && /(?:안켜|안걸|못켜|못걸|먹통|차죽|차안돼|차가안돼|차가안됩|차가안되|차안됨)/.test(compact)) return true;
  if (car && /(?:차|차량|자동차).{0,12}(?:켜지지않|걸리지않|완전히먹통)/.test(compact)) return true;
  // A stranded customer can omit "차" in this automotive consultation, but
  // only when the trip/parking context and total power loss are both explicit.
  if (/(?:장날|장보러|몰지하|지하에서|주차장|캠핑장|숙소|펜션).*(?:먹통|안켜|안걸)/.test(compact)) return true;
  if (previous?.selectedVehicleKey && /(?:안켜|안걸|못걸|먹통)/.test(compact)) return true;
  return false;
}

function explicitNoStartReply(previous, text, records, localities, priceCatalog, servicePolicy) {
  const fitment = pricePattern.test(text) || /(?:어떤|무슨|뭘|뭐).{0,8}배터리|배터리.{0,8}(?:어떤|뭐|규격)|교체\s*(?:해\s*주세요|해줘|할게)|바꿀게/.test(text);
  const other = /(?:(?:오늘|내일|지금).{0,12}(?:교체|출장|방문|와\s*줄|올\s*수|가능|되나요|돼요)|언제|몇\s*시|출장|방문|가능|와\s*줄|올\s*수|현금|카드|계좌이체|현금영수증|주차장|가격|비용|얼마)/.test(text);
  const base = conversationWithoutNonmonetary(previous, text, records, localities, priceCatalog, servicePolicy);
  const state = { ...base.state, symptom: { intent: 'NO_START', rawSafeText: symptomLabels.NO_START, confirmedAt: base.state.turnIndex || previous.turnIndex + 1 }, lastIntent: 'N1_EXPLICIT_NO_START', failures: previous.failures };
  const introduction = '차량 시동이나 전원이 켜지지 않는 상황이군요.';
  const guidance = servicePolicy.operational.SYMPTOM;
  const vehiclePrompt = /차량명|연식|차종|어떤 차량|차량마다 배터리|차량을 정확하게 찾지 못/;
  let messages = fitment ? base.messages : other ? base.messages.filter(message => !vehiclePrompt.test(message)) : [];
  if (!fitment) {
    state.quotedSpec = previous.quotedSpec;
    state.priceSummaryShown = previous.priceSummaryShown;
    state.priceIntent = previous.priceIntent;
    state.customerGoal = previous.customerGoal;
    state.previousQuestion = null;
    state.ambiguity = null;
  }
  if ((fitment || other) && !['UNKNOWN', 'FUEL_INFO', 'BATTERY_QUESTION'].includes(base.state.lastIntent)) state.lastIntent = base.state.lastIntent;
  messages = unique([introduction, guidance, ...messages]);
  if (floodContext(text)) messages = unique([...messages, '침수 후 차량 상태와 안전 여부는 이 상담에서 판단할 수 없으므로 현장 전문가에게 점검·확인해 주세요.']);
  if (servicePlaceAfterTravel(text) && !messages.some(message => /출장 가능 지역|가능 권역/.test(message)))
    messages = unique([...messages, '서울·경기·인천은 출장 배터리 교체 가능 권역입니다. 정확한 현장 위치와 방문 일정은 고객센터 1644-9141로 확인해 주세요.']);
  if (/같은\s*문제|같은\s*원인/.test(text)) messages = unique([...messages, '말씀하신 증상들이 같은 원인인지는 이 상담에서 판단할 수 없습니다.']);
  return { ...base, state, messages, actions: servicePlaceAfterTravel(text) ? unique([...base.actions, 'phone']) : fitment || other ? base.actions : [], chips: fitment ? base.chips : [], result: fitment ? base.result : null };
}

function scopeAndServiceFollowup(previous, text, servicePolicy) {
  const compact = compactStartText(text);
  const messages = [], actions = [];
  const add = message => { if (message) messages.push(message.replaceAll('{phone}', PHONE_LABEL)); };
  let intent = '';
  // Future concern and a question about an unattempted start are not a report of failure.
  if (possibleFutureStart(text) && !actualStartEvidenceAfterCondition(text)) {
    if (/v2l/i.test(text)) { add(vehicleScopeBoundary); intent = 'SCOPE_BOUNDARY'; }
    else { add(previous.symptom?.intent === 'NO_START' ? '앞서 말씀하신 시동 문제를 고려해도, 다시 시동이 걸리지 않을지는 단정할 수 없습니다.' : '앞으로 시동이 걸리지 않을까 걱정되시는군요. 지금 시동 실패나 배터리 원인이 확인된 것은 아닙니다.'); add(servicePolicy.operational.SYMPTOM); intent = 'START_FUTURE_CONCERN'; }
  } else if (hypotheticalStart(text) && !actualStartEvidenceAfterCondition(text) && !/가격|비용|얼마|교체비/.test(text)) {
    if (siteCondition(text) || /팔레트|기계식/.test(text)) { add(servicePolicy.operational.SITE); actions.push('phone'); intent = 'OP_SITE'; }
    else { add('시동이 걸리지 않는 경우를 가정하신 질문이군요. 실제 차량 상태와 원인은 그때 확인이 필요합니다.'); if (/방문|출장|와주시|가능/.test(text)) { add(servicePolicy.operational.REALTIME); actions.push('phone'); } intent = 'START_HYPOTHETICAL'; }
  } else if (siteCondition(text)) {
    add(servicePolicy.operational.SITE); actions.push('phone'); intent = 'OP_SITE';
  } else if (/(?:진료|업무|근무)\s*중.{0,12}(?:못\s*내려|내려갈\s*수\s*없)|(?:차에|차로)\s*못\s*내려/.test(text)) {
    add(servicePolicy.operational.NON_FACE_TO_FACE); actions.push('phone'); intent = 'OP_NON_FACE_TO_FACE';
  } else if (/(?:\d{1,2}|아홉|열한)\s*시\s*전.{0,12}(?:출발|귀가|가야|될까)|(?:급히|급하게|퇴실|체크아웃|오늘\s*안에).{0,18}(?:출발|귀가|집에\s*가|가야|기다|가능|될까|갈\s*수)|(?:출발|귀가).{0,18}(?:\d{1,2}\s*시\s*전|급히|급하게)/.test(text)) {
    add(servicePolicy.operational.REALTIME); actions.push('phone'); intent = 'OP_REALTIME';
  } else if (/(?:휴게실|푸드코트|대기실).{0,14}(?:기다|있어도|돼요|가능)/.test(text)) {
    add('대기 장소의 이용 가능 여부는 해당 시설에 확인해 주세요. 방문 가능 시간은 실시간 확인이 필요합니다.'); add(servicePolicy.operational.REALTIME); actions.push('phone'); intent = 'OP_REALTIME';
  } else if (/(?:부모님|아이|애\s*둘|가족).{0,24}(?:기다|앉아\s*계시|집에\s*올려)|(?:기다|앉아\s*계시).{0,24}(?:부모님|아이|가족)/.test(text)) {
    add('대기하시는 분들의 상황도 고려해야겠네요. 방문 가능 시간은 실시간 확인이 필요합니다.'); add(servicePolicy.operational.REALTIME); actions.push('phone'); intent = 'OP_REALTIME';
  } else if (/고객\s*물건|짐을\s*(?:다|모두)\s*내렸/.test(text) && previous.symptom) {
    add('작업 전 상황을 알려주셔서 감사합니다. 출장 배터리 교체를 원하시면 현재 차량 위치와 가능한 일정을 고객센터에서 확인해 주세요.'); actions.push('phone'); intent = 'OP_INTAKE';
  } else if (/(?:센터\s*대신|이쪽으로|여기로).{0,12}(?:출동|방문|와\s*주)/.test(text)) {
    add('차량이 있는 정확한 위치와 방문 가능 일정은 실시간 확인이 필요합니다.'); add(servicePolicy.operational.REALTIME); actions.push('phone'); intent = 'OP_REALTIME';
  } else if (/(?:비\s*오면|날씨).{0,14}(?:장소|위치).{0,8}(?:바꿔|변경)|(?:차|차량).{0,8}(?:아래층|다른\s*층).{0,8}(?:내려|옮겨)|(?:차량\s*위치|작업\s*공간).{0,12}사진|현장\s*상황.{0,12}(?:방법|작업)/.test(text)) {
    if (/사진/.test(text)) add('사진만으로 작업 가능 여부를 확정할 수는 없습니다.');
    add(servicePolicy.operational.SITE); actions.push('phone'); intent = 'OP_SITE';
  } else if (/제품.{0,14}(?:고르|선택)|(?:고르|선택).{0,14}제품/.test(text) && /친구\s*차|빌린\s*차|차주/.test(text)) {
    add('차주와 제품 선택을 먼저 확인하시는 게 좋겠습니다. 차량에 맞는 배터리 규격과 가격은 차량 정보가 확인되면 안내할 수 있고, 이 채팅에서 교체를 확정하지 않습니다.'); intent = 'PRODUCT_CHOICE_CONTEXT';
  } else if (/(?:충전|운행|운전).{0,20}(?:다시\s*안\s*타|오래\s*안\s*타|똑같겠)|(?:안\s*타|주행이\s*적).{0,20}(?:방전|충전)/.test(text)) {
    add(batteryKnowledgeCopy.prevention); intent = 'KNOWLEDGE_DISCHARGE';
  } else if (/시동.{0,12}(?:안\s*걸|못\s*걸).{0,12}(?:순서|어떻게\s*할)/.test(text) && /작업|옮겨|이동|주차|구역/.test(previous.lastIntent + ' ' + text)) {
    add('차량 이동이나 현장 작업 순서를 이 상담에서 안전하게 정할 수 없습니다.'); add(servicePolicy.operational.SITE); actions.push('phone'); intent = 'OP_SITE';
  } else if (/(?:전기차|하이브리드).{0,20}(?:화면|표시|디스플레이).{0,10}(?:안\s*켜|안\s*나|먹통)|(?:리모컨|스마트키).{0,16}(?:문|잠겼|안\s*돼)|(?:직접\s*해도|연결을\s*잘못|연결\s*상태부터)/.test(text)) {
    add(vehicleScopeBoundary); intent = 'SCOPE_BOUNDARY';
  } else if (previous.lastIntent === 'SCOPE_BOUNDARY' && /(?:스마트키|리모컨|열쇠|문\s*열|보닛|본넷)/.test(text)) {
    add(vehicleScopeBoundary); intent = 'SCOPE_BOUNDARY';
  } else if (previous.lastIntent === 'OP_SITE' && /(?:팔레트|작업|접근|공간|주차|밀어|옮겨)/.test(text)) {
    add(servicePolicy.operational.SITE); actions.push('phone'); intent = 'OP_SITE';
  }
  if (!messages.length) return null;
  return { state: { ...previous, turnIndex: previous.turnIndex + 1, lastIntent: intent, failures: previous.failures }, messages: unique(messages), actions: unique(actions), chips: [], result: null, region: previous.region };
}

export function createConversationState() {
  return { customerReportedSpec: "", brand: "", quotedSpec: "", priceSummaryShown: false, originalIntent: "", priceIntent: false, serviceIntent: false, engine: "", drivetrain: "", yearRange: "", symptom: null, customerGoal: "UNKNOWN", turnIndex: 0, manufacturer: "", manufacturerName: "", vehicleFamily: "", model: "", generation: "", year: null, fuel: "", detailModel: "", detailModels: [], exactFuel: "", selectedVehicleKey: "", batteryCandidates: [], confirmedBattery: null, result: null, region: null, location: null, pendingLocationDisambiguation: null, pendingVehicleConfirmation: null, city: "", district: "", lastIntent: "UNKNOWN", previousQuestion: null, ambiguity: null, failures: 0 };
}

export function symptomIntent(text) {
  if (/시동.*약/.test(text)) return "WEAK_START";
  if (!nonActualStart(text) && /시동.*(?:안\s*걸|못\s*걸)/.test(text)) return "NO_START";
  // Negated discharge must not overwrite a symptom with an invented positive one.
  const positive = text.replace(/방전(?:은|이)?\s*아니(?:고|라|야|에요|요)?/g, "");
  if (/점프/.test(positive) && /방전/.test(positive)) return "JUMP_REDISCHARGE";
  if (/(?:또|다시|반복|자꾸).*방전|재방전/.test(positive)) return "REPEATED_DISCHARGE";
  if (/방전/.test(positive)) return "DISCHARGE";
  if (/점프/.test(positive)) return "JUMP";
  if (/(?:미리|오래\s*써|예방).*(?:바꾸|교체)/.test(text)) return "PREVENTIVE_REPLACE";
  if (/배터리.*(?:바꾸려고|교체하려|교체하고|교체할래)/.test(text)) return "REPLACE";
  return null;
}

const liveIntents = ["LIVE_DISPATCH_AVAILABILITY", "ARRIVAL_TIME", "TODAY_SERVICE", "URGENT_SERVICE"];
function recoveryField(text, state) {
  if (/연식|몇\s*년/.test(text)) return "year";
  if (/연료|디젤|가솔린/.test(text)) return "fuel";
  if (/차량명|차종|모델/.test(text)) return "vehicle";
  return state.previousQuestion?.field || "vehicle";
}

function fuelType(value) {
  if (/하이브리드|hybrid|hev|\+전기/i.test(value)) return "하이브리드";
  if (/디젤|diesel/i.test(value)) return "디젤";
  if (/가솔린|휘발유|gasoline|petrol/i.test(value)) return "가솔린";
  if (/lpg|엘피지/i.test(value)) return "LPG";
  if (/전기|electric/i.test(value)) return "전기";
  return "";
}

function yearFromText(text, rows, nowYear) {
  if (/\d{2,4}\s*[~～–]\s*(?:\d{2,4}|현재)/.test(text)) return {};
  const full = text.match(/(?:^|[^\d])((?:19|20)\d{2})(?!\d|\s*(?:cc|씨씨))/i);
  if (full) return { year: Number(full[1]) };
  const short = text.match(/(?:^|[^\d])(\d{2})\s*년(?:식)?/) || text.match(/^\s*(\d{2})\s*$/);
  if (!short) return {};
  const n = Number(short[1]);
  const years = [1900 + n, 2000 + n].filter(year => year <= nowYear + 1 && rows.some(row => yearMatches(row.year, year)));
  return years.length === 1 ? { year: years[0] } : { ambiguousYear: true };
}

export function recognizeIntent(text, entities) {
  if (/^(처음부터|다시시작|초기화|리셋|새상담)$/.test(normalizeText(text))) return "RESET";
  if (/몰라|모르겠|기억\s*안\s*나|어디서.*(?:봐|보|확인)/.test(text)) return "RECOVERY";
  if (/\d+\s*분\s*(?:안|내)|급해|급하|긴급/.test(text)) return "URGENT_SERVICE";
  if (/몇\s*시|언제.*(?:와|오|방문|도착)|도착|출장.*시간/.test(text)) return "ARRIVAL_TIME";
  if (/지금.*(?:와|오|돼|되|가능|출발|방문)/.test(text)) return "LIVE_DISPATCH_AVAILABILITY";
  if (/(?:오늘|내일).*?(?:와|오|돼|되|가능|방문)/.test(text)) return "TODAY_SERVICE";
  if (/아니|정정|수정|잘못|바꿔/.test(text) && (entities.year || entities.fuel || entities.matches.length)) return "CORRECTION";
  if (pricePattern.test(text)) return "PRICE_QUESTION";
  if (nonmonetaryEolma(text)) return "NONMONETARY_QUESTION";
  if (/전화|통화/.test(text)) return "CALL_REQUEST";
  if (/구매|살래|주문|상품/.test(text)) return "BUY_REQUEST";
  if (symptomIntent(text)) return "SYMPTOM";
  if (/agm|din|일반\s*배터리|다른\s*(타입|배터리)/i.test(text)) return "AGM_DIN_QUESTION";
  if (/출장|방문|지역|도\s*와|도와\?|가능해/.test(text) || entities.region || entities.ambiguousRegion) return "SERVICE_AREA_AVAILABILITY";
  if (entities.matches.length) return "VEHICLE_IDENTIFICATION";
  if (entities.year || entities.ambiguousYear) return "YEAR_INFO";
  if (entities.fuel) return "FUEL_INFO";
  if (entities.detailModel || entities.exactFuel || entities.engine || entities.drivetrain) return "MODEL_INFO";
  if (/배터리|밧데리|규격|용량/.test(text)) return "BATTERY_QUESTION";
  return "UNKNOWN";
}

export function extractEntities(text, records, state = createConversationState(), localities = [], nowYear = new Date().getFullYear()) {
  const vehicle = resolveVehicleText(text, records, state);
  const brandHits = Object.entries(MANUFACTURER_ALIASES).filter(([,aliases]) => aliases.some(alias => text.toLowerCase().split(/\s+/).some(word => normalizeText(word).replace(/(?:이고요|이구요|이고|고|인데요|인데|입니다|이에요|예요)$/,'')===normalizeText(alias)) || normalizeText(text).startsWith(normalizeText(alias))));
  const manufacturer = brandHits.length===1 ? brandHits[0][0] : "";
  if (state.selectedVehicleKey && /^(?:\s*(?:[1-9]\.\d|\d{3,4}\s*cc|가솔린|휘발유|디젤|엘피지|LPG|이요|예요|요)\s*)+$/i.test(text)) {
    vehicle.matches=[]; vehicle.shorthand=false; vehicle.detailModels=undefined; vehicle.generation="";
  }
  const normalized = vehicle.rejected ? "" : normalizeText(vehicle.text);
  // Search recognises family aliases; an exact detail phrase inside a sentence is retained too.
  let matches = vehicle.matches;
  const detailRows = matches.length ? matches.flatMap(group=>group.records) : records.filter(row=>`${row.manufacturerId}|${row.vehicle}`===state.selectedVehicleKey);
  // A detail sharing the family name is not evidence for that older generation.
  // For example "트랙스 2018" must consider every Trax row, not only 2013~2016.
  const detailMatches = unique(detailRows.filter(row=>normalizeText(row.detailModel)!==normalizeText(row.vehicle)).map(row => row.detailModel)).filter(detail => normalized.includes(normalizeText(detail))).sort((a,b) => normalizeText(b).length - normalizeText(a).length);
  const equivalentDetails=detailMatches.length ? detailMatches.filter(detail=>normalizeText(detail)===normalizeText(detailMatches[0])) : [];
  let detailModel = equivalentDetails.length===1 ? equivalentDetails[0] : "";
  if (!detailModel && /그랜저ig/.test(normalized)) detailModel = "그랜저 IG";
  if (detailModel) matches = buildVehicleGroups(records.filter(row => row.detailModel === detailModel)).map(group => ({ ...group, records: records.filter(row => `${row.manufacturerId}|${row.vehicle}` === group.key), matchedDetail: detailModel }));
  const key = matches.length === 1 ? matches[0].key : state.selectedVehicleKey;
  const rows = records.filter(row => `${row.manufacturerId}|${row.vehicle}` === key);
  const generation = text.match(/\b([gfw]\d{2,3})\b/i)?.[1]?.toUpperCase() || "";
  if (generation && rows.length) {
    const details = unique(rows.filter(row => row.detailModel.toUpperCase().includes(generation)).map(row => row.detailModel));
    if (details.length === 1) detailModel = details[0];
  }
  const positiveText = text.replace(/(?:디젤|가솔린|휘발유|하이브리드|LPG)\s*(?:이\s*)?아니(?:고|라|야|에요|요)?/gi, "");
  const fuel = fuelType(positiveText);
  const exactFuels = unique(rows.map(row => row.fuel)).filter(value => normalizeText(positiveText).includes(normalizeText(value)));
  // Generic fuel words are not evidence for a particular engine/drive source row.
  const exactFuel = exactFuels.filter(value=>normalizeText(value)!==normalizeText(fuel)).sort((a,b) => b.length - a.length)[0] || "";
  const engineMatch=positiveText.match(/(?:^|[^\d])([1-9]\.\d)(?!\d)/) || positiveText.match(/(?:^|[^\d])(\d{3,4})\s*(?:cc|씨씨)/i);
  const engine=engineMatch ? String(Number(engineMatch[1]) * (engineMatch[1].includes('.') ? 1000 : 1)) : "";
  const drivetrain=positiveText.match(/\b([24]WD)\b/i)?.[1]?.toUpperCase() || "";
  const trim = vehicle.shorthand ? "" : text.match(/(?:^|[^a-z0-9])((?:[235]\d{2}[di]|[ecs]\s?\d{3}d?))(?![a-z0-9])/i)?.[1]?.replace(/\s/g, "") || text.normalize("NFKC").match(/(?:bmw|벤츠)\s*([235]\d{2}[di]|[ecs]\d{3}d?)(?![a-z0-9])/i)?.[1] || "";
  return { manufacturer, engine, drivetrain, matches, shorthand:vehicle.shorthand, detailModels:equivalentDetails.length>1?equivalentDetails:vehicle.detailModels, detailModel, generation:vehicle.generation || generation, fuel, exactFuel, trim: trim.toUpperCase().replace(/D$/, "d").replace(/I$/, "i"), ...yearFromText(text, rows.length ? rows : records, nowYear), ...resolveLocation(text, localities, state.location || state.region, state.pendingLocationDisambiguation) };
}

function engineMatches(fuel, engine) {
  if (!engine) return true;
  const match=fuel.match(/(\d{3,4})\s*cc/i) || fuel.match(/(\d\.\d)/);
  if (!match) return true; // Missing discriminator is not proof of exclusion.
  const value=Number(match[1])*(match[1].includes('.')?1000:1);
  return /이상/.test(fuel)?Number(engine)>=value:/이하/.test(fuel)?Number(engine)<=value:Number(engine)===value;
}

function engineLabel(fuel) {
  const match=fuel.match(/\d{3,4}\s*cc(?:\s*(?:이상|이하))?/i) || fuel.match(/\d\.\d/);
  if(!match)return "";
  return match[0].includes('.')?`${Number(match[0])*1000}cc`:match[0];
}

export function filteredRows(records, state) {
  return records.filter(row => `${row.manufacturerId}|${row.vehicle}` === state.selectedVehicleKey && (!state.year || yearMatches(row.year, state.year)) && (!state.yearRange || row.year===state.yearRange) && (!state.detailModel || row.detailModel === state.detailModel) && (!state.detailModels?.length || state.detailModels.includes(row.detailModel)) && (!state.generation || row.detailModel.toUpperCase().includes(state.generation.toUpperCase())) && (!state.fuel || !fuelType(row.fuel) || fuelType(row.fuel) === state.fuel) && (!state.exactFuel || row.fuel === state.exactFuel) && engineMatches(row.fuel,state.engine) && (!state.drivetrain || !/[24]WD/i.test(row.fuel) || row.fuel.toUpperCase().includes(state.drivetrain)));
}

function detailLabel(detail, rows) {
  const ranges = unique(rows.filter(row => row.detailModel === detail).map(row => row.year)).map(range => {
    const {start, end} = parseYearRange(range);
    return start ? `${start}~${end || "현재"}년형` : range;
  });
  return `${ranges.join(" / ")} · ${detail}`;
}

export function vehicleLabel(state) {
  return [state.manufacturerName, state.model || state.vehicleFamily].filter(Boolean).join(" ") + (state.year ? ` · ${state.year}년식` : "");
}

export function canonicalVehicleRowKey(row) {
  return JSON.stringify([row.manufacturerId,row.vehicle,row.year,row.fuel,row.detailModel]);
}

// The ID binds a displayed discriminator to its exact canonical condition set.
// Duplicate/conflicting facts for the same conditions stay together for certainty checks.
export function vehicleCandidateOptions(records, state) {
  const rows=filteredRows(records,state);
  if(batteryCertainty(rows).safe)return null;
  const details=new Map();
  for(const row of rows)if(!details.has(normalizeText(row.detailModel)))details.set(normalizeText(row.detailModel),row.detailModel);
  const dimensions=[
    ...(!state.detailModel?[{field:'detailModel',value:r=>details.get(normalizeText(r.detailModel))}]:[]),
    ...(!state.year&&!state.yearRange?[{field:'year',value:r=>r.year}]:[]),
    ...(!state.fuel?[{field:'fuel',value:r=>fuelType(r.fuel)}]:[]),
    ...(!state.engine?[{field:'engine',value:r=>engineLabel(r.fuel)}]:[]),
    ...(!state.drivetrain?[{field:'drivetrain',value:r=>r.fuel.match(/[24]WD/i)?.[0]?.toUpperCase()||''}]:[]),
    ...(!state.exactFuel?[{field:'exactFuel',value:r=>r.fuel}]:[])
  ];
  const next=nextBatteryDiscriminator(rows,dimensions);
  if(!next)return null;
  return {field:next.field,choices:next.values.map(value=>({value,label:next.field==='detailModel'?detailLabel(value,rows):value,selection:{type:'vehicle-candidate',id:JSON.stringify([next.field,state.selectedVehicleKey,value,unique(rows.filter(r=>next.value(r)===value).map(canonicalVehicleRowKey)).sort()])}}))};
}

function conversationTurnBase(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  // In a hypothetical no-start question, "교체비" is a price noun, not
  // evidence that this customer's vehicle currently failed to start.
  if (selection === null && servicePolicy && hypotheticalStart(text) && !actualStartEvidenceAfterCondition(text) && /교체비/.test(text))
    return conversationWithoutNonmonetary(previous, text.replace(/교체비/g, '교체 비용'), records, localities, priceCatalog, servicePolicy);
  if (selection === null && servicePolicy && blockedTurnaround(text))
    return { state: { ...previous, turnIndex: previous.turnIndex + 1, lastIntent: 'OP_SITE' }, messages: [servicePolicy.operational.SITE.replaceAll('{phone}', PHONE_LABEL)], actions: ['phone'], chips: [], result: null, region: previous.region };
  if (selection === null && servicePolicy && unattemptedStart(text)) {
    const flooded = /(?:물|침수|잠겼|잠긴)/.test(text);
    const messages = [/아직|여태/.test(text) ? '아직 시동을 걸어보지 않으신 상태군요. 현재 배터리 상태나 교체 필요 여부는 이 말씀만으로 판단할 수 없습니다.' : '말씀하신 내용만으로는 시동 실패나 배터리 교체 필요 여부가 확인되지 않습니다.'];
    if (flooded) messages.push('침수 후 차량 상태와 안전 여부는 이 상담에서 판단할 수 없으므로 현장 전문가에게 점검·확인해 주세요.');
    else messages.push('어떤 점이 걱정되시는지 알려주시면 배터리 상담 범위에서 안내하겠습니다.');
    return { state: { ...previous, turnIndex: previous.turnIndex + 1, lastIntent: flooded ? 'SAFETY_FLOOD_SCOPE' : 'START_NOT_ATTEMPTED' }, messages, actions: [], chips: [], result: null, region: previous.region };
  }
  if (selection === null && servicePolicy) {
    const scoped = scopeAndServiceFollowup(previous, text, servicePolicy);
    if (scoped) return scoped;
  }
  if (selection === null && servicePolicy && previous.lastIntent === 'N1_EXPLICIT_NO_START' && /(?:휴대폰|핸드폰).*말고.*차|차.*말씀/.test(text))
    return { state: { ...previous, lastIntent: 'N1_EXPLICIT_NO_START' }, messages: ['네, 차량 시동·전원 문제로 이해했습니다.', servicePolicy.operational.SYMPTOM], actions: [], chips: [], result: null, region: previous.region };
  if (selection === null && servicePolicy && /시동.{0,12}(?:안\s*걸|못\s*걸).{0,12}(?:순서|어떻게\s*할)/.test(text))
    return { state: { ...previous, turnIndex: previous.turnIndex + 1, lastIntent: 'OP_SITE' }, messages: ['시동이 걸리지 않는 상황에서 차량 이동이나 현장 작업 순서를 이 상담에서 안전하게 정할 수 없습니다.', servicePolicy.operational.SITE.replaceAll('{phone}', PHONE_LABEL)], actions: ['phone'], chips: [], result: null, region: previous.region };
  if (selection === null && servicePolicy && !batteryKnowledgePlan(text, previous) && explicitVehicleNoStart(text, previous))
    return explicitNoStartReply(previous, text, records, localities, priceCatalog, servicePolicy);
  const plan=selection===null&&servicePolicy&&nonmonetaryPlan(text,previous);
  if(!plan)return conversationWithoutNonmonetary(previous,text,records,localities,priceCatalog,servicePolicy,selection);
  let state={...previous},messages=[],actions=[],chips=[];
  const say=s=>{if(s)messages.push(s.replaceAll('{phone}',PHONE_LABEL));};
  for(const query of plan.priceQueries){
    const out=conversationWithoutNonmonetary(state,query,records,localities,priceCatalog,servicePolicy);
    state=out.state;messages.push(...out.messages);actions.push(...out.actions);chips=out.chips;
  }
  if(['WORK','MULTIPLE_WORK'].includes(plan.kind)){
    messages.push(...finalFaqReply('작업시간',servicePolicy).messages);state.lastIntent='OP_WORK_TIME';
  }
  if(plan.kind==='DURATION'){
    const reply=finalFaqReply('지금 가면 얼마나 걸려요?',servicePolicy);messages.push(...reply.messages);actions.push(...reply.actions);
  }
  if(plan.kind==='POST_INSTALL')say(servicePolicy.purchaseStage.POST_INSTALL);
  if(plan.kind==='AS_PERIOD'){
    const out=conversationWithoutNonmonetary(state,'A/S 기간이 얼마예요?',records,localities,priceCatalog,servicePolicy);state=out.state;messages.push(...out.messages);actions.push(...out.actions);
  }
  if(plan.kind==='AS_RESPONSE'){say(servicePolicy.purchaseStage.CASE_CONFIRM);say(servicePolicy.operational.REALTIME);actions.push('phone');}
  if(nonmonetaryCopy[plan.kind]){say(nonmonetaryCopy[plan.kind]);state.lastIntent='NONMONETARY_'+plan.kind;}
  const op=operationalPlan(text,previous);
  if(plan.kind==='ARRIVAL'||op?.realtime||op?.keys.includes('RESERVATION')){
    say(servicePolicy.operational.REALTIME);actions.push('phone');state.lastIntent='OP_REALTIME';
    const location=resolveLocation(text,localities,previous.location||previous.region,previous.pendingLocationDisambiguation);
    if(location.region){state.region=location.region;state.location=location.region;state.city=location.region.city;state.district=location.region.district;}
  }
  if(plan.kind==='MULTIPLE_WORK')actions.push('phone');
  const payment=(text.match(/현금영수증|세금계산서|현금|현찰|카드|계좌이체/gi)||[]).join(' ');
  const faq=payment&&finalFaqReply(payment,servicePolicy);if(faq){messages.push(...faq.messages);actions.push(...faq.actions);}
  return {state,messages:unique(messages),actions:unique(actions),chips,result:null,region:state.region};
}

// A symptom, urgency word, or one early policy handler must not consume an
// independent service request. This post-plan adds only facts from the injected
// Owner policy; it never manufactures a dispatch, price, or completed booking.
function composeConversion(previous, text, out, localities, priceCatalog, policy) {
  if (!policy) return out;
  const s=String(text).normalize('NFKC').replace(/\s/g,'').toLowerCase();
  const messages=[...out.messages],actions=[...out.actions],state={...out.state};
  if(messages.some(message=>message.startsWith('차량 시동이나 전원이 켜지지 않는 상황이군요.')))
    messages.splice(0,messages.length,...messages.filter(message=>!message.startsWith('시동이 안 걸림 말씀해 주셨군요.')));
  const has=re=>messages.some(message=>re.test(message));
  const explicitUnsupported=out.locationState==='EXPLICIT_UNSUPPORTED_AREA'||has(/현재 출장 가능 지역으로 확인되지/);
  const add=(message,marker,phone=false)=>{
    if(message && !has(marker))messages.push(message.replaceAll('{phone}',PHONE_LABEL));
    if(phone)actions.push('phone');
  };
  const locationChange=/(?:주소|위치|장소|주차|차량위치).{0,16}(?:달라|변경|바뀌|옮기)|(?:달라|변경|바뀌|옮기).{0,16}(?:주소|위치|장소|주차|자리)|(?:차를|차량을).{0,12}(?:자리로|곳으로|장소로).{0,6}옮기/.test(s);
  const timeChange=/(?:방문시간|도착시간|예약시간|접수시간|일정|시간|시각).{0,14}(?:달라|변경|바뀌|바꿔|바꾸)|(?:달라|변경|바뀌|바꿔|바꾸).{0,14}(?:방문시간|도착시간|예약시간|접수시간|일정|시간|시각)/.test(s);
  const cancel=/(?:예약|접수|방문|일정)?.{0,8}취소|취소.{0,8}(?:예약|접수|방문|일정)/.test(s);
  const localityText=String(text).replace(/공항\s*주차장|회사\s*주차장|기계식\s*주차장|갓길/g,'');
  const located=resolveLocation(localityText,localities,previous.location||previous.region,previous.pendingLocationDisambiguation);
  const directVisit=/(?:직접|제가|내가|제가직접|매장).{0,12}(?:방문|가도|갈게|가려고|찾아가)|출장말고.{0,12}(?:방문|가도|갈게)/.test(s);
  const areaQuestion=!directVisit&&!has(/직접 방문(?:도|은) 가능|매장 방문도 가능/)&&(/(?:출장(?!비)|방문).{0,20}(?:가능|요청|되|돼|와주|와요|오실|올수|지역)|(?:지역|동네|주소|차량위치).{0,20}(?:출장|가능|와|오)|(?:여기|거기|이곳|그곳).{0,15}(?:와|와요|오실|올수|출장)/.test(s)||Boolean(located.region && /와주|와주세요|오실|올수/.test(s)));
  const worksite=/(?:지하\s*\d*층|지하주차장|기계식주차|주차타워|막다른|회차|출입등록|경비실|높이제한|차량접근|회사주차장|아파트주차장|오피스텔지하)/.test(s);
  const nonface=/비대면|차주.{0,8}(?:없|부재)|(?:제가|저는|사람이?).{0,8}(?:없|자리.{0,4}비우|못내려)|키.{0,12}(?:맡|전달|인계|경비실)|대리인/.test(s);
  if(locationChange&&!located.region&&!located.ambiguousRegion){
    state.region=null;state.location=null;state.city='';state.district='';
    messages.splice(0,messages.length,...messages.filter(message=>!/예약·신청·접수는 고객센터|차량명과 연식을|차량명과 연식을 조금|어떤 차량이세요/.test(message)));
    add('변경된 차량 위치의 동이나 구를 알려주세요. 방문 장소의 실제 변경은 고객센터 {phone}에서 확인해야 하며, 이 채팅에서 변경을 확정하지 않습니다.',/변경된 차량 위치의 동이나 구/,true);
  } else if(!explicitUnsupported&&located.region&&(areaQuestion||locationChange||out.state.region)){
    state.region=located.region;state.location=located.region;state.city=located.region.city;state.district=located.region.district;
    if(areaQuestion&&!/(?:가격|얼마|규격|배터리.+(?:뭐|어떤))/.test(s))messages.splice(0,messages.length,...messages.filter(message=>!/차량명과 연식을|어떤 차량이세요/.test(message)));
    if(areaQuestion)add(`${located.region.fullLabel} 지역은 출장 배터리 교체 가능 지역입니다. 정확한 현장 접근 조건과 방문 일정은 확인이 필요합니다.`,/출장 배터리 교체 가능 지역|출장 교체 가능 지역|출장 가능 지역/);
  } else if(areaQuestion&&!explicitUnsupported&&!state.region&&!located.ambiguousRegion&&!has(/출장 가능 지역으로 확인되지 않|지역을 알려|동이나 구|정확한 위치/)){
    add('차량이 있는 동이나 구를 알려주시면 출장 가능 지역인지 확인해드릴게요.',/동이나 구/);
  }
  if(worksite && (nonface||areaQuestion||/(?:지하|주차|기계식|회차|출입|경비실|높이제한).{0,25}(?:가능|되|돼|작업|교체|접근|출입|회차)/.test(s)))
    add(policy.operational.SITE,/안전성과 차량 접근 가능 조건|주차·출입 허가/,true);
  if(/(?:접수|예약).{0,50}(?:정확히어디|위치|주소|장소).{0,20}(?:전달|알려|말씀)|(?:위치|주소|장소).{0,25}(?:어떻게전달|어디로전달)/.test(s))
    add('차량이 있는 정확한 위치와 현장 접근 조건을 고객센터 {phone}에 알려주세요. 이 채팅에서는 접수를 확정하지 않습니다.',/정확한 위치와 현장 접근 조건을 고객센터/,true);
  if(nonface)add(policy.operational.NON_FACE_TO_FACE,/키를 맡기거나 가족·대리인|비대면 교체가 가능/,true);
  const operation=operationalPlan(text,previous);
  if(operation?.realtime)add(policy.operational.REALTIME,/실시간 확인이 필요|실시간 확인이 필요합니다/,true);
  if(/(?:^|[^a-z])a\/?s(?:[^a-z]|$)|보증|사후\s*관리|교체\s*후.{0,10}문제/i.test(text)){
    const reply=extendedPolicyReply('A/S 되나요?',state,priceCatalog,policy);
    if(reply)for(const message of reply.messages)add(message,/설치일 기준 3개월 이내 A\/S/);
  }
  const payment=/(?:현금영수증|세금계산서|현금|현찰|카드|계좌이체|이체|결제)/.test(s);
  if(payment){const faq=finalFaqReply(text,policy);if(faq)for(const message of faq.messages)add(message,/결제 가능|발행 가능|계좌이체가 가능/);}
  const asksIncluded=/(?:출장비|공임|장착비|폐배터리|헌배터리|수거|코딩|기본점검|추가비용|포함)/.test(s);
  const multipleCosts=[/출장비|출장교체비용/,/공임|장착비/,/폐배터리|헌배터리|수거/,/코딩/,/기본점검/].filter(re=>re.test(s)).length>1;
  if(asksIncluded&&(multipleCosts||/뭐가포함|다포함|포함비용|견적에.*(?:들어|포함)/.test(s))){
    if(!/가격은\s*\d|교체 가격은\s*\d/.test(messages.join(' '))&&!/(?:얼마|총액|총금액|총비용)/.test(s))
      messages.splice(0,messages.length,...messages.filter(message=>!/차량마다 배터리가 달라요|차량명부터 알려주세요/.test(message)));
    add(policy.answers.COMBINED,/출장교체비용과 공임이 포함|출장·공임 포함/);
  }
  if(/(?:폐|헌|기존)\s*배터리/.test(text)&&/(?:안\s*(?:주|반납|수거)|제가\s*(?:갖|가져)|보관)/.test(text))
    add(policy.answers.KEEP_OLD_BATTERY,/보관하시려면 전화로 정확한 조건/,true);
  if(cancel)add(policy.purchaseKnowledge.cancel,/이 채팅에서는 예약을 취소하지 않/,true);
  if(timeChange)add(policy.purchaseKnowledge.change,/이 채팅에서는 예약을 변경하지 않/,true);
  const purchase=purchaseKnowledgePlan(text,previous,priceCatalog);
  const explicitChoice=Boolean(brandIntent(text,priceCatalog))&&/(?:델코|바르타).{0,6}(?:로|으로).{0,8}(?:해주세요|해줘|할게|교체|진행)/.test(s);
  if(purchase?.purchase||explicitChoice){
    const selected=brandIntent(text,priceCatalog)||previous.brand;
    if(selected)state.brand=selected;
    add(policy.purchaseKnowledge.application,/이 채팅에서는 주문이나 예약을 확정하지 않/,true);
  }
  return {...out,state,messages:unique(messages),actions:unique(actions),region:out.region};
}

export function conversationTurn(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  const out=conversationTurnBase(previous,text,records,localities,priceCatalog,servicePolicy,selection);
  return selection===null?composeConversion(previous,text,out,localities,priceCatalog,servicePolicy):out;
}

function conversationWithoutNonmonetary(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  const stage=selection===null&&servicePolicy?.purchaseStage&&purchaseStagePlan(text,previous);
  if(!stage)return conversationWithoutPurchaseStage(previous,text,records,localities,priceCatalog,servicePolicy,selection);
  let state={...previous},messages=[],actions=[],chips=[];
  const say=s=>{if(s)messages.push(s.replaceAll('{phone}',PHONE_LABEL));};
  // Generic work-site nouns are not canonical geographic entities (e.g. airport vs 공항동).
  const entityText=text.replace(/공항\s*주차장|회사\s*주차장|기계식\s*주차장|갓길/g,'');
  const entities=extractEntities(entityText,records,previous,localities),spec=catalogSpecMention(entityText.replace(/(?<=[a-z0-9])(?:으로|로)(?=\s*할게)/gi,' '),priceCatalog);
  const namedVehicle=entities.matches.some(m=>normalizeText(entityText).includes(normalizeText(m.vehicle)))||entities.pendingVehicleConfirmation;
  if(!stage.total&&!stage.composite){
    if(spec?.candidates.length===1)state.quotedSpec=spec.candidates[0];
    const brand=brandIntent(text,priceCatalog);if(brand)state.brand=brand;
  }
  if(stage.noncollection){
    // Quote only the existing collection-conditioned catalog price, never a non-return amount.
    const requestedBrand=brandIntent(text,priceCatalog);if(requestedBrand)state.brand=requestedBrand;
    const code=spec?.candidates.length===1?spec.candidates[0]:null;
    if(code){state.quotedSpec=code;say(priceDescription(code,priceCatalog,state.brand));}
    else if(namedVehicle||entities.manufacturer||spec){
      const vehicleQuery=spec?`${spec.token} 가격`:text.split(/폐\s*배터리|헌\s*배터리|기존\s*배터리|쓰던\s*배터리/)[0].replace(/(?:으로|로)\s*할게요[.!]?/g,'')+' 가격';
      const out=conversationWithoutPurchaseStage(previous,vehicleQuery,records,localities,priceCatalog,servicePolicy);
      state=out.state;messages.push(...out.messages.filter(m=>m!==servicePolicy.summary));actions.push(...out.actions);chips=out.chips;
    }
  }
  if((stage.total||stage.composite)&&!stage.keep&&!stage.unknownFee){
    const explicitCodes=unique([...entityText.matchAll(/(?<![a-z0-9])(?:AGM|DIN|DF)\s*\d+[A-Z]*/gi)].map(m=>normalizeBatteryCode(m[0],priceCatalog)));
    const explicitCode=explicitCodes.join(' 또는 ');
    const code=spec?spec.candidates.length===1?spec.candidates[0]:spec.token:explicitCode||(!namedVehicle&&(state.quotedSpec||state.confirmedBattery));
    const query=spec?.candidates.length>1?`${spec.token} 가격`:code?`${brandIntent(text,priceCatalog)||state.brand||''} ${code} 가격`:text.replace(/출장비.*|공임.*|총(?:금액|얼마|가격|비용).*|코딩비.*/g,'')+' 가격';
    const out=code&&splitBatterySpec(code).length>1
      ?{state:{...previous,quotedSpec:code,priceIntent:true,originalIntent:'PRICE'},messages:[priceDescription(code,priceCatalog,brandIntent(text,priceCatalog)||state.brand)],actions:['phone'],chips:[]}
      :conversationWithoutPurchaseStage(previous,query,records,localities,priceCatalog,servicePolicy);
    if(code||namedVehicle||entities.manufacturer){state=out.state;messages.push(...out.messages.filter(m=>m!==servicePolicy.summary));actions.push(...out.actions);chips=out.chips;}
    else if(stage.total)say(servicePolicy.purchaseStage.TOTAL_UNKNOWN);
    if(code&&/(?:으로|로)\s*할게/.test(text)){say(servicePolicy.purchaseKnowledge.application);actions.push('phone');}
  }
  if(entities.region){state.region=entities.region;state.location=entities.region;state.city=entities.region.city;state.district=entities.region.district;}
  for(const k of ['PROCESS','SETTINGS','POST_INSTALL'])if(stage.keys.includes(k))say(servicePolicy.purchaseStage[k]);
  if(stage.keys.includes('WASTE')){
    if(stage.keep&&!stage.waste&&!/^STAGE_WASTE/.test(previous.lastIntent))say(servicePolicy.purchaseStage.UNCLEAR_OLD);
    else {say(servicePolicy.answers[stage.keep?'KEEP_OLD_BATTERY':'OLD_BATTERY']);if(stage.keep&&!stage.noncollection)say(servicePolicy.purchaseKnowledge.contact);}
    if(stage.keep||stage.wasteFee)actions.push('phone');state.lastIntent=stage.keep?'STAGE_WASTE_KEEP':'STAGE_WASTE';
  }
  if(stage.detail){
    const knowledge=batteryKnowledgePlan(text,previous);
    if(knowledge)knowledge.keys.forEach(k=>say(batteryKnowledgeCopy[k]));
    if(!knowledge)say(servicePolicy.operational.SYMPTOM);
    const a=extendedPolicyReply('무조건 교환되나요?',state,priceCatalog,servicePolicy);messages.push(...a.messages);actions.push(...a.actions);
    say(servicePolicy.purchaseStage.CASE_CONFIRM);
  }
  if(stage.site)say(servicePolicy.operational.SITE);
  const operation=operationalPlan(text,state);
  if(stage.noncollection&&operation?.keys.includes('SITE')&&!stage.site)say(servicePolicy.operational.SITE);
  if(operation?.keys.includes('NON_FACE_TO_FACE'))say(servicePolicy.operational.NON_FACE_TO_FACE);
  if(operation?.realtime){say(servicePolicy.operational.REALTIME);state.lastIntent='OP_REALTIME';actions.push('phone');}
  if(stage.site){actions.push('phone');if(!operation?.realtime)state.lastIntent='OP_SITE';}
  if((stage.total||stage.composite)&&!stage.noncollection)say(servicePolicy.answers.COMBINED);
  if(stage.keys.includes('EXTRA')&&!stage.noncollection){say(servicePolicy.answers.ONSITE_SURCHARGE);say(servicePolicy.purchaseStage.FEE_CONFIRM);actions.push('phone');}
  if(stage.unknownFee){say(servicePolicy.purchaseStage.FEE_CONFIRM);actions.push('phone');}
  if(/코딩/.test(text)){
    const k=batteryKnowledgePlan(text,previous);if(k&&!k.fee)k.keys.forEach(key=>say(batteryKnowledgeCopy[key]));
    if(!stage.total&&!stage.composite)say(servicePolicy.answers.CODING);if(stage.settings)state.lastIntent='KNOWLEDGE_CODING';
  }
  const paymentText=stage.noncollection?(text.match(/현금영수증|현금|현찰|카드|계좌이체|세금계산서|수수료|할인|부가세|VAT|계좌번호/gi)||[]).join(' '):text;
  const faq=finalFaqReply(paymentText,servicePolicy);if(faq){messages.push(...faq.messages);actions.push(...faq.actions);}
  return {state,messages:unique(messages),actions:unique(actions),chips,result:null,region:state.region};
}

function conversationWithoutPurchaseStage(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  if(selection===null&&coldScheduleFollowup(text,previous))return conversationWithoutBatteryKnowledge(previous,'오늘 가능해요?',records,localities,priceCatalog,servicePolicy);
  const knowledge=selection===null&&servicePolicy&&batteryKnowledgePlan(text,previous);
  if(!knowledge)return conversationWithoutBatteryKnowledge(previous,selection===null&&pricePattern.test(text)?withoutColdPricePreface(text):text,records,localities,priceCatalog,servicePolicy,selection);
  let state={...previous},chips=[],messages=[],actions=[];
  // Strip educational vocabulary before vehicle matching (CCA is not a vehicle alias).
  const factText=knowledge.cold?text.replace(/(?<![a-z0-9-])(?:영하\s*)?-?\d+(?:\.\d+)?\s*(?:도|°c)/gi,''):text;
  const vehicleText=factText.replace(/CCA|씨씨에이|\d*Ah|암페어아워/gi,'');
  const e=extractEntities(vehicleText,records,previous,localities);
  const explicit=e.matches.filter(m=>normalizeText(vehicleText).includes(normalizeText(m.vehicle)));
  if(explicit.length){
    const query=[...explicit.map(m=>`${m.manufacturerName} ${m.vehicle}`),e.year?`${e.year}년식`:'',e.detailModel,e.fuel,knowledge.cold&&pricePattern.test(text)?'가격':''].filter(Boolean).join(' ');
    const out=conversationWithoutBatteryKnowledge(previous,query,records,localities,priceCatalog,servicePolicy);
    state=out.state;chips=out.chips;
    if(/가격|얼마/.test(text)&&!/코딩/.test(text)){messages.push(...out.messages);actions.push(...out.actions);}
  }
  if(e.region){state.region=e.region;state.location=e.region;state.city=e.region.city;state.district=e.region.district;}
  const spec=catalogSpecMention(factText,priceCatalog);
  if(spec?.candidates.length===1&&!knowledge.fit)state.quotedSpec=spec.candidates[0];
  const brand=brandIntent(text,priceCatalog);if(brand)state.brand=brand;
  messages.push(...knowledge.keys.map(k=>batteryKnowledgeCopy[k]));
  if(knowledge.load?.duration&&(!knowledge.load.clarify||knowledge.load.omittedObject))messages.push(nonmonetaryCopy.USE);
  if(knowledge.load?.omittedObject&&/a\s*\/?\s*s|보증/i.test(text)){
    const afterSales=extendedPolicyReply('A/S 되나요?',state,priceCatalog,servicePolicy);
    if(afterSales){messages.push(...afterSales.messages);actions.push(...afterSales.actions);}
  }
  if(knowledge.fit){messages.push(servicePolicy.purchaseKnowledge.fit.replaceAll('{phone}',PHONE_LABEL));actions.push('phone');}
  if(knowledge.topic==='CODING')messages.push(servicePolicy.answers.CODING);
  const faq=finalFaqReply(text,servicePolicy);if(faq){messages.push(...faq.messages);actions.push(...faq.actions);}
  const inclusion=servicePolicyIntent(text);if(inclusion&&inclusion!=='CODING')messages.push(servicePolicy.answers[inclusion]);
  if((/가격/.test(text)||knowledge.cold&&pricePattern.test(text))&&!/코딩/.test(text)&&!knowledge.fit&&state.quotedSpec){messages.push(priceDescription(state.quotedSpec,priceCatalog,state.brand));state.priceIntent=true;state.originalIntent='PRICE';}
  const symptom=symptomIntent(text);if(symptom)state.symptom={intent:symptom,rawSafeText:symptomLabels[symptom],confirmedAt:state.turnIndex};
  state.lastIntent='KNOWLEDGE_'+knowledge.topic;
  if((knowledge.cold||knowledge.load&&/교체|출장|방문|기사|올\s*수|와\s*주/.test(text))&&operationalPlan(text,state)?.realtime){messages.push(servicePolicy.operational.REALTIME.replaceAll('{phone}',PHONE_LABEL));actions.push('phone');state.lastIntent='OP_REALTIME';}
  if(knowledge.keys.includes('standaloneCoding'))actions.push('phone');
  return {state,messages:unique(messages),actions:unique(actions),chips,result:null,region:state.region};
}

function conversationWithoutBatteryKnowledge(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  // Route explicit origin wording to existing product authority, never to brand identity.
  const originMention=selection===null&&priceCatalog&&productOriginQuestion(text)?catalogSpecMention(text,priceCatalog):null;
  const originSpec=originMention?.candidates.length===1?originMention.candidates[0]:previous.quotedSpec||previous.confirmedBattery||'';
  const conventionalOrigin=originSpec&&splitBatterySpec(originSpec).some(code=>!/^AGM/.test(code));
  if(selection===null&&priceCatalog&&servicePolicy&&productOriginQuestion(text)&&!comparisonIntent(text,previous,priceCatalog)&&(conventionalOrigin||/어느\s*나라|원산지|어디서\s*(?:생산|제조)/.test(text))){
    const spec=originSpec;
    const state={...previous,...(spec?{quotedSpec:spec}:{}),lastIntent:'ORIGIN'};
    const reply=spec&&!splitBatterySpec(spec).every(code=>/^AGM/.test(code))
      ?{messages:['해당 규격의 원산지는 정확한 제품 확인이 필요합니다. 고객센터 1644-9141로 확인해 주세요.'],actions:['phone']}
      :extendedPolicyReply(text+' 어디 제품',state,priceCatalog,servicePolicy);
    if(reply)return {state,...reply,chips:[],result:null,region:state.region};
  }
  const brandQuery=selection===null&&priceCatalog&&brandQueryPlan(text,priceCatalog);
  if(brandQuery){
    const entities=extractEntities(text,records,previous,localities);
    let context=previous,vehicleOutput=null;
    const explicit=entities.matches.filter(m=>normalizeText(text).includes(normalizeText(m.vehicle)));
    const makerSubject=normalizeText(String(text).split(/제조\s*(?:회사|사|업체)|메이커|(?:어느|어디|무슨|어떤)?\s*회사|누가\s*만(?:든|드는)/)[0]);
    const namedVehicle=explicit.length||buildAliasIndex(records).map.has(makerSubject)||records.some(row=>normalizeText(row.vehicle)&&normalizeText(text).includes(normalizeText(row.vehicle)));
    if(brandQuery.manufacturerWording&&namedVehicle&&!/배터리/.test(text))return {state:{...previous},messages:['차량 자체의 제조사를 말씀하시는 건가요, 교체할 배터리 제품의 브랜드를 말씀하시는 건가요?'],actions:[],chips:[],result:null,region:previous.region};
    if(!brandQuery.mention&&explicit.length){
      const query=[...explicit.map(m=>`${m.manufacturerName} ${m.vehicle}`),entities.year?`${entities.year}년식`:'',entities.detailModel,entities.fuel,entities.engine?`${entities.engine}cc`:''].filter(Boolean).join(' ');
      vehicleOutput=conversationWithoutPurchase(previous,query,records,localities,priceCatalog,servicePolicy);
      context=vehicleOutput.state;
    }
    const out=brandQueryReply(brandQuery,context,priceCatalog);
    if(vehicleOutput?.chips.length)out.chips=vehicleOutput.chips;
    if(entities.region){out.state.region=entities.region;out.state.location=entities.region;out.state.city=entities.region.city;out.state.district=entities.region.district;out.region=entities.region;}
    for(const reply of [finalFaqReply(text,servicePolicy),assuranceReply(text,servicePolicy)])if(reply){out.messages.push(...reply.messages);out.actions=unique([...out.actions,...reply.actions]);}
    return out;
  }
  if(selection===null&&previous.customerReportedSpec&&/^(?:가격은?|얼마(?:예요)?|비용은?)[?!.\s]*$/.test(text))return conversationWithoutPurchase(previous,`${previous.brand||''} ${previous.customerReportedSpec} 가격`,records,localities,priceCatalog,servicePolicy);
  const plan=selection===null&&servicePolicy?.purchaseKnowledge?purchaseKnowledgePlan(text,previous,priceCatalog):null;
    if(!plan){
      const out=conversationWithoutPurchase(previous,text,records,localities,priceCatalog,servicePolicy,selection);
      // An explicit replacement vehicle/product supersedes a previously reported label.
      if(out.state.confirmedBattery||out.state.selectedVehicleKey!==previous.selectedVehicleKey||out.state.quotedSpec!==previous.quotedSpec)out.state.customerReportedSpec='';
      return out;
    }
  let state={...previous},messages=[],actions=[],chips=[];
  const e=extractEntities(text,records,previous,localities);
  // Only explicit vehicle facts re-enter the existing fitment resolver; product
  // knowledge and customer-reported labels cannot establish vehicle compatibility.
  const explicit=e.matches.filter(m=>normalizeText(text).includes(normalizeText(m.vehicle)));
  if(!plan.report&&explicit.length){
    const q=[...explicit.map(m=>`${m.manufacturerName} ${m.vehicle}`),e.year?`${e.year}년식`:'',e.detailModel,e.fuel,e.engine?`${e.engine}cc`:''].filter(Boolean).join(' ');
    const out=conversationWithoutPurchase(state,q,records,localities,priceCatalog,servicePolicy);
    state=out.state;state.customerReportedSpec='';chips=out.chips;
    if(!plan.fit){messages.push(...out.messages);actions.push(...out.actions);}
  }
  if(e.region){state.region=e.region;state.location=e.region;state.city=e.region.city;state.district=e.region.district;}
  if(plan.brand)state.brand=plan.brand;
  if(plan.report){state.customerReportedSpec=plan.reportedCode;state.quotedSpec=plan.reportedCode;state.confirmedBattery=null;state.result=null;state.priceIntent=true;state.originalIntent='PRICE';}
  const reply=purchaseKnowledgeReply(plan,state,priceCatalog,servicePolicy);
  messages.push(...reply.messages);actions.push(...reply.actions);
  if(!plan.fit&&!plan.summary&&!plan.purchase&&/가격|얼마|비용/.test(text)){
    const spec=plan.codes.length===1?plan.codes[0]:state.quotedSpec||state.confirmedBattery;
    if(spec)messages.push(priceDescription(spec,priceCatalog,state.brand));
  }
  const faq=finalFaqReply(text,servicePolicy),included=servicePolicyIntent(text),assurance=assuranceReply(text,servicePolicy);
  for(const r of [faq,assurance])if(r){messages.push(...r.messages);actions.push(...r.actions);}
  if(included)messages.push(servicePolicy.answers[included]);
  const operation=operationalPlan(text,state);
  if(operation?.realtime){messages.push(servicePolicy.operational.REALTIME.replaceAll('{phone}',PHONE_LABEL));actions.push('phone');}
  state.lastIntent=plan.report?'CUSTOMER_REPORTED_SPEC':plan.fit?'FITMENT_CONFIRMATION':plan.purchase?'PURCHASE_COMMITMENT':plan.summary?'CONSULTATION_SUMMARY':previous.lastIntent;
  return {state,messages:unique(messages),actions:unique(actions),chips,result:null,region:state.region};
}

function conversationWithoutPurchase(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  if(selection===null&&text==='차량 모델 상담')return {state:{...previous},messages:['차량 제조사와 모델명을 알려주세요.'],chips:[],actions:[],result:null,region:null};
  // Catalog recognition establishes a product quote, never vehicle compatibility.
  if(selection===null && !/맞아|맞나요|맞는|들어가|호환|장착.*가능/.test(text)) {
    const mention=catalogSpecMention(text,priceCatalog);
    if(mention && (pricePattern.test(text)||mention.particle||normalizeText(text)===normalizeText(mention.token))) {
      const entities=extractEntities(text,records,previous,localities);
      const canonical=Object.hasOwn(priceCatalog.prices,mention.token);
      const bare=normalizeText(text)===normalizeText(mention.token);
      const batteryContext=Boolean(previous.quotedSpec&&(!previous.selectedVehicleKey||previous.quotedSpec!==previous.confirmedBattery));
      if(bare&&!canonical&&mention.candidates.length>1&&entities.matches.length&&!batteryContext){
        const contextual=previous.manufacturer&&!previous.selectedVehicleKey&&!previous.quotedSpec?entities.matches.filter(m=>m.manufacturerId===previous.manufacturer):[];
        if(contextual.length)return {state:{...previous},messages:['어떤 차량 모델인지 한 번 더 확인할게요. 정확한 모델명을 알려주세요.'],chips:contextual.slice(0,4).map(m=>({label:`${m.manufacturerName} ${m.vehicle}`,value:`${m.manufacturerName} ${m.vehicle}`})),actions:[],result:null,region:null};
        return {state:{...previous},messages:[`배터리 규격 ${mention.token}을 말씀하시는 건가요, 차량 모델을 말씀하시는 건가요?`],chips:[{label:'배터리 규격 확인',value:`${mention.token} 가격`},{label:'차량 모델 확인',value:'차량 모델 상담'}],actions:[],result:null,region:null};
      }
      // Complete vehicle names/manufacturers remain vehicle evidence. Incidental
      // numeric substring matches must not defeat explicit product-price language.
      const explicitVehicle=Boolean(entities.manufacturer)||entities.matches.some(m=>normalizeText(m.vehicle)!==normalizeText(mention.token)&&normalizeText(text).includes(normalizeText(m.vehicle)));
      if(!explicitVehicle&&(canonical||bare||!entities.matches.length||batteryContext||pricePattern.test(text))) {
        if(mention.candidates.length>1)return {state:{...previous},messages:[`어떤 배터리 규격 말씀하시는 건가요? ${mention.candidates.join(' / ')} 중 선택해 주세요.`],chips:mention.candidates.map(code=>({label:code,value:code+' 가격'})),actions:[],result:null,region:null};
        const code=mention.candidates[0],source=String(text).normalize('NFKC');
        text=source.slice(0,mention.start)+code+' '+source.slice(mention.end);
        const brands=Object.values(priceCatalog.brands||{}).filter(b=>b.aliases.some(a=>text.toLowerCase().includes(a.toLowerCase())));
        if(brands.length>1&&pricePattern.test(text)&&!comparisonIntent(text,previous,priceCatalog))text+=' 비교';
        const included=servicePolicyIntent(text),faq=finalFaqReply(text,servicePolicy);
        if(pricePattern.test(text)&&(included||faq)&&!assuranceReply(text,servicePolicy)&&!entities.region&&!entities.ambiguousRegion&&!operationalPlan(text,previous)&&brands.length<2){
          const out=conversationWithoutComparison(previous,`${brandIntent(text,priceCatalog)||''} ${code} 가격`,records,localities,priceCatalog,servicePolicy);
          if(faq){out.messages.push(...faq.messages);out.actions=unique([...out.actions,...faq.actions]);}
          if(included&&servicePolicy?.answers[included])out.messages.push(servicePolicy.answers[included]);
          out.messages=unique(out.messages);return out;
        }
      }
    }
  }
  const intent=selection===null&&servicePolicy?.product?.comparisonContext?comparisonIntent(text,previous,priceCatalog):null;
  if(!intent)return conversationWithoutComparison(previous,text,records,localities,priceCatalog,servicePolicy,selection);
  if(intent.clarify)return {state:{...previous},messages:[servicePolicy.product.comparisonContext.clarify],chips:[],actions:[],result:null,region:null};
  const entities=extractEntities(text,records,previous,localities),context=[];
  if(entities.region)context.push(entities.region.fullLabel);
  if(entities.matches.length){context.push(...entities.matches.map(m=>`${m.manufacturerName} ${m.vehicle}`));if(entities.detailModel)context.push(entities.detailModel);if(entities.year)context.push(`${entities.year}년식`);if(entities.fuel)context.push(entities.fuel);if(entities.engine)context.push(`${entities.engine}cc`);}
  const token=String(text).match(/(?<![a-z0-9])(?:AGM\s*\d+R?|DIN\s*\d+(?:HL|L|R)?|DF\s*\d+(?:AL|L|R)|65\s*-\s*900)(?![a-z0-9])/i)?.[0];
  let out=context.length?conversationWithoutComparison(previous,context.join(' '),records,localities,priceCatalog,servicePolicy):{state:{...previous},messages:[],chips:[],actions:[],result:null,region:null};
  if(token&&!entities.matches.length){const code=normalizeBatteryCode(token,priceCatalog);if(Object.hasOwn(priceCatalog.prices,code))out.state.quotedSpec=code;}
  // An unknown explicit product must not inherit a previous product's price.
  const comparisonState=token&&!entities.matches.length?{...out.state,quotedSpec:normalizeBatteryCode(token,priceCatalog)}:out.state;
  out.messages.push(...comparisonReply(comparisonState,priceCatalog,servicePolicy,intent.causal));
  // Preserve independent policy components without re-entering the comparison path.
  const operational=operationalPlan(text,out.state);
  if(operational)for(const key of operational.keys){if(['PRICE_REASON','LIFE'].includes(key))continue;const message=servicePolicy.operational[key];if(message){out.messages.push(message.replaceAll('{phone}',PHONE_LABEL));if(message.includes('{phone}'))out.actions=unique([...out.actions,'phone']);}}
  for(const reply of [assuranceReply(text,servicePolicy),finalFaqReply(text,servicePolicy)])if(reply){out.messages.push(...reply.messages);out.actions=unique([...out.actions,...reply.actions]);}
  out.state.lastIntent='BRAND_COMPARE';out.messages=unique(out.messages);return out;
}

function conversationWithoutComparison(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  const plan=selection===null&&servicePolicy?.operational?operationalPlan(text,previous):null;
  if(!plan){
    const out=conversationEstablished(previous,text,records,localities,priceCatalog,servicePolicy,selection);
    if(selection===null&&finalFaqIntent(text)==='WORK_TIME'&&/얼마나|몇\s*분/.test(text))out.state.lastIntent='OP_WORK_TIME';
    return out;
  }
  if(!plan.schedule&&plan.keys.length===1&&plan.keys[0]==='REALTIME'&&!plan.queries.length&&!assuranceReply(text,servicePolicy)&&!/현금|카드|영수증|세금|이체/.test(text)){
    const intent=recognizeIntent(text,extractEntities(text,records,previous,localities));
    if(liveIntents.includes(intent)||/^VISIT/.test(finalFaqIntent(text)||''))return conversationEstablished(previous,text,records,localities,priceCatalog,servicePolicy);
  }
  // Compose operational facts with the existing canonical vehicle/area/price flow.
  // Manufacture dates and battery age never become model years.
  let out={state:{...previous},messages:[],chips:[],actions:[],result:null,region:null};
  const merge=reply=>{if(!reply)return;out.messages.push(...reply.messages);out.actions=unique([...out.actions,...reply.actions]);};
  // Temporal spans are not suffixless locality aliases (e.g. 오전 vs 오전동).
  // Mask only in an established schedule utterance; explicit locality names stay.
  const entityText=plan.schedule?String(text).replace(/(?:오늘|내일)?\s*(?:아침|오전|점심|오후|저녁|밤|야간)(?=\s*(?:\d|에|때|시간|가능|되|돼|방문|교체|작업|[?!.,]|$))/g,' '):text;
  const entities=extractEntities(entityText,records,previous,localities),context=[];
  if(entities.region)context.push(entities.region.fullLabel);
  if(entities.matches.length){context.push(...entities.matches.map(m=>`${m.manufacturerName} ${m.vehicle}`));if(entities.detailModel)context.push(entities.detailModel);if(entities.year&&/년식/.test(text))context.push(`${entities.year}년식`);if(entities.fuel)context.push(entities.fuel);if(entities.engine)context.push(`${entities.engine}cc`);}
  const explicitPrice=/가격|비용|견적|얼마(?:인가요|예요|야|요)?[?!.\s]*$/.test(text)&&!plan.life&&!plan.bareDuration&&(!plan.realtime||plan.schedule)&&!plan.keys.includes('PRICE_REASON')&&!/추가|코딩|공임|출장비|끝/.test(text);
  if(entities.ambiguousRegion||entities.unsupportedLocation||/지역(?:은|이)\s*/.test(text))out=conversationCore(previous,text,records,localities,priceCatalog,servicePolicy);
  else if(context.length)out=conversationEstablished(previous,context.join(' ')+(explicitPrice?' 가격':''),records,localities,priceCatalog,servicePolicy);
  const brand=brandIntent(text,priceCatalog);if(brand)out.state.brand=brand;
  const spec=String(text).match(/(?<![a-z0-9])(?:AGM\s*\d+R?|DIN\s*\d+(?:HL|L|R)?|DF\s*\d+(?:AL|L|R)|65\s*-\s*900)(?![a-z0-9])/i)?.[0];
  if(spec&&!entities.matches.length){const code=normalizeBatteryCode(spec,priceCatalog);if(Object.hasOwn(priceCatalog?.prices||{},code))out.state.quotedSpec=code;}
  if(explicitPrice){const priced=conversationEstablished(out.state,spec?`${brand||''} ${spec} 가격`:'배터리 가격',records,localities,priceCatalog,servicePolicy);merge(priced);out.state=priced.state;out.result=priced.result;out.chips=priced.chips;}
  for(const query of plan.queries){const reply=conversationEstablished(out.state,query,records,localities,priceCatalog,servicePolicy);merge(reply);out.state=reply.state;out.result=reply.result||out.result;out.region=reply.region||out.region;if(reply.chips.length)out.chips=reply.chips;}
  for(const key of plan.keys){const message=servicePolicy.operational[key];if(message){out.messages.push(message.replaceAll('{phone}',PHONE_LABEL));if(message.includes('{phone}'))out.actions=unique([...out.actions,'phone']);}}
  merge(assuranceReply(text,servicePolicy));
  if(!plan.entry)merge(extendedPolicyReply(text,out.state,priceCatalog,servicePolicy));
  // Collect payment and included-service facts independently of operational timing.
  if(/현금|현찰|카드|계좌|이체|세금계산서|영수증|부가세|할인|수수료|vat/i.test(text))merge(finalFaqReply(text.replace(/(?:폐|헌|기존)\s*배터리|배터리\s*반납|도착|언제.*(?:와|오)/g,''),servicePolicy));
  const included=servicePolicyIntent(text);if(included&&servicePolicy.answers[included]){out.messages.push(servicePolicy.answers[included]);if(included==='KEEP_OLD_BATTERY')out.actions=unique([...out.actions,'phone']);}
  if(['RESERVATION','REALTIME','SITE','NON_FACE_TO_FACE'].includes(plan.topic))out.state.lastIntent='OP_'+plan.topic;
  out.messages=unique(out.messages);return out;
}

function conversationEstablished(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  const assurance=selection===null?assuranceReply(text,servicePolicy):null;
  const cash=/현금|현찰/.test(String(text).replace(/현금\s*영수증/g,''));
  if(selection!==null||(!assurance&&!cash))return conversationCore(previous,text,records,localities,priceCatalog,servicePolicy,selection);
  // A policy question may also supply a new vehicle/product. Keep product pricing
  // separate from fitment, and never parse manufacture dates as a vehicle year.
  const state={...previous},entities=extractEntities(text,records,previous,localities);
  const brand=brandIntent(text,priceCatalog);if(brand)state.brand=brand;
  const token=String(text).match(/(?<![a-z0-9])(?:AGM\s*\d+R?|DIN\s*\d+(?:HL|L|R)?|DF\s*\d+(?:AL|L|R)|65\s*-\s*900|\d+(?:AL|L|R))(?![a-z0-9])/i)?.[0];
  const spec=token?normalizeBatteryCode(token,priceCatalog):'';
  const context=[];
  if(entities.region)context.push(entities.region.fullName||entities.region.fullLabel);
  if(entities.matches.length){
    context.push(...entities.matches.map(m=>`${m.manufacturerName} ${m.vehicle}`));
    if(entities.detailModel)context.push(entities.detailModel);
    if(entities.year&&(!assurance?.actions.includes('phone')||/년식/.test(text)))context.push(`${entities.year}년식`);
    if(entities.fuel)context.push(entities.fuel);
    if(entities.engine)context.push(`${entities.engine}cc`);
    if(entities.drivetrain)context.push(entities.drivetrain);
  }else if(entities.manufacturer)context.push(records.find(r=>r.manufacturerId===entities.manufacturer)?.manufacturerName||'');
  const pricing=pricePattern.test(text)&&(!assurance?.actions.includes('phone')||/가격|비용|견적|배터리값|밧데리값/.test(text));
  const productOnly=Boolean(token)&&!entities.matches.length&&!entities.manufacturer;
  let out={state,messages:[],chips:[],actions:[],result:null,region:null};
  if(context.length)out=conversationCore(state,context.join(' ')+(pricing&&!productOnly?' 가격':''),records,localities,priceCatalog,servicePolicy);
  if(productOnly){
    if(Object.hasOwn(priceCatalog?.prices||{},spec))out.state.quotedSpec=spec;
    if(pricing){
      const priced=conversationCore(out.state,`${brand||''} ${token} 가격`,records,localities,priceCatalog,servicePolicy);
      out={...priced,messages:[...out.messages,...priced.messages],actions:unique([...out.actions,...priced.actions])};
    }
  }else if(!context.length&&pricing&&!/수수료|할인|부가세|vat|계좌번호/i.test(text))out=conversationCore(state,'배터리 가격',records,localities,priceCatalog,servicePolicy);
  const faq=finalFaqReply(text,servicePolicy),existing=assurance?extendedPolicyReply(text,out.state,priceCatalog,servicePolicy):null;
  for(const reply of [assurance,existing,faq])if(reply){out.messages.push(...reply.messages);out.actions=unique([...out.actions,...reply.actions]);}
  return out;
}

function conversationCore(previous, text, records, localities = [], priceCatalog = null, servicePolicy = null, selection = null) {
  let state = { ...previous };
  let selected=null;
  if(selection!==null){
    const current=vehicleCandidateOptions(records,state);
    selected=selection?.type==='vehicle-candidate'&&typeof selection.id==='string'&&current&&current.field===state.previousQuestion?.field&&Array.isArray(state.previousQuestion?.choices)
      ? current.choices.slice(0,4).find(c=>c.selection.id===selection.id&&state.previousQuestion.choices.some(p=>p.value===c.value&&p.label===c.label)) : null;
    if(!selected)return {state:previous,messages:[copy.needDetails],chips:[],actions:['phone'],result:null,region:null};
    const value=selected.value;
    if(current.field==='detailModel'){
      state.detailModels=unique(filteredRows(records,state).filter(r=>normalizeText(r.detailModel)===normalizeText(value)).map(r=>r.detailModel));
      state.detailModel=state.detailModels.length===1?state.detailModels[0]:'';
    } else if(current.field==='year')state.yearRange=value;
    else if(current.field==='engine')state.engine=String(parseInt(value,10));
    else state[current.field]=value;
    const selectedRanges=unique(filteredRows(records,state).map(row=>row.year));
    if(selectedRanges.length===1)state.yearRange=selectedRanges[0];
    // Labels are presentation, not natural-language input. Do not re-expand aliases.
    text='';
  }
  let entities = selected ? {matches:[]} : extractEntities(text, records, state, localities);
  const intent = selected ? 'MODEL_INFO' : recognizeIntent(text, entities);
  const messages = [];
  const output = { state, messages, chips: [], actions: [], result: null, region: null };
  const say = value => messages.push(value);
  const quote = spec => {
    state.quotedSpec=spec;
    const answer=priceDescription(spec,priceCatalog,state.brand);
    say(answer);
    if(servicePolicy?.summary && !state.priceSummaryShown && /교체 가격은/.test(answer)) {say(servicePolicy.summary);state.priceSummaryShown=true;}
  };
  const ask = (field, prompt, choices = [], extra = {}) => {
    state.previousQuestion = { field, prompt, choices, ...extra };
    state.ambiguity = field;
    output.chips = choices.slice(0,4).map(choice => ({ label: choice.label, value: choice.value, ...(choice.selection?{selection:choice.selection}:{}) }));
    say(prompt);
  };
  if (intent === "RESET") { output.state = createConversationState(); say(copy.greeting); return output; }
  // Policy questions must not be mistaken for a new vehicle, price, year or brand selection.
  const faqReply=finalFaqReply(text,servicePolicy);
  if(faqReply){output.messages.push(...faqReply.messages);output.actions=faqReply.actions;return output;}
  const policyReply=extendedPolicyReply(text,state,priceCatalog,servicePolicy);
  if(policyReply){output.messages.push(...policyReply.messages);output.actions=policyReply.actions;return output;}
  if (pricePattern.test(text)) { state.priceIntent=true; state.originalIntent="PRICE"; }
  const requestedBrand=brandIntent(text,priceCatalog);
  const policyIntent=servicePolicy && servicePolicyIntent(text);
  if(requestedBrand){state.brand=requestedBrand;state.priceIntent=true;state.originalIntent='PRICE';}
  const directSpec = directPriceSpec(withoutBrand(text,priceCatalog),priceCatalog,Boolean(requestedBrand));
  if (directSpec) {
    // A price lookup is not a vehicle fitment confirmation. Preserve vehicle/area facts.
    state.priceIntent=true; state.originalIntent="PRICE";
    quote(directSpec);
    output.actions = ["phone"];
    return output;
  }
  if (entities.region || entities.ambiguousRegion || /출장|교체.*(?:돼|되|가능)|와요/.test(text)) state.serviceIntent=true;
  if (entities.manufacturer && !entities.matches.length && !state.selectedVehicleKey) {
    state.manufacturer=entities.manufacturer;
    state.manufacturerName=records.find(r=>r.manufacturerId===entities.manufacturer)?.manufacturerName || "";
  }
  state.turnIndex = (state.turnIndex || 0) + 1;
  state.lastIntent = intent;
  const symptom = symptomIntent(text);
  if (symptom) state.symptom = { intent: symptom, rawSafeText: symptomLabels[symptom], confirmedAt: state.turnIndex };
  const goal = {PRICE_QUESTION:"PRICE",BUY_REQUEST:"REPLACE",SERVICE_AREA_AVAILABILITY:"AREA",AGM_DIN_QUESTION:"BATTERY_TYPE"}[intent];
  if (goal) state.customerGoal = goal;
  if (symptom && !goal) state.customerGoal = "REPLACE";
  if (liveIntents.includes(intent)) state.customerGoal = "AREA";
  if (intent === "RECOVERY") {
    const field = recoveryField(text, state);
    say(field === "year" ? copy.recoveryYear : /fuel/i.test(field) ? copy.recoveryFuel : copy.recoveryModel);
    say(copy.recoveryNext); output.actions = ["phone"]; output.chips = [{label:copy.restart,value:"처음부터"}]; return output;
  }

  const explicitFamilyAnswer=state.previousQuestion?.field==="vehicle" && entities.matches.length===1 && normalizeText(text)===normalizeText(entities.matches[0].vehicle);
  const canonicalNamedWithYear=entities.matches.length===1 && entities.year && normalizeText(text).includes(normalizeText(entities.matches[0].manufacturerName)) && normalizeText(text).includes(normalizeText(entities.matches[0].vehicle));
  const shorthand = entities.shorthand && !explicitFamilyAnswer && !canonicalNamedWithYear && entities.matches.length === 1 ? entities.matches[0] : null;
  if (shorthand) {
    if (state.selectedVehicleKey && state.selectedVehicleKey !== shorthand.key) {
      state = {...createConversationState(),brand:state.brand,originalIntent:state.originalIntent,priceIntent:state.priceIntent,serviceIntent:state.serviceIntent,symptom:state.symptom,customerGoal:state.customerGoal,turnIndex:state.turnIndex,region:state.region,location:state.location,city:state.city,district:state.district,lastIntent:intent}; output.state=state;
    }
    state.manufacturer = shorthand.manufacturerId;
    state.manufacturerName = shorthand.manufacturerName;
    state.pendingVehicleConfirmation = {key:shorthand.key,label:`${shorthand.manufacturerName} ${shorthand.vehicle}`};
    state.result = null; state.confirmedBattery = null;
    entities.matches = [];
  } else if (state.pendingVehicleConfirmation && affirmative.test(text)) {
    entities.matches = buildVehicleGroups(records).filter(group=>group.key===state.pendingVehicleConfirmation.key);
    state.pendingVehicleConfirmation = null;
  } else if (state.pendingVehicleConfirmation && negative.test(text)) {
    state.pendingVehicleConfirmation=null; say(copy.needVehicle); return output;
  }

  // Plain answers can resolve any displayed option; no chip is required.
  const question = state.previousQuestion;
  let answered = Boolean(selected);
  if (!selected && question && !/가격|얼마|전화|출장|agm|배터리/i.test(text)) {
    const normalized = normalizeText(text).replace(/(이야|이에요|예요|맞아|입니다)$/, "");
    const choices = question.choices.filter(choice => [choice.value, choice.label].some(value => normalizeText(value) === normalized || (normalized.length >= 2 && normalizeText(value).includes(normalized))));
    const choice = choices.length === 1 ? choices[0] : null;
    if (question.field === "fuel" && question.confirm && affirmative.test(text)) { entities.fuel = question.confirm; answered = true; }
    else if (question.field === "fuel" && negative.test(text)) {
      ask("fuel", copy.fuel, question.choices); return output;
    } else if (choice) {
      if (question.field === "vehicle") entities.matches = buildVehicleGroups(records).filter(group => group.key === choice.key);
      if (question.field === "detailModel") {
        entities.detailModels=unique(records.filter(r=>`${r.manufacturerId}|${r.vehicle}`===state.selectedVehicleKey&&normalizeText(r.detailModel)===normalizeText(choice.value)).map(r=>r.detailModel));
        entities.detailModel=entities.detailModels.length===1?choice.value:"";
        state.detailModel="";
      }
      if (question.field === "fuel") entities.fuel = choice.value;
      if (question.field === "exactFuel") entities.exactFuel = choice.value;
      if (question.field === "year") entities.yearRange = choice.value;
      if (question.field === "engine") entities.engine = String(parseInt(choice.value,10));
      if (question.field === "drivetrain") entities.drivetrain = choice.value;
      answered = true;
    }
  }
  if (entities.matches.length === 1) {
    const match = entities.matches[0];
    if (state.selectedVehicleKey && state.selectedVehicleKey !== match.key) {
      state = { ...createConversationState(), brand:state.brand, originalIntent:state.originalIntent,priceIntent:state.priceIntent,serviceIntent:state.serviceIntent,symptom:state.symptom,customerGoal:state.customerGoal,turnIndex:state.turnIndex,region: state.region, location:state.location, pendingLocationDisambiguation:state.pendingLocationDisambiguation, city: state.city, district: state.district, lastIntent: intent };
      output.state = state;
    }
    state.selectedVehicleKey = match.key;
    state.pendingVehicleConfirmation = null;
    state.manufacturer = match.manufacturerId;
    state.manufacturerName = match.manufacturerName;
    state.vehicleFamily = match.vehicle;
    if (entities.trim) state.model = entities.trim;
    if (match.matchedDetail && !(entities.detailModels?.length>1)) entities.detailModel = match.matchedDetail;
    answered = true;
  }
  const changedYear = entities.year && entities.year !== state.year;
  if (changedYear) {
    if (state.year || (intent==='CORRECTION' && state.yearRange)) { state.detailModel = ""; state.detailModels=[]; state.generation = ""; }
    state.yearRange = "";
    state.year = entities.year;
  }
  if (entities.detailModel) state.detailModel = entities.detailModel;
  if (entities.detailModels) state.detailModels = entities.detailModels;
  if (entities.generation) state.generation = entities.generation;
  if (entities.fuel) { state.fuel = entities.fuel; state.exactFuel = ""; }
  if (entities.exactFuel) state.exactFuel = entities.exactFuel;
  if (entities.engine) state.engine = entities.engine;
  if (entities.drivetrain) state.drivetrain = entities.drivetrain;
  if (entities.yearRange) state.yearRange = entities.yearRange;
  if (entities.region) {
    state.region = entities.region;
    state.location = entities.region;
    state.city = entities.region.city;
    state.district = entities.region.district;
    state.pendingLocationDisambiguation = null;
  }
  if (entities.ambiguousRegion) {
    state.pendingLocationDisambiguation=entities.locationCandidates;
    if(entities.locationScope) { state.location=entities.locationScope;state.region=entities.locationScope; }
  }
  if (entities.year || entities.fuel || entities.detailModel || entities.exactFuel || entities.engine || entities.drivetrain || entities.yearRange) answered = true;
  if(answered || shorthand)state.quotedSpec="";
  if (intent === "CORRECTION") say(copy.correction(entities.year));

  let rows = filteredRows(records, state);
  // Revalidate even a restored session or a follow-up asking for price/AGM.
  {
    state.result = null; state.confirmedBattery = null;
    if (answered) { state.previousQuestion = null; state.ambiguity = null; }
    state.batteryCandidates = unique(rows.map(row => row.defaultBattery));
    if (batteryCertainty(rows).safe) {
      state.result = resolveConsultation(rows, {}).result;
      state.confirmedBattery = knownBattery(state.result) ? state.result.defaultBattery : null;
      state.generation = state.result.detailModel?.match(/\b([GFW]\d{2,3})\b/i)?.[1]?.toUpperCase() || state.generation;
    }
  }
  const areaAnswer = () => {
    output.locationState=entities.ambiguousRegion ? "AMBIGUOUS_AREA" : state.region ? "SUPPORTED_AREA" : "MISSING_AREA";
    if (entities.ambiguousRegion) {
      const candidates=entities.locationCandidates;
      say(copy.locationChoices(candidates.map(item=>item.fullLabel)));
      output.chips=candidates.slice(0,4).map(item=>({label:item.fullLabel,value:item.fullName}));
      return;
    }
    if (entities.unsupportedLocation) { state.region=null;state.location=null;state.city="";state.district="";state.pendingLocationDisambiguation=null;output.locationState="EXPLICIT_UNSUPPORTED_AREA";say(copy.serviceUnknown); output.actions=["phone"]; return; }
    // An explicit unknown place must not be replaced with the old remembered place.
    const placeBeforeService = (text.match(/(?:^|\s)([가-힣]{2,}?)(?=\s*(?:출장|방문|도\s*와))/)?.[1]
      || text.match(/지역(?:은|이)?\s*([가-힣]{2,}?)(?:입니다만|입니다|이에요|예요|인데요|인데|이구요|이고요|이고|$)/)?.[1])?.replace(/(?:인데요|인데|이고요|이고|입니다|이에요|예요)$/,'');
    const noun=placeBeforeService?.replace(/(?:으로|이요|은|는|도|로)$/,'');
    const explicitPlace = placeBeforeService && !["여기", "거기", "오늘", "내일", "지금", "배터리", "밧데리", "근처", "쪽", "지역", "방문", "출장", "교체", "무료", "유료", "차량", "자동차", "가능", "혹시", "정말", "타이어", "장착", "서비스", "아파트", "오피스텔", "회사", "공장", "상가", "지하", "주차장", "현장", "집"].includes(noun);
    const placeResult=explicitPlace ? resolveLocation(placeBeforeService,localities) : null;
    // The full utterance has already resolved a canonical supported area.
    // A later broad worksite phrase must not override that evidence.
    const unrecognizedDifferentPlace=!entities.region||!normalizeText(placeBeforeService).includes(normalizeText(entities.region.name));
    const explicitUnsupported=explicitPlace && unrecognizedDifferentPlace && !placeResult.region && !placeResult.ambiguousRegion && !records.some(row=>[row.vehicle,row.manufacturerName].includes(placeBeforeService)||[row.vehicle,row.manufacturerName].includes(noun)) && !brandIntent(noun,priceCatalog);
    const newUnknownPlace = explicitUnsupported;
    if (newUnknownPlace) { state.region=null;state.location=null;state.city="";state.district="";state.pendingLocationDisambiguation=null;output.locationState="EXPLICIT_UNSUPPORTED_AREA";say(copy.serviceUnknown); output.actions = ["phone"]; return; }
    if (state.region) { say(entities.shortLocation ? copy.serviceShort(state.region.fullLabel) : variant("area", state.turnIndex, state.region.fullLabel || state.region.name)); output.region = state.region; output.actions = ["phone"]; }
    else say("네, 출장 배터리 교체 가능합니다. 차량이 있는 지역을 알려주세요. 동이나 구 이름만 말씀해주셔도 됩니다.");
  };
  if (liveIntents.includes(intent)) {
    if (entities.region || entities.ambiguousRegion || entities.unsupportedLocation || state.region) areaAnswer();
    say(copy.dispatch); output.actions = ["phone"]; return output;
  }
  if (symptom) {
    say(copy.symptomAck(symptomLabels[symptom]));
    if (!answered) {
      if (!state.selectedVehicleKey) say(copy.needVehicle);
      else if (state.previousQuestion) { say(state.previousQuestion.prompt); output.chips=state.previousQuestion.choices.slice(0,4); }
      else if (state.result) output.result=state.result;
      output.actions=["phone"]; return output;
    }
  }
  if (shorthand && state.pendingVehicleConfirmation) {
    if(entities.region || entities.ambiguousRegion) areaAnswer();
    say(copy.vehicleConfirm(state.pendingVehicleConfirmation.label));
    return output;
  }
  if (!entities.region && state.pendingLocationDisambiguation && answered) {
    entities.ambiguousRegion=true;entities.locationCandidates=state.pendingLocationDisambiguation;
  }
  if (entities.ambiguousRegion) {
    if(state.result) {say(copy.result(state.result.defaultBattery));output.result=state.result;}
    areaAnswer(); return output;
  }
  if (intent === "CALL_REQUEST") { say(copy.call); output.actions = ["phone"]; return output; }
  if(policyIntent && servicePolicy.answers?.[policyIntent]) {
    if(entities.region)areaAnswer();
    say(servicePolicy.answers[policyIntent]);
    if(policyIntent==='KEEP_OLD_BATTERY')output.actions=['phone'];
    return output;
  }
  if(requestedBrand && !answered && (state.quotedSpec || state.result?.defaultBattery)) {
    quote(state.quotedSpec || state.result.defaultBattery);output.actions=['phone'];return output;
  }
  // PRICE is a retained goal, not a terminal reply before vehicle narrowing.
  if (intent === "PRICE_QUESTION" && state.result) {
    if(entities.region) areaAnswer();
    say(copy.result(state.result.defaultBattery)); if(priceCatalog)quote(state.result.defaultBattery);else say(variant("price",state.turnIndex));
    output.result=state.result; output.actions=["phone","stores"]; return output;
  }
  if (intent === 'PRICE_QUESTION' && state.pendingVehicleConfirmation && previous.lastIntent === 'N1_EXPLICIT_NO_START' && !answered) {
    say(copy.vehicleConfirm(state.pendingVehicleConfirmation.label));
    return output;
  }
  if (intent === "BUY_REQUEST") { say(knownBattery(state.result) ? copy.buy : copy.needDetails); output.actions = knownBattery(state.result) ? ["phone", "stores"] : ["phone"]; return output; }
  if (["AGM_DIN_QUESTION", "BATTERY_QUESTION"].includes(intent) && knownBattery(state.result)) {
    {
      if (/agm.*뭐|agm.*뜻/i.test(text)) say(copy.agm);
      const substitute = /써도|써두|대신|다른|바꿔|사용.*돼/.test(text);
      say(substitute ? copy.substitution(state.result.defaultBattery) : copy.battery(state.result.defaultBattery));
      const type = batteryStoreType(state.result.defaultBattery);
      if (!substitute && intent === "AGM_DIN_QUESTION" && type !== "unknown") say(copy.batteryType(type));
      if (substitute) output.actions = ["phone"];
    }
    return output;
  }
  if (intent === "SERVICE_AREA_AVAILABILITY" && !answered) { areaAnswer(); return output; }
  if (/코딩/.test(text)) { say(copy.coding); output.actions = ["phone"]; return output; }
  if (entities.ambiguousYear) { state.result = null; state.confirmedBattery = null; ask("year", copy.yearAmbiguous); return output; }
  if (entities.matches.length > 1) {
    const choices = entities.matches.map(match => ({ value: `${match.manufacturerName} ${match.vehicle}`, label: `${match.manufacturerName} ${match.vehicle}`, key: match.key }));
    ask("vehicle", copy.model(choices.map(choice => choice.label)), choices); return output;
  }
  if (!state.selectedVehicleKey && (state.priceIntent || entities.manufacturer)) {
    if(entities.region) areaAnswer();
    const families=unique(records.filter(r=>r.manufacturerId===state.manufacturer).map(r=>r.vehicle));
    ask("vehicle",state.manufacturer ? `${state.manufacturerName} 어떤 차종이세요? ${families.slice(0,3).join(", ")}처럼 알려주세요.` : "차량마다 배터리 규격이 달라요. 어떤 차량이세요?",families.map(value=>({value,label:value,key:`${state.manufacturer}|${value}`})));
    return output;
  }
  if (!answered && !state.priceIntent && !["BATTERY_QUESTION","PRICE_QUESTION"].includes(intent)) {
    if (state.selectedVehicleKey) { say(copy.unsupported); output.actions = ["phone"]; }
    else { state.failures += 1; say(state.failures > 1 ? copy.noMatchAgain : variant("fallback",state.turnIndex)); if (state.failures > 1) output.actions = ["phone"]; }
    return output;
  }
  if (!state.selectedVehicleKey) { say(copy.needVehicle); return output; }
  state.failures = 0;
  if (entities.region) areaAnswer();
  if (!rows.length) { say(copy.noCombination); output.actions = ["phone"]; return output; }
  if (state.result) {
    say(knownBattery(state.result) ? copy.result(state.result.defaultBattery) : copy.needsCheck);
    if (state.result.upgradeBattery) say(copy.upgrade(state.result.upgradeBattery));
    output.result = state.result;
    if(priceCatalog) { quote(state.result.defaultBattery); output.actions=["phone","stores"]; }
    else if(state.priceIntent) { say(variant("price",state.turnIndex)); output.actions=["phone","stores"]; }
    return output;
  }
  const next=vehicleCandidateOptions(records,state);
  if(next){
    const choices=next.choices;
    const prompt=next.field==='year'?copy.year:next.field==='fuel'?copy.fuel:copy.detail(choices.map(c=>c.label));
    ask(next.field,prompt,choices); return output;
  }
  // Identical known attributes with conflicting facts must never be guessed.
  const specs = unique(rows.map(row=>row.defaultBattery));
  if (priceCatalog && specs.length === 1 && splitBatterySpec(specs[0]).length > 1) {
    quote(specs[0]); output.actions=["phone"]; return output;
  }
  say(copy.needsCheck); output.actions = ["phone"]; return output;
}
