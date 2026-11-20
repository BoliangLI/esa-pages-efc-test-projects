<template>
  <LabStamp title="不配 varies 时的 cookie" rule="swr: 60（不区分 cookie）" expect="Nitro 缓存层只转发 varies 里的请求头，cookie 被剥掉：无论 lab_user 是什么，cookie lab_user 都是 (none)，个性化静默失效但不串号" />
</template>
