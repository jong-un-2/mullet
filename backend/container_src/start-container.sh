#!/bin/bash
set -e

echo "🚀 Starting Mars Substreams Indexer Container"
echo "=============================================="

# Load environment variables from .env.substreams if it exists
if [ -f "/app/.env.substreams" ]; then
    echo "📋 Loading environment from .env.substreams..."
    set -a  # automatically export all variables
    source /app/.env.substreams
    set +a
    echo "✅ Environment loaded"
else
    echo "⚠️  WARNING: /app/.env.substreams not found"
fi

# 检查必需的环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL not set, using placeholder"
    export DATABASE_URL="postgresql://user:pass@localhost:5432/mars"
fi

if [ -z "$SUBSTREAMS_ENDPOINT" ]; then
    echo "⚠️  Using default endpoint"
    export SUBSTREAMS_ENDPOINT="mainnet.sol.streamingfast.io:443"
fi

if [ -z "$START_BLOCK" ]; then
    export START_BLOCK="370500000"
fi

if [ -z "$OUTPUT_MODULE" ]; then
    export OUTPUT_MODULE="map_vault_events"
fi

# 修正数据库 URL scheme (postgresql -> postgres)
DSN="${DATABASE_URL/postgresql/postgres}"

echo "Configuration:"
echo "  - Endpoint: $SUBSTREAMS_ENDPOINT"
echo "  - Start Block: $START_BLOCK"
echo "  - Output Module: $OUTPUT_MODULE"
echo "  - DSN: ${DSN%%\?*}"
echo "  - RUST_LOG: ${RUST_LOG:-info}"
echo ""

# 创建日志目录
mkdir -p /app/logs

# 启动简单的HTTP服务器用于health check（在9102端口）
echo "Starting health check server on port 9102..."
cat > /tmp/health_server.sh << 'HEALTH_EOF'
#!/bin/bash
while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nHealthy" | nc -l -p 9102 -q 1 2>/dev/null || true
done
HEALTH_EOF
chmod +x /tmp/health_server.sh
/tmp/health_server.sh &
HEALTH_PID=$!
echo "✅ Health check server started (PID: $HEALTH_PID)"

# 验证认证信息（已通过 .env.substreams 自动 export）
if [ -z "$SUBSTREAMS_API_TOKEN" ] && [ -z "$SUBSTREAMS_API_KEY" ]; then
    echo "❌ ERROR: No authentication token found"
    echo "   Required: SUBSTREAMS_API_TOKEN (JWT) or SUBSTREAMS_API_KEY"
    echo "   Please check /app/.env.substreams configuration"
    exit 1
fi

if [ -n "$SUBSTREAMS_API_TOKEN" ]; then
    echo "✅ Using SUBSTREAMS_API_TOKEN (JWT) for authentication"
elif [ -n "$SUBSTREAMS_API_KEY" ]; then
    echo "✅ Using SUBSTREAMS_API_KEY for authentication"
fi

# 设置日志级别
export RUST_LOG="${RUST_LOG:-debug}"

echo ""
echo "Starting Substreams Sink (production mode - continuous indexing)..."
echo "=============================================="
echo "📋 All logs output to stdout/stderr for Cloudflare observability"
echo "📊 RUST_LOG level: $RUST_LOG"
echo ""

# 启动 substreams-sink-sql（后台运行，持续模式）
# 使用 from-proto 模式：Relational Mappings（自动从 protobuf 创建表）
# 使用 tee 同时输出到 stdout 和文件，确保 Cloudflare 可以捕获所有日志
echo "Starting sink with from-proto method (Relational Mappings):"
echo "  DSN: ${DSN%%\?*}"
echo "  Config: substreams.yaml"
echo "  Output Module: $OUTPUT_MODULE (map_vault_events)"
echo "  Start Block: $START_BLOCK"
echo "  Auth: ${SUBSTREAMS_API_TOKEN:+Token present}${SUBSTREAMS_API_KEY:+API Key present}"
echo "  Log Level: $RUST_LOG"
echo "  Method: from-proto (auto-creates tables from protobuf schema)"
echo ""

# 使用 stdbuf 确保日志立即刷新到 stdout，不缓冲
# 使用 from-proto 方法（Relational Mappings - 推荐方式）
# 自动从 protobuf 消息结构创建表，无需手动 setup
stdbuf -oL -eL substreams-sink-sql from-proto \
    "$DSN" \
    "substreams.yaml" \
    "$OUTPUT_MODULE" \
    --start-block "$START_BLOCK" \
    --final-blocks-only \
    2>&1 | stdbuf -oL -eL tee /app/logs/substreams-sink.log &

SINK_PID=$!
echo "✅ Substreams Sink started (PID: $SINK_PID) at $(date)"
echo "📊 All logs streaming to Cloudflare observability..."

# 保存PIDs
echo $SINK_PID > /tmp/sink.pid
echo $HEALTH_PID > /tmp/health.pid

# 监控进程
echo ""
echo "Container running. Monitoring processes..."
echo "=============================================="
echo "Health check: http://localhost:9102"
echo "Logs: /app/logs/substreams-sink.log (also streaming to stdout)"
echo ""

# 定期检查进程是否还在运行并输出状态
LOOP_COUNT=0
while true; do
    LOOP_COUNT=$((LOOP_COUNT + 1))
    
    if ! kill -0 $SINK_PID 2>/dev/null; then
        echo "❌ [$(date)] Substreams Sink process died, restarting..."
        stdbuf -oL -eL substreams-sink-sql from-proto \
            "$DSN" \
            "substreams.yaml" \
            "$OUTPUT_MODULE" \
            --start-block "$START_BLOCK" \
            --final-blocks-only \
            2>&1 | stdbuf -oL -eL tee -a /app/logs/substreams-sink.log &
        SINK_PID=$!
        echo $SINK_PID > /tmp/sink.pid
        echo "✅ [$(date)] Process restarted (PID: $SINK_PID)"
    else
        # 每10个循环（10分钟）输出一次健康状态
        if [ $((LOOP_COUNT % 10)) -eq 0 ]; then
            echo "💚 [$(date)] Container healthy - Sink PID: $SINK_PID, Health PID: $HEALTH_PID"
        fi
    fi
    
    if ! kill -0 $HEALTH_PID 2>/dev/null; then
        echo "❌ Health check server died, restarting..."
        /tmp/health_server.sh &
        HEALTH_PID=$!
        echo $HEALTH_PID > /tmp/health.pid
    fi
    
    # 每60秒检查一次
    sleep 60
done
