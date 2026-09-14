import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractAgmCapacitiesFromText } from "./lib/battery-capacity.js";
import { createBlogCaseIndex, extractFactsFromPost } from "./lib/blog-case-matcher.js";
import { ROOT_DIR, urlPathToFilePath } from "./lib/blog-case-utils.js";

const index = createBlogCaseIndex();
const title = "인천 부평(산곡동) 2023년식 제네시스 GV80 델코 AGM95R 출장배터리교체 가격 및 비용 안내｜내 차에 맞는 배터리 종류 확인";
const facts = extractFactsFromPost({ id: "224408063251", title }, index);
assert(facts.batteryModels.includes("AGM95R"), "original product model must remain a fact");
assert(facts.matchedPages.batteries.includes("/battery/agm/capacity/agm95.html"));
assert(!facts.matchedPages.batteries.includes("/battery/agm/capacity/agm95r.html"));
assert(facts.matchedPages.vehicles.includes("/car-battery/genesis/gv80.html"));
assert(facts.matchedPages.neighborhoods.includes("/area/incheon/bupyeong-gu/sangok-dong.html"));
for (const urlPath of Object.values(facts.matchedPages).flat()) {
  assert(fs.existsSync(urlPathToFilePath(urlPath)), `missing fixture match: ${urlPath}`);
}

assert.deepEqual([...extractAgmCapacitiesFromText("AGM95R AGM 70 AGM105 AGM-80")], ["AGM70", "AGM105"]);
const generatedCapacities = fs.readdirSync(path.join(ROOT_DIR, "battery/agm/capacity"))
  .filter((name) => name.endsWith(".html")).map((name) => name.slice(0, -5).toUpperCase()).sort();
assert.deepEqual([...index.batteryCapacities].sort(), generatedCapacities);
for (const capacity of index.batteryCapacities) {
  const result = extractFactsFromPost({ title: `Battery ${capacity}` }, index);
  assert(result.matchedPages.batteries.includes(`/battery/agm/capacity/${capacity.toLowerCase()}.html`));
}

// Recognizable product facts alone cannot invent capacity routes absent from the generator's data.
for (const model of ["AGM95R", "AGM999", "AGM70L"]) {
  const result = extractFactsFromPost({ title: model }, {
    ...index, batteryModels: [model], batteryCapacities: new Set(["AGM95"])
  });
  assert.deepEqual(result.batteryModels, [model]);
  assert(result.matchedPages.batteries.includes("/battery/agm/"));
  assert(!result.matchedPages.batteries.some((urlPath) => urlPath.includes("/capacity/")));
}
const noCapacityRoutes = extractFactsFromPost({ title: "AGM95" }, { ...index, batteryCapacities: new Set() });
assert(!noCapacityRoutes.matchedPages.batteries.some((urlPath) => urlPath.includes("/capacity/")));
console.log(`PASS: exact RSS offender; shared capacity grammar; ${generatedCapacities.length} valid capacity routes; 3 non-route products; empty capacity index`);
