// SSE：每秒推一条，共 ?n 条（默认 10）。用来看链路是否缓冲（全部一次性到达即被缓冲）。
export default defineEventHandler(async (event) => {
  const total = Math.min(Number(getQuery(event).n ?? 10) || 10, 120);
  setResponseHeaders(event, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-store',
    'x-accel-buffering': 'no'
  });
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const started = Date.now();
      for (let i = 1; i <= total; i++) {
        controller.enqueue(encoder.encode(`id: ${i}\ndata: ${JSON.stringify({ i, sinceStartMs: Date.now() - started, at: new Date().toISOString() })}\n\n`));
        if (i < total) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      controller.enqueue(encoder.encode('event: done\ndata: end\n\n'));
      controller.close();
    }
  });
  return sendStream(event, stream);
});
