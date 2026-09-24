import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { conversationTurn, createConversationState } from '../js/smart-consult-conversation.js';
import { evaluateCase, releaseBlockers, sha256 } from './lib/frozen-corpus-semantic-evaluator.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = os.tmpdir();
const corpusDir = process.env.ILDEUNG_FROZEN_CORPUS_DIR || path.join(temp, 'customer-semi-blind-7f2358a568c7402abf00809252259ed9');
const baselineFile = process.env.ILDEUNG_FROZEN_REFERENCE || path.join(temp, 'p1a-ellipse-20260924', 'corpus-adjudicated.jsonl');
const outputDir = process.env.ILDEUNG_EVALUATION_OUTPUT || path.join(temp, 'n1-semantic-evaluation-20260924');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const lines = file => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const registry = read(path.join(repo, 'tools/frozen-corpus-change-registry.json'));
const reviewFile = read(path.join(repo, 'tools/frozen-corpus-unapproved-review.json'));
const runtimePaths = name => /^(js\/|data\/|seo-data\/|css\/|assets\/|area\/|battery\/|car-battery\/|work-cases\/|smart-consult\/)/.test(name) || /^(index\.html|sitemap\.xml)$/.test(name);
const trackedRuntime = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).filter(runtimePaths).filter(name => /\.(?:js|json|html|css|xml)$/.test(name)).sort();
const runtimeAggregateSha256 = sha256(trackedRuntime.map(name => `${name}:${sha256(fs.readFileSync(path.join(repo, name)))}\n`).join(''));
const untrackedRuntime = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: repo, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).filter(runtimePaths);
if (runtimeAggregateSha256 !== reviewFile.runtimeAggregateSha256 || untrackedRuntime.length)
  throw Error(`Runtime does not match adjudicated hash: ${runtimeAggregateSha256}; untracked: ${untrackedRuntime.join(', ')}`);
const reviews = new Map();
for (const item of reviewFile.entries) {
  if (reviews.has(item.caseId)) throw Error(`Duplicate unapproved review ${item.caseId}`);
  reviews.set(item.caseId, item);
}
const adjudication = new Map();
for (const [decision, ids] of Object.entries(reviewFile.batchAdjudication ?? {})) for (const id of ids) {
  if (adjudication.has(id) || !reviews.has(id)) throw Error(`Duplicate or unknown batch-adjudication case: ${id}`);
  adjudication.set(id, decision);
}
if (adjudication.size !== 42 || [...reviews.keys()].some(id => !adjudication.has(id)))
  throw Error(`Original 42 changed responses were not completely batch-adjudicated: ${adjudication.size}`);
const ownerScope = reviewFile.ownerScopeAdjudication;
if (!ownerScope) throw Error('Owner scope adjudication is missing');
const ownerScopeCases = new Map();
for (const [tier, definition] of Object.entries(ownerScope)) {
  if (!tier.startsWith('TIER')) continue;
  for (const id of definition.caseIds) {
    if (ownerScopeCases.has(id) || !adjudication.get(id)?.startsWith('C_')) throw Error(`Invalid or duplicated owner scope case: ${id}`);
    ownerScopeCases.set(id, { tier, action: definition.action });
  }
}
if (ownerScopeCases.size !== 20 || [...adjudication].filter(([, decision]) => decision.startsWith('C_')).some(([id]) => !ownerScopeCases.has(id)))
  throw Error('Owner scope adjudication must cover the exact original 20 C cases');
const benignIds = new Set(reviewFile.benignDerivedReadjudication?.caseIds ?? []);
if (benignIds.size !== 22 || [...adjudication].filter(([, decision]) => decision.startsWith('B_')).some(([id]) => !benignIds.has(id)))
  throw Error('All 22 B cases require individual authorized review');
const manifest = read(path.join(corpusDir, 'generator_manifest.json'));
for (const [file, expected] of Object.entries(manifest.artifact_sha256))
  if (sha256(fs.readFileSync(path.join(corpusDir, file))) !== expected) throw Error(`Frozen artifact changed: ${file}`);
