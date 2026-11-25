export interface RenderStamp {
  renderId: string;
  renderedAt: string;
  renderedBy: string;
  path: string;
  cookieUser: string | null;
  buildTag: string;
}

// 渲染戳：服务端渲染时生成并随 payload 下发，客户端水合复用同一份。
// 页面被缓存时 renderId 不变；SPA 路由（ssr:false）由客户端生成，renderedBy=client。
export function useRenderStamp() {
  const route = useRoute();
  const config = useRuntimeConfig();
  const cookieUser = useCookie<string | null>('lab_user');
  return useState<RenderStamp>(`lab-stamp:${route.path}`, () => ({
    renderId: globalThis.crypto.randomUUID(),
    renderedAt: new Date().toISOString(),
    renderedBy: import.meta.server
      ? ((useRequestEvent()?.context.labInstance as string) ?? 'unknown')
      : 'client',
    path: route.fullPath,
    cookieUser: cookieUser.value ?? null,
    buildTag: config.public.labBuildTag as string
  }));
}
