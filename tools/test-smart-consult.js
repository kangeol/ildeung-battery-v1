import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGM_STORE_URL,
  DIN_STORE_URL,
  PHONE_HREF,
  applyDetectedFilters,
  batteryStoreType,
  buildSafeAnswer,
  classifyQuestion,
  createInitialState,
  normalizeText,
  parseYearRange,
  resolveConsultation,
  searchVehicles,
  yearMatches
} from "../js/smart-consult-core.js";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));

const manufacturers = json("data/manufacturers.json");
const records = manufacturers.flatMap((manufacturer) => (
  json(`data/${manufacturer.file}`).map((record) => ({
    ...record,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.name
  }))
));

let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function onlyMatch(query, manufacturerId, vehicle) {
  const result = searchVehicles(query, records);
  equal(result.matches.length, 1, `${query}: one vehicle family expected`);
  equal(result.matches[0].manufacturerId, manufacturerId, `${query}: manufacturer mismatch`);
  equal(result.matches[0].vehicle, vehicle, `${query}: vehicle mismatch`);
  return result;
}

equal(records.length, 917, "canonical vehicle row count changed unexpectedly");
check(records.every((record) => record.status === "완료"), "all current vehicle rows must be complete");

equal(normalizeText(" BMW 520d "), "bmw520d", "spacing normalization failed");
equal(normalizeText("벤츠 E-클래스"), "벤츠e클래스", "punctuation normalization failed");
equal(normalizeText("<img src=x onerror=alert(1)>").includes("<"), false, "markup must be stripped during normalization");
assertions += 1;

equal(parseYearRange("17~23년").start, 2017, "two-digit start year failed");
equal(parseYearRange("17~23년").end, 2023, "two-digit end year failed");
check(yearMatches("17~23년", 2019), "year range should include 2019");
equal(yearMatches("17~23년", 2024), false, "year range should exclude 2024");

onlyMatch("BMW 520d", "bmw", "5시리즈");
onlyMatch("bmw520d", "bmw", "5시리즈");
onlyMatch("BMW 5시리즈", "bmw", "5시리즈");
onlyMatch("벤츠 e300", "benz", "E-클래스");
onlyMatch("벤츠E클래스", "benz", "E-클래스");
onlyMatch("카니발", "kia", "카니발");
onlyMatch("기아카니발", "kia", "카니발");
const newCarnival = onlyMatch("더뉴카니발", "kia", "카니발");
equal(newCarnival.matches[0].matchedDetail, "더 뉴 카니발", "exact detail alias should win over contains matches");
onlyMatch("아반떼", "hyundai", "아반떼");
onlyMatch("현대 그랜저", "hyundai", "그랜저");
const grandeurIg = onlyMatch("그랜저 ig", "hyundai", "그랜저");
equal(grandeurIg.matches[0].matchedDetail, "그랜저 IG", "exact generation name should be retained");
onlyMatch("제네시스 G80", "genesis", "G80");
onlyMatch("아우디a4", "audi", "A4");
onlyMatch("Mercedes-Benz E-Class", "benz", "E-클래스");
check(searchVehicles("XC", records).matches.length >= 3, "real Volvo family query should remain a multiple candidate result");

const bmw2019 = onlyMatch("bmw520d 2019년식", "bmw", "5시리즈");
const bmwState = applyDetectedFilters(bmw2019.matches[0], bmw2019);
const bmwResolution = resolveConsultation(bmw2019.matches[0].records, bmwState);
equal(bmwResolution.type, "result", "2019 BMW 5-series should resolve without unnecessary fuel question");
equal(bmwResolution.result.detailModel, "5시리즈 (G30)", "2019 BMW generation mismatch");
equal(bmwResolution.result.defaultBattery, "AGM95", "2019 BMW DB battery mismatch");
equal(bmwResolution.result.upgradeBattery, "AGM105", "2019 BMW DB upgrade mismatch");

const benz = onlyMatch("벤츠 e300", "benz", "E-클래스");
const benzResolution = resolveConsultation(benz.matches[0].records, applyDetectedFilters(benz.matches[0], benz));
equal(benzResolution.type, "question", "ambiguous Benz family must ask a follow-up");
equal(benzResolution.field, "detailModel", "Benz ambiguity should ask the real DB detail model first");
check(benzResolution.choices.length >= 4, "Benz detail choices unexpectedly missing");

const ambiguousRecords = [
  { manufacturerId: "one", manufacturerName: "제조사1", vehicle: "공통차", detailModel: "공통차 A", year: "20년~현재", fuel: "가솔린", defaultBattery: "DIN60L", upgradeBattery: "" },
  { manufacturerId: "two", manufacturerName: "제조사2", vehicle: "공통차", detailModel: "공통차 B", year: "20년~현재", fuel: "가솔린", defaultBattery: "DIN60L", upgradeBattery: "" }
];
equal(searchVehicles("공통차", ambiguousRecords).matches.length, 2, "same-name vehicles must stay ambiguous");
equal(searchVehicles("존재하지않는차량zz", records).matches.length, 0, "unknown vehicle must not produce a guessed match");

