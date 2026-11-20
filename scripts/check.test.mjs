// node --test scripts/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runChecks, loadAssertions } from './check.mjs';

let server;
let base;

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/json') {
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'public, max-age=3600');
      res.end(JSON.stringify({ ok: true, nested: { a: 1, b: 2 }, list: [1, 2] }));
      return;
    }
    if (req.url === '/echo' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.statusCode = 201;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ received: JSON.parse(body), key: req.headers['x-api-key'] ?? null }));
      });
      return;
    }
    if (req.url === '/redirect') {
      res.statusCode = 302;
      res.setHeader('location', '/json');
      res.end();
      return;
    }
    res.statusCode = 404;
    res.end('Not Found');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('全部断言满足时每条都通过', async () => {
  const results = await runChecks(base, [
    { path: '/json', expectedStatus: 200, bodyJsonSubset: { ok: true, nested: { a: 1 } } },
    { path: '/json', expectedStatus: 200, headersContain: { 'cache-control': 'max-age=3600' } },
    {
      path: '/echo',
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'k' },
      body: { n: 1 },
      expectedStatus: 201,
      bodyJsonSubset: { received: { n: 1 }, key: 'k' },
    },
    { path: '/nope', expectedStatus: 404, bodyContains: 'Not Found' },
    { path: '/nope', expectedStatus: 404, bodyEquals: 'Not Found' },
    { path: '/redirect', expectedStatus: 302, headersContain: { location: '/json' } },
  ]);
  assert.deepEqual(results.map((r) => r.ok), [true, true, true, true, true, true]);
});

test('状态码、子串、JSON 子集、响应头不符时分别报错', async () => {
  const results = await runChecks(base, [
    { path: '/json', expectedStatus: 201 },
    { path: '/nope', expectedStatus: 404, bodyContains: 'Found it' },
    { path: '/json', expectedStatus: 200, bodyJsonSubset: { nested: { a: 2 } } },
    { path: '/json', expectedStatus: 200, bodyJsonSubset: { list: [1] } },
    { path: '/json', expectedStatus: 200, headersContain: { 'cache-control': 'no-store' } },
    { path: '/nope', expectedStatus: 404, bodyJsonSubset: { ok: true } },
    { path: '/nope', expectedStatus: 404, bodyEquals: 'Not' },
  ]);
  assert.deepEqual(results.map((r) => r.ok), [false, false, false, false, false, false, false]);
  assert.match(results[0].errors[0], /status 200/);
  assert.match(results[3].errors[0], /list/);
  assert.match(results[5].errors[0], /JSON/);
});

test('网络错误记为失败而不是抛出', async () => {
  const results = await runChecks('http://127.0.0.1:1', [{ path: '/', expectedStatus: 200 }]);
  assert.equal(results[0].ok, false);
});

test('优先读 checks.json，没有时读 meta.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-'));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ assertions: [{ path: '/m' }] }));
  assert.equal(loadAssertions(dir)[0].path, '/m');
  fs.writeFileSync(path.join(dir, 'checks.json'), JSON.stringify({ assertions: [{ path: '/c' }] }));
  assert.equal(loadAssertions(dir)[0].path, '/c');
});
