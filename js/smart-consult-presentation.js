import { batteryPrice, formatWon, priceDescription, splitBatterySpec } from './smart-consult-prices.js?v=owner-delkor-v1';

// Exact canonical output matching is decoration only. Unknown text stays verbatim.
// Never parse an arbitrary sentence into a vehicle fitment or a monetary value.
export function presentationIndex(catalog, policy) {
  const prices = new Map();
  for (const code of Object.keys(catalog.prices)) {
    for (const brand of ['', ...Object.keys(catalog.brands)]) {
      const price = batteryPrice(code, catalog, brand);
      if (price.amount === null) continue;
      prices.set(priceDescription(code, catalog, brand), {
        code: price.code, brand: catalog.brands[price.brand]?.label || '', amount: formatWon(price.amount)
      });
    }
  }
  const secondary = new Set([policy.summary, policy.product.comparisonContext.support,
    policy.product.comparisonContext.performance, policy.product.lifespan, policy.product.comparisonContext.causal]);
  return { prices, secondary, brands: Object.values(catalog.brands).map(b => b.label) };
}

export function messagePresentation(text, index) {
  return {
    secondary: index?.secondary.has(text) || false,
    lines: String(text).split('\n').map(line => ({ text: line, price: index?.prices.get(line) || null }))
  };
}

export function lookupStatus(response, previous, selection, index) {
  if (selection) return '선택하신 차량을 확인하고 있어요…';
  const price = response.messages.some(text => messagePresentation(text, index).lines.some(line => line.price));
  const vehicle = response.chips.some(c => c.selection) || ['selectedVehicleKey', 'year', 'detailModel', 'exactFuel', 'engine'].some(k => response.state[k] !== previous[k]);
  if (price || vehicle) return '차량 규격과 가격을 확인하고 있어요…';
  if ((response.region && response.region.canonicalId !== previous.region?.canonicalId) || JSON.stringify(response.state.pendingLocationDisambiguation) !== JSON.stringify(previous.pendingLocationDisambiguation)) return '출장 가능 지역을 확인하고 있어요…';
  return null;
}

export function lookupDelay(status, elapsed, reducedMotion) {
  return status && !reducedMotion ? Math.max(0, 300 - elapsed) : 0;
}

export function phoneProminence(response, index) {
  if (!response.actions.includes('phone')) return false;
  const knownPrice = response.messages.some(text => messagePresentation(text, index).lines.some(line => line.price));
  return response.messages.some(text => text.includes('1644-9141')) || (!knownPrice && !response.actions.includes('stores'));
}

// Emphasize only known literal tokens; concatenating parts always returns the input.
export function literalParts(text, tokens) {
  const sorted = [...new Set(tokens.filter(Boolean))].sort((a, b) => b.length - a.length);
  const parts = []; let at = 0;
  while (at < text.length) {
    let start = text.length, token = '';
    for (const value of sorted) { const n = text.indexOf(value, at); if (n >= 0 && n < start) { start = n; token = value; } }
    if (start > at) parts.push({ text: text.slice(at, start), emphasis: false });
    if (!token) break;
    parts.push({ text: token, emphasis: true }); at = start + token.length;
  }
  return parts;
}

export function resultTokens(state) {
  return state.confirmedBattery ? splitBatterySpec(state.confirmedBattery) : [];
}
