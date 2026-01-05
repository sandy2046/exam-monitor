#!/bin/bash

# ============================================
# Nginx 配置生成脚本
# 用于快速配置考试流程提醒助手的 Nginx
# ============================================

set -e

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_NAME="exam-monitor"
INSTALL_DIR="/opt/$PROJECT_NAME"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 获取用户输入
read -p "请输入域名或服务器IP (留空则自动检测): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")
    log_warn "未指定域名，使用: $DOMAIN"
fi

read -p "请输入端口 (默认 80): " PORT
PORT=${PORT:-80}

read -p "请输入项目安装路径 (默认 $INSTALL_DIR): " CUSTOM_DIR
INSTALL_DIR=${CUSTOM_DIR:-$INSTALL_DIR}

# 检查路径是否存在
if [ ! -d "$INSTALL_DIR/dist" ]; then
    echo "错误: $INSTALL_DIR/dist 不存在，请先构建项目"
    exit 1
fi

# 生成 Nginx 配置
NGINX_CONFIG="/etc/nginx/sites-available/$PROJECT_NAME"

log_info "生成 Nginx 配置文件..."

sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
# $PROJECT_NAME - 考试流程提醒助手
# 生成时间: $(date)

server {
    listen $PORT;
    server_name $DOMAIN;

    root $INSTALL_DIR/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        font/svg+xml;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志
    access_log /var/log/nginx/$PROJECT_NAME-access.log;
    error_log /var/log/nginx/$PROJECT_NAME-error.log;
}
EOF

# 激活配置
log_info "激活配置..."
sudo ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$PROJECT_NAME"

# 移除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
log_info "测试 Nginx 配置..."
if sudo nginx -t; then
    log_info "配置测试通过"
else
    echo "错误: Nginx 配置测试失败"
    exit 1
fi

# 重启 Nginx
log_info "重启 Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

log_info "完成！访问 http://$DOMAIN:$PORT"
