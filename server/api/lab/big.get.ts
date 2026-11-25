// 大响应：?mb=N（默认 5，上限 50）流式输出 N MB，看链路是否有体积上限、是否被截断。
// 每 1MB 一块，内容固定，可在客户端用 sha256 对比（响应头 x-lab-bytes 为预期字节数）。
export default defineEventHandler((event) => {
  const mb = Math.min(Math.max(Number(getQuery(event).mb ?? 5) || 5, 1), 50);
  const chunk = Buffer.alloc(1024 * 1024, 'abcdefghijklmnopqrstuvwxyz0123456789\n');
  setResponseHeaders(event, {
    'content-type': 'application/octet-stream',
    'cache-control': 'no-store',
    'x-lab-bytes': String(mb * chunk.length)
  });
  let sent = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (sent >= mb) {
        controller.close();
        return;
      }
      sent++;
      controller.enqueue(chunk);
    }
  });
  return sendStream(event, stream);
});
