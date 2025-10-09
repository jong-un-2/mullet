#!/bin/bash
set -e

# Mars V2 Substreams 生产部署脚本
# 支持两种部署方式：PostgreSQL Sink 和 Docker

echo "🚀 Mars V2 Substreams 生产部署"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
START_BLOCK=${START_BLOCK:-372182088}
DEPLOYMENT_TYPE=${1:-"postgres"}  # postgres, docker

# 检查环境
check_environment() {
    echo "📋 检查部署环境..."
    
    # 检查 .env.substreams
    if [ ! -f ".env.substreams" ]; then
        echo -e "${RED}❌ 错误：未找到 .env.substreams${NC}"
        echo "请复制 .env.substreams.example 并配置:"
        echo "  cp .env.substreams.example .env.substreams"
        echo "  nano .env.substreams"
        exit 1
    fi
    
    # 使用 set -a 自动 export 所有变量
    set -a
    source .env.substreams
    set +a
    
    # 检查必要的环境变量
    if [ -z "$SUBSTREAMS_ENDPOINT" ]; then
        echo -e "${RED}❌ 错误：未设置 SUBSTREAMS_ENDPOINT${NC}"
        exit 1
    fi
    
    if [ -z "$SUBSTREAMS_API_KEY" ] || [ "$SUBSTREAMS_API_KEY" = "your_api_key_here" ]; then
        echo -e "${RED}❌ 错误：未设置有效的 SUBSTREAMS_API_KEY${NC}"
        echo "请访问 https://app.streamingfast.io/ 获取 API Key"
        exit 1
    fi
    
    if [ "$DEPLOYMENT_TYPE" = "postgres" ]; then
        if [ -z "$SUBSTREAMS_SINK_POSTGRES_DSN" ]; then
            echo -e "${RED}❌ 错误：未设置 SUBSTREAMS_SINK_POSTGRES_DSN${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ 环境检查通过${NC}"
}

# 检查工具
check_tools() {
    echo ""
    echo "🔧 检查必要工具..."
    
    if ! command -v substreams &> /dev/null; then
        echo -e "${RED}❌ 错误：未安装 substreams CLI${NC}"
        echo "安装命令:"
        echo "  curl https://substreams.streamingfast.io/install | bash"
        exit 1
    fi
    
    SUBSTREAMS_VERSION=$(substreams --version 2>&1 | head -n1 || echo "unknown")
    echo "  substreams: $SUBSTREAMS_VERSION"
    
    if [ "$DEPLOYMENT_TYPE" = "postgres" ]; then
        if ! command -v substreams-sink-sql &> /dev/null; then
            echo -e "${RED}❌ 错误：未安装 substreams-sink-sql${NC}"
            echo "安装命令:"
            echo "  cargo install substreams-sink-sql"
            exit 1
        fi
        
        SINK_VERSION=$(substreams-sink-sql --version 2>&1 | head -n1 || echo "unknown")
        echo "  substreams-sink-sql: $SINK_VERSION"
    fi
    
    if [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}❌ 错误：未安装 docker${NC}"
            exit 1
        fi
        echo "  docker: $(docker --version)"
    fi
    
    echo -e "${GREEN}✅ 工具检查完成${NC}"
}

# 构建 WASM
build_wasm() {
    echo ""
    echo "🔨 构建 WASM 模块..."
    
    cargo build --target wasm32-unknown-unknown --release
    
    WASM_FILE="target/wasm32-unknown-unknown/release/mars_vaults_substreams.wasm"
    if [ -f "$WASM_FILE" ]; then
        WASM_SIZE=$(ls -lh "$WASM_FILE" | awk '{print $5}')
        echo -e "${GREEN}✅ WASM 构建成功: $WASM_SIZE${NC}"
    else
        echo -e "${RED}❌ WASM 构建失败${NC}"
        exit 1
    fi
}

