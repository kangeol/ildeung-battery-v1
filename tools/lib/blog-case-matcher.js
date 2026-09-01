import fs from "node:fs";
import path from "node:path";
import {
  ROOT_DIR,
  normalizeLoose,
  normalizeText,
  readJson,
  truncateText,
  urlPathToFilePath
} from "./blog-case-utils.js";

const DATA_DIR = path.join(ROOT_DIR, "data");
const MANUFACTURERS_FILE = path.join(DATA_DIR, "manufacturers.json");
const VEHICLE_DETAIL_GROUPS_FILE = path.join(ROOT_DIR, "seo-data", "vehicle-detail-groups.json");
const SERVICE_AREAS_FILE = path.join(ROOT_DIR, "seo-data", "service-areas.json");

const MANUFACTURER_ALIASES = {
  bmw: ["BMW", "비엠더블유"],
  benz: ["벤츠", "Mercedes", "Mercedes-Benz", "메르세데스", "메르세데스벤츠"],
  audi: ["아우디", "Audi"],
  mini: ["미니", "MINI"],
  volkswagen: ["폭스바겐", "Volkswagen", "VW"],
  landrover: ["랜드로버", "Land Rover"],
  volvo: ["볼보", "Volvo"],
  jeep: ["지프", "Jeep"],
  ford: ["포드", "Ford"],
  hyundai: ["현대", "현대차"],
  genesis: ["제네시스", "Genesis"],
  kia: ["기아", "KIA"],
  chevrolet: ["쉐보레", "쉐보레", "Chevrolet"],
  renault: ["르노", "르노코리아", "르노삼성", "Renault"],
  kgm: ["KG모빌리티", "KGM", "KG", "쌍용"]
};

const SYMPTOM_TERMS = ["방전", "시동불량", "시동 불량", "교체", "점검", "코딩"];
const WORK_LOCATION_TERMS = [
  "방문",
  "출장",
  "출장방문",
  "출장교체",
  "출장배터리",
  "출장밧데리",
  "방문비용",
  "방문 비용",
  "배터리교체",
  "밧데리교체",
  "교체",
  "가격",
  "비용",
  "장착완료",
  "장착 완료",
  "교체 완료",
  "출장 완료",
  "작업"
];
const GENERIC_SERVICE_AREA_PATTERNS = [
  /서울\s*[·ㆍ/|, ]+\s*경기\s*[·ㆍ/|, ]+\s*인천/gi,
  /서울\s*[·ㆍ/|, ]+\s*인천\s*[·ㆍ/|, ]+\s*경기/gi,
  /인천\s*[·ㆍ/|, ]+\s*서울\s*[·ㆍ/|, ]+\s*경기/gi,
  /인천\s*[·ㆍ/|, ]+\s*경기\s*[·ㆍ/|, ]+\s*서울/gi,
  /경기\s*[·ㆍ/|, ]+\s*서울\s*[·ㆍ/|, ]+\s*인천/gi,
  /경기\s*[·ㆍ/|, ]+\s*인천\s*[·ㆍ/|, ]+\s*서울/gi,
  /서울\s*경기\s*인천(?:\s*전지역)?(?:\s*출장|\s*문의|\s*가능)?/gi,
  /서울\s*인천\s*경기(?:\s*전지역)?(?:\s*출장|\s*문의|\s*가능)?/gi,
  /인천\s*서울\s*경기(?:\s*전지역)?(?:\s*출장|\s*문의|\s*가능)?/gi,
  /인천\s*경기\s*서울(?:\s*전지역)?(?:\s*출장|\s*문의|\s*가능)?/gi,
  /경기\s*서울\s*인천(?:\s*전지역)?(?:\s*출장|\s*문의|\s*가능)?/gi,
  /경기\s*인천\s*서울(?:\s*전지역)?(?:\s*출장|\s*문의|\s*가능)?/gi,
  /수도권\s*(?:전지역\s*)?출장(?:\s*가능)?/gi,
  /출장\s*가능\s*지역/gi,
  /서비스\s*가능\s*지역/gi
];

