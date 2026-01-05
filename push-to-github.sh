#!/bin/bash

# 推送到 GitHub 的脚本
# 用法: ./push-to-github.sh

REPO="sandy2046/exam-monitor"

echo "正在推送代码到 GitHub..."
echo "提示: 如果需要认证，请输入 GitHub Personal Access Token"
echo ""

# 推送
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ 推送成功！"
    echo "访问: https://github.com/${REPO}"
else
    echo "❌ 推送失败"
    echo ""
    echo "解决方法:"
    echo "1. 配置 token: git remote set-url origin https://YOUR_TOKEN@github.com/${REPO}.git"
    echo "2. 或使用: gh auth login"
    echo "3. 或手动推送: git push"
fi
