import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 96 * 1024 * 1024 });
const all = (html, regex) => [...html.matchAll(regex)].map((m) => m[0]);
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(?:39|x27);|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (s) => decode(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const schemas = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const visibleFaq = (html) => [...html.matchAll(/<article class="faq-card">\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/article>/g)].map((m) => [text(m[1]), text(m[2])]);
const jsonFaq = (html) => schemas(html).filter((s) => s["@type"] === "FAQPage").flatMap((s) => s.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]));
const weak = /서비스 가능\s*여부|출장(?:배터리|교체) 가능\s*(?:지역|여부)|상담 가능 (?:범위|지역)|방문 가능\s*여부|출장 가능 지역|서비스 가능\s*(?:지역|동)|서울·경기·인천 가능 지역|지역은 출장배터리 교체 상담이 가능|지역은 차량 위치와 차종[^.]*상담(?:이)? 가능|서울, 경기, 인천 중심으로 상담 가능/;
const service = "저희 일등밧데리는 서울·경기·인천의 공식 서비스지역에서 자동차배터리 출장교체 서비스를 제공합니다.";
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);

function protectedMarkup(html, file) {
  const nonFaqSchema = schemas(html).map((s) => s["@type"] === "FAQPage" ? { ...s, mainEntity: s.mainEntity.map((q) => ({ ...q, name: "", acceptedAnswer: { ...q.acceptedAnswer, text: "" } })) } : s);
  let head = html.split("</head>")[0].replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
  if (file === "service-area.html") head = head.replace(/<meta (?:name="description"|property="og:description")[^>]*>/g, "");
  return {
    head,
    h1: html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0],
    breadcrumbs: all(html, /<nav class="breadcrumbs"[\s\S]*?<\/nav>/g),
    links: all(html, /\bhref="[^"]*"/g),
    sources: all(html, /\bsrc="[^"]*"/g),
    scripts: all(html, /<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g),
    footers: all(html, /<footer\b[\s\S]*?<\/footer>/g),
    cases: all(html, /<section\b[^>]*class="blog-case-section"[\s\S]*?<\/section>/g),
    homeCases: all(html, /<!-- WORK_CASE_HOME_START -->[\s\S]*?<!-- WORK_CASE_HOME_END -->/g),
    tables: all(html, /<table\b[\s\S]*?<\/table>/g),
    schema: nonFaqSchema
  };
}

// Read the baseline in one Git batch without writing temporary snapshots.
function baseline(ref, files) {
  const sha = git("rev-parse", "--verify", `${ref}^{commit}`).trim();
  const data = execFileSync("git", ["cat-file", "--batch"], { cwd: ROOT, input: files.map((f) => `${sha}:${f}\n`).join(""), maxBuffer: 96 * 1024 * 1024 });
  let offset = 0;
  return new Map(files.map((file) => {
    const end = data.indexOf(10, offset);
    const header = data.subarray(offset, end).toString();
    assert.match(header, /^[a-f0-9]+ blob \d+$/, `Missing baseline ${file}`);
    const size = Number(header.split(" ")[2]);
    offset = end + 1;
    const value = data.subarray(offset, offset + size).toString("utf8").replace(/\r\n/g, "\n");
    offset += size + 1;
    return [file, value];
  }));
}