const combined = sha256(manifest.combined_hash.order.map(file => `${file}:${sha256(fs.readFileSync(path.join(corpusDir, file)))}`).join('\n') + '\n');
if (combined !== registry.frozenCorpusSha256) throw Error(`Frozen combined hash mismatch: ${combined}`);
if (sha256(fs.readFileSync(baselineFile)) !== registry.reference.sha256) throw Error('Approved reference artifact hash mismatch');

const baseline = new Map(lines(baselineFile).map(row => [row.case_id, row]));
if (baseline.size !== 3760) throw Error(`Expected 3760 approved reference turns, got ${baseline.size}`);
const contracts = new Map();
for (const contract of registry.contracts) for (const id of contract.caseIds) {
  if (contracts.has(id) || !baseline.has(id)) throw Error(`Duplicate or missing contract case: ${id}`);
  contracts.set(id, contract);
}
const source56 = lines(path.join(temp, 'p1b-no-start-20260924', 'adjudication-56.jsonl'));
const n1Ids = new Set(source56.filter(row => row.primaryRootCause === 'N1').map(row => row.CASE_ID));
const n1Registered = new Set(registry.contracts.filter(contract => contract.id === 'N1_EXPLICIT_VEHICLE_NO_START').flatMap(contract => contract.caseIds));
if (n1Ids.size !== 25 || n1Registered.size !== 25 || [...n1Registered].some(id => !n1Ids.has(id))) throw Error('N1 registry is not the exact approved 25-case source set');
const source409 = new Set(read(path.join(temp, 'p1-symptom-409-20260924', 'source-case-ids.json')));
const source1503 = new Set(read(path.join(temp, 'p1-partition-20260924', 'source-case-ids.json')));
if (source409.size !== 409 || source1503.size !== 1503 || source56.length !== 56) throw Error('Source set identity/count mismatch');

const manufacturers = read(path.join(repo, 'data/manufacturers.json'));
const records = manufacturers.flatMap(m => read(path.join(repo, 'data', m.file)).map(row => ({ ...row, manufacturerId: m.id, manufacturerName: m.name })));
const areas = read(path.join(repo, 'seo-data/smart-consult-location-index.json')).localities;
const catalog = read(path.join(repo, 'data/battery-prices.json'));
const policy = read(path.join(repo, 'data/consult-service-policy.json'));
const results = [];
let executionErrors = 0;
for (const [file, type] of [['single_turn.jsonl', 'single'], ['noisy.jsonl', 'noisy'], ['multi_turn.jsonl', 'multi']]) {
  for (const caseRecord of lines(path.join(corpusDir, file))) {
    const turns = type === 'multi' ? caseRecord.turns : [caseRecord.text];
    let state = createConversationState();
    for (let turn = 0; turn < turns.length; turn++) {
      const caseId = type === 'multi' ? `${caseRecord.id}-T${turn + 1}` : caseRecord.id;
      const input = turns[turn];
      let current;
      try {
        const output = conversationTurn(state, input, records, areas, catalog, policy);
        state = output.state;
        current = { case_id: caseId, input, output, response: output.messages.join('\n') };
      } catch (error) {
        executionErrors++;
        current = { case_id: caseId, input, output: null, response: '', executionError: String(error) };
      }
      const evaluated = evaluateCase({ current, reference: baseline.get(caseId), contract: contracts.get(caseId), review: reviews.get(caseId), catalog, policy });
      if (adjudication.has(caseId)) evaluated.batchAdjudication = adjudication.get(caseId);
      if (current.executionError) {
        evaluated.category = 'EXECUTION_ERROR'; evaluated.severity = 'S4'; evaluated.executionError = current.executionError;
        evaluated.needsAdjudication = true;
      }
      results.push(evaluated);
    }
  }
}
if (results.length !== 3760 || new Set(results.map(row => row.case_id)).size !== 3760) throw Error('Execution did not preserve all frozen turns and case IDs');
const changedUnapproved = results.filter(row => row.unapprovedResponseChange);
const missingReviews = changedUnapproved.filter(row => !row.reviewedButUnapproved);
const inactiveReviews = [...reviews.keys()].filter(id => !results.some(row => row.case_id === id && row.responseChanged));

