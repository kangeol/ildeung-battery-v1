export const PHONE_HREF = "tel:1644-9141";
export const PHONE_LABEL = "1644-9141";
export const DIN_STORE_URL = "https://smartstore.naver.com/battery1/products/414050800";
export const AGM_STORE_URL = "https://smartstore.naver.com/battery1/products/575288571";

export const MANUFACTURER_ALIASES = {
  audi: ["아우디", "audi"],
  benz: ["벤츠", "메르세데스", "mercedesbenz", "mercedes", "benz"],
  bmw: ["비엠더블유", "bmw"],
  chevrolet: ["쉐보레", "쉐비", "chevrolet", "chevy"],
  ford: ["포드", "ford"],
  genesis: ["제네시스", "genesis"],
  hyundai: ["현대", "hyundai"],
  jeep: ["지프", "jeep"],
  kgm: ["kg모빌리티", "쌍용", "kgm"],
  kia: ["기아", "kia"],
  landrover: ["랜드로버", "landrover"],
  mini: ["미니", "mini"],
  renault: ["르노코리아", "르노삼성", "르노", "renault"],
  volkswagen: ["폭스바겐", "volkswagen", "vw"],
  volvo: ["볼보", "volvo"]
};

export const FAMILY_ALIASES = [
  { manufacturerId: "bmw", vehicle: "5시리즈", aliases: ["520d", "520i", "523i", "525d", "528i", "530d", "530i", "535d", "5series"] },
  { manufacturerId: "bmw", vehicle: "3시리즈", aliases: ["320d", "320i", "330e", "330i", "3series"] },
  { manufacturerId: "benz", vehicle: "E-클래스", aliases: ["e200", "e220", "e220d", "e250", "e300", "e350", "e400", "eclass"] },
  { manufacturerId: "benz", vehicle: "C-클래스", aliases: ["c200", "c220", "c220d", "c300", "cclass"] },
  { manufacturerId: "benz", vehicle: "S-클래스", aliases: ["s350", "s400", "s450", "s500", "sclass"] }
];

export function normalizeText(value = "") {
  return String(value)
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^0-9a-z가-힣]/g, "");
}

function expandTwoDigitYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year)) return null;
  if (year >= 1000) return year;
  return year <= 35 ? 2000 + year : 1900 + year;
}

export function extractYear(value = "") {
  const full = String(value).match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
  if (full) return Number(full[1]);

  const short = String(value).match(/(?:^|\D)(\d{2})\s*년(?:식)?(?:\D|$)/);
  return short ? expandTwoDigitYear(short[1]) : null;
}

export function parseYearRange(value = "") {
  const text = String(value).normalize("NFKC").replace(/\s/g, "");
  const numbers = [...text.matchAll(/\d{2,4}/g)].map((match) => expandTwoDigitYear(match[0])).filter(Boolean);
  if (!numbers.length) return { start: null, end: null };

  if (/현재|이후|~$/.test(text) && numbers.length === 1) {
    return { start: numbers[0], end: null };
  }

  if (/이전|까지/.test(text) && numbers.length === 1) {
    return { start: null, end: numbers[0] };
  }

  if (numbers.length >= 2) {
    return { start: Math.min(numbers[0], numbers[1]), end: Math.max(numbers[0], numbers[1]) };
  }

  return { start: numbers[0], end: numbers[0] };
}

export function yearMatches(rangeText, year) {
  if (!year) return true;
  const { start, end } = parseYearRange(rangeText);
  if (start !== null && year < start) return false;
  if (end !== null && year > end) return false;
  return start !== null || end !== null;
}

function detectManufacturer(normalizedQuery) {
  let best = null;
  Object.entries(MANUFACTURER_ALIASES).forEach(([manufacturerId, aliases]) => {
    aliases.forEach((alias) => {
      const normalizedAlias = normalizeText(alias);
      if (normalizedAlias && normalizedQuery.includes(normalizedAlias) && (!best || normalizedAlias.length > best.alias.length)) {
        best = { manufacturerId, alias: normalizedAlias };
      }
    });
  });
  return best;
}

function detectFamilyAlias(normalizedQuery, manufacturerId) {
  const candidates = FAMILY_ALIASES.filter((entry) => !manufacturerId || entry.manufacturerId === manufacturerId);
  for (const entry of candidates) {
    const found = entry.aliases.find((alias) => normalizedQuery.includes(normalizeText(alias)));
    if (found) return entry;
  }
  return null;
}

