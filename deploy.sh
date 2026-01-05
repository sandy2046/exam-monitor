#!/bin/bash

# ============================================
# 考试流程提醒助手 - 一键部署脚本
# 适用于 Ubuntu 20.04+ / Debian 10+
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量（可修改）
PROJECT_NAME="exam-monitor"
GITHUB_REPO="https://github.com/sandy2046/exam-monitor.git"
DOMAIN=""  # 留空则使用服务器IP
INSTALL_DIR="/opt/$PROJECT_NAME"
NGINX_PORT=80

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 用户或 sudo 运行此脚本"
        exit 1
    fi
}

# 检查系统版本
check_os() {
    if ! command -v lsb_release &> /dev/null; then
        apt-get update && apt-get install -y lsb-release
    fi

    OS=$(lsb_release -is)
    VERSION=$(lsb_release -rs)

    if [ "$OS" != "Ubuntu" ] && [ "$OS" != "Debian" ]; then
        log_error "此脚本仅支持 Ubuntu 和 Debian 系统"
        exit 1
    fi

    log_info "检测到系统: $OS $VERSION"
}

# 安装必要软件
install_dependencies() {
    log_info "更新系统包..."
    apt-get update
    apt-get upgrade -y

    log_info "安装 Git..."
    apt-get install -y git

    log_info "安装 Nginx..."
    apt-get install -y nginx

    log_info "安装 Node.js 和 NPM (使用 NVM)..."
    if ! command -v nvm &> /dev/null; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # 加载 NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    # 安装 Node.js 20
    if ! command -v node &> /dev/null || [[ ! $(node --version) =~ ^v20 ]]; then
        nvm install 20
        nvm use 20
    fi

    log_info "安装 PM2 (进程管理器)..."
    npm install -g pm2

    log_info "安装 UFW (防火墙)..."
    apt-get install -y ufw
}

# 克隆仓库
clone_repo() {
    log_info "克隆 GitHub 仓库到 $INSTALL_DIR..."

    if [ -d "$INSTALL_DIR" ]; then
        log_warn "目录 $INSTALL_DIR 已存在，正在删除旧版本..."
        rm -rf "$INSTALL_DIR"
    fi

    # 使用 token 克隆（如果提供了）
    if [ -n "$GITHUB_TOKEN" ]; then
        REPO_URL="https://${GITHUB_TOKEN}@github.com/sandy2046/exam-monitor.git"
    else
        REPO_URL="$GITHUB_REPO"
    fi

    git clone "$REPO_URL" "$INSTALL_DIR"

    log_info "仓库克隆完成"
}

# 安装项目依赖
install_project_deps() {
    log_info "安装项目依赖..."
    cd "$INSTALL_DIR"

    # 安装所有依赖（包括构建需要的 devDependencies）
    log_info "安装所有依赖（包括构建工具）..."
    npm install

    log_info "依赖安装完成"
}

# 构建项目
build_project() {
    log_info "构建生产版本..."
    cd "$INSTALL_DIR"

    # 检查并安装 devDependencies（构建需要）
    if [ ! -d "node_modules" ]; then
        log_warn "node_modules 不存在，重新安装依赖..."
        npm install
    fi

    # 检查 npm-run-all2 是否安装
    if [ ! -d "node_modules/npm-run-all2" ]; then
        log_warn "npm-run-all2 未安装，正在安装..."
        npm install --save-dev npm-run-all2
    fi

    # 尝试构建
    if npm run build; then
        if [ ! -d "dist" ]; then
            log_error "构建失败：dist 目录不存在"
            exit 1
        fi
        log_info "构建完成"
    else
        log_warn "标准构建失败，尝试直接构建..."
        npm run build-only
        if [ -d "dist" ]; then
            log_info "构建完成（使用 build-only）"
        else
            log_error "构建失败"
            exit 1
        fi
    fi
}

