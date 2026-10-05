import { createBlogCaseIndex, getBlogCasesForPage } from "./blog-case-matcher.js";

export function selectionContexts() {
  const index = createBlogCaseIndex();
  return [
    ...index.vehicles.map((v) => ({ ...v, type: "vehicle", canonicalPath: v.urlPath, vehiclePath: v.urlPath })),
    ...index.details.map((d) => ({ ...d, type: "vehicle-detail", canonicalPath: d.urlPath, vehiclePath: d.vehicleUrlPath })),
    ...index.area.neighborhoods.map((n) => ({ ...n, type: "neighborhood", canonicalPath: n.urlPath }))
  ];
}

export function desiredSelection(posts, context, asOf) {
  return getBlogCasesForPage(posts, { ...context, asOf }, 50);
}

export function selectionFingerprint(posts) {
  return posts.map((post) => [String(post.id), post.caseSelection.tier, post.caseSelection.relation]);
}

export function renderedSelection(html) {
  return [...html.matchAll(/<article\b[^>]*data-case-id="([^"]+)"[^>]*data-case-tier="([^"]+)"[^>]*data-case-relation="([^"]+)"[^>]*>/g)]
    .map((m) => [m[1], m[2], m[3]]);
}
