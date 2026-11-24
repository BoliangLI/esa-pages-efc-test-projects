<script setup lang="ts">
definePageMeta({
  validate: route => typeof route.params.run === 'string'
    && /^[a-zA-Z0-9-]{1,64}$/.test(route.params.run)
    && ['article', 'related'].includes(String(route.params.fixture))
});

const route = useRoute();
const requestFetch = useRequestFetch();
const { app } = useRuntimeConfig();
const { data } = await useAsyncData(
  () => `lab-isr-data:${route.params.run}`,
  () => requestFetch<{ dataId: string }>(`/api/lab/isr-data/${route.params.run}`, { baseURL: app.baseURL })
);
</script>

<template>
  <LabStamp
    title="ISR 按需失效"
    rule="isr: 60，article 与 related 共享一份数据"
    expect="按路径失效会刷新 article 的所有查询参数版本。按数据 key 失效会刷新两页及共享数据。"
  >
    <p>共享数据 ID：<code data-lab="isrDataId">{{ data?.dataId }}</code></p>
  </LabStamp>
</template>
