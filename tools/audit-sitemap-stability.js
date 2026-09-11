import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateSitemap, reconcileSitemap } from "./generate-sitemap.js";

const origin = "https://battery1.co.kr";
const entry = (name) => ({ loc: `${origin}/${name}`, priority: "0.8" });
const entries = ["a", "b", "c"].map(entry);
const blocks = (xml) => [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);

for (const newline of ["\n", "\r\n"]) {
  for (const bom of ["", "\uFEFF"]) {
    for (const trailing of ["", newline]) {
      const raw = entries.map((e, i) => ["\t<url>", `\t\t<loc>${e.loc}</loc>`, `\t\t<priority>0.${i + 1}</priority>`, "\t\t<lastmod>2020-01-01</lastmod>", "\t\t<changefreq>monthly</changefreq>", "\t</url>"].join(newline));
      const xml = `${bom}<?xml version="1.0" encoding="UTF-8"?>${newline}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${newline}${raw.join(newline)}${newline}</urlset>${trailing}`;
      assert.equal(reconcileSitemap(xml, [...entries].reverse()), xml);
      const added = reconcileSitemap(xml, [...entries, entry("d")]);
      assert.deepEqual(blocks(added).slice(0, 3), blocks(xml));
      assert.equal(blocks(added).length, 4);
      assert.match(blocks(added)[3], /<priority>0.8<\/priority>/);
      assert.doesNotMatch(blocks(added)[3], /lastmod/);
      assert.equal(reconcileSitemap(added, [...entries, entry("d")]), added);
      const removed = reconcileSitemap(xml, [entries[0], entries[2]]);
      assert.equal(removed, xml.replace(blocks(xml)[1], ""));
      assert.deepEqual(blocks(removed), [blocks(xml)[0], blocks(xml)[2]]);
      assert.equal(reconcileSitemap(removed, [entries[0], entries[2]]), removed);
      for (const output of [added, removed]) {
        assert.ok(output.startsWith(`${bom}<?xml`));
        assert.ok(output.endsWith(`</urlset>${trailing}`));
        if (newline === "\r\n") assert.doesNotMatch(output.replace(/\r\n/g, ""), /\n/);
        else assert.doesNotMatch(output, /\r/);
      }
      const sorted = reconcileSitemap(xml, [...entries, entry("z"), entry("d")]);
      assert.match(blocks(sorted)[3], /\/d<\/loc>/);
      assert.match(blocks(sorted)[4], /\/z<\/loc>/);
      assert.throws(() => reconcileSitemap(xml, [...entries, entries[0]]));
      assert.throws(() => reconcileSitemap(xml.replace("</urlset>", `${raw[0]}</urlset>`), entries));
      assert.throws(() => reconcileSitemap(xml.replace("<loc>", "<broken>"), entries));
      assert.throws(() => reconcileSitemap(xml.replace(`${origin}/a`, "https://example.com/a"), entries));
      assert.throws(() => reconcileSitemap(xml.replace(`${origin}/a`, `${origin}/a&bad;`), entries));
      assert.throws(() => reconcileSitemap(xml.replace("<priority>0.1</priority>", "<loc>https://battery1.co.kr/extra</loc>"), entries));
      assert.throws(() => reconcileSitemap(xml, [entry("a"), { loc: "relative", priority: "0.8" }]));
    }
  }
}

// Verify the real no-change path never calls the writer, not merely equal bytes.
const sitemap = fileURLToPath(new URL("../sitemap.xml", import.meta.url));
const before = fs.readFileSync(sitemap);
const beforeTime = fs.statSync(sitemap).mtimeMs;
const originalWrite = fs.writeFileSync;
let desired;
try {
  fs.writeFileSync = () => { throw new Error("Unexpected write during no-change generation"); };
  desired = generateSitemap();
  generateSitemap();
} finally {
  fs.writeFileSync = originalWrite;
}
assert.deepEqual(fs.readFileSync(sitemap), before);
assert.equal(fs.statSync(sitemap).mtimeMs, beforeTime);
assert.equal(reconcileSitemap(before.toString("utf8"), desired), before.toString("utf8"));

// Run production generation only in a disposable copy, never in the live checkout.
const root = path.dirname(sitemap);
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const liveHashes = new Map(tracked.map((file) => [file, hash(path.join(root, file))]));
const tempRoot = fs.realpathSync(os.tmpdir());
const isolated = fs.mkdtempSync(path.join(tempRoot, "ildeung-sitemap-audit-"));
try {
  for (const file of tracked) {
    const target = path.resolve(isolated, file);
    assert.ok(target.startsWith(`${isolated}${path.sep}`), "Unsafe fixture path");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(isolated, "package.json"), "utf8"));
  const run = (script) => {
    const command = pkg.scripts[script];
    assert.match(command, /^node tools\/generate-[a-z-]+\.js$/, `Not a local generator: ${script}`);
    execFileSync(process.execPath, [command.slice(5)], { cwd: isolated, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    assert.deepEqual(fs.readFileSync(path.join(isolated, "sitemap.xml")), before, `Sitemap changed: ${script}`);
  };
  const vehicle = tracked.filter((file) => file.startsWith("car-battery/") && file.endsWith(".html"));
  const vehicleHashes = new Map(vehicle.map((file) => [file, hash(path.join(isolated, file))]));
  run("generate:vehicle-seo");
  for (const [file, value] of vehicleHashes) assert.equal(hash(path.join(isolated, file)), value, `Vehicle bytes changed: ${file}`);
  run("generate:sitemap");
  run("generate:sitemap");
  const sequence = pkg.scripts["build:blog-cases"].split(/\s*&&\s*/);
  for (const command of sequence) {
    assert.match(command, /^npm run generate:[a-z-]+$/, "Unexpected automation step");
    run(command.slice("npm run ".length));
  }
  console.log("Vehicle standalone, common run1/run2, isolated blog build: PASS");
} finally {
  const resolved = fs.realpathSync(isolated);
  assert.equal(path.dirname(resolved), tempRoot, "Unsafe temporary cleanup target");
  assert.ok(path.basename(resolved).startsWith("ildeung-sitemap-audit-"));
  fs.rmSync(resolved, { recursive: true, force: true });
  for (const [file, value] of liveHashes) assert.equal(hash(path.join(root, file)), value, `Live file bytes changed: ${file}`);
}
console.log(`Sitemap Stability Audit PASS: ${desired.length} URLs; fixtures, metadata, LF/CRLF, BOM, duplicates, no-write PASS`);