function main() {
  execFileSync(process.execPath, ["tools/audit-area-service.js"], { cwd: ROOT, stdio: "inherit" });
  const tracked = git("ls-files").trim().split("\n");
  const files = tracked.filter((f) => f.endsWith(".html"));
  const nonArea = files.filter((f) => !f.startsWith("area/"));
  const required = new Set(["index.html", "company/index.html", "service-area.html", "battery-replacement.html", "car-battery/index.html", ...walk("battery").filter((f) => f.endsWith(".html"))]);
  let faqPages = 0;
  let faqItems = 0;
  for (const file of nonArea) {
    const html = read(file);
    const body = html.split(/<body\b[^>]*>/)[1]?.split("</body>")[0] || "";
    const copy = text(body.replace(/<script\b[\s\S]*?<\/script>/g, "").replace(/<section\b[^>]*class="blog-case-section"[\s\S]*?<\/section>/g, ""));
    assert.doesNotMatch(copy, weak, `Weak service statement: ${file}`);
    assert.doesNotMatch(copy, /일등밧데리\s*[가-힣]+(?:지점|매장|점)(?:\s|[.,])/, `Fake local entity: ${file}`);
    const faq = jsonFaq(html);
    if (faq.length) {
      assert.deepEqual(visibleFaq(html), faq, `FAQ visible/JSON-LD mismatch: ${file}`);
      faqPages++;
      faqItems += faq.length;
    }
    if (file.startsWith("car-battery/") && faq.length) required.add(file);
    if (required.has(file)) {
      assert.ok(copy.includes(service) || (file === "battery-replacement.html" && copy.includes("공식 서비스지역에서 차량 위치로 방문해 자동차배터리 출장교체")), `Direct service missing: ${file}`);
      assert.ok(copy.includes("방문 시간") && copy.includes("기사 배차") && copy.includes("교통 상황"), `Scheduling missing: ${file}`);
    }
  }
  assert.ok(read("service-area.html").includes("광진구, 강동구에서 자동차배터리 출장교체 서비스를 제공합니다."), "Gangdong owner truth");
  const business = schemas(read("index.html")).find((s) => s["@type"] === "AutoRepair");
  assert.equal(business?.["@id"], "https://battery1.co.kr/#business");

  const baseIndex = process.argv.indexOf("--base");
  let updatedFaq = 0;
  let metaChanged = 0;
  if (baseIndex !== -1) {
    const ref = process.argv[baseIndex + 1];
    assert.ok(ref, "--base requires a commit");
    const oldPaths = git("ls-tree", "-r", "--name-only", ref).trim().split("\n").filter((f) => f.endsWith(".html"));
    assert.deepEqual(files, oldPaths, "HTML path set changed");
    assert.deepEqual(walk("area").filter((f) => f.endsWith(".html")).sort(), oldPaths.filter((f) => f.startsWith("area/")).sort(), "Area disk paths changed");
    const old = baseline(ref, [...files, "sitemap.xml"]);
    for (const file of files) {
      const before = old.get(file);
      const after = read(file);
      assert.deepEqual(protectedMarkup(after, file), protectedMarkup(before, file), `Protected content regression: ${file}`);
      if (file.startsWith("area/") || file.startsWith("work-cases/") || file === "search.html") assert.equal(after, before, `Protected page changed: ${file}`);
      const a = jsonFaq(before), b = jsonFaq(after);
      assert.equal(a.length, b.length, `FAQ count changed: ${file}`);
      for (let i = 0; i < a.length; i++) {
        if (JSON.stringify(a[i]) === JSON.stringify(b[i])) continue;
        assert.match(a[i][0], /출장/, `Technical FAQ changed: ${file}`);
        assert.match(a[i][1], /^서울, 경기, 인천/, `Non-service FAQ changed: ${file}`);
        assert.ok(b[i][1].startsWith(service), `FAQ service meaning: ${file}`);
        updatedFaq++;
      }
      const technicalSentences = all(before.split(/<body\b[^>]*>/)[1] || "", /<p\b[^>]*>[\s\S]*?<\/p>/g).flatMap((p) => text(p).split(/(?<=[.!?])\s+/)).filter((s) => /가능 여부|교체 가능한 배터리|장착 가능한 배터리/.test(s) && /AGM|규격|코딩|호환|장착/.test(s) && !weak.test(s));
      const afterText = text(after);
      for (const sentence of technicalSentences) assert.ok(afterText.includes(sentence), `Technical copy removed: ${file}: ${sentence}`);
      const descriptions = (h) => all(h, /<meta (?:name="description"|property="og:description"|name="twitter:description")[^>]*>/g);
      if (JSON.stringify(descriptions(before)) !== JSON.stringify(descriptions(after))) {
        assert.equal(file, "service-area.html", `Unexpected meta: ${file}`);
        metaChanged++;
      }
    }
    assert.equal(read("sitemap.xml"), old.get("sitemap.xml"), "Sitemap changed");
  }
  console.log(JSON.stringify({ nonAreaHtml: nonArea.length, directServicePages: required.size, weakServiceStatements: 0, faqPages, faqItems, faqMismatch: 0, updatedVisibleFaq: baseIndex === -1 ? "not compared" : updatedFaq, updatedJsonLdFaq: baseIndex === -1 ? "not compared" : updatedFaq, metaChangedPages: baseIndex === -1 ? "not compared" : metaChanged, baselineComparison: baseIndex === -1 ? "not requested" : "PASS" }, null, 2));
  console.log("Sitewide Service Audit PASS");
}

try {
  main();
} catch (error) {
  console.error("Sitewide Service Audit FAIL");
  console.error(error.message);
  process.exitCode = 1;
}
