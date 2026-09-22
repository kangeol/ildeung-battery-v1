import { batteryStoreType, buildVehicleGroups, normalizeText, parseYearRange, resolveConsultation, searchVehicles, yearMatches } from "./smart-consult-core.js";
import { copy } from "./conversation-copy.js";

const unique = values => [...new Set(values.filter(Boolean))];
const affirmative = /^(응|네|예|맞아|맞아요|맞습니다|응맞아|네맞아요)[.!\s]*$/;
const negative = /^(아니|아니요|아냐|아니야)[.!\s]*$/;
const signature = row => `${row.defaultBattery}|${row.upgradeBattery || ""}`;
const knownBattery = result => result?.defaultBattery && !/문의|확인/.test(result.defaultBattery);

export function createConversationState() {
  return { manufacturer: "", manufacturerName: "", vehicleFamily: "", model: "", generation: "", year: null, fuel: "", detailModel: "", exactFuel: "", selectedVehicleKey: "", batteryCandidates: [], confirmedBattery: null, result: null, region: null, city: "", district: "", lastIntent: "UNKNOWN", previousQuestion: null, ambiguity: null, failures: 0 };
}

function fuelType(value) {
  if (/하이브리드|hybrid|hev|\+전기/i.test(value)) return "하이브리드";
  if (/디젤|diesel/i.test(value)) return "디젤";
  if (/가솔린|휘발유|gasoline|petrol/i.test(value)) return "가솔린";
  if (/lpg/i.test(value)) return "LPG";
  if (/전기|electric/i.test(value)) return "전기";
  return "";
}

function yearFromText(text, rows, nowYear) {
  if (/\d{2,4}\s*[~～–]\s*(?:\d{2,4}|현재)/.test(text)) return {};
  const full = text.match(/(?:^|[^\d])((?:19|20)\d{2})(?!\d)/);
  if (full) return { year: Number(full[1]) };
  const short = text.match(/(?:^|[^\d])(\d{2})\s*년(?:식)?/) || text.match(/^\s*(\d{2})\s*$/);
  if (!short) return {};
  const n = Number(short[1]);
  const years = [1900 + n, 2000 + n].filter(year => year <= nowYear + 1 && rows.some(row => yearMatches(row.year, year)));
  return years.length === 1 ? { year: years[0] } : { ambiguousYear: true };
}

function regionFromText(text, localities, previous) {
  const normalized = normalizeText(text);
  const namedArea = localities.find(item => !item.region && [item.name, item.fullName].some(name => normalized.includes(normalizeText(name))));
  const found = localities.filter(item => {
    const alias = item.name.replace(/[시구동읍면]$/, "");
    return [item.name, item.fullName, ...(alias.length >= 2 ? [alias] : [])].some(name => normalized.includes(normalizeText(name)));
  });
  const scope = namedArea?.area || previous?.area;
  let matches = namedArea ? found.filter(item => item.area === scope) : found;
  if (!namedArea && scope && matches.some(item => item.area === scope)) matches = matches.filter(item => item.area === scope);
  if (!matches.length) return { region: null };
  const longest = Math.max(...matches.map(item => item.name.length));
  matches = matches.filter(item => item.name.length === longest);
  const distinct = [...new Map(matches.map(item => [`${item.area}|${item.fullName}`, item])).values()];
  return distinct.length === 1 ? { region: distinct[0] } : { ambiguousRegion: true };
}