const VEHICLE_ALIAS_RULES = {
  benz: {
    "E-클래스": {
      aliases: ["벤츠E", "벤츠 E", "벤츠E클래스", "벤츠 E클래스", "벤츠 E CLASS", "벤츠E200", "벤츠 E200", "벤츠E220", "벤츠 E220", "벤츠E220D", "벤츠 E220D", "벤츠E300", "벤츠 E300", "벤츠E320", "벤츠 E320"],
      contextual: ["E200", "E220", "E220D", "E300", "E320"]
    },
    "C-클래스": {
      aliases: ["벤츠C", "벤츠 C", "벤츠C클래스", "벤츠 C클래스", "벤츠 C CLASS", "벤츠C200", "벤츠 C200", "벤츠C220", "벤츠 C220", "벤츠C220D", "벤츠 C220D"],
      contextual: ["C200", "C220", "C220D"]
    },
    "S-클래스": {
      aliases: ["벤츠S", "벤츠 S", "벤츠S클래스", "벤츠 S클래스", "벤츠 S CLASS", "벤츠S350", "벤츠 S350", "벤츠S350D", "벤츠 S350D", "벤츠S500", "벤츠 S500", "벤츠S600", "벤츠 S600"],
      contextual: ["S350", "S350D", "S500", "S600"]
    },
    "GLA-클래스": {
      aliases: ["벤츠GLA", "벤츠 GLA", "벤츠GLA220D", "벤츠 GLA220D"],
      contextual: ["GLA", "GLA220D"]
    },
    "GLB-클래스": {
      aliases: ["벤츠GLB", "벤츠 GLB"],
      contextual: ["GLB"]
    },
    "GLC-클래스": {
      aliases: ["벤츠GLC", "벤츠 GLC"],
      contextual: ["GLC"]
    },
    "CLA-클래스": {
      aliases: ["벤츠CLA", "벤츠 CLA"],
      contextual: ["CLA"]
    }
  },
  bmw: {
    "1시리즈": {
      aliases: ["BMW1", "BMW 1", "BMW1시리즈", "BMW 1시리즈", "BMW118D", "BMW 118D"],
      contextual: ["118D"]
    },
    "3시리즈": {
      aliases: ["BMW3", "BMW 3", "BMW3시리즈", "BMW 3시리즈", "BMW320", "BMW 320", "BMW320D", "BMW 320D", "BMW320I", "BMW 320I", "BMW3GT", "BMW 3GT"],
      contextual: ["320", "320D", "320I", "3GT"]
    },
    "4시리즈": {
      aliases: ["BMW4", "BMW 4", "BMW4시리즈", "BMW 4시리즈"],
      contextual: ["4시리즈"]
    },
    "5시리즈": {
      aliases: ["BMW5", "BMW 5", "BMW5시리즈", "BMW 5시리즈", "BMW520", "BMW 520", "BMW520D", "BMW 520D", "BMW528", "BMW 528", "BMW528I", "BMW 528I", "BMW530", "BMW 530", "BMW530I", "BMW 530I"],
      contextual: ["520", "520D", "528", "528I", "530", "530I"]
    },
    "7시리즈": {
      aliases: ["BMW7", "BMW 7", "BMW7시리즈", "BMW 7시리즈"],
      contextual: ["730", "740"]
    },
    "X1": { aliases: ["BMWX1", "BMW X1", "X1"], exactToken: true },
    "X2": { aliases: ["BMWX2", "BMW X2", "X2"], exactToken: true },
    "X3": { aliases: ["BMWX3", "BMW X3", "X3"], exactToken: true },
    "X4": { aliases: ["BMWX4", "BMW X4", "X4"], exactToken: true },
    "X5": { aliases: ["BMWX5", "BMW X5", "X5"], exactToken: true },
    "X6": { aliases: ["BMWX6", "BMW X6", "X6"], exactToken: true },
    "X7": { aliases: ["BMWX7", "BMW X7", "X7"], exactToken: true }
  },
  hyundai: {
    "그랜저": { aliases: ["그랜저", "그랜저IG", "그랜저HG", "그랜저GN7"] },
    "아반떼": { aliases: ["아반떼", "아반떼CN7", "아반떼MD", "아반떼N", "더뉴아반떼", "더 뉴 아반떼"] },
    "쏘나타": { aliases: ["쏘나타", "소나타", "소나타DN8", "쏘나타DN8", "LF소나타", "YF소나타"] },
    "싼타페": { aliases: ["싼타페", "싼타페TM", "더뉴싼타페TM", "더 뉴 싼타페", "싼타페DM"] },
    "팰리세이드": { aliases: ["팰리세이드"] },
    "벨로스터": { aliases: ["벨로스터"] },
    "코나": { aliases: ["코나"] },
    "캐스퍼": { aliases: ["캐스퍼"] },
    "아이오닉5": { aliases: ["아이오닉5", "아이오닉 5"] }
  },
  kia: {
    "K5": { aliases: ["K5", "K5DL3", "K5 DL3", "K5하이브리드"] },
    "K7": { aliases: ["K7", "올뉴K7", "올 뉴 K7"] },
    "K8": { aliases: ["K8"] },
    "K9": { aliases: ["K9"] },
    "쏘렌토": { aliases: ["쏘렌토", "쏘렌토MQ4", "쏘렌토 MQ4", "올뉴쏘렌토", "올 뉴 쏘렌토"] },
    "스포티지": { aliases: ["스포티지", "스포티지NQ5", "스포티지 NQ5", "스포티지QL", "스포티지 QL", "스포티지R", "스포티지 R"] },
    "카니발": { aliases: ["카니발", "카니발4세대", "카니발 4세대", "카니발KA4", "카니발 KA4", "그랜드카니발", "그랜드 카니발"] },
    "셀토스": { aliases: ["셀토스"] },
    "스팅어": { aliases: ["스팅어"] },
    "EV9": { aliases: ["EV9"] }
  },
  chevrolet: {
    "말리부": { aliases: ["말리부", "올뉴말리부", "올 뉴 말리부"] },
    "트레일블레이저": { aliases: ["트레일블레이저", "트레일 블레이저"] },
    "올란도": { aliases: ["올란도"] },
    "스파크": { aliases: ["스파크"] }
  },
  renault: {
    "QM6": { aliases: ["QM6"] },
    "QM3": { aliases: ["QM3"] },
    "SM6": { aliases: ["SM6"] },
    "XM3": { aliases: ["XM3"] }
  },
  kgm: {
    "티볼리": { aliases: ["티볼리", "베리뉴티볼리", "베리뉴 티볼리"] }
  },
  mini: {
    "쿠퍼": { aliases: ["미니쿠퍼", "미니 쿠퍼", "쿠퍼"] }
  },
  volkswagen: {
    "티구안": { aliases: ["티구안", "폭스바겐티구안", "폭스바겐 티구안"] },
    "제타": { aliases: ["제타", "폭스바겐제타", "폭스바겐 제타"] },
    "골프": { aliases: ["골프", "골프7세대", "골프 7세대"] },
    "비틀": { aliases: ["비틀", "더비틀", "더 비틀"] },
    "아테온": { aliases: ["아테온"] }
  },
  landrover: {
    "디스커버리": { aliases: ["디스커버리5", "디스커버리 5", "디스커버리"] },
    "디스커버리 스포츠": { aliases: ["디스커버리스포츠", "디스커버리 스포츠"] },
    "레인지로버 이보크": { aliases: ["이보크", "레인지로버 이보크"] }
  },
  volvo: {
    "C30": { aliases: ["볼보C30", "볼보 C30", "C30"], exactToken: true },
    "S60": { aliases: ["볼보S60", "볼보 S60"], contextual: ["S60"] }
  },
  jeep: {
    "랭글러": { aliases: ["랭글러"] }
  },
  ford: {
    "익스플로러": { aliases: ["포드익스플로러", "포드 익스플로러", "익스플로러"] }
  }
};

