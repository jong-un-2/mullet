#!/bin/bash

# Solana 租金豁免机制说明
echo "📋 Solana 租金豁免机制详解"
echo "================================"
echo ""

echo "🏦 租金豁免 SOL 的特点:"
echo ""
echo "✅ 不会被消耗掉:"
echo "   - 6.74 SOL 会存储在程序账户中"
echo "   - 这些 SOL 作为账户的余额保持存在"
echo "   - 只要账户存在，SOL 就在那里"
echo ""

echo "💰 可以回收:"
echo "   - 程序所有者可以关闭程序账户"
echo "   - 关闭时，租金豁免的 SOL 会返回"
echo "   - 使用命令: solana program close <PROGRAM_ID>"
echo ""

echo "🔄 租金豁免的作用:"
echo "   - 防止账户因余额不足被删除"
echo "   - 确保程序永久存在于链上"
echo "   - 类似于押金，而不是手续费"
echo ""

echo "📊 成本分析:"
echo "   实际成本 = 部署交易费 (约 0.005 SOL)"
echo "   租金豁免 = 可回收的押金 (6.74 SOL)"
echo "   总需要 = 6.745 SOL (其中 6.74 可回收)"
echo ""

echo "💡 实际操作建议:"
echo "1. 部署需要: 6.84 SOL"
echo "2. 实际消耗: ~0.005-0.1 SOL (交易费)"
echo "3. 可回收: 6.74 SOL (如果删除程序)"
echo ""

echo "🎯 因此实际成本很低，主要是需要暂时锁定 6.74 SOL"

# 检查当前程序账户示例
echo ""
echo "🔍 检查现有程序账户余额示例:"
echo "(以 System Program 为例)"

# 设置主网环境
solana config set --url https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3 > /dev/null 2>&1

# 查看系统程序账户
echo ""
echo "📋 System Program 账户信息:"
solana account 11111111111111111111111111111111 | head -5

echo ""
echo "💰 结论: 租金豁免的 SOL 保存在账户中，可以回收"