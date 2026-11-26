import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const router = new Proxy({}, { get: () => () => router });
const ctx = vm.createContext({ process: { env: {} }, console, URL, Date });
// Run: node --experimental-vm-modules backend/tests/leadConfirmationTemplates.check.mjs
// Backend imports and every sender are mocked; no database or network calls.
const source = readFileSync(process.argv[2] || new URL('../routes/leads.js', import.meta.url), 'utf8');
const mod = new vm.SourceTextModule(source, { context: ctx });
await mod.link((name) => {
  const values = name === 'express' ? { default: { Router: () => router } }
    : name === 'resend' ? { Resend: class {} }
    : name.includes('middleware/auth') ? { authenticateToken() {}, requireMasterAdmin() {} }
    : name === 'express-rate-limit' ? { default: () => () => {} }
    : { default: class {} };
  return new vm.SyntheticModule(Object.keys(values), function () {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context: ctx });
});
await mod.evaluate();
for (const source of ['Website free SignalTrue preview request', 'Website demo request', 'Australian consultant partnership enquiry', 'EHRS Summit 2026']) {
  const sent = [];
  const lead = { name: 'Test Person', email: 'qa@example.invalid', organization: 'Fictional', source };
  await mod.namespace.sendLeadEmails(lead, { emails: { send: async (message) => { sent.push(message); return { data: { id: 'mock' } }; } } });
  const reply = sent.find((message) => message.to === lead.email);
  assert.equal(sent.length, 2);
  if (source === 'EHRS Summit 2026') {
    assert.match(reply.html, /EHRS Summit 2026/);
    assert.match(reply.subject, /Täname/);
  } else {
    assert.match(reply.html, /<html lang="en">/);
    assert.doesNotMatch(reply.html, /EHRS Summit/);
    assert.match(reply.html, /Any SignalTrue pilot is free/);
    assert.equal(reply.subject, 'We received your SignalTrue request');
  }
}
console.log('4 source/template cases passed; all email calls mocked');
