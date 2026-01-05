<template>
  <div class="exam-confirm">
    <el-card class="confirm-card">
      <template #header>
        <div class="card-header">
          <el-button link @click="$emit('cancel')">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="title">🎯 确认启动考试</span>
        </div>
      </template>

      <div v-if="template" class="confirm-content">
        <!-- 模板信息 -->
        <div class="section">
          <h3>模板信息</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="模板名称">
              {{ template.name }}
            </el-descriptions-item>
            <el-descriptions-item label="版本号">
              v{{ template.version }}
            </el-descriptions-item>
            <el-descriptions-item label="节点数量">
              {{ template.nodes.length }} 个
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 时间设置 -->
        <div class="section">
          <h3>考试时间设置</h3>
          <div class="time-setting">
            <div class="time-input-group">
              <el-input-number
                v-model="timeOffset"
                :min="-120"
                :max="120"
                :step="5"
                :disabled="useCurrentTime"
                @change="calculateStartTime"
              />
              <span class="unit">分钟</span>
              <el-button
                type="primary"
                plain
                @click="useCurrentTime = !useCurrentTime; calculateStartTime()"
              >
                {{ useCurrentTime ? '自定义时间' : '立即开始' }}
              </el-button>
            </div>

            <div class="time-display">
              <div class="label">开始时间：</div>
              <div class="time-value">
                {{ formatDateTime(startTime) }}
              </div>
            </div>

            <div class="time-display" v-if="!useCurrentTime">
              <div class="label">倒计时：</div>
              <div class="time-value countdown">
                {{ countdownText }}
              </div>
            </div>
          </div>
        </div>

        <!-- 关键节点预览 -->
        <div class="section">
          <h3>关键时间节点预览</h3>
          <el-timeline>
            <el-timeline-item
              v-for="node in sortedNodes"
              :key="node.name"
              :type="getNodeTimelineType(node, startTime)"
              :timestamp="formatNodeTime(node.offset, startTime)"
              placement="top"
            >
              <div class="timeline-item">
                <div class="node-name">{{ node.name }}</div>
                <div class="node-desc" v-if="node.description">{{ node.description }}</div>
                <div class="node-info">
                  <el-tag size="small" type="info">
                    {{ node.offset >= 0 ? `+${node.offset}` : node.offset }} 分钟
                  </el-tag>
                  <el-tag v-if="node.warnTime > 0" size="small" type="warning">
                    提前 {{ node.warnTime }} 分钟提醒
                  </el-tag>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 时间同步状态 -->
        <div class="section">
          <h3>时间同步状态</h3>
          <el-alert
            :title="syncStatus.message"
            :type="syncStatus.status === 'normal' ? 'success' : syncStatus.status === 'warning' ? 'warning' : 'error'"
            :closable="false"
            show-icon
          >
            <template #default>
              <div class="sync-details">
                <span>偏差: {{ formatOffset(syncStatus.offset) }}</span>
                <span v-if="syncStatus.lastSyncTime">
                  最后同步: {{ formatRelativeTime(syncStatus.lastSyncTime) }}
                </span>
              </div>
            </template>
          </el-alert>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <el-button size="large" @click="$emit('cancel')">取消</el-button>
          <el-button
            type="primary"
            size="large"
            :disabled="!canStartExam"
            @click="confirmStart"
          >
            确认启动
          </el-button>
        </div>
      </div>

      <el-empty v-else description="模板不存在" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useTemplateStore } from '@/stores/templateStore'
import { useTimeStore } from '@/stores/timeStore'
import { formatDateTime, formatNodeTime, formatOffset, formatRelativeTime } from '@/utils/formatter'
import type { Template, ProcessNode } from '@/stores/types'

const props = defineProps<{
  templateId: string
}>()

const emit = defineEmits(['confirm', 'cancel'])

const templateStore = useTemplateStore()
const timeStore = useTimeStore()

// 状态
const useCurrentTime = ref(true)
const timeOffset = ref(0)
const startTime = ref(new Date())
const countdownInterval = ref<number | null>(null)
const countdownText = ref('')

