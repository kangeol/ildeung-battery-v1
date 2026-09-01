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
  extractNaverPostId,
  normalizeText,
  stripHtml,
  toIsoDate,
  truncateText,
  writeJson
} from "./lib/blog-case-utils.js";
import { buildSafeSummary, createBlogCaseIndex, extractFactsFromPost } from "./lib/blog-case-matcher.js";

const RSS_ITEM_LIMIT_HINT = 50;

function extractTag(block, tagName) {
  const escaped = tagName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));

  if (!match) {
    return "";
  }

  return decodeXmlEntities(match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "")).trim();
}

function extractAttributeTag(block, tagName, attribute) {
  const escaped = tagName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const tag = block.match(new RegExp(`<${escaped}\\b[^>]*>`, "i"))?.[0] || "";
  const attr = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i"));
  return attr ? decodeXmlEntities(attr[1]) : "";
}

function extractDescriptionImage(description) {
  const match = String(description ?? "").match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return match ? decodeXmlEntities(match[1]) : "";
}

function extractItems(xml) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
}

function parseTags(value) {
  return normalizeText(value)
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function parseRssItem(block) {
  const rawLink = extractTag(block, "link");
  const rawDescription = extractTag(block, "description");
  const guid = extractTag(block, "guid");
  const sourceThumbnailUrl =
    extractAttributeTag(block, "media:thumbnail", "url") ||
    extractAttributeTag(block, "media:content", "url") ||
    extractAttributeTag(block, "enclosure", "url") ||
    extractDescriptionImage(rawDescription);
  const canonicalUrl = canonicalNaverPostUrl(guid || rawLink);
  const postId = extractNaverPostId(canonicalUrl || rawLink || guid);
  const title = stripHtml(extractTag(block, "title"));
  const publishedAt = toIsoDate(extractTag(block, "pubDate"));
  const tags = parseTags(extractTag(block, "tag"));
  const excerpt = truncateText(stripHtml(rawDescription), 420);

  return {
    id: postId || canonicalUrl,
    title,
    url: canonicalUrl,
    publishedAt,
    thumbnail: "",
    sourceThumbnailUrl,
    sourceExcerpt: excerpt,
    tags,
    raw: {
      link: rawLink,
      guid
    }
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; IldeungBatterySEO/1.0)"
    }
  });

  const body = await response.text();

  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    body
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

function preferExistingField(existingPost, incomingPost, key) {
  return Object.hasOwn(existingPost, key) ? existingPost[key] : incomingPost[key];
}

function mergePost(existingPost = {}, incomingPost = {}) {
  const merged = {
    ...existingPost,
    ...incomingPost,
    title: preferExistingField(existingPost, incomingPost, "title"),
    url: preferExistingField(existingPost, incomingPost, "url"),
    publishedAt: preferExistingField(existingPost, incomingPost, "publishedAt"),
    thumbnail: preferExistingField(existingPost, incomingPost, "thumbnail"),
    thumbnailStatus: preferExistingField(existingPost, incomingPost, "thumbnailStatus"),
    thumbnailError: preferExistingField(existingPost, incomingPost, "thumbnailError"),
    sourceThumbnailUrl: preferExistingField(existingPost, incomingPost, "sourceThumbnailUrl"),
    sourceExcerpt: preferExistingField(existingPost, incomingPost, "sourceExcerpt"),
    tags: preferExistingField(existingPost, incomingPost, "tags")
  };

  merged.sources = [...new Set([
    ...(Array.isArray(existingPost.sources) ? existingPost.sources : []),
    ...(Array.isArray(incomingPost.sources) ? incomingPost.sources : [])
  ].filter(Boolean))];

  return merged;
}

