# Express-comprehensive fixture

合并三个 Express 边缘测试场景到一个 fixture：

1. **入口消歧**：`server.js` 是诱饵（不 import Express），`app.js` 是真正的入口
2. **框架优先于 FC handlers**：`/api/foo.js` 存在但 Express 应优先处理
3. **views/ 模板自动追踪**：设置 view engine 后 nft 会追踪 EJS 模板文件

测试目标：
- TestStep 识别 `app.js` 为入口（跳过 decoy `server.js`）
- 走 `packBackendFramework` 分支（不走 `packFcHandlers`）
- `nft trace` 包含 `views/` 下的模板文件
- 一次构建覆盖原有 with-api + with-views + disambig 三个 fixture

## 控制台配置

| 项 | 值 |
|---|---|
| 根目录 | `Express-comprehensive` |
| 构建命令 | （留空） |
| 静态资源目录 | （留空） |
| 入口 | （留空） |
| Node 版本 | 22.x |

`esa.jsonc` 已填好 installCommand，其余走默认。

## 构建日志应出现

- `Detected backend project (framework: Express)`
- `nft trace finished:`
- `Backend zip created:`
- `<<LOG>>step|buildEnd<</LOG>>`

**不应出现**：
- `No backend framework but /api/ has FC handler files`（说明误走了 FC handlers 分支）
- `FC handlers zip created`

## 部署后验收

```bash
node scripts/check.mjs Express-comprehensive https://<域名>
```

| 请求 | 期望 |
|------|------|
| `GET /` → 200 | 包含 "Hello world" 和 "express-comprehensive fixture" |
| `GET /api/foo` → 200 | `{"from":"express"}` |
| `GET /nope` → 404 | — |

通过标准：`✓3 ✗0`。