function detectFuel(value = "") {
  const text = normalizeText(value);
  const variants = [
    { key: "하이브리드", aliases: ["하이브리드", "hybrid", "hev"] },
    { key: "디젤", aliases: ["디젤", "diesel"] },
    { key: "가솔린", aliases: ["가솔린", "휘발유", "gasoline", "petrol"] },
    { key: "전기", aliases: ["전기차", "전기", "electric", "ev"] },
    { key: "LPG", aliases: ["lpg"] }
  ];
  return variants.find((variant) => variant.aliases.some((alias) => text.includes(normalizeText(alias))))?.key ?? null;
}

export function buildVehicleGroups(records = []) {
  const grouped = new Map();
  records.forEach((record) => {
    const key = `${record.manufacturerId}|${record.vehicle}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        manufacturerId: record.manufacturerId,
        manufacturerName: record.manufacturerName || record.manufacturer,
        vehicle: record.vehicle,
        records: []
      });
    }
    grouped.get(key).records.push(record);
  });
  return [...grouped.values()];
}

export function searchVehicles(query, records = []) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return { query, normalizedQuery, year: null, fuel: null, matches: [] };

  const year = extractYear(query);
  const fuel = detectFuel(query);
  const manufacturer = detectManufacturer(normalizedQuery);
  const aliasMatch = detectFamilyAlias(normalizedQuery, manufacturer?.manufacturerId);
  const withoutManufacturer = manufacturer ? normalizedQuery.replace(manufacturer.alias, "") : normalizedQuery;
  const queryVehicle = withoutManufacturer.replace(/(?:19|20)\d{2}(?:년식?)?/g, "").replace(/\d{2}년식?/g, "");
  const groups = buildVehicleGroups(records);
  const scored = [];

  groups.forEach((group) => {
    if (manufacturer && group.manufacturerId !== manufacturer.manufacturerId) return;
    if (aliasMatch && (group.manufacturerId !== aliasMatch.manufacturerId || group.vehicle !== aliasMatch.vehicle)) return;

    const vehicle = normalizeText(group.vehicle);
    const manufacturerVehicle = normalizeText(`${group.manufacturerName}${group.vehicle}`);
    let score = Number.POSITIVE_INFINITY;
    let matchedDetail = "";

    if (aliasMatch) {
      score = 0;
    } else if (queryVehicle === vehicle || normalizedQuery === manufacturerVehicle) {
      score = 0;
    } else {
      let detailScore = Number.POSITIVE_INFINITY;
      const matchedDetails = new Set();
      const exactMatchedDetails = new Set();
      group.records.forEach((record) => {
        const detail = normalizeText(record.detailModel);
        if (queryVehicle === detail || normalizedQuery === normalizeText(`${group.manufacturerName}${record.detailModel}`)) {
          detailScore = Math.min(detailScore, 0);
          matchedDetails.add(record.detailModel);
          exactMatchedDetails.add(record.detailModel);
        } else if (queryVehicle.length >= 2 && detail.includes(queryVehicle)) {
          detailScore = Math.min(detailScore, 1);
          matchedDetails.add(record.detailModel);
        }
      });

      const vehicleScore = queryVehicle.length >= 2 && (vehicle.includes(queryVehicle) || queryVehicle.includes(vehicle)) ? 2 : Number.POSITIVE_INFINITY;
      score = Math.min(detailScore, vehicleScore);
      if (detailScore < vehicleScore && exactMatchedDetails.size === 1) matchedDetail = [...exactMatchedDetails][0];
      else if (detailScore < vehicleScore && matchedDetails.size === 1) matchedDetail = [...matchedDetails][0];

    }

    if (Number.isFinite(score)) scored.push({ ...group, score, matchedDetail });
  });

  scored.sort((a, b) => a.score - b.score || a.manufacturerName.localeCompare(b.manufacturerName, "ko") || a.vehicle.localeCompare(b.vehicle, "ko"));
  const bestScore = scored[0]?.score;
  const matches = scored.filter((match) => match.score === bestScore).slice(0, 8);
  return { query, normalizedQuery, year, fuel, matches };
}

export function createInitialState() {
  return {
    selectedVehicleKey: "",
    sourceQuery: "",
    year: null,
    detailModel: "",
    yearRange: "",
    fuel: "",
    result: null,
    area: ""
  };
}

function uniqueValues(records, field) {
  return [...new Set(records.map((record) => record[field]).filter(Boolean))];
}

function batterySignature(record) {
  return `${record.defaultBattery || ""}|${record.upgradeBattery || ""}`;
}

function filterForState(records, state) {
  return records.filter((record) => {
    if (state.detailModel && record.detailModel !== state.detailModel) return false;
    if (state.yearRange && record.year !== state.yearRange) return false;
    if (state.fuel && record.fuel !== state.fuel) return false;
    if (state.year && !yearMatches(record.year, state.year)) return false;
    return true;
  });
}

function choicesFor(records, field) {
  return uniqueValues(records, field).map((value) => ({ value, label: value }));
}

function summarizeResult(records) {
  const first = records[0];
  const sameValue = (field) => {
    const values = uniqueValues(records, field);
    return values.length === 1 ? values[0] : "";
  };
  return {
    manufacturerId: first.manufacturerId,
    manufacturerName: first.manufacturerName || first.manufacturer,
    vehicle: first.vehicle,
    detailModel: sameValue("detailModel"),
    year: sameValue("year"),
    fuel: sameValue("fuel"),
    defaultBattery: sameValue("defaultBattery"),
    upgradeBattery: sameValue("upgradeBattery"),
    matchedRows: records.length
  };
}

export function resolveConsultation(records = [], state = {}) {
  const filtered = filterForState(records, state);
  if (!filtered.length) return { type: "no-match", records: [] };

  const fullSignatures = [...new Set(filtered.map(batterySignature))];
  if (fullSignatures.length === 1) {
    return { type: "result", records: filtered, result: summarizeResult(filtered) };
  }

  const dimensions = [
    { field: "detailModel", prompt: "어떤 세부모델인가요?" },
    { field: "year", prompt: "차량 연식 구간을 선택해 주세요." },
    { field: "fuel", prompt: "차량 연료를 선택해 주세요." }
  ];

  for (const dimension of dimensions) {
    if (state[dimension.field === "year" ? "yearRange" : dimension.field]) continue;
    const choices = choicesFor(filtered, dimension.field);
    if (choices.length > 1) {
      return { type: "question", field: dimension.field, prompt: dimension.prompt, choices, records: filtered };
    }
  }

  const fallbackChoices = filtered.map((record, index) => ({
    value: String(index),
    label: [record.detailModel, record.year, record.fuel].filter(Boolean).join(" · "),
    record
  }));
  return {
    type: "question",
    field: "record",
    prompt: "아래 실제 DB 조건 중 차량과 일치하는 항목을 선택해 주세요.",
    choices: fallbackChoices,
    records: filtered
  };
}

export function applyDetectedFilters(match, searchResult) {
  const next = createInitialState();
  next.selectedVehicleKey = match.key;
  next.sourceQuery = searchResult.query;
  next.year = searchResult.year;
  const details = uniqueValues(match.records, "detailModel");
  if (match.matchedDetail && details.includes(match.matchedDetail)) next.detailModel = match.matchedDetail;
  if (searchResult.fuel) {
    const matchingFuels = uniqueValues(match.records, "fuel").filter((fuel) => normalizeText(fuel).includes(normalizeText(searchResult.fuel)));
    if (matchingFuels.length === 1) next.fuel = matchingFuels[0];
  }
  return next;
}

export function batteryStoreType(defaultBattery = "") {
  const normalized = String(defaultBattery).toUpperCase();
  const hasAgm = normalized.includes("AGM");
  const hasDin = /(?:DIN|DF)\s*\d/.test(normalized);
  if (hasAgm && !hasDin) return "agm";
  if (hasDin && !hasAgm) return "din";
  return "unknown";
}

export function classifyQuestion(value = "") {
  const text = normalizeText(value);
  if (/가격|얼마|비용|견적/.test(text)) return "price";
  if (/코딩|등록|리셋/.test(text)) return "coding";
  if (/출장|방문|지역|서울|경기|인천/.test(text)) return "area";
  if (/배터리|밧데리|규격|용량/.test(text)) return "battery";
  return "fallback";
}

export function buildSafeAnswer(intent, result) {
  if (intent === "price") {
    return "차량 DB에는 가격 정보가 없어 금액을 단정할 수 없습니다. 정확한 가격은 상품 페이지 또는 전화로 확인해 주세요.";
  }
  if (intent === "coding") {
    return "차량 DB에는 코딩 필요 여부가 없어 단정할 수 없습니다. 차종과 현재 장착 상태를 기준으로 전화 확인해 주세요.";
  }
  if (intent === "area") {
    return "서울·경기·인천 중 지역을 선택하면 공식 지역 안내 페이지를 연결해 드립니다.";
  }
  if (intent === "battery" && result?.defaultBattery) {
    return `현재 선택 조건에서 DB 기본 배터리는 ${result.defaultBattery}${result.upgradeBattery ? `, 업그레이드 배터리는 ${result.upgradeBattery}` : ""}로 확인됩니다.`;
  }
  return "차량명과 연식을 함께 입력하면 현재 차량 DB에서 다시 찾아드릴 수 있습니다. DB에 없는 정보는 1644-9141로 확인해 주세요.";
}
