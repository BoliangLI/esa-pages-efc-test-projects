<template>
  <LabStamp title="只看 L2（关掉边缘缓存）" rule="swr: 30 + Cache-Control 改写为 private, no-store" expect="每次都到达 FC（有 [lab] fc-hit 日志）；30s 内 renderId 不变；x-lab-served-by 与 x-lab-rendered-by 不同即跨实例共享" />
</template>
