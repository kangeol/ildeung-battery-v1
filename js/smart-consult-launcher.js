import { LAUNCHER_KEY, vehicleIdFromCanonical, encodeLauncherContext } from "./smart-consult-launcher-context.js";
import { bindSmartStoreLinks } from "./smart-consult-store-open.js";

bindSmartStoreLinks();

const launcher = document.querySelector(".smart-consult-launcher");
let navigating = false;
if (launcher) {
  launcher.addEventListener("keydown", event => {
    if (event.code === "Space") { event.preventDefault(); launcher.click(); }
  });
  launcher.addEventListener("click", async event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    try {
      sessionStorage.removeItem(LAUNCHER_KEY);
      const id = vehicleIdFromCanonical(document.querySelector('link[rel="canonical"]')?.href);
      if (id) {
        const response = await fetch("/seo-data/smart-consult-vehicles.json", {signal:AbortSignal.timeout(4000)});
        if (response.ok) {
          const index = await response.json();
          const entry = index.vehicles.find(item => item.id === id);
          if (entry) sessionStorage.setItem(LAUNCHER_KEY, encodeLauncherContext(entry));
        }
      }
    } catch { /* Storage/network unavailable: safe generic entry. */ }
    location.assign("/smart-consult/");
  });
}
