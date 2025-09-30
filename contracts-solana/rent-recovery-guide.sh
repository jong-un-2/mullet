#!/bin/bash

# 程序账户管理和租金回收指南
echo "💰 Solana 程序账户租金回收指南"
echo "==============================="
echo ""

echo "📋 程序账户租金回收的完整流程:"
echo ""

echo "1️⃣ 查看程序账户状态:"
echo "solana program show <PROGRAM_ID>"
echo ""

echo "2️⃣ 查看程序账户余额:"
echo "solana account <PROGRAM_ID>"
echo ""

echo "3️⃣ 关闭程序账户并回收租金:"
echo "solana program close <PROGRAM_ID> --keypair <AUTHORITY_KEYPAIR>"
echo ""

echo "4️⃣ 将租金转移到指定地址:"
echo "solana program close <PROGRAM_ID> --recipient <RECIPIENT_ADDRESS> --keypair <AUTHORITY_KEYPAIR>"
echo ""

echo "⚠️  重要注意事项:"
echo "- 只有程序的升级权限持有者才能关闭程序"
echo "- 关闭程序会使其永久不可用"
echo "- 所有租金豁免的 SOL 都会返回"
echo "- 这个操作不可逆转"
echo ""

# 设置主网环境用于演示
echo "🌐 设置主网环境..."
solana config set --url https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3
solana config set --keypair ./phantom-wallet.json

WALLET_ADDRESS=$(solana-keygen pubkey ./phantom-wallet.json)
echo "📋 当前钱包: $WALLET_ADDRESS"

echo ""
echo "🔧 实际操作示例 (使用您的 Mars 程序):"
echo ""

# 检查是否有程序密钥对
if [ -f "./target/deploy/mars-keypair.json" ]; then
    PROGRAM_ID=$(solana-keygen pubkey ./target/deploy/mars-keypair.json)
    echo "📋 Mars 程序 ID: $PROGRAM_ID"
    
    echo "💡 要部署和关闭程序的完整流程:"
    echo ""
    echo "Step 1: 部署程序"
    echo "solana program deploy ./target/deploy/mars.so --keypair ./target/deploy/mars-keypair.json"
    echo ""
    echo "Step 2: 查看程序状态和余额"
    echo "solana program show $PROGRAM_ID"
    echo "solana account $PROGRAM_ID"
    echo ""
    echo "Step 3: 关闭程序并回收租金到您的钱包"
    echo "solana program close $PROGRAM_ID --recipient $WALLET_ADDRESS --keypair ./target/deploy/mars-keypair.json"
    echo ""
    echo "💰 预计回收金额: ~6.74 SOL (程序租金豁免)"
    
else
    echo "❌ 未找到程序密钥对文件"
    echo "请先生成程序密钥对:"
    echo "solana-keygen new --outfile ./target/deploy/mars-keypair.json"
fi

echo ""
echo "📊 租金回收收益计算:"
echo "- 部署成本: 6.74 SOL (租金豁免)"
echo "- 交易费用: ~0.005 SOL"
echo "- 回收金额: 6.74 SOL"
echo "- 净成本: 仅交易费用 (~0.005 SOL)"
echo ""

echo "🎯 总结:"
echo "部署 Solana 程序的实际成本很低，主要是暂时锁定租金。"
echo "当不再需要程序时，可以关闭并回收几乎全部的 SOL。"
echo ""

# 创建便捷的部署和关闭脚本
echo "📝 创建便捷脚本..."

cat > deploy-and-manage.sh << 'EOF'
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
EOF

chmod +x deploy-and-manage.sh

echo "✅ 创建了便捷管理脚本: deploy-and-manage.sh"
echo ""
echo "💡 使用方法:"
echo "./deploy-and-manage.sh deploy   # 部署程序"
echo "./deploy-and-manage.sh status   # 查看状态"
echo "./deploy-and-manage.sh close    # 关闭并回收租金"