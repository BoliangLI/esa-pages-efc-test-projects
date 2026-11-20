// defineCachedFunction：函数级缓存（走 cache 存储），maxAge 30s。
// key 固定，存储 key 为 /cache:nitro/functions:lab-fn:fixed.json，可交给 /api/lab/revalidate。
const getExpensive = defineCachedFunction(
  async () => ({
    computeId: globalThis.crypto.randomUUID(),
    computedAt: new Date().toISOString(),
    computedBy: LAB_INSTANCE_ID
  }),
  { name: 'lab-fn', maxAge: 30, getKey: () => 'fixed' }
);

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  return {
    ...(await getExpensive()),
    cacheKey: '/cache:nitro/functions:lab-fn:fixed.json',
    servedBy: LAB_INSTANCE_ID,
    now: new Date().toISOString()
  };
});
