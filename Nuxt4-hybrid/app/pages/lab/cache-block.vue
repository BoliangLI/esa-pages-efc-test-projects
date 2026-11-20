<template>
  <LabStamp title="阻塞式缓存" rule="cache: { maxAge: 20, swr: false }" expect="响应头 max-age=20；过期后当次请求等待重新渲染并直接返回新 renderId" />
</template>
