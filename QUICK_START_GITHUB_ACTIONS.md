# GitHub Actions 部署 - 快速开始

## 🚀 5 分钟完成配置

### 步骤 1：准备私钥（1 分钟）

在**您的本地电脑**上执行：

```bash
# 查看私钥内容
cat ~/.ssh/id_rsa
```

复制**完整输出**（包括 `-----BEGIN...` 和 `-----END...`）

---

### 步骤 2：添加到 GitHub（2 分钟）

1. 打开：`https://github.com/sandy2046/exam-monitor/settings/secrets/actions`
2. 点击 **New repository secret**
3. 逐个添加：

| 名称 | 值 | 示例 |
|------|-----|------|
| `VPS_HOST` | 您的 VPS IP | `123.45.67.89` |
| `VPS_USERNAME` | VPS 用户名 | `sandy` |
| `VPS_SSH_PRIVATE_KEY` | **完整私钥** | `-----BEGIN OPENSSH...` |
| `VPS_PORT` | SSH 端口 | `22` (可选) |

---

### 步骤 3：提交部署配置（1 分钟）

```bash
cd /home/sandy/考试流程提醒助手/exam-monitor

# 添加配置文件
git add .github/workflows/deploy.yml
git add DEPLOYMENT_GITHUB_ACTIONS.md
git add GITHUB_SECRETS_SETUP.md
git add QUICK_START_GITHUB_ACTIONS.md
git add scripts/verify-deployment.sh

# 提交并推送
git commit -m "feat: 添加 GitHub Actions 自动部署"
git push origin main
```

---

### 步骤 4：查看部署状态（1 分钟）

访问：`https://github.com/sandy2046/exam-monitor/actions`

等待绿色对勾 ✅ 出现（通常 1-2 分钟）

---

### 步骤 5：访问网站

打开：`http://您的VPS_IP`

---

## 📋 完整检查清单

- [ ] **VPS 端**
  - [ ] 公钥已添加到 `~/.ssh/authorized_keys`
  - [ ] 项目目录已创建：`/home/sandy/exam-monitor`
  - [ ] Nginx 已配置并启动

- [ ] **GitHub 端**
  - [ ] `VPS_HOST` 已添加
  - [ ] `VPS_USERNAME` 已添加
  - [ ] `VPS_SSH_PRIVATE_KEY` 已添加
  - [ ] `VPS_PORT` 已添加（可选）

- [ ] **代码端**
  - [ ] `.github/workflows/deploy.yml` 已创建
  - [ ] 代码已推送到 `main` 分支

---

## 🔧 常用命令

### 手动触发部署
```bash
# 在 GitHub Actions 页面手动运行
# 或者推送代码到 main 分支
git push origin main
```

### 查看部署日志
```bash
# 访问 GitHub Actions 页面
https://github.com/sandy2046/exam-monitor/actions
```

### 验证配置
```bash
cd /home/sandy/考试流程提醒助手/exam-monitor
./scripts/verify-deployment.sh
```

---

## ❓ 遇到问题？

### 问题 1：部署失败，提示 "Permission denied"

**原因：** 私钥未正确配置

**解决：**
1. 检查 `VPS_SSH_PRIVATE_KEY` 是否包含完整私钥
2. 确保私钥格式正确（包含 `-----BEGIN...` 和 `-----END...`）
3. 在 VPS 上检查：`cat ~/.ssh/authorized_keys`

### 问题 2：部署成功但网站无法访问

**原因：** Nginx 未配置或未启动

**解决：**
```bash
# 在 VPS 上执行
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 问题 3：GitHub Actions 卡住

**原因：** Secrets 未配置完整

**解决：**
1. 访问：`https://github.com/sandy2046/exam-monitor/settings/secrets/actions`
2. 确认 4 个 Secrets 都已添加

---

## 📚 详细文档

- **完整部署指南：** `DEPLOYMENT_GITHUB_ACTIONS.md`
- **Secrets 配置：** `GITHUB_SECRETS_SETUP.md`
- **验证脚本：** `scripts/verify-deployment.sh`

---

## ✅ 部署成功后

以后只需要：
```bash
git add .
git commit -m "更新内容"
git push origin main
```

GitHub Actions 会自动完成：
1. ✅ 代码检查
2. ✅ TypeScript 类型检查
3. ✅ 构建项目
4. ✅ 部署到 VPS
5. ✅ 更新网站

**无需手动操作！**
