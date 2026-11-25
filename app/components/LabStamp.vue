<script setup lang="ts">
defineProps<{ title: string; rule: string; expect: string }>();
const stamp = useRenderStamp();
// useAsyncData 的结果走外置 _payload.json（useState 留在 HTML 内联），用来观测 payload 缓存。
// 浏览器里 dataId 与查看源码不同，说明 _payload.json 没取到、客户端重新请求了。
const route = useRoute();
const cookieUser = useCookie<string | null>('lab_user');
const { data } = await useAsyncData(`lab-data:${route.path}`, async () => ({
  dataId: globalThis.crypto.randomUUID(),
  dataUser: cookieUser.value ?? null
}));
</script>

<template>
  <main class="lab">
    <p><NuxtLink to="/lab">← 探针总览</NuxtLink></p>
    <h1>{{ title }}</h1>
    <p>规则：<code>{{ rule }}</code></p>
    <p>预期：{{ expect }}</p>
    <table>
      <tbody>
        <tr><th>renderId</th><td><code data-lab="renderId">{{ stamp.renderId }}</code></td></tr>
        <tr><th>renderedAt</th><td><code data-lab="renderedAt">{{ stamp.renderedAt }}</code></td></tr>
        <tr><th>renderedBy</th><td><code data-lab="renderedBy">{{ stamp.renderedBy }}</code></td></tr>
        <tr><th>path</th><td><code>{{ stamp.path }}</code></td></tr>
        <tr><th>cookie lab_user</th><td><code data-lab="cookieUser">{{ stamp.cookieUser ?? '(none)' }}</code></td></tr>
        <tr><th>buildTag</th><td><code data-lab="buildTag">{{ stamp.buildTag }}</code></td></tr>
        <tr><th>dataId（payload）</th><td><code data-lab="dataId">{{ data?.dataId }}</code></td></tr>
        <tr><th>dataUser（payload）</th><td><code data-lab="dataUser">{{ data?.dataUser ?? '(none)' }}</code></td></tr>
      </tbody>
    </table>
    <slot />
  </main>
</template>

<style scoped>
.lab { font-family: system-ui, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; }
th { text-align: left; padding-right: 1rem; }
code { word-break: break-all; }
</style>
