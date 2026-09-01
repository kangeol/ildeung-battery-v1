import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const MANUFACTURERS_FILE = path.join(DATA_DIR, "manufacturers.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "assets", "seo", "battery");
const WIDTH = 800;
const HEIGHT = 800;
const FONT_FAMILY = `"Malgun Gothic", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;

const FIXED_SPECS = [
  { slug: "index", topLine: "자동차배터리", mainText: "정보 가이드" },
  { slug: "car-battery", topLine: "자동차배터리", mainText: "선택 안내" },
  { slug: "replacement", topLine: "자동차배터리", mainText: "교체 안내" },
  { slug: "price", topLine: "자동차배터리", mainText: "가격 안내" },
  { slug: "replacement-cost", topLine: "배터리 교체", mainText: "비용 안내" },
  { slug: "battery-life", topLine: "자동차배터리", mainText: "수명 안내" },
  { slug: "mobile-replacement", topLine: "출장배터리", mainText: "서비스 안내" },
  { slug: "battery-discharge", topLine: "배터리 방전", mainText: "대응 안내" },
  { slug: "import-car-battery", topLine: "수입차배터리", mainText: "교체 안내" },
  { slug: "delkor-battery", topLine: "델코배터리", mainText: "선택 안내" },
  { slug: "agm", topLine: "AGM 배터리", mainText: "선택 안내" },
  { slug: "agm-price", topLine: "AGM 배터리", mainText: "가격 안내" },
  { slug: "agm-delkor", topLine: "델코 AGM", mainText: "배터리 안내" },
  { slug: "agm-varta", topLine: "바르타 AGM", mainText: "배터리 안내" }
];

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

function ensureSafeOutputDir() {
  const resolved = path.resolve(OUTPUT_DIR);
  const allowedRoot = path.join(ROOT_DIR, "assets", "seo");

  if (!resolved.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Unsafe thumbnail output directory: ${resolved}`);
  }

  fs.rmSync(resolved, { recursive: true, force: true });
  fs.mkdirSync(resolved, { recursive: true });
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function extractAgmCapacitiesFromText(value) {
  const capacities = new Set();
  const text = normalizeText(value);

  for (const match of text.matchAll(/\bAGM\s*([0-9]{2,3})\b/gi)) {
    capacities.add(`AGM${match[1]}`);
  }

  return capacities;
}

function getAgmCapacities() {
  const manufacturers = readJson(MANUFACTURERS_FILE);
  const capacities = new Set();

  manufacturers.forEach((manufacturer) => {
    const filePath = path.join(DATA_DIR, manufacturer.file);
    if (!fs.existsSync(filePath)) {
      return;
    }

    const rows = readJson(filePath);
    rows.forEach((row) => {
      ["defaultBattery", "upgradeBattery"].forEach((field) => {
        extractAgmCapacitiesFromText(row[field]).forEach((capacity) => capacities.add(capacity));
      });
    });
  });

  return [...capacities].sort((a, b) => Number(a.replace("AGM", "")) - Number(b.replace("AGM", "")));
}

function wrapText(text, maxChars = 12) {
  const value = String(text);

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

  if (lines.length > 1) return maxLength > 12 ? 66 : 74;
  if (maxLength <= 8) return 88;
  if (maxLength <= 10) return 80;
  if (maxLength <= 12) return 72;
  return 64;
}

function renderMainText(lines) {
  const fontSize = getMainFontSize(lines);
  const lineGap = lines.length > 1 ? fontSize + 10 : 0;
  const startY = lines.length > 1 ? 355 - lineGap / 2 : 365;

  return lines.map((line, index) => `
    <text x="400" y="${startY + index * lineGap}" text-anchor="middle" class="main" font-size="${fontSize}">${escapeXml(line)}</text>`).join("");
}

function createSvg({ topLine, mainText }) {
  const mainLines = wrapText(mainText);

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
        font-size: 42px;
        font-weight: 800;
      }
      .main {
        fill: #ffffff;
        font-weight: 900;
      }
      .phone {
        fill: #f8fafc;
        font-size: 68px;
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
  <text x="400" y="132" text-anchor="middle" class="eyebrow">NO.1 BATTERY</text>
  <text x="400" y="255" text-anchor="middle" class="top">${escapeXml(topLine)}</text>
  ${renderMainText(mainLines)}
  <text x="400" y="570" text-anchor="middle" class="phone">1644-9141</text>
  <text x="400" y="662" text-anchor="middle" class="brand">일등밧데리</text>
</svg>`;
}

function buildThumbnailSpecs() {
  const capacitySpecs = getAgmCapacities().map((capacity) => ({
    slug: capacity.toLowerCase(),
    topLine: `${capacity} 배터리`,
    mainText: "가격·적용차량"
  }));

  return [...FIXED_SPECS, ...capacitySpecs];
}

async function renderThumbnail(spec) {
  const outputPath = path.join(OUTPUT_DIR, `${spec.slug}.png`);

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
  console.log("Battery Topic Thumbnail Generate Start");
  console.log("");

  const specs = buildThumbnailSpecs();
  const duplicatePaths = specs.length - new Set(specs.map((spec) => spec.slug)).size;

  if (duplicatePaths > 0) {
    throw new Error(`Duplicate thumbnail paths: ${duplicatePaths}`);
  }

  ensureSafeOutputDir();

  for (const spec of specs) {
    await renderThumbnail(spec);
  }

  console.log("Image engine: sharp SVG to PNG");
  console.log(`Image size: ${WIDTH}x${HEIGHT}`);
  console.log(`Expected images: ${specs.length}`);
  console.log(`Actual images: ${specs.length}`);
  console.log(`Duplicate paths: ${duplicatePaths}`);
  console.log("");
  console.log("Battery Topic Thumbnail Generate Complete");
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
