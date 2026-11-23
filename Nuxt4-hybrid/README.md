# Nuxt4-hybrid fixture

Nuxt 4 混合渲染黑盒探针：一次部署覆盖 routeRules 的各种缓存形态、预渲染、SPA、重定向/CORS/静态 headers、@nuxt/image（ipx + sharp）、流式响应和运行时环境，用来观察 TestStep → pcg → 生产容器整条链路上 Nuxt 的实际表现。

- `nuxt.config.ts` 不写 `nitro.preset`，构建时由 pcg 用 `NITRO_PRESET` 切到 esa-nitro-preset。
- 页面都用 `LabStamp` 组件展示 renderId、渲染时间、渲染实例、cookie 和 payload 数据，每页写明了「预期」。
- 入口：`/lab`（总览页，自身不缓存），自动化观测：`./probe.sh`。
- 页面、接口和 IPX 图片的显式缓存 TTL 统一为 **5s**，便于快速观察过期；`swr: true` 专项保留默认约 1s。

## 控制台配置

| 项 | 值 |
|---|---|
| 根目录 | `Nuxt4-hybrid` |
| 构建命令 | （留空） |
| 静态资源目录 | （留空） |
| 入口 | （留空） |
| Node 版本 | 22.x 或 24.x |

`esa.jsonc` 只填了 installCommand，其余留空由 pcg 自动处理。

## Nuxt 版本固定在 4.4.8

云构建的 Node 只有 `24.x → v24.13.0`、`22.x → v22.16.0` 两档，pcg 会严格校验 engines：

| Nuxt | engines.node | 云构建 |
|------|--------------|--------|
| ≥ 4.6 | `^22.22.3 \|\| ^24.15.0` | 两档都不满足，构建直接失败 |
| 4.5.x | `^22.19.0 \|\| ^24.11.0 \|\| >=26.0.0` | 只能配 `24.x`（v22.16.0 不满足） |
| 4.4.8 | `^22.12.0 \|\| ^24.11.0 \|\| >=26.0.0` | 两档都可用 |

升级 Nuxt 前先确认云构建的 Node 小版本。

## 两层缓存

- **L1**：ESA 边缘，按响应头 `s-maxage` 缓存。命中时请求不到 FC，`[lab] fc-hit` 日志也不会出现。
- **L2**：Nitro `cachedEventHandler` → esa-nitro-preset driver → Gateway → OSS，跨实例共享。
- `/lab/l2/**` 把 `cache-control` 改写成 `private, no-store`，关掉 L1，只观察 L2。

观测用的响应头：

| 响应头 | 含义 |
|--------|------|
| `x-lab-served-by` | 本次处理请求的实例 |
| `x-lab-rendered-by` | 渲染这份缓存条目的实例（随条目缓存，命中时回放） |
| `x-lab-cache-key` | 只在本实例实际渲染时出现，值可以交给 `/api/lab/revalidate?key=` |

## 观测表

「本地」列记录此前 mock Gateway 下的观测行为；表中缓存时间和响应头已按当前 5s 配置更新为预期值，缩短 TTL 后需重新验证。「线上待确认」需要部署后用 probe.sh 或浏览器观察。

### 页面缓存

