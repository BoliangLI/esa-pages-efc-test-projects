# FcHandlers-index fixture

无后端框架，`/api/` 下两个 index.js 测试**末尾 index 折叠**：

- `api/index.js` → URL `/api`（pattern `^/api/?$`）
- `api/users/index.js` → URL `/api/users`（pattern `^/api/users/?$`）

测试目标：scanFcHandlers 把末尾 `index` 段去掉，跟父目录路由等价。这是 Vercel filesystem routing 的同款约定。

## 控制台配置

| 项 | 值 |
|---|---|
| 根目录 | `FcHandlers-index` |
| 构建命令 | （留空） |
| 静态资源目录 | （留空） |
| 入口 | （留空） |
| Node 版本 | 22.x |

## 部署后验收

```bash
node scripts/check.mjs FcHandlers-index https://<域名>
```

| 请求 | 期望 |
|------|------|
| `GET /api` → 200 | `root` |
| `GET /api/users` → 200 | `users-list` |

通过标准：`✓2 ✗0`。
