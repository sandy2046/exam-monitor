# GitHub Actions 部署 - 完成总结

## ✅ 已完成的工作

所有部署文档已创建并推送到 GitHub！

### 📁 已推送的文件

```
exam-monitor/
├── .github/
│   └── workflows/
│       └── deploy.yml  ← 需要在 GitHub 网页上手动创建
├── README_GITHUB_ACTIONS.md          ← 主文档
├── NEXT_STEPS.md                      ← 下一步操作
├── GITHUB_WEB_SETUP.md                ← 网页配置指南
├── QUICK_START_GITHUB_ACTIONS.md      ← 快速参考
├── DEPLOYMENT_GITHUB_ACTIONS.md       ← 完整技术文档
├── GITHUB_SECRETS_SETUP.md            ← Secrets 说明
└── scripts/
    └── verify-deployment.sh           ← 验证脚本
```

**已推送到 GitHub：** `https://github.com/sandy2046/exam-monitor`

---

## 🎯 您现在只需要做 3 件事

### 1️⃣ 添加 Secrets（2 分钟）

**访问：** `https://github.com/sandy2046/exam-monitor/settings/secrets/actions`

**添加 4 个 Secret：**

| 名称 | 值 | 说明 |
|------|-----|------|
| `VPS_HOST` | `123.45.67.89` | 您的 VPS IP |
| `VPS_USERNAME` | `sandy` | VPS 用户名 |
| `VPS_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH...` | **完整私钥** |
| `VPS_PORT` | `22` | 可选，默认 22 |

**如何获取私钥：**
```bash
# 在您的本地电脑
cat ~/.ssh/id_rsa
```
复制完整内容（包括 `-----BEGIN...` 和 `-----END...`）

---

### 2️⃣ 创建 Workflow 文件（1 分钟）

**访问：** `https://github.com/sandy2046/exam-monitor/new/main/.github/workflows`

**文件名：** `.github/workflows/deploy.yml`

**粘贴以下内容：**

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

**点击：** `Commit new file`

---

### 3️⃣ 测试部署（1 分钟）

**访问：** `https://github.com/sandy2046/exam-monitor/actions`

**点击：**
1. **Deploy to VPS**
2. **Run workflow**
3. 选择 `main` 分支
4. **Run workflow** 按钮

**等待 1-2 分钟**，看到绿色对勾 ✅

---

## 🌐 访问您的网站

部署成功后：
```
http://您的VPS_IP
```

---

## 📚 文档导航

| 文档 | 用途 | 访问方式 |
|------|------|---------|
| **README_GITHUB_ACTIONS.md** | 主文档，从这里开始 | GitHub 仓库首页 |
| **NEXT_STEPS.md** | 详细步骤 | `NEXT_STEPS.md` |
| **GITHUB_WEB_SETUP.md** | 网页配置完整指南 | `GITHUB_WEB_SETUP.md` |
| **QUICK_START_GITHUB_ACTIONS.md** | 快速参考卡片 | `QUICK_START_GITHUB_ACTIONS.md` |
| **DEPLOYMENT_GITHUB_ACTIONS.md** | 技术细节和高级配置 | `DEPLOYMENT_GITHUB_ACTIONS.md` |

---

## 🚀 部署成功后的工作流程

### 日常开发
```bash
# 1. 本地开发
git add .
git commit -m "feat: 新功能"

# 2. 推送到 GitHub
git push origin main

# 3. 自动部署
# GitHub Actions 会自动：
# - 构建项目
# - 连接到 VPS
# - 部署最新代码

# 4. 访问网站
# http://您的VPS_IP
```

**无需任何手动操作！**

---

## 🔧 高级配置（可选）

### 如果需要 Node.js 服务器

修改 `deploy.yml` 的 script 部分：

```yaml
script: |
  cd /home/sandy/exam-monitor
  git pull origin main
  npm ci --production
  npm run build
  pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
```

### 如果使用 systemd

```yaml
script: |
  cd /home/sandy/exam-monitor
  git pull origin main
  npm ci --production
  npm run build
  sudo systemctl restart exam-monitor
```

---

## 🆘 遇到问题？

### 查看部署日志
```
GitHub → Actions → Deploy to VPS → 点击具体工作流
```

### 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| **Permission denied** | 私钥错误 | 检查 `VPS_SSH_PRIVATE_KEY` 是否完整 |
| **构建失败** | TypeScript 错误 | 本地运行 `npm run type-check` 检查 |
| **网站 404** | Nginx 配置 | 检查 `/home/sandy/exam-monitor/dist` |
| **Actions 未触发** | workflow 文件错误 | 确认文件路径和名称正确 |

### VPS 调试命令
```bash
# SSH 日志
sudo tail -f /var/log/auth.log

# Nginx 日志
sudo tail -f /var/log/nginx/error.log

# 检查部署
ls -la /home/sandy/exam-monitor/dist
```

---

## ✅ 验证清单

- [ ] **VPS 端**
  - [ ] SSH 公钥已添加到 `~/.ssh/authorized_keys`
  - [ ] 项目目录已创建：`/home/sandy/exam-monitor`
  - [ ] Nginx 已配置（如果使用静态文件）

- [ ] **GitHub 端**
  - [ ] `VPS_HOST` 已添加
  - [ ] `VPS_USERNAME` 已添加
  - [ ] `VPS_SSH_PRIVATE_KEY` 已添加
  - [ ] `VPS_PORT` 已添加（可选）
  - [ ] `deploy.yml` 已创建

- [ ] **测试**
  - [ ] 手动触发部署成功
  - [ ] 网站可正常访问

---

## 🎉 部署成功！

### 以后只需要：
```bash
git add .
git commit -m "更新内容"
git push origin main
```

### GitHub Actions 会自动完成：
1. ✅ 代码检查
2. ✅ TypeScript 类型检查
3. ✅ 构建项目
4. ✅ 部署到 VPS
5. ✅ 更新网站

**无需手动操作！**

---

## 📞 需要帮助？

### 查看详细文档：
- `README_GITHUB_ACTIONS.md` - 主文档
- `NEXT_STEPS.md` - 详细步骤
- `GITHUB_WEB_SETUP.md` - 网页配置

### GitHub 上查看：
```
https://github.com/sandy2046/exam-monitor
```

---

## 🎯 立即开始

**访问：** `https://github.com/sandy2046/exam-monitor/settings/secrets/actions`

**添加 Secrets → 创建 workflow → 测试部署 → 完成！**

**5 分钟后，您的自动部署系统就完成了！**
