export function caseContentFingerprint(html) {
  return [...html.matchAll(/<article\b[^>]*class="(?:blog-case-card|work-case-card)\b[^"]*"[\s\S]*?<\/article>/g)]
    .map((m) => m[0].replace(/\r\n/g, "\n").replace(/ data-case-(?:id|tier|relation)="[^"]*"/g, ""))
    .join("\n");
}

export function validatedBatches(values, size = 100) {
  if (!Number.isInteger(size) || size < 1 || size > 100) throw new Error("Invalid batch size");
  const urls = [...new Set(values.filter((value) => {
    try {
      const u = new URL(value);
      return u.origin === "https://battery1.co.kr" && !u.username && !u.password && !u.search && !u.hash && u.toString() === value;
    } catch { return false; }
  }))].sort();
  const batches = [];
  for (let i = 0; i < urls.length; i += size) batches.push(urls.slice(i, i + size));
  return { urls, batches };
}

export async function submitBatches(values, submit) {
  const { urls, batches } = validatedBatches(values);
  const results = [];
  for (const [index, batch] of batches.entries()) {
    let response;
    try { response = await submit(batch); }
    catch (error) { response = { status: "FAILED", responseBody: error.message }; }
    results.push({ batch: index + 1, urlCount: batch.length, ...response });
  }
  const failedBatches = results.filter((r) => r.status === "FAILED").length;
  return {
    status: !urls.length ? "SKIPPED_NO_CHANGE" : failedBatches ? "FAILED" : "ACCEPTED",
    totalValidated: urls.length, batchCount: batches.length, batches: results,
    submittedUrls: results.filter((r) => r.status !== "FAILED").reduce((n, r) => n + r.urlCount, 0),
    attemptedUrls: results.reduce((n, r) => n + r.urlCount, 0), failedBatches, omitted: 0
  };
}
