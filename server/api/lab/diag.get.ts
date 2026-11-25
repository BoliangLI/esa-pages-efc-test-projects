// 对 cache 存储（esa-nitro-preset driver → Gateway → OSS）做一次写/读/删往返。
// driver 缺 ESA_CACHE_GW_* 时降级为 noop：写入成功但读回 null，roundTrip=false。
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  const storage = useStorage('cache');
  const key = `lab:diag:${LAB_INSTANCE_ID}`;
  const value = { at: new Date().toISOString(), by: LAB_INSTANCE_ID };
  const steps: Record<string, unknown> = {};
  const started = Date.now();
  try {
    await storage.setItem(key, value);
    steps.setMs = Date.now() - started;
    const readBack = await storage.getItem<typeof value>(key);
    steps.getMs = Date.now() - started;
    steps.roundTrip = readBack?.at === value.at;
    steps.readBack = readBack;
    await storage.removeItem(key);
    steps.afterRemove = await storage.getItem(key);
    steps.totalMs = Date.now() - started;
  } catch (err) {
    steps.error = (err as Error).message;
  }
  return { key, ...steps };
});
