import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { LAUNCHER_KEY, vehicleIdFromCanonical, encodeLauncherContext, decodeLauncherContext } from "../js/smart-consult-launcher-context.js";

const source = fs.readFileSync(new URL("../js/smart-consult-launcher.js", import.meta.url), "utf8");
const script = source.replace(/^import .*;\r?\n/gm, "");
const index = JSON.parse(fs.readFileSync(new URL("../seo-data/smart-consult-vehicles.json", import.meta.url), "utf8"));
function render(pathname, existing = true, storageFails = false) {
  const nodes = [];
  const storage = new Map([[LAUNCHER_KEY, "stale"]]);
  const element = tag => {
    const node = { tag, children: [], handlers: {}, setAttribute(k, v) { this[k] = v; },
      append(...children) { this.children.push(...children); },
      replaceWith(other) { this.replacement = other; }, remove() { this.removed = true; },
      addEventListener(name, handler) { this.handlers[name] = handler; } };
    nodes.push(node);
    return node;
  };
  const old = existing ? element("a") : null;
  if (old) { old.className = "smart-consult-launcher"; old.href = "/smart-consult/"; }
  const document = { head: element("head"), body: element("body"), createElement: element,
    querySelector(selector) {
      if (selector === ".smart-consult-launcher") return old;
      if (selector.includes("canonical")) return { href: `https://battery1.co.kr${pathname}` };
      if (selector.startsWith("link[href") && existing) return {};
      return null;
    } };
  vm.runInNewContext(script, { document, location: { pathname }, LAUNCHER_KEY, vehicleIdFromCanonical,
    encodeLauncherContext, bindSmartStoreLinks() {}, sessionStorage: {
      removeItem(k) { if (storageFails) throw Error("disabled"); storage.delete(k); },
      setItem(k, v) { storage.set(k, v); }
    } });
  return { nodes, storage, old };
}
for (const path of ["/", "/car-battery/bmw/x1.html", "/area/seoul/gangdong-gu.html", "/work-cases/"]) {
  const { nodes, storage } = render(path, path !== "/work-cases/");
  const nav = nodes.find(n => n.className === "global-bottom-cta");
  assert.equal(nav.children.length, 2);
  const [phone, ai] = nav.children;
  assert.equal(phone.href, "tel:1644-9141");
  assert.equal(ai.href, "/smart-consult/");
  assert.equal(phone.textContent, "☎ 전화 문의");
  assert.equal(ai.textContent, "✦ AI 배터리 상담");
  assert.equal(nodes.filter(n => n.className === "smart-consult-launcher").length, 1);
  ai.handlers.click({ preventDefault() { assert.fail("native navigation must not be canceled"); } });
  if (path.includes("bmw")) assert.equal(decodeLauncherContext(storage.get(LAUNCHER_KEY), index).id, "bmw/x1");
  else assert.equal(storage.has(LAUNCHER_KEY), false);
}
for (const path of ["/smart-consult/", "/smart-consult"]) {
  const result = render(path);
  assert.equal(result.nodes.some(n => n.className === "global-bottom-cta"), false);
  assert.equal(result.old.removed, true);
}
const disabled = render("/", true, true);
assert.doesNotThrow(() => disabled.old.handlers.click({}));
assert.equal(/preventDefault|consult_start|fetch\(/.test(source), false);
console.log("PASS: CTA links/replacement, work-case bootstrap, consultation exclusion, vehicle context, storage failure, native navigation; no new analytics events.");
