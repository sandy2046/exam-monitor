<template>
  <div class="settings">
    <!-- 提醒设置 -->
    <div class="section">
      <h3>提醒设置</h3>
      <el-form :model="settings" label-width="140px">
        <el-form-item label="提前提醒时间">
          <el-input-number
            v-model="settings.warnTime"
            :min="1"
            :max="10"
            :step="1"
          />
          <span class="unit">分钟</span>
        </el-form-item>

        <el-form-item label="声音提醒">
          <el-switch v-model="settings.soundEnabled" />
        </el-form-item>
      </el-form>
    </div>

    <!-- 网络设置 -->
    <div class="section">
      <h3>网络设置</h3>
      <el-form :model="settings" label-width="140px">
        <el-form-item label="远程API地址">
          <el-input
            v-model="settings.apiEndpoint"
            placeholder="https://your-api.com/api"
          />
          <div class="form-help">
            用于同步远程模板，MVP阶段可使用静态JSON
          </div>
        </el-form-item>

        <el-form-item label="时间同步服务">
          <el-select v-model="settings.timeApi" placeholder="选择服务">
            <el-option label="World Time API" value="worldtimeapi" />
            <el-option label="自定义NTP代理" value="custom" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据管理 -->
    <div class="section">
      <h3>数据管理</h3>
      <div class="data-actions">
        <el-button type="primary" @click="exportData" :icon="Download">
          导出所有数据
        </el-button>
        <el-button @click="showImportDialog = true" :icon="Upload">
          导入数据
        </el-button>
        <el-button type="danger" @click="clearAllData" :icon="Delete">
          清空所有数据
        </el-button>
      </div>

      <div class="data-info">
        <el-alert
          title="提示：导出的数据包含所有模板、考试记录和设置，可用于备份或在其他设备上使用"
          type="info"
          :closable="false"
        />
      </div>
    </div>

    <!-- 关于 -->
    <div class="section">
      <h3>关于</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="应用名称">
          监考流程提醒助手
        </el-descriptions-item>
        <el-descriptions-item label="版本">
          v1.0.0
        </el-descriptions-item>
        <el-descriptions-item label="文档版本">
          v2.0
        </el-descriptions-item>
        <el-descriptions-item label="技术栈">
          Vue 3 + TypeScript + Element Plus + Pinia
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <el-button @click="$emit('close')">关闭</el-button>
      <el-button type="primary" @click="saveSettings" :icon="Check">
        保存设置
      </el-button>
    </div>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入数据"
      width="500px"
      destroy-on-close
    >
      <div class="import-content">
        <el-upload
          v-model:file-list="fileList"
          :auto-upload="false"
          :on-change="handleFileChange"
          :limit="1"
          accept=".json"
          drag
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">
            拖拽文件到此处或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              只能上传 .json 文件，且不超过 1MB
            </div>
          </template>
        </el-upload>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportDialog = false">取消</el-button>
          <el-button type="primary" @click="importData" :disabled="!importFileContent">
            确认导入
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Upload, Delete, Check } from '@element-plus/icons-vue'
import { storageService } from '@/services/storageService'
import type { UploadFile, UploadFiles } from 'element-plus'

const emit = defineEmits(['close'])

// 设置
const settings = ref({
  warnTime: 5,
  soundEnabled: true,
  apiEndpoint: 'https://worldtimeapi.org/api/ip',
  timeApi: 'worldtimeapi',
})

// 导入相关
const showImportDialog = ref(false)
const fileList = ref<UploadFile[]>([])
const importFileContent = ref<string>('')

// 加载设置
function loadSettings() {
  const saved = storageService.getSettings()
  settings.value = { ...settings.value, ...saved }
}

// 保存设置
function saveSettings() {
  storageService.saveSettings(settings.value)
  ElMessage.success('设置已保存')
}

// 导出数据
function exportData() {
  const data = storageService.exportAllData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `exam-monitor-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('数据已导出')
}

// 处理文件选择
function handleFileChange(uploadFile: UploadFile, uploadFiles: UploadFiles) {
  if (uploadFile.raw) {
    const reader = new FileReader()
    reader.onload = (e) => {
      importFileContent.value = e.target?.result as string
    }
    reader.readAsText(uploadFile.raw)
  }
}

// 导入数据
function importData() {
  if (!importFileContent.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  ElMessageBox.confirm(
    '导入数据将覆盖现有数据，确定继续吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    const success = storageService.importAllData(importFileContent.value)
    if (success) {
      ElMessage.success('数据导入成功')
      showImportDialog.value = false
      fileList.value = []
      importFileContent.value = ''
      // 重新加载设置
      loadSettings()
    } else {
      ElMessage.error('数据导入失败，请检查文件格式')
    }
  }).catch(() => {})
}

// 清空所有数据
function clearAllData() {
  ElMessageBox.confirm(
    '此操作将清空所有数据，包括模板、考试记录和设置，确定继续吗？',
    '严重警告',
    {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    }
  ).then(() => {
    storageService.clearAll()
    ElMessage.success('所有数据已清空')
    loadSettings()
  }).catch(() => {})
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.section {
  margin-bottom: 28px;
}

.section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  border-left: 5px solid #409eff;
  padding-left: 12px;
}

.unit {
  margin-left: 8px;
  color: #606266;
  font-weight: 700;
  font-size: 14px;
}

.form-help {
  font-size: 13px;
  color: #909399;
  margin-top: 6px;
  line-height: 1.4;
}

.data-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.data-actions .el-button {
  font-weight: 600;
  padding: 10px 16px;
}

.data-info {
  margin-top: 12px;
}

.import-content {
  padding: 24px 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 2px solid #e4e7ed;
}

.actions .el-button {
  min-width: 100px;
  font-weight: 600;
  padding: 12px 20px;
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 20px;
}

:deep(.el-upload__text) {
  font-size: 15px;
  font-weight: 600;
}

:deep(.el-upload__tip) {
  font-size: 13px;
  margin-top: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .section h3 {
    font-size: 16px;
  }

  .data-actions {
    flex-direction: column;
  }

  .data-actions .el-button {
    width: 100%;
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
  :deep(.el-upload-dragger) {
    padding: 30px 16px;
  }
}
</style>
