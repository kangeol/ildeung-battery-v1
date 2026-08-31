import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DETAIL_GROUPS_FILE = path.join(ROOT_DIR, "seo-data", "vehicle-detail-groups.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "assets", "seo", "vehicle");
const WIDTH = 800;
const HEIGHT = 800;
const PHONE_FONT_SIZE = 68;
const FONT_FAMILY = `"Malgun Gothic", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function ensureSafeOutputDir() {
  const resolved = path.resolve(OUTPUT_DIR);
  const allowedRoot = path.join(ROOT_DIR, "assets", "seo");

  if (!resolved.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Unsafe thumbnail output directory: ${resolved}`);
  }

  fs.rmSync(resolved, { recursive: true, force: true });
  fs.mkdirSync(resolved, { recursive: true });
}

function outputPathFromImagePath(imagePath) {
  return path.join(ROOT_DIR, imagePath.replace(/^\//, ""));
}

function stripManufacturerName(manufacturerName, vehicleName) {
  const maker = normalizeText(manufacturerName);
  const vehicle = normalizeText(vehicleName);

  if (!maker || !vehicle) {
    return vehicle || maker;
  }

  return vehicle.toLowerCase().startsWith(maker.toLowerCase())
    ? vehicle.slice(maker.length).trim()
    : vehicle;
}

function wrapText(text, maxChars = 12) {
  const value = normalizeText(text);

  if (value.length <= maxChars) {
    return [value];
  }

  const words = value.split(/\s+/);
  if (words.length > 1) {
    const lines = [];
    let current = "";

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) lines.push(current);
    return lines.slice(0, 2);
  }

  const midpoint = Math.ceil(value.length / 2);
  return [value.slice(0, midpoint), value.slice(midpoint)];
}

function getMainFontSize(lines) {
  const maxLength = Math.max(...lines.map((line) => line.length));

  if (lines.length > 1) return maxLength > 12 ? 62 : 70;
  if (maxLength <= 8) return 84;
  if (maxLength <= 10) return 78;
  if (maxLength <= 12) return 70;
  return 62;
}

function renderMainText(lines) {
  const fontSize = getMainFontSize(lines);
  const lineGap = lines.length > 1 ? fontSize + 10 : 0;
  const startY = lines.length > 1 ? 362 - lineGap / 2 : 365;

  return lines.map((line, index) => `
    <text x="400" y="${startY + index * lineGap}" text-anchor="middle" class="main" font-size="${fontSize}">${escapeXml(line)}</text>`).join("");
}

function getTopFontSize(topLine) {
  const length = normalizeText(topLine).length;
  if (length <= 8) return 40;
  if (length <= 12) return 36;
  if (length <= 16) return 32;
  return 29;
}

function createSvg({ eyebrow, topLine, mainText }) {
  const mainLines = wrapText(mainText);
  const topFontSize = getTopFontSize(topLine);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="58%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="blueLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#60a5fa" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.35"/>
    </linearGradient>
    <style>
      text {
        font-family: ${FONT_FAMILY};
        dominant-baseline: middle;
        letter-spacing: 0;
      }
      .eyebrow {
        fill: #93c5fd;
        font-size: 24px;
        font-weight: 800;
      }
      .top {
        fill: #bfdbfe;
        font-weight: 800;
      }
      .main {
        fill: #ffffff;
        font-weight: 900;
      }
      .phone {
        fill: #f8fafc;
        font-size: ${PHONE_FONT_SIZE}px;
        font-weight: 900;
      }
      .brand {
        fill: #ffffff;
        font-size: 38px;
        font-weight: 800;
      }
    </style>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <rect x="42" y="42" width="716" height="716" rx="56" fill="none" stroke="#1e40af" stroke-width="2" opacity="0.72"/>
  <rect x="76" y="76" width="648" height="648" rx="42" fill="none" stroke="#334155" stroke-width="1" opacity="0.55"/>
  <circle cx="104" cy="104" r="6" fill="#60a5fa" opacity="0.9"/>
  <circle cx="696" cy="696" r="6" fill="#60a5fa" opacity="0.9"/>
  <line x1="214" y1="208" x2="586" y2="208" stroke="url(#blueLine)" stroke-width="3" stroke-linecap="round"/>
  <line x1="254" y1="508" x2="546" y2="508" stroke="url(#blueLine)" stroke-width="3" stroke-linecap="round"/>
  <text x="400" y="132" text-anchor="middle" class="eyebrow">${escapeXml(eyebrow)}</text>
  <text x="400" y="235" text-anchor="middle" class="top" font-size="${topFontSize}">${escapeXml(topLine)}</text>
  ${renderMainText(mainLines)}
  <text x="400" y="570" text-anchor="middle" class="phone">1644-9141</text>
  <text x="400" y="662" text-anchor="middle" class="brand">일등밧데리</text>
</svg>`;
}

function buildThumbnailSpecs(report) {
  const parentSpecs = report.vehiclePages.map((page) => ({
    imagePath: page.imagePath,
    eyebrow: "VEHICLE BATTERY",
    topLine: page.manufacturerName,
    mainText: `${stripManufacturerName(page.manufacturerName, page.name)} 배터리 가격·규격`
  }));

  const detailSpecs = report.detailPages.map((page) => ({
    imagePath: page.imagePath,
    eyebrow: "VEHICLE BATTERY",
    topLine: `${page.manufacturerName} ${stripManufacturerName(page.manufacturerName, page.vehicleName)}`,
    mainText: `${page.label} 배터리 가격·규격`
  }));

  return [...parentSpecs, ...detailSpecs];
}

async function renderThumbnail(spec) {
  const outputPath = outputPathFromImagePath(spec.imagePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await sharp(Buffer.from(createSvg(spec)))
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false
    })
    .toFile(outputPath);

  return outputPath;
}

async function generate() {
  console.log("Vehicle Thumbnail Generate Start");
  console.log("");

  if (!fs.existsSync(DETAIL_GROUPS_FILE)) {
    throw new Error("seo-data/vehicle-detail-groups.json 파일이 없습니다. 먼저 npm run generate:vehicle-seo를 실행하세요.");
  }

  const report = readJson(DETAIL_GROUPS_FILE);
  const specs = buildThumbnailSpecs(report);
  const duplicatePaths = specs.length - new Set(specs.map((spec) => spec.imagePath)).size;

  if (duplicatePaths > 0) {
    throw new Error(`Duplicate thumbnail paths: ${duplicatePaths}`);
  }

  ensureSafeOutputDir();

  for (const spec of specs) {
    await renderThumbnail(spec);
  }

  console.log("Image engine: sharp SVG to PNG");
  console.log(`Image size: ${WIDTH}x${HEIGHT}`);
  console.log(`Phone font size: ${PHONE_FONT_SIZE}px`);
  console.log(`Vehicle parent images: ${report.vehiclePages.length}`);
  console.log(`Vehicle detail images: ${report.detailPages.length}`);
  console.log(`Expected images: ${specs.length}`);
  console.log(`Actual images: ${specs.length}`);
  console.log(`Duplicate paths: ${duplicatePaths}`);
  console.log("");
  console.log("Vehicle Thumbnail Generate Complete");
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