function containsLoose(haystackLoose, needle) {
  const normalized = normalizeLoose(needle);
  return normalized.length >= 2 && haystackLoose.includes(normalized);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsExplicitKoreanTerm(text, needle) {
  const term = normalizeText(needle);

  if (!term || normalizeLoose(term).length < 2) {
    return false;
  }

  const pattern = escapeRegex(term).replace(/\s+/g, "\\s*");
  const suffix = "(?=$|[^가-힣A-Za-z0-9]|[은는이가을를에서으로로과와도만의])";
  const regex = new RegExp(`(^|[^가-힣A-Za-z0-9])${pattern}${suffix}`, "i");

  return regex.test(normalizeText(text));
}

function containsExplicitAlphaNumericTerm(text, needle) {
  const term = normalizeText(needle);

  if (!/^[A-Za-z0-9]+$/.test(term)) {
    return false;
  }

  const regex = new RegExp(`(^|[^A-Za-z0-9가-힣])${escapeRegex(term)}(?=$|[^A-Za-z0-9가-힣])`, "i");
  return regex.test(normalizeText(text));
}

function cleanVehicleAlias(alias) {
  return normalizeText(alias)
    .replace(/^BMW\s+/i, "")
    .replace(/^MINI\s+/i, "")
    .replace(/^미니\s+/, "")
    .replace(/^벤츠\s+/, "")
    .replace(/^아우디\s+/, "")
    .replace(/^폭스바겐\s+/, "")
    .replace(/^랜드로버\s+/, "")
    .replace(/^현대\s+/, "")
    .replace(/^기아\s+/, "");
}

function createAliasRecord(value, options = {}) {
  const text = normalizeText(value);
  if (normalizeLoose(text).length < 2) {
    return null;
  }

  return {
    value: text,
    requiresManufacturer: Boolean(options.requiresManufacturer),
    exactToken: Boolean(options.exactToken),
    source: options.source || "db"
  };
}

function addAliasRecord(records, seen, value, options = {}) {
  const record = createAliasRecord(value, options);
  if (!record) {
    return;
  }

  const key = `${normalizeLoose(record.value)}:${record.requiresManufacturer ? "ctx" : "free"}:${record.exactToken ? "token" : "loose"}`;
  if (!seen.has(key)) {
    seen.add(key);
    records.push(record);
  }
}

function getVehicleAliasRule(manufacturerId, vehicleName, displayName) {
  const rules = VEHICLE_ALIAS_RULES[manufacturerId] || {};
  const candidates = [vehicleName, displayName].map(normalizeText);
  const compactCandidates = candidates.map(normalizeLoose);

  return Object.entries(rules).find(([key]) => {
    const keyLoose = normalizeLoose(key);
    return compactCandidates.some((candidate) => candidate === keyLoose);
  })?.[1] || null;
}

function buildVehicleAliasRecords(page) {
  const seen = new Set();
  const aliases = [];
  const baseAliases = [
    page.name,
    page.sourceVehicleName,
    cleanVehicleAlias(page.name),
    cleanVehicleAlias(page.sourceVehicleName)
  ];

  baseAliases.forEach((alias) => addAliasRecord(aliases, seen, alias));

  const rule = getVehicleAliasRule(page.manufacturerId, page.sourceVehicleName || page.name, page.name);
  if (rule) {
    (rule.aliases || []).forEach((alias) => addAliasRecord(aliases, seen, alias, {
      source: "corpus",
      exactToken: Boolean(rule.exactToken)
    }));
    (rule.contextual || []).forEach((alias) => addAliasRecord(aliases, seen, alias, {
      source: "corpus-contextual",
      requiresManufacturer: true,
      exactToken: true
    }));
  }

  return aliases;
}

function buildManufacturerIndex(manufacturers) {
  return manufacturers.map((manufacturer) => {
    const aliases = new Set([manufacturer.name, manufacturer.id, ...(MANUFACTURER_ALIASES[manufacturer.id] || [])]);
    return {
      id: manufacturer.id,
      name: manufacturer.name,
      file: manufacturer.file,
      aliases: [...aliases].filter(Boolean)
    };
  });
}

function buildVehicleIndex(detailReport, manufacturers) {
  const manufacturerById = new Map(manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]));
  return (detailReport.vehiclePages || []).map((page) => {
    const manufacturer = manufacturerById.get(page.manufacturerId) || { name: page.manufacturerName };
    const aliases = buildVehicleAliasRecords(page);

    return {
      manufacturerId: page.manufacturerId,
      manufacturerName: manufacturer.name || page.manufacturerName,
      vehicleName: page.sourceVehicleName || page.name,
      displayName: page.name,
      urlPath: page.urlPath,
      aliases
    };
  }).sort((a, b) => Math.max(...b.aliases.map((alias) => normalizeLoose(alias.value).length)) - Math.max(...a.aliases.map((alias) => normalizeLoose(alias.value).length)));
}

