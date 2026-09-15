const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));

test('agent editing controls read their strings from i18n', () => {
  const files = [
    'src/renderer/src/components/EditAgentModal.tsx',
    'src/renderer/src/components/AgentNameEditor.tsx',
    'src/renderer/src/components/AgentHoldButton.tsx',
    'src/renderer/src/components/AgentDetailPanel.tsx',
    'src/renderer/src/components/MessageQueueComposer.tsx'
  ];
  for (const file of files) {
    const src = read(file);
    assert.match(src, /useTranslation\(\)/, `${file} does not call useTranslation`);
  }
});

test('every editAgent key exists in every shipped locale', () => {
  const en = locale('en').editAgent;
  assert.ok(en, 'en.json has no editAgent namespace');
  const keys = Object.keys(en).sort();
  assert.ok(keys.length >= 5, `only ${keys.length} editAgent keys`);
  for (const code of ['zh-CN', 'ar']) {
    const block = locale(code).editAgent;
    assert.ok(block, `${code}.json has no editAgent namespace`);
    assert.deepEqual(Object.keys(block).sort(), keys, `${code} drifted from en in editAgent`);
  }
});

test('the strings that used to be hardcoded are gone from the source', () => {
  const srcModal = read('src/renderer/src/components/EditAgentModal.tsx');
  assert.ok(!srcModal.includes('"EDIT AGENT"'), 'EDIT AGENT is hardcoded');
  assert.ok(!srcModal.includes('"what is this agent for"'), 'what is this agent for is hardcoded');
  assert.ok(!srcModal.includes('"long-running directive injected on every prompt"'), 'long-running directive is hardcoded');
  assert.ok(!srcModal.includes('Engine changes are saved for the next restart.'), 'Engine changes note is hardcoded');
  assert.ok(!srcModal.includes('"save changes"'), 'save changes is hardcoded');
  assert.ok(!srcModal.includes("'CLI default model'"), 'CLI default model is hardcoded');

  const srcEditor = read('src/renderer/src/components/AgentNameEditor.tsx');
  assert.ok(!srcEditor.includes("'Name is required'"), 'Name is required is hardcoded');
  assert.ok(!srcEditor.includes("'Could not rename agent'"), 'Could not rename agent is hardcoded');

  const srcHold = read('src/renderer/src/components/AgentHoldButton.tsx');
  assert.ok(!srcHold.includes('End the 1:1. ${godName} can hand ${agent.name} work again.'), 'End the 1:1 tip is hardcoded');
  assert.ok(!srcHold.includes('Take this agent aside for a 1:1'), 'Take this agent aside aria is hardcoded');

  const srcDetail = read('src/renderer/src/components/AgentDetailPanel.tsx');
  assert.ok(!srcDetail.includes('"Edit this agent"'), 'Edit this agent is hardcoded');

  const srcQueue = read('src/renderer/src/components/MessageQueueComposer.tsx');
  assert.ok(!srcQueue.includes('"Close the picker this agent has open so queued messages can be delivered"'), 'Close the picker title is hardcoded');
  assert.ok(!srcQueue.includes('"Move the leftover text on this agent\'s prompt into this box so queued messages can be delivered"'), 'Move the leftover text title is hardcoded');
});

test('the interpolated strings keep their variables', () => {
  const vars = (s) => [...String(s).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
  const en = locale('en').agentControl;
  assert.equal(vars(en.holdEndTip), 'godName,name', 'holdEndTip lost {{godName}} or {{name}}');
  assert.equal(vars(en.holdEndAria), 'godName', 'holdEndAria lost {{godName}}');
  assert.equal(vars(en.holdStartTip), 'godName,name', 'holdStartTip lost {{godName}} or {{name}}');
  
  for (const code of ['zh-CN', 'ar']) {
    const block = locale(code).agentControl;
    for (const key of ['holdEndTip', 'holdEndAria', 'holdStartTip']) {
      assert.equal(vars(block[key]), vars(en[key]), `${code} ${key}: interpolation drifted`);
    }
  }
});
