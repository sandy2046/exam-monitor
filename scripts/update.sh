#!/bin/bash

# ============================================
# 更新脚本
# 用于更新已部署的项目
# ============================================

set -e

GREEN='\033[0;32m'
NC='\033[0m'

PROJECT_NAME="exam-monitor"
INSTALL_DIR="/opt/$PROJECT_NAME"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }

if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行"
    exit 1
fi

log_info "切换到项目目录: $INSTALL_DIR"
cd "$INSTALL_DIR"

log_info "拉取最新代码..."
git pull

log_info "更新依赖..."
npm ci --only=production

log_info "重新构建..."
npm run build

log_info "重启 Nginx..."
systemctl restart nginx

log_info "更新完成！"
