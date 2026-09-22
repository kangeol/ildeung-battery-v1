import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launcherMarkup } from "./smart-consult-launcher.js";

// Audited, owner-authorized merge parent; never follow a moving remote implicitly.
export const AUTHORIZED_MERGE = "e71c422ea433dcbbaeeb3dbc68fcc4c748ed3e6b";
export const AUTHORIZED_PAGE_BASELINE = "b98f98bbc1c062a0985419670e513ddef0abc23c";
const git = args => execFileSync("git", args, {encoding:"utf8",maxBuffer:5e6});
const lf = text => text.replace(/\r\n/g,"\n");
export function pageBaseline(page) { return lf(git(["show",`${AUTHORIZED_PAGE_BASELINE}:${page}`])); }
export function assertConsultPage(actual, before, id) {
  const line = `              <a class="btn secondary smart-consult-link" href="/smart-consult/?vehicleId=${encodeURIComponent(id)}">이 차량 스마트 상담하기</a>\n`;
  const html = lf(actual);
  assert.equal(html.split(launcherMarkup).length-1,1,`${id}: exactly one launcher`);
  assert.equal(html.includes("이 차량 스마트 상담하기"),false);
  assert.equal(lf(before).split(line).length-1,1,`${id}: production inline CTA`);
  // Normalize only the two owner-authorized changes; preserve every other byte.
  assert.equal(html.replace(launcherMarkup,""),lf(before).replace(line,""),`${id}: protected full page differs from authorized production baseline`);
}
export function assertNegativeMutations(actual, before, id) {
  const html=lf(actual);
  const mutations={
    title: html.replace(/<title>/,"<title>changed "),
    h1: html.replace(/<h1>/,"<h1>changed "),
    canonical: html.replace(/(rel="canonical" href=")[^"]+/,"$1https://invalid.example/"),
    existingCta: html.replace(/<a class="btn primary"[^>]+>[^<]+<\/a>/,""),
    schema: html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,""),
    duplicateCta: html.replace(launcherMarkup,launcherMarkup+launcherMarkup),
    malformed: html.replace("</main>","</broken>"),
    specs: html.replace(/<td>/,"<td>changed "),
    blog: html.replace(/<section class="blog-case-section"[\s\S]*?<\/section>/,"")
  };
  for (const [name,fixture] of Object.entries(mutations)) {
    assert.notEqual(fixture,html,`${name}: mutation must change fixture`);
    assert.throws(()=>assertConsultPage(fixture,before,id),assert.AssertionError,`${name}: regression must reject mutation`);
  }
  assertConsultPage(html,before,id);
  return Object.keys(mutations);
}
