import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "seo-data/service-areas.json"), "utf8"));
const localities = [];
function add(node, area, city = "", district = "", locality = "") {
  const fullName = [area.fullName, city, district, locality].filter(Boolean).join(" ");
  const level = locality ? "locality" : district ? "district" : city ? "city" : "province";
  localities.push({ name: node.name, fullName, area: area.id, region: city || district, slug: area.slug,
    province: area.fullName, city, district, locality, level,
    canonicalId: node.code || node.legalCode || `${area.id}/${city}/${district}/${locality}`,
    fullLabel: [area.name, city, district, locality].filter(Boolean).join(" ") });
}
for (const area of Object.values(source.areas)) {
  add(area, area);
  for (const region of area.regions || []) {
    const city = region.type === "si" ? region.name : "";
    const district = city ? "" : region.name;
    add(region, area, city, district);
    for (const child of region.districts || []) add(child, area, city, child.name);
    for (const child of region.neighborhoods || []) add(child, area, city, child.district || district, child.name);
  }
}
const unique = [...new Map(localities.map(item => [JSON.stringify(item), item])).values()];
fs.writeFileSync(path.join(root, "seo-data/smart-consult-location-index.json"), JSON.stringify({ source: "seo-data/service-areas.json", localities: unique }, null, 2) + "\n");
console.log(`Generated ${unique.length} canonical locality names (no case content).`);
