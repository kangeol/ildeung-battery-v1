import { BLOG_CASES_FILE, BLOG_ID, BLOG_URL, readJson } from "./blog-case-utils.js";
import { filterSuppressedBlogCases } from "./blog-case-suppression.js";

export function loadBlogCaseArchive() {
  const archive = readJson(BLOG_CASES_FILE, {
    version: 1,
    blogId: BLOG_ID,
    sourceUrl: BLOG_URL,
    posts: [],
    stats: {}
  });
  return { ...archive, posts: filterSuppressedBlogCases(Array.isArray(archive.posts) ? archive.posts : []) };
}

export function loadBlogCases() {
  const archive = loadBlogCaseArchive();

  return Array.isArray(archive.posts) ? archive.posts : [];
}
