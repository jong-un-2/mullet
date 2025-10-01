#!/bin/bash
set -e

echo "🚀 Starting Mars V8 Substreams Container"
echo "======================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 验证环境变量
check_env() {
    echo "📋 检查环境变量..."
    
    required_vars=(
        "SUBSTREAMS_ENDPOINT"
        "SUBSTREAMS_JWT_TOKEN"
        "SUBSTREAMS_SINK_POSTGRES_DSN"
        "START_BLOCK"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}❌ 错误：环境变量 $var 未设置${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ 环境变量检查通过${NC}"
}

# 测试数据库连接
test_db_connection() {
    echo "🗄️ 测试数据库连接..."
    
    if psql "$SUBSTREAMS_SINK_POSTGRES_DSN" -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL 连接成功${NC}"
    else
        echo -e "${RED}❌ PostgreSQL 连接失败${NC}"
        exit 1
    fi
}

# 启动健康检查服务器
start_health_server() {
    echo "🏥 启动健康检查服务器..."
    
    cat > health-server.sh << 'EOF'
#!/bin/bash
while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"healthy\",\"timestamp\":\"$(date -Iseconds)\"}" | nc -l -p 8080 -q 1
done
EOF
    
    chmod +x health-server.sh
    ./health-server.sh &
    HEALTH_PID=$!
    echo "Health server started with PID: $HEALTH_PID"
}

# 启动指标服务器（Prometheus）
start_metrics_server() {
    echo "📊 启动指标服务器..."
    
    cat > metrics-server.sh << 'EOF'
#!/bin/bash
while true; do
    PROCESSED_BLOCKS=$(tail -100 /app/logs/substreams.log 2>/dev/null | grep -c "block processed" || echo 0)
    ERRORS=$(tail -100 /app/logs/substreams.log 2>/dev/null | grep -c "error" || echo 0)
    
    cat << METRICS | nc -l -p 9090 -q 1
HTTP/1.1 200 OK
Content-Type: text/plain

# Mars Substreams Metrics
mars_blocks_processed_total $PROCESSED_BLOCKS
mars_errors_total $ERRORS
mars_uptime_seconds $(awk '{print int($1)}' /proc/uptime)
METRICS
done
EOF
    
    chmod +x metrics-server.sh
    ./metrics-server.sh &
    METRICS_PID=$!
    echo "Metrics server started with PID: $METRICS_PID"
}

# 启动 Substreams Sink
start_substreams_sink() {
    echo "🔥 启动 Substreams Sink..."
    echo "配置:"
    echo "  - 端点: $SUBSTREAMS_ENDPOINT"
    echo "  - 起始区块: $START_BLOCK"
    echo "  - 数据库: ${SUBSTREAMS_SINK_POSTGRES_DSN%%\?*}"
    echo ""
    
    # 创建日志目录
    mkdir -p /app/logs
    
    # 设置环境变量
    export SUBSTREAMS_API_TOKEN="$SUBSTREAMS_JWT_TOKEN"
    
    # 启动 sink
    echo "Starting substreams-sink-sql..."
    substreams-sink-sql from-proto \
        "$SUBSTREAMS_SINK_POSTGRES_DSN" \
        "substreams.yaml" \
        "map_vault_events" \
        --start-block "$START_BLOCK" \
        --final-blocks-only \
        --live \
        --verbose \
        2>&1 | tee /app/logs/substreams.log
}

# 信号处理
cleanup() {
    echo ""
    echo "🛑 收到终止信号，正在清理..."
    
    if [ ! -z "$HEALTH_PID" ]; then
        kill $HEALTH_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$METRICS_PID" ]; then
        kill $METRICS_PID 2>/dev/null || true
    fi
    
    echo "清理完成"
    exit 0
}

# 设置信号处理
trap cleanup SIGTERM SIGINT

# 主流程
main() {
    echo "容器启动时间: $(date)"
    echo "容器版本: ${CONTAINER_VERSION:-latest}"
    echo ""
    
    check_env
    test_db_connection
    start_health_server
    start_metrics_server
    start_substreams_sink
}

# 运行主流程
main "$@"