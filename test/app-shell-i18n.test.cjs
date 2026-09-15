// The app shell — the title bar and the three waiting screens shown before a
// terminal exists (clocking in, waking the floor, empty floor / no agent) — had
// every string hardcoded in English. They are the first thing seen after the
// hive picker and the last thing a slow launch leaves on screen, and they stayed
// English in every locale.
//
// The locale-parity tests cannot catch that: a hardcoded string is absent from
// en.json, so all four locales agree and every check stays green while the
// screen is untranslatable. This file is the guard that notices.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
const OTHERS = ['it', 'zh-CN', 'ar'];

test('the app shell reads its strings from i18n, not from literals', () => {
  for (const file of ['src/renderer/src/App.tsx', 'src/renderer/src/components/MichaelBooting.tsx']) {
    const src = read(file);
    assert.match(src, /useTranslation/, `${file} does not call useTranslation`);
    assert.match(src, /const \{ t \} = useTranslation\(\)/, `${file} does not destructure t`);
  }
});

// Comments are prose ABOUT the screens and legitimately quote them ("while the
// god agent is clocking in"); only executable code can render English.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('the strings that used to be hardcoded are gone from the source', () => {
  const src = stripComments(read('src/renderer/src/App.tsx'))
    + stripComments(read('src/renderer/src/components/MichaelBooting.tsx'));
  // The exact literals this change removed. Re-introducing one would render
  // English in every locale again, silently.
  for (const gone of [
    'CLOCKING IN',
    'WAKING THE FLOOR',
    'EMPTY FLOOR',
    'NO AGENT SELECTED',
    'auto mode on',
    'auto mode off',
    'is clocking in',
    'Hang tight',
    'will land here',
    'Spawn an agent from the strip',
    'No agents on the floor yet',
    'Toggle dark mode',
    'Toggle focus mode'
  ]) {
    assert.ok(!src.includes(gone), `"${gone}" is hardcoded again — route it through t()`);
  }
});

test('every app key exists in every shipped locale', () => {
  const en = locale('en').app;
  assert.ok(en, 'en.json has no app namespace');
  const keys = Object.keys(en).sort();
  assert.ok(keys.length >= 15, `only ${keys.length} app keys — the extraction looks incomplete`);
  for (const code of OTHERS) {
    const block = locale(code).app;
    assert.ok(block, `${code}.json has no app namespace`);
    assert.deepEqual(Object.keys(block).sort(), keys, `${code} drifted from en in app`);
  }
});

test('the boot screens keep {{godName}} in every locale', () => {
  // These screens run BEFORE the live god agent exists, so the component passes
  // godName to t() explicitly. A locale that drops the placeholder renders a
  // sentence with no name at all, and i18next never warns.
  for (const code of ['en', ...OTHERS]) {
    const block = locale(code).app;
    for (const key of ['clockingInDesc', 'wakingLine1']) {
      assert.match(String(block[key]), /\{\{\s*godName\s*\}\}/, `${code} app.${key} lost {{godName}}`);
    }
  }
});

test('the boot screens pass godName explicitly, not via the i18n default', () => {
  // i18n's default {{godName}} is fed from the LIVE god agent (useGodNameSync),
  // which by definition does not exist while god is still booting — relying on
  // it would show the fallback name to anyone who renamed their orchestrator.
  assert.match(
    read('src/renderer/src/components/MichaelBooting.tsx'),
    /t\('app\.clockingInDesc',\s*\{\s*godName\s*\}\)/,
    'MichaelBooting no longer passes the resolved godName to t()'
  );
  assert.match(
    read('src/renderer/src/App.tsx'),
    /t\('app\.wakingLine1',\s*\{\s*godName:\s*bootingGodName\s*\}\)/,
    'App no longer passes the resolved godName to the waking screen'
  );
});

test('no app string is left as its English source', () => {
  const en = locale('en').app;
  for (const code of OTHERS) {
    const block = locale(code).app;
    for (const key of Object.keys(en)) {
      assert.notEqual(block[key], en[key], `${code} left app.${key} as its English source`);
    }
  }
});