function buildVehicleAliasCounts(vehicles) {
  const counts = new Map();

  vehicles.forEach((vehicle) => {
    vehicle.aliases.forEach((alias) => {
      const key = normalizeLoose(alias.value);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return counts;
}

function buildDetailIndex(detailReport) {
  return (detailReport.detailPages || []).map((page) => {
    const aliases = new Set([page.label, ...(page.sourceExamples || [])]);

    if (/^[A-Z][A-Z0-9]{1,5}$/i.test(page.slug)) {
      aliases.add(page.slug.toUpperCase());
    }

    return {
      manufacturerId: page.manufacturerId,
      manufacturerName: page.manufacturerName,
      vehicleName: page.sourceVehicleName || page.vehicleName,
      displayVehicleName: page.vehicleName,
      vehicleUrlPath: `/car-battery/${page.manufacturerId}/${page.vehicleSlug}.html`,
      label: page.label,
      slug: page.slug,
      urlPath: page.urlPath,
      aliases: [...aliases].filter((alias) => normalizeLoose(alias).length >= 2)
    };
  }).sort((a, b) => Math.max(...b.aliases.map((alias) => normalizeLoose(alias).length)) - Math.max(...a.aliases.map((alias) => normalizeLoose(alias).length)));
}

function getAreas(areaData) {
  const areas = areaData?.areas || {};
  return ["incheon", "seoul", "gyeonggi"].map((id) => areas[id]).filter(Boolean);
}

function stripAdministrativeSuffix(value) {
  const text = normalizeText(value);
  return text.length > 2 ? text.replace(/(특별시|광역시|특례시|시|구)$/u, "") : text;
}

function stripNeighborhoodSuffix(value) {
  const text = normalizeText(value);
  return text.length > 2 ? text.replace(/(동|가)$/u, "") : text;
}

function addLocationAlias(aliases, seen, value, options = {}) {
  const text = normalizeText(value);
  if (normalizeLoose(text).length < 2) {
    return;
  }

  const key = `${normalizeLoose(text)}:${options.short ? "short" : "full"}`;
  if (!seen.has(key)) {
    seen.add(key);
    aliases.push({
      value: text,
      short: Boolean(options.short)
    });
  }
}

function buildAreaIndex(areaData) {
  const areas = getAreas(areaData);
  const areaItems = [];
  const regionItems = [];
  const neighborhoodItems = [];
  const neighborhoodCounts = new Map();
  const neighborhoodAliasCounts = new Map();

  areas.forEach((area) => {
    areaItems.push({
      areaId: area.id,
      areaName: area.name,
      areaSlug: area.slug,
      label: area.name,
      urlPath: `/area/${area.slug}/`,
      aliases: [area.name, area.fullName].filter(Boolean)
    });

    area.regions.forEach((region) => {
      const regionAliasSeen = new Set();
      const regionAliases = [];
      [region.name, region.shortName, region.fullName, `${area.name} ${region.name}`, stripAdministrativeSuffix(region.name)]
        .filter(Boolean)
        .forEach((alias) => addLocationAlias(regionAliases, regionAliasSeen, alias, {
          short: alias === stripAdministrativeSuffix(region.name)
        }));

      regionItems.push({
        areaId: area.id,
        areaName: area.name,
        areaSlug: area.slug,
        regionId: region.id,
        regionName: region.name,
        label: area.id === "gyeonggi" ? `${area.name} ${region.name}` : `${area.name} ${region.name}`,
        urlPath: `/area/${area.slug}/${region.id}.html`,
        aliases: regionAliases
      });

      region.neighborhoods.forEach((neighborhood) => {
        neighborhoodCounts.set(neighborhood.name, (neighborhoodCounts.get(neighborhood.name) || 0) + 1);
        const neighborhoodAliasSeen = new Set();
        const neighborhoodAliases = [];
        [
          neighborhood.name,
          neighborhood.legalName,
          `${region.name} ${neighborhood.name}`,
          `${area.name} ${region.name} ${neighborhood.name}`,
          stripNeighborhoodSuffix(neighborhood.name)
        ].filter(Boolean).forEach((alias) => addLocationAlias(neighborhoodAliases, neighborhoodAliasSeen, alias, {
          short: alias === stripNeighborhoodSuffix(neighborhood.name)
        }));

        neighborhoodAliases.forEach((alias) => {
          const key = normalizeLoose(alias.value);
          neighborhoodAliasCounts.set(key, (neighborhoodAliasCounts.get(key) || 0) + 1);
        });

        neighborhoodItems.push({
          areaId: area.id,
          areaName: area.name,
          areaSlug: area.slug,
          regionId: region.id,
          regionName: region.name,
          neighborhoodName: neighborhood.name,
          neighborhoodSlug: neighborhood.slug,
          legalName: neighborhood.legalName,
          label: `${area.name} ${region.name} ${neighborhood.name}`,
          urlPath: `/area/${area.slug}/${region.id}/${neighborhood.slug}.html`,
          aliases: neighborhoodAliases
        });
      });
    });
  });

  return {
    areas: areaItems,
    regions: regionItems,
    neighborhoods: neighborhoodItems,
    neighborhoodCounts,
    neighborhoodAliasCounts
  };
}

function collectBatteryModels(manufacturers) {
  const models = new Set();

  manufacturers.forEach((manufacturer) => {
    const filePath = path.join(DATA_DIR, manufacturer.file);
    if (!fs.existsSync(filePath)) {
      return;
    }

    readJson(filePath, []).forEach((row) => {
      ["defaultBattery", "upgradeBattery"].forEach((field) => {
        const value = normalizeText(row[field]);
        for (const match of value.matchAll(/(?:AGM|DIN|DF|EFB)\s*-?\s*[0-9]{2,3}[A-Z]{0,3}/gi)) {
          models.add(normalizeBatteryModel(match[0]));
        }
      });
    });
  });

  return [...models].sort((a, b) => b.length - a.length || a.localeCompare(b, "en"));
}

function normalizeBatteryModel(value) {
  return normalizeText(value).toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
}

export function createBlogCaseIndex() {
  const manufacturers = buildManufacturerIndex(readJson(MANUFACTURERS_FILE, []));
  const detailReport = readJson(VEHICLE_DETAIL_GROUPS_FILE, { vehiclePages: [], detailPages: [] });
  const areaData = readJson(SERVICE_AREAS_FILE, { areas: {} });
  const vehicles = buildVehicleIndex(detailReport, manufacturers);

  return {
    manufacturers,
    vehicles,
    vehicleAliasCounts: buildVehicleAliasCounts(vehicles),
    details: buildDetailIndex(detailReport),
    area: buildAreaIndex(areaData),
    batteryModels: collectBatteryModels(manufacturers)
  };
}

function matchManufacturers(textLoose, index) {
  return index.manufacturers
    .filter((manufacturer) => manufacturer.aliases.some((alias) => containsLoose(textLoose, alias)))
    .map(({ id, name }) => ({ id, name }));
}

function containsExplicitLooseTerm(text, needle) {
  const term = normalizeText(needle);
  const looseTerm = normalizeLoose(term);

  if (!looseTerm || looseTerm.length < 2) {
    return false;
  }

  if (/^[A-Za-z0-9]+$/.test(term)) {
    const pattern = escapeRegex(term).replace(/\s+/g, "\\s*");
    const regex = new RegExp(`(^|[^A-Za-z0-9가-힣])${pattern}(?=$|[^A-Za-z0-9가-힣]|[가-힣])`, "i");
    return regex.test(normalizeText(text));
  }

  return containsExplicitKoreanTerm(text, term) || normalizeLoose(text).includes(looseTerm);
}

function vehicleAliasMatches(text, textLoose, aliasRecord, hasManufacturer) {
  if (!containsLoose(textLoose, aliasRecord.value)) {
    return false;
  }

  if (aliasRecord.requiresManufacturer && !hasManufacturer) {
    return false;
  }

  const looseAlias = normalizeLoose(aliasRecord.value);
  if (aliasRecord.exactToken) {
    return hasManufacturer || containsExplicitLooseTerm(text, aliasRecord.value);
  }

  if (/^[a-z0-9]{1,2}$/.test(looseAlias) && !hasManufacturer) {
    return containsExplicitAlphaNumericTerm(text, aliasRecord.value);
  }

  return true;
}

function matchVehicles(text, textLoose, manufacturerMatches, index) {
  const manufacturerIds = new Set(manufacturerMatches.map((item) => item.id));
  const matched = [];

  index.vehicles.forEach((vehicle) => {
    const hasManufacturer = manufacturerIds.has(vehicle.manufacturerId);
    const explicitFullAlias = vehicle.aliases.some((alias) => normalizeLoose(alias.value).includes(normalizeLoose(vehicle.manufacturerName)));
    const matchedAlias = vehicle.aliases.find((alias) => {
      if (!vehicleAliasMatches(text, textLoose, alias, hasManufacturer)) {
        return false;
      }

      if (manufacturerIds.size && !hasManufacturer) {
        return false;
      }

      const looseAlias = normalizeLoose(alias.value);
      if (alias.exactToken && (hasManufacturer || containsExplicitLooseTerm(text, alias.value))) {
        return true;
      }

      if (/^[a-z0-9]{1,2}$/.test(looseAlias) && !hasManufacturer) {
        return (index.vehicleAliasCounts.get(looseAlias) || 0) === 1 && containsExplicitAlphaNumericTerm(text, alias.value);
      }

      return hasManufacturer || explicitFullAlias || alias.source === "corpus" || looseAlias.length >= 3;
    });

    if (!matchedAlias) {
      return;
    }

    if (matched.some((item) => item.urlPath === vehicle.urlPath)) {
      return;
    }

    matched.push({
      manufacturerId: vehicle.manufacturerId,
      manufacturerName: vehicle.manufacturerName,
      vehicleName: vehicle.vehicleName,
      displayName: vehicle.displayName,
      urlPath: vehicle.urlPath,
      matchedAlias: matchedAlias.value,
      specificity: "vehicle"
    });
  });

  return matched;
}

function matchDetails(textLoose, vehicleMatches, index) {
  const vehiclePaths = new Set(vehicleMatches.map((vehicle) => vehicle.urlPath));
  const matched = [];

  index.details.forEach((detail) => {
    if (!vehiclePaths.has(detail.vehicleUrlPath)) {
      return;
    }

    const matchedAlias = detail.aliases.find((alias) => containsLoose(textLoose, alias));
    if (!matchedAlias) {
      return;
    }

    if (matched.some((item) => item.urlPath === detail.urlPath)) {
      return;
    }

    matched.push({
      manufacturerId: detail.manufacturerId,
      manufacturerName: detail.manufacturerName,
      vehicleName: detail.vehicleName,
      displayVehicleName: detail.displayVehicleName,
      label: detail.label,
      slug: detail.slug,
      urlPath: detail.urlPath,
      vehicleUrlPath: detail.vehicleUrlPath,
      matchedAlias
    });
  });

  return matched;
}

function findGenericServiceAreaMentions(text, index) {
  const normalized = normalizeText(text);
  const genericMatches = GENERIC_SERVICE_AREA_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(normalized);
  });

  if (!genericMatches) {
    return [];
  }

  return index.area.areas
    .filter((area) => area.aliases.some((alias) => containsExplicitKoreanTerm(normalized, alias)))
    .map(({ areaId, areaName, label, urlPath }) => ({
      areaId,
      areaName,
      label,
      urlPath,
      context: "generic-service-area"
    }));
}

function removeGenericServiceAreaText(text) {
  return GENERIC_SERVICE_AREA_PATTERNS.reduce((result, pattern) => {
    pattern.lastIndex = 0;
    return result.replace(pattern, " ");
  }, normalizeText(text));
}

function hasWorkLocationContext(text, start, length) {
  const normalized = normalizeText(text);
  const left = Math.max(0, start - 32);
  const right = Math.min(normalized.length, start + length + 48);
  const window = normalized.slice(left, right);

  return WORK_LOCATION_TERMS.some((term) => normalizeLoose(window).includes(normalizeLoose(term)));
}

function findLocationAlias(text, alias) {
  const normalized = normalizeText(text);
  const pattern = escapeRegex(normalizeText(alias)).replace(/\s+/g, "\\s*");
  const regex = new RegExp(`(^|[^가-힣A-Za-z0-9])(${pattern})(?=$|[^가-힣A-Za-z0-9]|방문|출장|배터리|밧데리|교체|가격|비용|장착|완료|에서|으로|로|은|는|이|가|을|를|의|도|만)`, "gi");
  const matches = [];

  for (const match of normalized.matchAll(regex)) {
    matches.push({
      index: (match.index || 0) + match[1].length,
      text: match[2]
    });
  }

  return matches;
}

function mapArea(area) {
  return {
    areaId: area.areaId,
    areaName: area.areaName,
    label: area.label || area.areaName,
    urlPath: area.urlPath
  };
}

function mapRegion(region, matchedAlias = "") {
  return {
    areaId: region.areaId,
    areaName: region.areaName,
    regionId: region.regionId,
    regionName: region.regionName,
    label: region.label || `${region.areaName} ${region.regionName}`,
    urlPath: region.urlPath,
    matchedAlias
  };
}

function mapNeighborhood(neighborhood, matchedAlias = "") {
  return {
    areaId: neighborhood.areaId,
    areaName: neighborhood.areaName,
    regionId: neighborhood.regionId,
    regionName: neighborhood.regionName,
    name: neighborhood.neighborhoodName,
    legalName: neighborhood.legalName,
    label: neighborhood.label,
    urlPath: neighborhood.urlPath,
    matchedAlias
  };
}

function dedupeByPath(items) {
  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    if (item?.urlPath && !seen.has(item.urlPath)) {
      seen.add(item.urlPath);
      result.push(item);
    }
  });

  return result;
}

