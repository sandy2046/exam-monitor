<template>
  <div id="app">
    <el-container class="main-container">
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-content">
          <div class="title">
            <span class="icon">📋</span>
            广商监考流程系统
          </div>
          <div class="actions">
            <!-- 时间同步状态显示 -->
            <el-button
              v-if="timeStore.syncStatus.status === 'syncing'"
              type="info"
              size="small"
              plain
              :loading="true"
            >
              时间同步中...
            </el-button>
            <el-button
              v-else-if="timeStore.isSynced"
              :type="timeStore.isNormal ? 'success' : timeStore.isWarning ? 'warning' : 'danger'"
              size="small"
              plain
              @click="showTimeInfo"
              :icon="timeStore.isNormal ? '✅' : timeStore.isWarning ? '⚠️' : '❌'"
            >
              {{ timeStore.syncStatus.sourceName || '时间' }}: {{ timeStore.syncStatus.offset.toFixed(1) }}s
            </el-button>
            <el-button
              v-else
              type="info"
              size="small"
              plain
              @click="syncTime"
            >
              ⏱️ 未同步
            </el-button>

            <el-button size="small" @click="syncTime" :loading="timeStore.isLoading && timeStore.syncStatus.status !== 'syncing'">
              {{ timeStore.isLoading ? '同步中...' : '同步时间' }}
            </el-button>
            <el-button size="small" @click="showSettings = true">⚙️ 设置</el-button>
          </div>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <!-- 首页/模板中心 -->
        <template v-if="currentView === 'home'">
          <TemplateCenter
            @start-exam="startExam"
            @edit-template="editTemplate"
            @view-settings="showSettings = true"
          />
        </template>

        <!-- 考试确认 -->
        <template v-else-if="currentView === 'confirm'">
          <ExamConfirm
            :template-id="selectedTemplateId"
            @confirm="confirmStartExam"
            @cancel="currentView = 'home'"
          />
        </template>

        <!-- 考试监控 -->
        <template v-else-if="currentView === 'monitor'">
          <ExamMonitor
            @end-exam="endExam"
            @pause-exam="pauseExam"
            @resume-exam="resumeExam"
            @skip-node="skipNode"
          />
        </template>

        <!-- 模板编辑 -->
        <template v-else-if="currentView === 'editor'">
          <TemplateEditor
            :template-id="editingTemplateId"
            @save="onTemplateSaved"
            @cancel="currentView = 'home'"
          />
        </template>
      </el-main>

      <!-- 提醒弹窗 -->
      <el-dialog
        v-model="showReminder"
        :title="reminder?.title"
        width="400px"
        :show-close="false"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        center
      >
        <div class="reminder-content">
          <div class="reminder-message">{{ reminder?.content }}</div>
          <div v-if="reminder?.nextNode" class="reminder-next">
            下一环节：{{ reminder.nextNode }}
          </div>
          <div v-if="reminder?.remainingTime" class="reminder-time">
            剩余时间：{{ formatCountdown(reminder.remainingTime) }}
          </div>
        </div>
        <template #footer>
          <el-button type="primary" @click="closeReminder" size="large">知道了</el-button>
        </template>
      </el-dialog>

      <!-- 设置弹窗 -->
      <el-dialog
        v-model="showSettings"
        title="设置"
        width="500px"
        destroy-on-close
      >
        <Settings @close="showSettings = false" />
      </el-dialog>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTimeStore } from '@/stores/timeStore'
import { useExamStore } from '@/stores/examStore'
import { formatCountdown } from '@/utils/formatter'
import { playReminder, playAlert } from '@/utils/audio'

// 组件
import TemplateCenter from '@/components/TemplateCenter.vue'
import ExamConfirm from '@/components/ExamConfirm.vue'
import ExamMonitor from '@/components/ExamMonitor.vue'
import TemplateEditor from '@/components/TemplateEditor.vue'
import Settings from '@/components/Settings.vue'

// Stores
const timeStore = useTimeStore()
const examStore = useExamStore()

// 视图状态
const currentView = ref<'home' | 'confirm' | 'monitor' | 'editor'>('home')
const selectedTemplateId = ref('')
const editingTemplateId = ref('')

// 弹窗状态
const showSettings = ref(false)
const showReminder = ref(false)
const reminder = ref<any>(null)

// 同步时间
async function syncTime() {
  const success = await timeStore.syncTime()
  if (success) {
    ElMessage.success('时间同步成功')
    // 启动自动同步
    timeStore.startAutoSync()
  } else {
    ElMessage.error('时间同步失败，请检查网络')
  }
}

