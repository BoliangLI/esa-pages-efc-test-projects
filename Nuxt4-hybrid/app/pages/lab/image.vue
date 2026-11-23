<script setup lang="ts">
const small = '/_ipx/f_webp&w_300/lab/photo.jpg';
const cached = '/_ipx/s_100x100/lab/photo.jpg';
</script>

<template>
  <LabStamp title="图片优化（@nuxt/image + ipx）" rule="NuxtImg → /_ipx/**，IPX maxAge: 5；/_ipx/s_100x100/** 额外配 swr: 5" expect="webp 300px 体积远小于原图；s_100x100 第一次是合法 jpeg，第二次（L2 命中）变成 2 字节的 {}、content-type: application/json，图片损坏（Nitro 缓存只保存字符串 body）">
    <h2>NuxtImg width=300 format=webp</h2>
    <NuxtImg src="/lab/photo.jpg" width="300" format="webp" />
    <p><a :href="small">{{ small }}</a></p>
    <h2>NuxtImg 100x100（走 swr 缓存）</h2>
    <NuxtImg src="/lab/photo.jpg" width="100" height="100" />
    <p><a :href="cached">{{ cached }}</a></p>
    <h2>原图</h2>
    <p><a href="/lab/photo.jpg">/lab/photo.jpg</a></p>
  </LabStamp>
</template>
