<template>
  <div class="exam-monitor">
    <el-card class="monitor-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="exam-name">{{ examStore.examState?.templateName }}</span>
            <el-tag :type="statusType" size="small" effect="dark">
              {{ statusText }}
            </el-tag>
          </div>
          <div class="header-right">
            <el-button
              v-if="examStore.isExamRunning"
              type="warning"
              size="small"
              @click="$emit('pause-exam')"
            >
              暂停
            </el-button>
            <el-button
              v-else-if="examStore.isExamPaused"
              type="success"
              size="small"
              @click="$emit('resume-exam')"
            >
              继续
            </el-button>
            <el-button size="small" @click="$emit('skip-node')" :disabled="!canSkip">
              跳过
            </el-button>
            <el-button type="danger" size="small" @click="$emit('end-exam')">
              结束考试
            </el-button>
          </div>
        </div>
      </template>

      <div class="monitor-content">
        <!-- 当前时间显示 - 超大号显示 -->
        <div class="section current-time-display">
          <div class="current-time-content-full">
            <span class="time-value-full">{{ currentTime }}</span>
          </div>
        </div>

        <!-- 当前阶段 - 彩色背景进度 -->
        <div class="section current-status">
          <div class="status-card" :class="{'node-changed': nodeChanged, 'has-progress': hasNodeProgress}" :style="nodeBackgroundStyle">
            <div class="node-main">
              <div class="node-info">
                <div class="node-header">
                  <span class="status-dot" :class="statusDotClass"></span>
                  <span class="node-name">{{ examStore.progress.currentNode?.name || '—' }}</span>
                  <span class="node-time-range" v-if="examStore.progress.currentNode">
                    {{ currentNodeTimeRange }}
                  </span>
                </div>

                <div class="node-description" v-if="examStore.progress.currentNode?.description">
                  {{ examStore.progress.currentNode.description }}
                </div>
                <div class="node-empty" v-else>
                  暂无描述信息
                </div>

                <!-- 进度信息 -->
                <div class="progress-info" v-if="examStore.progress.currentNode">
                  <span class="progress-percentage">{{ nodeProgressPercentage }}%</span>
                  <span class="progress-time" v-if="examStore.progress.currentNode?.offset > 0">
                    已过: {{ nodeElapsedTime }}
                  </span>
                </div>
              </div>

              <!-- 当前阶段注意事项 -->
              <div class="node-tips" v-if="currentNodeTips">
                <div class="tips-title">注意事项</div>
                <div class="tips-content">{{ currentNodeTips }}</div>
              </div>
            </div>

            <!-- 下一阶段预告 -->
            <div class="next-node-preview" v-if="examStore.progress.nextNode">
              <span class="next-label">下一阶段：</span>
              <span class="next-name">{{ examStore.progress.nextNode.name }}</span>
              <span class="next-time-range">
                {{ nextNodeTimeRange }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { useExamStore } from '@/stores/examStore'
import { useTimeStore } from '@/stores/timeStore'
import { useTemplateStore } from '@/stores/templateStore'
import {
  formatTime,
  formatOffset,
  formatRelativeTime,
  formatDuration,
} from '@/utils/formatter'

const emit = defineEmits(['end-exam', 'pause-exam', 'resume-exam', 'skip-node'])

const examStore = useExamStore()
const timeStore = useTimeStore()
const templateStore = useTemplateStore()

const currentTime = ref(formatTime(new Date()))
let timeInterval: number | null = null
const isDev = import.meta.env.DEV

// 动画状态
const nodeChanged = ref(false)
let lastNodeName: string | null = null

const startTime = computed(() => {
  return examStore.examState ? new Date(examStore.examState.startTime) : new Date()
})

const statusType = computed(() => {
  if (examStore.isExamPaused) return 'warning'
  if (examStore.isExamEnded) return 'info'
  if (examStore.isExamRunning) return 'success'
  return 'info'
})

const statusText = computed(() => {
  if (examStore.isExamPaused) return '已暂停'
  if (examStore.isExamEnded) return '已结束'
  if (examStore.isExamRunning) return '进行中'
  return '未知'
})

// 状态点颜色
const statusDotClass = computed(() => {
  if (examStore.isExamPaused) return 'dot-paused'
  if (examStore.isExamEnded) return 'dot-ended'
  if (examStore.isExamRunning) return 'dot-running'
  return 'dot-idle'
})

// 当前节点进度条样式 - 从左到右填充，反映当前节点完成进度
const nodeProgressStyle = computed(() => {
  if (!examStore.progress.currentNode || !examStore.examState) {
    return { width: '0%' }
  }

  const currentNode = examStore.progress.currentNode
  const startTime = new Date(examStore.examState.startTime)
  const now = new Date()

  // 计算当前节点的时间跨度
  // 当前节点从 offset 开始，到下一个节点的 offset 结束
  let nodeEndOffset = 0
  if (examStore.progress.nextNode) {
    nodeEndOffset = examStore.progress.nextNode.offset
  } else {
    // 如果没有下一节点，假设当前节点持续30分钟
    nodeEndOffset = currentNode.offset + 30
  }

  // 考试已进行的时间（分钟）
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60

  // 当前节点已进行的时间
  const nodeElapsed = elapsedMinutes - currentNode.offset

  // 当前节点总时长
  const nodeDuration = nodeEndOffset - currentNode.offset

  // 完成百分比
  let percentage = (nodeElapsed / nodeDuration) * 100
  percentage = Math.max(0, Math.min(100, percentage))

  return {
    width: `${percentage}%`
  }
})

// 当前节点进度百分比
const nodeProgressPercentage = computed(() => {
  if (!examStore.progress.currentNode || !examStore.examState) return 0

  const currentNode = examStore.progress.currentNode
  const startTime = new Date(examStore.examState.startTime)
  const now = new Date()

  // 当前节点结束时间
  let nodeEndOffset = 0
  if (examStore.progress.nextNode) {
    nodeEndOffset = examStore.progress.nextNode.offset
  } else {
    nodeEndOffset = currentNode.offset + 30
  }

  // 考试已进行的时间（分钟）
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60

  // 当前节点已进行的时间
  const nodeElapsed = elapsedMinutes - currentNode.offset

  // 当前节点总时长
  const nodeDuration = nodeEndOffset - currentNode.offset

  // 完成百分比
  let percentage = (nodeElapsed / nodeDuration) * 100
  return Math.round(Math.max(0, Math.min(100, percentage)))
})

// 当前节点已过时间
const nodeElapsedTime = computed(() => {
  if (!examStore.progress.currentNode || !examStore.examState) return '0分钟'

  const currentNode = examStore.progress.currentNode
  const startTime = new Date(examStore.examState.startTime)
  const now = new Date()

  // 考试已进行的时间（分钟）
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60

  // 当前节点已进行的时间
  const nodeElapsed = elapsedMinutes - currentNode.offset

  // 转换为秒
  const elapsedSeconds = Math.floor(nodeElapsed * 60)

  return formatDuration(elapsedSeconds)
})

// 可跳过
const canSkip = computed(() => {
  return examStore.isExamRunning && examStore.progress.currentNode !== null
})

// 运行时长
const runningDuration = computed(() => {
  if (!examStore.examState) return '0秒'
  const start = new Date(examStore.examState.startTime)
  const now = new Date()
  const diff = Math.floor((now.getTime() - start.getTime()) / 1000)
  return formatDuration(diff)
})

// 当前节点剩余时间百分比（用于绿色背景，从右向左消退）
const nodeRemainingPercentage = computed(() => {
  if (!examStore.progress.currentNode || !examStore.examState) return 0

  const currentNode = examStore.progress.currentNode
  const startTime = new Date(examStore.examState.startTime)
  const now = new Date()

  // 当前节点结束时间
  let nodeEndOffset = 0
  if (examStore.progress.nextNode) {
    nodeEndOffset = examStore.progress.nextNode.offset
  } else {
    nodeEndOffset = currentNode.offset + 30
  }

  // 考试已进行的时间（分钟）
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60

  // 当前节点已进行的时间
  const nodeElapsed = elapsedMinutes - currentNode.offset

  // 当前节点总时长
  const nodeDuration = nodeEndOffset - currentNode.offset

  // 剩余时间
  const nodeRemaining = nodeDuration - nodeElapsed

  // 剩余百分比
  let percentage = (nodeRemaining / nodeDuration) * 100
  return Math.max(0, Math.min(100, percentage))
})

// 是否有节点进度（用于控制 CSS 类）
const hasNodeProgress = computed(() => {
  return examStore.progress.currentNode !== null
})

// 节点背景样式（颜色从右向左消退，代表剩余时间）
const nodeBackgroundStyle = computed(() => {
  const percentage = nodeRemainingPercentage.value
  let colorGradient = ''

  // 根据剩余时间百分比改变颜色
  if (percentage > 60) {
    // 开始阶段 - 绿色
    colorGradient = 'linear-gradient(90deg, #16a34a 0%, #0a7d0a 100%)'
  } else if (percentage > 30) {
    // 中间阶段 - 蓝绿色
    colorGradient = 'linear-gradient(90deg, #0891b2 0%, #0e7490 100%)'
  } else if (percentage > 10) {
    // 后期阶段 - 橙色
    colorGradient = 'linear-gradient(90deg, #ea580c 0%, #c2410c 100%)'
  } else {
    // 即将结束 - 红色
    colorGradient = 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)'
  }

  return {
    '--progress-width': `${percentage}%`,
    '--progress-color': colorGradient
  }
})