export function recognizeIntent(text, entities) {
  if (/^(처음부터|다시시작|초기화|리셋|새상담)$/.test(normalizeText(text))) return "RESET";
  if (/아니|정정|수정|잘못|바꿔/.test(text) && (entities.year || entities.fuel || entities.matches.length)) return "CORRECTION";
  if (/가격|얼마|비용|견적/.test(text)) return "PRICE_QUESTION";
  if (/전화|통화/.test(text)) return "CALL_REQUEST";
  if (/구매|살래|주문|상품/.test(text)) return "BUY_REQUEST";
  if (/agm|din|일반\s*배터리|다른\s*(타입|배터리)/i.test(text)) return "AGM_DIN_QUESTION";
  if (/출장|방문|지역|도\s*와|도와\?|가능해/.test(text) || entities.region || entities.ambiguousRegion) return "SERVICE_AREA_QUESTION";
  if (entities.matches.length) return "VEHICLE_IDENTIFICATION";
  if (entities.year || entities.ambiguousYear) return "YEAR_INFO";
  if (entities.fuel) return "FUEL_INFO";
  if (entities.detailModel || entities.exactFuel) return "MODEL_INFO";
  if (/배터리|밧데리|규격|용량/.test(text)) return "BATTERY_QUESTION";
  return "UNKNOWN";
}

export function extractEntities(text, records, state = createConversationState(), localities = [], nowYear = new Date().getFullYear()) {
  const normalized = normalizeText(text);
  // Search recognises family aliases; an exact detail phrase inside a sentence is retained too.
  const search = searchVehicles(text, records);
  let matches = search.matches;
  const detailMatches = unique(records.map(row => row.detailModel)).filter(detail => normalized.includes(normalizeText(detail))).sort((a,b) => normalizeText(b).length - normalizeText(a).length);
  let detailModel = detailMatches[0] || "";
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
  const exactFuel = exactFuels.sort((a,b) => b.length - a.length)[0] || "";
  const trim = text.match(/(?:^|[^a-z0-9])((?:[235]\d{2}[di]|[ecs]\s?\d{3}d?))(?![a-z0-9])/i)?.[1]?.replace(/\s/g, "") || normalized.match(/(?:bmw|벤츠)([235]\d{2}[di]|[ecs]\d{3}d?)/)?.[1] || "";
  return { matches, detailModel, generation, fuel, exactFuel, trim: trim.toUpperCase().replace(/D$/, "d").replace(/I$/, "i"), ...yearFromText(text, rows.length ? rows : records, nowYear), ...regionFromText(text, localities, state.region) };
}

