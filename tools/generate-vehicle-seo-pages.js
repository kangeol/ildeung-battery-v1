import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const SEO_DATA_DIR = path.join(ROOT_DIR, "seo-data");
const OUTPUT_DIR = path.join(ROOT_DIR, "car-battery");
const CSS_FILE = "css/vehicle-seo.css";
const PRIORITY_FILE = path.join(SEO_DATA_DIR, "vehicle-priority.json");
const DETAIL_GROUPS_FILE = path.join(SEO_DATA_DIR, "vehicle-detail-groups.json");
const MANUFACTURERS_FILE = path.join(DATA_DIR, "manufacturers.json");
const SITEMAP_FILE = path.join(ROOT_DIR, "sitemap.xml");

const SITE_ORIGIN = "https://battery1.co.kr";
const STORE_URL = "https://smartstore.naver.com/battery1";
const STANDARD_BATTERY_URL = "https://smartstore.naver.com/battery1/products/414050800";
const AGM_BATTERY_URL = "https://smartstore.naver.com/battery1/products/575288571";
const TODAY = new Date().toISOString().slice(0, 10);
const VEHICLE_IMAGE_ROOT = "/assets/seo/vehicle";
const IMPORT_MANUFACTURER_IDS = new Set([
  "audi",
  "benz",
  "bmw",
  "ford",
  "jeep",
  "landrover",
  "mini",
  "volkswagen",
  "volvo"
]);

const VEHICLE_SLUG_OVERRIDES = {
  "그랜저": "grandeur",
  "아반떼": "avante",
  "싼타페": "santafe",
  "쏘나타": "sonata",
  "팰리세이드": "palisade",
  "투싼": "tucson",
  "맥스크루즈": "maxcruz",
  "베뉴": "venue",
  "베라크루즈": "veracruz",
  "베르나": "verna",
  "벨로스터": "veloster",
  "스타렉스": "starex",
  "스타리아": "staria",
  "아슬란": "aslan",
  "아이오닉5": "ioniq5",
  "아이오닉6": "ioniq6",
  "아이오닉9": "ioniq9",
  "에쿠스": "equus",
  "엑센트": "accent",
  "제네시스": "genesis",
  "캐스퍼": "casper",
  "코나": "kona",
  "테라칸": "terracan",
  "카니발": "carnival",
  "쏘렌토": "sorento",
  "레이": "ray",
  "스포티지": "sportage",
  "모닝": "morning",
  "로체": "lotze",
  "셀토스": "seltos",
  "스토닉": "stonic",
  "스팅어": "stinger",
  "쎄라토": "cerato",
  "쏘울": "soul",
  "오피러스": "opirus",
  "카렌스": "carens",
  "텔루라이드": "telluride",
  "포르테": "forte",
  "프라이드": "pride",
  "스파크": "spark",
  "트랙스": "trax",
  "말리부": "malibu",
  "트레일블레이저": "trailblazer",
  "올란도": "orlando",
  "크루즈": "cruze",
  "마티즈": "matiz",
  "아베오": "aveo",
  "알페온": "alpheon",
  "임팔라": "impala",
  "카마로": "camaro",
  "캡티바": "captiva",
  "콜로라도": "colorado",
  "토스카": "tosca",
  "트래버스": "traverse",
  "타호": "tahoe",
  "렉스턴": "rexton",
  "로디우스": "rodius",
  "무쏘": "musso",
  "액티언": "actyon",
  "체어맨": "chairman",
  "카이런": "kyron",
  "코란도": "korando",
  "토레스": "torres",
  "티볼리": "tivoli",
  "그랑 콜레오스": "grand-koleos",
  "마스터": "master",
  "아르카나": "arkana",
  "캡처": "captur",
  "클리오": "clio",
  "필랑트": "fluence",
  "레인저": "ranger",
  "머스탱": "mustang",
  "몬데오": "mondeo",
  "브롱코": "bronco",
  "익스플로러": "explorer",
  "토러스": "taurus",
  "퓨전": "fusion",
  "랭글러": "wrangler",
  "레니게이드": "renegade",
  "체로키": "cherokee",
  "컴패스": "compass",
  "디스커버리 스포츠": "discovery-sport",
  "디스커버리": "discovery",
  "레인지로버 벨라": "range-rover-velar",
  "레인지로버 스포츠": "range-rover-sport",
  "레인지로버 이보크": "range-rover-evoque",
  "레인지로버": "range-rover",
  "프리랜더": "freelander",
  "쿠퍼": "cooper",
  "쿠퍼 컨버터블": "cooper-convertible",
  "쿠페": "coupe",
  "로드스터": "roadster",
  "클럽맨": "clubman",
  "페이스맨": "paceman",
  "골프": "golf",
  "비틀": "beetle",
  "시로코": "scirocco",
  "아테온": "arteon",
  "제타": "jetta",
  "티구안": "tiguan",
  "티록": "t-roc",
  "파사트": "passat",
  "폴로": "polo",
  "그란투리스모 (GT)": "gran-turismo-gt"
};

const SLUG_TOKEN_REPLACEMENTS = {
  "디 올 뉴": "the-all-new",
  "어메이징 뉴": "amazing-new",
  "더 넥스트": "the-next",
  "리얼 뉴": "real-new",
  "뉴 라이즈": "new-rise",
  "뉴 임프레션": "new-impression",
  "뉴 제너레이션": "new-generation",
  "뉴 아레나": "new-arena",
  "뉴 스타일": "new-style",
  "더 브릴리언트": "the-brilliant",
  "더 프라임": "the-prime",
  "뉴 럭셔리": "new-luxury",
  "더 럭셔리": "the-luxury",
  "더 뉴": "the-new",
  "올 뉴": "all-new",
  "구형": "old",
  "그랜드": "grand",
  "노바": "nova",
  "플래티넘": "platinum",
  "프리미어": "premier",
  "마이스터": "meister",
  "크로스오버": "crossover",
  "이노베이션": "innovation",
  "어드밴스": "advance",
  "부스터": "booster",
  "어반": "urban",
  "클래스": "class",
  "시리즈": "series",
  "그란투리스모": "gran-turismo",
  "디스커버리": "discovery",
  "레인지로버": "range-rover",
  "스포츠": "sport",
  "벨라": "velar",
  "이보크": "evoque"
};

const KNOWN_GENERATION_CODES = new Set([
  "AD", "MD", "HD", "XD", "CN7", "DN8", "LF", "YF", "NF", "GN7", "IG", "HG", "TG",
  "MX5", "TM", "DM", "CM", "NX4", "TL", "JM", "SX2", "LX3", "DH", "PD", "JS",
  "JA", "DL3", "JF", "TF", "MG", "KA4", "YP", "VQ", "MQ4", "UM", "XM", "NQ5",
  "QL", "SL", "KM", "RG3", "RS4", "Q300", "Q260", "F70", "F40", "F20", "F10",
  "F30", "F15", "F48", "F25", "F26", "F45", "F46", "F12", "F13", "G20", "G30",
  "G60", "G05", "G07", "G01", "G02", "G11", "G12", "E90", "E70", "E60", "E82",
  "E84", "E89", "W206", "W205", "W204", "W214", "W213", "W212", "W211", "W223",
  "W222", "W221", "C117", "C118", "C257", "W218", "X253", "X254", "H247", "W177",
  "W176", "C9", "C8", "C7", "C6", "B10", "B9", "B8", "F5", "D5", "4K", "4M",
  "80A", "8Y", "FY", "5N", "BW", "MQB", "CK"
]);

