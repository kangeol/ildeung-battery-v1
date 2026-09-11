import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
const files = walk("area").filter((file) => file.endsWith(".html")).sort();
const matchAll = (html, regex) => [...html.matchAll(regex)].map((match) => match[0]);
const cases = (html) => matchAll(html, /<section\b[^>]*class="blog-case-section"[\s\S]*?<\/section>/g);
const text = (html) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const snapshot = (html) => ({
  title: html.match(/<title>[\s\S]*?<\/title>/)?.[0],
  h1: html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0],
  canonical: html.match(/<link rel="canonical"[^>]*>/)?.[0],
  breadcrumb: html.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)?.[0],
  links: matchAll(html, /\bhref="[^"]*"/g),
  imagesAndScripts: matchAll(html, /\bsrc="[^"]*"/g),
  classes: matchAll(html, /\bclass="[^"]*"/g),
  schema: matchAll(html, /<script type="application\/ld\+json">[\s\S]*?<\/script>/g),
  cases: cases(html),
  head: html.split("</head>")[0].replace(/<meta (?:name="description"|property="og:description"|name="twitter:description")[^>]*>/g, "")
});

// Batch Git blobs in memory so a full baseline comparison needs no snapshot files.
function baselineFiles(ref, paths) {
  const sha = git("rev-parse", "--verify", `${ref}^{commit}`).trim();
  const buffer = execFileSync("git", ["cat-file", "--batch"], {
    cwd: ROOT,
    input: paths.map((file) => `${sha}:${file}\n`).join(""),
    maxBuffer: 64 * 1024 * 1024
  });
  let offset = 0;
  return new Map(paths.map((file) => {
    const end = buffer.indexOf(10, offset);
    const header = buffer.subarray(offset, end).toString();
    assert.match(header, /^[a-f0-9]+ blob \d+$/, `Missing baseline: ${file}`);
    const size = Number(header.split(" ")[2]);
    offset = end + 1;
    const content = buffer.subarray(offset, offset + size).toString("utf8");
    offset += size + 1;
    return [file, content];
  }));
}

function main() {
  const data = JSON.parse(read("seo-data/service-areas.json"));
  const labels = new Map([["area/index.html", "서울·경기·인천"]]);
  for (const area of Object.values(data.areas)) {
    labels.set(`area/${area.slug}/index.html`, area.name);
    for (const region of area.regions) {
      labels.set(`area/${area.slug}/${region.id}.html`, area.id === "gyeonggi" ? region.shortName || region.name : `${area.name} ${region.name}`);
      for (const neighborhood of region.neighborhoods) {
        labels.set(`area/${area.slug}/${region.id}/${neighborhood.slug}.html`, `${area.name} ${region.name} ${neighborhood.name}`);
      }
    }
  }
  assert.equal(files.length, labels.size, "Area HTML count from service-area data");
  assert.deepEqual(files, [...labels.keys()].sort(), "Area path/data mismatch");
  const forbidden = /출장배터리 가능 지역|출장 가능|상담 가능 범위|서비스 가능\s*(?:지역|동)|상담 가능 여부|방문 가능 여부|서비스가 제한될 수|지역 SEO V1/;
  for (const file of files) {
    const html = read(file);
    const hero = text(html.match(/<p class="area-hero-desc">([\s\S]*?)<\/p>/)?.[1] || "");
    assert.ok(hero.includes(`저희 일등밧데리는 ${labels.get(file)}에서 자동차배터리 출장교체 서비스를 제공합니다.`), `Service assertion: ${file}`);
    assert.ok(hero.includes("차량이 있는 위치로 방문해 차종과 연식, 현재 장착된 배터리 규격을 확인하고 교체합니다."), `Visit: ${file}`);
    assert.ok(hero.includes("방문 시간은 당일 기사 배차와 교통 상황을 확인해 안내합니다."), `Schedule: ${file}`);
    const copy = text(html.split("<body")[1].replace(/<section\b[^>]*class="blog-case-section"[\s\S]*?<\/section>/g, ""));
    assert.doesNotMatch(copy, forbidden, `Weak service copy: ${file}`);
    assert.doesNotMatch(copy, /일등밧데리\s*[가-힣]+(?:지점|매장|점)(?:\s|[.,])/, `Local branch claim: ${file}`);
    for (const block of snapshot(html).schema) {
      const schema = JSON.parse(block.replace(/^<script[^>]*>|<\/script>$/g, ""));
      assert.equal(schema["@type"], "BreadcrumbList", `Unexpected area entity: ${file}`);
    }
  }
  const schemas = matchAll(read("index.html"), /<script type="application\/ld\+json">[\s\S]*?<\/script>/g)
    .map((block) => JSON.parse(block.replace(/^<script[^>]*>|<\/script>$/g, "")));
  assert.ok(schemas.some((schema) => schema["@type"] === "AutoRepair" && schema["@id"] === "https://battery1.co.kr/#business"), "Canonical business entity");
  const refIndex = process.argv.indexOf("--base");
  let metaChanged = 0;
  if (refIndex !== -1) {
    const ref = process.argv[refIndex + 1];
    assert.ok(ref, "--base requires a commit");
    assert.deepEqual(git("ls-tree", "-r", "--name-only", ref, "area").trim().split("\n").filter((file) => file.endsWith(".html")).sort(), files, "Path set changed");
    const old = baselineFiles(ref, [...files, "sitemap.xml", "index.html"]);
    for (const file of files) {
      const html = read(file);
      assert.deepEqual(snapshot(html), snapshot(old.get(file)), `Protected markup changed: ${file}`);
      const descriptions = (value) => matchAll(value, /<meta (?:name="description"|property="og:description"|name="twitter:description")[^>]*>/g);
      if (JSON.stringify(descriptions(html)) !== JSON.stringify(descriptions(old.get(file)))) {
        assert.ok(/^area\/(?:index\.html|(?:incheon|seoul|gyeonggi)\/index\.html)$/.test(file), `Unexpected meta change: ${file}`);
        metaChanged++;
      }
    }
    assert.equal(read("sitemap.xml").replace(/\r\n/g, "\n"), old.get("sitemap.xml").replace(/\r\n/g, "\n"), "Sitemap changed");
    assert.equal(read("index.html").replace(/\r\n/g, "\n"), old.get("index.html").replace(/\r\n/g, "\n"), "Homepage/business changed");
  }
  console.log(JSON.stringify({ areaHtml: files.length, directServiceAssertionPass: files.length, weakServiceCopy: 0, metaChanged: refIndex === -1 ? "not compared" : metaChanged, baselineComparison: refIndex === -1 ? "not requested" : "PASS" }, null, 2));
  console.log("Area Service Audit PASS");
}

try {
  main();
} catch (error) {
  console.error("Area Service Audit FAIL");
  console.error(error.message);
  process.exitCode = 1;
}
