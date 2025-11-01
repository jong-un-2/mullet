#!/bin/bash

# Cloudflare Pages 环境变量批量设置脚本
# 使用方法: ./set-pages-env.sh your-pages-project-name

PROJECT_NAME=${1:-mars-liquid}

echo "�� 设置 Cloudflare Pages 环境变量..."
echo "项目名称: $PROJECT_NAME"

# API Configuration
wrangler pages secret put VITE_API_ENDPOINT --project-name="$PROJECT_NAME" --env="production" <<< "https://api.marsliquidity.com"
wrangler pages secret put VITE_API_KEY --project-name="$PROJECT_NAME" --env="production" <<< "test-key"

# Privy Configuration
wrangler pages secret put VITE_PRIVY_APP_ID --project-name="$PROJECT_NAME" --env="production" <<< "cmfw7skmh00lfjx0cg4zompxp"
wrangler pages secret put VITE_PRIVY_CLIENT_ID --project-name="$PROJECT_NAME" --env="production" <<< "client-WY6QkdiKEsy279udGtAua3iZpfeTyfWwcUdsZMGpuGFS9"
wrangler pages secret put VITE_PRIVY_APP_SECRET --project-name="$PROJECT_NAME" --env="production" <<< "4vHpFatGkatR4vGPTfGrNTAz6B4u9cC1mBZRm2MxbcY2ujqQUjasS3aDkLUxz8WjkBmugn96mo4bfCGXpVU18XVu"

# Wallet Configuration
wrangler pages secret put VITE_WALLETCONNECT_PROJECT_ID --project-name="$PROJECT_NAME" --env="production" <<< "8772b8b62d811d9443e1fe15863e5f1e"

# Solana RPC Configuration (Ankr Premium)
wrangler pages secret put VITE_SOLANA_MAINNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3"
wrangler pages secret put VITE_SOLANA_MAINNET_WS --project-name="$PROJECT_NAME" --env="production" <<< "wss://rpc.ankr.com/solana/ws/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3"
wrangler pages secret put VITE_SOLANA_DEVNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://rpc.ankr.com/solana_devnet/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3"
wrangler pages secret put VITE_SOLANA_DEVNET_WS --project-name="$PROJECT_NAME" --env="production" <<< "wss://rpc.ankr.com/solana_devnet/ws/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3"

# BSC Network Configuration
wrangler pages secret put VITE_BSC_CHAIN_ID --project-name="$PROJECT_NAME" --env="production" <<< "56"
wrangler pages secret put VITE_BSC_MAINNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://bsc-mainnet.infura.io/v3/402b910bd7e24d2a866ac48ab3741e75"
wrangler pages secret put VITE_BSC_TESTNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://bsc-testnet.infura.io/v3/402b910bd7e24d2a866ac48ab3741e75"

# TRON Network Configuration (Ankr Premium)
wrangler pages secret put VITE_TRON_MAINNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3"
wrangler pages secret put VITE_TRON_SOLIDITY_NODE --project-name="$PROJECT_NAME" --env="production" <<< "https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3"
wrangler pages secret put VITE_TRON_EVENT_SERVER --project-name="$PROJECT_NAME" --env="production" <<< "https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3"

# Session Signer Configuration
wrangler pages secret put VITE_SESSION_SIGNER_ID --project-name="$PROJECT_NAME" --env="production" <<< "ggdyrnc74cd09z2j4msxe8za"

# Ethereum Configuration
wrangler pages secret put VITE_INFURA_API_KEY --project-name="$PROJECT_NAME" --env="production" <<< "your_infura_api_key_here"

echo "✅ 环境变量设置完成!"
echo "🔗 检查设置: wrangler pages deployment list --project-name=$PROJECT_NAME"

