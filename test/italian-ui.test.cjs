'use strict';

// The structural acceptance gate for the Italian locale.
//
// This file is the RED half of a TDD pair: it was written BEFORE
// `src/renderer/src/i18n/locales/it.json` exists, and it only turns green when
// the translation is complete and correctly registered. Nothing here is
// authored by the translation task itself — this gate is.
//
// Italian CORRECTNESS is NOT tested here and is NOT claimed. No native reader
// has reviewed the wording, and no assertion below judges grammar, style or
// phrasing — a test that did would block the work on human judgement. What IS
// tested is COVERAGE and SHAPE: that every key exists, nothing is left as its
// English source, placeholders and markup survive byte-for-byte, arrays keep
// their length, and the registration in the i18n bootstrap is complete. Those
// are the failure modes that break the UI silently; the wording is not.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (code) =>
  JSON.parse(read(`src/renderer/src/i18n/locales/${code}.json`));

/** Every leaf path in a locale tree, arrays included by index. */
function leaves(node, prefix = '') {
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${prefix}.${i}`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }
  return [[prefix, node]];
}
const pathsOf = (o) => new Map(leaves(o));

/** Paths whose value is an ARRAY — kept whole, not flattened by index. */
function arrayPaths(node, prefix = '', out = []) {
  if (Array.isArray(node)) { out.push(prefix); return out; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      arrayPaths(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  return out;
}
const count = (o, p) => p.split('.').reduce((n, s) => n?.[s], o);

/** Source with comments removed, for assertions about what the CODE does. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const en = locale('en');

// The file under test may not exist yet — that is the intended RED state. Fail
// every locale-dependent check with a message that says so, instead of letting
// a raw ENOENT stack trace scroll past the reader.
const IT_FILE = 'src/renderer/src/i18n/locales/it.json';
let it = null;
let whyRed = null;
if (fs.existsSync(path.join(root, IT_FILE))) it = locale('it');
else {
  whyRed = `${IT_FILE} does not exist yet — the Italian locale has not been written. ` +
    'Create it with the exact same key tree as en.json, then register it in ' +
    'src/renderer/src/i18n/index.ts (import, resources, supportedLngs, LANGUAGES).';
}
const needsIt = () => { if (whyRed) assert.fail(whyRed); };

// --- registration: all four points a language has to be registered at -------

test('it is registered everywhere a language has to be registered', () => {
  const src = read('src/renderer/src/i18n/index.ts');
  assert.ok(src.includes("import it from './locales/it.json';"),
    'the it.json import is missing from the i18n bootstrap');
  assert.match(src, /\bit: \{ translation: it \}/, 'it is missing from resources');
  assert.match(src, /\{ code: 'it', label: 'Italiano', dir: 'ltr' \}/,
    "it is missing from LANGUAGES (code 'it', label 'Italiano', dir 'ltr')");
  // Its own assertion, because this is the single highest-risk line of the
  // change: supportedLngs is a HAND-WRITTEN literal, not derived from
  // LANGUAGES the way SUPPORTED and LanguageCode are. Omitting 'it' there
  // passes the typecheck, passes every other test here, and still makes
  // i18next silently refuse the saved choice and fall back to English — with
  // no error, no warning, and an Italian user reading English.
  assert.match(src, /supportedLngs: \[[^\]]*'it'[^\]]*\]/,
    "it is missing from the supportedLngs literal — i18next will SILENTLY fall " +
    "back to English; the array is hand-written and not derived from LANGUAGES");
});

// --- coverage and shape ------------------------------------------------------

test('the Italian locale has exactly the same key tree as English', () => {
  needsIt();
  const e = pathsOf(en), i = pathsOf(it);
  const missing = [...e.keys()].filter((k) => !i.has(k));
  const extra = [...i.keys()].filter((k) => !e.has(k));
  assert.deepEqual(missing, [],
    `it is missing ${missing.length} keys — they would silently fall back: ${missing.join(', ')}`);
  assert.deepEqual(extra, [],
    `it has ${extra.length} keys en does not — dead strings: ${extra.join(', ')}`);
  assert.ok(e.size > 1000, `sanity: only ${e.size} keys found in en`);
});

test('no Italian string is left as its English source', () => {
  needsIt();
  // A copied English string is worse than a missing one: a missing key falls
  // back to English deliberately, a copied one looks translated and is not.
  // Strings that are IDENTICAL ON PURPOSE. Each is a proper noun, a literal
  // path the user types, or a pure format string — translating any of them
  // would make the UI wrong, not more Italian. Copied verbatim from
  // arabic-ui.test.cjs so both locales are held to the same allowlist.
  const SAME_ON_PURPOSE = new Set([
    'settings.connections.slack',            // product name
    'onboarding.providerBlurb.claude',       // "Claude Code — Anthropic": two product names
    'onboarding.providerBlurb.codex',
    'onboarding.providerBlurb.antigravity',
    'onboarding.providerBlurb.gemini',
    'addAgent.projectPlaceholder',           // /path/to/your/project — a filesystem path
    'onboarding.home.placeholder',           // /path/to/HarnessAgents — same
    'mcpDefaults.toggleNote',                // "{{id}}: {{state}}" — pure interpolation
    'webhooksSection.summary'                // "{{count}} · {{state}}" — same
  ]);
  const e = pathsOf(en), i = pathsOf(it);
  const untranslated = [];
  for (const [k, v] of e) {
    if (typeof v !== 'string' || !/[A-Za-z]{4}/.test(v)) continue; // symbols, ids, brands
    if (i.get(k) === v && !SAME_ON_PURPOSE.has(k)) untranslated.push(k);
  }
  // The count is the live progress indicator while translation batches land —
  // keep it readable, with the first twenty paths so the next batch is
  // actionable straight from the failure output.
  const head = untranslated.slice(0, 20);
  assert.deepEqual(untranslated, [],
    `${untranslated.length} Italian strings are still their English source` +
    (untranslated.length
      ? ` — first ${head.length}:\n  ${head.join('\n  ')}` +
        (untranslated.length > 20 ? `\n  … and ${untranslated.length - 20} more` : '')
      : ''));
  // The allowlist must not rot into a way of hiding real gaps: a key on the
  // list that IS now different means the list is stale — drop it.
  const stale = [...SAME_ON_PURPOSE].filter((k) => i.get(k) !== e.get(k));
  assert.deepEqual(stale, [], 'allowlisted keys that ARE translated — drop them from the list');
});

test('every interpolation variable survives translation', () => {
  needsIt();
  // `{{godName}}` mistyped is a literal "{{godname}}" on screen, and i18next
  // will not warn. This is the highest-frequency way a locale file breaks.
  const e = pathsOf(en), i = pathsOf(it);
  const vars = (s) => [...String(s).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
  const bad = [];
  for (const [k, v] of e) {
    if (vars(v) !== vars(i.get(k))) bad.push(`it ${k}: [${vars(v)}] -> [${vars(i.get(k))}]`);
  }
  assert.deepEqual(bad, [], `placeholder drift:\n  ${bad.join('\n  ')}`);
  // Positive control: the comparison above can actually fail.
  assert.notEqual(vars('a {{x}}'), vars('a'));
});

test('every {{placeholder}} in Italian is byte-identical to the English one', () => {
  needsIt();
  // Stronger than the variable-name check above, and NOT covered by it: that
  // one normalises inner whitespace and case, so `{{ godName }}` (spaces) and
  // `{{godname}}` (miscased) pass it — and i18next renders both as literal
  // text on screen, never warning. The raw substring is what must survive.
  const e = pathsOf(en), i = pathsOf(it);
  const raw = (s) => [...String(s).matchAll(/\{\{[^}]*\}\}/g)].map((m) => m[0]);
  const bad = [];
  for (const [k, v] of e) {
    const known = new Set(raw(v));
    for (const ph of raw(i.get(k))) {
      if (!known.has(ph)) bad.push(`it ${k}: ${ph} (en has [${[...known].join(', ') || 'none'}])`);
    }
  }
  assert.deepEqual(bad, [], `placeholders not byte-identical to English:\n  ${bad.join('\n  ')}`);
});

test('inline markup survives translation', () => {
  needsIt();
  // Several onboarding/settings strings carry <strong>/<b>/etc, and the two
  // <Trans> pairs embed tags too. A dropped or renamed tag renders as literal
  // text — or eats the following sentence. Tag NAMES only: attributes would
  // make this a wording judgement, which it is not.
  const e = pathsOf(en), i = pathsOf(it);
  const tags = (s) => [...String(s).matchAll(/<\/?([a-z]+)>/g)].map((m) => m[1]).sort().join(',');
  const bad = [];
  for (const [k, v] of e) {
    if (tags(i.get(k)) !== tags(v)) bad.push(`it ${k}: [${tags(v)}] -> [${tags(i.get(k))}]`);
  }
  assert.deepEqual(bad, [], `markup changed:\n  ${bad.join('\n  ')}`);
});

test('every array in en.json has the same length in Italian', () => {
  needsIt();
  // Array-valued keys are discovered dynamically rather than named, because
  // every office flavour line is an array indexed by the scene — a short array
  // is an out-of-range read, and a named list goes stale the moment a new
  // array is added to en.json. Ground truth today: the six office.errand.*
  // lines hold 3 items each, office.errand.smoke holds 4, and office.suckUp,
  // office.gossip and office.cheer hold 7 each.
  const arrays = arrayPaths(en);
  assert.ok(arrays.length >= 10, `sanity: only ${arrays.length} array keys discovered in en`);
  const bad = [];
  for (const p of arrays) {
    const e = count(en, p), a = count(it, p);
    if (!Array.isArray(a) || a.length !== e.length) {
      bad.push(`it ${p}: en has ${e.length} items, it has ${Array.isArray(a) ? a.length : typeof a}`);
    }
  }
  assert.deepEqual(bad, [], `array lengths changed:\n  ${bad.join('\n  ')}`);
  // Positive controls on the EN side only: if these ever fail, the discovery
  // loop above broke (or en.json reshaped its arrays) — do not assume the
  // locale is at fault.
  assert.equal(count(en, 'office.errand.smoke').length, 4);
  assert.equal(count(en, 'office.gossip').length, 7);
});

test('no Italian string hardcodes the orchestrator name', () => {
  needsIt();
  // The orchestrator's name is user-renameable and reaches every string as the
  // {{godName}} default variable. Baking "Michael" into a locale file silently
  // undoes that rename everywhere at once — a bug this codebase has already
  // fixed three times. Arrays included: leaves() flattens by index, so every
  // office flavour line is checked on its own.
  const bad = [...pathsOf(it).entries()]
    .filter(([, v]) => /Michael/i.test(String(v)))
    .map(([k]) => k);
  assert.deepEqual(bad, [], `it.json hardcodes Michael in: ${bad.join(', ')}`);
});

test('strings about ONE agent interpolate {{name}}, not the orchestrator', () => {
  needsIt();
  // These describe whichever agent is on screen. Naming god here is not a
  // translation nit: "This restarts Michael" on a dialog that restarts Kevin
  // is a destructive action describing the wrong target.
  const perAgent = ['commandCenter.runsTheFloor', 'commandCenter.noTerminal',
                    'commandCenter.confirmRestartEngine', 'commandCenter.restartContinueTitle'];
  const f = pathsOf(it);
  for (const k of perAgent) {
    assert.match(String(f.get(k)), /\{\{name\}\}/, `it: ${k} must interpolate {{name}}`);
    assert.doesNotMatch(String(f.get(k)), /\{\{godName\}\}/, `it: ${k} is per-agent, not god`);
  }
});

test('every manual plural pair exists and the two halves differ', () => {
  needsIt();
  // This project does NOT use i18next plural suffixes: each pair is two
  // sibling keys picked by a ternary at the call site. Nothing structural
  // forces the translator to write both — and nothing else can see a translator
  // pasting the same text into both, which renders a wrong count in the UI
  // ("1 tasks indexed") with no error anywhere.
  const pairs = ['agentCard.doingTasks', 'askMe.viewAnswers', 'askMe.blockingDownstream',
                 'officeTheme.deleteCount', 'officeTheme.stillWorking',
                 'settings.memory.docCount', 'setupPanel.askDesc'];
  const f = pathsOf(it);
  for (const k of pairs) {
    assert.ok(f.has(k), `it is missing ${k}`);
    assert.ok(f.has(`${k}Plural`), `it is missing ${k}Plural`);
    assert.notEqual(f.get(k), f.get(`${k}Plural`),
      `it: ${k} and ${k}Plural are identical — the plural must differ (count wording)`);
  }
});

test('the terminal setting still explains its performance cost, in Italian too', () => {
  needsIt();
  // The founder's amendment moved this setting's default onto the language but
  // explicitly kept the control, because ON swaps the renderer and costs
  // speed. Losing that explanation would be a real regression — Italian meets
  // the same bar arabic-ui.test.cjs sets for Arabic.
  const g = count(it, 'settings.general');
  assert.ok(g.arabicTerminalDesc, 'it lost arabicTerminalDesc');
  assert.ok(g.arabicTerminalDesc.length > 80,
    "it's description is too short to still explain the tradeoff");
  assert.ok(g.arabicTerminalFollowsLanguage,
    'it never says the value is coming from the language');
});

// --- the default language ----------------------------------------------------

test('English is still the default, and still not auto-detected', () => {
  const code = strip(read('src/renderer/src/i18n/index.ts'));
  assert.match(code, /return 'en';/, 'the fallback language must stay English');
  assert.match(code, /fallbackLng: 'en'/, 'a missing Italian key must fall back to English');
  // Comments stripped: this module's header NAMES navigator.language in the
  // prose explaining why it must never be read.
  assert.ok(!code.includes('navigator'),
    'adding a locale must not turn on OS auto-detect');
});
