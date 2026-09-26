import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const loggerUrl = pathToFileURL(path.join(root, "js", "analytics-logger.js")).href;
const savedGlobals = new Map();
let moduleSequence = 0;

function setGlobal(name, value, getter = false) {
  if (!savedGlobals.has(name)) savedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, getter
    ? { configurable: true, get: value }
    : { configurable: true, writable: true, value });
}

function restoreGlobals() {
  for (const [name, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  savedGlobals.clear();
}

function makeDocument(referrer = "") {
  const listeners = new Map();
  return {
    referrer,
    addEventListener(type, listener, options) {
      const entries = listeners.get(type) || [];
      entries.push({ listener, options });
      listeners.set(type, entries);
    },
    dispatchClick(target) {
      const event = { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      for (const { listener } of listeners.get("click") || []) listener(event);
      return event;
    },
    get clickListeners() { return listeners.get("click") || []; }
  };
}

function installEnvironment({ pathname = "/region/songdo/", search = "?utm_source=naver&utm_medium=search&utm_campaign=spring&private=do-not-send", referrer = "https://example.com/search?q=private-term", storage = new Map(), storageAvailable = true, cryptoAvailable = true, fetchImpl }) {
  const requests = [];
  const document = makeDocument(referrer);
  setGlobal("document", document);
  setGlobal("location", { pathname, search });
  if (storageAvailable) {
    setGlobal("sessionStorage", {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, value); }
    });
  } else {
    setGlobal("sessionStorage", () => { throw new Error("sessionStorage disabled"); }, true);
  }
  let uuid = 0;
  setGlobal("crypto", cryptoAvailable ? { randomUUID: () => `uuid-${++uuid}` } : {});
  setGlobal("fetch", fetchImpl || ((url, options) => {
    requests.push({ url, options });
    return Promise.resolve({ status: 201 });
  }));
  return { document, requests, storage };
}

function bodies(requests) {
  return requests.map(request => JSON.parse(request.options.body));
}

function targetFor(anchor, selector) {
  return { nodeType: 1, closest(value) { return value === selector ? anchor : null; } };
}

try {
  const storage = new Map();
  const first = installEnvironment({ storage });
  const logger = await import(`${loggerUrl}?test=${++moduleSequence}`);
  let events = bodies(first.requests);
  assert.deepEqual(events.map(event => event.event_type), ["session_start", "page_view"]);
  assert.equal(events[0].anonymous_session_id, events[1].anonymous_session_id);
  assert.equal(events[0].page_path, "/region/songdo/");
  assert.equal(events[0].landing_page, "/region/songdo/");
  assert.equal(events[0].utm_source, "naver");
  assert.equal(events[0].utm_medium, "search");
  assert.equal(events[0].utm_campaign, "spring");
  assert.equal(events[0].referrer_url, "https://example.com/search");
  assert.doesNotMatch(JSON.stringify(events), /private=do-not-send|private-term|[?&]q=/);
  assert.equal(first.requests[0].options.credentials, "omit");
  assert.equal(first.requests[0].options.keepalive, true);
  assert.equal(first.requests[0].options.method, "POST");
  assert.equal(first.document.clickListeners[0].options.capture, true);
  assert.equal(first.document.clickListeners[0].options.passive, true);

  logger.trackCustomerMessage("첫 질문\n010-1234-5678");
  logger.trackCustomerMessage("추가 질문");
  logger.trackAssistantMessage("최종 답변");
  const phoneAnchor = { href: "tel:16449141" };
  first.document.dispatchClick(targetFor(phoneAnchor, 'a[href^="tel:"]'));
  const storeAnchor = { href: "https://smartstore.naver.com/battery1/products/414050800" };
  first.document.dispatchClick(targetFor(storeAnchor, "a.price-link-card[href], a.quick-link-card[href], a.btn.store[href], a.result-action.secondary[href]"));
  events = bodies(first.requests);
  assert.deepEqual(events.slice(2).map(event => event.event_type), ["consult_start", "customer_message", "customer_message", "assistant_message", "phone_click", "smartstore_click"]);
  assert.equal(events[3].payload_json.message, "첫 질문\n010-1234-5678", "logger sends the accepted visible text unchanged; the admin masks before storage");
  assert.deepEqual(events[6].payload_json, { cta_type: "phone" });
  assert.deepEqual(events[7].payload_json, { cta_type: "smartstore" });
  assert.equal(events[2].anonymous_session_id, events[0].anonymous_session_id);
  assert.equal(events[7].page_path, "/region/songdo/");
  assert.equal(events.some(event => Object.hasOwn(event, "raw_ip")), false);

  const navigated = installEnvironment({ pathname: "/smart-consult/", search: "?unapproved=ignored", referrer: "https://battery1.co.kr/region/songdo/", storage });
  await import(`${loggerUrl}?test=${++moduleSequence}`);
  const nextPageEvents = bodies(navigated.requests);
  assert.deepEqual(nextPageEvents.map(event => event.event_type), ["page_view"], "same tab keeps one session_start across page navigation");
  assert.equal(nextPageEvents[0].anonymous_session_id, events[0].anonymous_session_id);
  assert.equal(nextPageEvents[0].landing_page, "/region/songdo/");
  assert.equal(nextPageEvents[0].utm_campaign, "spring");
  assert.equal(Object.hasOwn(nextPageEvents[0], "unapproved"), false);

  const searchReferrers = [
    { referrer: "https://search.naver.com/search.naver?query=%20배터리%20교체%20&where=blog", expected: "배터리 교체" },
    { referrer: "https://www.google.com/search?q=%20자동차%20배터리%20&tbm=web", expected: "자동차 배터리" },
    { referrer: "https://search.naver.com/search.naver?where=blog", expected: undefined },
    { referrer: "https://www.google.com/search?tbm=web", expected: undefined },
    { referrer: "https://example.com/search?q=not-a-search-term", expected: undefined },
    { referrer: `https://www.google.com/search?q=${"긴검색어".repeat(80)}`, expected: "긴검색어".repeat(66).slice(0, 200) }
  ];
  for (const item of searchReferrers) {
    const env = installEnvironment({ storage: new Map(), referrer: item.referrer, search: "?utm_source=naver&utm_medium=search&utm_campaign=spring&private=ignored" });
    await import(`${loggerUrl}?test=${++moduleSequence}`);
    const event = bodies(env.requests)[0];
    assert.equal(event.search_keyword, item.expected);
    assert.equal(event.utm_source, "naver", "search-term capture leaves UTM behavior unchanged");
    assert.equal(event.utm_campaign, "spring");
    assert.equal(event.referrer_url.includes("?"), false, "arbitrary referrer query parameters are never sent");
    assert.equal(Object.hasOwn(event, "where"), false);
    assert.equal(Object.hasOwn(event, "tbm"), false);
    if (event.search_keyword) assert.ok(event.search_keyword.length <= 200);
  }

  const failures = installEnvironment({
    pathname: "/smart-consult/",
    storageAvailable: false,
    cryptoAvailable: false,
    fetchImpl() { throw new Error("Worker unavailable"); }
  });
  const failureLogger = await import(`${loggerUrl}?test=${++moduleSequence}`);
  assert.doesNotThrow(() => failureLogger.trackCustomerMessage("실제 화면 입력"));
  assert.doesNotThrow(() => failureLogger.trackAssistantMessage("최종 표시 답변"));
  const responseFailures = installEnvironment({ fetchImpl: () => Promise.resolve({ status: 403 }) });
  const responseLogger = await import(`${loggerUrl}?test=${++moduleSequence}`);
  assert.doesNotThrow(() => responseLogger.trackCustomerMessage("거부되어도 화면은 계속됨"));
  const serverFailures = installEnvironment({ fetchImpl: () => Promise.resolve({ status: 500 }) });
  const serverLogger = await import(`${loggerUrl}?test=${++moduleSequence}`);
  assert.doesNotThrow(() => serverLogger.trackAssistantMessage("저장 오류여도 응답 흐름은 계속됨"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(failures.requests.length, 0);
  assert.equal(responseFailures.requests.length, 0);
  assert.equal(serverFailures.requests.length, 0);

  console.log("Focused analytics logger checks passed: session/page, actual UTM, clicks, consultation events, navigation persistence, and failure isolation.");
} finally {
  restoreGlobals();
}