const NON_GENERATION_TOKENS = new Set([
  "AGM", "DIN", "DF", "EFB", "LPG", "HEV", "PHEV", "EV", "TDI", "TSI", "GDI",
  "MPI", "CRDI", "CVVL", "DCT", "AT", "MT", "CVT", "AWD", "FWD", "RWD", "XDRIVE",
  "4WD", "2WD", "TURBO", "GT", "GTI", "GTS", "AMG"
]);

const MEANINGFUL_GENERATION_KEYWORDS = [
  "디 올 뉴",
  "더 뉴",
  "올 뉴",
  "더 넥스트",
  "어메이징 뉴",
  "리얼 뉴",
  "뉴 라이즈",
  "뉴 제너레이션",
  "뉴 임프레션",
  "뉴 아레나",
  "뉴 스타일",
  "구형",
  "그랜드",
  "프리미어",
  "마이스터",
  "노바",
  "플래티넘",
  "더 브릴리언트",
  "더 프라임",
  "뉴 럭셔리",
  "더 럭셔리",
  "크로스오버",
  "스포츠",
  "아머",
  "어반",
  "부스터",
  "이노베이션",
  "어드밴스",
  "뷰티풀",
  "유로",
  "뉴 클래식",
  "쿠페",
  "컨버터블",
  "로드스터",
  "2세대",
  "3세대",
  "4세대",
  " R"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeJson(filePath, content) {
  writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeMatch(value) {
  return normalizeText(value).replace(/\s+/g, " ").toLowerCase();
}

function compactText(value) {
  return normalizeText(value).toUpperCase().replace(/[^0-9A-Z가-힣]/g, "");
}

function pageDepthPrefix(depth) {
  return "../".repeat(depth);
}

function formatRowsLabel(count) {
  return `${count.toLocaleString("ko-KR")}개 세부모델`;
}

function formatManufacturerVehicleLabel(manufacturerName, vehicleName) {
  const maker = normalizeText(manufacturerName);
  const model = normalizeText(vehicleName);

  if (!maker || !model) {
    return model || maker;
  }

  return normalizeMatch(model).startsWith(normalizeMatch(maker)) ? model : `${maker} ${model}`;
}

function stripManufacturerName(manufacturerName, vehicleName) {
  const maker = normalizeText(manufacturerName);
  const vehicle = normalizeText(vehicleName);

  if (!maker || !vehicle) {
    return vehicle || maker;
  }

  return normalizeMatch(vehicle).startsWith(normalizeMatch(maker))
    ? vehicle.slice(maker.length).trim()
    : vehicle;
}

function getDetailPageLabel(manufacturer, vehicle, group) {
  const detailLabel = getDisplayDetailLabel(group.label);
  if (group.type === "code") {
    return `${vehicle.name} ${detailLabel}`;
  }

  const modelOnly = stripManufacturerName(manufacturer.name, vehicle.name);
  if (compactText(modelOnly) && compactText(detailLabel).includes(compactText(modelOnly))) {
    return IMPORT_MANUFACTURER_IDS.has(manufacturer.id)
      ? formatManufacturerVehicleLabel(manufacturer.name, detailLabel)
      : detailLabel;
  }

  return `${vehicle.name} ${detailLabel}`;
}

function getDisplayVehicleName(manufacturer, vehicleName, priorityConfig) {
  if (priorityConfig?.name) {
    return priorityConfig.name;
  }

  const model = normalizeText(vehicleName);
  if (IMPORT_MANUFACTURER_IDS.has(manufacturer.id)) {
    return formatManufacturerVehicleLabel(manufacturer.name, model);
  }

  return model;
}

function hasActualBatteryValue(value) {
  return !isUnconfirmedBattery(value);
}

function shortHash(value) {
  let hash = 5381;
  const text = normalizeText(value);

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(index);
    hash >>>= 0;
  }

  return hash.toString(36);
}

function slugifyVehicleName(vehicleName) {
  const exact = VEHICLE_SLUG_OVERRIDES[normalizeText(vehicleName)];
  if (exact) {
    return exact;
  }

  let slug = normalizeText(vehicleName).toLowerCase();
  Object.entries(SLUG_TOKEN_REPLACEMENTS)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([from, to]) => {
      slug = slug.replaceAll(from.toLowerCase(), to);
    });

  slug = slug
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || `vehicle-${shortHash(vehicleName)}`;
}

function slugifyDetailName(detailName) {
  const code = normalizeText(detailName).toLowerCase();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) {
    return code;
  }

  let slug = normalizeText(detailName).toLowerCase();
  Object.entries({ ...VEHICLE_SLUG_OVERRIDES, ...SLUG_TOKEN_REPLACEMENTS })
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([from, to]) => {
      slug = slug.replaceAll(from.toLowerCase(), to);
    });

  slug = slug
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || `detail-${shortHash(detailName)}`;
}

function isReviewPending(status) {
  const text = normalizeText(status);
  return text !== "" && !text.includes("완료");
}

function isUnconfirmedBattery(value) {
  const text = normalizeText(value);
  if (!text) return true;
  return /(확인|규격|순정|미정|예정|대기|검수|고객센터|문의)/.test(text);
}

function renderDefaultBattery(value) {
  const text = normalizeText(value);

  if (isUnconfirmedBattery(text)) {
    return `<span class="battery-uncertain">차량 확인 필요</span>`;
  }

  return `<strong>${escapeHtml(text)}</strong>`;
}

function renderUpgradeBattery(value) {
  const text = normalizeText(value);

  if (!text) {
    return `<span class="battery-empty">—</span>`;
  }

  if (isUnconfirmedBattery(text)) {
    return `<span class="battery-uncertain">차량 확인 필요</span>`;
  }

  return `<strong>${escapeHtml(text)}</strong>`;
}

function hasBatteryCheckDisplay(row) {
  const defaultNeedsCheck = isUnconfirmedBattery(row.defaultBattery);
  const upgradeText = normalizeText(row.upgradeBattery);
  const upgradeNeedsCheck = upgradeText !== "" && isUnconfirmedBattery(upgradeText);

  return defaultNeedsCheck || upgradeNeedsCheck;
}

function hasDefaultBatteryCheck(rows) {
  return rows.some((row) => isUnconfirmedBattery(row.defaultBattery));
}

function rowKey(row) {
  return [
    row.year,
    row.fuel,
    row.detailModel,
    row.defaultBattery,
    row.upgradeBattery,
    row.status
  ].map((value) => normalizeText(value)).join("\u0001");
}

function uniqueRows(rows) {
  const seen = new Set();
  const result = [];

  rows.forEach((row) => {
    const key = rowKey(row);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  });

  return result;
}

function getVehicleImagePath(manufacturerId, vehicleSlug) {
  return `${VEHICLE_IMAGE_ROOT}/${manufacturerId}/${vehicleSlug}.png`;
}

function getDetailImagePath(manufacturerId, vehicleSlug, detailSlug) {
  return `${VEHICLE_IMAGE_ROOT}/${manufacturerId}/${vehicleSlug}/${detailSlug}.png`;
}

function getDisplayDetailLabel(label) {
  return normalizeText(label).toUpperCase() === label ? label : normalizeText(label);
}

function isVehicleToken(token, vehicleName) {
  const tokenCompact = compactText(token);
  const vehicleCompact = compactText(vehicleName);
  if (!tokenCompact || !vehicleCompact) {
    return false;
  }

  return tokenCompact.length <= 3 && vehicleCompact.includes(tokenCompact);
}

