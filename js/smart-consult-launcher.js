import { LAUNCHER_KEY, vehicleIdFromCanonical, encodeLauncherContext } from "./smart-consult-launcher-context.js";
import { bindSmartStoreLinks } from "./smart-consult-store-open.js";
import "./analytics-logger.js";

bindSmartStoreLinks();

let launcher = document.querySelector(".smart-consult-launcher");
if (/^\/smart-consult(?:\/|$)/.test(location.pathname)) {
  launcher?.remove();
} else if (!document.querySelector(".global-bottom-cta")) {
  if (!document.querySelector('link[href="/css/smart-consult-launcher.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/css/smart-consult-launcher.css";
    document.head.append(stylesheet);
  }
  if (!launcher) {
    launcher = document.createElement("a");
    launcher.className = "smart-consult-launcher";
    launcher.href = "/smart-consult/";
    launcher.setAttribute("aria-label", "AI 배터리 상담");
    document.body.append(launcher);
  }
  const cta = document.createElement("nav");
  cta.className = "global-bottom-cta";
  cta.setAttribute("aria-label", "전화 및 AI 배터리 상담");
  const phone = document.createElement("a");
  phone.className = "global-bottom-cta-phone";
  phone.href = "tel:1644-9141";
  phone.textContent = "☎ 전화 문의";
  phone.setAttribute("aria-label", "전화 문의 1644-9141");
  launcher.textContent = "✦ AI 배터리 상담";
  launcher.replaceWith(cta);
  cta.append(phone, launcher);

  launcher.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    try {
      sessionStorage.removeItem(LAUNCHER_KEY);
      const id = vehicleIdFromCanonical(document.querySelector('link[rel="canonical"]')?.href);
      // The destination validates this identifier against its existing vehicle index.
      if (id) sessionStorage.setItem(LAUNCHER_KEY, encodeLauncherContext({ id }));
    } catch { /* Storage unavailable: the native link still opens generic consultation. */ }
  });
}
