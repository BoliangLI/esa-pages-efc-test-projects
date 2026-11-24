// 原生 node-server 可渲染测试页，按需失效需要 PCG 注入的 ESA preset。
export async function trackNuxtCacheKey(_key: string) {}

export async function invalidateNuxtCache(_target: { path: string } | { key: string }) {
  throw createError({ statusCode: 501, statusMessage: 'Requires ESA Nitro preset' });
}
