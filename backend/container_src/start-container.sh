#!/bin/bash
set -e

echo "🚀 Starting Mars Substreams Indexer Container"
echo "=============================================="

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
    export OUTPUT_MODULE="db_out"
fi

echo "Configuration:"
echo "  - Endpoint: $SUBSTREAMS_ENDPOINT"
echo "  - Start Block: $START_BLOCK"
echo "  - Output Module: $OUTPUT_MODULE"
echo "  - Database: ${DATABASE_URL%%\?*}"
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

# 如果有JWT token，使用它
if [ -n "$SUBSTREAMS_JWT_TOKEN" ]; then
    export SUBSTREAMS_API_TOKEN="$SUBSTREAMS_JWT_TOKEN"
fi

echo ""
echo "Starting Substreams Sink (LIVE mode - continuous indexing)..."
echo "=============================================="

# 启动 substreams-sink-sql（后台运行，持续模式）
substreams-sink-sql from-proto \
    "$DATABASE_URL" \
    "substreams.yaml" \
    "$OUTPUT_MODULE" \
    --start-block="$START_BLOCK" \
    --final-blocks-only \
    --on-module-hash-mistmatch=warn \
    --undo-buffer-size=12 \
    --live \
    2>&1 | tee /app/logs/substreams-sink.log &

SINK_PID=$!
echo "✅ Substreams Sink started (PID: $SINK_PID)"

# 保存PIDs
echo $SINK_PID > /tmp/sink.pid
echo $HEALTH_PID > /tmp/health.pid

# 监控进程
echo ""
echo "Container running. Monitoring processes..."
echo "=============================================="

# 定期检查进程是否还在运行
while true; do
    if ! kill -0 $SINK_PID 2>/dev/null; then
        echo "❌ Substreams Sink process died, restarting..."
        substreams-sink-sql from-proto \
            "$DATABASE_URL" \
            "substreams.yaml" \
            "$OUTPUT_MODULE" \
            --start-block="$START_BLOCK" \
            --final-blocks-only \
            --on-module-hash-mistmatch=warn \
            --undo-buffer-size=12 \
            --live \
            2>&1 | tee -a /app/logs/substreams-sink.log &
        SINK_PID=$!
        echo $SINK_PID > /tmp/sink.pid
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