# 测试连接
test_connection() {
    echo ""
    echo "🔌 测试 Substreams 连接..."
    
    # 测试简单查询
    if substreams info substreams.yaml &> /dev/null; then
        echo -e "${GREEN}✅ Substreams 配置有效${NC}"
    else
        echo -e "${RED}❌ Substreams 配置错误${NC}"
        exit 1
    fi
    
    # 如果是 PostgreSQL 部署，测试数据库连接
    if [ "$DEPLOYMENT_TYPE" = "postgres" ]; then
        echo ""
        echo "🗄️  测试 PostgreSQL 连接..."
        
        if command -v psql &> /dev/null; then
            if psql "$SUBSTREAMS_SINK_POSTGRES_DSN" -c "SELECT version();" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ PostgreSQL 连接成功${NC}"
                
                # 显示表列表
                echo ""
                echo "📋 现有 Substreams 表:"
                psql "$SUBSTREAMS_SINK_POSTGRES_DSN" -t -c "
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_name LIKE 'mars_vault_%' 
                    ORDER BY table_name;
                " | sed 's/^/  /'
            else
                echo -e "${RED}❌ PostgreSQL 连接失败${NC}"
                exit 1
            fi
        else
            echo -e "${YELLOW}⚠️  未安装 psql，跳过数据库测试${NC}"
        fi
    fi
}

# 部署 PostgreSQL Sink
deploy_postgres() {
    echo ""
    echo "🚀 部署 PostgreSQL Sink (Relational Mappings)"
    echo "================================"
    
    CONFIG_FILE="substreams.yaml"
    OUTPUT_MODULE="map_vault_events"
    
    echo "配置:"
    echo "  - Manifest: $CONFIG_FILE"
    echo "  - 输出模块: $OUTPUT_MODULE"
    echo "  - 起始区块: $START_BLOCK"
    echo "  - 端点: $SUBSTREAMS_ENDPOINT"
    echo "  - 数据库: ${SUBSTREAMS_SINK_POSTGRES_DSN%%\?*}"
    echo ""
    
    read -p "确认开始部署? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "部署已取消"
        exit 0
    fi
    
    echo ""
    echo "启动 PostgreSQL Sink (from-proto 方法)..."
    
    # 创建日志目录
    mkdir -p logs
    LOG_FILE="logs/substreams-postgres-$(date +%Y%m%d_%H%M%S).log"
    
    echo "使用 Relational Mappings 自动创建表结构并开始同步..."
    
    # 设置环境变量并启动 sink（后台运行）
    export SUBSTREAMS_API_TOKEN="$SUBSTREAMS_API_KEY"
    
    # 启动 sink（后台运行）- 使用 from-proto 方法
    substreams-sink-sql from-proto \
        "$SUBSTREAMS_SINK_POSTGRES_DSN" \
        "$CONFIG_FILE" \
        "$OUTPUT_MODULE" \
        --start-block "$START_BLOCK" \
        --final-blocks-only \
        2>&1 | tee "$LOG_FILE" &
    
    SINK_PID=$!
    
    echo ""
    echo -e "${GREEN}✅ PostgreSQL Sink 已启动！${NC}"
    echo "  - PID: $SINK_PID"
    echo "  - 日志: $LOG_FILE"
    echo ""
    echo "监控命令:"
    echo "  tail -f $LOG_FILE"
    echo ""
    echo "停止命令:"
    echo "  kill $SINK_PID"
    
    # 保存 PID
    echo $SINK_PID > .substreams-sink.pid
    
    # 等待几秒查看是否成功启动
    echo ""
    echo "等待启动..."
    sleep 5
    
    if ps -p $SINK_PID > /dev/null; then
        echo -e "${GREEN}✅ Sink 运行正常${NC}"
    else
        echo -e "${RED}❌ Sink 启动失败，查看日志: $LOG_FILE${NC}"
        exit 1
    fi
}

