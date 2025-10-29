#!/bin/bash
set -e

# 确保所有输出立即刷新，不使用缓冲
export PYTHONUNBUFFERED=1
export RUST_BACKTRACE=1

# Cloudflare Container 日志配置 - 确保输出到 stdout/stderr
exec 1> >(stdbuf -oL -eL cat)
exec 2> >(stdbuf -oL -eL cat >&2)

echo "[$(date -Iseconds)] 🚀 Starting Mars Substreams Indexer Container"
echo "[$(date -Iseconds)] =============================================="

# Load environment variables from .env.substreams if it exists
if [ -f "/app/.env.substreams" ]; then
    echo "[$(date -Iseconds)] 📋 Loading environment from .env.substreams..."
    set -a  # automatically export all variables
    source /app/.env.substreams
    set +a
    echo "[$(date -Iseconds)] ✅ Environment loaded"
else
    echo "[$(date -Iseconds)] ⚠️  WARNING: /app/.env.substreams not found"
fi

# 检查必需的环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "[$(date -Iseconds)] ⚠️  WARNING: DATABASE_URL not set, using placeholder"
    export DATABASE_URL="postgresql://user:pass@localhost:5432/mars"
fi

if [ -z "$SUBSTREAMS_ENDPOINT" ]; then
    echo "[$(date -Iseconds)] ⚠️  Using default endpoint"
    export SUBSTREAMS_ENDPOINT="mainnet.sol.streamingfast.io:443"
fi

if [ -z "$START_BLOCK" ]; then
    export START_BLOCK="376601697"
fi

if [ -z "$OUTPUT_MODULE" ]; then
    export OUTPUT_MODULE="map_vault_events"
fi

# 修正数据库 URL scheme (postgresql -> postgres)
DSN="${DATABASE_URL/postgresql/postgres}"

echo "[$(date -Iseconds)] Configuration:"
echo "[$(date -Iseconds)]   - Endpoint: $SUBSTREAMS_ENDPOINT"
echo "[$(date -Iseconds)]   - Start Block: $START_BLOCK"
echo "[$(date -Iseconds)]   - Output Module: $OUTPUT_MODULE"
echo "[$(date -Iseconds)]   - DSN: ${DSN%%\?*}"
echo "[$(date -Iseconds)]   - RUST_LOG: ${RUST_LOG:-info}"
echo ""

# 创建日志目录
mkdir -p /app/logs

# 验证认证信息（已通过 .env.substreams 自动 export）
if [ -z "$SUBSTREAMS_API_TOKEN" ] && [ -z "$SUBSTREAMS_API_KEY" ]; then
    echo "[$(date -Iseconds)] ❌ ERROR: No authentication token found"
    echo "[$(date -Iseconds)]    Required: SUBSTREAMS_API_TOKEN (JWT) or SUBSTREAMS_API_KEY"
    echo "[$(date -Iseconds)]    Please check /app/.env.substreams configuration"
    exit 1
fi

if [ -n "$SUBSTREAMS_API_TOKEN" ]; then
    echo "[$(date -Iseconds)] ✅ Using SUBSTREAMS_API_TOKEN (JWT) for authentication"
elif [ -n "$SUBSTREAMS_API_KEY" ]; then
    echo "[$(date -Iseconds)] ✅ Using SUBSTREAMS_API_KEY for authentication"
fi

# 设置日志级别
export RUST_LOG="${RUST_LOG:-debug}"

# 健康检查服务器（HTTP端口 9102）
echo "[$(date -Iseconds)] 🏥 Starting health check server on port 9102..."
cat > /tmp/health_server.sh << 'HEALTH_EOF'
#!/bin/bash
while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"healthy\",\"service\":\"mars-substreams-indexer\",\"timestamp\":\"$(date -Iseconds)\"}" | nc -l -p 9102 -q 1 2>/dev/null || true
    sleep 0.1  # 短暂休息避免CPU过载
done
HEALTH_EOF
chmod +x /tmp/health_server.sh
/tmp/health_server.sh &
HEALTH_PID=$!
echo "[$(date -Iseconds)] ✅ Health check server started (PID: $HEALTH_PID)"

echo ""
echo "[$(date -Iseconds)] Starting Substreams Sink (production mode - continuous indexing)..."
echo "[$(date -Iseconds)] =============================================="
echo "[$(date -Iseconds)] 📋 All logs output to stdout/stderr for Cloudflare observability"
echo "[$(date -Iseconds)] 📊 RUST_LOG level: $RUST_LOG"
echo ""

# 启动 substreams-sink-sql（前台运行，作为主进程）
echo "[$(date -Iseconds)] Starting sink with from-proto method (Relational Mappings):"
echo "[$(date -Iseconds)]   DSN: ${DSN%%\?*}"
echo "[$(date -Iseconds)]   Config: substreams.yaml"
echo "[$(date -Iseconds)]   Output Module: $OUTPUT_MODULE (map_vault_events)"
echo "[$(date -Iseconds)]   Start Block: $START_BLOCK"
echo "[$(date -Iseconds)]   Auth: ${SUBSTREAMS_API_TOKEN:+Token present}${SUBSTREAMS_API_KEY:+API Key present}"
echo "[$(date -Iseconds)]   Log Level: $RUST_LOG"
echo "[$(date -Iseconds)]   Method: from-proto (auto-creates tables from protobuf schema)"
echo ""

# 使用 exec 直接运行，不fork到后台，这样容器主进程就是 substreams-sink-sql
# Cloudflare Container 会捕获主进程的 stdout/stderr
# 注意：exec 会替换当前进程，所以这必须是脚本的最后一条命令
echo "[$(date -Iseconds)] 🚀 Starting substreams-sink-sql as main process..."
exec substreams-sink-sql from-proto \
    "$DSN" \
    "substreams.yaml" \
    "$OUTPUT_MODULE" \
    --start-block "$START_BLOCK" \
    --final-blocks-only \
    -e "$SUBSTREAMS_ENDPOINT" \
    -H "authorization: Bearer ${SUBSTREAMS_API_TOKEN}"
