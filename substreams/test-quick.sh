#!/bin/bash

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Mars V8 Substreams 快速测试${NC}"
echo "================================"
echo ""

# 加载环境变量
if [ -f .env.substreams ]; then
    source .env.substreams
    echo -e "${GREEN}✓ 环境变量已加载${NC}"
else
    echo -e "${RED}✗ 找不到 .env.substreams 文件${NC}"
    exit 1
fi

# 检查必需变量
if [ -z "$SUBSTREAMS_JWT_TOKEN" ]; then
    echo -e "${RED}✗ SUBSTREAMS_JWT_TOKEN 未设置${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API Token 已配置${NC}"
echo ""

# 测试 1: 构建 WASM
echo -e "${YELLOW}📦 测试 1: 构建 WASM 模块${NC}"
echo "----------------------------"
cargo build --target wasm32-unknown-unknown --release 2>&1 | tail -3
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    WASM_SIZE=$(ls -lh target/wasm32-unknown-unknown/release/mars_vaults_substreams.wasm | awk '{print $5}')
    echo -e "${GREEN}✓ WASM 编译成功: $WASM_SIZE${NC}"
else
    echo -e "${RED}✗ WASM 编译失败${NC}"
    exit 1
fi
echo ""

# 测试 2: map_blocks 模块
echo -e "${YELLOW}📦 测试 2: map_blocks 模块${NC}"
echo "----------------------------"
echo "测试区块: 370000000"
substreams run \
  -e $SUBSTREAMS_ENDPOINT \
  --plaintext=false \
  -H "Authorization: Bearer $SUBSTREAMS_JWT_TOKEN" \
  substreams.yaml \
  map_blocks \
  -s 370000000 \
  -t +1 2>&1 | grep -E "(BLOCK|Usage)"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✓ map_blocks 测试成功${NC}"
else
    echo -e "${RED}✗ map_blocks 测试失败${NC}"
    exit 1
fi
echo ""

# 测试 3: map_vault_events 模块
echo -e "${YELLOW}🔍 测试 3: map_vault_events 模块${NC}"
echo "----------------------------"
echo "测试区块范围: 370000000-370000010"
substreams run \
  -e $SUBSTREAMS_ENDPOINT \
  --plaintext=false \
  -H "Authorization: Bearer $SUBSTREAMS_JWT_TOKEN" \
  substreams.yaml \
  map_vault_events \
  -s 370000000 \
  -t +10 2>&1 | grep -E "(BLOCK|Usage|events)"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✓ map_vault_events 测试成功${NC}"
else
    echo -e "${RED}✗ map_vault_events 测试失败${NC}"
    exit 1
fi
echo ""

# 测试 4: db_out 模块
echo -e "${YELLOW}💾 测试 4: db_out 模块 (数据库变更)${NC}"
echo "----------------------------"
echo "测试区块范围: 370000000-370000010"
substreams run \
  -e $SUBSTREAMS_ENDPOINT \
  --plaintext=false \
  -H "Authorization: Bearer $SUBSTREAMS_JWT_TOKEN" \
  substreams.yaml \
  db_out \
  -s 370000000 \
  -t +10 2>&1 | grep -E "(BLOCK|Usage|table_changes)"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✓ db_out 测试成功${NC}"
else
    echo -e "${RED}✗ db_out 测试失败${NC}"
    exit 1
fi
echo ""

# 总结
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ 所有测试通过！                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 测试总结:${NC}"
echo "  ✓ WASM 编译成功 ($WASM_SIZE)"
echo "  ✓ map_blocks 模块正常"
echo "  ✓ map_vault_events 模块正常"
echo "  ✓ db_out 模块正常"
echo ""
echo -e "${YELLOW}🚀 下一步:${NC}"
echo "  1. 部署 PostgreSQL Sink:"
echo "     ./deploy-production.sh postgres"
echo ""
echo "  2. 或使用 Docker 部署:"
echo "     ./deploy-production.sh docker"
echo ""
