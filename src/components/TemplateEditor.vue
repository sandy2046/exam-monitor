<template>
  <div class="template-editor">
    <el-card class="editor-card">
      <template #header>
        <div class="card-header">
          <el-button link @click="$emit('cancel')">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="title">✏️ 编辑模板</span>
        </div>
      </template>

      <div v-if="template" class="editor-content">
        <!-- 基本信息 -->
        <div class="section">
          <h3>基本信息</h3>
          <el-form :model="template" label-width="100px">
            <el-form-item label="模板名称">
              <el-input v-model="template.name" placeholder="输入模板名称" />
            </el-form-item>
            <el-form-item label="版本号">
              <el-input v-model="template.version" placeholder="如：1.0" />
            </el-form-item>
          </el-form>
        </div>

        <!-- 流程节点 -->
        <div class="section">
          <h3>流程节点</h3>
          <div class="nodes-list">
            <div
              v-for="(node, index) in template.nodes"
              :key="index"
              class="node-item"
            >
              <div class="node-header">
                <span class="node-index">节点 {{ index + 1 }}</span>
                <el-button
                  type="danger"
                  link
                  size="small"
                  @click="removeNode(index)"
                >
                  删除
                </el-button>
              </div>

              <div class="node-form">
                <el-row :gutter="12">
                  <el-col :span="8">
                    <el-input
                      v-model="node.name"
                      placeholder="节点名称"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="6">
                    <el-input-number
                      v-model="node.offset"
                      :min="-180"
                      :max="180"
                      :step="5"
                      size="small"
                      style="width: 100%;"
                    />
                    <div class="unit-label">分钟</div>
                  </el-col>
                  <el-col :span="6">
                    <el-input-number
                      v-model="node.warnTime"
                      :min="0"
                      :max="10"
                      :step="1"
                      size="small"
                      style="width: 100%;"
                    />
                    <div class="unit-label">提前提醒</div>
                  </el-col>
                </el-row>

                <el-row :gutter="12" style="margin-top: 8px;">
                  <el-col :span="24">
                    <el-input
                      v-model="node.description"
                      placeholder="提醒内容描述（可选）"
                      size="small"
                      type="textarea"
                      :rows="2"
                    />
                  </el-col>
                </el-row>

                <div class="node-preview">
                  <el-tag size="small" type="info">
                    {{ node.offset >= 0 ? `+${node.offset}` : node.offset }} 分钟
                  </el-tag>
                  <span class="preview-text" v-if="node.warnTime > 0">
                    提前 {{ node.warnTime }} 分钟提醒
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="add-node-actions">
            <el-button type="primary" @click="addNode" :icon="Plus">
              添加节点
            </el-button>
            <el-button @click="sortNodes" :icon="Sort">
              按时间排序
            </el-button>
          </div>
        </div>

        <!-- 预览 -->
        <div class="section">
          <h3>预览</h3>
          <el-empty v-if="template.nodes.length === 0" description="暂无节点" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="node in sortedNodes"
              :key="node.name"
              :timestamp="`${node.offset >= 0 ? '+' : ''}${node.offset} 分钟`"
              placement="top"
            >
              <div class="preview-item">
                <div class="preview-name">{{ node.name }}</div>
                <div class="preview-desc" v-if="node.description">
                  {{ node.description }}
                </div>
                <div class="preview-warn" v-if="node.warnTime > 0">
                  <el-tag size="small" type="warning">
                    提前 {{ node.warnTime }} 分钟提醒
                  </el-tag>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <el-button size="large" @click="$emit('cancel')">取消</el-button>
          <el-button type="primary" size="large" @click="saveTemplate" :icon="Check">
            保存模板
          </el-button>
        </div>
      </div>

      <el-empty v-else description="模板不存在" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Sort, Check } from '@element-plus/icons-vue'
import { useTemplateStore } from '@/stores/templateStore'
import type { Template, ProcessNode } from '@/stores/types'
import { deepClone } from '@/utils/formatter'

const props = defineProps<{
  templateId: string
}>()

const emit = defineEmits(['save', 'cancel'])

const templateStore = useTemplateStore()

// 本地副本，避免直接修改store
const template = ref<Template | null>(null)

// 排序后的节点（用于预览）
const sortedNodes = computed(() => {
  if (!template.value) return []
  return [...template.value.nodes].sort((a, b) => a.offset - b.offset)
})

// 加载模板
function loadTemplate() {
  const original = templateStore.getLocalTemplate(props.templateId)
  if (original) {
    template.value = deepClone(original)
  }
}

// 添加节点
function addNode() {
  if (!template.value) return

  const newNode: ProcessNode = {
    name: '新节点',
    offset: 0,
    warnTime: 0,
    description: '',
  }

  template.value.nodes.push(newNode)
}

// 删除节点
function removeNode(index: number) {
  if (!template.value) return

  ElMessageBox.confirm(
    '确定要删除这个节点吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    template.value!.nodes.splice(index, 1)
    ElMessage.success('节点已删除')
  }).catch(() => {})
}

// 排序节点
function sortNodes() {
  if (!template.value) return

  template.value.nodes.sort((a, b) => a.offset - b.offset)
  ElMessage.success('节点已按时间排序')
}

// 保存模板
function saveTemplate() {
  if (!template.value) return

  // 验证
  if (!template.value.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }

  if (template.value.nodes.length === 0) {
    ElMessage.warning('至少添加一个节点')
    return
  }

  // 检查节点名称是否重复
  const names = template.value.nodes.map(n => n.name)
  const uniqueNames = new Set(names)
  if (uniqueNames.size !== names.length) {
    ElMessage.warning('节点名称不能重复')
    return
  }

  // 保存
  const success = templateStore.updateLocalTemplate(template.value)
  if (success) {
    ElMessage.success('模板已保存')
    emit('save')
  } else {
    ElMessage.error('保存失败')
  }
}

onMounted(() => {
  loadTemplate()
})
</script>

<style scoped>
.template-editor {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.editor-card {
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

.editor-content {
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

.nodes-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.node-item {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 16px;
  border-radius: 10px;
  border: 2px solid #e4e7ed;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.node-index {
  font-weight: 700;
  color: #409eff;
  font-size: 16px;
}

.node-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unit-label {
  font-size: 12px;
  color: #909399;
  font-weight: 600;
  margin-top: 2px;
}

.node-preview {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
  flex-wrap: wrap;
}

.preview-text {
  background: #fef6e6;
  padding: 4px 8px;
  border-radius: 6px;
  color: #e6a23c;
  font-weight: 600;
}

.add-node-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.preview-item {
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 2px solid #e4e7ed;
  margin-bottom: 10px;
}

.preview-name {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 6px;
  color: #303133;
}

.preview-desc {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.preview-warn {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

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

  .node-item {
    padding: 12px;
  }

  .add-node-actions {
    flex-direction: column;
  }

  .add-node-actions .el-button {
    width: 100%;
  }

  .actions {
    flex-direction: column;
    gap: 10px;
  }

  .actions .el-button {
    width: 100%;
  }

  .preview-item {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .node-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .node-form :deep(.el-row) {
    flex-direction: column;
  }

  .node-form :deep(.el-col) {
    width: 100%;
    margin-bottom: 8px;
  }
}
</style>
