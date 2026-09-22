import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "seo-data/service-areas.json"), "utf8"));
const localities = [];
function visit(node, area, region = "") {
  if (node.name && (node.slug || node.id)) localities.push({ name: node.name, fullName: node.fullName || node.legalName || node.name, area: area.id, region, slug: area.slug });
  for (const child of node.regions || []) visit(child, area, child.name);
  for (const child of node.districts || []) visit(child, area, child.name);
  for (const child of node.neighborhoods || []) visit(child, area, region);
}
for (const area of Object.values(source.areas)) {
  localities.push({ name: area.name, fullName: area.fullName, area: area.id, region: "", slug: area.slug });
  visit(area, area);
}
const unique = [...new Map(localities.map(item => [JSON.stringify(item), item])).values()];
fs.writeFileSync(path.join(root, "data/smart-consult-localities.json"), JSON.stringify({ source: "seo-data/service-areas.json", localities: unique }, null, 2) + "\n");
console.log(`Generated ${unique.length} canonical locality names (no case content).`);