function isGenerationCodeToken(token, vehicleName, inParentheses = false) {
  const upper = normalizeText(token).replace(/_/g, "").toUpperCase();
  if (!upper || upper.length < 2) {
    return false;
  }

  if (NON_GENERATION_TOKENS.has(upper) || isVehicleToken(upper, vehicleName)) {
    return false;
  }

  if (KNOWN_GENERATION_CODES.has(upper)) {
    return true;
  }

  if (/^[WCRXHQ]\d{3}[A-Z]?$/.test(upper)) {
    return true;
  }

  if (/^[FGEU]\d{2}[A-Z]?$/.test(upper)) {
    return true;
  }

  if (/^[A-Z]{2}\d[A-Z]?$/.test(upper)) {
    return true;
  }

  if (/^[A-Z]\d{1,2}$/.test(upper)) {
    return true;
  }

  if (inParentheses && /^(\d{1,3}[A-Z]|[A-Z]{1,3}\d{1,3}[A-Z]?)$/.test(upper)) {
    return true;
  }

  return false;
}

function extractGenerationCode(detailModel, vehicleName) {
  const text = normalizeText(detailModel);
  const parentheticalValues = [...text.matchAll(/\(([^)]{1,40})\)/g)].map((match) => match[1]);

  for (const value of parentheticalValues) {
    const tokens = value.match(/[A-Za-z0-9]+/g) || [];
    for (const token of tokens) {
      if (isGenerationCodeToken(token, vehicleName, true)) {
        return normalizeText(token).replace(/_/g, "").toUpperCase();
      }
    }
  }

  const tokens = text.match(/[A-Za-z0-9]+/g) || [];
  for (const token of tokens) {
    if (isGenerationCodeToken(token, vehicleName, false)) {
      return normalizeText(token).replace(/_/g, "").toUpperCase();
    }
  }

  return null;
}

function removeFuelAndDriveTokens(value) {
  return normalizeText(value)
    .replace(/\b(2WD|4WD|AWD|FWD|RWD|HEV|PHEV|EV)\b/gi, " ")
    .replace(/하이브리드|일렉트릭|전기|가솔린|디젤|LPG|LPi|터보/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeaningfulGenerationName(detailModel, vehicleName) {
  const withoutParentheses = normalizeText(detailModel).replace(/\([^)]*\)/g, " ");
  const cleaned = removeFuelAndDriveTokens(withoutParentheses);

  if (!cleaned || compactText(cleaned) === compactText(vehicleName)) {
    return null;
  }

  const hasMeaningfulKeyword = MEANINGFUL_GENERATION_KEYWORDS.some((keyword) => {
    if (keyword === " R") {
      return /\sR\b/i.test(cleaned);
    }
    return cleaned.includes(keyword);
  });

  return hasMeaningfulKeyword ? cleaned : null;
}

function extractDetailGroup(row) {
  const detailModel = normalizeText(row.detailModel);
  const vehicleName = normalizeText(row.vehicle);

  if (!detailModel) {
    return { group: null, reason: "세부모델 값 없음" };
  }

  const code = extractGenerationCode(detailModel, vehicleName);
  if (code) {
    return {
      group: {
        label: code,
        slug: slugifyDetailName(code),
        type: "code",
        source: detailModel
      },
      reason: null
    };
  }

  const generationName = extractMeaningfulGenerationName(detailModel, vehicleName);
  if (generationName) {
    return {
      group: {
        label: generationName,
        slug: slugifyDetailName(generationName),
        type: "name",
        source: detailModel
      },
      reason: null
    };
  }

  return { group: null, reason: "명확한 세대 코드/세대명 없음" };
}

function makeUniqueSlug(baseSlug, label, usedSlugs) {
  if (!usedSlugs.has(baseSlug)) {
    return baseSlug;
  }

  const hashed = `${baseSlug}-${shortHash(label).slice(0, 5)}`;
  if (!usedSlugs.has(hashed)) {
    return hashed;
  }

  let index = 2;
  while (usedSlugs.has(`${hashed}-${index}`)) {
    index += 1;
  }
  return `${hashed}-${index}`;
}

function buildDetailGroupsForVehicle({ manufacturer, vehicle, rows }) {
  const groupMap = new Map();
  const usedSlugs = new Set();
  const ambiguousMap = new Map();

  rows.forEach((row, rowIndex) => {
    const { group, reason } = extractDetailGroup(row);

    if (!group) {
      const detailModel = normalizeText(row.detailModel) || "세부모델 값 없음";
      const key = `${detailModel}\u0001${reason}`;
      if (!ambiguousMap.has(key)) {
        ambiguousMap.set(key, {
          manufacturerId: manufacturer.id,
          manufacturerName: manufacturer.name,
          vehicleName: vehicle.name,
          sourceVehicleName: vehicle.sourceVehicleName,
          detailModel,
          reason,
          rowCount: 0
        });
      }
      ambiguousMap.get(key).rowCount += 1;
      return;
    }

    let detailGroup = groupMap.get(group.slug);
    if (!detailGroup) {
      const uniqueSlug = makeUniqueSlug(group.slug, `${vehicle.name} ${group.label}`, usedSlugs);
      usedSlugs.add(uniqueSlug);
      detailGroup = {
        manufacturerId: manufacturer.id,
        manufacturerName: manufacturer.name,
        vehicleName: vehicle.name,
        sourceVehicleName: vehicle.sourceVehicleName,
        vehicleSlug: vehicle.slug,
        label: group.label,
        slug: uniqueSlug,
        type: group.type,
        sourceExamples: [group.source],
        rows: [],
        order: rowIndex
      };
      groupMap.set(group.slug, detailGroup);
    } else if (!detailGroup.sourceExamples.includes(group.source)) {
      detailGroup.sourceExamples.push(group.source);
    }

    detailGroup.rows.push(row);
  });

  const groups = [...groupMap.values()].sort((a, b) => a.order - b.order || compareText(a.label, b.label));
  const ambiguous = [...ambiguousMap.values()].sort((a, b) => compareText(a.detailModel, b.detailModel));

  return { groups, ambiguous };
}

function buildDetailLinkMap(vehicleSlug, detailGroups) {
  const links = new Map();

  detailGroups.forEach((group) => {
    uniqueRows(group.rows).forEach((row) => {
      links.set(rowKey(row), `${vehicleSlug}/${group.slug}.html`);
    });
  });

  return links;
}

function renderHeader(prefix) {
  return `
  <header class="seo-topbar">
    <a class="seo-home" href="${prefix}index.html" aria-label="홈으로 이동">‹ 홈</a>
    <a class="seo-logo" href="${prefix}index.html" aria-label="일등밧데리 홈">
      <img src="${prefix}assets/logos/ildeung-logo.png" alt="일등밧데리">
    </a>
    <a class="seo-call" href="tel:16449141" aria-label="일등밧데리 전화 상담">1644-9141</a>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="footer" aria-label="사이트 정보">
    <div class="footer-inner">
      <strong class="footer-brand">일등밧데리</strong>
      <p class="footer-line">대표번호 <a href="tel:16449141">1644-9141</a></p>
      <p class="footer-line">서울 · 경기 · 인천 출장배터리 교체</p>
      <p class="footer-line">자동차배터리 · AGM배터리 · 출장배터리교체 상담</p>
      <p class="footer-copy">Copyright © 2026 일등밧데리. All rights reserved.</p>
    </div>
  </footer>`;
}

function renderBreadcrumb(items) {
  return `
      <nav class="breadcrumbs" aria-label="현재 위치">
        ${items.map((item, index) => {
          const label = escapeHtml(item.label);
          const content = item.href ? `<a href="${item.href}">${label}</a>` : `<span>${label}</span>`;
          const separator = index < items.length - 1 ? `<span aria-hidden="true">&gt;</span>` : "";
          return `${content}${separator}`;
        }).join("\n        ")}
      </nav>`;
}

function buildBreadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${SITE_ORIGIN}${item.path}`
    }))
  };
}

function buildFaqJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };
}

function renderStructuredData(items) {
  if (!items?.length) {
    return "";
  }

  return items.map((item) => `  <script type="application/ld+json">${JSON.stringify(item)}</script>`).join("\n");
}

function renderShell({ depth, title, description, canonicalPath, content, imagePath, structuredData = [] }) {
  const prefix = pageDepthPrefix(depth);
  const canonical = `${SITE_ORIGIN}${canonicalPath}`;
  const imageMeta = imagePath ? `
  <meta property="og:image" content="${SITE_ORIGIN}${imagePath}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="800">
  <meta name="twitter:image" content="${SITE_ORIGIN}${imagePath}">` : "";
  const schema = renderStructuredData(structuredData);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="일등밧데리">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary_large_image">${imageMeta}
  <link rel="stylesheet" href="${prefix}${CSS_FILE}">
${schema}
</head>
<body>
${renderHeader(prefix)}
  <main class="page-shell">
${content}
  </main>
${renderFooter()}
</body>
</html>
`;
}

