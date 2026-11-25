// 每个到达 Nitro 的请求都会经过这里（L2 缓存命中也会），L1 边缘命中则不会到达。
// 中间件作用在外层 event 上，这里设置的响应头不会进入缓存条目；
// x-lab-rendered-by 由 app/plugins/lab-rendered-by.server.ts 在渲染时写入内层 event，才会随条目缓存。
export default defineEventHandler((event) => {
  event.context.labInstance = LAB_INSTANCE_ID;
  console.log(`[lab] fc-hit ${event.method} ${event.path} instance=${LAB_INSTANCE_ID}`);
});