// 当前节点时间范围（9:00 -- 9:30）
const currentNodeTimeRange = computed(() => {
  if (!examStore.progress.currentNode || !examStore.examState) return ''

  const currentNode = examStore.progress.currentNode
  const startTime = new Date(examStore.examState.startTime)

  // 节点开始时间
  const nodeStart = new Date(startTime.getTime() + currentNode.offset * 60 * 1000)

  // 节点结束时间
  let nodeEndOffset = 0
  if (examStore.progress.nextNode) {
    nodeEndOffset = examStore.progress.nextNode.offset
  } else {
    nodeEndOffset = currentNode.offset + 30
  }
  const nodeEnd = new Date(startTime.getTime() + nodeEndOffset * 60 * 1000)

  // 格式化为 HH:MM
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  return `${formatTime(nodeStart)} -- ${formatTime(nodeEnd)}`
})

// 下一节点时间范围
const nextNodeTimeRange = computed(() => {
  if (!examStore.progress.nextNode || !examStore.examState) return ''

  const nextNode = examStore.progress.nextNode
  const startTime = new Date(examStore.examState.startTime)

  // 下一节点开始时间
  const nodeStart = new Date(startTime.getTime() + nextNode.offset * 60 * 1000)

  // 下一节点结束时间（假设30分钟）
  const nodeEnd = new Date(startTime.getTime() + (nextNode.offset + 30) * 60 * 1000)

  // 格式化为 HH:MM
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  return `${formatTime(nodeStart)} -- ${formatTime(nodeEnd)}`
})