function renderTable(rows, { detailLinkByRowKey = new Map() } = {}) {
  const body = rows.map((row) => {
    const detailText = escapeHtml(row.detailModel || "확인 필요");
    const detailHref = detailLinkByRowKey.get(rowKey(row));
    const detailCell = detailHref
      ? `<a class="table-detail-link" href="${detailHref}">${detailText}</a>`
      : detailText;

    return `
              <tr>
                <td>${escapeHtml(row.year || "확인 필요")}</td>
                <td>${escapeHtml(row.fuel || "확인 필요")}</td>
                <td>${detailCell}</td>
                <td>${renderDefaultBattery(row.defaultBattery)}</td>
                <td>${renderUpgradeBattery(row.upgradeBattery)}</td>
              </tr>`;
  }).join("");
  const note = rows.some(hasBatteryCheckDisplay)
    ? `
      <p class="table-note">* 차량 확인 필요로 표시된 항목은 확정 규격이 아니므로 전문기사 상담을 권장합니다.</p>`
    : "";

  return `
      <div class="table-card">
        <div class="table-scroll">
          <table class="battery-table">
            <thead>
              <tr>
                <th>차량년식</th>
                <th>연료</th>
                <th>세부모델</th>
                <th>기본배터리</th>
                <th>업그레이드배터리</th>
              </tr>
            </thead>
            <tbody>${body}
            </tbody>
          </table>
        </div>
      </div>${note}`;
}

function renderPriceLinks() {
  return `
      <section class="section price-link-section" aria-labelledby="priceLinkTitle">
        <div class="section-heading">
          <p class="eyebrow">Price</p>
          <h2 id="priceLinkTitle">배터리 최저가 바로가기</h2>
          <p class="section-desc">차량에 맞는 배터리 타입을 확인한 뒤 현재 판매가격을 확인해 보세요.</p>
        </div>
        <div class="price-link-grid">
          <a class="price-link-card" href="${STANDARD_BATTERY_URL}" target="_blank" rel="noopener noreferrer">
            <span class="price-link-image">
              <img src="/assets/quick-links/standard-din.png" alt="일반타입 DIN 자동차배터리 가격 확인" loading="lazy" decoding="async">
            </span>
            <span class="price-link-text">
              <strong>일반타입 · DIN 배터리</strong>
              <span>현재 판매가격 확인</span>
            </span>
          </a>
          <a class="price-link-card" href="${AGM_BATTERY_URL}" target="_blank" rel="noopener noreferrer">
            <span class="price-link-image">
              <img src="/assets/quick-links/agm.png" alt="AGM 자동차배터리 가격 확인" loading="lazy" decoding="async">
            </span>
            <span class="price-link-text">
              <strong>AGM 배터리</strong>
              <span>현재 판매가격 확인</span>
            </span>
          </a>
        </div>
      </section>`;
}

function renderCta(prefix) {
  return `
      <section class="section">
        <div class="cta-card">
          <div>
            <p class="eyebrow">Contact</p>
            <h2>내 차에 맞는 배터리를 확인하세요</h2>
            <p>세부모델을 모르거나 표에 없는 조건은 전문기사 상담으로 확인하실 수 있습니다.</p>
          </div>
          <div class="button-row">
            <a class="btn primary" href="${prefix}search.html">내 차 배터리 직접 찾기</a>
            <a class="btn secondary" href="tel:16449141">1644-9141 전화상담</a>
            <a class="btn store" href="${STORE_URL}" target="_blank" rel="noopener noreferrer">배터리 최저가 바로가기</a>
          </div>
        </div>
      </section>`;
}

function getVehicleFaqs(vehicleName) {
  return [
    {
      question: `${vehicleName} 배터리 가격은 얼마인가요?`,
      answer: "배터리 가격은 적용 규격과 AGM 여부, 제품에 따라 달라질 수 있습니다. 위 세부모델별 규격을 확인한 후 일반타입 또는 AGM 배터리 최저가 바로가기에서 현재 판매가격을 확인해 주세요. 정확한 출장교체 비용은 1644-9141로 상담 가능합니다."
    },
    {
      question: `같은 ${vehicleName} 차량도 배터리가 다른가요?`,
      answer: "연식, 연료, 세부모델, 옵션에 따라 적용되는 자동차배터리 규격이 달라질 수 있습니다."
    },
    {
      question: "AGM 배터리 차량에 일반 배터리를 장착해도 되나요?",
      answer: "AGM 적용 차량은 차량 충전 제어 방식에 맞는 배터리 선택이 중요합니다. 교체 전 상담을 권장합니다."
    },
    {
      question: "세부모델을 모르면 어떻게 확인하나요?",
      answer: "차량 배터리 찾기 페이지에서 제조사, 차량명, 세부모델을 순서대로 선택하거나 고객센터로 문의해 주세요."
    },
    {
      question: "출장 교체 상담도 가능한가요?",
      answer: "서울, 경기, 인천 지역은 출장배터리 교체 상담이 가능하며, 차량 위치와 차종 확인 후 안내드립니다."
    }
  ];
}

