// useStorage('data') 生产默认是 fsLite（./.data/kv）：写在实例本地磁盘，
// 预期同实例可读回、跨实例/重新部署后丢失；只读文件系统下会直接报错。
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  const storage = useStorage('data');
  const key = 'lab:counter';
  const result: Record<string, unknown> = { instance: LAB_INSTANCE_ID, cwd: process.cwd() };
  try {
    const previous = await storage.getItem<{ count: number; by: string }>(key);
    const next = { count: (previous?.count ?? 0) + 1, by: LAB_INSTANCE_ID, at: new Date().toISOString() };
    await storage.setItem(key, next);
    result.previous = previous;
    result.current = await storage.getItem(key);
  } catch (err) {
    result.error = (err as Error).message;
  }
  return result;
});