// 计算属性
const template = computed(() => {
  return templateStore.getLocalTemplate(props.templateId)
})

const sortedNodes = computed(() => {
  if (!template.value) return []
  return [...template.value.nodes].sort((a, b) => a.offset - b.offset)
})

const syncStatus = computed(() => {
  return timeStore.syncStatus
})

const canStartExam = computed(() => {
  return (
    template.value &&
    timeStore.isSynced &&
    (useCurrentTime.value || startTime.value > new Date())
  )
})

// 计算开始时间
function calculateStartTime() {
  if (useCurrentTime.value) {
    startTime.value = new Date()
  } else {
    const now = new Date()
    startTime.value = new Date(now.getTime() + timeOffset.value * 60 * 1000)
  }
}

// 获取时间轴类型
function getNodeTimelineType(node: ProcessNode, start: Date): string {
  const now = new Date()
  const nodeTime = new Date(start.getTime() + node.offset * 60 * 1000)

  if (nodeTime < now) return 'success'
  if (nodeTime.getTime() - now.getTime() < 60000) return 'warning'
  return 'info'
}

// 确认开始
function confirmStart() {
  emit('confirm', startTime.value)
}

// 更新倒计时
function updateCountdown() {
  if (useCurrentTime.value) {
    countdownText.value = '立即开始'
    return
  }

  const now = new Date()
  const diff = startTime.value.getTime() - now.getTime()

  if (diff <= 0) {
    countdownText.value = '时间已到'
    return
  }

  const seconds = Math.floor(diff / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  countdownText.value = `${mins} 分 ${secs} 秒`
}

// 启动倒计时
function startCountdown() {
  stopCountdown()
  countdownInterval.value = window.setInterval(updateCountdown, 1000)
  updateCountdown()
}

// 停止倒计时
function stopCountdown() {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
}

onMounted(() => {
  calculateStartTime()
  startCountdown()
})

onUnmounted(() => {
  stopCountdown()
})
</script>

<style scoped>
.exam-confirm {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.confirm-card {
  min-height: 500px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin-left: 12px;
  color: #409eff;
}

.confirm-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  border-left: 5px solid #409eff;
  padding-left: 12px;
}

/* 时间设置 */
.time-setting {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 10px;
  border: 2px solid #e4e7ed;
}

.time-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.time-input-group .el-input-number {
  width: 140px;
}

.unit {
  font-weight: 700;
  color: #606266;
  font-size: 16px;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.label {
  font-weight: 700;
  color: #606266;
  min-width: 90px;
  font-size: 15px;
}

.time-value {
  font-size: 22px;
  font-weight: 800;
  color: #409eff;
  letter-spacing: 1px;
}

.time-value.countdown {
  font-size: 24px;
  color: #e6a23c;
  background: #fef6e6;
  padding: 4px 12px;
  border-radius: 6px;
}

/* 时间轴预览 */
.timeline-item {
  padding: 12px 0;
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 2px solid #e4e7ed;
  margin-bottom: 10px;
}

.node-name {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 6px;
  color: #303133;
}

.node-desc {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.node-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 同步状态 */
.sync-details {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  font-size: 14px;
  color: #606266;
  flex-wrap: wrap;
}

.sync-details span {
  background: white;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
}

/* 操作按钮 */
.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid #e4e7ed;
}

.actions .el-button {
  min-width: 120px;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
}

/* 响应式 */
@media (max-width: 768px) {
  .title {
    font-size: 18px;
  }

  .section h3 {
    font-size: 16px;
  }

  .time-setting {
    padding: 16px;
  }

  .time-input-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .time-input-group .el-input-number {
    width: 100%;
  }

  .timeline-item {
    padding: 12px;
  }

  .node-name {
    font-size: 15px;
  }

  .sync-details {
    flex-direction: column;
    gap: 8px;
  }

  .actions {
    flex-direction: column;
    gap: 10px;
  }

  .actions .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .time-value {
    font-size: 18px;
  }

  .time-value.countdown {
    font-size: 20px;
  }

  .label {
    min-width: auto;
  }
}
</style>
