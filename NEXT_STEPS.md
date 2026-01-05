# 下一步操作指南

## ✅ 已完成

文档文件已推送到 GitHub：
- `GITHUB_WEB_SETUP.md` - **最重要的文件，包含完整步骤**
- `DEPLOYMENT_GITHUB_ACTIONS.md` - 详细技术文档
- `QUICK_START_GITHUB_ACTIONS.md` - 快速参考
- `GITHUB_SECRETS_SETUP.md` - Secrets 配置说明
- `scripts/verify-deployment.sh` - 验证脚本

---

## 🎯 您现在需要做的（3 个步骤）

### 步骤 1：在 GitHub 上添加 Secrets（2 分钟）

访问：`https://github.com/sandy2046/exam-monitor/settings/secrets/actions`

点击 **New repository secret**，添加 4 个 Secret：

| 名称 | 值 | 操作 |
|------|-----|------|
| `VPS_HOST` | 您的 VPS IP | 添加 |
| `VPS_USERNAME` | 您的用户名 | 添加 |
| `VPS_SSH_PRIVATE_KEY` | **完整私钥** | 添加 |
| `VPS_PORT` | `22` | 添加（可选） |

**私钥格式示例：**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACDvVsebGiB2eCOawfjXB90PjyyAZDcH3a7B0jaWr1DxNwAAAJjYXAxV2FwM
...
-----END OPENSSH PRIVATE KEY-----
```

---

### 步骤 2：在 GitHub 上创建 Workflow 文件（1 分钟）

访问：`https://github.com/sandy2046/exam-monitor/new/main/.github/workflows`

1. **文件名**输入：`.github/workflows/deploy.yml`

2. **内容**粘贴以下代码：

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

3. 点击 **Commit new file**

---

### 步骤 3：测试部署（1 分钟）

**方法 A：手动触发（推荐）**
1. 访问：`https://github.com/sandy2046/exam-monitor/actions`
2. 点击 **Deploy to VPS**
3. 点击 **Run workflow**
4. 选择 `main` 分支
5. 点击 **Run workflow** 按钮

**方法 B：推送代码触发**
```bash
cd /home/sandy/考试流程提醒助手/exam-monitor
echo "# 测试" >> README.md
git add README.md
git commit -m "测试部署"
git push origin main
```

---

## 📊 查看部署状态

访问：`https://github.com/sandy2046/exam-monitor/actions`

等待 1-2 分钟，看到绿色对勾 ✅ 表示成功。

---

## 🌐 访问您的网站

部署成功后，打开：
```
http://您的VPS_IP
```

---

## 🆘 遇到问题？

### 问题 1：部署失败

**查看日志：**
1. 访问：`https://github.com/sandy2046/exam-monitor/actions`
2. 点击失败的工作流
3. 查看具体哪一步出错

### 问题 2：SSH 连接失败

**在 VPS 上检查：**
```bash
# 查看 SSH 日志
sudo tail -f /var/log/auth.log

# 检查公钥
cat ~/.ssh/authorized_keys
```

### 问题 3：网站无法访问

**在 VPS 上检查：**
```bash
# 检查 Nginx
sudo nginx -t
sudo systemctl status nginx

# 检查 dist 目录
ls -la /home/sandy/exam-monitor/dist
```

---

## 📚 详细文档

如果需要更详细的说明：
- **完整指南：** `GITHUB_WEB_SETUP.md`
- **技术文档：** `DEPLOYMENT_GITHUB_ACTIONS.md`
- **快速参考：** `QUICK_START_GITHUB_ACTIONS.md`

---

## ✨ 部署成功后

以后只需要：
```bash
git add .
git commit -m "更新内容"
git push origin main
```

GitHub Actions 会自动：
1. ✅ 检查代码
2. ✅ 构建项目
3. ✅ 部署到 VPS

**无需手动操作！**

---

**准备好开始了吗？** 从步骤 1 开始，按照 `GITHUB_WEB_SETUP.md` 的指引操作即可！
