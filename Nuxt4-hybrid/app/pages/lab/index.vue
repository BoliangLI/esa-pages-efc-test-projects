<script setup lang="ts">
// 总览页本身不缓存；下方三块数据全部在浏览器里实时请求，不受页面缓存影响。
const pages = [
  ['/lab/swr', 'swr: 5'],
  ['/lab/l2/swr', 'swr: 5，只看 L2'],
  ['/lab/swr-long', 'swr: 5，版本隔离'],
  ['/lab/swr-true', 'swr: true（默认 maxAge=1）'],
  ['/lab/cache-block', 'cache maxAge 5 + swr false'],
  ['/lab/isr', 'isr: 5'],
  ['/lab/isr-revalidate/manual/article', 'ISR 按路径和数据 key 失效'],
  ['/lab/personal', '不配 varies 时 cookie 被剥掉'],
  ['/lab/personal-varies', 'varies: cookie（L1 串号）'],
  ['/lab/swr/_payload.json', '缓存页面的外置 payload'],
  ['/lab/boom', '500 不缓存'],
  ['/lab/prerendered', '预渲染'],
  ['/lab/spa', 'ssr: false'],
  ['/lab/old', '301 → /lab/swr'],
  ['/lab/image', '@nuxt/image'],
  ['/lab-static/a.txt', '静态文件 + routeRules headers']
];
const apis = [
  '/api/lab/whoami',
  '/api/lab/env',
  '/api/lab/diag',
  '/api/lab/cached-fn',
  '/api/lab/cached-route',
  '/api/lab/cors',
  '/api/lab/data-storage',
  '/api/lab/log?size=40000',
  '/api/lab/sse',
  '/api/lab/big?mb=5'
];
const live = ref<Record<string, unknown>>({});
onMounted(async () => {
  for (const url of ['/api/lab/whoami', '/api/lab/env', '/api/lab/diag']) {
    live.value[url] = await $fetch(url).catch((err: Error) => ({ error: err.message }));
  }
});
</script>

<template>
  <main style="font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem;">
    <h1>Nuxt4-hybrid 探针总览</h1>
    <h2>页面</h2>
    <ul>
      <li v-for="[href, desc] in pages" :key="href"><a :href="href">{{ href }}</a> — {{ desc }}</li>
    </ul>
    <h2>接口</h2>
    <ul>
      <li v-for="href in apis" :key="href"><a :href="href">{{ href }}</a></li>
    </ul>
    <h2>实时自检（客户端请求）</h2>
    <section v-for="(value, url) in live" :key="url">
      <h3>{{ url }}</h3>
      <pre>{{ JSON.stringify(value, null, 2) }}</pre>
    </section>
  </main>
</template>
