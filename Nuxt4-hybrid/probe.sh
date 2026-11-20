#!/usr/bin/env bash
# Nuxt4-hybrid 探针：按观测表顺序请求部署后的站点，打印观测值并对能确定的项给出判定。
#
# 用法：
#   ./probe.sh https://<域名>            # 线上
#   ./probe.sh http://127.0.0.1:3101     # 本地（见 README「本地验证」）
#   SLOW=1 ./probe.sh <base>             # 额外跑 swr 过期（约 40s）
#
# 判定：✓ 与 README 观测表的「现状」一致；✗ 不一致（需要人工看）；· 只打印观测值。
# 每次运行带唯一 query（?p=<run>），保证 L1/L2 都是冷的；需要排除 L1 的判定走 /lab/l2/**。
set -u
BASE=${1:?用法: ./probe.sh <base-url>}
BASE=${BASE%/}
RUN=$(date +%s)-$RANDOM
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
PASS=0
FAIL=0

# ---- 工具函数 ----
section() { printf '\n== %s\n' "$1"; }
info() { printf '  · %s\n' "$*"; }
check() { # 描述 预期 实际
  if [ "$2" = "$3" ]; then
    PASS=$((PASS + 1))
    printf '  ✓ %s（%s）\n' "$1" "$3"
  else
    FAIL=$((FAIL + 1))
    printf '  ✗ %s：预期 %s，实际 %s\n' "$1" "$2" "$3"
  fi
}
# fetch <url> [curl 参数...]：响应头写 $TMP/h，body 写 $TMP/b，状态码写 $STATUS
fetch() {
  local url=$1
  shift
  curl -s -m 60 -D "$TMP/h" -o "$TMP/b" "$@" "$url"
  # 取最后一个状态行，跳过上传时的 100 Continue
  STATUS=$(grep -E '^HTTP/' "$TMP/h" 2>/dev/null | tail -1 | awk '{print $2}')
}
hdr() { grep -i "^$1:" "$TMP/h" | head -1 | cut -d' ' -f2- | tr -d '\r'; }
lab() { grep -oE "data-lab=\"$1\"[^>]*>[^<]*" "$TMP/b" | head -1 | sed 's/.*>//'; }
json() { grep -oE "\"$1\":(\"[^\"]*\"|[^,}]*)" "$TMP/b" | head -1 | cut -d: -f2- | tr -d '"'; }
# 边缘可能返回的缓存状态头，名字不确定，统一打印
edge() { grep -iE '^(age|via|x-cache[a-z-]*|x-site-cache-status|x-swift-[a-z-]*|eagleid):' "$TMP/h" | tr -d '\r' | tr '\n' ' '; }
page() { # 打印一次页面请求的关键信息，并把 renderId 写入 $RID
  fetch "$@"
  RID=$(lab renderId)
  info "$STATUS rid=${RID:0:8} user=$(lab cookieUser) data=$(lab dataId | cut -c1-8)/$(lab dataUser) cc=[$(hdr cache-control)] served=$(hdr x-lab-served-by | tail -c 7) key=$(hdr x-lab-cache-key) $(edge)"
}
sha() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | cut -c1-64
  else
    shasum -a 256 "$1" | cut -c1-64
  fi
}
now() { perl -MTime::HiRes=time -e 'printf "%.3f", time'; }
# dt <后> <前>：两个时间点相减，保留 1 位小数
dt() { awk -v a="$1" -v b="$2" 'BEGIN { printf "%.1f", a - b }'; }
# 并发请求：输出每行 "<served-by> <renderId|->"
cat > "$TMP/w.sh" <<'EOF'
out=$(curl -s -m 60 -D - "$1" | tr -d '\r')
sb=$(printf '%s\n' "$out" | grep -i '^x-lab-served-by:' | head -1 | cut -d' ' -f2)
rid=$(printf '%s' "$out" | grep -oE 'data-lab="renderId"[^>]*>[^<]*' | head -1 | sed 's/.*>//')
echo "${sb:--} ${rid:--}"
EOF
par() { seq "$2" | xargs -P "$2" -I{} bash "$TMP/w.sh" "$1"; }

