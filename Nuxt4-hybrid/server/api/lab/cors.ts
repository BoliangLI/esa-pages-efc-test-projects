// routeRules cors: true：预期响应带 access-control-allow-origin: *，OPTIONS 预检返回 204。
export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  return { ok: true, origin: getRequestHeader(event, 'origin') ?? null, instance: LAB_INSTANCE_ID };
});
