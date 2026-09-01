import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SITEMAP_FILE = path.join(ROOT_DIR, "sitemap.xml");
const SITE_ORIGIN = "https://battery1.co.kr";

const STATIC_PAGES = [
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
      return;
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

function renderSitemap(entries) {
  const body = entries.map((entry) => `  <url>
    <loc>${entry.loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function generateSitemap() {
  const entries = buildEntries();
  fs.writeFileSync(SITEMAP_FILE, renderSitemap(entries), "utf8");
  return entries;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const entries = generateSitemap();
  console.log("Sitemap Generate Complete");
  console.log(`Total URLs: ${entries.length}`);
}
