#!/bin/bash

# ============================================
# 备份脚本
# 备份项目配置和数据
# ============================================

set -e

GREEN='\033[0;32m'
NC='\033[0m'

PROJECT_NAME="exam-monitor"
INSTALL_DIR="/opt/$PROJECT_NAME"
BACKUP_DIR="/opt/backups/$PROJECT_NAME"
DATE=$(date +%Y%m%d_%H%M%S)

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }

if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行"
    exit 1
fi

log_info "创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

log_info "备份 Nginx 配置..."
cp /etc/nginx/sites-available/$PROJECT_NAME "$BACKUP_DIR/nginx.conf.$DATE"

log_info "备份项目文件..."
tar -czf "$BACKUP_DIR/project.$DATE.tar.gz" -C /opt "$PROJECT_NAME" 2>/dev/null

log_info "备份完成！"
log_info "备份位置: $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -5