const allowedResultKeys = new Set([
  "manufacturerId", "manufacturerName", "vehicle", "detailModel", "year", "fuel",
  "defaultBattery", "upgradeBattery", "matchedRows"
]);
check(Object.keys(bmwResolution.result).every((key) => allowedResultKeys.has(key)), "result contains a non-DB fact field");
check(records.every((record) => !Object.keys(record).some((key) => /price|가격|coding|코딩/i.test(key))), "canonical rows unexpectedly contain price/coding facts");
check(records.some((record) => batteryStoreType(record.defaultBattery) === "agm"), "real DB AGM row missing");
check(records.some((record) => batteryStoreType(record.defaultBattery) === "din"), "real DB DIN row missing");
equal(classifyQuestion("가격이 얼마예요?"), "price", "price intent failed");
check(buildSafeAnswer("price", bmwResolution.result).includes("가격 정보가 없어"), "price answer must disclose missing DB field");
check(buildSafeAnswer("coding", bmwResolution.result).includes("코딩 필요 여부가 없어"), "coding answer must disclose missing DB field");

equal(PHONE_HREF, "tel:1644-9141", "phone CTA changed");
equal(DIN_STORE_URL, "https://smartstore.naver.com/battery1/products/414050800", "DIN CTA changed");
equal(AGM_STORE_URL, "https://smartstore.naver.com/battery1/products/575288571", "AGM CTA changed");
equal(batteryStoreType("AGM95"), "agm", "AGM link routing failed");
equal(batteryStoreType("DIN90L"), "din", "DIN link routing failed");
equal(batteryStoreType("고객센터문의"), "unknown", "unknown battery routing failed");

assert.deepEqual(createInitialState(), {
  selectedVehicleKey: "", sourceQuery: "", year: null, detailModel: "", yearRange: "", fuel: "", result: null, area: ""
});
assertions += 1;

const page = read("smart-consult/index.html");
const browserScript = read("js/smart-consult.js");
const customerCopy = read("js/conversation-copy.js");
const coreScript = read("js/smart-consult-core.js");
const style = read("css/smart-consult.css");
const homepage = read("index.html");
const legacyFinder = read("search.html");
const sitemap = read("sitemap.xml");

check(page.includes("<h1 id=\"chatTitle\">스마트 배터리 상담</h1>"), "chat page H1 missing");
equal(/consult-hero|static-guide|faq-section/.test(page), false, "chat page must not include removed intro/guide/FAQ sections");
check(page.includes("<footer class=\"site-footer\""), "site footer must remain");
check(page.includes("/js/smart-consult.js"), "chat module missing");
check(browserScript.includes("textContent"), "safe text rendering missing");
equal(/innerHTML|insertAdjacentHTML|document\.write/.test(browserScript), false, "unsafe HTML rendering API found");
check(browserScript.includes('link.target = "_blank"') && browserScript.includes('link.rel = "noopener noreferrer"'), "external link protection missing");
check(customerCopy.includes("정확한 규격 확인 후 선택해 주세요."), "unknown battery type warning missing");
check(customerCopy.includes("일반 · DIN 배터리 가격 보기") && customerCopy.includes("AGM 배터리 가격 보기"), "both result purchase CTAs must be present");
equal(/localStorage|indexedDB/.test(browserScript + coreScript), false, "persistent browser storage must not be used (V5 allows sessionStorage)");
check(style.includes("min-height: 44px"), "minimum touch target rule missing");
check(style.includes("font-size: 16px"), "mobile input font size rule missing");
check(style.includes("height: calc(100svh - 64px)"), "mobile chat must fill the screen below the header");
check(style.includes("prefers-reduced-motion"), "reduced-motion support missing");

check(homepage.includes('href="/smart-consult/"'), "homepage smart consultation CTA missing");
check(homepage.includes('href="search.html"'), "legacy finder CTA must remain");
check(legacyFinder.includes('<script src="js/search.js"></script>'), "legacy finder script connection changed");
check(fs.existsSync(path.join(root, "js/search.js")), "legacy finder script missing");
check(sitemap.includes("https://battery1.co.kr/smart-consult/"), "smart consultation sitemap URL missing");

const runtimeFiles = `${page}\n${browserScript}\n${coreScript}\n${style}`;
equal(/\/work-cases\/|blog-cases|caseDescription/i.test(runtimeFiles), false, "consultation runtime must not reference case data");
equal(/fetch\([^)]*(?:work-cases|blog-cases)/i.test(browserScript), false, "consultation must make zero case-data requests");

const areaSummary = json("data/smart-consult-areas.json");
const canonicalAreas = json("seo-data/service-areas.json");
equal(Object.keys(areaSummary.areas).length, 3, "area summary must contain only three requested regions");
for (const key of ["seoul", "gyeonggi", "incheon"]) {
  assert.deepEqual(areaSummary.areas[key], {
    id: canonicalAreas.areas[key].id,
    name: canonicalAreas.areas[key].name,
    fullName: canonicalAreas.areas[key].fullName,
    slug: canonicalAreas.areas[key].slug
  });
  assertions += 1;
}
equal(/case|사례|regions|neighborhoods/i.test(JSON.stringify(areaSummary.areas)), false, "runtime area summary must not carry unrelated regional or case content");

console.log(`Smart consultation tests passed: ${assertions} assertions, ${records.length} canonical rows`);