// 当前阶段注意事项（优先使用节点自带的tips，否则动态生成）
const currentNodeTips = computed(() => {
  if (!examStore.progress.currentNode) return ''

  const currentNode = examStore.progress.currentNode

  // 优先使用节点自带的 tips
  if (currentNode.tips) {
    return currentNode.tips
  }

  // 否则根据节点名称动态生成
  const nodeName = currentNode.name
  const tipMap: Record<string, string> = {
    '考生入场': '核对证件、清点人数、安排座位',
    '发卷': '检查密封、核对份数、分发答题卡',
    '宣读注意事项': '声音洪亮、语速适中、重点强调',
    '开始考试': '提醒时间、关闭手机、检查文具',
    '考试中': '巡视考场、关注异常、维持秩序',
    '提醒收卷': '提前15分钟提醒、停止答题',
    '收卷': '清点试卷、核对份数、分类装订',
    '结束考试': '确认无误、签字确认、整理资料'
  }

  // 查找匹配的注意事项
  for (const key in tipMap) {
    if (nodeName.includes(key)) {
      return tipMap[key]
    }
  }

  // 默认提示
  return '认真执行、仔细核对、确保无误'
})

onMounted(() => {
  timeInterval = window.setInterval(() => {
    // 更新当前时间显示
    currentTime.value = formatTime(new Date())

    // 只在考试运行时触发动画
    if (examStore.examState?.status === 'running') {
      // 获取当前进度数据
      const progress = examStore.progress

      // 检测节点切换
      const currentNode = progress.currentNode
      const currentName = currentNode?.name || null
      if (currentName !== lastNodeName && currentName !== null) {
        nodeChanged.value = true
        setTimeout(() => {
          nodeChanged.value = false
        }, 800)
      }

      // 更新上次记录的值
      lastNodeName = currentName
    }
  }, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
    timeInterval = null
  }
})
</script>

