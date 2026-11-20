#!/usr/bin/env node
// 部署后验收：逐条请求项目里 checks.json（没有则读 meta.json）的 assertions，打印 ✓/✗。
// 用法：node scripts/check.mjs <项目目录> <部署域名>
//   例：node scripts/check.mjs backend-tests/hono https://xxx.example.com
// 需要 Node ≥ 18（全局 fetch）。任一断言失败时退出码为 1。
//
// 断言字段（与 backend-tests/*/meta.json 一致）：
//   path            必填，以 / 开头
//   method          默认 GET
//   headers         请求头
//   body            对象会 JSON 序列化，字符串原样发送
//   expectedStatus  严格相等；不跟随重定向，3xx 直接比对
//   bodyContains    响应体包含该子串（区分大小写）
//   bodyEquals      响应体与该字符串完全相等
//   bodyJsonSubset  响应体按 JSON 解析后包含这些字段；对象递归比对，数组要求完全相等
//   headersContain  { 头名: 子串 }，响应头包含该子串
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MS = 30000;

export function loadAssertions(dir) {
  for (const name of ['checks.json', 'meta.json']) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8')).assertions ?? [];
    }
  }
  throw new Error(`${dir} 下没有 checks.json 或 meta.json`);
}

function subsetDiff(expected, actual, at) {
  if (Array.isArray(expected)) {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      return [`${at} 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`];
    }
    return [];
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
      return [`${at} 期望对象，实际 ${JSON.stringify(actual)}`];
    }
    return Object.keys(expected).flatMap((k) => subsetDiff(expected[k], actual[k], at ? `${at}.${k}` : k));
  }
  if (expected !== actual) {
    return [`${at} 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`];
  }
  return [];
}

async function runOne(base, a) {
  const method = a.method ?? 'GET';
  const label = `${method} ${a.path}`;
  const errors = [];
  let res;
  let text = '';
  try {
    const body = a.body === undefined ? undefined : typeof a.body === 'string' ? a.body : JSON.stringify(a.body);
    res = await fetch(new URL(a.path, base), {
      method,
      headers: a.headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    text = await res.text();
  } catch (err) {
    return { label, ok: false, errors: [`请求失败：${err.cause?.code ?? err.message}`] };
  }

  if (a.expectedStatus !== undefined && res.status !== a.expectedStatus) {
    errors.push(`status ${res.status}，期望 ${a.expectedStatus}`);
  }
  if (a.bodyContains !== undefined && !text.includes(a.bodyContains)) {
    errors.push(`响应体不含 ${JSON.stringify(a.bodyContains)}`);
  }
  if (a.bodyEquals !== undefined && text !== a.bodyEquals) {
    errors.push(`响应体 ${JSON.stringify(text.slice(0, 80))}，期望 ${JSON.stringify(a.bodyEquals)}`);
  }
  if (a.bodyJsonSubset !== undefined) {
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      errors.push(`响应体不是 JSON：${text.slice(0, 120)}`);
    }
    if (json !== undefined) {
      errors.push(...subsetDiff(a.bodyJsonSubset, json, ''));
    }
  }
  for (const [name, part] of Object.entries(a.headersContain ?? {})) {
    const value = res.headers.get(name);
    if (value === null || !value.includes(part)) {
      errors.push(`响应头 ${name}: ${value ?? '(无)'}，期望包含 ${JSON.stringify(part)}`);
    }
  }
  return { label, ok: errors.length === 0, status: res.status, errors, preview: text.slice(0, 160) };
}

export async function runChecks(base, assertions) {
  const results = [];
  for (const a of assertions) {
    results.push(await runOne(base, a));
  }
  return results;
}

async function main() {
  const [dir, base] = process.argv.slice(2);
  if (!dir || !base) {
    console.error('用法：node scripts/check.mjs <项目目录> <部署域名>');
    process.exit(2);
  }
  const assertions = loadAssertions(dir);
  console.log(`# ${dir} → ${base}（${assertions.length} 条）`);
  const results = await runChecks(base, assertions);
  for (const r of results) {
    if (r.ok) {
      console.log(`✓ ${r.label} → ${r.status}`);
    } else {
      console.log(`✗ ${r.label}${r.status ? ` → ${r.status}` : ''}`);
      for (const e of r.errors) {
        console.log(`    ${e}`);
      }
      if (r.preview) {
        console.log(`    响应体：${r.preview.replace(/\s+/g, ' ')}`);
      }
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n✓${results.length - failed} ✗${failed}`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
