import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

// Isolated transport test: never contacts Google or the production backend.
const source = stripTypeScriptTypes(fs.readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8'))
  .replace(/^export /gm, '');

function harness(hostname = 'www.signaltrue.ai', search = '', webdriver = false) {
  const scripts = new Map();
  const storage = new Map();
  const requests = [];
  const window = {
    location: { hostname, pathname: '/did-the-control-work', search, origin: `https://${hostname}` },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  };
  const context = vm.createContext({
    window, navigator: { userAgent: 'Mozilla/5.0', webdriver },
    document: {
      title: 'Control review',
      getElementById: id => scripts.get(id),
      createElement: () => ({}),
      head: { appendChild: script => scripts.set(script.id, script) },
    },
    process: { env: { NODE_ENV: 'production' } }, URL, URLSearchParams,
    fetch: (...args) => { requests.push(args); return Promise.resolve({}); },
  });
  vm.runInContext(source, context);
  return { context, window, scripts, requests };
}

const normal = harness();
vm.runInContext(`initializeAnalytics(); initializeAnalytics(); trackPageView('/did-the-control-work'); trackFunnelEvent('did_control_work_completed', { question_count: 6, email: 'private@example.com' });`, normal.context);
assert.equal(normal.scripts.size, 1, 'Only one Google tag should load');
assert.equal(normal.scripts.get('signaltrue-ga4').src, 'https://www.googletagmanager.com/gtag/js?id=G-32VLC15W5G');
const commands = normal.window.dataLayer;
assert.equal(commands.length, 4, 'One initialization plus page and completion commands');
assert.ok(commands.every(command => Object.prototype.toString.call(command) === '[object Arguments]'), 'Google commands must use Arguments objects');
assert.equal(commands[3][1], 'did_control_work_completed');
assert.equal(commands[3][2].email, undefined, 'PII must remain excluded');

for (const [host, query, webdriver] of [
  ['preview.vercel.app', '', false],
  ['www.signaltrue.ai', '?qa=1', false],
  ['www.signaltrue.ai', '', true],
]) {
  const blocked = harness(host, query, webdriver);
  vm.runInContext(`trackFunnelEvent('did_control_work_completed');`, blocked.context);
  assert.equal(blocked.scripts.size, 0);
  assert.equal(blocked.requests.length, 0);
  assert.equal(blocked.window.dataLayer, undefined);
}
console.log('PASS: canonical tag, Arguments format, completion command, PII filtering, preview/QA/automation suppression; no network sent.');
