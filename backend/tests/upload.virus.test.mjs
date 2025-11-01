import fetch from 'node-fetch';
import assert from 'assert';

const BASE = 'http://127.0.0.1:59996';

export default async function run() {
  const create = await fetch(`${BASE}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'virus-test', description: 'virus' }),
  });
  const project = await create.json();

  // Tell server to fake virus failing
  process.env.FAKE_VIRUS_FAIL = 'true';

  const form = new FormData();
  form.append('file', new Blob(['x'], { type: 'text/plain' }), 'bad.txt');

  const res = await fetch(`${BASE}/api/projects/${project._id}/attachments`, {
    method: 'POST',
    body: form,
  });
  assert(res.status === 400, 'virus scan failure should reject upload');
}