function findRegionMatches(text, index) {
  const candidates = [];
  const workText = removeGenericServiceAreaText(text);

  index.area.regions.forEach((region) => {
    const matchedAlias = region.aliases.find((alias) => {
      const matches = findLocationAlias(workText, alias.value);
      if (!matches.length) {
        return false;
      }

      return matches.some((match) => hasWorkLocationContext(workText, match.index, match.text.length));
    });

    if (matchedAlias) {
      candidates.push(mapRegion(region, matchedAlias.value));
    }
  });

  return dedupeByPath(candidates);
}

function findNeighborhoodMatches(text, regionMatches, index) {
  const workText = removeGenericServiceAreaText(text);
  const regionKeys = new Set(regionMatches.map((region) => `${region.areaId}:${region.regionId}`));
  const matched = [];

  index.area.neighborhoods.forEach((neighborhood) => {
    const matchedAlias = neighborhood.aliases.find((alias) => {
      const matches = findLocationAlias(workText, alias.value);
      if (!matches.length) {
        return false;
      }

      const aliasDuplicateCount = index.area.neighborhoodAliasCounts.get(normalizeLoose(alias.value)) || 0;
      const hasParentRegion = regionKeys.has(`${neighborhood.areaId}:${neighborhood.regionId}`);

      if (regionKeys.size && !hasParentRegion) {
        return false;
      }

      if (aliasDuplicateCount > 1 && !hasParentRegion) {
        return false;
      }

      return matches.some((match) => hasWorkLocationContext(workText, match.index, match.text.length));
    });

    if (matchedAlias) {
      matched.push(mapNeighborhood(neighborhood, matchedAlias.value));
    }
  });

  return dedupeByPath(matched);
}