echo "Nuxt4-hybrid probe  base=$BASE  run=$RUN"

section "运行时基础（whoami / env / diag）"
fetch "$BASE/api/lab/whoami"
check "whoami 可访问" 200 "$STATUS"
info "instance=$(json instance) uptimeSec=$(json uptimeSec)"
fetch "$BASE/api/lab/env"
info "$(head -c 900 "$TMP/b")"
info "labRuntimeValue=$(json labRuntimeValue)（线上无法给容器设 NUXT_LAB_RUNTIME_VALUE，应为 default；本地带该变量启动时为 from-runtime）"
fetch "$BASE/api/lab/diag"
check "cache 存储往返（ESA_CACHE_GW_* 齐全时为 true）" true "$(json roundTrip)"
info "$(head -c 400 "$TMP/b")"

section "swr 命中（/lab/swr，swr: 30）"
U="$BASE/lab/swr?p=$RUN"
page "$U"
R1=$RID
check "响应头" "s-maxage=30, stale-while-revalidate" "$(hdr cache-control)"
page "$U"
check "第 2 次 renderId 不变" "$R1" "$RID"
page "$U"
check "第 3 次 renderId 不变" "$R1" "$RID"

section "只看 L2（/lab/l2/swr，cache-control 改写为 private, no-store）"
U="$BASE/lab/l2/swr?p=$RUN"
page "$U"
R1=$RID
KEY=$(hdr x-lab-cache-key)
check "L1 已关闭" "private, no-store" "$(hdr cache-control)"
page "$U"
check "L2 命中 renderId 不变" "$R1" "$RID"
info "x-lab-rendered-by=$(hdr x-lab-rendered-by)  x-lab-served-by=$(hdr x-lab-served-by)（不同即跨实例共享）"

section "按需失效（/api/lab/revalidate，对 /lab/l2/swr）"
if [ -n "$KEY" ]; then
  fetch "$BASE/api/lab/revalidate" -G --data-urlencode "key=$KEY"
  check "删除前条目存在" true "$(json existedBefore)"
  check "删除后条目不存在" false "$(json existsAfter)"
  page "$U"
  if [ "$RID" != "$R1" ]; then
    check "失效后重新渲染" changed changed
  else
    check "失效后重新渲染" changed "unchanged(${RID:0:8})"
  fi
else
  check "拿到 x-lab-cache-key" present missing
fi

section "跨实例与并发（/api/lab/whoami ×40，冷 key ×30，热 key ×20）"
par "$BASE/api/lab/whoami" 40 > "$TMP/p1"
INST=$(awk '{print $1}' "$TMP/p1" | sort -u | grep -vc '^-$')
info "40 并发打出的实例数：$INST"
par "$BASE/lab/l2/swr?p=$RUN-cold" 30 > "$TMP/p2"
info "冷 key 30 并发：不同 renderId $(awk '{print $2}' "$TMP/p2" | sort -u | wc -l | tr -d ' ') 个，实例 $(awk '{print $1}' "$TMP/p2" | sort -u | wc -l | tr -d ' ') 个（renderId 数 ≤ 实例数即单实例内去重）"
par "$BASE/lab/l2/swr?p=$RUN-cold" 20 > "$TMP/p3"
check "热 key 20 并发只有 1 个 renderId" 1 "$(awk '{print $2}' "$TMP/p3" | sort -u | wc -l | tr -d ' ')"
info "热 key 由 $(awk '{print $1}' "$TMP/p3" | sort -u | wc -l | tr -d ' ') 个实例返回"

if [ "${SLOW:-0}" = "1" ]; then
  section "swr 过期（/lab/l2/swr，等 35s）"
  U="$BASE/lab/l2/swr?p=$RUN-exp"
  page "$U"
  R1=$RID
  info "等待 35s..."
  sleep 35
  page "$U"
  check "过期后第 1 次返回旧内容" "$R1" "$RID"
  sleep 3
  page "$U"
  if [ "$RID" != "$R1" ]; then
    check "后台重新生成已完成" changed changed
  else
    check "后台重新生成已完成（未完成说明响应后进程被冻结）" changed unchanged
  fi
