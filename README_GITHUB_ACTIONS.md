# GitHub Actions SSH 部署 - 完整指南

## 🎯 5 分钟配置，永久自动部署

---

## 📋 概览

### 部署架构
```
您的本地电脑
    ↓ git push
GitHub 仓库
    ↓ 触发 Actions
GitHub Actions (云端)
    ↓ SSH 连接
您的 VPS
    ↓ 自动构建 & 部署
网站上线！
```

### 自动化流程
每次推送代码到 `main` 分支时：
1. ✅ 检出代码
2. ✅ 安装依赖
3. ✅ TypeScript 类型检查
4. ✅ 构建项目
5. ✅ SSH 连接到 VPS
6. ✅ 拉取最新代码
7. ✅ 重新构建
8. ✅ 部署完成

---

## 🚀 快速开始（3 步）

### 第 1 步：添加 Secrets（2 分钟）

访问：`https://github.com/sandy2046/exam-monitor/settings/secrets/actions`

| Secret 名称 | 填写内容 |
|------------|---------|
| `VPS_HOST` | 您的 VPS IP（如：`123.45.67.89`） |
| `VPS_USERNAME` | VPS 用户名（如：`sandy`） |
| `VPS_SSH_PRIVATE_KEY` | **完整私钥**（见下方说明） |
| `VPS_PORT` | `22`（可选） |

**如何获取私钥：**
```bash
# 在您的本地电脑执行
cat ~/.ssh/id_rsa
```
复制完整输出（包括 `-----BEGIN...` 和 `-----END...`）

---

### 第 2 步：创建 Workflow 文件（1 分钟）

访问：`https://github.com/sandy2046/exam-monitor/new/main/.github/workflows`

**文件名：** `.github/workflows/deploy.yml`

**内容：** 复制下方代码块

<details>
<summary>点击展开完整 YAML 配置</summary>

```yaml
name: Deploy to VPS

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.19.6'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript type check
        run: npm run type-check

      - name: Build project
        run: npm run build

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
            echo "部署完成！"
```

</details>

点击 **Commit new file**

---

### 第 3 步：测试部署（1 分钟）

**访问 Actions 页面：**
```
https://github.com/sandy2046/exam-monitor/actions
```

**手动触发部署：**
1. 点击 **Deploy to VPS**
2. 点击 **Run workflow**
3. 选择 `main` 分支
4. 点击 **Run workflow** 按钮

**等待 1-2 分钟**，看到绿色对勾 ✅

---

## 🎉 部署成功！

访问您的网站：`http://您的VPS_IP`

---

## 📚 文档导航

| 文档 | 用途 |
|------|------|
| **NEXT_STEPS.md** | **从这里开始！** 详细步骤 |
| **GITHUB_WEB_SETUP.md** | 网页端配置完整指南 |
| **QUICK_START_GITHUB_ACTIONS.md** | 快速参考卡片 |
| **DEPLOYMENT_GITHUB_ACTIONS.md** | 技术细节和高级配置 |
| **GITHUB_SECRETS_SETUP.md** | Secrets 配置说明 |

---

## 🔧 VPS 前置要求

在使用 GitHub Actions 前，确保 VPS 已配置：

### 1. SSH 公钥配置
```bash
# 在 VPS 上执行
cat ~/.ssh/authorized_keys
# 确保包含您的公钥
```

### 2. 项目目录
```bash
cd /home/sandy
git clone https://github.com/sandy2046/exam-monitor.git
cd exam-monitor
npm ci
```

### 3. Nginx 配置（静态文件服务）
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /home/sandy/exam-monitor/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🛠️ 高级配置

### 使用 PM2（Node.js 服务器）
```yaml
# 在 deploy.yml 的 script 部分添加
npm ci --production
npm run build
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
```

### 使用 systemd
```yaml
# 在 deploy.yml 的 script 部分添加
sudo systemctl restart exam-monitor
```

### 自定义部署脚本
```yaml
# 在 deploy.yml 的 script 部分添加
cd /home/sandy/exam-monitor
./scripts/deploy.sh
```

---

## 🆘 故障排查

### 部署失败？

**查看日志：**
```
GitHub → Actions → Deploy to VPS → 点击失败的工作流
```

**常见错误：**

| 错误 | 原因 | 解决 |
|------|------|------|
| `Permission denied` | 私钥错误 | 检查 `VPS_SSH_PRIVATE_KEY` 是否完整 |
| `Host key verification failed` | SSH 未配置 | 在 VPS 上运行 `ssh-keyscan` |
| `npm: command not found` | Node.js 未安装 | 在 VPS 上安装 Node.js 20+ |
| `nginx: 404` | Nginx 配置错误 | 检查 `root` 路径 |

**在 VPS 上调试：**
```bash
# 查看 SSH 日志
sudo tail -f /var/log/auth.log

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log

# 检查目录
ls -la /home/sandy/exam-monitor/dist
```

---

## ✅ 验证清单

- [ ] VPS 上 SSH 公钥已配置
- [ ] GitHub Secrets 已添加（4 个）
- [ ] Workflow 文件已创建
- [ ] 手动触发部署测试通过
- [ ] 网站可正常访问

---

## 🎓 工作原理

### GitHub Secrets
安全存储敏感信息，工作流中通过 `${{ secrets.XXX }}` 访问

### SSH 密钥认证
- **私钥** → GitHub Secrets（加密存储）
- **公钥** → VPS `~/.ssh/authorized_keys`

### GitHub Actions
```yaml
# 触发条件
on:
  push:
    branches: [main]  # 推送到 main 分支时触发

# 工作步骤
jobs:
  deploy:
    steps:
      - 检出代码
      - 构建项目
      - SSH 部署
```

---

## 📊 部署统计

每次部署都会显示：
- ✅ 构建时间
- ✅ 部署状态
- ✅ 详细日志
- ✅ 错误信息（如果失败）

---

## 🔄 持续部署

配置完成后，工作流程：

```bash
# 开发
git add .
git commit -m "feat: 新功能"
git push origin main

# 自动触发
GitHub Actions → 构建 → 部署 → 完成

# 访问网站
http://您的VPS_IP
```

**无需任何手动操作！**

---

## 🔐 安全建议

1. **私钥保护**
   - 使用专用部署密钥
   - 定期轮换
   - 不要提交到代码库

2. **最小权限**
   - 部署用户只读权限
   - 限制 SSH 命令

3. **网络防护**
   - 防火墙限制 SSH
   - 使用 VPN（可选）

---

## 📞 需要帮助？

查看详细文档：
- `GITHUB_WEB_SETUP.md` - 完整步骤
- `DEPLOYMENT_GITHUB_ACTIONS.md` - 技术细节
- `QUICK_START_GITHUB_ACTIONS.md` - 快速参考

---

## 🎉 开始使用！

**现在就开始：**
1. 访问：`https://github.com/sandy2046/exam-monitor/settings/secrets/actions`
2. 添加 4 个 Secrets
3. 创建 workflow 文件
4. 测试部署

**5 分钟后，您的网站就自动部署完成了！**
