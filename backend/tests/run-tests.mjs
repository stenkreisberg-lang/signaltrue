import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { status: res.status, body };
}

async function run() {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log('Test server running on', base);

  try {
    // Create
    const create = await fetchJson(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'RunTest', description: 'desc' }),
    });
    assert(create.status === 201, 'Create should return 201');
    const project = create.body;
    assert(project && project._id, 'Created project must have _id');

    // Toggle favorite
    const put = await fetchJson(`${base}/api/projects/${project._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: true }),
    });
    assert(put.status === 200, 'PUT should return 200');
    assert(put.body.favorite === true, 'PUT should set favorite=true');

    // List
    const list = await fetchJson(`${base}/api/projects`);
    assert(list.status === 200 && Array.isArray(list.body), 'GET list should return array');

    // Post an analytics event
    const analytics = await fetchJson(`${base}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'test_event', payload: { foo: 'bar' }, projectId: project._id }),
    });
    assert(analytics.status === 201, 'Analytics POST should return 201');

    // Delete
    const del = await fetchJson(`${base}/api/projects/${project._id}`, { method: 'DELETE' });
    assert(del.status === 200, 'DELETE should return 200');

    // Delete again -> 404
    const del2 = await fetchJson(`${base}/api/projects/${project._id}`, { method: 'DELETE' });
    assert(del2.status === 404, 'Second DELETE should return 404');

    console.log('All tests passed ✅');
  } catch (err) {
    console.error('Test failure:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
  }
}

run();