function filteredRows(records, state) {
  return records.filter(row => `${row.manufacturerId}|${row.vehicle}` === state.selectedVehicleKey && (!state.year || yearMatches(row.year, state.year)) && (!state.detailModel || row.detailModel === state.detailModel) && (!state.fuel || fuelType(row.fuel) === state.fuel) && (!state.exactFuel || row.fuel === state.exactFuel));
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

export function conversationTurn(previous, text, records, localities = []) {
  let state = { ...previous };
  let entities = extractEntities(text, records, state, localities);
  const intent = recognizeIntent(text, entities);
  const messages = [];
  const output = { state, messages, chips: [], actions: [], result: null, region: null };
  const say = value => messages.push(value);
  const ask = (field, prompt, choices = [], extra = {}) => {
    state.previousQuestion = { field, prompt, choices, ...extra };
    state.ambiguity = field;
    output.chips = choices.slice(0,4).map(choice => ({ label: choice.label, value: choice.value }));
    say(prompt);
  };
  if (intent === "RESET") { output.state = createConversationState(); say(copy.greeting); return output; }
  state.lastIntent = intent;

  // Plain answers can resolve any displayed option; no chip is required.
  const question = state.previousQuestion;
  let answered = false;
  if (question && !/가격|얼마|전화|출장|agm|배터리/i.test(text)) {
    const normalized = normalizeText(text).replace(/(이야|이에요|예요|맞아|입니다)$/, "");
    const choices = question.choices.filter(choice => [choice.value, choice.label].some(value => normalizeText(value) === normalized || (normalized.length >= 2 && normalizeText(value).includes(normalized))));
    const choice = choices.length === 1 ? choices[0] : null;
    if (question.field === "fuel" && question.confirm && affirmative.test(text)) { entities.fuel = question.confirm; answered = true; }
    else if (question.field === "fuel" && negative.test(text)) {
      ask("fuel", copy.fuel, question.choices); return output;
    } else if (choice) {
      if (question.field === "vehicle") entities.matches = buildVehicleGroups(records).filter(group => group.key === choice.key);
      if (question.field === "detailModel") entities.detailModel = choice.value;
      if (question.field === "fuel") entities.fuel = choice.value;
      if (question.field === "exactFuel") entities.exactFuel = choice.value;
      answered = true;
    }
  }
  if (entities.matches.length === 1) {
    const match = entities.matches[0];
    if (state.selectedVehicleKey && state.selectedVehicleKey !== match.key) {
      state = { ...createConversationState(), region: state.region, city: state.city, district: state.district, lastIntent: intent };
      output.state = state;
    }
    state.selectedVehicleKey = match.key;
    state.manufacturer = match.manufacturerId;
    state.manufacturerName = match.manufacturerName;
    state.vehicleFamily = match.vehicle;
    if (entities.trim) state.model = entities.trim;
    if (match.matchedDetail) entities.detailModel = match.matchedDetail;
    answered = true;
  }
  const changedYear = entities.year && entities.year !== state.year;
  if (changedYear) { state.year = entities.year; state.detailModel = ""; state.generation = ""; }
  if (entities.detailModel) state.detailModel = entities.detailModel;
  if (entities.generation) state.generation = entities.generation;
  if (entities.fuel) { state.fuel = entities.fuel; state.exactFuel = ""; }
  if (entities.exactFuel) state.exactFuel = entities.exactFuel;
  if (entities.region) {
    state.region = entities.region;
    state.city = entities.region.area;
    state.district = entities.region.region;
  }
  if (entities.year || entities.fuel || entities.detailModel || entities.exactFuel) answered = true;
  if (intent === "CORRECTION") say(copy.correction(entities.year));

  let rows = filteredRows(records, state);
  if (answered) {
    state.result = null; state.confirmedBattery = null; state.previousQuestion = null; state.ambiguity = null;
    state.batteryCandidates = unique(rows.map(row => row.defaultBattery));
    if (rows.length && unique(rows.map(signature)).length === 1) {
      state.result = resolveConsultation(rows, {}).result;
      state.confirmedBattery = knownBattery(state.result) ? state.result.defaultBattery : null;
      state.generation = state.result.detailModel?.match(/\b([GFW]\d{2,3})\b/i)?.[1]?.toUpperCase() || state.generation;
    }
  }
  const areaAnswer = () => {
    if (entities.ambiguousRegion) { say(copy.serviceAmbiguous); return; }
    // An explicit unknown place must not be replaced with the old remembered place.
    const placeBeforeService = text.match(/(?:^|\s)([가-힣]{2,})(?=\s+(?:출장|방문))/)?.[1];
    const explicitPlace = placeBeforeService && !["여기", "거기", "오늘", "내일", "지금", "배터리"].includes(placeBeforeService);
    const newUnknownPlace = !entities.region && (explicitPlace || /[가-힣]{2,}(?:인데|이야|에도|도\s*와)/.test(text));
    if (newUnknownPlace) { say(copy.serviceUnknown); output.actions = ["phone"]; return; }
    if (state.region) { say(copy.service(state.region.name)); output.region = state.region; output.actions = ["phone"]; }
    else if (/출장\s*(가능|돼|되)|방문\s*가능/.test(text)) say(copy.serviceAsk);
    else { say(copy.serviceUnknown); output.actions = ["phone"]; }
  };
  if (intent === "CALL_REQUEST") { say(copy.call); output.actions = ["phone"]; return output; }
  if (intent === "PRICE_QUESTION") { say(state.result ? copy.price : state.selectedVehicleKey ? copy.needDetails : copy.needVehicle); if (state.result) output.actions = ["phone", "stores"]; return output; }
  if (intent === "BUY_REQUEST") { say(knownBattery(state.result) ? copy.buy : copy.needDetails); output.actions = knownBattery(state.result) ? ["phone", "stores"] : ["phone"]; return output; }
  if (["AGM_DIN_QUESTION", "BATTERY_QUESTION"].includes(intent)) {
    if (!knownBattery(state.result)) say(state.selectedVehicleKey ? copy.needDetails : copy.needVehicle);
    else {
      if (/agm.*뭐|agm.*뜻/i.test(text)) say(copy.agm);
      const substitute = /써도|써두|대신|다른|바꿔|사용.*돼/.test(text);
      say(substitute ? copy.substitution(state.result.defaultBattery) : copy.battery(state.result.defaultBattery));
      const type = batteryStoreType(state.result.defaultBattery);
      if (!substitute && intent === "AGM_DIN_QUESTION" && type !== "unknown") say(copy.batteryType(type));
      if (substitute) output.actions = ["phone"];
    }
    return output;
  }
  if (intent === "SERVICE_AREA_QUESTION" && !answered) { areaAnswer(); return output; }
  if (/코딩/.test(text)) { say(copy.coding); output.actions = ["phone"]; return output; }
  if (entities.ambiguousYear) { state.result = null; state.confirmedBattery = null; ask("year", copy.yearAmbiguous); return output; }
  if (entities.matches.length > 1) {
    const choices = entities.matches.map(match => ({ value: `${match.manufacturerName} ${match.vehicle}`, label: `${match.manufacturerName} ${match.vehicle}`, key: match.key }));
    ask("vehicle", copy.model(choices.map(choice => choice.label)), choices); return output;
  }
  if (!answered) {
    if (state.selectedVehicleKey) { say(copy.unsupported); output.actions = ["phone"]; }
    else { state.failures += 1; say(state.failures > 1 ? copy.noMatchAgain : copy.noMatch); if (state.failures > 1) output.actions = ["phone"]; }
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
    return output;
  }
  if (!state.year && unique(rows.map(row => row.year)).length > 1) {
    if (entities.matches.length === 1) say(copy.recognized([state.manufacturerName, state.model || state.vehicleFamily].join(" ")));
    ask("year", copy.year); return output;
  }
  const fuels = unique(rows.map(row => fuelType(row.fuel)));
  const fuelSeparates = unique(fuels.map(fuel => unique(rows.filter(row => fuelType(row.fuel) === fuel).map(signature)).sort().join(";"))).length > 1;
  if (!state.fuel && fuels.length > 1 && fuelSeparates) {
    if (entities.matches.length === 1) say(copy.recognized(vehicleLabel(state)));
    const choices = fuels.map(value => ({label: value, value}));
    const confirm = fuels.includes("디젤") ? "디젤" : fuels[0];
    ask("fuel", copy.fuelConfirm(confirm), choices, {confirm}); return output;
  }
  const fuelsExact = unique(rows.map(row => row.fuel));
  if (!state.exactFuel && fuelsExact.length > 1 && unique(rows.map(row => row.detailModel)).length === 1) {
    // Ask trim only when it separates battery specifications, not duplicate drive variants.
    const separates = fuelsExact.some(fuel => unique(rows.filter(row => row.fuel === fuel).map(signature)).length < unique(rows.map(signature)).length);
    if (separates) { const choices = fuelsExact.map(value => ({label:value, value})); ask("exactFuel", copy.detail(choices.map(choice => choice.label)), choices); return output; }
  }
  const details = unique(rows.map(row => row.detailModel));
  if (!state.detailModel && details.length > 1) {
    const choices = details.map(value => ({value, label:detailLabel(value,rows)}));
    ask("detailModel", copy.detail(choices.map(choice => choice.label)), choices); return output;
  }
  // Identical known attributes with conflicting facts must never be guessed.
  say(copy.noMatchAgain); output.actions = ["phone"]; return output;
}