fi

section "swr: true / 阻塞式缓存 / isr"
U="$BASE/lab/swr-true?p=$RUN"
page "$U"
check "swr: true 响应头" "stale-while-revalidate" "$(hdr cache-control)"
sleep 2
page "$U"
info "swr: true 每次返回上一次的渲染，后台重新生成"
page "$BASE/lab/cache-block?p=$RUN"
check "cache-block 响应头" "max-age=20" "$(hdr cache-control)"
U="$BASE/lab/isr?p=$RUN"
page "$U"
R1=$RID
check "isr 无 cache-control" "" "$(hdr cache-control)"
page "$U"
if [ "$RID" != "$R1" ]; then
  check "isr 不缓存（每次新 renderId）" changed changed
else
  check "isr 不缓存（每次新 renderId）" changed unchanged
fi

section "query 拆分缓存"
page "$BASE/lab/l2/swr?p=$RUN&utm=1"
R1=$RID
page "$BASE/lab/l2/swr?p=$RUN&utm=2"
if [ "$RID" != "$R1" ]; then
  check "不同 query 各一份缓存" split split
else
  check "不同 query 各一份缓存" split same
fi

section "cookie（/lab/personal 不配 varies；/lab/personal-varies 配 varies: cookie）"
page "$BASE/lab/personal?p=$RUN" -H 'cookie: lab_user=alice'
check "不配 varies：cookie 被剥掉" "(none)" "$(lab cookieUser)"
U="$BASE/lab/personal-varies?p=$RUN"
page "$U" -H 'cookie: lab_user=alice'
check "varies：alice 看到 alice" alice "$(lab cookieUser)"
check "varies：响应不带 Vary" "" "$(hdr vary)"
page "$U" -H 'cookie: lab_user=bob'
info "bob 看到 user=$(lab cookieUser)：alice=边缘 L1 串号；bob=未被 L1 缓存或 L1 按 cookie 区分"

section "payload（_payload.json）"
fetch "$BASE/lab/swr/_payload.json"
info "/lab/swr/_payload.json → $STATUS cc=[$(hdr cache-control)]"
if [ "$STATUS" = 500 ]; then
  info "500：esa-nitro-preset driver.hasItem 使用 this.getItem，缓存页面的 payload 全部失败（已知缺陷）"
else
  page "$BASE/lab/personal-varies" -H 'cookie: lab_user=carol'
  fetch "$BASE/lab/personal-varies/_payload.json" -H 'cookie: lab_user=dave'
  info "carol 渲染后 dave 取 payload，内含用户：$(grep -oE 'alice|bob|carol|dave' "$TMP/b" | sort -u | tr '\n' ' ')（不是 dave=payload 只按路径存一份、串号，已知缺陷）"
fi

section "错误不缓存（/lab/boom）"
fetch "$BASE/lab/boom?p=$RUN"
check "boom 状态码" 500 "$STATUS"
info "cache-control=[$(hdr cache-control)]"

section "cached function / cached handler + revalidate"
fetch "$BASE/api/lab/cached-fn"
C1=$(json computeId)
fetch "$BASE/api/lab/cached-fn"
check "cached-fn 命中" "$C1" "$(json computeId)"
fetch "$BASE/api/lab/revalidate" -G --data-urlencode "key=/cache:nitro/functions:lab-fn:fixed.json"
fetch "$BASE/api/lab/cached-fn"
if [ "$(json computeId)" != "$C1" ]; then
  check "cached-fn 失效后重新计算" changed changed
else
  check "cached-fn 失效后重新计算" changed unchanged
fi
fetch "$BASE/api/lab/cached-route"
info "cached-route cc=[$(hdr cache-control)] renderId=$(json renderId | cut -c1-8)"

section "clear 无效 / data 存储"
fetch "$BASE/api/lab/clear"
info "$(head -c 300 "$TMP/b")"
fetch "$BASE/api/lab/data-storage"
info "第 1 次：$(head -c 300 "$TMP/b")"
fetch "$BASE/api/lab/data-storage"
info "第 2 次：$(head -c 300 "$TMP/b")（previous 为 null 或 count 不连续=实例内存储/不可写）"