function propagateActualAreas(regionMatches, neighborhoodMatches, index) {
  const areaById = new Map();
  [...regionMatches, ...neighborhoodMatches].forEach((item) => {
    const area = index.area.areas.find((candidate) => candidate.areaId === item.areaId);
    if (area && !areaById.has(area.areaId)) {
      areaById.set(area.areaId, mapArea(area));
    }
  });

  return [...areaById.values()];
}

function propagateActualRegions(regionMatches, neighborhoodMatches, index) {
  const regionByKey = new Map(regionMatches.map((region) => [`${region.areaId}:${region.regionId}`, region]));

  neighborhoodMatches.forEach((neighborhood) => {
    const key = `${neighborhood.areaId}:${neighborhood.regionId}`;
    if (!regionByKey.has(key)) {
      const region = index.area.regions.find((candidate) => (
        candidate.areaId === neighborhood.areaId && candidate.regionId === neighborhood.regionId
      ));

      if (region) {
        regionByKey.set(key, mapRegion(region, neighborhood.matchedAlias));
      }
    }
  });

  return [...regionByKey.values()];
}

function buildActualWorkLocation(areas, regions, neighborhoods) {
  const neighborhood = neighborhoods[0];
  if (neighborhood) {
    return {
      level: "neighborhood",
      areaId: neighborhood.areaId,
      areaName: neighborhood.areaName,
      regionId: neighborhood.regionId,
      regionName: neighborhood.regionName,
      neighborhoodName: neighborhood.name,
      label: neighborhood.label,
      urlPath: neighborhood.urlPath
    };
  }

  const region = regions[0];
  if (region) {
    return {
      level: "region",
      areaId: region.areaId,
      areaName: region.areaName,
      regionId: region.regionId,
      regionName: region.regionName,
      label: region.label,
      urlPath: region.urlPath
    };
  }

  const area = areas[0];
  if (area) {
    return {
      level: "area",
      areaId: area.areaId,
      areaName: area.areaName,
      label: area.label,
      urlPath: area.urlPath
    };
  }

  return null;
}

