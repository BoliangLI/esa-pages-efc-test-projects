import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

// 每个运行实例一个 ID：用来区分"谁渲染了缓存内容"和"谁处理了这次请求"。
export const LAB_INSTANCE_ID = `${hostname()}-${process.pid}-${randomUUID().slice(0, 6)}`;
export const LAB_BOOT_AT = new Date().toISOString();
