// 本地验证 L2 用的 Gateway 替身：内存 Map，不校验签名，协议对齐 esa-nitro-preset/driver.mjs。
//   GET    /storage/<ossKey>  → 200 {lastModified, value} | 404
//   PUT    /storage/<ossKey>  → 200
//   DELETE /storage/<ossKey>  → 200 | 404
//   GET    /__keys            → 当前所有 ossKey（调试用，真实 Gateway 无此接口）
//   POST   /table/batch-get-row、/table/batch-write → ISR 失效版本
//   POST   /cache/refresh     → 接收 CDN 刷新请求，不模拟边缘缓存
// 用法：node scripts/mock-gateway.mjs [port=8788]，再给服务设置 5 个 ESA_CACHE_GW_* 变量。
import { createServer } from 'node:http';

const port = Number(process.argv[2] || process.env.MOCK_GW_PORT || 8788);
const store = new Map();
const generations = new Map();

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://mock');
  if (url.pathname === '/__keys') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify([...store.keys()], null, 2));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/cache/refresh') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }
  if (req.method === 'POST' && ['/table/batch-get-row', '/table/batch-write'].includes(url.pathname)) {
    try {
      const payload = JSON.parse(await readBody(req));
      let result;
      if (url.pathname === '/table/batch-get-row') {
        const rows = payload.primaryKeys.map(key => generations.get(JSON.stringify(key))).filter(Boolean);
        result = { rows, complete: true };
      } else {
        for (const row of payload.rows) generations.set(JSON.stringify(row.primaryKey), row);
        result = { written: payload.rows.length };
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch {
      res.writeHead(400).end();
    }
    return;
  }
  if (!url.pathname.startsWith('/storage/')) {
    res.writeHead(404).end();
    return;
  }
  const ossKey = decodeURIComponent(url.pathname.slice('/storage/'.length));
  let status = 200;
  let body = '';
  if (req.method === 'GET') {
    if (store.has(ossKey)) {
      body = store.get(ossKey);
    } else {
      status = 404;
    }
  } else if (req.method === 'PUT') {
    body = await readBody(req);
    store.set(ossKey, body);
    body = '';
  } else if (req.method === 'DELETE') {
    status = store.delete(ossKey) ? 200 : 404;
  } else {
    status = 405;
  }
  console.log(`[mock-gw] ${req.method} ${ossKey} → ${status}`);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body);
}).listen(port, () => {
  console.log(`[mock-gw] listening on http://127.0.0.1:${port}`);
});