function matchActualLocations(text, index) {
  const mentionedServiceAreas = findGenericServiceAreaMentions(text, index);
  const initialRegions = findRegionMatches(text, index);
  const neighborhoods = findNeighborhoodMatches(text, initialRegions, index);
  const regions = propagateActualRegions(initialRegions, neighborhoods, index);
  const areas = propagateActualAreas(regions, neighborhoods, index);

  return {
    areas,
    regions,
    neighborhoods,
    actualWorkLocation: buildActualWorkLocation(areas, regions, neighborhoods),
    mentionedServiceAreas
  };
}

function matchBatteryModels(text, index) {
  const found = new Set();
  const known = new Set(index.batteryModels);

  for (const match of text.matchAll(/(?:AGM|DIN|DF|EFB)\s*-?\s*[0-9]{2,3}[A-Z]{0,3}/gi)) {
    const model = normalizeBatteryModel(match[0]);
    if (known.has(model)) {
      found.add(model);
    }
  }

  const textLoose = normalizeLoose(text);
  index.batteryModels.forEach((model) => {
    if (containsLoose(textLoose, model)) {
      found.add(model);
    }
  });

  return [...found].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

function matchSymptoms(textLoose) {
  return SYMPTOM_TERMS.filter((term) => containsLoose(textLoose, term));
}

function buildMatchedPages(facts) {
  const vehicles = (facts.vehicles || []).map((item) => item.urlPath);
  const details = (facts.detailModels || []).map((item) => item.urlPath);
  const manufacturers = [...new Set((facts.manufacturers || []).map((item) => `/car-battery/${item.id}.html`))];
  const areas = (facts.areas || []).map((item) => item.urlPath);
  const regions = (facts.regions || []).map((item) => item.urlPath);
  const neighborhoods = (facts.neighborhoods || []).map((item) => item.urlPath);
  const batteries = new Set();

  (facts.batteryModels || []).forEach((model) => {
    if (model.startsWith("AGM")) {
      batteries.add("/battery/agm/");
      batteries.add("/battery/agm/price.html");
      batteries.add(`/battery/agm/capacity/${model.toLowerCase()}.html`);
    }
  });

  if ((facts.batteryModels || []).length || (facts.symptoms || []).length) {
    ["/battery/", "/battery/car-battery.html", "/battery/replacement.html", "/battery/price.html", "/battery/mobile-replacement.html"].forEach((urlPath) => batteries.add(urlPath));
  }

  return {
    vehicles,
    details,
    manufacturers,
    areas,
    regions,
    neighborhoods,
    batteries: [...batteries]
  };
}

function mergeInferredManufacturers(explicitManufacturers, vehicles, details, index) {
  const byId = new Map(explicitManufacturers.map((manufacturer) => [manufacturer.id, manufacturer]));
  const manufacturerById = new Map(index.manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]));

  [...vehicles, ...details].forEach((item) => {
    if (!item.manufacturerId || byId.has(item.manufacturerId)) {
      return;
    }

    const manufacturer = manufacturerById.get(item.manufacturerId);
    byId.set(item.manufacturerId, {
      id: item.manufacturerId,
      name: manufacturer?.name || item.manufacturerName,
      inferredFromVehicle: true
    });
  });

  return [...byId.values()];
}

function applyVehicleSpecificity(vehicles, detailModels) {
  const detailVehiclePaths = new Set(detailModels.map((detail) => detail.vehicleUrlPath));

  return vehicles.map((vehicle) => ({
    ...vehicle,
    specificity: detailVehiclePaths.has(vehicle.urlPath) ? "detail" : "vehicle"
  }));
}

export function extractFactsFromPost(post, index = createBlogCaseIndex()) {
  const text = normalizeText([post.title, post.sourceExcerpt, post.tags].filter(Boolean).join(" "));
  const title = normalizeText(post.title);
  const textLoose = normalizeLoose(text);
  const explicitManufacturers = matchManufacturers(textLoose, index);
  const vehicles = matchVehicles(text, textLoose, explicitManufacturers, index);
  const detailModels = matchDetails(textLoose, vehicles, index);
  const vehiclesWithSpecificity = applyVehicleSpecificity(vehicles, detailModels);
  const manufacturers = mergeInferredManufacturers(explicitManufacturers, vehiclesWithSpecificity, detailModels, index);
  const {
    areas,
    regions,
    neighborhoods,
    actualWorkLocation,
    mentionedServiceAreas
  } = matchActualLocations(title, index);
  const batteryModels = matchBatteryModels(text, index);
  const symptoms = matchSymptoms(textLoose);
  const facts = {
    manufacturer: manufacturers[0]?.name || null,
    manufacturers,
    vehicle: vehicles[0]?.displayName || null,
    vehicles: vehiclesWithSpecificity,
    detailModels,
    vehicleHierarchy: vehiclesWithSpecificity.map((vehicle) => ({
      manufacturerId: vehicle.manufacturerId,
      manufacturerName: vehicle.manufacturerName,
      vehicleName: vehicle.vehicleName,
      displayName: vehicle.displayName,
      urlPath: vehicle.urlPath,
      specificity: vehicle.specificity
    })),
    actualWorkLocation,
    mentionedServiceAreas,
    areas,
    regions,
    neighborhoods,
    batteryModels,
    symptoms
  };

  facts.matchedPages = buildMatchedPages(facts);
  return facts;
}

function buildLocationLabel(facts) {
  const neighborhood = facts.neighborhoods?.[0];
  if (neighborhood) {
    return `${neighborhood.regionName} ${neighborhood.name}`;
  }

  const region = facts.regions?.[0];
  if (region) {
    return region.label || `${region.areaName} ${region.regionName}`;
  }

  const area = facts.areas?.[0];
  return area?.label || "";
}

