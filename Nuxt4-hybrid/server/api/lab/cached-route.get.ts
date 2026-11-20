// defineCachedEventHandler：接口级缓存，swr + maxAge 30s，固定 key 便于手动失效。
// 存储 key 为 /cache:nitro/handlers:lab-route:fixed.json。
export default defineCachedEventHandler(
  (event) => {
    setResponseHeader(event, 'x-lab-rendered-by', LAB_INSTANCE_ID);
    return {
      renderId: globalThis.crypto.randomUUID(),
      renderedAt: new Date().toISOString(),
      renderedBy: LAB_INSTANCE_ID,
      cacheKey: '/cache:nitro/handlers:lab-route:fixed.json'
    };
  },
  { name: 'lab-route', swr: true, maxAge: 30, getKey: () => 'fixed' }
);