function renderFaqCards(faqs, title) {
  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">FAQ</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="faq-grid">
          ${faqs.map((faq) => `
          <article class="faq-card">
            <h3>${escapeHtml(faq.question)}</h3>
            <p>${escapeHtml(faq.answer)}</p>
          </article>`).join("")}
        </div>
      </section>`;
}

function renderVehicleFaq(vehicleName) {
  return renderFaqCards(getVehicleFaqs(vehicleName), `${vehicleName} 배터리 자주 묻는 질문`);
}

function getDetailFaqs(vehicleName, detailLabel, rows) {
  const label = `${vehicleName} ${detailLabel}`;
  const hasAgm = rows.some((row) => /AGM/i.test(`${row.defaultBattery || ""} ${row.upgradeBattery || ""}`));

  return [
    {
      question: `${label} 배터리 가격은 얼마인가요?`,
      answer: "배터리 가격은 적용 규격, AGM 여부, 제품에 따라 달라집니다. 위 표에서 세부 조건별 규격을 확인한 뒤 일반타입 또는 AGM 배터리 최저가 바로가기에서 현재 판매가격을 확인해 주세요."
    },
    {
      question: `${label} 차량에 AGM 배터리가 적용되나요?`,
      answer: hasAgm
        ? "현재 DB 표에는 AGM 규격이 포함된 조건이 있습니다. 같은 세대라도 연식과 연료에 따라 달라질 수 있으므로 표의 세부 조건을 함께 확인해 주세요."
        : "AGM 적용 여부는 연식, 연료, 세부모델에 따라 달라질 수 있습니다. 표에 표시된 기본 배터리와 업그레이드 배터리를 기준으로 확인해 주세요."
    },
    {
      question: `${detailLabel} 세부모델도 연료에 따라 배터리가 다른가요?`,
      answer: "가솔린, 디젤, LPG, 하이브리드 등 연료와 차량 사양에 따라 배터리 규격이 달라질 수 있습니다."
    },
    {
      question: "배터리 규격을 정확히 모르면 어떻게 하나요?",
      answer: "차량 배터리 찾기에서 세부모델을 선택하거나 1644-9141로 문의하시면 차량 확인 후 안내받을 수 있습니다."
    },
    {
      question: "출장교체가 가능한가요?",
      answer: "서울, 경기, 인천 지역은 출장배터리 교체 상담이 가능하며, 차량 위치와 차종 확인 후 방문 일정을 안내드립니다."
    }
  ];
}

function renderDetailSiblings({ vehicle, detailGroups, currentSlug }) {
  if (detailGroups.length <= 1) {
    return "";
  }

  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">More Generations</p>
          <h2>${escapeHtml(vehicle.name)} 다른 세대 배터리 보기</h2>
        </div>
        <div class="detail-nav-grid">
          ${detailGroups.map((group) => {
            const label = escapeHtml(getDisplayDetailLabel(group.label));
            if (group.slug === currentSlug) {
              return `<span class="detail-nav-link active" aria-current="page">${label}</span>`;
            }

            return `<a class="detail-nav-link" href="${group.slug}.html">${label}</a>`;
          }).join("\n          ")}
        </div>
      </section>`;
}

function renderVehiclePage({ manufacturer, vehicle, rows, detailGroups }) {
  const prefix = pageDepthPrefix(2);
  const manufacturerVehicleLabel = formatManufacturerVehicleLabel(manufacturer.name, vehicle.name);
  const title = `${vehicle.name} 배터리 가격 및 규격 안내 | 자동차배터리 교체 | 일등밧데리`;
  const description = `${vehicle.name} 배터리 가격과 세부모델별 규격을 확인하세요. 연식·연료·세부모델별 기본 배터리와 업그레이드 배터리를 안내하며 일반 배터리와 AGM 배터리의 현재 판매가격도 확인할 수 있습니다.`;
  const canonicalPath = `/car-battery/${manufacturer.id}/${vehicle.slug}.html`;
  const imagePath = getVehicleImagePath(manufacturer.id, vehicle.slug);
  const manufacturerHub = `../${manufacturer.id}.html`;
  const unique = uniqueRows(rows);
  const heroImageAlt = `${manufacturerVehicleLabel} 배터리 가격 및 규격 안내 - 일등밧데리`;
  const checkNotice = hasDefaultBatteryCheck(unique)
    ? `
        <p class="vehicle-check-notice">해당 차량은 연식, 세부모델 및 차량 사양에 따라 적용 배터리가 달라질 수 있어 실차 확인이 필요합니다. 1644-9141로 문의하시면 차량 확인 후 정확한 배터리 규격과 교체 상담을 안내해드립니다.</p>`
    : "";
  const detailLinkMap = buildDetailLinkMap(vehicle.slug, detailGroups);
  const breadcrumbItems = [
    { label: "홈", href: "../../index.html", path: "/" },
    { label: "차량 배터리", href: "../index.html", path: "/car-battery/" },
    { label: manufacturer.name, href: manufacturerHub, path: `/car-battery/${manufacturer.id}.html` },
    { label: `${vehicle.name} 배터리 가격 및 규격`, path: canonicalPath }
  ];

  const content = `${renderBreadcrumb(breadcrumbItems)}
      <section class="hero-card vehicle-detail-hero">
        <p class="eyebrow">Vehicle Battery Price</p>
        <h1>${escapeHtml(vehicle.name)} 배터리 가격 및 규격 안내</h1>
        <div class="vehicle-hero-layout">
          <figure class="vehicle-seo-hero-image">
            <img src="${imagePath}" alt="${escapeHtml(heroImageAlt)}" loading="lazy" decoding="async">
          </figure>
          <div class="vehicle-hero-summary">
            <h2>${escapeHtml(vehicle.name)} 배터리 한눈에 확인</h2>
            <ul class="vehicle-check-list">
              <li>연식별 배터리 규격 확인</li>
              <li>가솔린·디젤·LPG 등 연료별 구분</li>
              <li>기본 / 업그레이드 배터리 안내</li>
              <li>AGM 적용 여부 확인</li>
              <li>배터리 현재 판매가격 확인</li>
            </ul>
            <p class="vehicle-help-copy">차량 세부모델을 모르시면 <a href="${prefix}search.html">차량 배터리 찾기</a>에서 확인해 주세요.</p>
            <div class="button-row">
              <a class="btn primary" href="${prefix}search.html">차량 배터리 찾기</a>
              <a class="btn secondary" href="tel:16449141">1644-9141 전화상담</a>
            </div>
          </div>
        </div>
        <p class="hero-desc">${escapeHtml(vehicle.name)} 차량은 연식, 연료, 세부모델에 따라 적용되는 자동차 배터리(밧데리) 규격이 달라질 수 있습니다. 아래 표에서 일등밧데리 차량 배터리 DB 기준의 기본 배터리와 업그레이드 배터리를 확인한 뒤 현재 판매가격은 최저가 바로가기에서 확인해 주세요.</p>
${checkNotice}
      </section>

      <section class="section" aria-labelledby="batteryTableTitle">
        <div class="section-heading">
          <p class="eyebrow">Battery Table</p>
          <h2 id="batteryTableTitle">세부모델별 배터리 표</h2>
          <p class="section-desc">${escapeHtml(manufacturerVehicleLabel)} ${formatRowsLabel(unique.length)} 기준으로 정리했습니다. 세대별 상세 페이지가 있는 세부모델은 링크로 바로 확인할 수 있습니다.</p>
        </div>
${renderTable(unique, { detailLinkByRowKey: detailLinkMap })}
      </section>
${renderPriceLinks()}
${renderCta(prefix)}
${renderVehicleFaq(vehicle.name)}`;

  return renderShell({
    depth: 2,
    title,
    description,
    canonicalPath,
    content,
    imagePath,
    structuredData: [buildBreadcrumbJsonLd(breadcrumbItems), buildFaqJsonLd(getVehicleFaqs(vehicle.name))]
  });
}

