'use strict';

// The pty parser (usePtyParser) used to write the agent's live `action` line
// and the god agent's `blockReason` into the zustand store as ENGLISH copy.
// The store outlives renders: once the parser ran, a language switch left
// frozen English in state — AgentCard's info line, the thought bubble and
// BlockedBanner all printed the stored string verbatim in every language.
//
// The store now carries i18n KEYS (`pty.*`), and every render site translates
// at render time. This file is the guard that keeps it that way.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (code) =>
  JSON.parse(read(`src/renderer/src/i18n/locales/${code}.json`));

/** Source with comments removed, for assertions about what the CODE does. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const PARSER = 'src/renderer/src/hooks/usePtyParser.ts';
const BANNER = 'src/renderer/src/components/BlockedBanner.tsx';
const CARD = 'src/renderer/src/components/AgentCard.tsx';
const FLOOR = 'src/renderer/src/scene/office/OfficeFloor.tsx';

// Upstream ships en / zh-CN / ar (no Italian — that is fork-only).
const SHIPPED = ['en', 'zh-CN', 'ar'];

const PTY_KEYS = [
  'awaiting',
  'waitingOnYou',
  'waitingOnGod',
  'waitingSummary',
  'waitingDetail',
  'approve',
  'deny'
];

// --- the machine contract that must survive any rewording -------------------

test('the parser keeps the approve/deny send payloads untouched', () => {
  const src = strip(read(PARSER));
  // The buttons sent to the tmux pane are machine payloads — they must survive
  // any rewording of the labels around them.
  assert.match(src, /send: 'y\\r'/, "the Approve payload 'y\\r' is gone");
  assert.match(src, /send: 'n\\r'/, "the Deny payload 'n\\r' is gone");
  assert.match(src, /kind: 'approve'/);
  assert.match(src, /kind: 'deny'/);
});

// --- the store carries keys, never English copy ------------------------------

test('the parser writes pty.* keys into the store, not English', () => {
  const src = strip(read(PARSER));
  // The exact literals this change removed. A future edit that re-introduces
  // one would freeze English into state again, silently.
  for (const gone of [
    'waiting on you',
    'waiting on god',
    'Waiting for your reply',
    'Claude is waiting for input',
    "label: 'Approve'",
    "label: 'Deny'"
  ]) {
    assert.ok(!src.includes(gone), `"${gone}" is written into the store again — store the pty.* key instead`);
  }
  for (const key of PTY_KEYS) {
    assert.ok(src.includes(`pty.${key}`), `the parser no longer references pty.${key}`);
  }
});

// --- every locale carries the same tree, translated --------------------------

test('every shipped locale has the full pty namespace', () => {
  const en = locale('en').pty;
  assert.ok(en, 'en.json has no pty namespace');
  assert.deepEqual(Object.keys(en).sort(), [...PTY_KEYS].sort(), 'en pty keys drifted from the parser contract');
  for (const code of ['zh-CN', 'ar']) {
    const block = locale(code).pty;
    assert.ok(block, `${code}.json has no pty namespace`);
    assert.deepEqual(Object.keys(block).sort(), Object.keys(en).sort(), `${code} drifted from en in pty`);
    for (const key of PTY_KEYS) {
      assert.ok(typeof block[key] === 'string' && block[key].trim(), `${code}.pty.${key} is empty`);
      assert.ok(block[key] !== en[key], `${code}.pty.${key} is untranslated (equals en)`);
    }
  }
});

test('the blocked detail is provider-neutral', () => {
  // CONTRIBUTING: the harness wraps twelve CLIs — visible copy says "the
  // agent", never the name of one provider.
  for (const code of SHIPPED) {
    const values = Object.values(locale(code).pty ?? {}).join(' ');
    assert.ok(!/\bClaude\b/.test(values), `${code}.pty mentions Claude — provider-neutral copy required`);
  }
  assert.match(locale('en').pty.waitingDetail, /\bagent\b/i, 'en detail should say "the agent"');
});

// --- every render site translates --------------------------------------------

test('BlockedBanner translates the stored keys at render time', () => {
  const src = strip(read(BANNER));
  // The exact verbatim renders this change removed. (key={a.label} stays —
  // that is React map identity, not displayed text.)
  for (const gone of ['{reason.summary}', '{reason.detail}']) {
    assert.ok(!src.includes(gone), `BlockedBanner renders ${gone} verbatim — translate it`);
  }
  assert.match(src, /t\(reason\.summary\)/);
  assert.match(src, /t\(reason\.detail\)/);
  assert.match(src, /t\(a\.label\)/);
});

test('AgentCard and OfficeFloor translate pty.* actions, passing live summaries through', () => {
  for (const [name, file] of [['AgentCard', CARD], ['OfficeFloor', FLOOR]]) {
    const src = strip(read(file));
    assert.ok(src.includes('translateAction'), `${name} does not translate pty.* actions at render`);
  }
  // The helper itself must pass non-key content (live tool summaries like
  // "edit App.tsx") through untouched, not feed it to t().
  const parser = strip(read(PARSER));
  assert.match(parser, /isPtyKey/, 'the key guard is gone from the parser module');
  assert.match(parser, /export function translateAction/, 'translateAction is gone');
  assert.match(parser, /t\(action\) : action/, 'translateAction must pass non-key text through untranslated');
});