# Docker 部署选项
deploy_docker() {
    echo ""
    echo "🐳 Docker 部署 (PostgreSQL Sink)"
    echo "================================"
    
    # 创建启动脚本
    cat > start-sink.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting Substreams PostgreSQL Sink..."

substreams-sink-sql from-proto \
    "$SUBSTREAMS_SINK_POSTGRES_DSN" \
    /app/substreams.yaml \
    map_vault_events \
    --start-block "${START_BLOCK:-372182088}" \
    --final-blocks-only
EOF
    
    cat > Dockerfile.sink << 'EOF'
FROM rust:1.75-slim

# 安装依赖
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 substreams-sink-postgres
RUN cargo install substreams-sink-postgres

# 安装 substreams CLI
RUN curl https://substreams.streamingfast.io/install | bash

WORKDIR /app

# 复制配置文件
COPY substreams.yaml .
COPY target/wasm32-unknown-unknown/release/mars_vaults_substreams.wasm ./target/wasm32-unknown-unknown/release/

# 启动脚本
COPY start-sink.sh .
RUN chmod +x start-sink.sh

CMD ["./start-sink.sh"]
EOF
    
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  substreams-sink:
    build:
      context: .
      dockerfile: Dockerfile.sink
    environment:
      - SUBSTREAMS_ENDPOINT=${SUBSTREAMS_ENDPOINT}
      - SUBSTREAMS_API_KEY=${SUBSTREAMS_API_KEY}
      - SUBSTREAMS_SINK_POSTGRES_DSN=${SUBSTREAMS_SINK_POSTGRES_DSN}
      - START_BLOCK=${START_BLOCK}
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - substreams-network

networks:
  substreams-network:
    driver: bridge
EOF
    
    echo -e "${GREEN}✅ Docker 配置已创建${NC}"
    echo ""
    echo "文件创建成功:"
    echo "  - Dockerfile.sink"
    echo "  - docker-compose.yml"
    echo "  - start-sink.sh"
    echo ""
    echo "构建并启动:"
    echo "  docker-compose build"
    echo "  docker-compose up -d"
    echo ""
    echo "查看日志:"
    echo "  docker-compose logs -f substreams-sink"
    echo ""
    echo "停止服务:"
    echo "  docker-compose down"
}

# 创建 systemd 服务
create_systemd_service() {
    echo ""
    echo "⚙️  创建 systemd 服务"
    echo "================================"
    
    SERVICE_FILE="mars-substreams-sink.service"
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Mars V8 Substreams PostgreSQL Sink
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment="SUBSTREAMS_ENDPOINT=$SUBSTREAMS_ENDPOINT"
Environment="SUBSTREAMS_API_KEY=$SUBSTREAMS_API_KEY"
Environment="SUBSTREAMS_SINK_POSTGRES_DSN=$SUBSTREAMS_SINK_POSTGRES_DSN"
Environment="START_BLOCK=$START_BLOCK"
ExecStart=/usr/local/bin/substreams-sink-postgres run \\
    \$SUBSTREAMS_ENDPOINT \\
    $(pwd)/substreams.yaml \\
    \$SUBSTREAMS_SINK_POSTGRES_DSN \\
    --api-key \$SUBSTREAMS_API_KEY \\
    --start-block \$START_BLOCK \\
    --live
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    echo -e "${GREEN}✅ systemd 服务文件已创建: $SERVICE_FILE${NC}"
    echo ""
    echo "安装服务:"
    echo "  sudo cp $SERVICE_FILE /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable $SERVICE_FILE"
    echo "  sudo systemctl start mars-substreams-sink"
    echo ""
    echo "查看状态:"
    echo "  sudo systemctl status mars-substreams-sink"
    echo "  sudo journalctl -u mars-substreams-sink -f"
}

# 主部署流程
main() {
    echo "部署类型: $DEPLOYMENT_TYPE"
    echo ""
    
    check_environment
    check_tools
    build_wasm
    test_connection
    
    case "$DEPLOYMENT_TYPE" in
        postgres)
            deploy_postgres
            ;;
        docker)
            deploy_docker
            ;;
        systemd)
            create_systemd_service
            ;;
        *)
            echo -e "${RED}❌ 未知的部署类型: $DEPLOYMENT_TYPE${NC}"
            echo ""
            echo "用法: $0 [postgres|docker|systemd]"
            echo ""
            echo "部署类型:"
            echo "  postgres - PostgreSQL Sink (默认)"
            echo "  docker   - Docker 部署"
            echo "  systemd  - systemd 服务"
            exit 1
            ;;
    esac
    
    echo ""
    echo "================================"
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo ""
    echo "📊 监控仪表板:"
    echo "  - PostgreSQL: 直接查询数据库"
    echo "  - Logs: logs/ 目录"
    echo ""
    echo "🔍 验证数据:"
    echo "  psql \$SUBSTREAMS_SINK_POSTGRES_DSN -c 'SELECT COUNT(*) FROM mars_vault_deposits;'"
    echo ""
    echo "📚 文档:"
    echo "  - README.md"
    echo "  - ARCHITECTURE.md"
    echo "  - ANALYSIS_REPORT.md"
}

# 运行部署
main "$@"
