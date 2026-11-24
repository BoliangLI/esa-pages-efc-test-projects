import { invalidateNuxtCache } from 'esa-nitro-preset/isr';

export default defineEventHandler(async (event) => {
  const run = getLabIsrRun(event);
  setResponseHeader(event, 'cache-control', 'no-store');
  const body = await readBody<{ scope?: string; fixture?: string }>(event);
  if (body?.scope === 'path') {
    const fixture = body.fixture ?? 'article';
    if (fixture !== 'article' && fixture !== 'related') {
      throw createError({ statusCode: 400, statusMessage: 'ISR fixture must be article or related' });
    }
    const base = useRuntimeConfig(event).app.baseURL.replace(/\/$/, '');
    return invalidateNuxtCache({ path: `${base}/lab/isr-revalidate/${run}/${fixture}` });
  }
  if (body?.scope === 'key') {
    return invalidateNuxtCache({ key: getLabIsrDataKey(run) });
  }
  throw createError({ statusCode: 400, statusMessage: 'ISR scope must be path or key' });
});
