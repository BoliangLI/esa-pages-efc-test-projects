# Nuxt-app 示例项目

Nuxt 3 示例应用，展示 ISR（增量静态再生）与服务端 API 路由。

## 核心特性

- **SSR 渲染**：Nuxt 服务端渲染，首屏直出
- **ISR (SWR)**：`routeRules.swr: 60` 页面缓存 60 秒后后台再生
- **Nitro 引擎**：云构建由 pcg 注入 `esa-nitro-preset`，产出 FC 运行时代码
- **文件路由**：`pages/` 自动路由 + `server/api/` 自动接口

## ISR 配置

```typescript
// nuxt.config.ts
routeRules: {
  '/': { swr: 60 }  // 60 秒后后台再生
}
```

首页显示 ISR 最后再生时间戳，刷新页面可观察时间变化（SWR 60s 后后台再生）。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/users/:id | 获取用户信息 |
| POST | /api/echo | 回显请求体 |

## 本地运行

```bash
npm install
npm run dev      # 开发模式
npm run build    # 构建
npm start        # 生产启动
```

## 测试目标

- TestStep 将项目识别为 `nuxtjs`（Nuxt 对底层 h3/vite/node 的匹配具有 supersedes 优先级）
- `packBackendCode` 走 **meta-framework 分支**，不走普通 backend framework 分支
- pcg 注入 `esa-nitro-preset` 并执行 Nuxt 构建
- pcg 的 `fc/`、`assets/` 被分别打包为 `fc/code.zip` 和静态资源
- `collectArtifacts` 看到 `ctx.assetsAlreadyCollected = true`，跳过默认 `dist/` 拷贝

跟 backend framework（Express/Koa/Hono 等）的核心区别：
- 不跑 nft trace（Nuxt/pcg 负责生成运行时代码）
- assets 由 pcg 从 Nuxt 输出中收集，不走默认 `dist/`
- 用户无需在控制台填写构建命令、assets 或入口

## 控制台配置

| 项 | 值 |
|---|---|
| 根目录 | `Nuxt-app` |
| 构建命令 | （留空） |
| 静态资源目录 | （留空） |
| 入口 | （留空） |
| Node 版本 | 22.x |

`esa.jsonc` 只填了 installCommand，buildCommand/assets/entry 全留空，由 pcg 自动处理。

## 构建日志应出现

- `Framework detection (all matched):`、`nuxtjs`
- `Copying pcg assets/ to artifactsAssetsDir.`
- `Packing pcg fc/ into code.zip.`
- `pcg artifacts packed:`
- `Backend conf.jsonc created:`
- `<<LOG>>step|buildEnd<</LOG>>`

## 部署后验收

```bash
node scripts/check.mjs Nuxt-app https://<域名>
```

| 请求 | 期望 |
|------|------|
| `GET /` → 200 | 包含 "ISR 最后再生时间" |
| `GET /api/health` → 200 | `{"ok":true,"framework":"nuxt"}` |
| `GET /api/users/42` → 200 | `{"user":"42","source":"nuxt"}` |
| `POST /api/echo` → 200 | `{"received":{"k":"v"},"echoed":true}` |

通过标准：`✓4 ✗0`。