# 配置 Nginx
setup_nginx() {
    log_info "配置 Nginx..."

    # 确定域名或IP
    if [ -z "$DOMAIN" ]; then
        DOMAIN=$(curl -s ifconfig.me)
        log_warn "未指定域名，使用服务器IP: $DOMAIN"
    fi

    # 创建 Nginx 配置
    NGINX_CONFIG="/etc/nginx/sites-available/$PROJECT_NAME"

    cat > "$NGINX_CONFIG" <<EOF
# $PROJECT_NAME - 考试流程提醒助手
# Generated: $(date)

server {
    listen $NGINX_PORT;
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
    ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$PROJECT_NAME"

    # 移除默认配置（如果存在）
    rm -f /etc/nginx/sites-enabled/default

    # 测试配置
    if nginx -t; then
        log_info "Nginx 配置测试通过"
    else
        log_error "Nginx 配置测试失败"
        exit 1
    fi

    # 重启 Nginx
    systemctl restart nginx
    systemctl enable nginx

    log_info "Nginx 配置完成并已重启"
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."

    # 启用 UFW（如果未启用）
    if ! ufw status | grep -q "Status: active"; then
        log_warn "UFW 未启用，正在启用..."

        # 允许 SSH（重要！）
        ufw allow ssh

        # 允许 HTTP/HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp

        # 启用防火墙
        echo "y" | ufw enable
    fi

    log_info "防火墙配置完成"
}

# 配置 PM2（可选，用于 Node.js 服务）
setup_pm2() {
    log_info "配置 PM2..."

    cd "$INSTALL_DIR"

    # 检查是否有 server 目录（如果有后端服务）
    if [ -d "server" ]; then
        pm2 start ecosystem.config.js --name "$PROJECT_NAME" 2>/dev/null || \
        pm2 start server/index.js --name "$PROJECT_NAME"

        pm2 save
        pm2 startup

        log_info "PM2 服务已启动"
    else
        log_info "无后端服务，跳过 PM2 配置"
    fi
}

# 设置开机自启
setup_autostart() {
    log_info "配置开机自启..."

    # 创建 systemd 服务（用于维护脚本）
    cat > /etc/systemd/system/$PROJECT_NAME.service <<EOF
[Unit]
Description=$PROJECT_NAME - 考试流程提醒助手
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/true

[Install]
WantedBy=multi-user.target
EOF

    systemctl enable $PROJECT_NAME

    log_info "开机自启配置完成"
}

# 显示部署信息
show_summary() {
    echo
    echo "=========================================="
    echo "  部署完成！"
    echo "=========================================="
    echo
    echo "项目信息:"
    echo "  名称: $PROJECT_NAME"
    echo "  路径: $INSTALL_DIR"
    echo "  域名/IP: $DOMAIN"
    echo "  端口: $NGINX_PORT"
    echo "  访问地址: http://$DOMAIN"
    echo
    echo "常用命令:"
    echo "  查看状态: systemctl status nginx"
    echo "  重启 Nginx: systemctl restart nginx"
    echo "  查看日志: tail -f /var/log/nginx/$PROJECT_NAME-access.log"
    echo "  更新代码: cd $INSTALL_DIR && git pull && npm run build && systemctl restart nginx"
    echo
    echo "=========================================="
}

# 主函数
main() {
    echo "=========================================="
    echo "  考试流程提醒助手 - 部署脚本"
    echo "=========================================="
    echo

    # 检查参数
    if [ "$1" == "--token" ] && [ -n "$2" ]; then
        GITHUB_TOKEN="$2"
        log_info "使用 GitHub Token 进行认证"
    fi

    if [ "$1" == "--domain" ] && [ -n "$2" ]; then
        DOMAIN="$2"
        log_info "使用自定义域名: $DOMAIN"
    fi

    if [ "$1" == "--port" ] && [ -n "$2" ]; then
        NGINX_PORT="$2"
        log_info "使用自定义端口: $NGINX_PORT"
    fi

    if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
        echo "用法: $0 [选项]"
        echo
        echo "选项:"
        echo "  --token <token>     提供 GitHub Token 用于私有仓库"
        echo "  --domain <domain>   指定域名（默认使用服务器IP）"
        echo "  --port <port>       指定端口（默认 80）"
        echo "  --help, -h          显示此帮助信息"
        echo
        echo "示例:"
        echo "  $0"
        echo "  $0 --token ghp_xxx --domain exam.example.com --port 8080"
        exit 0
    fi

    # 执行部署步骤
    check_root
    check_os
    install_dependencies
    clone_repo
    install_project_deps
    build_project
    setup_nginx
    setup_firewall
    setup_pm2
    setup_autostart
    show_summary
}

# 运行主函数
main "$@"
