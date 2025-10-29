#!/bin/bash

# 创建平台费用 ATA 的管理脚本
# =====================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  创建平台费用 ATA${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 配置
PLATFORM_FEE_WALLET="${PLATFORM_FEE_WALLET:-}"
NETWORK="${NETWORK:-mainnet-beta}"

# 常见奖励代币列表（根据实际情况修改）
REWARD_TOKENS=(
  "JITOSOL:J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"
  "USDC:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  "SOL:So11111111111111111111111111111111111111112"
  # 添加更多奖励代币...
)

# 检查参数
if [ -z "$PLATFORM_FEE_WALLET" ]; then
  echo -e "${RED}错误: 需要设置 PLATFORM_FEE_WALLET 环境变量${NC}"
  echo ""
  echo "用法:"
  echo "  export PLATFORM_FEE_WALLET=YOUR_WALLET_ADDRESS"
  echo "  ./create-platform-fee-atas.sh"
  echo ""
  exit 1
fi

echo -e "${GREEN}配置信息:${NC}"
echo "  网络: $NETWORK"
echo "  平台费用钱包: $PLATFORM_FEE_WALLET"
echo ""

# 设置 Solana 配置
echo -e "${YELLOW}设置 Solana 配置...${NC}"
solana config set --url $NETWORK

echo ""
echo -e "${YELLOW}开始创建 ATA...${NC}"
echo ""

# 为每个代币创建 ATA
SUCCESS_COUNT=0
SKIP_COUNT=0
ERROR_COUNT=0

for TOKEN_INFO in "${REWARD_TOKENS[@]}"; do
  IFS=':' read -r TOKEN_NAME TOKEN_MINT <<< "$TOKEN_INFO"
  
  echo -e "${BLUE}处理 $TOKEN_NAME${NC}"
  echo "  Mint: $TOKEN_MINT"
  
  # 检查 ATA 是否已存在
  ATA=$(spl-token address --token $TOKEN_MINT --owner $PLATFORM_FEE_WALLET 2>/dev/null || echo "")
  
  if [ -n "$ATA" ]; then
    # 检查账户是否存在
    if solana account $ATA >/dev/null 2>&1; then
      echo -e "  ${GREEN}✅ ATA 已存在: $ATA${NC}"
      ((SKIP_COUNT++))
    else
      echo -e "  ${YELLOW}创建 ATA...${NC}"
      if spl-token create-account $TOKEN_MINT --owner $PLATFORM_FEE_WALLET; then
        echo -e "  ${GREEN}✅ 创建成功: $ATA${NC}"
        ((SUCCESS_COUNT++))
      else
        echo -e "  ${RED}❌ 创建失败${NC}"
        ((ERROR_COUNT++))
      fi
    fi
  else
    echo -e "  ${YELLOW}创建 ATA...${NC}"
    if spl-token create-account $TOKEN_MINT --owner $PLATFORM_FEE_WALLET; then
      NEW_ATA=$(spl-token address --token $TOKEN_MINT --owner $PLATFORM_FEE_WALLET)
      echo -e "  ${GREEN}✅ 创建成功: $NEW_ATA${NC}"
      ((SUCCESS_COUNT++))
    else
      echo -e "  ${RED}❌ 创建失败${NC}"
      ((ERROR_COUNT++))
    fi
  fi
  
  echo ""
done

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✅ 新建: $SUCCESS_COUNT${NC}"
echo -e "${YELLOW}⏭️  跳过: $SKIP_COUNT${NC}"
if [ $ERROR_COUNT -gt 0 ]; then
  echo -e "${RED}❌ 失败: $ERROR_COUNT${NC}"
fi
echo ""

# 验证结果
echo -e "${YELLOW}验证所有 ATA...${NC}"
echo ""

for TOKEN_INFO in "${REWARD_TOKENS[@]}"; do
  IFS=':' read -r TOKEN_NAME TOKEN_MINT <<< "$TOKEN_INFO"
  ATA=$(spl-token address --token $TOKEN_MINT --owner $PLATFORM_FEE_WALLET 2>/dev/null || echo "NOT_FOUND")
  
  if [ "$ATA" != "NOT_FOUND" ] && solana account $ATA >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} $TOKEN_NAME: $ATA"
  else
    echo -e "${RED}❌${NC} $TOKEN_NAME: ATA 不存在或创建失败"
  fi
done

echo ""
echo -e "${GREEN}所有操作完成！${NC}"
