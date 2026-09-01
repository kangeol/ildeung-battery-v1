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
    const aliases = new Set([
      page.name,
      page.sourceVehicleName,
      cleanVehicleAlias(page.name),
      cleanVehicleAlias(page.sourceVehicleName)
    ]);

    return {
      manufacturerId: page.manufacturerId,
      manufacturerName: manufacturer.name || page.manufacturerName,
      vehicleName: page.sourceVehicleName || page.name,
      displayName: page.name,
      urlPath: page.urlPath,
      aliases: [...aliases].filter((alias) => normalizeLoose(alias).length >= 2)
    };
  }).sort((a, b) => Math.max(...b.aliases.map((alias) => normalizeLoose(alias).length)) - Math.max(...a.aliases.map((alias) => normalizeLoose(alias).length)));
}

function buildVehicleAliasCounts(vehicles) {
  const counts = new Map();

  vehicles.forEach((vehicle) => {
    vehicle.aliases.forEach((alias) => {
      const key = normalizeLoose(alias);
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

function buildAreaIndex(areaData) {
  const areas = getAreas(areaData);
  const areaItems = [];
  const regionItems = [];
  const neighborhoodItems = [];
  const neighborhoodCounts = new Map();

  areas.forEach((area) => {
    areaItems.push({
      areaId: area.id,
      areaName: area.name,
      label: area.name,
      urlPath: `/area/${area.slug}/`,
      aliases: [area.name, area.fullName].filter(Boolean)
    });

    area.regions.forEach((region) => {
      regionItems.push({
        areaId: area.id,
        areaName: area.name,
        regionId: region.id,
        regionName: region.name,
        label: area.id === "gyeonggi" ? `${area.name} ${region.name}` : `${area.name} ${region.name}`,
        urlPath: `/area/${area.slug}/${region.id}.html`,
        aliases: [region.name, region.shortName, region.fullName, `${area.name} ${region.name}`].filter(Boolean)
      });

      region.neighborhoods.forEach((neighborhood) => {
        neighborhoodCounts.set(neighborhood.name, (neighborhoodCounts.get(neighborhood.name) || 0) + 1);
        neighborhoodItems.push({
          areaId: area.id,
          areaName: area.name,
          regionId: region.id,
          regionName: region.name,
          neighborhoodName: neighborhood.name,
          legalName: neighborhood.legalName,
          label: `${area.name} ${region.name} ${neighborhood.name}`,
          urlPath: `/area/${area.slug}/${region.id}/${neighborhood.slug}.html`,
          aliases: [neighborhood.name, neighborhood.legalName, `${region.name} ${neighborhood.name}`, `${area.name} ${region.name} ${neighborhood.name}`].filter(Boolean)
        });
      });
    });
  });

  return {
    areas: areaItems,
    regions: regionItems,
    neighborhoods: neighborhoodItems,
    neighborhoodCounts
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

function matchVehicles(text, textLoose, manufacturerMatches, index) {
  const manufacturerIds = new Set(manufacturerMatches.map((item) => item.id));
  const matched = [];

  index.vehicles.forEach((vehicle) => {
    const hasManufacturer = manufacturerIds.has(vehicle.manufacturerId);
    const explicitFullAlias = vehicle.aliases.some((alias) => normalizeLoose(alias).includes(normalizeLoose(vehicle.manufacturerName)));
    const matchedAlias = vehicle.aliases.find((alias) => {
      if (!containsLoose(textLoose, alias)) {
        return false;
      }

      if (manufacturerIds.size && !hasManufacturer) {
        return false;
      }

      const looseAlias = normalizeLoose(alias);
      if (/^[a-z0-9]{1,2}$/.test(looseAlias) && !hasManufacturer) {
        return (index.vehicleAliasCounts.get(looseAlias) || 0) === 1 && containsExplicitAlphaNumericTerm(text, alias);
      }

      return hasManufacturer || explicitFullAlias || looseAlias.length >= 3;
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
      matchedAlias
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

function matchRegionsAndAreas(text, title, index) {
  const areas = index.area.areas
    .filter((area) => area.aliases.some((alias) => containsExplicitKoreanTerm(title, alias)))
    .map(({ areaId, areaName, label, urlPath }) => ({ areaId, areaName, label, urlPath }));
  const regions = index.area.regions
    .filter((region) => region.aliases.some((alias) => containsExplicitKoreanTerm(text, alias)))
    .map(({ areaId, areaName, regionId, regionName, label, urlPath }) => ({ areaId, areaName, regionId, regionName, label, urlPath }));

  return { areas, regions };
}

function matchNeighborhoods(text, regionMatches, areaMatches, index) {
  const regionKeys = new Set(regionMatches.map((region) => `${region.areaId}:${region.regionId}`));
  const areaIds = new Set(areaMatches.map((area) => area.areaId));
  const matched = [];

  index.area.neighborhoods.forEach((neighborhood) => {
    const matchedAlias = neighborhood.aliases.find((alias) => containsExplicitKoreanTerm(text, alias));
    if (!matchedAlias) {
      return;
    }

    const duplicateCount = index.area.neighborhoodCounts.get(neighborhood.neighborhoodName) || 0;
    const hasParentRegion = regionKeys.has(`${neighborhood.areaId}:${neighborhood.regionId}`);
    const hasParentArea = areaIds.has(neighborhood.areaId);

    if (duplicateCount > 1 && !hasParentRegion) {
      return;
    }

    if (!hasParentRegion && !hasParentArea && normalizeLoose(matchedAlias) === normalizeLoose(neighborhood.neighborhoodName) && duplicateCount > 1) {
      return;
    }

    if (matched.some((item) => item.urlPath === neighborhood.urlPath)) {
      return;
    }

    matched.push({
      areaId: neighborhood.areaId,
      areaName: neighborhood.areaName,
      regionId: neighborhood.regionId,
      regionName: neighborhood.regionName,
      name: neighborhood.neighborhoodName,
      legalName: neighborhood.legalName,
      label: neighborhood.label,
      urlPath: neighborhood.urlPath,
      matchedAlias
    });
  });

  return matched;
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
  const manufacturers = [...new Set((facts.vehicles || []).map((item) => `/car-battery/${item.manufacturerId}.html`))];
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

export function extractFactsFromPost(post, index = createBlogCaseIndex()) {
  const text = normalizeText([post.title, post.sourceExcerpt, post.tags].filter(Boolean).join(" "));
  const title = normalizeText(post.title);
  const textLoose = normalizeLoose(text);
  const manufacturers = matchManufacturers(textLoose, index);
  const vehicles = matchVehicles(text, textLoose, manufacturers, index);
  const detailModels = matchDetails(textLoose, vehicles, index);
  const { areas: directAreas, regions } = matchRegionsAndAreas(text, title, index);
  const neighborhoods = matchNeighborhoods(text, regions, directAreas, index);
  const areaById = new Map(directAreas.map((area) => [area.areaId, area]));
  [...regions, ...neighborhoods].forEach((item) => {
    if (!areaById.has(item.areaId)) {
      areaById.set(item.areaId, {
        areaId: item.areaId,
        areaName: item.areaName,
        label: item.areaName,
        urlPath: `/area/${item.areaId}/`
      });
    }
  });
  const areas = [...areaById.values()];
  const batteryModels = matchBatteryModels(text, index);
  const symptoms = matchSymptoms(textLoose);
  const facts = {
    manufacturer: manufacturers[0]?.name || null,
    manufacturers,
    vehicle: vehicles[0]?.displayName || null,
    vehicles,
    detailModels,
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
      return (facts.vehicles || []).some((vehicle) => vehicle.manufacturerId === context.manufacturerId) ? 58 : 0;
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

export function pageExists(urlPath) {
  return fs.existsSync(urlPathToFilePath(urlPath));
}
