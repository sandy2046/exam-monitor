/**
 * 模板管理 Store
 * 管理远程和本地模板
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storageService } from '@/services/storageService'
import type { Template } from '@/stores/types'
import axios from 'axios'

export const useTemplateStore = defineStore('template', () => {
  // 状态
  const remoteTemplates = ref<Template[]>([])
  const localTemplates = ref<Template[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 从本地加载模板
   */
  function loadFromStorage(): void {
    remoteTemplates.value = storageService.getRemoteTemplates()
    localTemplates.value = storageService.getLocalTemplates()
  }

  /**
   * 保存到本地
   */
  function saveToStorage(): void {
    storageService.saveRemoteTemplates(remoteTemplates.value)
    storageService.saveLocalTemplates(localTemplates.value)
  }

  /**
   * 同步远程模板
   * @param apiEndpoint 远程API地址
   */
  async function syncRemoteTemplates(apiEndpoint: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      // 从本地 JSON 文件加载 CET 模板
      const response = await fetch('/templates/cet-templates.json')
      const cetTemplates: Template[] = await response.json()

      // 合并演示模板和 CET 模板
      const demoTemplates: Template[] = [
        {
          id: 'math-2025',
          name: '高考数学考试',
          version: '1.2',
          publishedAt: '2025-06-01T00:00:00Z',
          nodes: [
            { name: '考生入场', offset: -30, warnTime: 5, description: '清点人数、核对证件', tips: '核对证件、安排座位' },
            { name: '发卷', offset: 0, warnTime: 0, description: '分发试卷、答题卡', tips: '检查密封、核对份数' },
            { name: '宣读注意事项', offset: 5, warnTime: 0, description: '宣读考试纪律', tips: '声音洪亮、重点强调' },
            { name: '开始考试', offset: 15, warnTime: 0, description: '正式开始答题', tips: '提醒时间、关闭手机' },
            { name: '提醒收卷', offset: 105, warnTime: 5, description: '准备收卷', tips: '提前15分钟提醒' },
            { name: '收卷', offset: 110, warnTime: 0, description: '收取试卷', tips: '清点试卷、核对份数' },
          ],
        },
        {
          id: 'english-2025',
          name: '英语听力考试',
          version: '1.0',
          publishedAt: '2025-05-15T00:00:00Z',
          nodes: [
            { name: '设备调试', offset: -15, warnTime: 5, description: '检查听力设备', tips: '检查设备、调试频率' },
            { name: '试音', offset: -5, warnTime: 0, description: '试音环节', tips: '确认音质清晰' },
            { name: '开始听力', offset: 0, warnTime: 0, description: '开始播放', tips: '控制音量、注意时间' },
            { name: '结束', offset: 25, warnTime: 0, description: '听力结束', tips: '整理设备、清点材料' },
          ],
        },
      ]

      remoteTemplates.value = [...demoTemplates, ...cetTemplates]
      saveToStorage()

      return true
    } catch (err) {
      // 如果加载失败，使用默认演示数据
      console.warn('加载CET模板失败，使用默认数据:', err)
      const demoTemplates: Template[] = [
        {
          id: 'math-2025',
          name: '高考数学考试',
          version: '1.2',
          publishedAt: '2025-06-01T00:00:00Z',
          nodes: [
            { name: '考生入场', offset: -30, warnTime: 5, description: '清点人数、核对证件', tips: '核对证件、安排座位' },
            { name: '发卷', offset: 0, warnTime: 0, description: '分发试卷、答题卡', tips: '检查密封、核对份数' },
            { name: '宣读注意事项', offset: 5, warnTime: 0, description: '宣读考试纪律', tips: '声音洪亮、重点强调' },
            { name: '开始考试', offset: 15, warnTime: 0, description: '正式开始答题', tips: '提醒时间、关闭手机' },
            { name: '提醒收卷', offset: 105, warnTime: 5, description: '准备收卷', tips: '提前15分钟提醒' },
            { name: '收卷', offset: 110, warnTime: 0, description: '收取试卷', tips: '清点试卷、核对份数' },
          ],
        },
      ]
      remoteTemplates.value = demoTemplates
      saveToStorage()
      error.value = '使用默认模板数据'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 下载模板到本地
   */
  function downloadTemplate(templateId: string): boolean {
    const template = remoteTemplates.value.find(t => t.id === templateId)
    if (!template) {
      error.value = '模板不存在'
      return false
    }

    // 检查是否已下载
    const existingIndex = localTemplates.value.findIndex(t => t.remoteId === templateId)

    if (existingIndex >= 0) {
      // 更新已下载的模板
      localTemplates.value[existingIndex] = {
        ...template,
        id: `${templateId}-local`,
        remoteId: templateId,
        isModified: false,
        lastSync: new Date().toISOString(),
      }
    } else {
      // 新增下载
      localTemplates.value.push({
        ...template,
        id: `${templateId}-local`,
        remoteId: templateId,
        isModified: false,
        lastSync: new Date().toISOString(),
      })
    }

    saveToStorage()
    return true
  }

  /**
   * 创建本地副本（可编辑）
   */
  function createLocalCopy(templateId: string): string {
    const template = localTemplates.value.find(t => t.id === templateId)
    if (!template) {
      error.value = '模板不存在'
      return ''
    }

    const newId = `${templateId}-copy-${Date.now()}`
    const newTemplate: Template = {
      ...template,
      id: newId,
      name: `${template.name} - 本地副本`,
      remoteId: template.remoteId,
      isModified: true,
    }

    localTemplates.value.push(newTemplate)
    saveToStorage()

    return newId
  }

  /**
   * 更新本地模板
   */
  function updateLocalTemplate(template: Template): boolean {
    const index = localTemplates.value.findIndex(t => t.id === template.id)
    if (index < 0) {
      error.value = '模板不存在'
      return false
    }

    localTemplates.value[index] = {
      ...template,
      isModified: true,
    }

    saveToStorage()
    return true
  }

  /**
   * 删除本地模板
   */
  function deleteLocalTemplate(templateId: string): void {
    localTemplates.value = localTemplates.value.filter(t => t.id !== templateId)
    saveToStorage()
  }

  /**
   * 获取本地模板
   */
  function getLocalTemplate(templateId: string): Template | null {
    return localTemplates.value.find(t => t.id === templateId) || null
  }

  /**
   * 检查远程模板是否有更新
   */
  function checkForUpdates(templateId: string): boolean {
    const local = localTemplates.value.find(t => t.remoteId === templateId)
    const remote = remoteTemplates.value.find(t => t.id === templateId)

    if (!local || !remote) return false

    return local.version !== remote.version
  }

  // 计算属性
  const downloadedCount = computed(() =>
    localTemplates.value.filter(t => t.remoteId).length
  )

  const modifiedCount = computed(() =>
    localTemplates.value.filter(t => t.isModified).length
  )

  const hasRemoteTemplates = computed(() => remoteTemplates.value.length > 0)
  const hasLocalTemplates = computed(() => localTemplates.value.length > 0)

  // 初始化
  loadFromStorage()

  return {
    // 状态
    remoteTemplates,
    localTemplates,
    isLoading,
    error,

    // 方法
    loadFromStorage,
    saveToStorage,
    syncRemoteTemplates,
    downloadTemplate,
    createLocalCopy,
    updateLocalTemplate,
    deleteLocalTemplate,
    getLocalTemplate,
    checkForUpdates,

    // 计算属性
    downloadedCount,
    modifiedCount,
    hasRemoteTemplates,
    hasLocalTemplates,
  }
})