function renderDetailPage({ manufacturer, vehicle, group, detailGroups }) {
  const prefix = pageDepthPrefix(3);
  const detailLabel = getDisplayDetailLabel(group.label);
  const pageLabel = getDetailPageLabel(manufacturer, vehicle, group);
  const title = `${pageLabel} 배터리 가격 및 규격 안내 | 일등밧데리`;
  const description = `${pageLabel} 배터리 가격과 연식·연료별 규격을 확인하세요. 기본 배터리와 업그레이드 배터리를 DB 기준으로 안내하며 일반 배터리와 AGM 배터리의 현재 판매가격도 확인할 수 있습니다.`;
  const canonicalPath = `/car-battery/${manufacturer.id}/${vehicle.slug}/${group.slug}.html`;
  const imagePath = getDetailImagePath(manufacturer.id, vehicle.slug, group.slug);
  const unique = uniqueRows(group.rows);
  const imageAlt = `${formatManufacturerVehicleLabel(manufacturer.name, pageLabel)} 배터리 가격 및 규격 안내 - 일등밧데리`;
  const checkNotice = hasDefaultBatteryCheck(unique)
    ? `
        <p class="vehicle-check-notice">해당 차량은 연식, 세부모델 및 차량 사양에 따라 적용 배터리가 달라질 수 있어 실차 확인이 필요합니다. 1644-9141로 문의하시면 차량 확인 후 정확한 배터리 규격과 교체 상담을 안내해드립니다.</p>`
    : "";
  const breadcrumbItems = [
    { label: "홈", href: "../../../index.html", path: "/" },
    { label: "차량 배터리", href: "../../index.html", path: "/car-battery/" },
    { label: manufacturer.name, href: `../../${manufacturer.id}.html`, path: `/car-battery/${manufacturer.id}.html` },
    { label: `${vehicle.name} 배터리`, href: `../${vehicle.slug}.html`, path: `/car-battery/${manufacturer.id}/${vehicle.slug}.html` },
    { label: `${detailLabel} 배터리 가격 및 규격`, path: canonicalPath }
  ];
  const faqs = getDetailFaqs(vehicle.name, detailLabel, unique);

  const content = `${renderBreadcrumb(breadcrumbItems)}
      <section class="hero-card vehicle-detail-hero">
        <p class="eyebrow">Detail Battery Guide</p>
        <h1>${escapeHtml(pageLabel)} 배터리 가격 및 규격 안내</h1>
        <div class="vehicle-hero-layout">
          <figure class="vehicle-seo-hero-image">
            <img src="${imagePath}" alt="${escapeHtml(imageAlt)}" loading="lazy" decoding="async">
          </figure>
          <div class="vehicle-hero-summary">
            <h2>${escapeHtml(pageLabel)} 배터리 한눈에 확인</h2>
            <ul class="vehicle-check-list">
              <li>연식별 배터리 규격 확인</li>
              <li>연료별 기본 / 업그레이드 배터리 안내</li>
              <li>AGM 적용 여부 확인</li>
              <li>배터리 현재 판매가격 확인</li>
            </ul>
            <p class="vehicle-help-copy">차량 세부모델을 모르시면 <a href="${prefix}search.html">차량 배터리 찾기</a>에서 확인해 주세요.</p>
            <div class="button-row">
              <a class="btn primary" href="${prefix}search.html">차량 배터리 찾기</a>
              <a class="btn secondary" href="tel:16449141">1644-9141 전화상담</a>
            </div>
          </div>
        </div>
      </section>

      <section class="section direct-answer" aria-labelledby="directAnswerTitle">
        <div class="content-card">
          <p class="eyebrow">Direct Answer</p>
          <h2 id="directAnswerTitle">${escapeHtml(pageLabel)} 배터리는 어떤 규격을 사용하나요?</h2>
          <p>${escapeHtml(pageLabel)} 차량은 연식과 연료 및 차량 사양에 따라 적용 배터리가 달라질 수 있습니다. 아래 일등밧데리 차량 DB 기준 표에서 ${escapeHtml(detailLabel)} 세부 조건별 기본 배터리와 업그레이드 배터리를 확인할 수 있습니다.</p>
${checkNotice}
        </div>
      </section>

      <section class="section" aria-labelledby="detailTableTitle">
        <div class="section-heading">
          <p class="eyebrow">Battery Table</p>
          <h2 id="detailTableTitle">${escapeHtml(detailLabel)} 세부모델별 배터리 표</h2>
          <p class="section-desc">${escapeHtml(pageLabel)} ${formatRowsLabel(unique.length)} 기준으로 정리했습니다. 가격은 아래 최저가 바로가기에서 현재 판매가격을 확인해 주세요.</p>
        </div>
${renderTable(unique)}
      </section>
${renderPriceLinks()}
      <section class="section">
        <a class="parent-link-card" href="../${vehicle.slug}.html">
          <strong>${escapeHtml(vehicle.name)} 전체 배터리 가격 및 규격 보기 →</strong>
          <span>다른 세대와 세부모델 배터리 정보까지 함께 확인할 수 있습니다.</span>
        </a>
      </section>
${renderDetailSiblings({ vehicle, detailGroups, currentSlug: group.slug })}
${renderCta(prefix)}
${renderFaqCards(faqs, `${pageLabel} 배터리 자주 묻는 질문`)}`;

  return renderShell({
    depth: 3,
    title,
    description,
    canonicalPath,
    content,
    imagePath,
    structuredData: [buildBreadcrumbJsonLd(breadcrumbItems), buildFaqJsonLd(faqs)]
  });
}

function renderManufacturerHub({ manufacturer, vehiclePages, allRows }) {
  const prefix = pageDepthPrefix(1);
  const title = `${manufacturer.name} 자동차 배터리 가격 및 규격 안내 | 일등밧데리`;
  const description = `${manufacturer.name} 주요 차량의 자동차배터리 가격 및 규격을 확인하세요. 차량별 세부모델 기본 배터리와 업그레이드 배터리를 안내합니다.`;
  const canonicalPath = `/car-battery/${manufacturer.id}.html`;
  const vehicleCount = new Set(allRows.map((row) => normalizeText(row.vehicle)).filter(Boolean)).size;
  const links = vehiclePages.length
    ? vehiclePages.map((page) => `
          <a class="link-card" href="${manufacturer.id}/${page.slug}.html">
            <strong>${escapeHtml(page.name)} 배터리</strong>
            <span>${formatRowsLabel(page.rowCount)} 안내 보기</span>
          </a>`).join("")
    : `
          <div class="link-card">
            <strong>차량별 상세 페이지 준비 중</strong>
            <span>현재 우선순위 차량과 DB 차량명이 일치하지 않아 차량 배터리 찾기에서 확인해 주세요.</span>
          </div>`;

  const content = `${renderBreadcrumb([
    { label: "홈", href: "../index.html" },
    { label: "차량 배터리", href: "index.html" },
    { label: manufacturer.name }
  ])}
      <section class="hero-card">
        <p class="eyebrow">Manufacturer</p>
        <h1>${escapeHtml(manufacturer.name)} 자동차 배터리 가격 및 규격 안내</h1>
        <p class="hero-desc">${escapeHtml(manufacturer.name)} 차량은 연식과 세부모델에 따라 배터리 규격이 달라질 수 있습니다. 차량별 배터리 가격 및 규격 안내 페이지와 차량 배터리 찾기 기능을 함께 확인해 주세요.</p>
        <p class="notice">현재 DB 기준 ${vehicleCount.toLocaleString("ko-KR")}개 차량명, ${allRows.length.toLocaleString("ko-KR")}개 세부모델 데이터가 등록되어 있습니다.</p>
        <div class="button-row">
          <a class="btn primary" href="${prefix}search.html">차량 배터리 찾기</a>
          <a class="btn secondary" href="tel:16449141">1644-9141 전화상담</a>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Popular Vehicles</p>
          <h2>${escapeHtml(manufacturer.name)} 주요 차량 목록</h2>
        </div>
        <div class="popular-grid">${links}
        </div>
      </section>
${renderCta(prefix)}`;

  return renderShell({ depth: 1, title, description, canonicalPath, content });
}

