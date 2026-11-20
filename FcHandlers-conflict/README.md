# FcHandlers-conflict fixture

无后端框架，`/api/` 下故意放两个会编译出同一个 URL pattern 的文件：

- `api/[id].js`
- `api/[name].js`

二者都编译为 `^/api/([^/]+?)/?$`。

测试目标：
- 走 `packFcHandlers` 分支
- `scanFcHandlers` 检测到 Route conflict，抛错
- TestStep 把错包成 `Pack backend zip failed: Route conflict: ...`
- 整个 step **FAIL**

## 控制台配置

| 项 | 值 |
|---|---|
| 根目录 | `FcHandlers-conflict` |
| 构建命令 | （留空） |
| 静态资源目录 | （留空） |
| 入口 | （留空） |
| Node 版本 | 22.x |

## 验收

**构建失败**即为通过。构建日志应包含：

- `Route conflict`

无 checks.json，不需要部署后验收。
