import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  BLOG_CASE_FALLBACK_IMAGE,
  BLOG_CASES_ASSET_DIR,
  BLOG_CASES_FILE,
  BLOG_ID,
  BLOG_RSS_URL,
  BLOG_URL,
  canonicalNaverPostUrl,
  decodeXmlEntities,
  normalizeText,
  stripHtml,
  truncateText,
  writeJson
} from "./lib/blog-case-utils.js";
import { buildSafeSummary, createBlogCaseIndex, extractFactsFromPost } from "./lib/blog-case-matcher.js";

const ARCHIVE_URL = "https://blog.naver.com/PostList.naver";
const MAX_PAGES = 200;
const REQUEST_DELAY_MS = 900;
const IMAGE_DELAY_MS = 80;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const STOP_AFTER_EMPTY_PAGES = 3;
const STOP_AFTER_NO_NEW_PAGES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function archivePageUrl(page) {
  const url = new URL(ARCHIVE_URL);
  url.searchParams.set("blogId", BLOG_ID);
  url.searchParams.set("categoryNo", "0");
  url.searchParams.set("currentPage", String(page));
  return url.toString();
}

function decodeHtml(value) {
  return decodeXmlEntities(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&middot;/gi, "·")
    .replace(/&#8203;/g, " ")
    .replace(/\u200b/g, " ");
}

function cleanHtml(value) {
  return normalizeText(
    decodeHtml(value)
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--|-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function toArchiveIsoDate(value) {
  const match = normalizeText(value).match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);

  if (!match) {
    return "";
  }

  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function extractFirstMatch(value, regex) {
  return value.match(regex)?.[1] || "";
}

function extractLastMatch(value, regex) {
  const matches = [...value.matchAll(regex)].map((match) => match[1]);
  return matches.at(-1) || "";
}

function normalizeSourceImageUrl(value) {
  const url = decodeHtml(value);

  if (!url) {
    return "";
  }

  return url.replace(/\?type=w80_blur.*/i, "?type=w2");
}

function extractSourceThumbnailUrl(block) {
  const urls = [];

  for (const match of block.matchAll(/(?:data-lazy-src|src)="(https?:\/\/[^"]+)"/g)) {
    const url = normalizeSourceImageUrl(match[1]);

    if (
      /(?:postfiles|blogfiles)\.pstatic\.net/i.test(url) &&
      !/spc\.gif|profile|favicon|btn_|icon/i.test(url)
    ) {
      urls.push(url);
    }
  }

  return [...new Set(urls)][0] || "";
}

function parseArchivePosts(html, page) {
  const postViews = [...html.matchAll(/id="post-view([0-9]{6,})"/g)].map((match) => ({
    id: match[1],
    index: match.index
  }));

  return postViews.map((postView, index) => {
    const end = postViews[index + 1]?.index || html.length;
    const prelude = html.slice(Math.max(0, postView.index - 5000), postView.index);
    const block = html.slice(postView.index, end);
    const newEditorTitle = extractFirstMatch(
      block,
      /<div class="se-module se-module-text se-title-text">([\s\S]*?)<\/div>/i
    );
    const oldEditorTitle = extractLastMatch(
      prelude,
      /<span class="pcol1 itemSubjectBoldfont">([\s\S]*?)<\/span>/gi
    );
    const newEditorDate = extractFirstMatch(
      block,
      /<span class="se_publishDate pcol2">([\s\S]*?)<\/span>/i
    );
    const oldEditorDate = extractLastMatch(
      prelude,
      /<p class="date fil5 pcol2 _postAddDate">([\s\S]*?)<\/p>/gi
    );
    const title = cleanHtml(newEditorTitle || oldEditorTitle);
    const publishedAt = toArchiveIsoDate(cleanHtml(newEditorDate || oldEditorDate));
    const sourceThumbnailUrl = extractSourceThumbnailUrl(block);

    return {
      id: postView.id,
      title,
      url: canonicalNaverPostUrl(`${BLOG_URL}/${postView.id}`),
      publishedAt,
      thumbnail: "",
      sourceThumbnailUrl,
      sourceExcerpt: "",
      tags: [],
      archivePage: page
    };
  }).filter((post) => post.id && post.title && post.publishedAt && post.url);
}

async function fetchText(url) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 (compatible; IldeungBatterySEO/1.0)"
        }
      });
      const body = await response.text();
      clearTimeout(timeout);

      return {
        status: response.status,
        contentType: response.headers.get("content-type") || "",
        body
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt < MAX_RETRIES) {
        await sleep(REQUEST_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function discoverArchivePosts() {
  const posts = [];
  const seenIds = new Set();
  const pageSummaries = [];
  let emptyPages = 0;
  let noNewPages = 0;
  let stopReason = "max_pages";

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = archivePageUrl(page);
    const response = await fetchText(url);

    if (response.status !== 200 || !/html/i.test(response.contentType)) {
      throw new Error(`Public archive page is not stable: page ${page}, HTTP ${response.status}, ${response.contentType}`);
    }

    const pagePosts = parseArchivePosts(response.body, page);
    const newPosts = pagePosts.filter((post) => !seenIds.has(post.id));

    pagePosts.forEach((post) => {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id);
        posts.push(post);
      }
    });

    pageSummaries.push({
      page,
      postReferences: pagePosts.length,
      newPosts: newPosts.length,
      firstPostId: pagePosts[0]?.id || "",
      lastPostId: pagePosts.at(-1)?.id || ""
    });

    if (pagePosts.length === 0) {
      emptyPages += 1;
    } else {
      emptyPages = 0;
    }

    if (newPosts.length === 0) {
      noNewPages += 1;
    } else {
      noNewPages = 0;
    }

    if (emptyPages >= STOP_AFTER_EMPTY_PAGES) {
      stopReason = "empty_pages";
      break;
    }

    if (noNewPages >= STOP_AFTER_NO_NEW_PAGES) {
      stopReason = "repeated_pages";
      break;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return {
    posts,
    pageSummaries,
    stopReason,
    publicArchiveExhausted: stopReason === "empty_pages" || stopReason === "repeated_pages"
  };
}

function readExistingArchive() {
  if (!fs.existsSync(BLOG_CASES_FILE)) {
    return {
      version: 1,
      blogId: BLOG_ID,
      sourceUrl: BLOG_URL,
      posts: []
    };
  }

  return JSON.parse(fs.readFileSync(BLOG_CASES_FILE, "utf8"));
}

function postKey(post) {
  return normalizeText(post.id) || normalizeText(post.url);
}

function mergeField(existingValue, incomingValue) {
  if (Array.isArray(existingValue) || Array.isArray(incomingValue)) {
    const incoming = Array.isArray(incomingValue) ? incomingValue.filter(Boolean) : [];
    const existing = Array.isArray(existingValue) ? existingValue.filter(Boolean) : [];
    return incoming.length ? incoming : existing;
  }

  return normalizeText(incomingValue) ? incomingValue : existingValue;
}

function mergePost(existingPost, incomingPost) {
  const merged = {
    ...existingPost,
    ...incomingPost,
    title: mergeField(existingPost?.title, incomingPost.title),
    url: mergeField(existingPost?.url, incomingPost.url),
    publishedAt: mergeField(existingPost?.publishedAt, incomingPost.publishedAt),
    thumbnail: mergeField(existingPost?.thumbnail, incomingPost.thumbnail),
    thumbnailStatus: mergeField(existingPost?.thumbnailStatus, incomingPost.thumbnailStatus),
    thumbnailError: mergeField(existingPost?.thumbnailError, incomingPost.thumbnailError),
    sourceThumbnailUrl: mergeField(existingPost?.sourceThumbnailUrl, incomingPost.sourceThumbnailUrl),
    sourceExcerpt: mergeField(existingPost?.sourceExcerpt, incomingPost.sourceExcerpt),
    tags: mergeField(existingPost?.tags, incomingPost.tags)
  };

  merged.sources = [...new Set([
    ...(Array.isArray(existingPost?.sources) ? existingPost.sources : []),
    ...(Array.isArray(incomingPost.sources) ? incomingPost.sources : []),
    incomingPost.sourceType
  ].filter(Boolean))];

  delete merged.sourceType;
  return merged;
}

function mergePosts(existingPosts, discoveredPosts) {
  const byKey = new Map();
  const urlToKey = new Map();
  const existingKeys = new Set();

  function setPost(post) {
    const key = postKey(post);
    if (!key) {
      return;
    }

    byKey.set(key, post);

    if (post.url) {
      urlToKey.set(post.url, key);
    }
  }

  existingPosts.forEach((post) => {
    const key = postKey(post);
    if (key) {
      existingKeys.add(key);
      setPost(post);
    }
  });

  let newPosts = 0;

  discoveredPosts.forEach((post) => {
    const key = postKey(post);
    const existingKey = byKey.has(key) ? key : urlToKey.get(post.url);

    if (existingKey && byKey.has(existingKey)) {
      byKey.set(existingKey, mergePost(byKey.get(existingKey), post));
      return;
    }

    newPosts += 1;
    setPost(post);
  });

  const merged = [...byKey.values()]
    .filter((post) => post.id && post.title && post.url)
    .sort((a, b) => (
      normalizeText(b.publishedAt).localeCompare(normalizeText(a.publishedAt)) ||
      normalizeText(b.id).localeCompare(normalizeText(a.id), "en", { numeric: true })
    ));

  return {
    merged,
    newPosts,
    duplicateRemoved: existingPosts.length + discoveredPosts.length - merged.length,
    preservedPreviousPosts: merged.filter((post) => existingKeys.has(postKey(post))).length
  };
}

async function downloadThumbnail(post) {
  if (!post.sourceThumbnailUrl) {
    return {
      thumbnail: BLOG_CASE_FALLBACK_IMAGE,
      status: "fallback",
      error: "missing source image"
    };
  }

  try {
    fs.mkdirSync(BLOG_CASES_ASSET_DIR, { recursive: true });
    const outputPath = path.join(BLOG_CASES_ASSET_DIR, `${post.id}.webp`);
    const publicPath = `/assets/blog-cases/${post.id}.webp`;
    const response = await fetch(post.sourceThumbnailUrl, {
      headers: {
        "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "referer": post.url,
        "user-agent": "Mozilla/5.0 (compatible; IldeungBatterySEO/1.0)"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const input = Buffer.from(await response.arrayBuffer());
    await sharp(input)
      .rotate()
      .resize(480, 360, { fit: "cover", position: "center" })
      .webp({ quality: 82 })
      .toFile(outputPath);

    return {
      thumbnail: publicPath,
      status: "downloaded",
      error: ""
    };
  } catch (error) {
    return {
      thumbnail: BLOG_CASE_FALLBACK_IMAGE,
      status: "fallback",
      error: error.message
    };
  }
}

function localThumbnailExists(post) {
  if (!post.thumbnail?.startsWith("/assets/blog-cases/")) {
    return false;
  }

  return fs.existsSync(path.join(BLOG_CASES_ASSET_DIR, path.basename(post.thumbnail)));
}

function countFacts(posts, key) {
  return posts.reduce((total, post) => total + ((post.facts?.[key] || []).length ? 1 : 0), 0);
}

function countNoFactPosts(posts) {
  return posts.filter((post) => {
    const facts = post.facts || {};
    return ![
      "manufacturers",
      "vehicles",
      "detailModels",
      "regions",
      "neighborhoods",
      "batteryModels",
      "symptoms"
    ].some((key) => (facts[key] || []).length);
  }).length;
}

function countAmbiguousPosts(posts) {
  return posts.filter((post) => {
    const facts = post.facts || {};
    return (
      (facts.manufacturers || []).length > 1 ||
      (facts.vehicles || []).length > 1 ||
      (facts.detailModels || []).length > 1 ||
      (facts.regions || []).length > 1 ||
      (facts.neighborhoods || []).length > 1
    );
  }).length;
}

function collectDateStats(posts) {
  const dates = posts.map((post) => post.publishedAt).filter(Boolean).sort();

  return {
    oldest: dates[0] || "",
    newest: dates.at(-1) || ""
  };
}

async function main() {
  console.log("Naver Blog Historical Backfill Start");
  console.log("");
  console.log(`Blog URL: ${BLOG_URL}`);
  console.log(`Archive URL: ${archivePageUrl(1)}`);
  console.log("");

  const existing = readExistingArchive();
  const existingPosts = Array.isArray(existing.posts) ? existing.posts : [];
  const existingDateStats = collectDateStats(existingPosts);

  console.log(`Existing cached posts: ${existingPosts.length}`);
  console.log(`Existing newest date: ${existingDateStats.newest || "n/a"}`);
  console.log(`Existing oldest date: ${existingDateStats.oldest || "n/a"}`);
  console.log("");

  const discovered = await discoverArchivePosts();
  const archiveDateStats = collectDateStats(discovered.posts);
  const discoveredPosts = discovered.posts.map((post) => ({
    ...post,
    sourceType: "naver-postlist-archive"
  }));
  const { merged, newPosts, duplicateRemoved, preservedPreviousPosts } = mergePosts(existingPosts, discoveredPosts);
  const index = createBlogCaseIndex();
  let thumbnailSuccess = 0;
  let thumbnailFallback = 0;
  let historicalThumbnailSuccess = 0;
  let historicalThumbnailFallback = 0;

  const newHistoricalIds = new Set(
    discoveredPosts
      .filter((post) => !existingPosts.some((existingPost) => postKey(existingPost) === postKey(post)))
      .map((post) => post.id)
  );

  for (const post of merged) {
    const needsThumbnail = !post.thumbnail || post.thumbnail === BLOG_CASE_FALLBACK_IMAGE || !localThumbnailExists(post);

    if (needsThumbnail) {
      const thumbnailResult = await downloadThumbnail(post);
      post.thumbnail = thumbnailResult.thumbnail;
      post.thumbnailStatus = thumbnailResult.status;
      post.thumbnailError = thumbnailResult.error;
      await sleep(IMAGE_DELAY_MS);
    }

    if (post.thumbnailStatus === "downloaded") {
      thumbnailSuccess += 1;
      if (newHistoricalIds.has(post.id)) {
        historicalThumbnailSuccess += 1;
      }
    } else {
      thumbnailFallback += 1;
      if (newHistoricalIds.has(post.id)) {
        historicalThumbnailFallback += 1;
      }
    }

    post.facts = extractFactsFromPost(post, index);
    post.summary = buildSafeSummary(post, post.facts);
    post.matchConfidence = {
      manufacturer: post.facts.manufacturers.length,
      vehicle: post.facts.vehicles.length,
      detail: post.facts.detailModels.length,
      region: post.facts.regions.length,
      neighborhood: post.facts.neighborhoods.length,
      battery: post.facts.batteryModels.length
    };
  }

  const finalDateStats = collectDateStats(merged);
  const archive = {
    ...existing,
    version: 1,
    blogId: BLOG_ID,
    sourceUrl: BLOG_URL,
    rssUrl: BLOG_RSS_URL,
    syncedAt: new Date().toISOString(),
    historicalBackfill: {
      type: "naver-public-postlist",
      archiveUrl: archivePageUrl(1),
      completedAt: new Date().toISOString(),
      requestDelayMs: REQUEST_DELAY_MS,
      concurrency: 1,
      pagesVisited: discovered.pageSummaries.length,
      postReferences: discovered.pageSummaries.reduce((total, page) => total + page.postReferences, 0),
      uniqueArchivePosts: discovered.posts.length,
      stopReason: discovered.stopReason,
      publicArchiveExhausted: discovered.publicArchiveExhausted,
      oldestDiscoveredDate: archiveDateStats.oldest,
      newestDiscoveredDate: archiveDateStats.newest,
      pageSummaries: discovered.pageSummaries
    },
    stats: {
      ...(existing.stats || {}),
      existingPosts: existingPosts.length,
      discoveredHistoricalPosts: discovered.posts.length,
      historicalNewPosts: newPosts,
      finalCachedPosts: merged.length,
      preservedPreviousPosts,
      duplicateRemoved,
      thumbnailSuccess,
      thumbnailFallback,
      historicalThumbnailSuccess,
      historicalThumbnailFallback,
      manufacturerMatches: countFacts(merged, "manufacturers"),
      vehicleMatches: countFacts(merged, "vehicles"),
      detailMatches: countFacts(merged, "detailModels"),
      regionMatches: countFacts(merged, "regions"),
      neighborhoodMatches: countFacts(merged, "neighborhoods"),
      batteryMatches: countFacts(merged, "batteryModels"),
      noFactPosts: countNoFactPosts(merged),
      ambiguousPosts: countAmbiguousPosts(merged),
      oldestCachedDate: finalDateStats.oldest,
      newestCachedDate: finalDateStats.newest
    },
    posts: merged.map(({ archivePage, ...post }) => ({
      ...post,
      sourceExcerpt: truncateText(stripHtml(post.sourceExcerpt), 420)
    }))
  };

  writeJson(BLOG_CASES_FILE, archive);

  console.log(`TOTAL_ARCHIVE_PAGES_VISITED: ${archive.historicalBackfill.pagesVisited}`);
  console.log(`TOTAL_ARCHIVE_POST_REFERENCES: ${archive.historicalBackfill.postReferences}`);
  console.log(`UNIQUE_ARCHIVE_POSTS: ${archive.historicalBackfill.uniqueArchivePosts}`);
  console.log(`EXISTING_RSS_POSTS: ${existingPosts.length}`);
  console.log(`HISTORICAL_NEW_POSTS: ${newPosts}`);
  console.log(`FINAL_CACHED_POSTS: ${merged.length}`);
  console.log(`OLDEST_DISCOVERED_DATE: ${archiveDateStats.oldest}`);
  console.log(`NEWEST_DISCOVERED_DATE: ${archiveDateStats.newest}`);
  console.log(`PUBLIC_ARCHIVE_EXHAUSTED: ${archive.historicalBackfill.publicArchiveExhausted}`);
  console.log(`STOP_REASON: ${archive.historicalBackfill.stopReason}`);
  console.log(`Thumbnail success: ${thumbnailSuccess}`);
  console.log(`Thumbnail fallback: ${thumbnailFallback}`);
  console.log(`Historical thumbnail success: ${historicalThumbnailSuccess}`);
  console.log(`Historical thumbnail fallback: ${historicalThumbnailFallback}`);
  console.log(`Manufacturer matched posts: ${archive.stats.manufacturerMatches}`);
  console.log(`Vehicle matched posts: ${archive.stats.vehicleMatches}`);
  console.log(`Detail matched posts: ${archive.stats.detailMatches}`);
  console.log(`Region matched posts: ${archive.stats.regionMatches}`);
  console.log(`Neighborhood matched posts: ${archive.stats.neighborhoodMatches}`);
  console.log(`Battery matched posts: ${archive.stats.batteryMatches}`);
  console.log(`No-fact posts: ${archive.stats.noFactPosts}`);
  console.log(`Ambiguous posts: ${archive.stats.ambiguousPosts}`);
  console.log("Naver Blog Historical Backfill Complete");
}

main().catch((error) => {
  console.error("Naver Blog Historical Backfill Failed");
  console.error(error.message);
  process.exit(1);
});
