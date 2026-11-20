// 观察 cache 存储的 clear/getKeys：esa-nitro-preset driver 的 getKeys 恒为 []、clear 为 noop，
// 预期 keys 为空、clear 后已缓存页面仍然命中。
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  const storage = useStorage('cache');
  const result: Record<string, unknown> = { instance: LAB_INSTANCE_ID };
  try {
    result.keysBefore = await storage.getKeys();
    await storage.clear();
    result.cleared = true;
    result.keysAfter = await storage.getKeys();
  } catch (err) {
    result.error = (err as Error).message;
  }
  return result;
});
