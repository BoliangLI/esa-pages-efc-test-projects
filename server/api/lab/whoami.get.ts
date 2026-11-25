// 不缓存：每次都返回当前处理请求的实例，用于观察实例数量、冷启动与复用。
export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  return {
    instance: LAB_INSTANCE_ID,
    bootAt: LAB_BOOT_AT,
    uptimeSec: Math.round(process.uptime()),
    now: new Date().toISOString()
  };
});
