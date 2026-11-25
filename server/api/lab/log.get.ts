// 运行时日志采集探针：每条带同一个 tag，便于在日志服务里检索并逐项核对是否丢失、截断、乱序。
// ?size=N 额外输出一条 N 字节的超长日志（末尾带 END 标记，用于判断是否截断）。
import { consola } from 'consola';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store');
  const tag = `lab-log-${Date.now().toString(36)}`;
  const size = Math.min(Number(getQuery(event).size ?? 0) || 0, 1024 * 1024);
  console.log(`[${tag}] console.log`);
  console.info(`[${tag}] console.info`);
  console.warn(`[${tag}] console.warn`);
  console.error(`[${tag}] console.error`);
  console.debug(`[${tag}] console.debug`);
  consola.info(`[${tag}] consola.info`);
  consola.error(`[${tag}] consola.error`);
  process.stdout.write(`[${tag}] stdout.write\n`);
  process.stderr.write(`[${tag}] stderr.write\n`);
  console.log(`[${tag}] multi-line first\nsecond line\nthird line`);
  console.log(`[${tag}] json`, { nested: { a: 1, list: [1, 2, 3] }, zh: '中文日志' });
  console.error(new Error(`[${tag}] error with stack`));
  if (size > 0) {
    const head = `[${tag}] long size=${size} `;
    console.log(head + 'x'.repeat(Math.max(size - head.length - 3, 0)) + 'END');
  }
  return { tag, size, instance: LAB_INSTANCE_ID, lines: size > 0 ? 13 : 12 };
});
