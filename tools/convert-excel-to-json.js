import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const MASTER_DIR = path.join(ROOT_DIR, "master-db");
const DATA_DIR = path.join(ROOT_DIR, "data");

const COLUMN_MAP = {
  "제조사": "manufacturer",
  "차량명": "vehicle",
  "차량년식": "year",
  "연료": "fuel",
  "세부모델": "detailModel",
  "기본배터리": "defaultBattery",
  "업그레이드배터리": "upgradeBattery",
  "검수상태": "status"
};

const REQUIRED_COLUMNS = Object.keys(COLUMN_MAP);

const MANUFACTURER_IDS = {
  "현대": "hyundai",
  "기아": "kia",
  "쉐보레": "chevrolet",
  "르노": "renault",
  "KG": "kgm",
  "쌍용": "kgm",
  "BMW": "bmw",
  "벤츠": "benz",
  "아우디": "audi",
  "폭스바겐": "volkswagen"
};

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function getAttribute(text, name) {
  const match = text.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function normalizeZipPath(value) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function readZipEntries(filePath) {
  const buffer = fs.readFileSync(filePath);
  let endOffset = -1;

  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      endOffset = index;
      break;
    }
  }

  if (endOffset < 0) {
    throw new Error(`${path.basename(filePath)} 파일의 ZIP 디렉터리를 읽지 못했습니다.`);
  }

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  const entries = new Map();
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("XLSX 중앙 디렉터리 형식이 올바르지 않습니다.");
    }

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = normalizeZipPath(buffer.slice(cursor + 46, cursor + 46 + fileNameLength).toString("utf8"));

    entries.set(fileName, {
      compressedSize,
      localHeaderOffset,
      method
    });

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  function readEntry(name) {
    const entry = entries.get(normalizeZipPath(name));
    if (!entry) return "";

    const localOffset = entry.localHeaderOffset;
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`${name} 로컬 헤더를 읽지 못했습니다.`);
    }

    const fileNameLength = buffer.readUInt16LE(localOffset + 26);
    const extraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + fileNameLength + extraLength;
    const compressed = buffer.slice(dataStart, dataStart + entry.compressedSize);

    if (entry.method === 0) return compressed.toString("utf8");
    if (entry.method === 8) return zlib.inflateRawSync(compressed).toString("utf8");
    throw new Error(`${name} 압축 형식을 지원하지 않습니다.`);
  }

  return { readEntry };
}

function parseSharedStrings(xml) {
  if (!xml) return [];

  const strings = [];
  const itemPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let itemMatch;

  while ((itemMatch = itemPattern.exec(xml))) {
    const parts = [];
    const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch;

    while ((textMatch = textPattern.exec(itemMatch[1]))) {
      parts.push(decodeXml(textMatch[1]));
    }

    strings.push(parts.join(""));
  }

  return strings;
}

function columnName(cellRef) {
  const match = String(cellRef || "").match(/^[A-Z]+/);
  return match ? match[0] : "";
}

function getCellValue(cellAttributes, cellBody, sharedStrings) {
  const type = getAttribute(cellAttributes, "t");

  if (type === "inlineStr") {
    const textMatch = cellBody.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
    return textMatch ? decodeXml(textMatch[1]).trim() : "";
  }

  const valueMatch = cellBody.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  const raw = valueMatch ? decodeXml(valueMatch[1]).trim() : "";

  if (type === "s" && raw !== "") {
    return String(sharedStrings[Number(raw)] || "").trim();
  }

  return raw;
}

function getFirstWorksheetPath(zip) {
  const workbookXml = zip.readEntry("xl/workbook.xml");
  const relsXml = zip.readEntry("xl/_rels/workbook.xml.rels");
  const sheetMatch = workbookXml.match(/<sheet\b[^>]*>/);

  if (!sheetMatch) {
    throw new Error("첫 번째 시트를 찾지 못했습니다.");
  }

  const relId = getAttribute(sheetMatch[0], "r:id");
  const relPattern = new RegExp(`<Relationship\\b[^>]*Id="${relId}"[^>]*>`, "i");
  const relMatch = relsXml.match(relPattern);

  if (!relMatch) {
    throw new Error(`시트 관계 정보를 찾지 못했습니다: ${relId}`);
  }

  const target = normalizeZipPath(getAttribute(relMatch[0], "Target"));
  return target.startsWith("xl/") ? target : normalizeZipPath(`xl/${target}`);
}

