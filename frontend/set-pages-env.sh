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
wrangler pages secret put VITE_WALLETCONNECT_PROJECT_ID --project-name="$PROJECT_NAME" --env="production" <<< "09c1182f7b2cb58c98f0b8ed1f223d91"

# Solana RPC Configuration
wrangler pages secret put VITE_SOLANA_MAINNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3"
wrangler pages secret put VITE_SOLANA_MAINNET_WS --project-name="$PROJECT_NAME" --env="production" <<< "wss://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3"
wrangler pages secret put VITE_SOLANA_DEVNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://devnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3"
wrangler pages secret put VITE_SOLANA_DEVNET_WS --project-name="$PROJECT_NAME" --env="production" <<< "wss://devnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3"

# BSC Network Configuration
wrangler pages secret put VITE_BSC_CHAIN_ID --project-name="$PROJECT_NAME" --env="production" <<< "56"
wrangler pages secret put VITE_BSC_MAINNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://bsc-mainnet.infura.io/v3/402b910bd7e24d2a866ac48ab3741e75"
wrangler pages secret put VITE_BSC_TESTNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://bsc-testnet.infura.io/v3/402b910bd7e24d2a866ac48ab3741e75"

# TRON Network Configuration
wrangler pages secret put VITE_TRON_MAINNET_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://api.trongrid.io"
wrangler pages secret put VITE_TRON_SOLIDITY_NODE --project-name="$PROJECT_NAME" --env="production" <<< "https://api.trongrid.io"
wrangler pages secret put VITE_TRON_EVENT_SERVER --project-name="$PROJECT_NAME" --env="production" <<< "https://api.trongrid.io"
wrangler pages secret put VITE_TRONGRID_API_KEY --project-name="$PROJECT_NAME" --env="production" <<< "7bcda08c-dc0e-4aec-9645-d153d5ea258d"
wrangler pages secret put VITE_TRON_NILE_RPC --project-name="$PROJECT_NAME" --env="production" <<< "https://nile.trongrid.io"
wrangler pages secret put VITE_TRON_NILE_SOLIDITY --project-name="$PROJECT_NAME" --env="production" <<< "https://nile.trongrid.io"
wrangler pages secret put VITE_TRON_NILE_EVENT --project-name="$PROJECT_NAME" --env="production" <<< "https://nile.trongrid.io"

# Ethereum Configuration
wrangler pages secret put VITE_INFURA_API_KEY --project-name="$PROJECT_NAME" --env="production" <<< "your_infura_api_key_here"

echo "✅ 环境变量设置完成!"
echo "🔗 检查设置: wrangler pages deployment list --project-name=$PROJECT_NAME"

