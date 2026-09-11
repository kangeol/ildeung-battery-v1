import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SITEMAP_FILE = path.join(ROOT_DIR, "sitemap.xml");
const SITE_ORIGIN = "https://battery1.co.kr";

const STATIC_PAGES = [
  { file: "company/index.html", urlPath: "/company/", priority: "0.85" },
  { file: "index.html", urlPath: "/", priority: "1.0" },
  { file: "search.html", urlPath: "/search.html", priority: "0.9" },
  { file: "service-area.html", urlPath: "/service-area.html", priority: "0.8" },
  { file: "battery-replacement.html", urlPath: "/battery-replacement.html", priority: "0.8" }
];

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function htmlPathToUrlPath(relativePath) {
  const posix = toPosixPath(relativePath);

  if (posix === "index.html") {
    return "/";
  }

  if (posix.endsWith("/index.html")) {
    return `/${posix.slice(0, -"index.html".length)}`;
  }

  return `/${posix}`;
}

function listHtmlFiles(directory) {
  const absoluteDir = path.join(ROOT_DIR, directory);

  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  const result = [];

  function walk(currentDir) {
    fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, "en"))
      .forEach((entry) => {
        const entryPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          walk(entryPath);
          return;
        }

        if (entry.isFile() && entry.name.endsWith(".html")) {
          result.push(path.relative(ROOT_DIR, entryPath));
        }
      });
  }

  walk(absoluteDir);
  return result;
}

function buildEntries() {
  const entries = [];
  const seen = new Set();

  function add(urlPath, priority) {
    const loc = `${SITE_ORIGIN}${urlPath}`;

    if (seen.has(loc)) {
      throw new Error(`Duplicate desired URL: ${loc}`);
    }

    seen.add(loc);
    entries.push({ loc, priority });
  }

  STATIC_PAGES.forEach((page) => {
    if (fs.existsSync(path.join(ROOT_DIR, page.file))) {
      add(page.urlPath, page.priority);
    }
  });

  listHtmlFiles("car-battery").forEach((relativePath) => {
    add(htmlPathToUrlPath(relativePath), toPosixPath(relativePath).endsWith("/index.html") ? "0.9" : "0.8");
  });

  listHtmlFiles("area").forEach((relativePath) => {
    add(htmlPathToUrlPath(relativePath), toPosixPath(relativePath).endsWith("/index.html") ? "0.9" : "0.75");
  });

  listHtmlFiles("battery").forEach((relativePath) => {
    const posix = toPosixPath(relativePath);
    const priority = posix === "battery/index.html"
      ? "0.9"
      : posix.includes("/capacity/")
        ? "0.75"
        : "0.8";
    add(htmlPathToUrlPath(relativePath), priority);
  });

  listHtmlFiles("work-cases").forEach((relativePath) => {
    const posix = toPosixPath(relativePath);
    add(htmlPathToUrlPath(relativePath), posix === "work-cases/index.html" ? "0.85" : "0.65");
  });

  return entries;
}

function decodeXml(value) {
  if (value.includes("]]>")) throw new Error("Invalid XML text");
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/.test(value)) {
    throw new Error("Invalid XML entity");
  }
  return value.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g, (_, entity) => {
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (named[entity]) return named[entity];
    const code = entity.startsWith("#x") ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    if (!(code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff))) {
      throw new Error("Invalid XML character reference");
    }
    return String.fromCodePoint(code);
  });
}

function validateLoc(loc) {
  const url = new URL(loc);
  if (url.origin !== SITE_ORIGIN || url.username || url.password || url.hash || url.href !== loc || /\s/.test(loc)) {
    throw new Error(`Invalid canonical URL: ${loc}`);
  }
}

