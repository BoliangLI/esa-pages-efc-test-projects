<template>
  <LabStamp
    title="纯 SSR"
    rule="默认服务端渲染，Cache-Control: private, no-store"
    expect="连续刷新同一 URL，每次 HTML 中的 renderId 都会变化。渲染此页无需读写网关缓存。"
  />
</template>
