// 手动失效：删除一条 Nitro 缓存条目，key 取自页面响应头 x-lab-cache-key（或 cached-route 的固定 key）。
// 只删 L2；边缘 L1 仍按 s-maxage 过期。
const ALLOWED_PREFIXES = ['/cache:nitro/routes:', '/cache:nitro/handlers:', '/cache:nitro/functions:'];

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  const key = String(getQuery(event).key ?? '');
  if (!ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw createError({ statusCode: 400, statusMessage: `key must start with ${ALLOWED_PREFIXES.join(' | ')}` });
  }
  const storage = useStorage();
  const before = await storage.getItem<{ mtime?: number }>(key);
  await storage.removeItem(key);
  const after = await storage.getItem(key);
  return {
    key,
    existedBefore: before !== null,
    beforeMtime: before?.mtime ?? null,
    existsAfter: after !== null,
    instance: LAB_INSTANCE_ID
  };
});
