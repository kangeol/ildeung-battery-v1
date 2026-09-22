import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "seo-data", "service-areas.json");
const outputPath = path.join(root, "data", "smart-consult-areas.json");
const allowedAreas = ["seoul", "gyeonggi", "incheon"];

export function generateSmartConsultAreaSummary() {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const areas = Object.fromEntries(allowedAreas.map((key) => {
    const area = source.areas?.[key];
    if (!area?.id || !area?.name || !area?.fullName || !area?.slug) {
      throw new Error(`Missing canonical area data: ${key}`);
    }
    return [key, {
      id: area.id,
      name: area.name,
      fullName: area.fullName,
      slug: area.slug
    }];
  }));

  const summary = {
    generatedAt: source.generatedAt,
    source: "seo-data/service-areas.json",
    areas
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const summary = generateSmartConsultAreaSummary();
  console.log(`Smart consultation areas generated: ${Object.keys(summary.areas).length}`);
}
