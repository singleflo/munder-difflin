// HivePicker is the first screen a returning user sees, and it shipped with
// every string hardcoded in English — so it stayed English in zh-CN and ar too,
// against the project's own rule that UI strings go through i18n.
//
// The locale-parity tests cannot catch that: a hardcoded string is simply absent
// from en.json, so every locale agrees and every parity check stays green while
// the screen is untranslatable. This file is the guard that notices.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
const SOURCE = 'src/renderer/src/components/HivePicker.tsx';

test('HivePicker reads its strings from i18n, not from literals', () => {
  const src = read(SOURCE);
  assert.match(src, /useTranslation\(\)/, 'HivePicker does not call useTranslation');
  assert.match(src, /const \{ t \} = useTranslation\(\)/, 't is not destructured from useTranslation');
});

test('every hivePicker key exists in every shipped locale', () => {
  const en = locale('en').hivePicker;
  assert.ok(en, 'en.json has no hivePicker namespace');
  const keys = Object.keys(en).sort();
  assert.ok(keys.length >= 10, `only ${keys.length} hivePicker keys — the extraction looks incomplete`);
  for (const code of ['it', 'zh-CN', 'ar']) {
    const block = locale(code).hivePicker;
    assert.ok(block, `${code}.json has no hivePicker namespace`);
    assert.deepEqual(Object.keys(block).sort(), keys, `${code} drifted from en in hivePicker`);
  }
});

test('the strings that used to be hardcoded are gone from the source', () => {
  const src = read(SOURCE);
  // The exact literals this change removed. A future edit that re-introduces one
  // would render English in every locale again, silently.
  for (const gone of [
    'SELECT A HARNESS CONFIG',
    'open existing config',
    'create new config',
    'Could not open that folder',
    'the app will reload'
  ]) {
    const outsideTrans = src.split('<Trans').map((chunk, i) => (i === 0 ? chunk : chunk.split('</Trans>').slice(1).join('')));
    assert.ok(
      !outsideTrans.join('').includes(gone),
      `"${gone}" is hardcoded again outside <Trans> — route it through t()`
    );
  }
});

test('the intro keeps its <strong> in every locale', () => {
  // <Trans> maps the tag by NAME, so a locale that drops or renames it renders
  // the emphasis nowhere and i18next never warns.
  const tags = (s) => [...String(s).matchAll(/<\/?([a-z]+)>/g)].map((m) => m[1]).sort().join(',');
  const expected = tags(locale('en').hivePicker.intro);
  assert.equal(expected, 'strong,strong', 'the English intro lost its <strong> pair');
  for (const code of ['it', 'zh-CN', 'ar']) {
    assert.equal(tags(locale(code).hivePicker.intro), expected, `${code} intro changed its markup`);
  }
});

test('the interpolated hivePicker strings keep their variables', () => {
  const vars = (s) => [...String(s).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
  const en = locale('en').hivePicker;
  assert.equal(vars(en.switchTitle), 'path', 'switchTitle lost {{path}}');
  assert.equal(vars(en.openingReload), 'name', 'openingReload lost {{name}}');
  for (const code of ['it', 'zh-CN', 'ar']) {
    const block = locale(code).hivePicker;
    for (const key of ['switchTitle', 'openingReload']) {
      assert.equal(vars(block[key]), vars(en[key]), `${code} ${key}: interpolation drifted`);
    }
  }
});
