import { approvedSmartStoreUrl } from "./smart-consult-store-open.js";

const ENDPOINT = "https://ildeung-admin-analytics.ildeung-admin-analytics.workers.dev/api/events";
const STORAGE_KEY = "ildeung_analytics_session_v1";
const PHONE_LINK_SELECTOR = 'a[href^="tel:"]';
const STORE_LINK_SELECTOR = "a.price-link-card[href], a.quick-link-card[href], a.btn.store[href], a.result-action.secondary[href]";
let memoryState;

function randomId(prefix) {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  try {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  } catch {
    return `${prefix}-${Date.now().toString(36)}`;
  }
}

function currentPath() {
  try {
    const pathname = globalThis.location?.pathname;
    return typeof pathname === "string" && pathname.startsWith("/") ? pathname.slice(0, 512) : "/";
  } catch {
    return "/";
  }
}

function actualUtm() {
  const values = {};
  try {
    const params = new URLSearchParams(globalThis.location?.search || "");
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
      const value = params.get(key);
      if (value) values[key] = value;
    }
  } catch {}
  return values;
}

function safeReferrer() {
  try {
    const raw = globalThis.document?.referrer;
    if (!raw) return undefined;
    const referrer = new URL(raw);
    if (!["http:", "https:"].includes(referrer.protocol) || referrer.username || referrer.password) return undefined;
    return `${referrer.origin}${referrer.pathname}`.slice(0, 1024);
  } catch {
    return undefined;
  }
}

function actualSearchKeyword() {
  try {
    const raw = globalThis.document?.referrer;
    if (!raw) return undefined;
    const referrer = new URL(raw);
    const host = referrer.hostname.toLowerCase();
    const naver = host === "naver.com" || host.endsWith(".naver.com");
    const google = host === "google.com" || host.endsWith(".google.com")
      || host === "google.co.kr" || host.endsWith(".google.co.kr");
    const value = naver ? referrer.searchParams.get("query") : google ? referrer.searchParams.get("q") : null;
    const keyword = typeof value === "string" ? value.trim().slice(0, 200) : "";
    return keyword || undefined;
  } catch {
    return undefined;
  }
}

function saveState(state) {
  memoryState = state;
  try { globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function getState() {
  if (memoryState) return memoryState;
  try {
    const stored = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.id === "string" && typeof parsed.landing_page === "string") {
        memoryState = parsed;
        return parsed;
      }
    }
  } catch {}
  const state = {
    id: randomId("anon"),
    landing_page: currentPath(),
    utm: actualUtm(),
    referrer_url: safeReferrer(),
    search_keyword: actualSearchKeyword(),
    sessionStarted: false,
    consultStarted: false
  };
  saveState(state);
  return state;
}

function send(eventType, payload) {
  try {
    const state = getState();
    const event = {
      event_id: randomId("evt"),
      anonymous_session_id: state.id,
      occurred_at: new Date().toISOString(),
      event_type: eventType,
      page_path: currentPath(),
      landing_page: state.landing_page
    };
    if (state.referrer_url) event.referrer_url = state.referrer_url;
    if (state.search_keyword) event.search_keyword = state.search_keyword;
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
      if (state.utm?.[key]) event[key] = state.utm[key];
    }
    if (payload) event.payload_json = payload;
    const request = fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      credentials: "omit",
      keepalive: true,
      mode: "cors"
    });
    Promise.resolve(request).catch(() => {});
  } catch {}
}

function trackCustomerMessage(message) {
  try {
    const state = getState();
    if (!state.consultStarted) {
      state.consultStarted = true;
      saveState(state);
      send("consult_start");
    }
    send("customer_message", { message });
  } catch {}
}

function trackAssistantMessage(message) {
  try { send("assistant_message", { message }); } catch {}
}

function bindClickTracking() {
  try {
    globalThis.document?.addEventListener("click", event => {
      try {
        const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
        const phoneLink = target?.closest?.(PHONE_LINK_SELECTOR);
        if (phoneLink) send("phone_click", { cta_type: "phone" });

        const storeLink = target?.closest?.(STORE_LINK_SELECTOR);
        if (storeLink && approvedSmartStoreUrl(storeLink.href)) send("smartstore_click", { cta_type: "smartstore" });
      } catch {}
    }, { capture: true, passive: true });
  } catch {}
}

function initialize() {
  try {
    const state = getState();
    if (!state.sessionStarted) {
      state.sessionStarted = true;
      saveState(state);
      send("session_start");
    }
    send("page_view");
    bindClickTracking();
  } catch {}
}

initialize();

export { trackAssistantMessage, trackCustomerMessage };
