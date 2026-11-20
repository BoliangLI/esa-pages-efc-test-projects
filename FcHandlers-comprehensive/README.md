# FcHandlers-comprehensive fixture

无后端框架，`/api/` 下覆盖所有 FC handler 路由模式的综合测试 fixture：

**三种 handler 风格：**
- `api/foo.js` — Node 经典 `(req, res)`
- `api/health.js` — Web fetch 对象
- `api/items.js` — 命名 HTTP method（GET/POST）

**动态路由：**
- `api/users/[id].js` — 单段动态参数
- `api/users/profile.js` — 静态路径优先于动态参数
- `api/posts/[...slug].js` — 多段 catch-all

**前端页面：**
- `public/index.html` + `public/style.css` — 演示页（阿里橙主题 + 暗色切换 + API 实时测试）

测试目标：
- TestStep 走 `packFcHandlers` 分支
- `fc-bundle` 生成 6 条路由（3 静态 + 1 动态参数 + 1 静态优先 + 1 catch-all）
- `AssetsDirectory: "public"` 同时打包前端页面
- 一次构建覆盖原有 dynamic + optional + basic 三个 fixture 的所有场景

## 控制台配置

| 项 | 值 |
|---|---|
| 根目录 | `FcHandlers-comprehensive` |
| 构建命令 | （留空） |
| 静态资源目录 | （留空） |
| 入口 | （留空） |
| Node 版本 | 22.x |

`esa.jsonc` 已填好 `installCommand: ""` 和 `assets.directory: "./public"`。

## 构建日志应出现

- `No backend framework but /api/ has FC handler files`
- `fc-bundle finished: 6 routes`
- `FC handlers zip created:`
- `<<LOG>>step|buildEnd<</LOG>>`

## 部署后验收

```bash
node scripts/check.mjs FcHandlers-comprehensive https://<域名>
```

| 请求 | 期望 |
|------|------|
| `GET /` → 200 | 包含 "FC Handlers Comprehensive Example" |
| `GET /api/foo` → 200 | `{"from":"foo"}` |
| `GET /api/health` → 200 | `{"ok":true}` |
| `GET /api/items` → 200 | `{"list":[]}` |
| `POST /api/items` → 201 | `{"created":true}` |
| `DELETE /api/items` → 405 | `Method Not Allowed` + `Allow: GET,POST` |
| `GET /api/users/42` → 200 | `{"user":"42"}` |
| `GET /api/users/profile` → 200 | `profile`（静态路由优先） |
| `GET /api/posts/a/b/c` → 200 | `{"slug":"a/b/c"}` |
| `GET /api/nope` → 404 | `Not Found` |

通过标准：`✓10 ✗0`（首页静态资源在部署后测）。
