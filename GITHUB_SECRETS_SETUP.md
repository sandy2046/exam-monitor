# GitHub Secrets 配置步骤

## 您需要添加的 4 个 Secrets

### 1. VPS_HOST
- **名称：** `VPS_HOST`
- **值：** 您的 VPS IP 地址（例如：`123.45.67.89`）

### 2. VPS_USERNAME
- **名称：** `VPS_USERNAME`
- **值：** 您的 VPS 登录用户名（例如：`sandy`）

### 3. VPS_PORT（可选，默认 22）
- **名称：** `VPS_PORT`
- **值：** `22`（如果您的 SSH 端口不是 22，请填写实际端口）

### 4. VPS_SSH_PRIVATE_KEY（最重要）
- **名称：** `VPS_SSH_PRIVATE_KEY`
- **值：** 您的私钥内容

---

## 如何添加私钥到 GitHub

### 步骤 1：复制您的私钥

您已经提供了私钥内容：
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACDvVsebGiB2eCOawfjXB90PjyyAZDcH3a7B0jaWr1DxNwAAAJjYXAxV2FwM
VQAAAAtzc2gtZWQyNTUxOQAAACDvVsebGiB2eCOawfjXB90PjyyAZDcH3a7B0jaWr1DxNw
AAAEDx6k2u23FYNAQgaUNrxQhIDs4M3eqYrrmY/9ZRtvX6re9Wx5saIHZ4I5rB+NcH3Q+P
LIBkNwfdrsHSNpavUPE3AAAAFWdpdGh1Yi1hY3Rpb25zQGRlcGxveQ==
-----END OPENSSH PRIVATE KEY-----
```

### 步骤 2：在 GitHub 上添加 Secret

1. **打开 GitHub 仓库**
   ```
   https://github.com/sandy2046/exam-monitor
   ```

2. **进入 Settings**
   - 点击仓库页面右上角的 **Settings**（齿轮图标）

3. **进入 Secrets 设置**
   - 左侧菜单找到 **Secrets and variables**
   - 点击 **Actions**

4. **添加 VPS_SSH_PRIVATE_KEY**
   - 点击 **New repository secret**
   - **Secret name：** `VPS_SSH_PRIVATE_KEY`
   - **Secret value：** 粘贴您的完整私钥（包括 `-----BEGIN...` 和 `-----END...`）
   - 点击 **Add secret**

5. **添加其他 Secrets**
   重复上述步骤添加：
   - `VPS_HOST` → 您的 VPS IP
   - `VPS_USERNAME` → 您的用户名
   - `VPS_PORT` → `22`（可选）

### 步骤 3：验证配置

添加完成后，您应该看到：

```
Secrets
├── VPS_HOST
├── VPS_PORT
├── VPS_SSH_PRIVATE_KEY
└── VPS_USERNAME
```

---

## 常见问题

### Q: 私钥格式问题
**A:** GitHub 会自动处理换行符，直接粘贴完整私钥即可。

### Q: 私钥有密码怎么办？
**A:** 两种方案：
1. **推荐：** 创建无密码的专用密钥对
   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""
   ```
   然后将公钥添加到 VPS，私钥添加到 GitHub。

2. **不推荐：** 使用 ssh-agent（配置复杂）

### Q: 如何测试 SSH 连接？
**A:** 在本地测试：
```bash
ssh -i ~/.ssh/id_rsa sandy@您的VPS_IP
```

---

## 下一步

配置完成后：

1. **提交部署配置文件**
   ```bash
   cd /home/sandy/考试流程提醒助手/exam-monitor
   git add .github/workflows/deploy.yml
   git add DEPLOYMENT_GITHUB_ACTIONS.md
   git add GITHUB_SECRETS_SETUP.md
   git commit -m "feat: 添加 GitHub Actions 部署配置"
   git push origin main
   ```

2. **查看部署状态**
   - 访问：`https://github.com/sandy2046/exam-monitor/actions`
   - 等待工作流完成（通常 1-2 分钟）

3. **访问网站**
   - 打开 `http://您的VPS_IP`

---

**需要帮助？** 如果部署失败，查看 GitHub Actions 日志获取详细错误信息。
