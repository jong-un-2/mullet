#!/bin/bash

# Mars 程序部署和管理脚本
set -e

PROGRAM_KEYPAIR="./target/deploy/mars-keypair.json"
PROGRAM_SO="./target/deploy/mars.so"
WALLET="./phantom-wallet.json"

# 获取地址
PROGRAM_ID=$(solana-keygen pubkey $PROGRAM_KEYPAIR)
WALLET_ADDRESS=$(solana-keygen pubkey $WALLET)

echo "📋 程序 ID: $PROGRAM_ID"
echo "📋 钱包地址: $WALLET_ADDRESS"

case "$1" in
    "deploy")
        echo "🚀 部署程序..."
        solana program deploy $PROGRAM_SO --keypair $PROGRAM_KEYPAIR
        echo "✅ 部署完成!"
        ;;
    "status")
        echo "📊 查看程序状态..."
        echo "程序信息:"
        solana program show $PROGRAM_ID
        echo ""
        echo "账户余额:"
        solana account $PROGRAM_ID
        ;;
    "close")
        echo "💰 关闭程序并回收租金..."
        echo "⚠️  这将永久删除程序，确认吗? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            solana program close $PROGRAM_ID --recipient $WALLET_ADDRESS --keypair $PROGRAM_KEYPAIR
            echo "✅ 程序已关闭，租金已回收到 $WALLET_ADDRESS"
        else
            echo "❌ 操作已取消"
        fi
        ;;
    *)
        echo "用法: $0 {deploy|status|close}"
        echo ""
        echo "命令:"
        echo "  deploy  - 部署程序"
        echo "  status  - 查看程序状态和余额"
        echo "  close   - 关闭程序并回收租金"
        ;;
esac
