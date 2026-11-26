import { fileURLToPath } from 'node:url';

const isDev = process.env.NODE_ENV === 'development';
const isEsaPreset = process.env.NITRO_PRESET === 'esa-nitro-preset';

// Nuxt 4 混合渲染黑盒探针：一次部署覆盖 routeRules 各缓存形态、预渲染、SPA、
// 重定向/CORS/静态 headers、@nuxt/image（ipx + sharp）与运行时环境。
// 不写 nitro.preset：走默认 node-server，由 pcg 构建时用 NITRO_PRESET 切到 esa-nitro-preset。
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },
  modules: ['@nuxt/image'],
  nitro: {
    alias: isEsaPreset ? {} : {
      'esa-nitro-preset/isr': fileURLToPath(new URL('./server/lib/isr-unsupported.ts', import.meta.url))
    }
  },
  image: {
    domains: ['picsum.photos', 'fastly.picsum.photos'],
    ipx: {
      // 开发时 Vite 的导入路径还未写入产物目录，交给 IPX 从源码目录读取。
      ...(isDev && { alias: { '/_nuxt/assets/images/': '/' } }),
      fs: {
        maxAge: 5,
        ...(isDev && {
          dir: ['./public', './app/assets/images'].map(path => fileURLToPath(new URL(path, import.meta.url)))
        })
      }
    }
  },
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
    '/lab/ssr': { headers: { 'cache-control': 'private, no-store' } },
    '/lab/swr': { swr: 5 },
    '/lab/l2/swr': { swr: 5 },
    '/lab/swr-long': { swr: 5 },
    // swr: true 不带数字时，Nitro 默认 maxAge=1：每次返回上一次的渲染结果
    '/lab/swr-true': { swr: true },
    // cache 默认 swr=true，要阻塞式重新生成必须显式 swr: false
    '/lab/cache-block': { cache: { maxAge: 5, swr: false } },
    // 原生 node-server 与 ESA preset 的 ISR 行为不同。
    '/lab/isr': { isr: 5 },
    '/lab/isr-revalidate/**': { isr: 60 },
    '/lab/personal': { swr: 5 },
    '/lab/personal-varies': { cache: { swr: true, maxAge: 5, varies: ['cookie'] } },
    '/lab/boom': { swr: 5 },
    '/lab/prerendered': { prerender: true },
    '/lab/spa': { ssr: false },
    '/lab/old': { redirect: { to: '/lab/swr', statusCode: 301 } },
    '/api/lab/cors': { cors: true },
    '/lab-static/**': { headers: { 'x-lab-static': '1' } },
    '/_ipx/s_100x100/**': { swr: 5 }
  }
});
