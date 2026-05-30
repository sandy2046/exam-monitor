# 考场大屏可视化系统 (ExamStage Monitor)

## 项目概况
- **项目路径**: `D:\肖品辉工作资料\exam_monitor`
- **技术栈**: Vue 3 + Vite 5 + Tailwind CSS 3 + PWA
- **部署方式**: 纯前端，无后端服务，hash路由 (# / #admin)
- **目标**: 考场大屏可视化，六大阶段自动流转，双角色（考生+监考）提示

## 架构要点
- `src/composables/`: 核心逻辑层 (useConfig, useMasterClock, useExamState, useAudioAlert)
- `src/components/display/`: 大屏4组件 (TopMetaBar, CountdownCore, DualRolePanel, TimelineBar)
- `src/views/`: DisplayView (大屏主页) + AdminView (管理配置页)
- 配置持久化: localStorage (`exam_monitor_config` 键)，500ms 防抖自动保存
- 状态快照: 每秒写入 localStorage (`exam_monitor_state_snapshot` 键)，用于断电解锁恢复

## 开发命令
- `npm run dev` → http://localhost:5173
- `npm run build` → dist/ 输出
- `npm run preview` → 预览生产构建
