import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const origin = "https://battery1.co.kr";
// MOIS KIKcd_B.20260720; slugs are the owner's approved internal URL contract.
// Official file SHA-256: 904c3d24d6b0d56dfb22d102af3cd5c4a2d124adcbac131a432c7329be94a284
const ledger = [
  ["명일동", "1174010100", "myeongil-dong"],
  ["고덕동", "1174010200", "godeok-dong"],
  ["상일동", "1174010300", "sangil-dong"],
  ["길동", "1174010500", "gil-dong"],
  ["둔촌동", "1174010600", "dunchon-dong"],
  ["암사동", "1174010700", "amsa-dong"],
  ["성내동", "1174010800", "seongnae-dong"],
  ["천호동", "1174010900", "cheonho-dong"],
  ["강일동", "1174011000", "gangil-dong"]
];
const districtPath = "/area/seoul/gangdong-gu.html";
const pages = [["강동구", districtPath], ...ledger.map(([name, , slug]) => [name, `/area/seoul/gangdong-gu/${slug}.html`])];
const data = JSON.parse(read("seo-data/service-areas.json"));
const district = data.areas.seoul.regions.filter((region) => region.id === "gangdong-gu");
assert.equal(district.length, 1);
assert.equal(district[0].legalCode, "1174000000");
assert.equal(district[0].fullName, "서울특별시 강동구");
assert.deepEqual(district[0].neighborhoods.map((n) => [n.name, n.code, n.slug]), ledger);
for (const n of district[0].neighborhoods) assert.equal(n.legalName, `서울특별시 강동구 ${n.name}`);
assert.equal(new Set(pages.map(([, url]) => url)).size, 10);

for (const [name, url] of pages) {
  const html = read(url.slice(1));
  const label = name === "강동구" ? "서울 강동구" : `서울 강동구 ${name}`;
  assert.ok(html.includes(`<title>${label} 출장배터리 가격 및 자동차배터리 교체 | 일등밧데리</title>`), url);
  assert.ok(html.includes(`<h1>${name} 출장배터리 가격 및 교체 안내</h1>`), url);
  assert.ok(html.includes(`<link rel="canonical" href="${origin}${url}">`), url);
  assert.ok(html.includes(`저희 일등밧데리는 ${label}에서 자동차배터리 출장교체 서비스를 제공합니다.`), url);
  assert.ok(html.includes("차량이 있는 위치로 방문해 차종과 연식, 현재 장착된 배터리 규격을 확인하고 교체합니다."), url);
  assert.ok(html.includes("방문 시간은 당일 기사 배차와 교통 상황을 확인해 안내합니다."), url);
  for (const link of ["tel:16449141", "/company/", "/area/seoul/", "/car-battery/index.html"]) assert.ok(html.includes(`href="${link}"`), `${url}: ${link}`);
  assert.ok(html.includes("https://smartstore.naver.com/battery1/products/"), url);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.equal(schemas.length, 1);
  assert.equal(schemas[0]["@type"], "BreadcrumbList");
  assert.equal(schemas[0].itemListElement.at(-1).item, `${origin}${url}`);
  assert.equal(schemas[0].itemListElement.at(-1).name, name);
  assert.ok(schemas[0].itemListElement.some((item) => item.item === `${origin}/area/seoul/`));
  if (url !== districtPath) assert.ok(schemas[0].itemListElement.some((item) => item.item === `${origin}${districtPath}`));
  for (const [otherName, otherUrl] of pages.slice(1)) {
    if (otherName !== name) assert.ok(html.includes(`href="${otherUrl}"`), `${url}: sibling ${otherUrl}`);
  }
  const asset = `/assets/seo${url.replace(/\.html$/, ".png")}`;
  assert.ok(html.includes(`src="${asset}"`), url);
  assert.ok(fs.existsSync(path.join(root, asset.slice(1))), asset);
  assert.doesNotMatch(html, /일등밧데리\s*강동(?:구)?(?:점|지점|매장)/);
  console.log(`Page contract PASS: ${url}`);
}

const blocks = (xml) => [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);
const loc = (block) => block.match(/<loc>(.*?)<\/loc>/)[1];
const current = blocks(read("sitemap.xml"));
assert.equal(new Set(current.map(loc)).size, current.length);
for (const [, url] of pages) assert.equal(current.filter((b) => loc(b) === `${origin}${url}`).length, 1);

// Optional one-time addition regression against the pre-Gangdong commit.
if (process.argv.includes("--base")) {
  const ref = process.argv[process.argv.indexOf("--base") + 1];
  assert.ok(ref && /^[a-f0-9]{40}$/.test(ref));
  const old = blocks(execFileSync("git", ["show", `${ref}:sitemap.xml`], { cwd: root, encoding: "utf8" }));
  assert.deepEqual(current.slice(0, old.length), old, "Existing sitemap raw blocks/order changed");
  assert.deepEqual(current.slice(old.length).map(loc).sort(), pages.map(([, url]) => `${origin}${url}`).sort());
  for (const block of current.slice(old.length)) {
    assert.doesNotMatch(block, /<lastmod>/);
    assert.match(block, /<priority>0.75<\/priority>/);
  }
}
console.log("Gangdong exact data, URL, page, asset and sitemap contracts PASS");
