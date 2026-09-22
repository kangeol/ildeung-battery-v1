import { copy, symptomLabels } from "./conversation-copy.js";
import { createConversationState, extractEntities, recognizeIntent, symptomIntent } from "./smart-consult-conversation.js?v=flow-v1";

export const SESSION_KEY = "ildeung.smart-consult.v5";
// Old transcripts can contain the withdrawn GN7 battery value. Do not replay them.
const VERSION = 2;
const MAX_AGE = 12 * 60 * 60 * 1000;
const intentLabels = {CORRECTION:"정보 수정",PRICE_QUESTION:"가격 문의",CALL_REQUEST:"전화 문의",BUY_REQUEST:"구매 문의",AGM_DIN_QUESTION:"배터리 타입 문의",BATTERY_QUESTION:"배터리 문의",SERVICE_AREA_AVAILABILITY:"출장 지역 문의",LIVE_DISPATCH_AVAILABILITY:"지금 방문 문의",TODAY_SERVICE:"오늘 방문 문의",ARRIVAL_TIME:"도착 시간 문의",URGENT_SERVICE:"긴급 방문 문의",RECOVERY:"정보 확인 도움 요청"};

// Never save arbitrary customer text. Only canonical facts and approved intent labels.
export function safeUserMessage(text, previous, records, localities) {
  if (/^(응|네|예|맞아|맞아요|맞습니다|ㅇㅇ|아니|아니요|아냐|아니야)[.!\s]*$/.test(text)) return text.replace(/[.!\s]/g, "");
  const e = extractEntities(text, records, previous, localities);
  const pieces = [];
  if (e.matches.length === 1) pieces.push(`${e.matches[0].manufacturerName} ${e.trim || e.matches[0].vehicle}`);
  if (e.year) pieces.push(`${e.year}년식`);
  if (e.detailModel) pieces.push(e.detailModel);
  if (e.fuel) pieces.push(e.fuel);
  if (e.region) pieces.push(e.region.fullLabel);
  if (e.ambiguousRegion) pieces.push(copy.serviceAsk);
  if (symptomIntent(text)) pieces.push(symptomLabels[symptomIntent(text)]);
  const label = intentLabels[recognizeIntent(text, e)];
  if (label) pieces.push(label);
  return pieces.join(" · ") || copy.privateMessage;
}

function checksum(value) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
export function encodeSession(state, messages, entryId = null, now = Date.now()) {
  // Project only schema fields; no DOM, raw input, URL or unrelated application data.
  const cleanState = Object.fromEntries(Object.keys(createConversationState()).map(key => [key, state[key]]));
  const body = JSON.stringify({state:cleanState, messages:messages.slice(-100), entryId});
  return JSON.stringify({version:VERSION,savedAt:now,body,checksum:checksum(body)});
}
export function decodeSession(raw, now = Date.now()) {
  try {
    if (!raw || raw.length > 200000) return null;
    const envelope = JSON.parse(raw);
    if (envelope.version !== VERSION || !Number.isFinite(envelope.savedAt) || envelope.savedAt > now || now - envelope.savedAt > MAX_AGE || typeof envelope.body !== "string" || checksum(envelope.body) !== envelope.checksum) return null;
    const data = JSON.parse(envelope.body);
    const s = data.state;
    if (!s || Object.keys(s).sort().join() !== Object.keys(createConversationState()).sort().join()) return null;
    for (const [key, value] of Object.entries(createConversationState())) {
      if (typeof value === "string" && typeof s[key] !== "string") return null;
      if (typeof value === "boolean" && typeof s[key] !== "boolean") return null;
      if (typeof value === "number" && (!Number.isSafeInteger(s[key]) || s[key] < 0)) return null;
      if (Array.isArray(value) && (!Array.isArray(s[key]) || s[key].some(item=>typeof item!=="string"))) return null;
    }
    if (s.year !== null && (!Number.isInteger(s.year) || s.year < 1900 || s.year > 2199)) return null;
    if (s.symptom && (!Object.hasOwn(symptomLabels,s.symptom.intent) || s.symptom.rawSafeText !== symptomLabels[s.symptom.intent] || !Number.isSafeInteger(s.symptom.confirmedAt))) return null;
    if (s.previousQuestion && (!Array.isArray(s.previousQuestion.choices) || s.previousQuestion.choices.some(c=>typeof c.label!=="string" || typeof c.value!=="string") || typeof s.previousQuestion.prompt !== "string" || !["year","fuel","exactFuel","vehicle","detailModel","engine","drivetrain"].includes(s.previousQuestion.field))) return null;
    if (s.pendingLocationDisambiguation !== null && !Array.isArray(s.pendingLocationDisambiguation)) return null;
    for (const key of ["result","region","location","pendingVehicleConfirmation"]) if (s[key] !== null && (typeof s[key] !== "object" || Array.isArray(s[key]))) return null;
    if (s.result && (typeof s.result.defaultBattery!=="string" || typeof s.result.vehicle!=="string" || typeof s.result.manufacturerId!=="string")) return null;
    if (s.confirmedBattery !== null && (typeof s.confirmedBattery!=="string" || s.confirmedBattery!==s.result?.defaultBattery)) return null;
    const validRegion=r=>r && typeof r.canonicalId==="string" && typeof r.fullLabel==="string" && typeof r.slug==="string";
    if ([s.region,s.location].some(r=>r!==null&&!validRegion(r)) || s.pendingLocationDisambiguation?.some(r=>!validRegion(r))) return null;
    if (s.pendingVehicleConfirmation && (typeof s.pendingVehicleConfirmation.key!=="string" || typeof s.pendingVehicleConfirmation.label!=="string")) return null;
    if (!Array.isArray(data.messages) || data.messages.length > 100 || data.messages.some(m=>!["user","bot"].includes(m.role) || typeof m.text!=="string" || m.text.length>5000 || !Array.isArray(m.actions) || m.actions.some(a=>!["phone","stores"].includes(a)) || !Array.isArray(m.chips) || m.chips.length>4 || m.chips.some(c=>typeof c.label!=="string" || typeof c.value!=="string"))) return null;
    if (data.messages.some(m=>(m.battery!=null&&typeof m.battery!=="string") || (m.areaSlug!=null&&!/^[a-z0-9-]+$/.test(m.areaSlug)))) return null;
    if (data.entryId !== null && typeof data.entryId !== "string") return null;
    return data;
  } catch { return null; }
}
export function clearSession(storage) { try { storage.removeItem(SESSION_KEY); } catch { /* Storage may be disabled. */ } }

export function summaryFields(state) {
  return [
    ["차량",state.selectedVehicleKey ? [state.manufacturerName,state.model || state.vehicleFamily].filter(Boolean).join(" ") : ""],
    [copy.labels.model,state.detailModel],
    [copy.labels.year,state.year ? `${state.year}년식` : ""],
    [copy.labels.fuel,state.exactFuel || state.fuel],
    [copy.labels.battery,state.confirmedBattery],
    [copy.labels.upgrade,state.confirmedBattery ? state.result?.upgradeBattery : ""],
    ["지역",state.region?.fullLabel], ["문의",state.symptom?.rawSafeText]
  ].filter(([,value])=>value);
}
