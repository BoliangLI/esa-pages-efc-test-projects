<script setup lang="ts">
definePageMeta({
  validate: route => typeof route.params.run === 'string'
    && /^[a-zA-Z0-9-]{1,64}$/.test(route.params.run)
    && ['article', 'related'].includes(String(route.params.fixture))
});

const route = useRoute();
const requestFetch = useRequestFetch();
const { app } = useRuntimeConfig();
const base = app.baseURL.replace(/\/$/, '');
const relatedPage = computed(() => route.params.fixture === 'article' ? 'related' : 'article');
const pending = ref(false);
const message = ref('');
const { data } = await useAsyncData(
  () => `lab-isr-data:${route.params.run}`,
  () => requestFetch<{ dataId: string }>(`/api/lab/isr-data/${route.params.run}`, { baseURL: app.baseURL })
);

async function revalidateCurrentPage() {
  pending.value = true;
  message.value = '';
  try {
    const result = await $fetch<{ cdn: 'submitted' | 'skipped' | 'failed' }>(
      `/api/lab/isr-revalidate/${route.params.run}`,
      { baseURL: app.baseURL, method: 'POST', body: { scope: 'path', fixture: route.params.fixture } }
    );
    if (result.cdn === 'failed') {
      message.value = '源站已失效，CDN 刷新提交失败。';
      return;
    }
    window.location.reload();
  } catch (error) {
    message.value = (error as { statusCode?: number }).statusCode === 501
      ? '请使用 ESA preset 构建后测试按需失效。'
      : '页面失效失败，请重试。';
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <LabStamp
    title="ISR 按需失效"
    rule="isr: 60，article 与 related 共享一份数据"
    expect="60 秒内，失效后当前页面的 renderId 会变化，关联页的 renderId 和共享数据 ID 保持原值。"
  >
    <p>共享数据 ID：<code data-lab="isrDataId">{{ data?.dataId }}</code></p>
    <p>
      <button type="button" :disabled="pending" @click="revalidateCurrentPage">
        {{ pending ? '正在失效…' : '失效当前页面' }}
      </button>
    </p>
    <p v-if="message" role="status">{{ message }}</p>
    <p><a :href="`${base}/lab/isr-revalidate/${route.params.run}/${relatedPage}`">查看关联页 {{ relatedPage }}</a></p>
  </LabStamp>
</template>
