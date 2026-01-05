#!/bin/bash

# GitHub Actions SSH 部署验证脚本

echo "================================"
echo "GitHub Actions SSH 部署验证"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 1: 检查 workflow 文件
echo "1. 检查 GitHub Actions workflow 文件..."
if [ -f ".github/workflows/deploy.yml" ]; then
    echo -e "${GREEN}✓${NC} deploy.yml 存在"
else
    echo -e "${RED}✗${NC} deploy.yml 不存在"
    echo "  请运行: npm run setup:github-actions"
    exit 1
fi

# 检查 2: 检查 Node.js 版本
echo ""
echo "2. 检查 Node.js 版本..."
NODE_VERSION=$(node -v 2>/dev/null)
if [[ "$NODE_VERSION" == v20.* ]]; then
    echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION (符合要求)"
else
    echo -e "${YELLOW}⚠${NC} Node.js $NODE_VERSION (建议使用 v20.19.6)"
    echo "  运行: nvm use 20.19.6"
fi

# 检查 3: 检查依赖安装
echo ""
echo "3. 检查依赖..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules 存在"
else
    echo -e "${YELLOW}⚠${NC} node_modules 不存在"
    echo "  运行: npm ci"
fi

# 检查 4: 检查构建
echo ""
echo "4. 检查构建..."
if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC} dist 目录存在"
    DIST_SIZE=$(du -sh dist | cut -f1)
    echo "  大小: $DIST_SIZE"
else
    echo -e "${YELLOW}⚠${NC} dist 目录不存在"
    echo "  运行: npm run build"
fi

# 检查 5: 检查 Git 状态
echo ""
echo "5. 检查 Git 状态..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Git 仓库"
    CURRENT_BRANCH=$(git branch --show-current)
    echo "  当前分支: $CURRENT_BRANCH"

    # 检查是否有未提交的更改
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠${NC} 有未提交的更改"
        echo "  建议先提交更改到 GitHub"
    else
        echo -e "${GREEN}✓${NC} 工作区干净"
    fi
else
    echo -e "${RED}✗${NC} 不是 Git 仓库"
fi

# 检查 6: 检查 GitHub 远程仓库
echo ""
echo "6. 检查 GitHub 远程仓库..."
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [[ "$REMOTE_URL" == *"sandy2046/exam-monitor"* ]]; then
    echo -e "${GREEN}✓${NC} 正确的远程仓库"
    echo "  $REMOTE_URL"
else
    echo -e "${YELLOW}⚠${NC} 远程仓库配置可能有误"
    if [ -n "$REMOTE_URL" ]; then
        echo "  当前: $REMOTE_URL"
    fi
fi

# 检查 7: 检查 GitHub Secrets（需要 gh CLI）
echo ""
echo "7. 检查 GitHub Secrets（需要 gh CLI）..."
if command -v gh &> /dev/null; then
    echo "  检测到 gh CLI，正在检查 Secrets..."

    # 检查 Secrets 是否存在（需要登录 GitHub）
    if gh auth status &> /dev/null; then
        SECRETS=$(gh secret list --repo sandy2046/exam-monitor 2>/dev/null | grep -E "VPS_HOST|VPS_USERNAME|VPS_SSH_PRIVATE_KEY")

        if echo "$SECRETS" | grep -q "VPS_HOST"; then
            echo -e "${GREEN}✓${NC} VPS_HOST 已配置"
        else
            echo -e "${RED}✗${NC} VPS_HOST 未配置"
        fi

        if echo "$SECRETS" | grep -q "VPS_USERNAME"; then
            echo -e "${GREEN}✓${NC} VPS_USERNAME 已配置"
        else
            echo -e "${RED}✗${NC} VPS_USERNAME 未配置"
        fi

        if echo "$SECRETS" | grep -q "VPS_SSH_PRIVATE_KEY"; then
            echo -e "${GREEN}✓${NC} VPS_SSH_PRIVATE_KEY 已配置"
        else
            echo -e "${RED}✗${NC} VPS_SSH_PRIVATE_KEY 未配置"
        fi
    else
        echo -e "${YELLOW}⚠${NC} 未登录 GitHub，请运行: gh auth login"
    fi
else
    echo -e "${YELLOW}⚠${NC} 未安装 gh CLI，跳过 Secrets 检查"
    echo "  手动检查: https://github.com/sandy2046/exam-monitor/settings/secrets/actions"
fi

# 检查 8: 测试 SSH 连接（如果提供了 VPS 信息）
echo ""
echo "8. SSH 连接测试..."
if [ -n "$1" ]; then
    echo "  测试连接到: $1"
    ssh -o ConnectTimeout=5 -o BatchMode=yes "$1" "echo 'SSH 连接成功！'" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} SSH 连接测试通过"
    else
        echo -e "${RED}✗${NC} SSH 连接失败"
        echo "  请检查:"
        echo "  - 私钥是否正确"
        echo "  - VPS 公钥是否已添加到 ~/.ssh/authorized_keys"
        echo "  - 防火墙是否阻止 SSH"
    fi
else
    echo "  跳过（未提供 VPS 信息）"
    echo "  用法: ./verify-deployment.sh username@vps-ip"
fi

echo ""
echo "================================"
echo "验证完成！"
echo "================================"
echo ""
echo "下一步："
echo "1. 确保所有 Secrets 已配置: https://github.com/sandy2046/exam-monitor/settings/secrets/actions"
echo "2. 提交代码: git push origin main"
echo "3. 查看部署: https://github.com/sandy2046/exam-monitor/actions"
echo ""
