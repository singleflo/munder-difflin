const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const locale = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));

test('residuals are translated', () => {
  const en = locale('en');
  
  // OnboardingWizard
  assert.ok(en.onboarding.errEngineNotInstalled, 'onboarding.errEngineNotInstalled missing');
  assert.match(en.onboarding.errEngineNotInstalled, /\{\{label\}\}/, 'onboarding.errEngineNotInstalled missing {{label}}');
  
  // FullscreenTerminal
  assert.ok(en.fullscreenTerminal.openSettings, 'fullscreenTerminal.openSettings missing');
  assert.ok(en.fullscreenTerminal.noNote, 'fullscreenTerminal.noNote missing');
  
  // MemoryGraphPanel
  assert.ok(en.memoryGraph.emptyState, 'memoryGraph.emptyState missing');
  
  // SettingsModal
  assert.ok(en.settings.agentsModels.whoCanAdd, 'settings.agentsModels.whoCanAdd missing');
  assert.ok(en.settings.errChangeHome, 'settings.errChangeHome missing');
  
  // CommandCenterPanel
  assert.ok(en.commandCenter.errStopProcess, 'commandCenter.errStopProcess missing');
  assert.ok(en.commandCenter.errResumeProvider, 'commandCenter.errResumeProvider missing');
  assert.ok(en.commandCenter.errResumeRefused, 'commandCenter.errResumeRefused missing');
  assert.ok(en.commandCenter.errFetchIssues, 'commandCenter.errFetchIssues missing');
  
  // AddAgentModal
  assert.ok(en.addAgent.hireSkipped, 'addAgent.hireSkipped missing');
  assert.match(en.addAgent.hireSkipped, /\{\{count\}\}/, 'addAgent.hireSkipped missing {{count}}');
  assert.ok(en.addAgent.templatesHint, 'addAgent.templatesHint missing');
  
  // IntegrationsRegistry
  assert.ok(en.integrations.placeholder, 'integrations.placeholder missing');
  assert.match(en.integrations.placeholder, /\{\{label\}\}/, 'integrations.placeholder missing {{label}}');
  
  for (const code of ['zh-CN', 'ar']) {
    const l = locale(code);
    assert.ok(l.onboarding.errEngineNotInstalled, `${code} onboarding.errEngineNotInstalled missing`);
    assert.ok(l.fullscreenTerminal.openSettings, `${code} fullscreenTerminal.openSettings missing`);
    assert.ok(l.fullscreenTerminal.noNote, `${code} fullscreenTerminal.noNote missing`);
    assert.ok(l.memoryGraph.emptyState, `${code} memoryGraph.emptyState missing`);
    assert.ok(l.settings.agentsModels.whoCanAdd, `${code} settings.agentsModels.whoCanAdd missing`);
    assert.ok(l.settings.errChangeHome, `${code} settings.errChangeHome missing`);
    assert.ok(l.commandCenter.errStopProcess, `${code} commandCenter.errStopProcess missing`);
    assert.ok(l.commandCenter.errResumeProvider, `${code} commandCenter.errResumeProvider missing`);
    assert.ok(l.commandCenter.errResumeRefused, `${code} commandCenter.errResumeRefused missing`);
    assert.ok(l.commandCenter.errFetchIssues, `${code} commandCenter.errFetchIssues missing`);
    assert.ok(l.addAgent.hireSkipped, `${code} addAgent.hireSkipped missing`);
    assert.ok(l.addAgent.templatesHint, `${code} addAgent.templatesHint missing`);
    assert.ok(l.integrations.placeholder, `${code} integrations.placeholder missing`);
  }
});
