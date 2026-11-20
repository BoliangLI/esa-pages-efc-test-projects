<template>
  <LabStamp title="长 TTL（版本隔离）" rule="swr: 86400" expect="重新部署后首次访问是冷缓存，renderId 与上一版本不同" />
</template>
