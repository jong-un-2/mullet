# Cloudflare Container Registry 部署脚本
#!/bin/bash
set -e

echo "🚀 Mars V8 Substreams - Cloudflare Container 部署"
echo "================================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
REGISTRY="registry.cloudflare.com"
ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID}
NAMESPACE="mars-substreams"
IMAGE_NAME="mars-v8-substreams"
TAG=${1:-"latest"}

# 检查必要工具
check_tools() {
    echo "🔧 检查部署工具..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ 错误：未安装 Docker${NC}"
        exit 1
    fi
    
    if ! command -v wrangler &> /dev/null; then
        echo -e "${RED}❌ 错误：未安装 Wrangler CLI${NC}"
        echo "安装: npm install -g wrangler"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 工具检查完成${NC}"
}

# 检查环境变量
check_environment() {
    echo ""
    echo "📋 检查环境变量..."
    
    if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
        echo -e "${RED}❌ 错误：未设置 CLOUDFLARE_ACCOUNT_ID${NC}"
        exit 1
    fi
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        echo -e "${RED}❌ 错误：未设置 CLOUDFLARE_API_TOKEN${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 环境变量检查通过${NC}"
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

# 构建 Docker 镜像
build_image() {
    echo ""
    echo "🐳 构建 Docker 镜像..."
    
    FULL_IMAGE="${REGISTRY}/${ACCOUNT_ID}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"
    
    echo "镜像名称: $FULL_IMAGE"
    
    docker build -f Dockerfile.serverless -t "$FULL_IMAGE" .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 镜像构建成功${NC}"
    else
        echo -e "${RED}❌ 镜像构建失败${NC}"
        exit 1
    fi
}

# 推送到 Cloudflare Registry
push_image() {
    echo ""
    echo "📤 推送镜像到 Cloudflare Container Registry..."
    
    # 登录 Cloudflare Registry
    echo $CLOUDFLARE_API_TOKEN | docker login $REGISTRY --username token --password-stdin
    
    FULL_IMAGE="${REGISTRY}/${ACCOUNT_ID}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"
    
    docker push "$FULL_IMAGE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 镜像推送成功${NC}"
        echo "镜像地址: $FULL_IMAGE"
    else
        echo -e "${RED}❌ 镜像推送失败${NC}"
        exit 1
    fi
}

# 部署 Container
deploy_container() {
    echo ""
    echo "🚀 部署 Cloudflare Container..."
    
    cat > container.toml << EOF
[container]
name = "mars-v8-substreams"
image = "${REGISTRY}/${ACCOUNT_ID}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"

# 资源配置
[[container.services]]
name = "substreams-sink"
port = 8080
protocol = "http"

[[container.services]]
name = "metrics"
port = 9090
protocol = "http"

# 环境变量
[container.env]
SUBSTREAMS_ENDPOINT = "${SUBSTREAMS_ENDPOINT}"
SUBSTREAMS_JWT_TOKEN = "${SUBSTREAMS_JWT_TOKEN}"
SUBSTREAMS_SINK_POSTGRES_DSN = "${SUBSTREAMS_SINK_POSTGRES_DSN}"
START_BLOCK = "${START_BLOCK:-370000000}"
CONTAINER_VERSION = "${TAG}"

# 健康检查
[container.health]
path = "/health"
port = 8080
interval = "30s"
timeout = "10s"
retries = 3

# 资源限制
[container.resources]
cpu = "1000m"      # 1 CPU core
memory = "2Gi"     # 2GB RAM
disk = "10Gi"      # 10GB disk

# 重启策略
[container.restart]
policy = "always"
max_attempts = 5

# 日志配置
[container.logging]
driver = "cloudflare"
max_size = "100m"
max_files = 10
EOF
    
    echo "Container 配置已创建"
    
    # 使用 Wrangler 部署
    wrangler container deploy container.toml
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Container 部署成功${NC}"
    else
        echo -e "${RED}❌ Container 部署失败${NC}"
        exit 1
    fi
}

# 创建监控配置
create_monitoring() {
    echo ""
    echo "📊 创建监控配置..."
    
    cat > monitoring.yml << EOF
# Cloudflare Analytics 配置
analytics:
  enabled: true
  metrics:
    - name: "blocks_processed"
      type: "counter"
      help: "Total blocks processed"
    
    - name: "processing_duration"
      type: "histogram"
      help: "Block processing duration"
    
    - name: "database_connections"
      type: "gauge"
      help: "Active database connections"

# 告警规则
alerts:
  - name: "container_down"
    condition: "up == 0"
    duration: "5m"
    
  - name: "high_error_rate"
    condition: "rate(mars_errors_total[5m]) > 0.1"
    duration: "2m"
    
  - name: "database_connection_failed"
    condition: "mars_database_connection_errors > 5"
    duration: "1m"
EOF
    
    echo -e "${GREEN}✅ 监控配置已创建${NC}"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "================================"
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo ""
    echo "Container 信息:"
    echo "  - 名称: mars-v8-substreams"
    echo "  - 镜像: ${REGISTRY}/${ACCOUNT_ID}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"
    echo "  - 健康检查: :8080/health"
    echo "  - 指标: :9090/metrics"
    echo ""
    echo "管理命令:"
    echo "  查看状态: wrangler container status mars-v8-substreams"
    echo "  查看日志: wrangler container logs mars-v8-substreams"
    echo "  更新容器: ./deploy-cloudflare.sh new-tag"
    echo "  停止容器: wrangler container stop mars-v8-substreams"
    echo ""
    echo "监控链接:"
    echo "  - Cloudflare Dashboard: https://dash.cloudflare.com/"
    echo "  - Container Metrics: https://dash.cloudflare.com/analytics"
}

# 主函数
main() {
    echo "部署标签: $TAG"
    echo "账户 ID: $ACCOUNT_ID"
    echo ""
    
    check_tools
    check_environment
    build_wasm
    build_image
    push_image
    deploy_container
    create_monitoring
    show_deployment_info
}

# 运行部署
main "$@"