<template>
  <div class="template-center">
    <!-- 操作栏 -->
    <el-card class="action-bar">
      <div class="action-content">
        <div class="left-actions">
          <el-button type="primary" @click="syncTemplates" :loading="templateStore.isLoading">
            <el-icon><Refresh /></el-icon>
            同步远程模板
          </el-button>
          <el-button @click="createLocalTemplate">
            <el-icon><Plus /></el-icon>
            创建本地模板
          </el-button>
          <el-button type="success" @click="createTestTemplate" :icon="MagicStick" plain>
            20秒测试模板
          </el-button>
        </div>
        <div class="right-actions">
          <el-button text @click="showStorageInfo" :icon="InfoFilled">存储信息</el-button>
          <el-button text @click="$emit('view-settings')">⚙️ 设置</el-button>
          <el-button text type="danger" @click="resetAllData">🔄 重置</el-button>
        </div>
      </div>
    </el-card>

    <!-- 远程模板列表 -->
    <el-card class="section-card" v-if="templateStore.hasRemoteTemplates">
      <template #header>
        <div class="card-header">
          <span>📥 可下载模板（远程）</span>
          <span class="count">共 {{ templateStore.remoteTemplates.length }} 个</span>
        </div>
      </template>

      <div class="template-list">
        <div
          v-for="template in templateStore.remoteTemplates"
          :key="template.id"
          class="template-item"
        >
          <div class="template-info">
            <div class="template-name">{{ template.name }}</div>
            <div class="template-meta">
              <el-tag size="small" type="info">v{{ template.version }}</el-tag>
              <span class="meta-text">节点: {{ template.nodes.length }}</span>
              <span class="meta-text" v-if="template.publishedAt">
                {{ formatDate(template.publishedAt) }}
              </span>
              <el-tag
                v-if="isDownloaded(template.id)"
                size="small"
                type="success"
              >
                已下载
              </el-tag>
              <el-tag
                v-else-if="checkForUpdate(template.id)"
                size="small"
                type="warning"
              >
                有更新
              </el-tag>
            </div>
          </div>
          <div class="template-actions">
            <el-button
              v-if="!isDownloaded(template.id)"
              type="primary"
              size="small"
              @click="downloadTemplate(template.id)"
            >
              下载
            </el-button>
            <el-button
              v-else
              type="success"
              size="small"
              @click="downloadTemplate(template.id)"
            >
              重新下载
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 无远程模板提示 -->
    <el-empty
      v-else
      description="暂无远程模板，请先同步"
      style="background: white; border-radius: 8px;"
    >
      <el-button type="primary" @click="syncTemplates" :loading="templateStore.isLoading">
        同步模板
      </el-button>
    </el-empty>

    <!-- 已下载模板列表 -->
    <el-card class="section-card" v-if="templateStore.hasLocalTemplates">
      <template #header>
        <div class="card-header">
          <span>💾 已下载模板（本地）</span>
          <span class="count">
            共 {{ templateStore.localTemplates.length }} 个
            <span v-if="templateStore.modifiedCount > 0">
              ({{ templateStore.modifiedCount }} 个已修改)
            </span>
          </span>
        </div>
      </template>

      <div class="template-list">
        <div
          v-for="template in templateStore.localTemplates"
          :key="template.id"
          class="template-item"
        >
          <div class="template-info">
            <div class="template-name">
              {{ template.name }}
              <el-tag
                v-if="template.isModified"
                size="small"
                type="warning"
                style="margin-left: 8px;"
              >
                已修改
              </el-tag>
            </div>
            <div class="template-meta">
              <el-tag size="small" type="info">v{{ template.version }}</el-tag>
              <span class="meta-text">节点: {{ template.nodes.length }}</span>
              <span class="meta-text" v-if="template.remoteId">
                来源: {{ getRemoteTemplateName(template.remoteId) }}
              </span>
              <span class="meta-text" v-if="template.lastSync">
                最后同步: {{ formatRelativeTime(new Date(template.lastSync)) }}
              </span>
            </div>
          </div>
          <div class="template-actions">
            <el-button type="success" size="small" @click="startExam(template.id)">
              开始考试
            </el-button>
            <el-button size="small" @click="editTemplate(template.id)">
              编辑副本
            </el-button>
            <el-button type="danger" size="small" @click="deleteTemplate(template.id)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 无本地模板提示 -->
    <el-empty
      v-else
      description="暂无已下载的模板"
      style="background: white; border-radius: 8px; margin-top: 20px;"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElDialog, ElButton } from 'element-plus'
