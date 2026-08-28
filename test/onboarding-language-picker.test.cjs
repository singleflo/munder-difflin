// The onboarding wizard is the first — and for a while the ONLY — screen a new
// install shows, and it covers the window until it is finished. The app never
// reads the OS locale by design, so without a picker here every new user starts
// in English and the only way to change that is a Settings dialog they cannot
// reach yet. Shipping translations without this control leaves the one screen a
// non-English speaker is forced to read untranslatable in practice.
//
// The locale-parity tests cannot notice any of that: they compare key trees, and
// a picker that is absent from the UI has no keys to compare.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
const src = () => read('src/renderer/src/components/OnboardingWizard.tsx');

test('the wizard offers every registered language', () => {
  const s = src();
  assert.match(s, /import \{ LANGUAGES, setLanguage \} from '@\/i18n'/, 'wizard does not import the language list');
  assert.match(s, /LANGUAGES\.map\(/, 'wizard does not render options from LANGUAGES');
  // Hardcoding the list here would silently drop any language added later.
  assert.ok(
    !/value="(en|it|ar|zh-CN)"/.test(s),
    'the wizard hardcodes language codes — render them from LANGUAGES instead'
  );
});

test('choosing a language persists it, exactly like Settings does', () => {
  // setLanguage() writes localStorage; i18n.changeLanguage() alone would be lost
  // on the next launch, which is the launch that matters for a first-run choice.
  assert.match(src(), /onChange=\{\(e\) => setLanguage\(e\.target\.value\)\}/, 'the picker does not call setLanguage');
});

test('the picker is on the FIRST step, before any English copy has to be read', () => {
  const s = src();
  const persona = s.indexOf("{step === 'persona' &&");
  const welcome = s.indexOf("{step === 'welcome' &&");
  const picker = s.indexOf('LANGUAGES.map(');
  assert.ok(persona !== -1 && welcome !== -1, 'the step blocks moved — this test needs updating');
  assert.ok(picker > persona && picker < welcome, 'the picker is not on the persona step, so it is reached too late');
});

test('the picker label is translated in every shipped locale', () => {
  const en = locale('en').onboarding.language;
  assert.ok(en, 'en.json has no onboarding.language');
  for (const code of ['it', 'zh-CN', 'ar']) {
    const value = locale(code).onboarding.language;
    assert.ok(value, `${code}.json has no onboarding.language`);
    assert.notEqual(value, en, `${code} left onboarding.language as its English source`);
  }
});