<style scoped>
.exam-monitor {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.monitor-card {
  min-height: 600px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  padding: 16px 24px;
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 200px;
}

.exam-name {
  font-size: 22px;
  font-weight: 700;
  color: white;
}

.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.monitor-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
}

/* 通用 Section 样式 */
.section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  border-left: 5px solid #409eff;
  padding-left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 当前时间显示模块 - 超大号显示，充满整个div */
.current-time-display {
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
  border-radius: 16px;
  border: 4px solid #43a047;
  animation: slideIn 0.5s ease-out;
  text-align: center;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(27, 94, 32, 0.3);
}

.current-time-content-full {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.time-value-full {
  font-size: 96px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 6px;
  font-family: 'Courier New', monospace;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
  line-height: 1;
}

/* 当前环节 - 状态卡片 */
.current-status {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 2px solid #e4e7ed;
}

.status-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  padding: 24px;
  border: 3px solid #e9ecef;
  transition: all 0.3s ease;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

/* 主容器 - 左右布局 */
.node-main {
  display: flex;
  gap: 20px;
  align-items: stretch;
}

/* 左侧信息区域 */
.node-info {
  flex: 1;
  min-width: 0;
}

/* 右侧注意事项区域 */
.node-tips {
  width: 280px;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 2px solid #fdba74;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
  box-shadow: 0 2px 8px rgba(253, 186, 116, 0.2);
}

.tips-title {
  font-size: 14px;
  font-weight: 700;
  color: #c2410c;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tips-title::before {
  content: '⚠️';
  font-size: 16px;
}

.tips-content {
  font-size: 13px;
  font-weight: 600;
  color: #9a3412;
  line-height: 1.4;
}

/* 进度背景 - 从右向左消退，颜色随进度变化 */
.status-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 0%;
  opacity: 0.25;
  transition: width 0.6s ease, background 0.6s ease;
  z-index: 0;
}

