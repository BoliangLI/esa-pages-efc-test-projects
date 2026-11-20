<template>
  <LabStamp title="swr 命中与过期" rule="swr: 30" expect="30s 内 renderId 不变，响应头 s-maxage=30；过期后第 1 次返回旧值，第 2 次返回新值" />
</template>
