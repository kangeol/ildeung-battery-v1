// Price truth is injected from data/battery-prices.json, never copied into code.
const compact = value => String(value || "").normalize("NFKC").toUpperCase().replace(/\s/g, "");
export function normalizeBatteryCode(value, catalog) {
  const code = compact(value);
  return catalog?.aliases?.[code] || code;
}
export function batteryPrice(value, catalog) {
  const code = normalizeBatteryCode(value, catalog);
  const amount = catalog?.currency === "KRW" ? catalog.prices?.[code] : null;
  return { code, amount: Number.isSafeInteger(amount) && amount > 0 ? amount : null };
}
export function formatWon(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid KRW amount");
  const man = Math.floor(amount / 10000), rest = amount % 10000;
  return `${man ? `${man}만` : ""}${rest ? (rest % 1000 === 0 ? `${rest / 1000}천` : rest) : ""}원`;
}
export function splitBatterySpec(value) {
  return [...new Set(String(value || "").split(/\s*(?:또는|\/)\s*/).map(s => s.trim()).filter(Boolean))];
}
export function priceDescription(value, catalog) {
  const parts = splitBatterySpec(value);
  if (!parts.length || parts.some(p => /문의|확인/.test(p))) return "이 규격은 정확한 가격 확인이 필요합니다.";
  const prices = parts.map(p => batteryPrice(p, catalog));
  const lines = prices.map(p => p.amount === null ? `${p.code}: 정확한 가격 확인이 필요합니다.` : `${p.code} 교체 가격은 ${formatWon(p.amount)}입니다.`);
  if (parts.length > 1) return `차량에 따라 ${prices.map(p => p.code).join(" 또는 ")} 중 하나가 장착될 수 있습니다.\n${lines.join("\n")}\n정확한 규격은 현재 장착된 배터리를 현장에서 확인해야 합니다.`;
  return lines.join("\n");
}
export function directPriceSpec(text) {
  // A whole battery-only price question; never steal a vehicle/area multi-intent turn.
  const code = "(?:AGM\\s*\\d+(?:R)?|DIN\\s*\\d+(?:HL|L|R)?|DF\\s*\\d+(?:AL|L|R)|\\d+(?:AL|L|R)|65\\s*-\\s*900)";
  const match = String(text).normalize("NFKC").match(new RegExp(`^\\s*(${code}(?:\\s*(?:또는|/)\\s*${code})*)\\s*(?:배터리\\s*)?(?:(?:교체\\s*)?(?:가격|비용|얼마|견적))[가-힣\\s?!.,]*$`, "i"));
  return match?.[1] || null;
}
