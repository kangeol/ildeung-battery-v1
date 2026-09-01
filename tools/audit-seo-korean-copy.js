import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const HTML_DIRS = ["car-battery", "area", "battery"];
const GENERATOR_FILES = [
  "tools/generate-vehicle-seo-pages.js",
  "tools/generate-area-seo-pages.js",
  "tools/generate-battery-seo-pages.js"
];

const MALFORMED_HTML_PATTERNS = [
  {
    name: "known model label followed by a raw particle",
    regex: /(그랜저 IG|더 뉴 아반떼|CN7|W205|W206|G30|KA4|MQ4|남동구|안산시|수원시)(은|는|이|가|을|를|와|과|으로|로)/g
  },
  {
    name: "AGM capacity followed by raw subject particle",
    regex: /AGM[0-9]{2,3}[이가]/g
  },
  {
    name: "same vehicle label with raw 라도",
    regex: /같은 [^<>{}\n]{1,90}라도 배터리가/g
  },
  {
    name: "same detail label with raw 도",
    regex: /같은 [^<>{}\n]{1,90}도 연료에 따라 배터리가/g
  },
  {
    name: "template placeholder leaked into HTML",
    regex: /\$\{[^}]+\}/g
  }
];

const DIRECT_TEMPLATE_PARTICLE_PATTERN = /\$\{(?:escapeHtml\([^)]+\)|[^}\n]+)\}(은|는|이|가|을|를|와|과|으로|로|라도)/g;

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function listHtmlFiles(directoryName) {
  const directory = path.join(ROOT_DIR, directoryName);

  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];

  function walk(currentDirectory) {
    fs.readdirSync(currentDirectory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .forEach((entry) => {
        const entryPath = path.join(currentDirectory, entry.name);

        if (entry.isDirectory()) {
          walk(entryPath);
          return;
        }

        if (entry.isFile() && entry.name.endsWith(".html")) {
          files.push(entryPath);
        }
      });
  }

  walk(directory);
  return files;
}

function stripScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function scanHtml(files) {
  const malformed = [];
  const faqMismatches = [];

  files.forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    const relativeFile = toPosix(path.relative(ROOT_DIR, file));

    MALFORMED_HTML_PATTERNS.forEach((pattern) => {
      for (const match of html.matchAll(pattern.regex)) {
        malformed.push({
          file: relativeFile,
          rule: pattern.name,
          match: match[0]
        });
      }
    });

    const visibleText = stripTags(stripScripts(html));
    const jsonLdScripts = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

    jsonLdScripts.forEach((scriptMatch) => {
      let parsed;

      try {
        parsed = JSON.parse(scriptMatch[1]);
      } catch {
        return;
      }

      if (parsed?.["@type"] !== "FAQPage" || !Array.isArray(parsed.mainEntity)) {
        return;
      }

      parsed.mainEntity.forEach((item) => {
        const question = normalizeText(item?.name);
        const answer = normalizeText(item?.acceptedAnswer?.text);

        if (question && !visibleText.includes(question)) {
          faqMismatches.push({ file: relativeFile, type: "question", text: question });
        }

        if (answer && !visibleText.includes(answer)) {
          faqMismatches.push({ file: relativeFile, type: "answer", text: answer });
        }
      });
    });
  });

  return { malformed, faqMismatches };
}

function scanGenerators() {
  const matches = [];

  GENERATOR_FILES.forEach((relativeFile) => {
    const file = path.join(ROOT_DIR, relativeFile);

    if (!fs.existsSync(file)) {
      return;
    }

    const content = fs.readFileSync(file, "utf8");

    for (const match of content.matchAll(DIRECT_TEMPLATE_PARTICLE_PATTERN)) {
      const before = content.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      matches.push({
        file: relativeFile,
        line,
        match: match[0]
      });
    }
  });

  return matches;
}

function main() {
  const vehicleFiles = listHtmlFiles("car-battery");
  const areaFiles = listHtmlFiles("area");
  const batteryFiles = listHtmlFiles("battery");
  const htmlFiles = [...vehicleFiles, ...areaFiles, ...batteryFiles];
  const { malformed, faqMismatches } = scanHtml(htmlFiles);
  const generatorMatches = scanGenerators();
  const result = {
    vehicleHtmlCount: vehicleFiles.length,
    areaHtmlCount: areaFiles.length,
    batteryHtmlCount: batteryFiles.length,
    malformedJosaCount: malformed.length,
    faqMismatchCount: faqMismatches.length,
    generatorDirectParticleCount: generatorMatches.length,
    malformedExamples: malformed.slice(0, 10),
    faqMismatchExamples: faqMismatches.slice(0, 10),
    generatorExamples: generatorMatches.slice(0, 10)
  };

  console.log(JSON.stringify(result, null, 2));

  if (malformed.length || faqMismatches.length || generatorMatches.length) {
    process.exitCode = 1;
  }
}

main();