import { Refresh, Plus, MagicStick, InfoFilled } from '@element-plus/icons-vue'
import { useTemplateStore } from '@/stores/templateStore'
import { formatRelativeTime, generateId } from '@/utils/formatter'
import type { Template } from '@/stores/types'

const emit = defineEmits(['start-exam', 'edit-template', 'view-settings'])
const templateStore = useTemplateStore()

// 同步远程模板
async function syncTemplates() {
  const settings = JSON.parse(localStorage.getItem('exam_monitor_settings') || '{}')
  const apiEndpoint = settings.apiEndpoint || 'https://worldtimeapi.org/api/ip'

  const success = await templateStore.syncRemoteTemplates(apiEndpoint)
  if (success) {
    ElMessage.success('模板同步成功')
  } else {
    ElMessage.error(templateStore.error || '同步失败')
  }
}

// 下载模板
function downloadTemplate(templateId: string) {
  const success = templateStore.downloadTemplate(templateId)
  if (success) {
    ElMessage.success('模板下载成功')
  } else {
    ElMessage.error(templateStore.error || '下载失败')
  }
}

// 创建本地模板
function createLocalTemplate() {
  // 生成唯一ID
  const newId = `local-${Date.now()}`
  const newTemplate = {
    id: newId,
    name: '新考试模板',
    version: '1.0',
    nodes: [
      { name: '考生入场', offset: -30, warnTime: 5, description: '清点人数' },
      { name: '发卷', offset: 0, warnTime: 0, description: '分发试卷' },
    ],
    isModified: true,
  }

  templateStore.localTemplates.push(newTemplate)
  templateStore.saveToStorage()
  templateStore.loadFromStorage() // 强制刷新

  // 验证并提示
  const verify = templateStore.getLocalTemplate(newId)
  if (verify) {
    ElMessage.success('本地模板创建成功')
    // 进入编辑模式
    emit('edit-template', newId)
  } else {
    ElMessage.error('创建失败，请重试')
  }
}