| 路径 | 规则 | 本地实测 | 线上待确认 |
|------|------|----------|------------|
| `/lab/swr` | `swr: 5` | `s-maxage=5, stale-while-revalidate`，重复请求 renderId 不变 | L1 命中时 `age`/`via` 等边缘头 |
| `/lab/l2/swr` | `swr: 5`，关 L1 | L2 命中 renderId 不变；过期后第 1 次返回旧内容，3s 后已重新生成 | 跨实例：`rendered-by ≠ served-by`；响应后实例被冻结时后台重新生成是否完成 |
| `/lab/swr-long` | `swr: 5` | — | 缓存过期前切换到新版本，首次访问应是冷缓存（renderId 与上一版本不同）；超出 5s 无法区分自然过期与版本隔离 |
| `/lab/swr-true` | `swr: true` | 只有 `stale-while-revalidate`，每次返回上一次的渲染 | 同左 |
| `/lab/cache-block` | `cache: { maxAge: 5, swr: false }` | `max-age=5` | 同左 |
| `/lab/isr` | `isr: 5` | 无 cache-control，每次都重新渲染（isr 只被 vercel/netlify 等 preset 识别） | 同左 |
| `/lab/personal` | `swr: 5`，不配 varies | Nitro 缓存层只转发 varies 里的请求头，cookie 被剥掉，页面看到 `(none)`：个性化无声失效，但不串号 | 同左 |
| `/lab/personal-varies` | `varies: ['cookie']` | L2 按 cookie 各存一份；响应**不带 `Vary: cookie`**，却有 `s-maxage=5` | L1 是否把第一个用户的页面返回给所有人（串号） |
| `/lab/boom` | `swr: 5` | 500 + `no-cache`，不缓存 | 同左 |
| 任意缓存页 + 不同 query | — | 每个 query 各存一份（`?utm=1`、`?utm=2` 是两个 OSS 对象） | OSS 对象数量随 query 膨胀 |

### payload（`<path>/_payload.json`）

缓存页面的 HTML 带 `NUXT_PAYLOAD_INLINE=false`，浏览器水合时会请求 `/<path>/_payload.json?<buildId>`。LabStamp 里的 `dataId`/`dataUser` 来自 `useAsyncData`，走的就是这份外置 payload。

| 现象 | 说明 |
|------|------|
| 现状：所有配了 swr/isr/cache 的页面，`_payload.json` 都返回 500 | esa-nitro-preset `driver.mjs` 的 `hasItem` 写的是 `this.getItem`，unstorage 以无绑定方式调用，renderer 在 `payloadCache.hasItem` 处抛 TypeError。浏览器只打 warn，useAsyncData 改在客户端重新请求，**每次访问缓存页都会多打一次 FC**。浏览器里看到的 dataId 与「查看源码」里的不同，就是这个原因 |
| hasItem 修好之后：payload 串号 | Nuxt 会给每条缓存规则派生 `_payload.json` 规则（varies 也继承），但 renderer 用的 `cache:nuxt:payload` 只按路径存一份、每次渲染 HTML 都会覆盖：carol 渲染之后，其他用户取到的都是 carol 的 payload；isr 页面的 payload 等于最近一次 HTML 渲染的结果 |

### 图片优化（`/lab/image`）

| 路径 | 本地实测 | 线上待确认 |
|------|----------|------------|
| `/lab/photo.jpg`（原图 1.6MB） | 本地由 Nitro 提供 | 是否边缘直出（`x-lab-served-by` 为空） |
| `/_ipx/f_webp&w_300/lab/photo.jpg` | 200，约 1.5KB webp，IPX 文件缓存 `maxAge: 5`，预期 `max-age=5, public, s-maxage=5` | linux 构建机打进 code.zip 的 sharp 能否在 pod 里加载 |
| `/_ipx/s_100x100/lab/photo.jpg`（`swr: 5`） | 第 1 次合法 jpeg；第 2 次（L2 命中）变成 2 字节的 `{}`、`application/json`，图片损坏（Nitro 缓存只保存字符串 body） | 同左 |

### 其他

