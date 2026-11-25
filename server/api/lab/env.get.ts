// 构建期变量 vs 运行时变量：
// - labBuildValue 由构建时的 LAB_BUILD_VALUE 固化；
// - labRuntimeValue 只能被运行时 NUXT_LAB_RUNTIME_VALUE 覆盖。
// ESA_CACHE_GW_* 只回显是否存在与长度，不回显内容。
const CACHE_GW_KEYS = [
  'ESA_CACHE_GW_GATEWAY_ENDPOINT',
  'ESA_CACHE_GW_AUTH_KEY',
  'ESA_CACHE_GW_ALIUID',
  'ESA_CACHE_GW_FUNCTIONNAME',
  'ESA_CACHE_GW_VERSION'
];

export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  const config = useRuntimeConfig(event);
  const cacheGateway: Record<string, number | null> = {};
  for (const key of CACHE_GW_KEYS) {
    const value = process.env[key];
    cacheGateway[key] = value === undefined ? null : value.length;
  }
  return {
    runtimeConfig: {
      labBuildValue: config.labBuildValue,
      labRuntimeValue: config.labRuntimeValue,
      labBuildTag: config.public.labBuildTag
    },
    processEnv: {
      LAB_BUILD_VALUE: process.env.LAB_BUILD_VALUE ?? null,
      NUXT_LAB_RUNTIME_VALUE: process.env.NUXT_LAB_RUNTIME_VALUE ?? null,
      NODE_ENV: process.env.NODE_ENV ?? null,
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? null,
      PORT: process.env.PORT ?? null,
      NITRO_PRESET: process.env.NITRO_PRESET ?? null
    },
    cacheGatewayEnvLength: cacheGateway,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    cwd: process.cwd(),
    instance: LAB_INSTANCE_ID
  };
});
