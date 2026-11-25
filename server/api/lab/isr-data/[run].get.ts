import { randomUUID } from 'node:crypto';
import { trackNuxtCacheKey } from 'esa-nitro-preset/isr';

const getData = defineCachedFunction(
  async (_run: string) => ({ dataId: randomUUID() }),
  { name: 'lab-isr-data', maxAge: LAB_ISR_MAX_AGE, swr: false, getKey: run => run }
);

export default defineEventHandler(async (event) => {
  const run = getLabIsrRun(event);
  setResponseHeader(event, 'cache-control', 'no-store');
  await trackNuxtCacheKey(getLabIsrDataKey(run));
  return getData(run);
});
