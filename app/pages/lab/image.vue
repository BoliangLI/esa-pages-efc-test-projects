<script setup lang="ts">
import daily30 from '~/assets/images/daily-30.png';

const remoteImage = 'https://picsum.photos/id/237/1280/800';
// Vite can resolve imports to absolute URLs in the browser. Give IPX a site-relative path on both sides.
const staticImage = new URL(daily30, 'http://localhost').pathname;
const small = '/_ipx/f_webp&w_300/lab/photo.jpg';
const cached = '/_ipx/s_100x100/lab/photo.jpg';
</script>

<template>
  <LabStamp
    title="图片优化（@nuxt/image + ipx）"
    rule="NuxtImg → /_ipx/**，IPX maxAge: 5；/_ipx/s_100x100/** 额外配 swr: 5"
    expect="远程、站点相对路径和静态导入三种用例均返回 WebP。s_100x100 第一次是合法 JPEG，第二次用于检查 L2 缓存是否将二进制误存为 {}。"
  >
    <h2>远程图片</h2>
    <NuxtImg
      id="image-remote" class="source-image" :src="remoteImage"
      width="640" height="400" format="webp" quality="75" alt="Picsum 上的狗狗照片"
    />

    <h2>站点相对路径（public）</h2>
    <NuxtImg
      id="image-public-path" class="source-image" src="/lab/codex-start.png"
      width="408" height="167" format="webp" quality="75" alt="Codex 起始页面"
    />

    <h2>静态导入（app/assets）</h2>
    <NuxtImg
      id="image-static-import" class="source-image" :src="staticImage"
      width="167" height="183" format="webp" quality="75" alt="Daily 30 歌单封面"
    />

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

<style scoped>
.source-image { max-width: 100%; height: auto; }
</style>
