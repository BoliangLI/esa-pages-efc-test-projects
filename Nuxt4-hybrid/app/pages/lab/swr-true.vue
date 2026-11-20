<template>
  <LabStamp title="swr: true（不带秒数）" rule="swr: true → Nitro 默认 maxAge=1" expect="响应头只有 stale-while-revalidate；间隔 >1s 连续请求时，每次返回的是上一次的 renderId" />
</template>
