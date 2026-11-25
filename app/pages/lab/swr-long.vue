<template>
  <LabStamp title="版本隔离（5s TTL）" rule="swr: 5" expect="缓存过期前切换到新版本，首次访问应是冷缓存，renderId 与上一版本不同" />
</template>
