import assert from "node:assert/strict";

const origin = "https://battery1.co.kr";
const protectedUrl = (url) => !url.startsWith(`${origin}/work-cases/`);

export function parseAddedUrlAllowlist(args) {
  const urls = [];
  for (let i = 0; i < args.length; i += 2) {
    assert.equal(args[i], "--allow-added-url", `Unknown argument: ${args[i]}`);
    const value = args[i + 1];
    const url = new URL(value);
    assert.ok(url.origin === origin && url.href === value && !url.search && !url.hash && !url.username && !url.password, `Invalid approved URL: ${value}`);
    assert.ok(protectedUrl(value), "Work-case additions already use the existing automation policy");
    assert.ok(!urls.includes(value), `Duplicate approved URL: ${value}`);
    urls.push(value);
  }
  return urls;
}

export function classifyProtectedUrls({ beforeUrls, afterUrls, beforePages, afterPages, allowed = [] }) {
  const before = new Set(beforeUrls.filter(protectedUrl));
  const after = new Set(afterUrls.filter(protectedUrl));
  const oldPages = new Map(beforePages.map((page) => [page.url, page]));
  const newPages = new Map(afterPages.map((page) => [page.url, page]));
  const deleted = new Set([...before].filter((url) => !after.has(url) || !newPages.has(url)));
  for (const url of oldPages.keys()) if (protectedUrl(url) && !newPages.has(url)) deleted.add(url);
  const added = [...new Set([
    ...[...after].filter((url) => !before.has(url)),
    ...[...newPages.keys()].filter((url) => protectedUrl(url) && !before.has(url) && !oldPages.has(url))
  ])].sort();
  const approved = added.filter((url) => allowed.includes(url));
  const unapproved = added.filter((url) => !allowed.includes(url));
  const canonicalChanges = beforePages.filter((page) => {
    const next = newPages.get(page.url);
    return next && (next.canonical !== page.canonical || next.ogUrl !== page.ogUrl);
  }).length;
  const invalidNew = added.filter((url) => {
    const page = newPages.get(url);
    return !after.has(url) || !page || page.canonical !== url || (page.ogUrl && page.ogUrl !== url);
  });
  const unused = allowed.filter((url) => !added.includes(url));
  return {
    EXISTING_PROTECTED_URL_DELETION_COUNT: deleted.size,
    EXISTING_PROTECTED_CANONICAL_CHANGE_COUNT: canonicalChanges,
    UNAPPROVED_ADDED_URL_COUNT: unapproved.length,
    APPROVED_ADDED_URL_COUNT: approved.length,
    APPROVED_ADDED_URLS: approved,
    PROTECTED_EXISTING_URL_SET_REGRESSION: deleted.size > 0,
    NEW_URL_CONTRACT_ERROR_COUNT: invalidNew.length,
    UNUSED_APPROVAL_COUNT: unused.length,
    pass: deleted.size === 0 && canonicalChanges === 0 && unapproved.length === 0 && invalidNew.length === 0 && unused.length === 0
  };
}
