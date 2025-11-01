#!/bin/bash

RPC_URL="https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3"
KEYPAIR="./phantom-wallet.json"

echo "🚀 开始 Mainnet 初始化..."

# 1. 初始化全局状态
echo "📝 步骤 1: 初始化全局状态"
npm run script init -- --env mainnet --keypair $KEYPAIR --rpc "$RPC_URL"

# 2. 初始化 Vault
echo "📝 步骤 2: 初始化 Vault"
npm run script initialize-vault -- \
  --env mainnet \
  --keypair $KEYPAIR \
  --rpc "$RPC_URL" \
  -v A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK \
  -b 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -s HrDJX7DZL86K6DYvDNHPXrkkGEEoZ91tNT6o1cPLXs78 \
  -f 2500

# 3. 设置费率层级
echo "📝 步骤 3: 设置费率层级"
npm run script set-fee-tiers -- --env mainnet --keypair $KEYPAIR --rpc "$RPC_URL"

# 4. 设置协议费率
echo "📝 步骤 4: 设置协议费率"
npm run script set-protocol-fee-fraction -- \
  --env mainnet \
  --keypair $KEYPAIR \
  --rpc "$RPC_URL" \
  -n 1 \
  -d 100

# 5. 更新平台费用钱包
echo "📝 步骤 5: 更新平台费用钱包"
npm run script update-platform-fee-wallet -- \
  --env mainnet \
  --keypair $KEYPAIR \
  --rpc "$RPC_URL" \
  -w A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6

echo "✅ Mainnet 初始化完成！"
