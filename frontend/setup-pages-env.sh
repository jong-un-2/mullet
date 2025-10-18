#!/bin/bash

# 快速设置 Cloudflare Pages 环境变量
# 使用方法: ./setup-pages-env.sh [project-name] [environment]

PROJECT_NAME=${1:-"mars-liquid"}
ENV=${2:-"production"}

echo "🚀 设置 Cloudflare Pages 环境变量..."
echo "项目: $PROJECT_NAME"
echo "环境: $ENV"
echo ""

# 检查 JSON 配置文件
if [ ! -f "cloudflare-pages-env.json" ]; then
    echo "❌ 找不到 cloudflare-pages-env.json 配置文件"
    exit 1
fi

# 使用 jq 读取配置并设置环境变量
if command -v jq &> /dev/null; then
    echo "📝 使用 jq 批量设置环境变量..."
    
    # 读取对应环境的配置
    jq -r ".$ENV | to_entries[] | \"\(.key)=\(.value)\"" cloudflare-pages-env.json | while read -r line; do
        if [[ $line == *"="* ]]; then
            KEY=$(echo "$line" | cut -d= -f1)
            VALUE=$(echo "$line" | cut -d= -f2-)
            
            echo "设置: $KEY"
            echo "$VALUE" | wrangler pages secret put "$KEY" --project-name="$PROJECT_NAME" --env="$ENV"
        fi
    done
else
    echo "⚠️  未找到 jq 命令，使用手动设置..."
    
    # 手动设置每个环境变量
    case $ENV in
        "production")
            echo "VITE_API_ENDPOINT" | wrangler pages secret put VITE_API_ENDPOINT --project-name="$PROJECT_NAME" --env="$ENV" <<< "https://api.marsliquidity.com"
            echo "VITE_API_KEY" | wrangler pages secret put VITE_API_KEY --project-name="$PROJECT_NAME" --env="$ENV" <<< "test-key"
            # ... 其他变量
            ;;
        "preview")
            echo "VITE_API_ENDPOINT" | wrangler pages secret put VITE_API_ENDPOINT --project-name="$PROJECT_NAME" --env="$ENV" <<< "https://api.marsliquidity.com"
            # ... 其他变量
            ;;
    esac
fi

echo ""
echo "✅ 环境变量设置完成!"
echo "🔗 检查设置: wrangler pages project list"
echo "🔗 查看变量: wrangler pages secret list --project-name=$PROJECT_NAME --env=$ENV"