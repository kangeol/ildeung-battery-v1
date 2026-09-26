export const APPROVED_SMARTSTORE_URLS = Object.freeze([
  "https://smartstore.naver.com/battery1",
  "https://smartstore.naver.com/battery1/products/414050800",
  "https://smartstore.naver.com/battery1/products/575288571"
]);

const APPROVED_URL_SET = new Set(APPROVED_SMARTSTORE_URLS);
const MOBILE_AGENT = /Android|iPhone|iPad|iPod/i;
const NAVER_APP_AGENT = /NAVER/i;

export function approvedSmartStoreUrl(value) {
  if (typeof value !== "string" || !APPROVED_URL_SET.has(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname !== "smartstore.naver.com"
      || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash
      || parsed.href !== value) return null;
    return value;
  } catch {
    return null;
  }
}

export function naverInAppBrowserUrl(destination) {
  const approved = approvedSmartStoreUrl(destination);
  if (!approved) return null;
  return `naversearchapp://inappbrowser?url=${encodeURIComponent(approved)}&target=new&version=6`;
}

export function isNaverHandoffContext(userAgent = "") {
  return MOBILE_AGENT.test(userAgent) && !NAVER_APP_AGENT.test(userAgent);
}

// Return false for desktop/unsupported destinations so the existing HTTPS anchor
// performs its native navigation unchanged.
export function openSmartStoreFromClick(destination, environment = {}) {
  const approved = approvedSmartStoreUrl(destination);
  if (!approved) return false;

  const userAgent = environment.userAgent ?? globalThis.navigator?.userAgent ?? "";
  if (!isNaverHandoffContext(userAgent)) return false;

  const doc = environment.document ?? globalThis.document;
  const win = environment.window ?? globalThis.window;
  const location = environment.location ?? win?.location;
  const setTimer = environment.setTimeout ?? globalThis.setTimeout;
  const clearTimer = environment.clearTimeout ?? globalThis.clearTimeout;
  if (!location?.assign || !doc?.addEventListener || !win?.addEventListener) return false;

  let handedOff = false;
  let timer;
  const startedAt = Date.now();
  const cleanup = () => {
    clearTimer(timer);
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    win.removeEventListener("pagehide", onPageHide);
  };
  const onVisibilityChange = () => {
    if (doc.hidden) {
      handedOff = true;
      cleanup();
    }
  };
  const onPageHide = () => {
    handedOff = true;
    cleanup();
  };

  doc.addEventListener("visibilitychange", onVisibilityChange);
  win.addEventListener("pagehide", onPageHide, { once: true });
  timer = setTimer(() => {
    const elapsed = Date.now() - startedAt;
    cleanup();
    if (!handedOff && elapsed < 2500 && !doc.hidden) location.assign(approved);
  }, 1500);

  try {
    location.assign(naverInAppBrowserUrl(approved));
  } catch {
    cleanup();
    location.assign(approved);
  }
  return true;
}

export function bindSmartStoreLinks(documentObject = globalThis.document, options = {}) {
  if (!documentObject?.addEventListener) return;
  documentObject.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target?.closest?.("a.price-link-card[href], a.quick-link-card[href], a.btn.store[href], a.result-action.secondary[href]");
    if (!anchor) return;
    const destination = anchor.getAttribute("href");
    if (!approvedSmartStoreUrl(destination)) {
      event.preventDefault();
      return;
    }
    if (openSmartStoreFromClick(destination, { document: documentObject, ...options })) event.preventDefault();
  }, true);
}
