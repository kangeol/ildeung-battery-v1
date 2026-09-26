import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  APPROVED_SMARTSTORE_URLS,
  approvedSmartStoreUrl,
  bindSmartStoreLinks,
  isNaverHandoffContext,
  naverInAppBrowserUrl,
  openSmartStoreFromClick
} from "../js/smart-consult-store-open.js";

const root = process.cwd();
const urlPattern = /https:\/\/smartstore\.naver\.com\/battery1(?:\/products\/\d+)?/g;
const urlCounts = new Map();
const pinnedLines = execFileSync("git", ["grep", "-n", "-o", "-I", "-E", "https://smartstore\\.naver\\.com/battery1(/products/[0-9]+)?", "HEAD", "--", "*.html"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim().split(/\r?\n/);
const pinnedByPath = new Map();
const launcherPaths = new Set(execFileSync("git", ["grep", "-l", "smart-consult-launcher\\.js", "HEAD", "--", "*.html"], { encoding: "utf8" }).trim().split(/\r?\n/).map(row => row.replace(/^HEAD:/, "")));
for (const line of pinnedLines) {
  const match = line.match(/^HEAD:(.*?):\d+:(https:\/\/smartstore\.naver\.com\/battery1(?:\/products\/\d+)?)$/);
  assert.ok(match, `Unexpected git grep ledger row: ${line}`);
  const [, path, url] = match;
  const urls = pinnedByPath.get(path) || [];
  urls.push(url);
  pinnedByPath.set(path, urls);
}
let htmlLinkCount = 0;
for (const [path, urls] of pinnedByPath) {
  htmlLinkCount += urls.length;
  assert.ok(launcherPaths.has(path), `${path} must load the shared purchase-link handler`);
  const after = fs.readFileSync(path, "utf8");
  assert.deepEqual(after.match(urlPattern) || [], urls, `SmartStore destinations/order changed in ${path}`);
  for (const url of urls) urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
}
const expectedUrls = [
  "https://smartstore.naver.com/battery1",
  "https://smartstore.naver.com/battery1/products/414050800",
  "https://smartstore.naver.com/battery1/products/575288571"
];
assert.deepEqual([...urlCounts.keys()].sort(), [...expectedUrls].sort());
assert.deepEqual([...APPROVED_SMARTSTORE_URLS].sort(), [...expectedUrls].sort());
const ledger = [...urlCounts].sort(([a], [b]) => a.localeCompare(b)).map(([url, count]) => `${url}\t${count}`).join("\n") + "\n";
const ledgerSha256 = crypto.createHash("sha256").update(ledger).digest("hex");

const din = expectedUrls[1];
assert.equal(approvedSmartStoreUrl(din), din);
for (const invalid of [
  "javascript:alert(1)", "data:text/html,hello", "https://example.com/",
  "https://smartstore.naver.com.evil.test/battery1", "https://user@smartstore.naver.com/battery1",
  `${din}?redirect=https://example.com`, `${din}#fragment`, "https://smartstore.naver.com/battery1/products/999"
]) assert.equal(approvedSmartStoreUrl(invalid), null, invalid);

const invocation = naverInAppBrowserUrl(din);
assert.equal(invocation, `naversearchapp://inappbrowser?url=${encodeURIComponent(din)}&target=new&version=6`);
assert.equal(decodeURIComponent(new URL(invocation).searchParams.get("url")), din);
assert.equal(isNaverHandoffContext("Mozilla/5.0 (Linux; Android 14)"), true);
assert.equal(isNaverHandoffContext("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), true);
assert.equal(isNaverHandoffContext("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), false);
assert.equal(isNaverHandoffContext("Mozilla/5.0 (Linux; Android 14) NAVER(inapp; search; 2300)"), false);

function harness({ hidden = false } = {}) {
  const calls = [], docListeners = new Map(), winListeners = new Map();
  let timerCallback = null, cleared = false;
  const document = {
    hidden,
    addEventListener: (name, fn) => docListeners.set(name, fn),
    removeEventListener: name => docListeners.delete(name)
  };
  const window = {
    addEventListener: (name, fn) => winListeners.set(name, fn),
    removeEventListener: name => winListeners.delete(name)
  };
  const location = { assign: value => calls.push(value) };
  const env = {
    userAgent: "Android",
    document, window, location,
    setTimeout: fn => { timerCallback = fn; return 1; },
    clearTimeout: () => { cleared = true; }
  };
  return { calls, docListeners, winListeners, env, timer: () => timerCallback?.(), cleared: () => cleared };
}
const desktop = harness();
desktop.env.userAgent = "Windows NT 10.0";
assert.equal(openSmartStoreFromClick(din, desktop.env), false, "desktop keeps native HTTPS anchor behavior");
assert.deepEqual(desktop.calls, []);

const mobile = harness();
assert.equal(openSmartStoreFromClick(din, mobile.env), true);
assert.deepEqual(mobile.calls, [invocation], "one top-level Naver app invocation, no popup/tab");
mobile.timer();
assert.deepEqual(mobile.calls, [invocation, din], "unsupported/unavailable app falls back to exact HTTPS in same tab");
assert.equal(mobile.cleared(), true);

const handedOff = harness();
openSmartStoreFromClick(din, handedOff.env);
handedOff.env.document.hidden = true;
handedOff.docListeners.get("visibilitychange")();
handedOff.timer();
assert.deepEqual(handedOff.calls, [invocation], "successful app handoff does not perform a second navigation");

const failedLaunch = harness();
failedLaunch.env.location.assign = value => {
  failedLaunch.calls.push(value);
  if (value.startsWith("naversearchapp:")) throw new Error("unsupported custom scheme");
};
assert.equal(openSmartStoreFromClick(din, failedLaunch.env), true);
assert.deepEqual(failedLaunch.calls, [invocation, din], "synchronous scheme failure falls back to the exact HTTPS destination");

const unsupported = harness({ hidden: true });
unsupported.env.document.hidden = false;
unsupported.env.userAgent = "iPhone NAVER(inapp)";
assert.equal(openSmartStoreFromClick(din, unsupported.env), false, "Naver's own webview is left on exact HTTPS behavior");

let clickListener, prevented = false;
const anchor = { getAttribute: name => name === "href" ? din : null };
const documentObject = { addEventListener: (_name, callback, capture) => { clickListener = callback; assert.equal(capture, true); } };
bindSmartStoreLinks(documentObject, { userAgent: "Windows NT 10.0" });
clickListener({ defaultPrevented: false, button: 0, target: { closest: () => anchor }, preventDefault: () => { prevented = true; } });
assert.equal(prevented, false, "desktop native link remains unchanged");
clickListener({ defaultPrevented: false, button: 0, target: { closest: () => ({ getAttribute: () => "javascript:alert(1)" }) }, preventDefault: () => { prevented = true; } });
assert.equal(prevented, true, "unsafe purchase-button destination is blocked");
let mobileClick, mobilePrevented = false;
const mobileDocument = { ...mobile.env.document, addEventListener: (name, callback) => { if (name === "click") mobileClick = callback; } };
bindSmartStoreLinks(mobileDocument, { ...mobile.env, document: mobileDocument });
mobileClick({ defaultPrevented: false, button: 0, target: { closest: () => anchor }, preventDefault: () => { mobilePrevented = true; } });
assert.equal(mobilePrevented, true, "mobile browser click is intercepted once for app handoff");

console.log(JSON.stringify({ status: "PASS", mappedUrls: [...urlCounts], mappedUrlReferences: htmlLinkCount, ledgerSha256, mobileScheme: invocation, fallback: din, securityCases: 9, scenarios: 10 }, null, 2));
