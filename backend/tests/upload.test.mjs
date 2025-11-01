import fetch from 'node-fetch';
import { spawn } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

// This is a lightweight integration test that expects the backend's test
// harness to run. It requires the test runner in this project to already
// spin up an in-memory DB. We will run curl-like upload via node-fetch.

const BASE = 'http://127.0.0.1:59996'; // test server in run-tests.mjs

export default async function run() {
  // create a test project
  const create = await fetch(`${BASE}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'upload-test', description: 'upload test' }),
  });
  const project = await create.json();
  assert(project._id, 'project created');

  // upload a small text file (valid)
  const form = new FormData();
  form.append('file', new Blob(['hello test']), 'ok.txt', { type: 'text/plain' });

  const uploadRes = await fetch(`${BASE}/api/projects/${project._id}/attachments`, {
    method: 'POST',
    body: form,
  });
  assert(uploadRes.status === 201, 'upload should return 201');

  // upload invalid file type
  const form2 = new FormData();
  form2.append('file', new Blob(['binary']), 'bad.exe', { type: 'application/x-msdownload' });
  const bad = await fetch(`${BASE}/api/projects/${project._id}/attachments`, {
    method: 'POST',
    body: form2,
  });
  assert(bad.status === 400, 'invalid upload should be rejected');

  console.log('upload tests passed');
}
