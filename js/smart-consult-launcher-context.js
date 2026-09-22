export const LAUNCHER_KEY = "ildeung.smart-consult.launcher.v1";
export const ENTRY_MAX_AGE = 5 * 60 * 1000;
export function vehicleIdFromCanonical(canonical) {
  try {
    const url = new URL(canonical);
    if (url.origin !== "https://battery1.co.kr" || url.search || url.hash) return null;
    return /^\/car-battery\/([a-z0-9-]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)\.html$/.exec(url.pathname)?.[1] || null;
  } catch { return null; }
}
export function encodeLauncherContext(entry, now = Date.now()) {
  return JSON.stringify({schemaVersion:1,source:"vehicle-page",canonicalVehicleId:entry.id,timestamp:now});
}
export function decodeLauncherContext(raw, index, now = Date.now()) {
  try {
    if (typeof raw !== "string" || raw.length > 500) return null;
    const value = JSON.parse(raw);
    if (Object.keys(value).sort().join() !== "canonicalVehicleId,schemaVersion,source,timestamp" || value.schemaVersion !== 1 || value.source !== "vehicle-page" || !Number.isFinite(value.timestamp) || value.timestamp > now || now-value.timestamp > ENTRY_MAX_AGE) return null;
    return index.vehicles.find(entry => entry.id === value.canonicalVehicleId) || null;
  } catch { return null; }
}
export function hasEntryConflict(saved, entry) {
  if (!saved || !entry) return false;
  const s = saved.state;
  if (!s.selectedVehicleKey) return s.turnCount > 0 || saved.messages.some(m => m.role === "user");
  if (s.selectedVehicleKey !== `${entry.manufacturerId}|${entry.vehicle}`) return true;
  if (!entry.details.length || entry.details.includes(s.detailModel)) return false;
  return entry.details.length !== s.detailModels.length || entry.details.some(detail => !s.detailModels.includes(detail));
}
