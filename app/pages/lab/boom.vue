<script setup lang="ts">
if (import.meta.server) {
  throw createError({ statusCode: 500, statusMessage: 'lab boom' });
}
</script>

<template>
  <div>unreachable on server</div>
</template>
