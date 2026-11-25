// beforeResponse 在缓存条目的 headers 回放之后执行：
// - x-lab-served-by 总是当前处理请求的实例；
// - x-lab-cache-key 只在本实例实际执行了渲染（未命中或后台重新生成）时出现，值可交给 /api/lab/revalidate；
// - /lab/l2/** 把 Cache-Control 改成 no-store，关掉边缘 L1，只观察 Nitro L2。
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', async (event) => {
    setResponseHeader(event, 'x-lab-served-by', LAB_INSTANCE_ID);
    const cacheOptions = event.context.cache?.options;
    if (cacheOptions?.getKey) {
      const key = await cacheOptions.getKey(event);
      const storageKey = [
        cacheOptions.base ?? '/cache',
        cacheOptions.group ?? 'nitro/handlers',
        cacheOptions.name ?? '_',
        `${key}.json`
      ].join(':');
      setResponseHeader(event, 'x-lab-cache-key', storageKey);
    }
    if (event.path.startsWith('/lab/l2/')) {
      setResponseHeader(event, 'cache-control', 'private, no-store');
    }
  });
});