| 项 | 本地实测 | 线上待确认 |
|----|----------|------------|
| `/lab/prerendered` | 本地由 Nitro 提供 | 是否边缘直出 |
| `/lab/spa`（`ssr: false`） | 只返回壳，HTML 无 renderId | 同左 |
| `/lab/old` | 301 → `/lab/swr` | 同左 |
| `/lab-static/a.txt` | 本地带 `x-lab-static: 1` | 边缘直出时 routeRules.headers 不生效 |
| `/api/lab/cors` | `access-control-allow-origin: *`，OPTIONS 200 | 同左 |
| `/api/lab/cached-fn`、`cached-route` | 命中有效；revalidate（removeItem）后重新计算 | 同左 |
| `/api/lab/clear` | 无效：driver 的 getKeys 返回 `[]` | 同左 |
| `/api/lab/data-storage` | 写到 `cwd/.data/kv`，同实例内计数连续 | 代码目录是否可写、跨实例是否丢失 |
| `/api/lab/sse?n=5` | 首条 0s 到达，4s 结束 | 是否被边缘或 FC 缓冲（首条 ≈5s） |
| `/api/lab/big?mb=5` | 字节数正确 | 耗时 |
| `/api/lab/upload` | 3MB、20MB sha256 一致 | 请求体上限 |
| `/api/lab/log?size=40000` | — | 按返回的 tag 去日志后台搜索：各级别 console、consola、stdout/stderr、多行、中文、stack、40KB 长日志 |
| `/api/lab/env` | 带 `NUXT_LAB_RUNTIME_VALUE` 启动时运行时覆盖生效 | 线上无法给容器设运行时环境变量，只记录 `labRuntimeValue`（应为 `default`）和平台注入的变量 |
| `/api/lab/diag` | cache 存储往返为 true | `ESA_CACHE_GW_*` 是否齐全 |

## probe.sh

```bash
./probe.sh https://<域名>           # 约 30s
SLOW=1 ./probe.sh https://<域名>    # 额外跑 swr 过期（等待 6s 过期 + 3s 后台重新生成）
```

- 在本机执行，只向部署域名发 HTTP 请求，不需要进入容器；本机需要 `curl`。
- 每次运行带唯一 query（`?p=<run>`），保证 L1/L2 都是冷的。
- `✓` 与上表「本地实测」一致，`✗` 不一致需要人工看，`·` 只打印观测值（线上待确认的项都在 `·` 里）。
- 兼容 macOS 自带的 bash 3.2。

## 本地验证

本地没有 Gateway，用 `scripts/mock-gateway.mjs`（内存 Map，协议对齐 driver.mjs）代替。

```bash
# 1. 用 TestStep 的 local-build 走一遍云构建流程，产出 fc/code.zip、assets/
npm_config_registry=https://registry.npmjs.org \
  node /path/to/TestStep/scripts/local-build.mjs
# version/deploy 步骤报 Invalid URL 属正常

# 2. 解压并启动
mkdir -p /tmp/n4-fc && unzip -q fc/code.zip -d /tmp/n4-fc
node scripts/mock-gateway.mjs 8788 &
cd /tmp/n4-fc && PORT=3101 \
  ESA_CACHE_GW_GATEWAY_ENDPOINT=http://127.0.0.1:8788 \
  ESA_CACHE_GW_AUTH_KEY=local-mock ESA_CACHE_GW_ALIUID=1 \
  ESA_CACHE_GW_FUNCTIONNAME=n4 ESA_CACHE_GW_VERSION=v1 \
  NUXT_LAB_RUNTIME_VALUE=from-runtime \
  node __efc_runtime-bootstrap.mjs &

# 3. 跑探针
./probe.sh http://127.0.0.1:3101
```

本地只有一个实例、没有 L1，跨实例、边缘缓存、静态直出、日志采集等项只能线上看。

要观察「hasItem 修好之后」的 payload 行为，在解压后的副本里把 `server/node_modules/esa-nitro-preset/driver.mjs` 中 `hasItem` 的 `this.getItem` 改成闭包引用（不要改 pages-cache-gateway 源码），再重启服务。

## 验收标准

使用上面的控制台配置完成构建部署后：

1. 构建日志包含 `Framework detection (all matched):`、`nuxtjs`、`pcg artifacts packed:` 和 `<<LOG>>step|buildEnd<</LOG>>`。
2. `./probe.sh https://<域名>` 无 `✗`；带 `·` 的线上观测项只记录结果，不计失败。
3. `/lab` 总览页及各探针路径可访问。