// Accept the repository's flat sitemap vocabulary; fail closed on unsupported XML.
// Offsets refer to the original string so surviving blocks are never serialized.
function parseSitemap(xml) {
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(xml)) throw new Error("Invalid XML control character");
  const envelope = /^(?:\uFEFF)?(?:<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?\s*\?>)?\s*<urlset\s+xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']\s*>([\s\S]*)<\/urlset>\s*$/i.exec(xml);
  if (!envelope) throw new Error("Invalid or unsupported sitemap envelope");
  const start = xml.indexOf(">", xml.indexOf("<urlset")) + 1;
  const end = xml.lastIndexOf("</urlset>");
  const body = xml.slice(start, end);
  const blocks = [];
  const seen = new Set();
  let cursor = 0;
  for (const match of body.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    if (body.slice(cursor, match.index).trim()) throw new Error("Invalid sitemap content between URL blocks");
    const fields = [...match[1].matchAll(/<([A-Za-z_][\w.-]*)>([^<]*)<\/\1>/g)];
    if (match[1].replace(/<([A-Za-z_][\w.-]*)>([^<]*)<\/\1>/g, "").trim()) throw new Error("Invalid or unsupported URL metadata");
    for (const field of fields) decodeXml(field[2]);
    const locs = fields.filter((field) => field[1] === "loc");
    if (locs.length !== 1) throw new Error("URL block must contain exactly one loc");
    const loc = decodeXml(locs[0][2]);
    validateLoc(loc);
    if (seen.has(loc)) throw new Error(`Duplicate existing URL: ${loc}`);
    seen.add(loc);
    blocks.push({ loc, start: start + match.index, end: start + match.index + match[0].length });
    cursor = match.index + match[0].length;
  }
  if (body.slice(cursor).trim()) throw new Error("Invalid sitemap trailing content");
  return { blocks, end };
}

export function reconcileSitemap(existingXml, desiredEntries) {
  const desired = new Map();
  for (const entry of desiredEntries) {
    validateLoc(entry.loc);
    if (desired.has(entry.loc)) throw new Error(`Duplicate desired URL: ${entry.loc}`);
    if (!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(entry.priority)) throw new Error("Invalid priority");
    desired.set(entry.loc, entry);
  }
  const { blocks } = parseSitemap(existingXml);
  const existing = new Set(blocks.map((block) => block.loc));
  const added = [...desired.values()].filter((entry) => !existing.has(entry.loc)).sort((a, b) => a.loc < b.loc ? -1 : a.loc > b.loc ? 1 : 0);
  const removed = blocks.filter((block) => !desired.has(block.loc));
  if (!added.length && !removed.length) return existingXml;

  let output = existingXml;
  for (const block of removed.reverse()) output = output.slice(0, block.start) + output.slice(block.end);
  if (added.length) {
    const newline = existingXml.includes("\r\n") ? "\r\n" : "\n";
    const indent = existingXml.match(/(?:^|\n)([\t ]*)<url>/)?.[1] ?? "  ";
    const fieldIndent = existingXml.match(/(?:^|\n)([\t ]*)<loc>/)?.[1] ?? `${indent}  `;
    const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const newBlocks = added.map((entry) => [
      `${indent}<url>`, `${fieldIndent}<loc>${escape(entry.loc)}</loc>`,
      `${fieldIndent}<changefreq>weekly</changefreq>`, `${fieldIndent}<priority>${entry.priority}</priority>`, `${indent}</url>`
    ].join(newline)).join(newline);
    const closing = output.lastIndexOf("</urlset>");
    const lineStart = output.lastIndexOf("\n", closing - 1) + 1;
    const insertion = /^[\t ]*$/.test(output.slice(lineStart, closing)) ? lineStart : closing;
    output = output.slice(0, insertion) + (output.slice(0, insertion).endsWith("\n") ? "" : newline) + newBlocks + newline + output.slice(insertion);
  }
  const result = parseSitemap(output);
  if (result.blocks.length !== desired.size || result.blocks.some((block) => !desired.has(block.loc))) throw new Error("Reconciled membership mismatch");
  return output;
}

export function generateSitemap() {
  const entries = buildEntries();
  const existing = fs.existsSync(SITEMAP_FILE) ? fs.readFileSync(SITEMAP_FILE, "utf8") : null;
  const empty = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
  const result = reconcileSitemap(existing ?? empty, entries);
  if (result !== existing) fs.writeFileSync(SITEMAP_FILE, result, "utf8");
  return entries;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const entries = generateSitemap();
  console.log("Sitemap Generate Complete");
  console.log(`Total URLs: ${entries.length}`);
}
