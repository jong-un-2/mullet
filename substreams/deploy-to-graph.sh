#!/bin/bash

# ============================================================
# Mars Vaults V8 - The Graph Protocol Deployment Script
# ============================================================

set -e

echo "🚀 Mars Vaults V8 - Graph Protocol 部署"
echo "========================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查环境
check_dependencies() {
    echo -e "${BLUE}📦 检查依赖...${NC}"
    
    if ! command -v substreams &> /dev/null; then
        echo -e "${RED}❌ substreams CLI 未安装${NC}"
        echo "安装: curl https://get.substreams.dev | bash"
        exit 1
    fi
    
    if ! command -v graph &> /dev/null; then
        echo -e "${YELLOW}⚠️  graph CLI 未安装 (可选)${NC}"
        echo "安装: npm install -g @graphprotocol/graph-cli"
    fi
    
    echo -e "${GREEN}✅ 依赖检查完成${NC}\n"
}

# 编译 WASM
build_wasm() {
    echo -e "${BLUE}🔨 编译 WASM 模块...${NC}"
    cargo build --target wasm32-unknown-unknown --release
    
    if [ $? -eq 0 ]; then
        WASM_SIZE=$(du -h target/wasm32-unknown-unknown/release/mars_vaults_substreams.wasm | cut -f1)
        echo -e "${GREEN}✅ WASM 编译成功 (${WASM_SIZE})${NC}\n"
    else
        echo -e "${RED}❌ WASM 编译失败${NC}"
        exit 1
    fi
}

# 生成 Protobuf (可选)
generate_proto() {
    echo -e "${BLUE}📝 生成 Protobuf...${NC}"
    if command -v buf &> /dev/null; then
        substreams protogen ./substreams-graph.yaml --exclude-paths="sf/substreams,google"
        echo -e "${GREEN}✅ Protobuf 生成完成${NC}\n"
    else
        echo -e "${YELLOW}⚠️  buf CLI 未安装，跳过 protogen (不影响部署)${NC}\n"
    fi
}

# 打包 Substreams
package_substreams() {
    echo -e "${BLUE}📦 打包 Substreams...${NC}"
    substreams pack substreams-graph.yaml
    
    if [ -f "mars-vaults-v8.spkg" ]; then
        PKG_SIZE=$(du -h mars-vaults-v8.spkg | cut -f1)
        echo -e "${GREEN}✅ 打包成功: mars-vaults-v8.spkg (${PKG_SIZE})${NC}\n"
    else
        echo -e "${RED}❌ 打包失败${NC}"
        exit 1
    fi
}

# 测试 Substreams
test_substreams() {
    echo -e "${BLUE}🧪 测试 Substreams (100 个区块)...${NC}"
    
    if [ ! -f ".env.substreams" ]; then
        echo -e "${RED}❌ .env.substreams 文件不存在${NC}"
        exit 1
    fi
    
    source .env.substreams
    
    substreams run \
        -e $SUBSTREAMS_ENDPOINT \
        --plaintext=false \
        -H "Authorization: Bearer $SUBSTREAMS_JWT_TOKEN" \
        substreams-graph.yaml \
        graph_out \
        -s 370500000 \
        --stop-block=+100 \
        --output-module graph_out
    
    echo -e "${GREEN}✅ 测试完成${NC}\n"
}

# 部署到 Graph Studio
deploy_to_studio() {
    echo -e "${BLUE}🌐 准备部署到 The Graph Studio...${NC}"
    echo ""
    echo "请按照以下步骤部署:"
    echo ""
    echo "1. 访问: https://thegraph.com/studio/"
    echo "2. 创建新的 Subgraph"
    echo "3. 运行以下命令:"
    echo ""
    echo -e "${YELLOW}graph auth --studio <DEPLOY_KEY>${NC}"
    echo -e "${YELLOW}graph deploy --studio mars-vaults-v8 \\"
    echo "  --subgraph mars-vaults-v8.spkg${NC}"
    echo ""
    echo "或者使用 Substreams Sink:"
    echo ""
    echo -e "${YELLOW}substreams sink graph deploy \\
  mars-vaults-v8.spkg \\
  --endpoint https://api.studio.thegraph.com/deploy/ \\
  --api-token <YOUR_DEPLOY_KEY>${NC}"
    echo ""
}

# 显示部署信息
show_deployment_info() {
    echo -e "${GREEN}📊 部署信息${NC}"
    echo "=================================="
    echo "包名称: mars_vaults_substreams_graph"
    echo "版本: v1.0.0"
    echo "起始区块: 370,500,000"
    echo "网络: solana-mainnet-beta"
    echo "输出模块: graph_out"
    echo ""
    echo "生成的实体:"
    echo "  - VaultDeposit (存款事件)"
    echo "  - VaultWithdrawal (提款事件)"
    echo "  - SwapAndDeposit (交换并存款)"
    echo "  - WithdrawWithSwap (提款并交换)"
    echo "  - VaultRebalance (重平衡)"
    echo "  - KaminoDeposit (Kamino 存款)"
    echo "  - KaminoWithdrawal (Kamino 提款)"
    echo "  - VaultStateUpdate (状态更新)"
    echo "  - VaultState (状态快照)"
    echo ""
    echo -e "${BLUE}GraphQL 查询端点将在部署后可用${NC}"
    echo "=================================="
}

# 主流程
main() {
    echo ""
    check_dependencies
    build_wasm
    generate_proto
    package_substreams
    
    # 询问是否测试
    read -p "是否运行测试? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_substreams
    fi
    
    show_deployment_info
    deploy_to_studio
    
    echo ""
    echo -e "${GREEN}🎉 准备完成！${NC}"
    echo "下一步: 按照上述说明部署到 The Graph Studio"
}

# 运行
main
