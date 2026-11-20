# FcHandlers-optional fixture

无后端框架，`/api/` 下只有一个 `[[...slug]].js` 测试**末尾可选 catch-all**：

- pattern `^/api(?:/(.+?))?/?$`
- 既匹配 `/api` 本身（slug 为 null），也匹配 `/api/foo/bar/baz`（slug 为 `"foo/bar/baz"`）

测试目标：scanFcHandlers 正确编译 `[[...name]]` 段；这是 4 种段类型里语义最复杂的一种。

## 控制台配置

| 项 | 值 |
|---|---|
| 根目录 | `FcHandlers-optional` |
| 构建命令 | （留空） |
| 静态资源目录 | （留空） |
| 入口 | （留空） |
| Node 版本 | 22.x |

## 部署后验收

```bash
node scripts/check.mjs FcHandlers-optional https://<域名>
```

| 请求 | 期望 |
|------|------|
| `GET /api` → 200 | `{"slug":null}` |
| `GET /api/foo/bar/baz` → 200 | `{"slug":"foo/bar/baz"}` |

通过标准：`✓2 ✗0`。
