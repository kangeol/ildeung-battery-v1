import { normalizeText } from "./blog-case-utils.js";

// Capacity routes represent numeric AGM capacities, not suffixed product models.
export function extractAgmCapacitiesFromText(value) {
  const capacities = new Set();
  for (const match of normalizeText(value).matchAll(/\bAGM\s*([0-9]{2,3})\b/gi)) {
    capacities.add(`AGM${match[1]}`);
  }
  return capacities;
}
