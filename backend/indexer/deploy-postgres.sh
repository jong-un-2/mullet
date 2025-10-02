#!/bin/bash

# ============================================================
# Mars Vaults V8 - 部署到 PostgreSQL 数据库
# ============================================================

set -e

PACKAGE_FILE="mars-vaults-substreams-graph-v1.0.0.spkg"

echo "🚀 部署 Mars Vaults V8 到 PostgreSQL"
echo "===================================="
echo ""

# 检查包文件
if [ ! -f "$PACKAGE_FILE" ]; then
    echo "❌ 错误: 找不到包文件 $PACKAGE_FILE"
    exit 1
fi

# 检查环境变量
if [ ! -f ".env.substreams" ]; then
    echo "❌ 错误: .env.substreams 文件不存在"
    exit 1
fi

source .env.substreams

echo "📦 包文件: $PACKAGE_FILE"
echo "🔗 数据库: $DATABASE_URL"
echo "🌐 Endpoint: $SUBSTREAMS_ENDPOINT"
echo ""

# 检查 sink 是否安装
if ! command -v substreams-sink-postgres &> /dev/null; then
    echo "⚠️  substreams-sink-postgres 未安装"
    echo ""
    echo "安装方法:"
    echo "  1. 下载最新版本:"
    echo "     https://github.com/streamingfast/substreams-sink-postgres/releases"
    echo ""
    echo "  2. 或使用 cargo 安装:"
    echo "     cargo install substreams-sink-postgres"
    echo ""
    read -p "继续使用直接运行? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 启动 Substreams Sink..."
echo ""

# 运行 sink
substreams-sink-postgres run \
  "$DATABASE_URL" \
  "$PACKAGE_FILE" \
  --endpoint="$SUBSTREAMS_ENDPOINT" \
  --plaintext=false \
  --final-blocks-only \
  --on-module-hash-mistmatch=warn \
  --undo-buffer-size=12 \
  graph_out

echo ""
echo "✅ Sink 运行完成"