function renderRootHub({ manufacturers, vehiclePages }) {
  const prefix = pageDepthPrefix(1);
  const title = "차량별 배터리 가격 및 규격 안내 | 일등밧데리";
  const description = "제조사와 차량명별 자동차배터리 가격 및 규격을 확인하세요. 세부모델별 기본 배터리와 업그레이드 배터리 안내를 제공합니다.";
  const canonicalPath = "/car-battery/";

  const manufacturerLinks = manufacturers.map((manufacturer) => `
          <a class="manufacturer-card" href="${manufacturer.id}.html">
            <strong>${escapeHtml(manufacturer.name)}</strong>
            <span>차량 ${manufacturer.pageCount.toLocaleString("ko-KR")}종 보기 →</span>
          </a>`).join("");

  const popularLinks = vehiclePages.map((page) => `
          <a class="link-card" href="${page.manufacturerId}/${page.slug}.html">
            <strong>${escapeHtml(page.name)} 배터리</strong>
            <span>${escapeHtml(page.manufacturerName)} · ${formatRowsLabel(page.rowCount)}</span>
          </a>`).join("");

  const content = `${renderBreadcrumb([
    { label: "홈", href: "../index.html" },
    { label: "차량 배터리" }
  ])}
      <section class="hero-card">
        <p class="eyebrow">Car Battery Guide</p>
        <h1>차량별 배터리 가격 및 규격 안내</h1>
        <p class="hero-desc">일등밧데리 차량 배터리 DB를 기준으로 제조사와 차량명별 기본 배터리, 업그레이드 배터리 정보를 정리했습니다. 실제 장착 규격은 연식, 연료, 세부모델에 따라 달라질 수 있으며 현재 판매가격은 최저가 바로가기에서 확인할 수 있습니다.</p>
        <div class="button-row">
          <a class="btn primary" href="${prefix}search.html">차량 배터리 찾기</a>
          <a class="btn secondary" href="tel:16449141">1644-9141 전화상담</a>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Brands</p>
          <h2>제조사별 바로가기</h2>
        </div>
        <div class="manufacturer-grid">${manufacturerLinks}
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Popular</p>
          <h2>많이 찾는 차량 배터리</h2>
        </div>
        <div class="popular-grid">${popularLinks}
        </div>
      </section>
${renderCta(prefix)}`;

  return renderShell({ depth: 1, title, description, canonicalPath, content });
}

function loadData() {
  const manufacturers = readJson(MANUFACTURERS_FILE);
  const priority = readJson(PRIORITY_FILE);
  const priorityLookups = buildPriorityLookups(priority);

  return { manufacturers, priority, priorityLookups };
}

function buildPriorityLookups(priority) {
  const manufacturerOrder = new Map();
  const vehicleByAlias = new Map();
  const vehicleOrder = new Map();

  priority.manufacturers.forEach((manufacturer, manufacturerIndex) => {
    manufacturerOrder.set(manufacturer.id, manufacturerIndex);

    const aliasMap = new Map();
    manufacturer.vehicles.forEach((vehicle, vehicleIndex) => {
      const aliases = new Set([vehicle.name, ...(vehicle.match || [])].map(normalizeMatch));
      aliases.forEach((alias) => {
        aliasMap.set(alias, { ...vehicle, priorityIndex: vehicleIndex });
      });
    });

    vehicleByAlias.set(manufacturer.id, aliasMap);
    vehicleOrder.set(manufacturer.id, manufacturer.vehicles.map((vehicle) => vehicle.slug));
  });

  return { manufacturerOrder, vehicleByAlias, vehicleOrder };
}

function getPriorityConfig(priorityLookups, manufacturerId, vehicleName) {
  return priorityLookups.vehicleByAlias.get(manufacturerId)?.get(normalizeMatch(vehicleName)) || null;
}

function compareText(a, b) {
  return normalizeText(a).localeCompare(normalizeText(b), "ko-KR", {
    numeric: true,
    sensitivity: "base"
  });
}

function sortManufacturers(manufacturers, priorityLookups) {
  return [...manufacturers].sort((a, b) => {
    const orderA = priorityLookups.manufacturerOrder.has(a.id)
      ? priorityLookups.manufacturerOrder.get(a.id)
      : Number.POSITIVE_INFINITY;
    const orderB = priorityLookups.manufacturerOrder.has(b.id)
      ? priorityLookups.manufacturerOrder.get(b.id)
      : Number.POSITIVE_INFINITY;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return compareText(a.name, b.name);
  });
}

function groupRowsByVehicle(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const vehicleName = normalizeText(row.vehicle);
    if (!vehicleName) {
      return;
    }

    if (!groups.has(vehicleName)) {
      groups.set(vehicleName, []);
    }

    groups.get(vehicleName).push(row);
  });

  return [...groups.entries()].map(([vehicleName, vehicleRows]) => ({
    vehicleName,
    rows: vehicleRows
  }));
}

function sortVehiclePages(vehiclePages) {
  return [...vehiclePages].sort((a, b) => {
    const priorityA = Number.isInteger(a.priorityIndex) ? a.priorityIndex : Number.POSITIVE_INFINITY;
    const priorityB = Number.isInteger(b.priorityIndex) ? b.priorityIndex : Number.POSITIVE_INFINITY;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return compareText(a.name, b.name);
  });
}

function buildVehicleConfig({ manufacturer, vehicleName, priorityConfig }) {
  return {
    name: getDisplayVehicleName(manufacturer, vehicleName, priorityConfig),
    slug: priorityConfig?.slug || slugifyVehicleName(vehicleName),
    sourceVehicleName: vehicleName,
    priorityIndex: priorityConfig?.priorityIndex
  };
}

