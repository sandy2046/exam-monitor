# 部署文档

本文档提供详细的部署指南。

## 快速部署（5分钟完成）

### 在 VPS 上执行

```bash
# 1. 下载部署脚本
curl -O https://raw.githubusercontent.com/sandy2046/exam-monitor/main/deploy.sh

# 2. 赋予执行权限
chmod +x deploy.sh

# 3. 运行部署
sudo ./deploy.sh
```

### 可选参数

```bash
# 指定域名
sudo ./deploy.sh --domain exam.your-school.com

# 指定端口
sudo ./deploy.sh --port 8080

# 指定域名和端口
sudo ./deploy.sh --domain exam.your-school.com --port 80

# 查看帮助
./deploy.sh --help
```

## 手动部署步骤

### 1. 安装基础软件

```bash
sudo apt update
sudo apt install -y git nginx curl

# 安装 Node.js 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 验证
node --version  # 应该显示 v20.x.x
```

### 2. 克隆仓库

```bash
# 推荐安装到 /opt
cd /opt
git clone https://github.com/sandy2046/exam-monitor.git
cd exam-monitor
```

### 3. 安装依赖并构建

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 验证构建
ls dist
# 应该看到: index.html, assets/ 等
```

### 4. 配置 Nginx

```bash
# 使用自动配置脚本
sudo bash scripts/setup-nginx.sh

# 或手动配置
sudo nano /etc/nginx/sites-available/exam-monitor
```

**手动配置内容**：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 修改为你的域名或IP

    root /opt/exam-monitor/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

**激活配置**：

```bash
sudo ln -s /etc/nginx/sites-available/exam-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5. 配置防火墙

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp  # 如果使用 HTTPS
sudo ufw allow ssh
sudo ufw enable
```

### 6. 验证部署

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 测试访问
curl -I http://localhost

# 查看日志
sudo tail -f /var/log/nginx/exam-monitor-access.log
```

## HTTPS 配置（推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书（替换域名）
sudo certbot --nginx -d exam.your-school.com

# 自动续期
sudo systemctl enable certbot.timer
```

## 管理命令

### 更新项目

```bash
cd /opt/exam-monitor
sudo bash scripts/update.sh
```

### 备份

```bash
sudo bash scripts/backup.sh
```

### 手动更新

```bash
cd /opt/exam-monitor
git pull
npm ci --only=production
npm run build
sudo systemctl restart nginx
```

### 查看状态

```bash
# Nginx 状态
sudo systemctl status nginx

# 查看错误日志
sudo tail -f /var/log/nginx/exam-monitor-error.log

# 查看访问日志
sudo tail -f /var/log/nginx/exam-monitor-access.log
```

## 常见问题

### 端口被占用

```bash
# 查看 80 端口占用
sudo netstat -tlnp | grep :80

# 修改 Nginx 配置为其他端口，如 8080
# 然后访问 http://your-ip:8080
```

### 权限问题

```bash
# 确保目录权限正确
sudo chown -R www-data:www-data /opt/exam-monitor/dist
sudo chmod -R 755 /opt/exam-monitor/dist
```

### Node.js 版本问题

```bash
# 确保使用 Node.js 20
nvm use 20
node --version
```

## 生产环境优化

### 1. 使用 PM2（可选）

```bash
# 安装 PM2
npm install -g pm2

# 如果有后端服务
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. 配置缓存

在 Nginx 配置中添加：

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 安全加固

```bash
# 隐藏 Nginx 版本
sudo nano /etc/nginx/nginx.conf
# 添加: server_tokens off;

# 重启
sudo systemctl restart nginx
```

## 监控

### 系统监控

```bash
# 查看资源使用
htop

# 查看网络连接
ss -tunlp | grep nginx

# 查看磁盘空间
df -h
```

### 应用监控

```bash
# 检查应用是否响应
curl -s http://localhost | head -20

# 检查 Nginx 进程
ps aux | grep nginx
```

## 回滚

如果部署失败，可以快速回滚：

```bash
# 删除新配置
sudo rm -f /etc/nginx/sites-enabled/exam-monitor
sudo rm -f /etc/nginx/sites-available/exam-monitor

# 恢复默认配置（如果有）
sudo systemctl restart nginx

# 删除项目
sudo rm -rf /opt/exam-monitor
```

## 技术支持

- GitHub Issues: https://github.com/sandy2046/exam-monitor/issues
- 文档: 查看项目 README.md 和 TEMPLATE_GUIDE.md
