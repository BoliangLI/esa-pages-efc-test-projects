import { invalidateNuxtCache } from 'esa-nitro-preset/isr';

export default defineEventHandler(async (event) => {
  const run = getLabIsrRun(event);
  setResponseHeader(event, 'cache-control', 'no-store');
  const body = await readBody<{ scope?: string }>(event);
  if (body?.scope === 'path') {
    const base = useRuntimeConfig(event).app.baseURL.replace(/\/$/, '');
    return invalidateNuxtCache({ path: `${base}/lab/isr-revalidate/${run}/article` });
  }
  if (body?.scope === 'key') {
    return invalidateNuxtCache({ key: getLabIsrDataKey(run) });
  }
  throw createError({ statusCode: 400, statusMessage: 'ISR scope must be path or key' });
});