function parseRows(sheetXml, sharedStrings) {
  const rows = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(sheetXml))) {
    const row = {};
    const cellPattern = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      const cellRef = getAttribute(cellMatch[1], "r");
      const column = columnName(cellRef);
      if (!column) continue;
      row[column] = getCellValue(cellMatch[1], cellMatch[2] || "", sharedStrings);
    }

    if (Object.keys(row).length) rows.push(row);
  }

  return rows;
}

function normalizeYear(value) {
  const text = String(value || "").trim();
  return /^\d+$/.test(text) ? Number(text) : text;
}

function readWorkbook(filePath) {
  const zip = readZipEntries(filePath);
  const sharedStrings = parseSharedStrings(zip.readEntry("xl/sharedStrings.xml"));
  const sheetPath = getFirstWorksheetPath(zip);
  const sheetXml = zip.readEntry(sheetPath);
  const rows = parseRows(sheetXml, sharedStrings);

  if (rows.length < 2) {
    return [];
  }

  const headerRow = rows[0];
  const headerColumns = {};

  Object.entries(headerRow).forEach(([column, value]) => {
    if (value) headerColumns[value] = column;
  });

  REQUIRED_COLUMNS.forEach((column) => {
    if (!headerColumns[column]) {
      throw new Error(`${path.basename(filePath)} 필수 컬럼이 없습니다: ${column}`);
    }
  });

  return rows.slice(1)
    .map((row) => {
      const item = {};

      REQUIRED_COLUMNS.forEach((column) => {
        const key = COLUMN_MAP[column];
        const value = String(row[headerColumns[column]] || "").trim();
        item[key] = key === "year" ? normalizeYear(value) : value;
      });

      return item;
    })
    .filter((item) => item.manufacturer || item.vehicle || item.detailModel);
}

function manufacturerId(name, fileBaseName) {
  const text = String(name || "").trim();
  if (MANUFACTURER_IDS[text]) return MANUFACTURER_IDS[text];

  return String(fileBaseName || text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function manufacturerNameFromRows(rows, fileBaseName) {
  return rows.find((item) => String(item.manufacturer || "").trim())?.manufacturer || fileBaseName;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function convertAll() {
  fs.mkdirSync(MASTER_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const workbooks = fs.readdirSync(MASTER_DIR)
    .filter((file) => file.toLowerCase().endsWith(".xlsx") && !file.startsWith("~$"))
    .sort((a, b) => a.localeCompare(b, "ko"));

  const manufacturers = [];
  const conversionResults = [];
  let totalRows = 0;

  console.log("Vehicle DB Convert Start");
  console.log("");

  workbooks.forEach((file) => {
    const fileBaseName = path.basename(file, ".xlsx");
    const rows = readWorkbook(path.join(MASTER_DIR, file));
    const outputFile = `${fileBaseName}.json`;
    const manufacturerName = manufacturerNameFromRows(rows, fileBaseName);

    writeJson(path.join(DATA_DIR, outputFile), rows);

    manufacturers.push({
      id: manufacturerId(manufacturerName, fileBaseName),
      name: manufacturerName,
      file: outputFile
    });

    conversionResults.push({
      file,
      manufacturerName,
      outputFile,
      rowCount: rows.length
    });
    totalRows += rows.length;
  });

  writeJson(path.join(DATA_DIR, "manufacturers.json"), manufacturers);

  conversionResults.forEach((result) => {
    console.log(result.file);
    console.log(`- manufacturer: ${result.manufacturerName}`);
    console.log(`- output: data/${result.outputFile}`);
    console.log(`- rows: ${result.rowCount}`);
    console.log("- status: OK");
    console.log("");
  });

  console.log("Manufacturers generated:");
  manufacturers.forEach((manufacturer) => {
    console.log(`- ${manufacturer.name}: ${manufacturer.file}`);
  });
  console.log("");
  console.log(`Total manufacturers: ${manufacturers.length}`);
  console.log(`Total rows: ${totalRows}`);
  console.log("");
  console.log("Vehicle DB Convert Complete");
}

convertAll();
