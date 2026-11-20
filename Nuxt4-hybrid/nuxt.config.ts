// Nuxt 4 混合渲染黑盒探针：一次部署覆盖 routeRules 各缓存形态、预渲染、SPA、
// 重定向/CORS/静态 headers、@nuxt/image（ipx + sharp）与运行时环境。
// 不写 nitro.preset：走默认 node-server，由 pcg 构建时用 NITRO_PRESET 切到 esa-nitro-preset。
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },
  modules: ['@nuxt/image'],
  runtimeConfig: {
    // 构建期求值后固化进产物
    labBuildValue: process.env.LAB_BUILD_VALUE || 'unset-at-build',
    // 只能被运行时 NUXT_LAB_RUNTIME_VALUE 覆盖
    labRuntimeValue: 'default',
    public: {
      labBuildTag: process.env.LAB_BUILD_TAG || 'v1'
    }
  },
  routeRules: {
    '/lab/swr': { swr: 30 },
    '/lab/l2/swr': { swr: 30 },
    '/lab/swr-long': { swr: 86400 },
    // swr: true 不带数字时，Nitro 默认 maxAge=1：每次返回上一次的渲染结果
    '/lab/swr-true': { swr: true },
    // cache 默认 swr=true，要阻塞式重新生成必须显式 swr: false
    '/lab/cache-block': { cache: { maxAge: 20, swr: false } },
    // isr 只被 vercel/netlify/zeabur preset 识别，这里观察 ESA 上的实际表现
    '/lab/isr': { isr: 60 },
    '/lab/personal': { swr: 60 },
    '/lab/personal-varies': { cache: { swr: true, maxAge: 60, varies: ['cookie'] } },
    '/lab/boom': { swr: 30 },
    '/lab/prerendered': { prerender: true },
    '/lab/spa': { ssr: false },
    '/lab/old': { redirect: { to: '/lab/swr', statusCode: 301 } },
    '/api/lab/cors': { cors: true },
    '/lab-static/**': { headers: { 'x-lab-static': '1' } },
    '/_ipx/s_100x100/**': { swr: 3600 }
  }
});
