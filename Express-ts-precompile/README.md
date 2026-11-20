# Express-ts-precompile fixture

测试 TestStep 的 Backend TypeScript 自动预编译功能（esbuild 路径）。

**关键设计**：
- 有 `tsconfig.json` → 触发 `isTsProject()` 返回 true
- 入口 `server.ts` 在根目录 → `resolveTsEntry()` 找到它
- **无 postinstall / buildCommand** → 用户未编译，走 esbuild 预编译路径
- Express 框架 → 不在 SKIP_SLUGS（nestjs/midway/nextjs/nuxtjs）中，需要预编译
- 纯后端项目 → 不是 fullstack，不会跳过预编译

**预期日志**：
1. `TypeScript entry detected (server.ts), precompiling with esbuild...`
2. `TypeScript compiled: server.ts → .ts-build/entry.js`
3. `Detected backend project (framework: Express), nft tracing from compiled entry...`
4. `nft trace finished:`
5. `Backend zip created:`
6. `buildEnd`

## 控制台配置

| 项 | 值 |
|---|---|
| 根目录 | `Express-ts-precompile` |
| 构建命令 | （留空） |
| 静态资源目录 | （留空） |
| 入口 | （留空） |
| Node 版本 | 22.x |

## 部署后验收

```bash
node scripts/check.mjs Express-ts-precompile https://<域名>
```

| 请求 | 期望 |
|------|------|
| `GET /` → 200 | `hello from ts` |
| `GET /api/health` → 200 | `{"ok":true,"from":"express-ts"}` |

通过标准：`✓2 ✗0`。
