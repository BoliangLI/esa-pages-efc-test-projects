<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
const stamp = useRenderStamp();
</script>

<template>
  <main style="font-family: system-ui, sans-serif; max-width: 860px; margin: 2rem auto;">
    <h1>Error {{ props.error.statusCode }}</h1>
    <p>{{ props.error.statusMessage }}</p>
    <p>renderId: <code data-lab="renderId">{{ stamp.renderId }}</code></p>
    <p><NuxtLink to="/lab">← 探针总览</NuxtLink></p>
  </main>
</template>
