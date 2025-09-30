#!/bin/bash

# Mars Vault Mainnet Fork 本地测试
set -e

echo "🚀 启动 Mainnet Fork 本地测试环境..."

# 检查 solana-test-validator 是否可用
if ! command -v solana-test-validator &> /dev/null; then
    echo "❌ solana-test-validator 未找到"
    echo "请安装 Solana CLI 工具"
    exit 1
fi

echo "🌐 启动主网分叉的本地验证器..."

# 创建测试目录
mkdir -p ./test-ledger

# 启动主网分叉的验证器，克隆 Kamino 程序和相关账户
solana-test-validator \
    --ledger ./test-ledger \
    --reset \
    --url https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3 \
    --clone Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE \
    --clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
    --clone JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 \
    --clone 4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w \
    --bpf-program HfVhoGPsmhgv4uDCaAEjn44H6L7V6zEa17fQRpof5ySy ./target/deploy/mars.so \
    --rpc-port 8899 \
    --slots-per-epoch 32 \
    --quiet &

VALIDATOR_PID=$!
echo "✅ 验证器启动中... PID: $VALIDATOR_PID"

# 等待验证器启动
echo "⏳ 等待验证器准备就绪..."
sleep 10

# 检查验证器状态
if solana cluster-version --url http://localhost:8899 > /dev/null 2>&1; then
    echo "✅ 本地验证器已就绪!"
    echo "📋 RPC URL: http://localhost:8899"
else
    echo "❌ 验证器启动失败"
    kill $VALIDATOR_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🎯 Mainnet Fork 测试环境已启动!"
echo ""
echo "📋 可用的程序和账户:"
echo "- Kamino Program: Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE"
echo "- USDC Mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
echo "- Jupiter Program: JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
echo "- Mars Program: HfVhoGPsmhgv4uDCaAEjn44H6L7V6zEa17fQRpof5ySy"
echo "- 您的钱包: 4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w"
echo ""
echo "💡 下一步:"
echo "1. 新开一个终端窗口"
echo "2. 运行: ./test-kamino-fork.sh"
echo ""
echo "⚠️  按 Ctrl+C 停止验证器"

# 保持运行直到手动停止
trap "echo '🛑 停止验证器...'; kill $VALIDATOR_PID 2>/dev/null || true; exit 0" INT
wait $VALIDATOR_PID