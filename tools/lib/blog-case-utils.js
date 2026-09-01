import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");
export const SITE_ORIGIN = "https://battery1.co.kr";
export const BLOG_ID = "kang10107";
export const BLOG_URL = `https://blog.naver.com/${BLOG_ID}`;
export const BLOG_RSS_URL = `https://rss.blog.naver.com/${BLOG_ID}.xml`;
export const BLOG_CASES_FILE = path.join(ROOT_DIR, "seo-data", "blog-cases.json");
export const BLOG_CASES_ASSET_DIR = path.join(ROOT_DIR, "assets", "blog-cases");
export const BLOG_CASE_FALLBACK_IMAGE = "/assets/seo/vehicle-battery-default.jpg";

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeLoose(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[·ㆍ|/\\()[\]{}<>"'`’‘“”.,:;!?+\-_~\s]/g, "");
}

export function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)));
}

export function stripHtml(value) {
  return normalizeText(decodeXmlEntities(value).replace(/<[^>]+>/g, " "));
}

export function truncateText(value, maxLength) {
  const text = normalizeText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

export function toIsoDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatKoreanDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) {
    return "";
  }

  return value.replace(/-/g, ".");
}

export function extractNaverPostId(url) {
  try {
    const parsed = new URL(url);
    const logNo = parsed.searchParams.get("logNo");

    if (logNo && /^\d+$/.test(logNo)) {
      return logNo;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    const blogIdIndex = parts.findIndex((part) => part === BLOG_ID);
    const candidate = blogIdIndex >= 0 ? parts[blogIdIndex + 1] : parts[parts.length - 1];

    if (candidate && /^\d+$/.test(candidate)) {
      return candidate;
    }
  } catch {
    return "";
  }

  return "";
}

export function canonicalNaverPostUrl(url) {
  const postId = extractNaverPostId(url);

  if (!postId) {
    return normalizeText(url);
  }

  return `${BLOG_URL}/${postId}`;
}

export function localPathFromPublicPath(publicPath) {
  return path.join(ROOT_DIR, publicPath.replace(/^\//, "").split("/").join(path.sep));
}

export function fileExistsForPublicPath(publicPath) {
  if (!publicPath?.startsWith("/")) {
    return false;
  }

  return fs.existsSync(localPathFromPublicPath(publicPath));
}

export function urlPathToFilePath(urlPath) {
  const clean = String(urlPath ?? "").replace(/[?#].*$/, "");

  if (!clean || clean === "/") {
    return path.join(ROOT_DIR, "index.html");
  }

  const withoutSlash = clean.replace(/^\//, "");
  if (clean.endsWith("/")) {
    return path.join(ROOT_DIR, withoutSlash, "index.html");
  }

  return path.join(ROOT_DIR, withoutSlash);
}

export function shortHash(value) {
  let hash = 2166136261;
  const text = String(value ?? "");

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}
