# 考试流程提醒助手 (exam-monitor)

基于 Vue 3 + TypeScript 的智能监考流程管理系统，为监考老师提供精确的时间提醒和流程管理。

## ✨ 核心功能

- 🎯 **精确时间管理**：基于 NTP 时间同步，确保计时准确
- 📋 **考试模板**：内置 CET-4、CET-6 标准流程，支持自定义
- 🎨 **可视化进度**：绿色背景进度条，直观显示剩余时间
- 🔔 **智能提醒**：视觉 + 声音提醒，支持提前预警
- 💾 **数据持久化**：本地存储，页面刷新不丢失状态
- 📱 **响应式设计**：支持移动端查看

## 🚀 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5174
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 输出到 dist 目录
```

## 📦 一键部署

### 方式一：使用自动部署脚本（推荐）

在 VPS 上执行：

```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/sandy2046/exam-monitor/main/deploy.sh

# 赋予执行权限
chmod +x deploy.sh

# 运行部署（自动安装所有依赖）
./deploy.sh

# 可选：指定域名
./deploy.sh --domain exam.your-school.com

# 可选：指定端口
./deploy.sh --port 8080

# 可选：组合使用
./deploy.sh --domain exam.your-school.com --port 80
```

### 方式二：手动部署

```bash
# 1. 安装 Node.js 20, Git, Nginx
sudo apt update
sudo apt install -y git nginx curl

# 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20

# 2. 克隆仓库
cd /opt
git clone https://github.com/sandy2046/exam-monitor.git
cd exam-monitor

# 3. 安装依赖并构建
npm install
npm run build

# 4. 配置 Nginx
sudo bash scripts/setup-nginx.sh

# 5. 配置防火墙
sudo ufw allow 80/tcp
sudo ufw allow ssh
```

### 方式三：Docker 部署（即将支持）

```bash
# 等待 Docker 版本发布
docker pull sandy2046/exam-monitor:latest
docker run -d -p 80:80 --name exam-monitor sandy2046/exam-monitor
```

## 📚 使用指南

### 1. 下载考试模板

1. 访问应用首页
2. 点击"模板中心"
3. 同步远程模板
4. 选择 CET-4 或 CET-6
5. 点击"下载"

### 2. 启动考试

1. 在"已下载模板"中选择模板
2. 设置实际开始时间
   - CET-4：建议设置为 8:30（提前40分钟入场）
   - CET-6：建议设置为 14:30（提前40分钟入场）
3. 点击"确认开始考试"

### 3. 考试监控

系统会自动：
- 显示当前时间（大字体）
- 显示当前阶段和剩余时间
- 绿色背景从右向左消退（表示剩余时间）
- 显示下一阶段预告
- 显示注意事项

### 4. 操作控制

- **暂停/继续**：应对突发情况
- **跳过**：手动进入下一阶段
- **结束考试**：提前结束并记录

## 🔧 管理脚本

### 更新项目

```bash
# 在项目目录下
sudo bash scripts/update.sh
```

### 备份配置

```bash
# 备份 Nginx 配置和项目文件
sudo bash scripts/backup.sh
```

### 手动配置 Nginx

```bash
# 交互式配置
sudo bash scripts/setup-nginx.sh
```

## 📂 项目结构

```
exam-monitor/
├── dist/                    # 构建输出
├── public/
│   └── templates/
│       └── cet-templates.json  # CET 考试模板
├── src/
│   ├── components/          # Vue 组件
│   │   ├── ExamMonitor.vue  # 主监控界面
│   │   ├── TemplateCenter.vue
│   │   └── ...
│   ├── stores/              # Pinia 状态管理
│   │   ├── examStore.ts     # 考试状态
│   │   ├── templateStore.ts # 模板管理
│   │   ├── timeStore.ts     # 时间同步
│   │   └── types.ts         # 类型定义
│   ├── services/            # 服务层
│   │   ├── timeService.ts   # NTP 时间同步
│   │   └── storageService.ts # 本地存储
│   └── utils/               # 工具函数
├── scripts/                 # 部署脚本
│   ├── deploy.sh           # 一键部署
│   ├── setup-nginx.sh      # Nginx 配置
│   ├── update.sh           # 更新脚本
│   └── backup.sh           # 备份脚本
├── deploy.sh               # 主部署脚本
└── README.md
```

## 🛠️ 技术栈

- **前端框架**：Vue 3 (Composition API)
- **语言**：TypeScript 5.9.3
- **状态管理**：Pinia 3.0.4
- **UI 组件**：Element Plus 2.13.0
- **构建工具**：Vite 7.3.0
- **HTTP 客户端**：Axios 1.13.2
- **Web 服务器**：Nginx

## ⚙️ 配置说明

### Nginx 配置

默认配置位于：`/etc/nginx/sites-available/exam-monitor`

可自定义：
- 端口（默认 80）
- 域名/IP
- Gzip 压缩
- 安全头

### 环境变量

```bash
# 开发环境
VITE_API_URL=http://localhost:3000

# 生产环境（自动使用）
```

## 🔒 安全建议

1. **HTTPS 配置**：
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d exam.your-school.com
   ```

2. **防火墙**：
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow ssh
   sudo ufw enable
   ```

3. **定期更新**：
   ```bash
   # 每月执行一次
   sudo apt update && sudo apt upgrade -y
   cd /opt/exam-monitor && git pull && npm run build && systemctl restart nginx
   ```

## 🐛 故障排查

### 问题：页面无法访问

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查端口监听
sudo netstat -tlnp | grep :80

# 查看错误日志
sudo tail -f /var/log/nginx/exam-monitor-error.log
```

### 问题：构建失败

```bash
# 清理并重试
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 问题：时间同步失败

检查网络连接，确保可以访问：
- `http://worldtimeapi.org/api/ip`
- `http://ntp.aliyun.com`

## 📞 支持

如有问题，请提交 Issue 或联系维护者。

## 📄 许可

MIT License

## 🙏 致谢

- Vue.js 团队
- Element Plus 团队
- World Time API
