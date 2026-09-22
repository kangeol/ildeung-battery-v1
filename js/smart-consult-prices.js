// Price truth is injected from data/battery-prices.json, never copied into code.
const compact = value => String(value || "").normalize("NFKC").toUpperCase().replace(/\s/g, "");
export function normalizeBatteryCode(value, catalog) {
  const code = compact(value);
  return catalog?.aliases?.[code] || code;
}
export function batteryPrice(value, catalog, brand = "") {
  const code = normalizeBatteryCode(value, catalog);
  const selected = brand || (/^AGM/.test(code) ? catalog?.defaultAgmBrand : "");
  const definition = catalog?.brands?.[selected];
  const supported = !selected || (definition?.baseFamily === 'AGM' && /^AGM/.test(code)) || Object.hasOwn(definition?.prices || {},code);
  const amount = catalog?.currency === "KRW" && supported ? (definition?.prices ? definition.prices[code] : catalog.prices?.[code]) : null;
  return { code, brand:selected || "", supported:Boolean(supported), amount: Number.isSafeInteger(amount) && amount > 0 ? amount : null };
}
export function formatWon(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid KRW amount");
  const man = Math.floor(amount / 10000), rest = amount % 10000;
  return `${man ? `${man}만` : ""}${rest ? (rest % 1000 === 0 ? `${rest / 1000}천` : rest) : ""}원`;
}
export function splitBatterySpec(value) {
  return [...new Set(String(value || "").split(/\s*(?:또는|\/)\s*/).map(s => s.trim()).filter(Boolean))];
}
export function priceDescription(value, catalog, brand = "") {
  const parts = splitBatterySpec(value);
  if (!parts.length || parts.some(p => /문의|확인/.test(p))) return "이 규격은 정확한 가격 확인이 필요합니다.";
  const prices = parts.map(p => batteryPrice(p, catalog,brand));
  const lines = prices.map(p => {
    const label=catalog?.brands?.[p.brand]?.label;
    if(!p.supported && p.brand==='VARTA')return `현재 바르타 AGM은 ${Object.keys(catalog.brands.VARTA.prices).join('·')} 규격을 안내하고 있습니다. ${p.code}는 바르타 판매 지원 규격이 아닙니다.`;
    if(!p.supported && label)return `${p.code}는 현재 ${label} 브랜드 가격 안내 범위에 포함되지 않습니다.`;
    if(p.amount===null && !Object.hasOwn(catalog?.prices||{},p.code) && !catalog?.unpriced?.includes(p.code))return `${p.code}는 현재 등록된 규격이 아닙니다. 정확한 규격과 가격 확인이 필요합니다.`;
    return p.amount === null ? `${label ? `${label} ` : ''}${p.code}: 정확한 가격 확인이 필요합니다.` : `${p.code} ${label ? `${label} 기준 ` : ''}교체 가격은 ${formatWon(p.amount)}입니다.`;
  });
  if (parts.length > 1) return `차량에 따라 ${prices.map(p => p.code).join(" 또는 ")} 중 하나가 장착될 수 있습니다.\n${lines.join("\n")}\n정확한 규격은 현재 장착된 배터리를 현장에서 확인해야 합니다.`;
  return lines.join("\n");
}
export function brandIntent(text,catalog) {
  const s=compact(text);let found=null,last=-1;
  for(const [brand,definition] of Object.entries(catalog?.brands||{}))for(const alias of definition.aliases){const index=s.lastIndexOf(compact(alias));if(index>last){found=brand;last=index;}}
  return found;
}
export function withoutBrand(text,catalog) {
  let result=String(text);
  for(const definition of Object.values(catalog?.brands||{}))for(const alias of definition.aliases)result=result.replace(new RegExp(alias.split('').join('\\s*')+'(?:\\s*배터리)?','gi'),'');
  return result.trim();
}
export function directPriceSpec(text, catalog = null, brandRequested = false) {
  // A whole catalog-backed product code is a price lookup, never vehicle fitment.
  // Brand removal happens in the caller; accept its remaining follow-up suffix only
  // when the customer explicitly named a brand in this same turn.
  const cleaned=String(text).normalize("NFKC").trim().replace(/[?!.,]+$/, "");
  const standalone=brandRequested ? cleaned.replace(/\s*(?:으로|로)?\s*하면$/, "") : cleaned;
  const canonical=normalizeBatteryCode(standalone,catalog);
  if (Object.hasOwn(catalog?.prices || {},canonical)) return canonical;
  // A whole battery-only price question; never steal a vehicle/area multi-intent turn.
  const code = "(?:AGM\\s*\\d+(?:R)?|DIN\\s*\\d+(?:HL|L|R)?|DF\\s*\\d+(?:AL|L|R)|\\d+(?:AL|L|R)|65\\s*-\\s*900)";
  const match = String(text).normalize("NFKC").match(new RegExp(`^\\s*(${code}(?:\\s*(?:또는|/)\\s*${code})*)\\s*(?:배터리\\s*)?(?:(?:교체\\s*)?(?:가격|비용|얼마|견적|있어요|있나요))[가-힣\\s?!.,]*$`, "i"));
  return match?.[1] || null;
}