// 创建测试模板（20秒间隔）
function createTestTemplate() {
  const newId = `test-${Date.now()}`
  const newTemplate = {
    id: newId,
    name: '测试模板 - 20秒间隔',
    version: '1.0',
    nodes: [
      // 使用秒为单位，转换为分钟：20秒 = 0.333分钟
      // 为了测试方便，我们使用分钟的小数
      { name: '考生入场', offset: 0, warnTime: 0, description: '测试阶段1 - 20秒后进入下一阶段', tips: '核对证件、清点人数' },
      { name: '发卷', offset: 0.333, warnTime: 0, description: '测试阶段2 - 20秒后进入下一阶段', tips: '检查密封、分发试卷' },
      { name: '宣读规则', offset: 0.667, warnTime: 0, description: '测试阶段3 - 20秒后进入下一阶段', tips: '声音洪亮、重点强调' },
      { name: '开始考试', offset: 1.0, warnTime: 0, description: '测试阶段4 - 20秒后进入下一阶段', tips: '提醒时间、检查文具' },
      { name: '中途检查', offset: 1.333, warnTime: 0, description: '测试阶段5 - 20秒后进入下一阶段', tips: '巡视考场、关注异常' },
      { name: '提醒收卷', offset: 1.667, warnTime: 0, description: '测试阶段6 - 20秒后进入下一阶段', tips: '提前15分钟提醒' },
      { name: '考试结束', offset: 2.0, warnTime: 0, description: '测试阶段7 - 测试结束', tips: '清点试卷、签字确认' },
    ],
    isModified: true,
  }

  // 使用 store 的方法添加模板
  templateStore.localTemplates.push(newTemplate)
  templateStore.saveToStorage()

  // 强制重新加载验证
  templateStore.loadFromStorage()

  // 验证是否保存成功
  const verify = templateStore.getLocalTemplate(newId)

  if (verify) {
    ElMessage.success('测试模板已生成！20秒间隔，共7个节点')
    ElMessage.info('请在"已下载模板"区域查看')

    // 自动滚动到本地模板区域
    setTimeout(() => {
      const localCards = document.querySelectorAll('.section-card')
      if (localCards.length > 1 && localCards[1]) {
        // 第二个卡片是本地模板区域
        (localCards[1] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  } else {
    ElMessage.error('模板生成失败，请重试')
  }
}

// 编辑模板
function editTemplate(templateId: string) {
  emit('edit-template', templateId)
}

// 开始考试
function startExam(templateId: string) {
  emit('start-exam', templateId)
}

// 删除模板
async function deleteTemplate(templateId: string) {
  const confirmed = await ElMessageBox.confirm(
    '确定要删除这个模板吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).catch(() => false)

  if (confirmed) {
    templateStore.deleteLocalTemplate(templateId)
    ElMessage.success('模板已删除')
  }
}

// 检查是否已下载
function isDownloaded(remoteId: string): boolean {
  return templateStore.localTemplates.some(t => t.remoteId === remoteId)
}

// 检查是否有更新
function checkForUpdate(remoteId: string): boolean {
  return templateStore.checkForUpdates(remoteId)
}

// 获取远程模板名称
function getRemoteTemplateName(remoteId: string): string {
  const template = templateStore.remoteTemplates.find(t => t.id === remoteId)
  return template ? template.name : '未知'
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 显示存储信息
function showStorageInfo() {
  const remoteCount = templateStore.remoteTemplates.length
  const localCount = templateStore.localTemplates.length

  // 从 localStorage 获取原始数据
  const rawRemote = localStorage.getItem('exam_monitor_remote_templates')
  const rawLocal = localStorage.getItem('exam_monitor_local_templates')

  const remoteData = rawRemote ? JSON.parse(rawRemote) : []
  const localData = rawLocal ? JSON.parse(rawLocal) : []

  let message = `
    <div style="text-align: left; line-height: 1.8; font-size: 13px;">
      <strong>📊 存储状态：</strong><br/><br/>
      远程模板：${remoteCount} 个 (Store) / ${remoteData.length} 个 (Storage)<br/>
      本地模板：${localCount} 个 (Store) / ${localData.length} 个 (Storage)<br/><br/>
      <strong>📋 本地模板详情：</strong><br/>
  `

  if (localData.length === 0) {
    message += '暂无本地模板<br/>'
  } else {
    localData.forEach((t: Template, i: number) => {
      const isModified = t.isModified ? '✏️' : ''
      const nodes = t.nodes?.length || 0
      message += `${i + 1}. ${isModified} ${t.name}<br/>`
      message += `  ID: ${t.id}<br/>`
      message += `  节点数: ${nodes} | 版本: ${t.version}<br/>`
      if (t.remoteId) {
        message += `  来源: ${t.remoteId}<br/>`
      }
      message += '<br/>'
    })
  }

  message += '</div>'

  ElMessageBox.alert(message, '存储信息 (点击确定刷新)', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '刷新并关闭',
    type: 'info',
  }).then(() => {
    // 刷新数据
    templateStore.loadFromStorage()
    ElMessage.success('数据已刷新')
  }).catch(() => {
    // 取消时也刷新
    templateStore.loadFromStorage()
  })
}

// 清空并重置所有数据（调试用）
function resetAllData() {
  ElMessageBox.confirm(
    '确定要清空所有数据吗？这将删除所有模板和设置！',
    '严重警告',
    {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    localStorage.clear()
    templateStore.loadFromStorage()
    ElMessage.success('所有数据已清空，请刷新页面')
    setTimeout(() => location.reload(), 1000)
  }).catch(() => {
    ElMessage.info('操作已取消')
  })
}

// 初始化
onMounted(() => {
  // 确保从存储加载最新数据
  templateStore.loadFromStorage()

  // 如果没有远程模板，自动同步一次
  if (!templateStore.hasRemoteTemplates) {
    // 不自动同步，让用户手动操作
  }
})
</script>

<style scoped>
.template-center {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.action-bar {
  margin-bottom: 24px;
}

.action-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.left-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.right-actions {
  display: flex;
  gap: 8px;
}

.section-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 16px;
}

.count {
  font-size: 14px;
  color: #909399;
  font-weight: normal;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 10px;
  border: 2px solid #e4e7ed;
  transition: all 0.3s;
  min-height: 80px;
}

.template-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  transform: translateY(-2px);
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.template-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.meta-text {
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}

.template-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 空状态优化 */
:deep(.el-empty__description) {
  font-size: 16px;
  color: #909399;
}

:deep(.el-empty__bottom) {
  margin-top: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .template-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .template-actions {
    width: 100%;
    justify-content: stretch;
  }

  .template-actions .el-button {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 480px) {
  .action-content {
    flex-direction: column;
    align-items: stretch;
  }

  .left-actions,
  .right-actions {
    width: 100%;
    justify-content: stretch;
  }

  .left-actions .el-button,
  .right-actions .el-button {
    flex: 1;
  }

  .template-name {
    font-size: 16px;
  }
}
</style>