function buildVehicleLabel(facts) {
  const detail = facts.detailModels?.[0];
  if (detail) {
    return `${detail.displayVehicleName || detail.vehicleName} ${detail.label}`;
  }

  const vehicle = facts.vehicles?.[0];
  return vehicle?.displayName || "";
}

export function buildSafeSummary(post, facts) {
  const location = buildLocationLabel(facts);
  const vehicle = buildVehicleLabel(facts);
  const battery = facts.batteryModels?.[0] || "";
  const hasReplacement = facts.symptoms?.some((item) => normalizeLoose(item) === normalizeLoose("교체"));
  const action = hasReplacement ? "배터리 교체" : "배터리 관련";
  const pieces = [location, vehicle, battery].filter(Boolean);

  if (pieces.length) {
    const prefix = location ? `${location}에서 ` : "";
    const rest = [vehicle, battery, action].filter(Boolean).join(" ");
    return truncateText(`${prefix}${rest} 실제 작업 사례입니다.`, 120);
  }

  return truncateText("일등밧데리 네이버 블로그에 공개된 자동차배터리 실제 작업 사례입니다.", 120);
}

function comparePosts(a, b) {
  const dateCompare = normalizeText(b.publishedAt).localeCompare(normalizeText(a.publishedAt));
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return normalizeText(b.id).localeCompare(normalizeText(a.id), "en", { numeric: true });
}

function withScore(posts, scoreFn, limit = 50) {
  return posts
    .map((post) => ({ post, score: scoreFn(post) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || comparePosts(a.post, b.post))
    .slice(0, limit)
    .map(({ post, score }) => ({
      ...post,
      matchConfidence: {
        ...(post.matchConfidence || {}),
        renderScore: score
      }
    }));
}

export function getBlogCasesForPage(posts, context, limit = 50) {
  const list = Array.isArray(posts) ? posts : [];

  return withScore(list, (post) => {
    const facts = post.facts || {};
    const pages = facts.matchedPages || {};
    const canonicalPath = context.canonicalPath;

    if (context.type === "vehicle-detail") {
      if ((pages.details || []).includes(canonicalPath)) return 100;
      if ((facts.vehicles || []).some((vehicle) => vehicle.urlPath === context.vehiclePath)) return 62;
      return 0;
    }

    if (context.type === "vehicle") {
      if ((pages.vehicles || []).includes(canonicalPath)) return 90;
      if ((facts.detailModels || []).some((detail) => detail.vehicleUrlPath === canonicalPath)) return 86;
      return 0;
    }

    if (context.type === "manufacturer") {
      if ((facts.vehicles || []).some((vehicle) => vehicle.manufacturerId === context.manufacturerId)) return 58;
      if ((facts.manufacturers || []).some((manufacturer) => manufacturer.id === context.manufacturerId)) return 52;
      return 0;
    }

    if (context.type === "vehicle-root") {
      return (facts.vehicles || []).length ? 42 : 0;
    }

    if (context.type === "neighborhood") {
      return (pages.neighborhoods || []).includes(canonicalPath) ? 100 : 0;
    }

    if (context.type === "region") {
      if ((pages.regions || []).includes(canonicalPath)) return 86;
      if ((facts.neighborhoods || []).some((item) => item.areaId === context.areaId && item.regionId === context.regionId)) return 82;
      return 0;
    }

    if (context.type === "area") {
      if ((pages.areas || []).includes(canonicalPath)) return 70;
      if ((facts.regions || []).some((item) => item.areaId === context.areaId)) return 66;
      if ((facts.neighborhoods || []).some((item) => item.areaId === context.areaId)) return 64;
      return 0;
    }

    if (context.type === "area-root") {
      return (facts.areas || []).length || (facts.regions || []).length || (facts.neighborhoods || []).length ? 42 : 0;
    }

    if (context.type === "battery-capacity") {
      return (facts.batteryModels || []).includes(context.capacity) ? 100 : 0;
    }

    if (context.type === "battery-topic") {
      if ((pages.batteries || []).includes(canonicalPath)) return 80;
      if (context.topicId === "delkor" || context.topicId === "delkorAgm") {
        return normalizeLoose(`${post.title} ${post.sourceExcerpt} ${post.tags}`).includes("델코") ? 78 : 0;
      }
      if (context.topicId === "agm" || context.topicId === "agmPrice" || context.topicId === "vartaAgm") {
        return (facts.batteryModels || []).some((model) => model.startsWith("AGM")) ? 76 : 0;
      }
      return (facts.batteryModels || []).length || (facts.symptoms || []).length ? 48 : 0;
    }

    return 0;
  }, limit);
}

export function getBlogCasesForVehicleDetailGroups(posts, context, limit = 50) {
  const list = Array.isArray(posts) ? posts : [];
  const exact = withScore(list, (post) => {
    const pages = post.facts?.matchedPages || {};
    return (pages.details || []).includes(context.canonicalPath) ? 100 : 0;
  }, limit);
  const exactIds = new Set(exact.map((post) => post.id));
  const related = withScore(list.filter((post) => !exactIds.has(post.id)), (post) => {
    const facts = post.facts || {};
    const hasVehicle = (facts.vehicles || []).some((vehicle) => (
      vehicle.urlPath === context.vehiclePath && vehicle.specificity !== "detail"
    ));
    const hasDetailForSameVehicle = (facts.detailModels || []).some((detail) => detail.vehicleUrlPath === context.vehiclePath);

    return hasVehicle && !hasDetailForSameVehicle ? 62 : 0;
  }, limit);

  return { exact, related };
}

export function pageExists(urlPath) {
  return fs.existsSync(urlPathToFilePath(urlPath));
}
