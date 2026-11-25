// 服务端渲染时把渲染实例写进响应头。cachedEventHandler 渲染时用的是内层 event，
// 这里写入的头会随缓存条目保存，命中时回放的是当初渲染它的实例。
export default defineNuxtPlugin(() => {
  const event = useRequestEvent();
  const instance = (event?.context.labInstance as string | undefined) ?? 'unknown';
  useResponseHeader('x-lab-rendered-by').value = instance;
});
