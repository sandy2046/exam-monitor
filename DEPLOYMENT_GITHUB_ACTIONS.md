# GitHub Actions + SSH 部署指南

## 架构说明

```
GitHub (代码仓库)
  ↓ [push to main]
GitHub Actions (自动构建)
  ↓ [SSH 连接]
VPS (运行应用)
```

## 前置准备

### 1. VPS 端准备

#### 1.1 创建 SSH 密钥对（如果还没有）
```bash
# 在 VPS 上生成密钥对
ssh-keygen -t ed25519 -C "github-actions@deploy" -f ~/.ssh/github-actions-deploy

# 查看公钥内容
cat ~/.ssh/github-actions-deploy.pub
```

#### 1.2 设置公钥权限
```bash
# 将公钥添加到 authorized_keys
cat ~/.ssh/github-actions-deploy.pub >> ~/.ssh/authorized_keys

# 设置正确权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### 1.3 准备部署目录
```bash
# 创建项目目录
cd /home/sandy
git clone https://github.com/sandy2046/exam-monitor.git
cd exam-monitor

# 安装依赖
npm ci

# 构建测试
npm run build
```

#### 1.4 配置 Web 服务器（Nginx）

创建 Nginx 配置文件 `/etc/nginx/sites-available/exam-monitor`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名或 IP

    root /home/sandy/exam-monitor/dist;
    index index.html;

    # 支持 Vue Router 的 history 模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 代理（如果需要）
    # location /api/ {
    #     proxy_pass http://localhost:3000;
    # }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/exam-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. GitHub 端配置

#### 2.1 获取私钥内容
在您的本地电脑上执行：

```bash
# 查看私钥内容（完整的一行）
cat ~/.ssh/id_rsa
```

您会看到类似这样的内容：
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW...
-----END OPENSSH PRIVATE KEY-----
```

#### 2.2 添加 GitHub Secrets

1. 打开您的 GitHub 仓库：`https://github.com/sandy2046/exam-monitor`
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 逐个添加以下 Secret：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `VPS_HOST` | `123.45.67.89` | 您的 VPS IP 地址 |
| `VPS_USERNAME` | `sandy` | VPS 登录用户名 |
| `VPS_PORT` | `22` | SSH 端口（默认 22） |
| `VPS_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | **完整的私钥内容** |

**⚠️ 重要提示：**
- `VPS_SSH_PRIVATE_KEY` 必须包含完整的私钥，包括 `-----BEGIN...` 和 `-----END...` 行
- 私钥必须是单行格式（GitHub 会自动处理换行）
- 确保私钥没有密码保护（或者使用 ssh-agent）

## 部署流程

### 方式一：自动部署（推荐）

每次推送到 `main` 分支时，GitHub Actions 会自动：
1. 检出代码
2. 安装依赖
3. 运行 TypeScript 类型检查
4. 构建项目
5. 通过 SSH 连接到 VPS
6. 拉取最新代码
7. 重新安装依赖并构建
8. 更新部署

推送代码：
```bash
git add .
git commit -m "你的提交信息"
git push origin main
```

### 方式二：手动触发

1. 在 GitHub 上进入 **Actions** 标签页
2. 选择 **Deploy to VPS** 工作流
3. 点击 **Run workflow**
4. 选择分支（通常是 `main`）
5. 点击 **Run workflow** 按钮

## 高级配置

### 使用 PM2 管理进程（如果需要 Node.js 服务器）

如果您的应用需要 Node.js 服务器（而不仅仅是静态文件）：

1. 在 VPS 上安装 PM2：
```bash
npm install -g pm2
```

2. 创建 PM2 配置文件 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'exam-monitor',
    script: 'server.js',  // 如果有 Node.js 服务器
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

3. 修改 `deploy.yml` 中的部署脚本：
```yaml
- name: Deploy to VPS via SSH
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USERNAME }}
    key: ${{ secrets.VPS_SSH_PRIVATE_KEY }}
    port: ${{ secrets.VPS_PORT || '22' }}
    script: |
      cd /home/sandy/exam-monitor
      git pull origin main
      npm ci --production
      npm run build
      pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
```

### 使用 systemd 管理服务

如果使用 systemd：

1. 创建服务文件 `/etc/systemd/system/exam-monitor.service`：
```ini
[Unit]
Description=Exam Monitor Application
After=network.target

[Service]
Type=simple
User=sandy
WorkingDirectory=/home/sandy/exam-monitor
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

2. 启用服务：
```bash
sudo systemctl enable exam-monitor
sudo systemctl start exam-monitor
```

3. 修改 `deploy.yml`：
```yaml
script: |
  cd /home/sandy/exam-monitor
  git pull origin main
  npm ci --production
  npm run build
  sudo systemctl restart exam-monitor
```

## 故障排查

### 1. SSH 连接失败

**错误：** `Permission denied (publickey)`

**解决：**
```bash
# 在 VPS 上检查私钥权限
ls -la ~/.ssh/authorized_keys
# 确保是 600 权限

# 检查 SSH 服务状态
sudo systemctl status sshd

# 查看 SSH 日志
sudo tail -f /var/log/auth.log
```

### 2. GitHub Actions 权限问题

**错误：** `Resource not accessible by integration`

**解决：**
- 确保在 GitHub 仓库设置中，Actions 权限设置为 "Read and write permissions"
- 路径：Settings → Actions → General → Workflow permissions

### 3. 构建失败

**检查：**
```bash
# 查看 GitHub Actions 日志
# 进入仓库 → Actions → 点击具体的工作流运行
```

### 4. Nginx 404 错误

**解决：**
```bash
# 检查 dist 目录是否存在
ls -la /home/sandy/exam-monitor/dist

# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

## 完整部署检查清单

- [ ] VPS 上已生成 SSH 密钥对
- [ ] 公钥已添加到 `~/.ssh/authorized_keys`
- [ ] 项目目录已创建并克隆仓库
- [ ] Nginx 配置已创建并启用
- [ ] GitHub Secrets 已添加（VPS_HOST, VPS_USERNAME, VPS_SSH_PRIVATE_KEY）
- [ ] `.github/workflows/deploy.yml` 已创建
- [ ] 推送代码测试自动部署
- [ ] 验证网站可访问

## 安全建议

1. **私钥保护：**
   - 不要将私钥提交到代码仓库
   - 使用 GitHub Secrets 安全存储
   - 定期轮换密钥

2. **最小权限原则：**
   - 为部署用户创建专用账户
   - 限制 SSH 权限（使用 `command=` 限制可执行的命令）

3. **网络防护：**
   - 使用防火墙限制 SSH 访问
   - 考虑使用 VPN 或专用网络

## 下一步

完成配置后，您可以：

1. **测试自动部署：**
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "feat: 添加 GitHub Actions 部署配置"
   git push origin main
   ```

2. **查看部署日志：**
   - 在 GitHub 仓库的 **Actions** 标签页查看

3. **访问网站：**
   - 打开 `http://your-vps-ip` 或您的域名

---

**部署成功后，以后只需要：**
```bash
git add .
git commit -m "更新内容"
git push origin main
```

GitHub Actions 会自动完成所有部署工作！