function updateSitemap(generatedUrls) {
  const existing = fs.existsSync(SITEMAP_FILE) ? fs.readFileSync(SITEMAP_FILE, "utf8") : "";
  const keptBlocks = [...existing.matchAll(/<url>[\s\S]*?<\/url>/g)]
    .map((match) => match[0])
    .filter((block) => !block.includes(`${SITE_ORIGIN}/car-battery/`));

  const newBlocks = generatedUrls.map((item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${item.priority}</priority>
  </url>`);

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...keptBlocks, ...newBlocks].join("\n")}
</urlset>
`;

  fs.writeFileSync(SITEMAP_FILE, content, "utf8");
}

function generate() {
  console.log("Vehicle SEO Generate Start");
  console.log("");

  const { manufacturers, priorityLookups } = loadData();
  const generatedVehiclePages = [];
  const generatedDetailPages = [];
  const allAmbiguousGroups = [];
  const manufacturerSummaries = [];
  const skipped = [];
  const slugCollisions = [];
  const allPendingPages = [];
  const rawDetailValues = new Set();
  let totalRows = 0;
  let totalVehicleGroups = 0;
  let existingVehiclePageCount = 0;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  sortManufacturers(manufacturers, priorityLookups).forEach((manufacturerMeta) => {
    const dataFile = path.join(DATA_DIR, manufacturerMeta.file);
    if (!fs.existsSync(dataFile)) {
      skipped.push({
        manufacturer: manufacturerMeta.name,
        vehicle: "제조사 전체",
        reason: `data/${manufacturerMeta.file} 파일이 없습니다.`
      });
      return;
    }

    const rows = readJson(dataFile);
    rows.forEach((row) => {
      const detailValue = normalizeText(row.detailModel);
      if (detailValue) {
        rawDetailValues.add(`${normalizeText(row.manufacturer)}\u0001${normalizeText(row.vehicle)}\u0001${detailValue}`);
      }
    });

    totalRows += rows.length;
    const manufacturer = {
      id: manufacturerMeta.id,
      name: manufacturerMeta.name,
      file: manufacturerMeta.file
    };
    const groupedVehicles = groupRowsByVehicle(rows);
    const slugRegistry = new Map();
    const vehiclePages = [];
    totalVehicleGroups += groupedVehicles.length;

    groupedVehicles.forEach(({ vehicleName, rows: matchedRows }) => {
      const priorityConfig = getPriorityConfig(priorityLookups, manufacturer.id, vehicleName);
      const vehicleConfig = buildVehicleConfig({ manufacturer, vehicleName, priorityConfig });
      const existingSlugOwner = slugRegistry.get(vehicleConfig.slug);

      if (existingSlugOwner && existingSlugOwner !== vehicleName) {
        slugCollisions.push({
          manufacturer: manufacturer.name,
          slug: vehicleConfig.slug,
          vehicles: [existingSlugOwner, vehicleName]
        });
        skipped.push({
          manufacturer: manufacturer.name,
          vehicle: vehicleName,
          reason: `slug 충돌: ${vehicleConfig.slug}`
        });
        return;
      }

      slugRegistry.set(vehicleConfig.slug, vehicleName);

      const { groups: detailGroups, ambiguous } = buildDetailGroupsForVehicle({
        manufacturer,
        vehicle: vehicleConfig,
        rows: matchedRows
      });
      allAmbiguousGroups.push(...ambiguous);

      const unique = uniqueRows(matchedRows);
      const isAllPending = matchedRows.every((row) => isReviewPending(row.status));
      const vehiclePage = {
        manufacturerId: manufacturer.id,
        manufacturerName: manufacturer.name,
        name: vehicleConfig.name,
        sourceVehicleName: vehicleConfig.sourceVehicleName,
        slug: vehicleConfig.slug,
        priorityIndex: vehicleConfig.priorityIndex,
        isPriority: Number.isInteger(vehicleConfig.priorityIndex),
        rowCount: unique.length,
        imagePath: getVehicleImagePath(manufacturer.id, vehicleConfig.slug),
        urlPath: `/car-battery/${manufacturer.id}/${vehicleConfig.slug}.html`,
        loc: `${SITE_ORIGIN}/car-battery/${manufacturer.id}/${vehicleConfig.slug}.html`
      };

      writeFile(
        path.join(OUTPUT_DIR, manufacturer.id, `${vehicleConfig.slug}.html`),
        renderVehiclePage({ manufacturer, vehicle: vehicleConfig, rows: matchedRows, detailGroups })
      );

      detailGroups.forEach((group) => {
        const detailPage = {
          manufacturerId: manufacturer.id,
          manufacturerName: manufacturer.name,
          vehicleName: vehicleConfig.name,
          sourceVehicleName: vehicleConfig.sourceVehicleName,
          vehicleSlug: vehicleConfig.slug,
          label: getDisplayDetailLabel(group.label),
          slug: group.slug,
          type: group.type,
          rowCount: uniqueRows(group.rows).length,
          sourceExamples: group.sourceExamples,
          imagePath: getDetailImagePath(manufacturer.id, vehicleConfig.slug, group.slug),
          urlPath: `/car-battery/${manufacturer.id}/${vehicleConfig.slug}/${group.slug}.html`,
          loc: `${SITE_ORIGIN}/car-battery/${manufacturer.id}/${vehicleConfig.slug}/${group.slug}.html`
        };

        writeFile(
          path.join(OUTPUT_DIR, manufacturer.id, vehicleConfig.slug, `${group.slug}.html`),
          renderDetailPage({ manufacturer, vehicle: vehicleConfig, group, detailGroups })
        );

        generatedDetailPages.push(detailPage);
      });

      vehiclePages.push(vehiclePage);
      generatedVehiclePages.push(vehiclePage);

      if (vehiclePage.isPriority) {
        existingVehiclePageCount += 1;
      }

      if (isAllPending) {
        allPendingPages.push({
          manufacturer: manufacturer.name,
          vehicle: vehicleConfig.name
        });
      }
    });

    const sortedVehiclePages = sortVehiclePages(vehiclePages);

    writeFile(
      path.join(OUTPUT_DIR, `${manufacturer.id}.html`),
      renderManufacturerHub({ manufacturer, vehiclePages: sortedVehiclePages, allRows: rows })
    );

    manufacturerSummaries.push({
      id: manufacturer.id,
      name: manufacturer.name,
      pageCount: sortedVehiclePages.length,
      loc: `${SITE_ORIGIN}/car-battery/${manufacturer.id}.html`
    });
  });

  const popularVehiclePages = sortVehiclePages(generatedVehiclePages.filter((page) => page.isPriority));

  writeFile(
    path.join(OUTPUT_DIR, "index.html"),
    renderRootHub({ manufacturers: manufacturerSummaries, vehiclePages: popularVehiclePages })
  );

  const sitemapUrls = [
    { loc: `${SITE_ORIGIN}/car-battery/`, priority: "0.9" },
    ...manufacturerSummaries.map((manufacturer) => ({ loc: manufacturer.loc, priority: "0.8" })),
    ...generatedVehiclePages.map((page) => ({ loc: page.loc, priority: "0.8" })),
    ...generatedDetailPages.map((page) => ({ loc: page.loc, priority: "0.75" }))
  ];

  updateSitemap(sitemapUrls);

  const detailReport = {
    generatedAt: TODAY,
    stats: {
      dbRows: totalRows,
      manufacturerCount: manufacturerSummaries.length,
      vehicleParentPages: generatedVehiclePages.length,
      detailModelRawValues: rawDetailValues.size,
      confidentDetailGroups: generatedDetailPages.length,
      ambiguousDetailGroups: allAmbiguousGroups.length,
      detailPagesCreated: generatedDetailPages.length,
      slugCollisions: slugCollisions.length
    },
    vehiclePages: generatedVehiclePages.sort((a, b) => compareText(a.urlPath, b.urlPath)),
    detailPages: generatedDetailPages.sort((a, b) => compareText(a.urlPath, b.urlPath)),
    ambiguousGroups: allAmbiguousGroups
  };
  writeJson(DETAIL_GROUPS_FILE, detailReport);

  console.log(`DB rows: ${totalRows}`);
  console.log(`DB manufacturers: ${manufacturerSummaries.length}`);
  console.log(`DB manufacturer+vehicle groups: ${totalVehicleGroups}`);
  console.log(`Hub pages: ${manufacturerSummaries.length + 1}`);
  console.log(`Vehicle parent SEO pages: ${generatedVehiclePages.length}`);
  console.log(`Existing priority vehicle pages: ${existingVehiclePageCount}`);
  console.log(`Detail model raw values: ${rawDetailValues.size}`);
  console.log(`Confident detail groups: ${generatedDetailPages.length}`);
  console.log(`Ambiguous detail groups: ${allAmbiguousGroups.length}`);
  console.log(`All-pending vehicle pages: ${allPendingPages.length}`);
  console.log(`Sitemap URLs added: ${sitemapUrls.length}`);
  console.log(`Slug collisions: ${slugCollisions.length}`);
  console.log("");

  if (skipped.length) {
    console.log("Skipped vehicles:");
    skipped.forEach((item) => {
      console.log(`- ${item.manufacturer} / ${item.vehicle}: ${item.reason}`);
    });
  } else {
    console.log("Skipped vehicles: none");
  }

  if (allPendingPages.length) {
    console.log("");
    console.log("All-pending vehicles:");
    allPendingPages.forEach((item) => {
      console.log(`- ${item.manufacturer} / ${item.vehicle}`);
    });
  }

  if (allAmbiguousGroups.length) {
    console.log("");
    console.log("Ambiguous detail groups:");
    allAmbiguousGroups.slice(0, 80).forEach((item) => {
      console.log(`- ${item.manufacturerName} / ${item.vehicleName} / ${item.detailModel}: ${item.reason}`);
    });
    if (allAmbiguousGroups.length > 80) {
      console.log(`...and ${allAmbiguousGroups.length - 80} more`);
    }
  }

  if (slugCollisions.length) {
    console.log("");
    console.log("Slug collisions:");
    slugCollisions.forEach((item) => {
      console.log(`- ${item.manufacturer} / ${item.slug}: ${item.vehicles.join(", ")}`);
    });
  }

  console.log("");
  console.log("Vehicle SEO Generate Complete");
}

generate();