const tally = rows => ({
  total: rows.length,
  PASS: rows.filter(row => row.severity === 'S0').length,
  S1: rows.filter(row => row.severity === 'S1').length,
  S2: rows.filter(row => row.severity === 'S2').length,
  S3: rows.filter(row => row.severity === 'S3').length,
  S4: rows.filter(row => row.severity === 'S4').length,
  unapprovedResponseChanges: rows.filter(row => row.unapprovedResponseChange).length,
  deterministicFactFailures: rows.reduce((sum, row) => sum + row.deterministicFailures.length, 0),
  semanticContractFailures: rows.reduce((sum, row) => sum + row.semanticFailures.length, 0),
  executionErrors: rows.filter(row => row.executionError).length,
  vehicleFirst: rows.filter(row => /차량명(?:과 연식)?(?:을|부터)?|차종(?:과 연식)?(?:을|부터)?|어떤 차량|차량마다 배터리/.test(row.response)).length,
});
const subsets = {
  N1_SOURCE25: results.filter(row => n1Ids.has(row.case_id)),
  SOURCE56: results.filter(row => source56.some(source => source.CASE_ID === row.case_id)),
  SOURCE409: results.filter(row => source409.has(row.case_id)),
  SOURCE1503: results.filter(row => source1503.has(row.case_id)),
};
const domainMetrics = Object.fromEntries(['CORE_BATTERY', 'CONVERSION_SERVICE', 'BATTERY_TRIAGE', 'OUT_OF_SCOPE'].map(domain => [domain, tally(results.filter(row => row.scopeDomain === domain))]));
const ownerScopeResults = results.filter(row => ownerScopeCases.has(row.case_id));
const ownerScopeReleaseBlockers = ownerScopeResults.filter(row => row.unapprovedResponseChange || row.deterministicFailures.length || row.semanticFailures.length || row.severity === 'S3' || row.severity === 'S4');
const scopeTierMap = { CORE_BATTERY: 'TIER1_CORE_BATTERY', CONVERSION_SERVICE: 'TIER2_CONVERSION_SERVICE', BATTERY_TRIAGE: 'TIER3_BATTERY_TRIAGE', OUT_OF_SCOPE: 'TIER4_OUT_OF_SCOPE' };
const tierContinuity = Object.fromEntries(Object.entries(scopeTierMap).map(([domain, tier]) => [tier, tally(results.filter(row => row.scopeDomain === domain))]));
const drift = results.filter(row => !row.responseChanged && (row.category !== row.previousCategory || row.severity !== row.previousSeverity));
const summary = {
  evaluatorPolicyVersion: registry.policyVersion,
  frozenCorpusSha256: combined,
  referenceSha256: registry.reference.sha256,
  runtimeHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  runtimeAggregateSha256,
  runtimeFileCount: trackedRuntime.length,
  all: tally(results),
  subsets: Object.fromEntries(Object.entries(subsets).map(([name, rows]) => [name, tally(rows)])),
  domains: domainMetrics,
  tierContinuity,
  ownerScopeExact20: {
    total: ownerScopeResults.length,
    byTier: Object.fromEntries([...new Set([...ownerScopeCases.values()].map(item => item.tier))].map(tier => [tier, {
      count: ownerScopeResults.filter(row => ownerScopeCases.get(row.case_id).tier === tier).length,
      remainingReleaseBlockers: ownerScopeReleaseBlockers.filter(row => ownerScopeCases.get(row.case_id).tier === tier).map(row => row.case_id),
    }])),
    remainingReleaseBlockers: ownerScopeReleaseBlockers.map(row => row.case_id),
    cases: ownerScopeResults.map(row => ({ caseId: row.case_id, ...ownerScopeCases.get(row.case_id), input: row.input, response: row.response, category: row.category, severity: row.severity, contractId: row.contractId })),
  },
  futureMetrics: {
    TIER1_RELEASE_BLOCKERS: ownerScopeReleaseBlockers.filter(row => ownerScopeCases.get(row.case_id).tier === 'TIER1_CORE_BATTERY').length,
    TIER2_RELEASE_BLOCKERS: ownerScopeReleaseBlockers.filter(row => ownerScopeCases.get(row.case_id).tier === 'TIER2_CONVERSION_SERVICE').length,
    TIER3_RELEASE_BLOCKERS: ownerScopeReleaseBlockers.filter(row => ownerScopeCases.get(row.case_id).tier === 'TIER3_BATTERY_TRIAGE').length,
    TIER4_UNSAFE_OR_FALSE_BLOCKERS: ownerScopeReleaseBlockers.filter(row => ownerScopeCases.get(row.case_id).tier === 'TIER4_OUT_OF_SCOPE').length,
    TIER4_ACCEPTABLE_SCOPE_CASES: ownerScopeResults.filter(row => ownerScopeCases.get(row.case_id).tier === 'TIER4_OUT_OF_SCOPE' && !ownerScopeReleaseBlockers.includes(row)).length,
    OUT_OF_SCOPE_UNNECESSARY_VEHICLE_FALLBACKS_RAW_LEGACY: results.filter(row => row.scopeDomain === 'OUT_OF_SCOPE' && /차량명(?:과 연식)?|차종(?:과 연식)?|어떤 차량/.test(row.response)).length,
  },
  changedResponses: results.filter(row => row.responseChanged).length,
  reviewedUnapprovedResponseChanges: changedUnapproved.filter(row => row.reviewedButUnapproved).length,
  unreviewedResponseChanges: missingReviews.length,
  inactiveReviews,
  batchAdjudication: Object.fromEntries(Object.entries(reviewFile.batchAdjudication).map(([decision, ids]) => [decision, { count: ids.length, caseIds: ids }])),
  historicalRuntimeDefects: results.filter(row => row.batchAdjudication === 'C_REAL_RUNTIME_DEFECT').map(row => ({ case_id: row.case_id, input: row.input, response: row.response, scopeDomain: row.scopeDomain, category: row.category, severity: row.severity, reason: row.reviewReason })),
  newS3: results.filter(row => row.severity === 'S3' && !['S3', 'S4'].includes(row.previousSeverity)).length,
  newS4: results.filter(row => row.severity === 'S4' && row.previousSeverity !== 'S4').length,
  unchangedClassificationDrift: drift.length,
  highSeverityCases: results.filter(row => row.severity === 'S3' || row.severity === 'S4').map(row => ({ case_id: row.case_id, input: row.input, response: row.response, category: row.category, severity: row.severity, reason: row.reviewReason ?? (row.semanticFailures.length ? row.semanticFailures.join(', ') : row.deterministicFailures.map(x => x.code).join(', ') || 'Approved reference classification retained'), basis: row.basis, deterministicFailures: row.deterministicFailures, semanticFailures: row.semanticFailures })),
  unapprovedCases: results.filter(row => row.unapprovedResponseChange).map(row => ({ case_id: row.case_id, input: row.input, response: row.response, previousCategory: row.previousCategory, previousSeverity: row.previousSeverity })),
  immutableInputs: true,
};
summary.releaseBlockers = releaseBlockers(summary);
if (ownerScopeReleaseBlockers.length) summary.releaseBlockers.push({ name: 'OWNER_SCOPE_EXACT20_RELEASE_BLOCKER', count: ownerScopeReleaseBlockers.length });
summary.status = summary.releaseBlockers.length ? 'BLOCKED' : 'PASS';
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'results.jsonl'), results.map(row => JSON.stringify(row)).join('\n') + '\n');
fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ status: summary.status, all: summary.all, subsets: summary.subsets, changedResponses: summary.changedResponses, reviewedUnapprovedResponseChanges: summary.reviewedUnapprovedResponseChanges, unreviewedResponseChanges: summary.unreviewedResponseChanges, newS3: summary.newS3, newS4: summary.newS4, unchangedClassificationDrift: drift.length, releaseBlockers: summary.releaseBlockers, outputDir }, null, 2));
if (summary.releaseBlockers.length) process.exitCode = 1;
