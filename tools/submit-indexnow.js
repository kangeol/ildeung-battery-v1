import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const INDEXNOW_HOST = "battery1.co.kr";
const INDEXNOW_KEY = "6978cb295f204ff4944b57a9b53fa8a6";
const INDEXNOW_KEY_FILE = `${INDEXNOW_KEY}.txt`;
const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY_FILE}`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_RUNTIME_URLS = 100;
const RETRY_DELAYS_MS = [0, 30_000, 60_000];
const HTML_ROOTS = ["car-battery/", "area/", "battery/"];

function parseArgs(argv) {
  const args = {
    dryRun: false,
    fromGitDiff: false,
    output: "",
    result: "",
    input: "",
    paths: [],
    urls: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--from-git-diff") {
      args.fromGitDiff = true;
      continue;
    }

    if (arg === "--output") {
      args.output = argv[++index] || "";
      continue;
    }

    if (arg === "--result") {
      args.result = argv[++index] || "";
      continue;
    }

    if (arg === "--input") {
      args.input = argv[++index] || "";
      continue;
    }

    if (arg === "--paths") {
      while (argv[index + 1] && !argv[index + 1].startsWith("--")) {
        args.paths.push(argv[++index]);
      }
      continue;
    }

    if (arg.startsWith("https://")) {
      args.urls.push(arg);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: ROOT_DIR,
    encoding: "utf8"
  }).trim();
}

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^"|"$/g, "");
}

function parseStatusLine(line) {
  const status = line.slice(0, 2);
  const rawPath = line.slice(2).trimStart();
  const renameTarget = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) : rawPath;

  return {
    status,
    path: normalizePath(renameTarget)
  };
}

function isDeleted(status) {
  return status.includes("D");
}

function isIndexNowHtmlPath(filePath) {
  return filePath.endsWith(".html") && HTML_ROOTS.some((root) => filePath.startsWith(root));
}

function collectChangedHtmlFilesFromGit() {
  const output = runGit(["status", "--porcelain=v1", "-uall", "--", "car-battery", "area", "battery"]);

  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseStatusLine)
    .filter((change) => isIndexNowHtmlPath(change.path));
}

function getAttr(tag, attrName) {
  const pattern = new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] || "";
}

function extractCanonical(source) {
  for (const match of source.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getAttr(tag, "rel").toLowerCase();

    if (rel === "canonical") {
      return getAttr(tag, "href");
    }
  }

  return "";
}

function validateCanonicalUrl(value) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return { ok: false, reason: "not_https" };
    }

    if (url.hostname !== INDEXNOW_HOST) {
      return { ok: false, reason: "host_mismatch" };
    }

    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}

function snapshotStatus(urlCount) {
  if (urlCount === 0) {
    return "SKIPPED_NO_CHANGE";
  }

  if (urlCount > MAX_RUNTIME_URLS) {
    return "SKIPPED_ABNORMAL_CHANGESET";
  }

  return "DRY_RUN_READY";
}

function createSnapshot({ source, changes = [], urls = [] }) {
  const changedHtmlFiles = [];
  const skippedHtmlFiles = [];
  const canonicalUrls = [];

  changes.forEach((change) => {
    const filePath = normalizePath(typeof change === "string" ? change : change.path);
    const status = typeof change === "string" ? "M " : change.status;

    if (!isIndexNowHtmlPath(filePath)) {
      return;
    }

    changedHtmlFiles.push(filePath);

    if (isDeleted(status)) {
      skippedHtmlFiles.push({ path: filePath, reason: "deleted_file" });
      return;
    }

    const absolutePath = path.join(ROOT_DIR, filePath);

    if (!fs.existsSync(absolutePath)) {
      skippedHtmlFiles.push({ path: filePath, reason: "missing_file" });
      return;
    }

    const canonical = extractCanonical(fs.readFileSync(absolutePath, "utf8"));

    if (!canonical) {
      skippedHtmlFiles.push({ path: filePath, reason: "missing_canonical" });
      return;
    }

    const validated = validateCanonicalUrl(canonical);

    if (!validated.ok) {
      skippedHtmlFiles.push({ path: filePath, reason: validated.reason });
      return;
    }

    canonicalUrls.push(validated.url);
  });

  urls.forEach((url) => {
    const validated = validateCanonicalUrl(url);

    if (validated.ok) {
      canonicalUrls.push(validated.url);
    }
  });

  const uniqueUrls = [...new Set(canonicalUrls)].sort();

  return {
    generatedAt: new Date().toISOString(),
    source,
    endpoint: INDEXNOW_ENDPOINT,
    host: INDEXNOW_HOST,
    keyLocation: INDEXNOW_KEY_LOCATION,
    maxRuntimeUrls: MAX_RUNTIME_URLS,
    changedHtmlFiles: [...new Set(changedHtmlFiles)].sort(),
    canonicalUrls,
    urls: uniqueUrls,
    duplicatesRemoved: canonicalUrls.length - uniqueUrls.length,
    skippedHtmlFiles,
    urlCount: uniqueUrls.length,
    status: snapshotStatus(uniqueUrls.length)
  };
}

function readSnapshotOrUrlList(filePath) {
  const parsed = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, filePath), "utf8"));

  if (Array.isArray(parsed)) {
    return createSnapshot({ source: "input-url-list", urls: parsed });
  }

  const inputUrls = Array.isArray(parsed.urls)
    ? parsed.urls
    : Array.isArray(parsed.urlList)
      ? parsed.urlList
      : null;

  if (inputUrls) {
    const snapshot = createSnapshot({
      source: parsed.source || "input-url-list",
      urls: inputUrls
    });

    return {
      ...parsed,
      ...snapshot,
      changedHtmlFiles: Array.isArray(parsed.changedHtmlFiles) ? parsed.changedHtmlFiles : snapshot.changedHtmlFiles,
      canonicalUrls: Array.isArray(parsed.canonicalUrls) ? parsed.canonicalUrls : snapshot.canonicalUrls,
      skippedHtmlFiles: Array.isArray(parsed.skippedHtmlFiles) ? parsed.skippedHtmlFiles : snapshot.skippedHtmlFiles,
      duplicatesRemoved: (Array.isArray(parsed.canonicalUrls) ? parsed.canonicalUrls.length : inputUrls.length) - snapshot.urls.length,
      status: snapshotStatus(snapshot.urls.length)
    };
  }

  throw new Error(`Input file does not contain urls: ${filePath}`);
}

function writeJson(filePath, data) {
  if (!filePath) {
    return;
  }

  fs.mkdirSync(path.dirname(path.resolve(ROOT_DIR, filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(ROOT_DIR, filePath), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function verifyLocalKeyFile() {
  const keyPath = path.join(ROOT_DIR, INDEXNOW_KEY_FILE);

  if (!fs.existsSync(keyPath)) {
    throw new Error(`IndexNow key file missing: ${INDEXNOW_KEY_FILE}`);
  }

  const content = fs.readFileSync(keyPath, "utf8");

  if (content !== INDEXNOW_KEY) {
    throw new Error("IndexNow key file content does not match filename stem");
  }

  return {
    filename: INDEXNOW_KEY_FILE,
    contentMatch: true
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeResponseBody(body) {
  return String(body || "").replaceAll(INDEXNOW_KEY, "[indexnow-key]").slice(0, 500);
}

async function postIndexNow(urls) {
  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls
  };

  let lastResult = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }

    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(payload)
      });
      const body = await response.text();
      const retryable = response.status === 429 || response.status >= 500;

      lastResult = {
        httpStatus: response.status,
        responseBody: sanitizeResponseBody(body),
        attempt: attempt + 1,
        retryable
      };

      if (response.status === 200) {
        return {
          ...lastResult,
          status: "ACCEPTED"
        };
      }

      if (response.status === 202) {
        return {
          ...lastResult,
          status: "ACCEPTED_PENDING_KEY_VERIFICATION"
        };
      }

      if (!retryable) {
        return {
          ...lastResult,
          status: "FAILED"
        };
      }
    } catch (error) {
      lastResult = {
        httpStatus: "NETWORK_ERROR",
        responseBody: sanitizeResponseBody(error.message),
        attempt: attempt + 1,
        retryable: true
      };
    }
  }

  return {
    ...lastResult,
    status: "FAILED"
  };
}

function buildResult(snapshot, overrides = {}) {
  const changedHtmlFiles = Array.isArray(snapshot.changedHtmlFiles) ? snapshot.changedHtmlFiles : [];
  const canonicalUrls = Array.isArray(snapshot.canonicalUrls) ? snapshot.canonicalUrls : snapshot.urls;
  const skippedHtmlFiles = Array.isArray(snapshot.skippedHtmlFiles) ? snapshot.skippedHtmlFiles : [];

  return {
    mode: overrides.mode || "dry-run",
    endpoint: INDEXNOW_ENDPOINT,
    host: INDEXNOW_HOST,
    keyLocation: INDEXNOW_KEY_LOCATION,
    changedHtmlFiles: changedHtmlFiles.length,
    canonicalUrls: canonicalUrls.length,
    duplicatesRemoved: snapshot.duplicatesRemoved ?? 0,
    submittedUrls: overrides.submittedUrls ?? 0,
    urlCount: snapshot.urls.length,
    status: overrides.status || snapshot.status,
    httpStatus: overrides.httpStatus ?? null,
    response: overrides.response ?? "",
    attempts: overrides.attempts ?? 0,
    skippedHtmlFiles
  };
}

function logResult(result) {
  console.log("IndexNow Start");
  console.log(`Mode: ${result.mode}`);
  console.log(`Endpoint: ${result.endpoint}`);
  console.log(`Changed HTML files: ${result.changedHtmlFiles}`);
  console.log(`Canonical URLs: ${result.canonicalUrls}`);
  console.log(`Duplicates removed: ${result.duplicatesRemoved}`);
  console.log(`Submitted URLs: ${result.submittedUrls}`);
  console.log(`HTTP status: ${result.httpStatus ?? "n/a"}`);
  console.log(`Status: ${result.status}`);

  if (result.skippedHtmlFiles.length) {
    console.log(`Skipped HTML files: ${result.skippedHtmlFiles.length}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  verifyLocalKeyFile();

  let snapshot;

  if (args.fromGitDiff) {
    snapshot = createSnapshot({
      source: "git-diff",
      changes: collectChangedHtmlFilesFromGit()
    });
  } else if (args.paths.length) {
    snapshot = createSnapshot({
      source: "explicit-paths",
      changes: args.paths
    });
  } else if (args.input) {
    snapshot = readSnapshotOrUrlList(args.input);
  } else {
    snapshot = createSnapshot({
      source: "cli-urls",
      urls: args.urls
    });
  }

  writeJson(args.output, snapshot);

  if (args.dryRun) {
    const result = buildResult(snapshot, { mode: "dry-run" });
    writeJson(args.result, result);
    logResult(result);
    return;
  }

  if (snapshot.urls.length === 0) {
    const result = buildResult(snapshot, { mode: "submit", status: "SKIPPED_NO_CHANGE" });
    writeJson(args.result, result);
    logResult(result);
    return;
  }

  if (snapshot.urls.length > MAX_RUNTIME_URLS) {
    const result = buildResult(snapshot, { mode: "submit", status: "SKIPPED_ABNORMAL_CHANGESET" });
    writeJson(args.result, result);
    logResult(result);
    return;
  }

  const submitResult = await postIndexNow(snapshot.urls);
  const result = buildResult(snapshot, {
    mode: "submit",
    status: submitResult.status,
    httpStatus: submitResult.httpStatus,
    response: submitResult.responseBody,
    attempts: submitResult.attempt,
    submittedUrls: submitResult.status === "FAILED" ? 0 : snapshot.urls.length
  });

  writeJson(args.result, result);
  logResult(result);

  if (submitResult.status === "FAILED") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const result = {
    mode: "error",
    endpoint: INDEXNOW_ENDPOINT,
    host: INDEXNOW_HOST,
    keyLocation: INDEXNOW_KEY_LOCATION,
    changedHtmlFiles: 0,
    canonicalUrls: 0,
    duplicatesRemoved: 0,
    submittedUrls: 0,
    urlCount: 0,
    status: "FAILED",
    httpStatus: null,
    response: sanitizeResponseBody(error.message),
    attempts: 0,
    skippedHtmlFiles: []
  };

  const resultArgIndex = process.argv.indexOf("--result");
  const resultPath = resultArgIndex >= 0 ? process.argv[resultArgIndex + 1] : "";
  writeJson(resultPath, result);
  logResult(result);
  process.exit(1);
});
