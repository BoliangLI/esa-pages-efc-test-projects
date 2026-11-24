import type { H3Event } from 'h3';

export const LAB_ISR_MAX_AGE = 60;

export function getLabIsrRun(event: H3Event) {
  const run = getRouterParam(event, 'run');
  if (!run || !/^[a-zA-Z0-9-]{1,64}$/.test(run)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ISR fixture run' });
  }
  return run;
}

export function getLabIsrDataKey(run: string) {
  return `nitro:functions:lab-isr-data:${run}.json`;
}
