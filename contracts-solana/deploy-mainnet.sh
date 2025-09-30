#!/bin/bash

# Mars Vault 主网部署脚本
set -e

echo "🚀 Mars Vault 主网部署开始..."

# 检查钱包文件
WALLET_PATH="./phantom-wallet.json"
if [ ! -f "$WALLET_PATH" ]; then
    echo "❌ 钱包文件不存在: $WALLET_PATH"
    exit 1
fi

echo "✅ 钱包文件检查通过"

# 设置主网环境
echo "🌐 设置 Solana 主网环境..."
solana config set --url https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3
solana config set --keypair "$WALLET_PATH"

# 显示钱包地址
echo "📋 钱包地址信息:"
WALLET_ADDRESS=$(solana-keygen pubkey phantom-wallet.json)
echo "地址: $WALLET_ADDRESS"

# 检查余额
echo "💰 检查钱包余额..."
BALANCE=$(solana balance)
echo "当前 SOL 余额: $BALANCE"

# 检查程序大小和租金需求
if [ -f "./target/deploy/mars.so" ]; then
    PROGRAM_SIZE=$(stat -f%z ./target/deploy/mars.so)
    echo "📦 程序大小: $PROGRAM_SIZE bytes"
    
    # 计算租金豁免最小余额
    RENT_EXEMPT=$(solana rent $PROGRAM_SIZE | grep "Rent-exempt minimum:" | awk '{print $3}')
    echo "💸 租金豁免需要: $RENT_EXEMPT SOL"
    
    # 加上部署费用和缓冲 (约 0.1 SOL)
    MIN_BALANCE=$(echo "$RENT_EXEMPT + 0.1" | bc -l)
    echo "💰 建议最小余额: $MIN_BALANCE SOL (包含部署费用)"
else
    echo "❌ 程序文件不存在，请先运行 anchor build"
    exit 1
fi

CURRENT_BALANCE=$(echo $BALANCE | cut -d' ' -f1)
if (( $(echo "$CURRENT_BALANCE < $MIN_BALANCE" | bc -l) )); then
    NEEDED=$(echo "$MIN_BALANCE - $CURRENT_BALANCE" | bc -l)
    echo "❌ SOL 余额不足！"
    echo "当前余额: $CURRENT_BALANCE SOL"
    echo "需要余额: $MIN_BALANCE SOL" 
    echo "还需要: $NEEDED SOL"
    echo ""
    echo "🔗 获取 SOL 的方式:"
    echo "1. 从交易所 (Coinbase, Binance) 转入 SOL 到地址: $WALLET_ADDRESS"
    echo "2. 使用 Jupiter (jup.ag) 交换其他代币为 SOL"
    echo "3. 向朋友借用或购买 SOL"
    exit 1
fi

echo "✅ SOL 余额充足，可以部署"

# 构建程序
echo "🔨 构建 Mars 程序..."
anchor build

# 生成新的程序密钥对
echo "🔑 生成程序密钥对..."
if [ ! -f "./target/deploy/mars-keypair.json" ]; then
    solana-keygen new --outfile ./target/deploy/mars-keypair.json --no-bip39-passphrase
    echo "✅ 新程序密钥对已生成"
else
    echo "✅ 程序密钥对已存在"
fi

# 获取程序 ID
PROGRAM_ID=$(solana-keygen pubkey ./target/deploy/mars-keypair.json)
echo "📋 程序 ID: $PROGRAM_ID"

# 更新 Anchor.toml 中的程序 ID
echo "📝 更新 Anchor.toml..."
sed -i.bak "s/mars = \".*\"/mars = \"$PROGRAM_ID\"/" Anchor.toml
echo "✅ Anchor.toml 已更新"

# 更新 lib.rs 中的程序 ID
echo "📝 更新 lib.rs..."
sed -i.bak "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/mars/src/lib.rs
echo "✅ lib.rs 已更新"

# 重新构建
echo "🔨 重新构建程序..."
anchor build

# 部署到主网
echo "🚀 部署到主网..."
solana program deploy ./target/deploy/mars.so --keypair ./target/deploy/mars-keypair.json

if [ $? -eq 0 ]; then
    echo "✅ 程序部署成功!"
    echo "📋 程序 ID: $PROGRAM_ID"
    echo "🌐 网络: mainnet-beta"
    
    # 生成 TypeScript 类型
    echo "📋 生成 TypeScript 类型..."
    anchor run generate-types
    
    echo "🎉 Mars Vault 已成功部署到主网!"
    echo ""
    echo "下一步: 运行存款测试"
    echo "命令: ./deposit-mainnet.sh"
else
    echo "❌ 程序部署失败"
    exit 1
fi