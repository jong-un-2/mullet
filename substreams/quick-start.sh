#!/bin/bash

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Mars V8 Substreams 快速启动脚本            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# 检查必需工具
echo -e "${YELLOW}[1/6] 检查必需工具...${NC}"
REQUIRED_TOOLS=("cargo" "protoc" "substreams")

for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v $tool &> /dev/null; then
        echo -e "${RED}✗ $tool 未安装${NC}"
        echo ""
        echo "请先安装必需工具："
        echo "  - Rust: https://rustup.rs/"
        echo "  - Protoc: brew install protobuf"
        echo "  - Substreams CLI: brew install streamingfast/tap/substreams"
        exit 1
    else
        echo -e "${GREEN}✓ $tool 已安装${NC}"
    fi
done

# 检查环境配置
echo ""
echo -e "${YELLOW}[2/6] 检查环境配置...${NC}"
if [ ! -f ".env.substreams" ]; then
    echo -e "${YELLOW}  ℹ .env.substreams 不存在，复制模板...${NC}"
    cp .env.substreams.example .env.substreams
    echo -e "${RED}  ✗ 请编辑 .env.substreams 填入必要配置：${NC}"
    echo "    - SUBSTREAMS_API_KEY"
    echo "    - SUBSTREAMS_SINK_POSTGRES_DSN"
    echo ""
    echo "    申请 API Key: https://app.streamingfast.io/"
    echo ""
    read -p "按回车键继续编辑配置文件..."
    ${EDITOR:-nano} .env.substreams
fi

# 加载环境变量
source .env.substreams

# 验证必需变量
if [ -z "$SUBSTREAMS_API_KEY" ] || [ "$SUBSTREAMS_API_KEY" == "your_streamingfast_api_key_here" ]; then
    echo -e "${RED}✗ SUBSTREAMS_API_KEY 未配置${NC}"
    exit 1
fi

if [ -z "$SUBSTREAMS_SINK_POSTGRES_DSN" ] || [ "$SUBSTREAMS_SINK_POSTGRES_DSN" == "postgres://..." ]; then
    echo -e "${RED}✗ SUBSTREAMS_SINK_POSTGRES_DSN 未配置${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 环境配置正常${NC}"

# 构建 WASM
echo ""
echo -e "${YELLOW}[3/6] 构建 WASM 模块...${NC}"
if ./build.sh; then
    echo -e "${GREEN}✓ WASM 构建成功${NC}"
    WASM_SIZE=$(ls -lh target/wasm32-unknown-unknown/release/*.wasm | awk '{print $5}')
    echo -e "  📦 WASM 大小: $WASM_SIZE"
else
    echo -e "${RED}✗ WASM 构建失败${NC}"
    exit 1
fi

# 测试 PostgreSQL 连接
echo ""
echo -e "${YELLOW}[4/6] 测试 PostgreSQL 连接...${NC}"
if psql "$SUBSTREAMS_SINK_POSTGRES_DSN" -c "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL 连接正常${NC}"
else
    echo -e "${RED}✗ PostgreSQL 连接失败${NC}"
    echo "  请检查 SUBSTREAMS_SINK_POSTGRES_DSN 配置"
    exit 1
fi

# 运行基础测试
echo ""
echo -e "${YELLOW}[5/6] 运行基础测试...${NC}"
echo "  测试 map_blocks 模块..."
if substreams run \
    -e $SUBSTREAMS_ENDPOINT \
    substreams.postgres.yaml \
    map_blocks \
    -s $SUBSTREAMS_START_BLOCK \
    -t +10 &>/dev/null; then
    echo -e "${GREEN}✓ map_blocks 测试通过${NC}"
else
    echo -e "${YELLOW}⚠ map_blocks 测试失败（可能是网络问题）${NC}"
fi

# 选择部署方式
echo ""
echo -e "${YELLOW}[6/6] 选择部署方式...${NC}"
echo ""
echo "请选择部署方式："
echo "  1) PostgreSQL Sink (直接同步到数据库)"
echo "  2) Docker (容器化部署)"
echo "  3) Systemd (系统服务)"
echo "  4) 仅测试，稍后部署"
echo ""
read -p "请选择 [1-4]: " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}开始部署 PostgreSQL Sink...${NC}"
        ./deploy-production.sh postgres
        ;;
    2)
        echo ""
        echo -e "${BLUE}开始 Docker 部署...${NC}"
        ./deploy-production.sh docker
        ;;
    3)
        echo ""
        echo -e "${BLUE}开始 Systemd 部署...${NC}"
        ./deploy-production.sh systemd
        ;;
    4)
        echo ""
        echo -e "${GREEN}✓ 准备工作完成！${NC}"
        echo ""
        echo "后续可以运行："
        echo "  - 完整测试: ./test-complete.sh"
        echo "  - 部署生产: ./deploy-production.sh postgres"
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            🎉 快速启动完成！                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "📚 相关文档："
echo "  - 快速开始: QUICKSTART.md"
echo "  - 架构说明: ARCHITECTURE.md"
echo "  - 项目状态: PROJECT_STATUS.md"
echo ""
echo "💻 常用命令："
echo "  - 完整测试: ./test-complete.sh"
echo "  - 重新构建: ./build.sh"
echo "  - 查看日志: journalctl -u mars-substreams-sink -f"
echo ""
