import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const CANONICAL_RELEASE_RUNTIME_COMMIT = 'f007017fa7106cb21737f8ee7189f552441fdaa7';

// This exact allowlist/pattern is the CORE consultation bundle, not the site-wide
// generated SEO corpus. New matching tracked assets automatically change its hash.
export function isCanonicalRuntimePath(name) {
  return name === 'index.html'
    || name === 'smart-consult/index.html'
    || ['css/index.css', 'css/home-hero-intro.css'].includes(name)
    || /^css\/smart-consult[^/]*\.css$/.test(name)
    || /^js\/smart-consult[^/]*\.js$/.test(name)
    || /^data\/[^/]+\.json$/.test(name)
    || ['seo-data/smart-consult-location-index.json', 'seo-data/service-areas.json'].includes(name);
}

function compareUtf8Path(a, b) {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export function canonicalRuntimeAggregate(entries) {
  const sorted = [...entries].sort((a, b) => compareUtf8Path(a.path, b.path));
  if (new Set(sorted.map(entry => entry.path)).size !== sorted.length)
    throw new Error('Duplicate canonical runtime path');
  if (sorted.some(entry => !isCanonicalRuntimePath(entry.path) || !/^[0-9a-f]{64}$/.test(entry.sha256)))
    throw new Error('Invalid canonical runtime manifest entry');
  const manifest = `ILDEUNG-CORE-RUNTIME-SHA256-V1\n${sorted.map(entry => `${entry.path}\t${entry.sha256}\n`).join('')}`;
  return sha256(Buffer.from(manifest, 'utf8'));
}

export function assertExpectedRuntimeSourceCommit(declared, expected = CANONICAL_RELEASE_RUNTIME_COMMIT) {
  if (!/^[0-9a-f]{40}$/.test(expected) || declared !== expected)
    throw new Error(`Runtime source commit mismatch: expected ${expected}, received ${declared}`);
}

export function getCanonicalReleaseRuntime(repoRoot, expectedSourceCommit = CANONICAL_RELEASE_RUNTIME_COMMIT) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  assertExpectedRuntimeSourceCommit(expectedSourceCommit);
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', expectedSourceCommit, head], { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    throw new Error(`Current HEAD ${head} is not descended from runtime source ${expectedSourceCommit}`);
  }

  const tree = execFileSync('git', ['ls-tree', '-rz', head], { cwd: repoRoot, maxBuffer: 100_000_000 });
  const files = tree.toString('utf8').split('\0').filter(Boolean).map(record => {
    const match = record.match(/^(\d+) blob ([0-9a-f]{40})\t(.+)$/);
    if (!match) return null;
    const [, mode, oid, name] = match;
    if (!isCanonicalRuntimePath(name)) return null;
    if (mode !== '100644' && mode !== '100755') throw new Error(`Non-regular runtime asset: ${name}`);
    return { path: name, oid };
  }).filter(Boolean).sort((a, b) => compareUtf8Path(a.path, b.path));

  const blobStream = execFileSync('git', ['cat-file', '--batch'], {
    cwd: repoRoot,
    input: Buffer.from(`${files.map(file => file.oid).join('\n')}\n`, 'ascii'),
    maxBuffer: 300_000_000,
  });
  let offset = 0;
  const entries = files.map(file => {
    const headerEnd = blobStream.indexOf(10, offset);
    if (headerEnd < 0) throw new Error(`Missing Git blob header: ${file.path}`);
    const header = blobStream.subarray(offset, headerEnd).toString('ascii').split(' ');
    if (header[0] !== file.oid || header[1] !== 'blob') throw new Error(`Unexpected Git object: ${file.path}`);
    const size = Number(header[2]);
    const start = headerEnd + 1;
    const end = start + size;
    if (!Number.isSafeInteger(size) || end >= blobStream.length || blobStream[end] !== 10)
      throw new Error(`Invalid Git blob length: ${file.path}`);
    const content = blobStream.subarray(start, end);
    offset = end + 1;
    return { path: file.path, gitBlobSha1: file.oid, sha256: sha256(content), bytes: size };
  });

  const untrackedRuntime = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
    cwd: repoRoot,
    maxBuffer: 100_000_000,
  }).toString('utf8').split('\0').filter(Boolean).filter(isCanonicalRuntimePath);
  return {
    algorithmVersion: 'ILDEUNG-CORE-RUNTIME-SHA256-V1',
    head,
    runtimeSourceCommit: expectedSourceCommit,
    fileCount: entries.length,
    sha256: canonicalRuntimeAggregate(entries),
    entries,
    untrackedRuntime,
  };
}
