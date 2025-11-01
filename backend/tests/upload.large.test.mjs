import fetch from 'node-fetch';
import assert from 'assert';

const BASE = 'http://127.0.0.1:59996';

export default async function run() {
  const create = await fetch(`${BASE}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'large-test', description: 'large file' }),
  });
  const project = await create.json();

  // create a >5MB Buffer
  const big = Buffer.alloc(6 * 1024 * 1024, 'a');
  const form = new FormData();
  const blob = new Blob([big], { type: 'text/plain' });
  form.append('file', blob, 'big.txt', { type: 'text/plain' });

  const res = await fetch(`${BASE}/api/projects/${project._id}/attachments`, {
    method: 'POST',
    body: form,
  });
  assert(res.status === 400, 'large file must be rejected');
}
