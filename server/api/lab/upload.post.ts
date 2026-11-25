// 上传：返回服务端实际收到的字节数与 sha256，用来测请求体上限与完整性。
import { createHash } from 'node:crypto';

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  const started = Date.now();
  const body = await readRawBody(event, false);
  const bytes = body ? body.length : 0;
  return {
    bytes,
    sha256: body ? createHash('sha256').update(body).digest('hex') : null,
    contentLength: getRequestHeader(event, 'content-length') ?? null,
    readMs: Date.now() - started,
    instance: LAB_INSTANCE_ID
  };
});
