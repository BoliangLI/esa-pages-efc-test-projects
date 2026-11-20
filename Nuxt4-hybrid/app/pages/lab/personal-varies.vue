<template>
  <LabStamp title="按 cookie 分缓存" rule="cache: { swr: true, maxAge: 60, varies: ['cookie'] }" expect="L2 按 cookie 各存一份（x-lab-cache-key 不同）；但响应不带 Vary: cookie 且有 s-maxage=60，边缘 L1 会把第一个用户的页面返回给所有人；_payload.json 只按路径缓存一份，dataUser 也可能串" />
</template>
