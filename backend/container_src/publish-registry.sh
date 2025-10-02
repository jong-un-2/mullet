#!/bin/bash

# ============================================================
# Mars Vaults V8 - 发布到 Substreams Registry
# ============================================================

set -e

PACKAGE_FILE="mars-vaults-substreams-graph-v1.0.0.spkg"

echo "🚀 发布 Mars Vaults V8 到 Substreams Registry"
echo "=============================================="
echo ""

# 检查包文件
if [ ! -f "$PACKAGE_FILE" ]; then
    echo "❌ 错误: 找不到包文件 $PACKAGE_FILE"
    exit 1
fi

PKG_SIZE=$(du -h $PACKAGE_FILE | cut -f1)
echo "✅ 找到部署包: $PACKAGE_FILE ($PKG_SIZE)"
echo ""

# 检查登录状态
echo "🔐 检查 StreamingFast 登录状态..."
if ! substreams auth whoami &> /dev/null; then
    echo "⚠️  未登录 StreamingFast"
    echo ""
    echo "请先登录:"
    echo "  substreams auth login"
    echo ""
    read -p "现在登录? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        substreams auth login
    else
        exit 1
    fi
fi

echo ""
echo "📤 发布到 Substreams Registry..."
substreams registry publish substreams-graph.yaml

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 发布成功！"
    echo ""
    echo "📦 你的 Substreams 现在可以被其他人使用:"
    echo "   substreams run spkg://your-org/mars-vaults-v8-v1.0.0"
    echo ""
    echo "🔍 查看已发布的包:"
    echo "   substreams registry list"
else
    echo ""
    echo "❌ 发布失败"
    exit 1
fi
