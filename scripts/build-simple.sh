#!/bin/bash

# 简化的构建脚本
# 用于解决 npm-run-all2 问题

set -e

echo "=== 简化构建脚本 ==="

# 进入项目目录
cd /opt/exam-monitor

# 确保依赖完整
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

if [ ! -d "node_modules/npm-run-all2" ]; then
    echo "安装 npm-run-all2..."
    npm install --save-dev npm-run-all2
fi

# 方法 1: 直接运行 type-check 和 build-only
echo "运行类型检查..."
npm run type-check

echo "构建项目..."
npm run build-only

# 验证
if [ -d "dist" ]; then
    echo "✅ 构建成功！"
    ls -lh dist/
else
    echo "❌ 构建失败"
    exit 1
fi