section "图片优化（@nuxt/image + ipx）"
fetch "$BASE/lab/photo.jpg"
info "原图 $(wc -c < "$TMP/b" | tr -d ' ') bytes，served=$(hdr x-lab-served-by | tail -c 7)（空=边缘直出）"
fetch "$BASE/_ipx/f_webp&w_300/lab/photo.jpg"
check "webp 300 状态码" 200 "$STATUS"
info "webp 300：$(wc -c < "$TMP/b" | tr -d ' ') bytes，$(file -b "$TMP/b" | cut -c1-50)，cc=[$(hdr cache-control)]"
U="$BASE/_ipx/s_100x100/lab/photo.jpg?p=$RUN"
fetch "$U"
check "s_100x100 第 1 次是 jpeg" image/jpeg "$(hdr content-type)"
fetch "$U"
info "s_100x100 第 2 次：content-type=$(hdr content-type) $(wc -c < "$TMP/b" | tr -d ' ') bytes（application/json 2 bytes=二进制被缓存成 {}，已知缺陷）"

section "cors / redirect / 静态资源 / 预渲染 / SPA"
fetch "$BASE/api/lab/cors" -H 'origin: https://probe.example'
check "cors 头" "*" "$(hdr access-control-allow-origin)"
fetch "$BASE/api/lab/cors" -X OPTIONS -H 'origin: https://probe.example' -H 'access-control-request-method: PUT'
info "OPTIONS 预检 → $STATUS allow-methods=$(hdr access-control-allow-methods)"
fetch "$BASE/lab/old"
check "/lab/old 301" 301 "$STATUS"
check "/lab/old location" /lab/swr "$(hdr location)"
fetch "$BASE/lab-static/a.txt"
info "/lab-static/a.txt → $STATUS x-lab-static=[$(hdr x-lab-static)] served=[$(hdr x-lab-served-by | tail -c 7)]（都为空=边缘直出，routeRules.headers 不生效）"
page "$BASE/lab/prerendered"
info "prerendered：served=[$(hdr x-lab-served-by | tail -c 7)]（空=边缘直出），renderedAt=$(lab renderedAt)"
fetch "$BASE/lab/spa"
check "SPA 只返回壳（HTML 无 renderId）" "" "$(lab renderId)"

section "流式与大响应"
T0=$(now)
FIRST=
while IFS= read -r line; do
  if [ -z "$FIRST" ] && [ "${line#data:}" != "$line" ]; then
    FIRST=$(now)
  fi
done < <(curl -sN -m 30 "$BASE/api/lab/sse?n=5")
T1=$(now)
info "sse n=5：首条到达 $(dt "${FIRST:-$T1}" "$T0")s，结束 $(dt "$T1" "$T0")s（首条 ≈0s=逐条下发；≈5s=被缓冲）"
fetch "$BASE/api/lab/big?mb=5" -w '%{time_total}' > "$TMP/t"
check "big 5MB 字节数" "$(hdr x-lab-bytes)" "$(wc -c < "$TMP/b" | tr -d ' ')"
info "big 5MB 耗时 $(cat "$TMP/t")s"
for MB in 3 20; do
  head -c $((MB * 1048576)) /dev/urandom > "$TMP/up"
  fetch "$BASE/api/lab/upload" -X POST --data-binary @"$TMP/up" -H 'content-type: application/octet-stream'
  if [ "$STATUS" = 200 ]; then
    check "upload ${MB}MB sha256" "$(sha "$TMP/up")" "$(json sha256)"
  else
    info "upload ${MB}MB → ${STATUS}（请求体上限）"
  fi
done

section "日志采集"
fetch "$BASE/api/lab/log?size=40000"
info "已输出，去日志后台搜索 tag：$(json tag)（各级别 console、consola、stdout/stderr、多行、中文、stack、40KB 长日志）"

printf '\n合计：✓ %s  ✗ %s\n' "$PASS" "$FAIL"
