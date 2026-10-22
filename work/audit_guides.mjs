import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const names = ['SIDDH_JAIN_BACKEND_GUIDE.md', 'KIRAN_FEATURES_INTEGRATION_GUIDE.md', 'SHARED_BACKLOG_AND_COORDINATION.md'];
const previous = '/Users/hitayuparikh/Documents/Codex/2026-10-15/referenced-chatgpt-conversation-this-is-an/outputs';
const docs = names.map(name => readFileSync(resolve(root, 'outputs', name), 'utf8'));
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  process.stdout.write('PASS ' + name + '\n');
}
function includesAll(doc, strings) {
  for (const str of strings) assert.ok(doc.includes(str), 'Missing requirement: ' + str);
}
const blocks = docs.map(doc => doc.match(/<!-- BEGIN SHARED CONTRACT v2 -->[\s\S]*?<!-- END SHARED CONTRACT v2 -->/)?.[0]);
check('exactly one shared contract block per guide', () => {
  docs.forEach(doc => {
    assert.equal((doc.match(/<!-- BEGIN SHARED CONTRACT v2 -->/g) || []).length, 1);
    assert.equal((doc.match(/<!-- END SHARED CONTRACT v2 -->/g) || []).length, 1);
  });
});
check('shared contracts are byte-identical', () => {
  assert.ok(blocks[0]);
  assert.equal(blocks[0], blocks[1]);
  assert.equal(blocks[0], blocks[2]);
});
check('all guides carry the same version/date', () => docs.forEach(doc => assert.ok(doc.includes('Guide version 2 · Audited 2026-10-21'))));
check('Siddh phases are exactly 1 through 10', () => {
  const actual = [...docs[0].matchAll(/^### Phase (\d+) — /gm)].map(m => Number(m[1]));
  assert.deepEqual(actual, Array.from({length: 10}, (_, i) => i + 1));
});
check('Kiran phases are exactly 1 through 11', () => {
  const actual = [...docs[1].matchAll(/^### Phase (\d+) — /gm)].map(m => Number(m[1]));
  assert.deepEqual(actual, Array.from({length: 11}, (_, i) => i + 1));
});
check('shared backlog has exactly S1 through S10', () => {
  const actual = [...docs[2].matchAll(/^### S(\d+) — /gm)].map(m => Number(m[1]));
  assert.deepEqual(actual, Array.from({length: 10}, (_, i) => i + 1));
});
check('role checkpoints and resume semantics are explicit', () => {
  includesAll(docs[0], ['docs/checkpoints/siddh.md', 'Resume the earliest unfinished phase', 'a new chat does not restart Phase 1']);
  includesAll(docs[1], ['docs/checkpoints/kiran.md', 'Resume the earliest unfinished phase', 'a new chat does not restart Phase 1']);
});
check('one phase and one understanding question required', () => docs.slice(0, 2).forEach(doc => includesAll(doc, ['authorizes one phase only', 'One short understanding question', 'answering is optional'])));
check('failed checks and fixture completion have distinct states', () => docs.forEach(doc => includesAll(doc, ['implemented_unverified', 'complete_local', 'blocked'])));
check('standalone contract contains all principal endpoint groups', () => includesAll(blocks[0], [
  '/api/v1/auth/logout', '/api/v1/simulations/{id}/market-data/{symbol}',
  '/api/v1/simulations/{id}/orders', '/api/v1/simulations/{id}/performance',
  '/api/v1/quizzes/{id}', '/api/v1/tutor/messages'
]));
check('timing, idempotency, decimals and ownership are explicit', () => includesAll(blocks[0], [
  'Idempotency-Key', 'expected_version', 'one pending order',
  'null execution fields', 'next-session open', 'simulated current_time',
  'integer USD cents', 'whole cents for MVP', 'two users',
  'Reject future range bounds'
]));
check('historical data remains a required deliverable', () => {
  includesAll(blocks[0], ['real historical ingestion is a required deliverable', 'source, license/usage terms']);
  includesAll(docs[0], ['Real-data gate', 'sourced real historical dataset', 'If historical data, content, or a required tool is missing']);
});
check('Kiran prerequisites and tutor route ownership are explicit', () => includesAll(docs[1], [
  'Shared S2 must be selected and completed', 'Shared S4 provides authentication UI',
  'tutor router/provider adapter to the existing FastAPI backend'
]));
check('tutor in simulation uses deterministic mode without model calls', () => includesAll(blocks[0], [
  'use approved deterministic concept explanations', 'without calling a model',
  'tutor_unavailable', 'No browser secret'
]));
check('shared selection is persisted and completed items do not rerun', () => includesAll(docs[2], [
  'docs/checkpoints/shared.md', 'Selection records a choice',
  'already complete, another proceed reports that fact'
]));
check('final gates require live core integration and durable storage', () => {
  includesAll(blocks[0], ['real core API integration', 'save/restart/reload persistence', 'durable volume']);
  includesAll(docs[1], ['Missing S4, backend endpoints', 'actual deployed verification passes']);
});
check('reference accounting and calculator oracles are standalone', () => docs.forEach(doc => includesAll(doc, [
  'cash/equity 1015.00', 'cumulative realized 15.00', 'balance_next = balance',
  '80% or above'
])));
check('documented numerical examples independently reconcile', () => {
  const initial = 1000;
  let cash = initial - 2 * 100;
  assert.equal(cash + 2 * 110, 1020);
  cash += 120;
  assert.equal(cash, 920);
  assert.equal(120 - 100, 20);
  assert.equal(90 - 100, -10);
  assert.equal(cash + 90, 1010);
  cash += 95;
  assert.equal(cash, 1015);
  assert.equal(20 + 95 - 100, 15);
  assert.equal(1000 + 100 * 12, 2200);
  assert.ok(Math.abs(1000 * (1 + 0.12) - 1120) < 1e-8);
});
check('backlog status does not invent initial implementation progress', () => includesAll(docs[2], ['initially **not assessed**', 'not assertions that code is absent']));
check('original download links and current workspace copies match', () => names.forEach((name, i) => {
  assert.ok(existsSync(resolve(previous, name)));
  assert.equal(readFileSync(resolve(previous, name), 'utf8'), docs[i]);
}));
const hash = createHash('sha256').update(blocks[0]).digest('hex');
process.stdout.write('\n' + checks + ' document checks passed. Shared contract SHA256: ' + hash + '\n');
process.stdout.write('Scope: document consistency and numerical examples only; no application code, live APIs, security guarantees, or deployment tested.\n');