.status-card.has-progress::before {
  width: var(--progress-width, 0%);
  background: var(--progress-color, linear-gradient(90deg, #16a34a 0%, #0a7d0a 100%));
}

/* 扫光动画 - 在绿色背景上 */
.status-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 3s infinite;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.3s;
}

.status-card.has-progress::after {
  opacity: 1;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.status-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  animation: dotPulse 2s infinite;
  box-shadow: 0 0 12px currentColor;
}

.dot-running {
  background: #0a7d0a;
  color: #0a7d0a;
}

.dot-paused {
  background: #d97706;
  color: #d97706;
}

.dot-ended {
  background: #6b7280;
  color: #6b7280;
}

.dot-idle {
  background: #9ca3af;
  color: #9ca3af;
}

.node-name {
  font-size: 32px;
  font-weight: 900;
  color: #1f2937;
  letter-spacing: 0.5px;
}

.node-time-range {
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
  background: rgba(107, 114, 128, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.node-description {
  font-size: 16px;
  color: #4b5563;
  font-weight: 500;
  line-height: 1.6;
  position: relative;
  z-index: 1;
}

.node-empty {
  font-size: 16px;
  color: #9ca3af;
  font-style: italic;
  position: relative;
  z-index: 1;
}

/* 进度信息 - 简洁显示 */
.progress-info {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
  margin-top: 4px;
}

.progress-percentage {
  font-size: 24px;
  font-weight: 800;
  color: #0a7d0a;
  background: rgba(10, 125, 10, 0.1);
  padding: 4px 12px;
  border-radius: 8px;
  border: 2px solid rgba(10, 125, 10, 0.2);
}

.progress-time {
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
}

/* 下一环节预告 */
.next-node-preview {
  margin-top: 4px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 10px;
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid #1d4ed8;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  position: relative;
  z-index: 1;
  animation: slideIn 0.5s ease-out;
}

.next-label {
  font-size: 14px;
  opacity: 0.9;
}

.next-name {
  font-size: 20px;
  font-weight: 800;
}

.next-time-range {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.15);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-left: 4px;
}


/* 颜色类 */
.text-success { color: #0a7d0a !important; }
.text-warning { color: #d97706 !important; }
.text-danger { color: #dc2626 !important; }
.text-gray { color: #6b7280 !important; }

/* 动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes dotPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.15);
  }
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes progressPulse {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(1.1);
  }
}

/* 节点切换动画 */
.node-changed {
  animation: nodeChangeGlow 0.8s ease-out;
}

@keyframes nodeChangeGlow {
  0% {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border-color: #e9ecef;
  }
  50% {
    box-shadow: 0 0 30px rgba(64, 158, 255, 0.6);
    border-color: #409eff;
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border-color: #e9ecef;
    transform: scale(1);
  }
}

/* 倒计时脉冲 */
.countdown-pulse .countdown-time {
  animation: countdownNumberPulse 0.3s ease;
}

@keyframes countdownNumberPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 响应式 */
@media (max-width: 992px) {
  .monitor-content {
    padding: 16px;
    gap: 16px;
  }

  .time-value-full {
    font-size: 72px;
  }

  .node-name {
    font-size: 28px;
  }

  .progress-percentage {
    font-size: 20px;
  }

  .next-name {
    font-size: 18px;
  }
}

@media (max-width: 768px) {
  .monitor-card {
    min-height: auto;
    border-radius: 12px;
  }

  .card-header {
    padding: 12px 16px;
  }

  .exam-name {
    font-size: 18px;
  }

  .header-right {
    width: 100%;
    justify-content: stretch;
  }

  .header-right .el-button {
    flex: 1;
    min-width: 0;
  }

  .time-value-full {
    font-size: 56px;
    letter-spacing: 3px;
  }

  .current-time-display {
    min-height: 140px;
  }

  .status-card {
    padding: 20px;
    min-height: 120px;
  }

  /* 移动端改为垂直布局 */
  .node-main {
    flex-direction: column;
    gap: 12px;
  }

  .node-tips {
    width: 100%;
  }

  .node-name {
    font-size: 26px;
  }

  .node-time-range {
    font-size: 14px;
    padding: 3px 8px;
  }

  .node-description {
    font-size: 15px;
  }

  .progress-percentage {
    font-size: 22px;
    padding: 3px 10px;
  }

  .progress-time {
    font-size: 13px;
  }

  .next-node-preview {
    padding: 8px 12px;
  }

  .next-name {
    font-size: 18px;
  }

  .next-time-range {
    font-size: 12px;
    padding: 2px 6px;
  }
}

@media (max-width: 480px) {
  .monitor-content {
    padding: 12px;
    gap: 12px;
  }

  .section {
    padding: 16px;
  }

  .section h3 {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .time-value-full {
    font-size: 40px;
    letter-spacing: 2px;
  }

  .current-time-display {
    min-height: 120px;
  }

  .status-card {
    padding: 16px;
    gap: 10px;
  }

  .node-name {
    font-size: 22px;
  }

  .node-time-range {
    font-size: 12px;
    padding: 2px 6px;
    width: 100%;
    text-align: center;
  }

  .node-description {
    font-size: 14px;
  }

  .progress-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .progress-percentage {
    font-size: 20px;
  }

  .progress-time {
    font-size: 12px;
  }

  .next-node-preview {
    padding: 8px 10px;
    flex-wrap: wrap;
  }

  .next-label {
    font-size: 12px;
  }

  .next-name {
    font-size: 16px;
  }

  .next-time-range {
    font-size: 11px;
    padding: 2px 6px;
    margin-left: 0;
    margin-top: 4px;
    width: 100%;
    text-align: center;
  }
}
</style>