function mergePosts(existingPosts, fetchedPosts) {
  const byKey = new Map();
  const existingKeys = new Set();
  const urlToKey = new Map();

  existingPosts.forEach((post) => {
    const key = postKey(post);
    if (key) {
      existingKeys.add(key);
      byKey.set(key, post);

      if (post.url) {
        urlToKey.set(post.url, key);
      }
    }
  });

  let newPosts = 0;
  const newPostIds = new Set();

  fetchedPosts.forEach((post) => {
    const key = postKey(post);
    if (!key) {
      return;
    }

    const existingKey = byKey.has(key) ? key : urlToKey.get(post.url);

    if (existingKey && byKey.has(existingKey)) {
      byKey.set(existingKey, mergePost(byKey.get(existingKey), post));
      return;
    }

    if (!byKey.has(key)) {
      newPosts += 1;
      newPostIds.add(post.id);
    }

    byKey.set(key, mergePost({}, post));
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
    duplicateRemoved: existingPosts.length + fetchedPosts.length - merged.length,
    preservedPreviousPosts: merged.filter((post) => existingKeys.has(postKey(post))).length,
    newPostIds
  };
}

function countFacts(posts, key) {
  return posts.reduce((total, post) => total + ((post.facts?.[key] || []).length ? 1 : 0), 0);
}

function localThumbnailExists(post) {
  if (!post.thumbnail?.startsWith("/assets/blog-cases/")) {
    return false;
  }

  return fs.existsSync(path.join(BLOG_CASES_ASSET_DIR, path.basename(post.thumbnail)));
}

function archiveForComparison(archive) {
  return {
    ...archive,
    syncedAt: ""
  };
}

function hasMaterialArchiveChange(existing, candidate) {
  return JSON.stringify(archiveForComparison(existing)) !== JSON.stringify(archiveForComparison(candidate));
}

async function main() {
  console.log("Naver Blog Cases Sync Start");
  console.log("");
  console.log(`Blog URL: ${BLOG_URL}`);
  console.log(`RSS URL: ${BLOG_RSS_URL}`);

  const rss = await fetchText(BLOG_RSS_URL);
  console.log(`RSS HTTP status: ${rss.status}`);
  console.log(`RSS content-type: ${rss.contentType}`);

  if (rss.status !== 200 || !/xml/i.test(rss.contentType)) {
    throw new Error(`RSS source is not stable: HTTP ${rss.status}, ${rss.contentType}`);
  }

  const itemBlocks = extractItems(rss.body);
  const fetchedPosts = itemBlocks.map(parseRssItem);
  const existing = readExistingArchive();
  const existingPosts = Array.isArray(existing.posts) ? existing.posts : [];
  const { merged, newPosts, duplicateRemoved, preservedPreviousPosts, newPostIds } = mergePosts(existingPosts, fetchedPosts);
  const index = createBlogCaseIndex();
  let thumbnailSuccess = 0;
  let thumbnailFallback = 0;
  let newThumbnails = 0;

  for (const post of merged) {
    const needsThumbnail = newPostIds.has(post.id) || !post.thumbnail || !localThumbnailExists(post);

    if (needsThumbnail) {
      const thumbnailResult = await downloadThumbnail(post);
      post.thumbnail = thumbnailResult.thumbnail;
      post.thumbnailStatus = thumbnailResult.status;
      post.thumbnailError = thumbnailResult.error;

      if (newPostIds.has(post.id) && thumbnailResult.status === "downloaded") {
        newThumbnails += 1;
      }
    }

    if (post.thumbnailStatus === "downloaded") {
      thumbnailSuccess += 1;
    } else {
      thumbnailFallback += 1;
    }

    post.facts = extractFactsFromPost(post, index);
    post.summary = buildSafeSummary(post, post.facts);
    post.matchConfidence = {
      manufacturer: post.facts.manufacturers.length,
      vehicle: post.facts.vehicles.length,
      detail: post.facts.detailModels.length,
      actualLocation: post.facts.actualWorkLocation ? 1 : 0,
      mentionedServiceArea: post.facts.mentionedServiceAreas.length,
      region: post.facts.regions.length,
      neighborhood: post.facts.neighborhoods.length,
      battery: post.facts.batteryModels.length
    };
  }

  const archive = {
    version: 1,
    blogId: BLOG_ID,
    sourceUrl: BLOG_URL,
    rssUrl: BLOG_RSS_URL,
    syncedAt: new Date().toISOString(),
    historicalBackfill: existing.historicalBackfill || null,
    source: {
      type: "naver-rss",
      httpStatus: rss.status,
      contentType: rss.contentType,
      rssItemCount: itemBlocks.length,
      publiclyAccessibleFields: ["title", "link", "guid", "pubDate", "description", "tag", "description img"],
      historicalCoverage: itemBlocks.length >= RSS_ITEM_LIMIT_HINT
        ? "RSS appears limited to the current public feed window; previously saved posts are preserved across sync."
        : "RSS returned fewer than 50 posts; no separate stable public archive pagination was used."
    },
    stats: {
      ...(existing.stats || {}),
      fetchedPosts: fetchedPosts.length,
      newPosts,
      preservedPreviousPosts,
      duplicateRemoved,
      thumbnailSuccess,
      thumbnailFallback,
      manufacturerMatches: countFacts(merged, "manufacturers"),
      vehicleMatches: countFacts(merged, "vehicles"),
      detailMatches: countFacts(merged, "detailModels"),
      actualAreaMatches: countFacts(merged, "areas"),
      actualRegionMatches: countFacts(merged, "regions"),
      actualNeighborhoodMatches: countFacts(merged, "neighborhoods"),
      mentionedServiceAreaPosts: countFacts(merged, "mentionedServiceAreas"),
      serviceAreaOnlyMentionsExcluded: merged.filter((post) => (
        (post.facts?.mentionedServiceAreas || []).length &&
        !(post.facts?.areas || []).length &&
        !(post.facts?.regions || []).length &&
        !(post.facts?.neighborhoods || []).length
      )).length,
      regionMatches: countFacts(merged, "regions"),
      neighborhoodMatches: countFacts(merged, "neighborhoods"),
      batteryMatches: countFacts(merged, "batteryModels")
    },
    posts: merged.map(({ raw, ...post }) => post)
  };

  if (hasMaterialArchiveChange(existing, archive)) {
    writeJson(BLOG_CASES_FILE, archive);
  }

  console.log("");
  console.log(`Fetched posts: ${archive.stats.fetchedPosts}`);
  console.log(`Merged posts: ${archive.posts.length}`);
  console.log(`New posts: ${archive.stats.newPosts}`);
  console.log(`New thumbnails: ${newThumbnails}`);
  console.log(`Material archive changed: ${hasMaterialArchiveChange(existing, archive) ? "yes" : "no"}`);
  console.log(`Duplicate removed: ${archive.stats.duplicateRemoved}`);
  console.log(`Thumbnail success: ${archive.stats.thumbnailSuccess}`);
  console.log(`Thumbnail fallback: ${archive.stats.thumbnailFallback}`);
  console.log(`Manufacturer matched posts: ${archive.stats.manufacturerMatches}`);
  console.log(`Vehicle matched posts: ${archive.stats.vehicleMatches}`);
  console.log(`Detail matched posts: ${archive.stats.detailMatches}`);
  console.log(`Actual area matched posts: ${archive.stats.actualAreaMatches}`);
  console.log(`Actual region matched posts: ${archive.stats.actualRegionMatches}`);
  console.log(`Actual neighborhood matched posts: ${archive.stats.actualNeighborhoodMatches}`);
  console.log(`Mentioned service area posts: ${archive.stats.mentionedServiceAreaPosts}`);
  console.log(`Service-area-only mentions excluded: ${archive.stats.serviceAreaOnlyMentionsExcluded}`);
  console.log(`Region matched posts: ${archive.stats.regionMatches}`);
  console.log(`Neighborhood matched posts: ${archive.stats.neighborhoodMatches}`);
  console.log(`Battery matched posts: ${archive.stats.batteryMatches}`);
  console.log("Naver Blog Cases Sync Complete");
}

main().catch((error) => {
  console.error("Naver Blog Cases Sync Failed");
  console.error(error.message);
  process.exit(1);
});
