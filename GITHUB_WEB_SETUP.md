# GitHub Web 端配置指南

由于您的 token 没有 workflow 权限，需要在 GitHub 网页上手动创建文件。

## 第一步：添加 Secrets（必须）

访问：`https://github.com/sandy2046/exam-monitor/settings/secrets/actions`

点击 **New repository secret**，逐个添加：

### Secret 1: VPS_HOST
- **Secret name:** `VPS_HOST`
- **Value:** 您的 VPS IP 地址（例如：`123.45.67.89`）
- 点击 **Add secret**

### Secret 2: VPS_USERNAME
- **Secret name:** `VPS_USERNAME`
- **Value:** 您的 VPS 用户名（例如：`sandy`）
- 点击 **Add secret**

### Secret 3: VPS_SSH_PRIVATE_KEY（最重要）
- **Secret name:** `VPS_SSH_PRIVATE_KEY`
- **Value:** 粘贴您的完整私钥：
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  QyNTUxOQAAACDvVsebGiB2eCOawfjXB90PjyyAZDcH3a7B0jaWr1DxNwAAAJjYXAxV2FwM
  VQAAAAtzc2gtZWQyNTUxOQAAACDvVsebGiB2eCOawfjXB90PjyyAZDcH3a7B0jaWr1DxNw
  AAAEDx6k2u23FYNAQgaUNrxQhIDs4M3eqYrrmY/9ZRtvX6re9Wx5saIHZ4I5rB+NcH3Q+P
  LIBkNwfdrsHSNpavUPE3AAAAFWdpdGh1Yi1hY3Rpb25zQGRlcGxveQ==
  -----END OPENSSH PRIVATE KEY-----
  ```
- 点击 **Add secret**

### Secret 4: VPS_PORT（可选）
- **Secret name:** `VPS_PORT`
- **Value:** `22`（如果您的 SSH 端口不是 22，请填写实际端口）
- 点击 **Add secret**

---

## 第二步：创建 Workflow 文件

访问：`https://github.com/sandy2046/exam-monitor/new/main/.github/workflows`

### 创建 deploy.yml

在文件名输入框输入：`.github/workflows/deploy.yml`

将以下内容粘贴到文件编辑器中：

```yaml
name: Deploy to VPS

on:
  push:
    branches:
      - main
  workflow_dispatch:  # 允许手动触发

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
            # 进入项目目录
            cd /home/sandy/exam-monitor

            # 拉取最新代码
            git pull origin main

            # 安装依赖
            npm ci --production

            # 构建项目
            npm run build

            echo "部署完成！"
```

点击 **Commit new file**

---

## 第三步：测试部署

### 方法 1：手动触发（推荐）

1. 访问：`https://github.com/sandy2046/exam-monitor/actions`
2. 点击 **Deploy to VPS**
3. 点击 **Run workflow**
4. 选择 `main` 分支
5. 点击 **Run workflow** 按钮

等待 1-2 分钟，看到绿色对勾 ✅ 表示成功。

### 方法 2：推送代码触发

```bash
# 在您的本地或 VPS 上
cd /home/sandy/考试流程提醒助手/exam-monitor

# 提交之前未推送的文件（不包括 workflow，因为已经手动创建了）
git add DEPLOYMENT_GITHUB_ACTIONS.md GITHUB_SECRETS_SETUP.md QUICK_START_GITHUB_ACTIONS.md scripts/verify-deployment.sh
git commit -m "docs: 添加部署文档"
git push origin main
```

---

## 第四步：验证部署

### 检查部署状态

访问：`https://github.com/sandy2046/exam-monitor/actions`

您应该看到：
- ✅ Checkout code
- ✅ Setup Node.js
- ✅ Install dependencies
- ✅ Run TypeScript type check
- ✅ Build project
- ✅ Deploy to VPS via SSH

### 访问网站

打开：`http://您的VPS_IP`

---

## 常见问题

### Q: workflow 文件创建失败？

A: 确保您访问的是正确的 URL：
```
https://github.com/sandy2046/exam-monitor/new/main/.github/workflows
```

### Q: Secrets 添加后在哪里查看？

A: 访问：
```
https://github.com/sandy2046/exam-monitor/settings/secrets/actions
```

### Q: 如何删除旧的测试文件？

A: 在 GitHub 上访问文件，点击右上角的垃圾桶图标删除。

---

## 部署成功后

以后只需要：
```bash
git add .
git commit -m "更新内容"
git push origin main
```

GitHub Actions 会自动完成所有部署工作！

---

## 需要帮助？

查看详细文档：
- `DEPLOYMENT_GITHUB_ACTIONS.md` - 完整部署指南
- `QUICK_START_GITHUB_ACTIONS.md` - 快速开始
- `GITHUB_SECRETS_SETUP.md` - Secrets 配置详情
