import { BLOG_CASES_FILE, BLOG_ID, BLOG_URL, readJson } from "./blog-case-utils.js";

export function loadBlogCaseArchive() {
  return readJson(BLOG_CASES_FILE, {
    version: 1,
    blogId: BLOG_ID,
    sourceUrl: BLOG_URL,
    posts: [],
    stats: {}
  });
}

export function loadBlogCases() {
  const archive = loadBlogCaseArchive();

  return Array.isArray(archive.posts) ? archive.posts : [];
}
