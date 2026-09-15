const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));

test('CodeEditor reads its strings from i18n, not from literals', () => {
  const src = read('src/renderer/src/components/CodeEditor.tsx');
  assert.match(src, /useTranslation\(/, 'CodeEditor does not call useTranslation');
  assert.match(src, /const \{ t \} = useTranslation\('fileEditor'\)/, 't is not destructured from useTranslation');
});

test('ImagePreview reads its strings from i18n, not from literals', () => {
  const src = read('src/renderer/src/ide/ImagePreview.tsx');
  assert.match(src, /useTranslation\(/, 'ImagePreview does not call useTranslation');
  assert.match(src, /const \{ t \} = useTranslation\('imagePreview'\)/, 't is not destructured from useTranslation');
});

test('IdePanel reads its strings from i18n, not from literals', () => {
  const src = read('src/renderer/src/ide/IdePanel.tsx');
  assert.match(src, /useTranslation\(/, 'IdePanel does not call useTranslation');
  assert.match(src, /const \{ t \} = useTranslation\(\)/, 't is not destructured from useTranslation');
});

test('PtyTerminalView reads its strings from i18n, not from literals', () => {
  const src = read('src/renderer/src/components/PtyTerminalView.tsx');
  assert.match(src, /useTranslation\(/, 'PtyTerminalView does not call useTranslation');
  assert.match(src, /const \{ t \} = useTranslation\('fullscreenTerminal'\)/, 't is not destructured from useTranslation');
});

test('SidebarSplitter reads its strings from i18n, not from literals', () => {
  const src = read('src/renderer/src/components/SidebarSplitter.tsx');
  assert.match(src, /useTranslation\(/, 'SidebarSplitter does not call useTranslation');
  assert.match(src, /const \{ t \} = useTranslation\('sidebar'\)/, 't is not destructured from useTranslation');
});

test('every key exists in every shipped locale', () => {
  const en = locale('en');
  const checkNamespace = (ns, minKeys) => {
    assert.ok(en[ns], `en.json has no ${ns} namespace`);
    const keys = Object.keys(en[ns]).sort();
    assert.ok(keys.length >= minKeys, `only ${keys.length} ${ns} keys — the extraction looks incomplete`);
    for (const code of ['zh-CN', 'ar']) {
      const block = locale(code)[ns];
      assert.ok(block, `${code}.json has no ${ns} namespace`);
      assert.deepEqual(Object.keys(block).sort(), keys, `${code} drifted from en in ${ns}`);
    }
  };
  checkNamespace('fileEditor', 5);
  checkNamespace('imagePreview', 2);
  checkNamespace('idePanel', 3);
  checkNamespace('fullscreenTerminal', 4);
  checkNamespace('sidebar', 1);
});

test('the strings that used to be hardcoded are gone from the source', () => {
  const codeEditorSrc = read('src/renderer/src/components/CodeEditor.tsx');
  for (const gone of [
    'No file open',
    'Pick a file from the tree to view it here.',
    'copy path',
    'Copy absolute path',
    'Save (Cmd-S)',
    'Open in the IDE'
  ]) {
    assert.ok(!codeEditorSrc.includes(`"${gone}"`) && !codeEditorSrc.includes(`'${gone}'`) && !codeEditorSrc.includes(`>${gone}<`), `"${gone}" is hardcoded again in CodeEditor`);
  }

  const imagePreviewSrc = read('src/renderer/src/ide/ImagePreview.tsx');
  for (const gone of [
    'copy path',
    'Copy absolute path'
  ]) {
    assert.ok(!imagePreviewSrc.includes(`"${gone}"`) && !imagePreviewSrc.includes(`'${gone}'`) && !imagePreviewSrc.includes(`>${gone}<`), `"${gone}" is hardcoded again in ImagePreview`);
  }

  const idePanelSrc = read('src/renderer/src/ide/IdePanel.tsx');
  for (const gone of [
    'No workspace available.',
    'Spawn an agent first — the IDE opens on its working directory.',
    'nothing open',
    'Pick a file from the tree to edit, or a changed file to diff.'
  ]) {
    assert.ok(!idePanelSrc.includes(`"${gone}"`) && !idePanelSrc.includes(`'${gone}'`) && !idePanelSrc.includes(`>${gone}<`), `"${gone}" is hardcoded again in IdePanel`);
  }

  const ptyTerminalViewSrc = read('src/renderer/src/components/PtyTerminalView.tsx');
  for (const gone of [
    'Zoom out (Cmd -)',
    'Reset zoom (Cmd 0)',
    'Zoom in (Cmd +)',
    'Exit focus mode (Esc)'
  ]) {
    assert.ok(!ptyTerminalViewSrc.includes(`"${gone}"`) && !ptyTerminalViewSrc.includes(`'${gone}'`) && !ptyTerminalViewSrc.includes(`>${gone}<`), `"${gone}" is hardcoded again in PtyTerminalView`);
  }

  const sidebarSplitterSrc = read('src/renderer/src/components/SidebarSplitter.tsx');
  for (const gone of [
    'Drag to resize · double-click to reset'
  ]) {
    assert.ok(!sidebarSplitterSrc.includes(`"${gone}"`) && !sidebarSplitterSrc.includes(`'${gone}'`) && !sidebarSplitterSrc.includes(`>${gone}<`), `"${gone}" is hardcoded again in SidebarSplitter`);
  }
});