// 页面加载时自动同步（带用户体验优化）
async function autoSyncOnLoad() {
  // 显示加载状态
  ElMessage.info('正在同步时间...')

  await timeStore.autoSyncOnLoad()

  const status = timeStore.syncStatus
  if (status.status === 'normal') {
    ElMessage.success(`时间同步成功 (${status.sourceName}, 偏差 ${status.offset.toFixed(2)}s)`)
    // 启动定时自动同步
    timeStore.startAutoSync()
  } else if (status.status === 'warning') {
    ElMessage.warning(`时间同步警告: ${status.message}`)
  } else if (status.status === 'error') {
    ElMessage.error(`时间同步失败: ${status.message}`)
  }
}

// 显示时间信息
function showTimeInfo() {
  const status = timeStore.syncStatus
  ElMessage.info(`时间偏差: ${status.message}`)
}

// 开始考试（进入确认页）
function startExam(templateId: string) {
  if (!timeStore.isSynced) {
    ElMessage.warning('请先同步时间')
    return
  }

  selectedTemplateId.value = templateId
  currentView.value = 'confirm'
}

// 确认开始考试
async function confirmStartExam(startTime?: Date) {
  const success = await examStore.startExam(selectedTemplateId.value, startTime)
  if (success) {
    currentView.value = 'monitor'
    ElMessage.success('考试已开始')
    // 播放开始声音
    playReminder()
  } else {
    ElMessage.error(examStore.error || '启动失败')
  }
}

// 编辑模板
function editTemplate(templateId: string) {
  editingTemplateId.value = templateId
  currentView.value = 'editor'
}

// 模板保存后
function onTemplateSaved() {
  ElMessage.success('模板已保存')
  currentView.value = 'home'
}

// 暂停考试
async function pauseExam() {
  const confirmed = await ElMessageBox.confirm(
    '确定要暂停考试吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).catch(() => false)

  if (confirmed) {
    if (examStore.pauseExam()) {
      ElMessage.warning('考试已暂停')
      playAlert()
    }
  }
}

// 继续考试
async function resumeExam() {
  const confirmed = await ElMessageBox.confirm(
    '确定要继续考试吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    }
  ).catch(() => false)

  if (confirmed) {
    if (examStore.resumeExam()) {
      ElMessage.success('考试继续')
      playReminder()
    }
  }
}

// 跳过节点
async function skipNode() {
  const confirmed = await ElMessageBox.confirm(
    '确定要跳过当前环节吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).catch(() => false)

  if (confirmed) {
    if (examStore.skipCurrentNode()) {
      ElMessage.success('已跳过')
      playAlert()
    }
  }
}

// 结束考试
async function endExam() {
  const confirmed = await ElMessageBox.confirm(
    '确定要结束考试吗？此操作将记录考试结束时间。',
    '警告',
    {
      confirmButtonText: '结束考试',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    }
  ).catch(() => false)

  if (confirmed) {
    if (examStore.endExam()) {
      ElMessage.success('考试已结束')
      playAlert()
      currentView.value = 'home'
    }
  }
}

// 关闭提醒
function closeReminder() {
  showReminder.value = false
  reminder.value = null
}

// 监听提醒变化
watch(
  () => examStore.currentReminder,
  (newReminder) => {
    if (newReminder) {
      reminder.value = newReminder
      showReminder.value = true
    }
  }
)

// 监听是否有活跃考试
onMounted(async () => {
  // 尝试恢复考试
  if (examStore.hasActiveExam) {
    const confirmed = await ElMessageBox.confirm(
      '检测到有未完成的考试，是否恢复？',
      '恢复考试',
      {
        confirmButtonText: '恢复',
        cancelButtonText: '放弃',
        type: 'info',
      }
    ).catch(() => false)

    if (confirmed) {
      currentView.value = 'monitor'
      ElMessage.success('已恢复考试')
    } else {
      examStore.stopTimers()
      examStore.examState = null
    }
  }

  // 页面加载时自动同步时间（带用户体验优化）
  await autoSyncOnLoad()
})

onUnmounted(() => {
  // 清理定时器
  timeStore.stopAutoSync()
  examStore.stopTimers()
})
</script>

<style scoped>
.main-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  color: #333;
  display: flex;
  align-items: center;
  padding: 12px 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: #409eff;
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.icon {
  font-size: 28px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.reminder-content {
  text-align: center;
  padding: 24px 0;
}

.reminder-message {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #409eff;
  line-height: 1.4;
}

.reminder-next {
  font-size: 18px;
  margin: 10px 0;
  color: #303133;
  font-weight: 600;
}

.reminder-time {
  font-size: 16px;
  color: #606266;
  font-weight: 500;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .header {
    padding: 10px 16px;
  }

  .title {
    font-size: 18px;
  }

  .icon {
    font-size: 22px;
  }

  .actions {
    gap: 6px;
  }

  .main-content {
    padding: 16px;
  }

  .reminder-message {
    font-size: 18px;
  }

  .reminder-next {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .actions {
    width: 100%;
    justify-content: stretch;
  }

  .actions .el-button {
    flex: 1;
    min-width: 0;
  }
}
</style>
