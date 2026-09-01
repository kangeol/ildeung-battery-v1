import fs from "node:fs";
import {
  BLOG_CASE_FALLBACK_IMAGE,
  BLOG_CASES_FILE,
  BLOG_ID,
  fileExistsForPublicPath,
  normalizeText,
  urlPathToFilePath
} from "./lib/blog-case-utils.js";
import { createBlogCaseIndex } from "./lib/blog-case-matcher.js";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function getLocalPageCount(paths) {
  return paths.filter((urlPath) => fs.existsSync(urlPathToFilePath(urlPath))).length;
}

function main() {
  console.log("Blog Cases Audit Start");
  console.log("");

  assert(fs.existsSync(BLOG_CASES_FILE), "seo-data/blog-cases.json is missing");
  const archive = JSON.parse(fs.readFileSync(BLOG_CASES_FILE, "utf8"));
  const posts = Array.isArray(archive.posts) ? archive.posts : [];
  const index = createBlogCaseIndex();
  const manufacturerIds = new Set(index.manufacturers.map((manufacturer) => manufacturer.id));
  const vehicleByPath = new Map(index.vehicles.map((vehicle) => [vehicle.urlPath, vehicle]));
  const detailByPath = new Map(index.details.map((detail) => [detail.urlPath, detail]));
  const areaPaths = new Set(index.area.areas.map((area) => area.urlPath));
  const regionPaths = new Set(index.area.regions.map((region) => region.urlPath));
  const neighborhoodPaths = new Set(index.area.neighborhoods.map((neighborhood) => neighborhood.urlPath));
  const ids = new Set();
  const urls = new Set();
  let fallbackThumbnailCount = 0;
  let missingLocalThumbnailCount = 0;
  let unsafeSummaryCount = 0;
  let emptySummaryCount = 0;
  let invalidDateCount = 0;
  let nonexistentMatches = 0;
  let orphanMatches = 0;
  let invalidManufacturerCount = 0;
  let invalidVehicleCount = 0;
  let invalidDetailCount = 0;
  let manufacturerVehicleConflictCount = 0;
  let invalidActualWorkLocationCount = 0;
  let serviceAreaUsedAsActualCount = 0;
  let detailSpecificityMisuseCount = 0;
  let parentMismatchCount = 0;
  let crossManufacturerLeakageCount = 0;

  posts.forEach((post) => {
    const id = normalizeText(post.id);
    const url = normalizeText(post.url);
    const title = normalizeText(post.title);
    const summary = normalizeText(post.summary);

    assert(id, "empty post id");
    assert(!ids.has(id), `duplicate post id: ${id}`);
    ids.add(id);

    assert(/^https:\/\/blog\.naver\.com\//.test(url), `invalid blog URL: ${url}`);
    assert(url.includes(BLOG_ID), `blog URL does not include expected blog id: ${url}`);
    assert(!urls.has(url), `duplicate canonical URL: ${url}`);
    urls.add(url);

    assert(title, `empty title: ${id}`);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizeText(post.publishedAt))) {
      invalidDateCount += 1;
    }

    if (!summary) {
      emptySummaryCount += 1;
    }

    if (/[<>]/.test(summary)) {
      unsafeSummaryCount += 1;
    }

    if (post.thumbnail === BLOG_CASE_FALLBACK_IMAGE || post.thumbnailStatus === "fallback") {
      fallbackThumbnailCount += 1;
    }

    if (post.thumbnail?.startsWith("/assets/blog-cases/") && !fileExistsForPublicPath(post.thumbnail)) {
      missingLocalThumbnailCount += 1;
    }

    const facts = post.facts || {};
    const pages = facts.matchedPages || {};
    const factManufacturerIds = new Set((facts.manufacturers || []).map((manufacturer) => manufacturer.id));
    const factVehiclePaths = new Set((facts.vehicles || []).map((vehicle) => vehicle.urlPath));
    const factDetailPaths = new Set((facts.detailModels || []).map((detail) => detail.urlPath));
    const matchedPaths = [
      ...(pages.vehicles || []),
      ...(pages.details || []),
      ...(pages.manufacturers || []),
      ...(pages.areas || []),
      ...(pages.regions || []),
      ...(pages.neighborhoods || []),
      ...(pages.batteries || [])
    ];

    nonexistentMatches += matchedPaths.length - getLocalPageCount(matchedPaths);

    (facts.manufacturers || []).forEach((manufacturer) => {
      if (!manufacturerIds.has(manufacturer.id)) {
        invalidManufacturerCount += 1;
      }
    });

    (facts.vehicles || []).forEach((vehicle) => {
      const indexedVehicle = vehicleByPath.get(vehicle.urlPath);
      if (!indexedVehicle) {
        invalidVehicleCount += 1;
        return;
      }

      if (!factManufacturerIds.has(vehicle.manufacturerId)) {
        manufacturerVehicleConflictCount += 1;
      }

      if (indexedVehicle.manufacturerId !== vehicle.manufacturerId) {
        crossManufacturerLeakageCount += 1;
      }
    });

    (facts.detailModels || []).forEach((detail) => {
      const indexedDetail = detailByPath.get(detail.urlPath);
      if (!indexedDetail) {
        invalidDetailCount += 1;
        return;
      }

      if (!factVehiclePaths.has(detail.vehicleUrlPath)) {
        parentMismatchCount += 1;
      }

      if (indexedDetail.manufacturerId !== detail.manufacturerId) {
        crossManufacturerLeakageCount += 1;
      }
    });

    const actual = facts.actualWorkLocation || null;
    if (actual) {
      if (
        (actual.level === "area" && !areaPaths.has(actual.urlPath)) ||
        (actual.level === "region" && !regionPaths.has(actual.urlPath)) ||
        (actual.level === "neighborhood" && !neighborhoodPaths.has(actual.urlPath))
      ) {
        invalidActualWorkLocationCount += 1;
      }
    }

    if ((facts.mentionedServiceAreas || []).length && !actual) {
      if ((pages.areas || []).length || (pages.regions || []).length || (pages.neighborhoods || []).length) {
        serviceAreaUsedAsActualCount += 1;
      }
    }

    (pages.details || []).forEach((detailPath) => {
      const detail = detailByPath.get(detailPath);
      const matchingVehicle = (facts.vehicles || []).find((vehicle) => vehicle.urlPath === detail?.vehicleUrlPath);

      if (!factDetailPaths.has(detailPath) || !matchingVehicle || matchingVehicle.specificity !== "detail") {
        detailSpecificityMisuseCount += 1;
      }
    });

    if ((pages.details || []).length && !(facts.vehicles || []).length) {
      orphanMatches += 1;
    }

    if ((pages.neighborhoods || []).length && !(facts.neighborhoods || []).length) {
      orphanMatches += 1;
    }
  });

  assert(posts.length >= 299, `blog post count is below 299: ${posts.length}`);
  assert(invalidDateCount === 0, `invalid publishedAt count: ${invalidDateCount}`);
  assert(missingLocalThumbnailCount === 0, `missing local thumbnail count: ${missingLocalThumbnailCount}`);
  assert(unsafeSummaryCount === 0, `unsafe summary count: ${unsafeSummaryCount}`);
  assert(emptySummaryCount === 0, `empty summary count: ${emptySummaryCount}`);
  assert(nonexistentMatches === 0, `nonexistent matched page count: ${nonexistentMatches}`);
  assert(orphanMatches === 0, `orphan match count: ${orphanMatches}`);
  assert(invalidManufacturerCount === 0, `invalid manufacturer match count: ${invalidManufacturerCount}`);
  assert(invalidVehicleCount === 0, `invalid vehicle match count: ${invalidVehicleCount}`);
  assert(invalidDetailCount === 0, `invalid detail match count: ${invalidDetailCount}`);
  assert(manufacturerVehicleConflictCount === 0, `manufacturer/vehicle conflict count: ${manufacturerVehicleConflictCount}`);
  assert(invalidActualWorkLocationCount === 0, `invalid actual work location count: ${invalidActualWorkLocationCount}`);
  assert(serviceAreaUsedAsActualCount === 0, `mentioned service area used as actual count: ${serviceAreaUsedAsActualCount}`);
  assert(detailSpecificityMisuseCount === 0, `detail specificity misuse count: ${detailSpecificityMisuseCount}`);
  assert(parentMismatchCount === 0, `parent vehicle mismatch count: ${parentMismatchCount}`);
  assert(crossManufacturerLeakageCount === 0, `cross-manufacturer leakage count: ${crossManufacturerLeakageCount}`);

  console.log(`Posts: ${posts.length}`);
  console.log(`Duplicate post id: 0`);
  console.log(`Duplicate canonical URL: 0`);
  console.log(`Invalid blog URL: 0`);
  console.log(`Invalid publishedAt: 0`);
  console.log(`Missing local thumbnail: ${missingLocalThumbnailCount}`);
  console.log(`Fallback thumbnail: ${fallbackThumbnailCount}`);
  console.log(`Unsafe summary: 0`);
  console.log(`Empty summary: 0`);
  console.log(`Nonexistent matched page: 0`);
  console.log(`Orphan match: 0`);
  console.log(`Invalid manufacturer match: 0`);
  console.log(`Invalid vehicle match: 0`);
  console.log(`Invalid detail match: 0`);
  console.log(`Manufacturer/vehicle conflict: 0`);
  console.log(`Invalid actual work location: 0`);
  console.log(`Mentioned service area used as actual: 0`);
  console.log(`Detail specificity misuse: 0`);
  console.log(`Parent vehicle mismatch: 0`);
  console.log(`Cross-manufacturer leakage: 0`);
  console.log("");
  console.log("Blog Cases Audit PASS");
}

try {
  main();
} catch (error) {
  console.error("Blog Cases Audit FAIL");
  console.error(error.message);
  process.exit(1);
}
