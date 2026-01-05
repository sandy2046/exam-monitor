/**
 * 本地存储服务
 * 管理 localStorage 中的数据
 */

import type { Template, ExamState, Settings } from '@/stores/types'

// localStorage 键名
const KEYS = {
  REMOTE_TEMPLATES: 'exam_monitor_remote_templates',
  LOCAL_TEMPLATES: 'exam_monitor_local_templates',
  ACTIVE_EXAM: 'exam_monitor_active_exam',
  SETTINGS: 'exam_monitor_settings',
  LAST_SYNC: 'exam_monitor_last_sync',
}

class StorageService {
  /**
   * 获取远程模板列表
   */
  getRemoteTemplates(): Template[] {
    const data = localStorage.getItem(KEYS.REMOTE_TEMPLATES)
    return data ? JSON.parse(data) : []
  }

  /**
   * 保存远程模板列表
   */
  saveRemoteTemplates(templates: Template[]): void {
    localStorage.setItem(KEYS.REMOTE_TEMPLATES, JSON.stringify(templates))
  }

  /**
   * 获取单个远程模板
   */
  getRemoteTemplate(id: string): Template | null {
    const templates = this.getRemoteTemplates()
    return templates.find(t => t.id === id) || null
  }

  /**
   * 获取本地模板列表
   */
  getLocalTemplates(): Template[] {
    const data = localStorage.getItem(KEYS.LOCAL_TEMPLATES)
    return data ? JSON.parse(data) : []
  }

  /**
   * 保存本地模板列表
   */
  saveLocalTemplates(templates: Template[]): void {
    localStorage.setItem(KEYS.LOCAL_TEMPLATES, JSON.stringify(templates))
  }

  /**
   * 添加或更新本地模板
   */
  upsertLocalTemplate(template: Template): void {
    const templates = this.getLocalTemplates()
    const index = templates.findIndex(t => t.id === template.id)

    if (index >= 0) {
      templates[index] = template
    } else {
      templates.push(template)
    }

    this.saveLocalTemplates(templates)
  }

  /**
   * 删除本地模板
   */
  deleteLocalTemplate(id: string): void {
    const templates = this.getLocalTemplates().filter(t => t.id !== id)
    this.saveLocalTemplates(templates)
  }

  /**
   * 获取当前考试状态
   */
  getActiveExam(): ExamState | null {
    const data = localStorage.getItem(KEYS.ACTIVE_EXAM)
    return data ? JSON.parse(data) : null
  }

  /**
   * 保存当前考试状态
   */
  saveActiveExam(exam: ExamState | null): void {
    if (exam) {
      localStorage.setItem(KEYS.ACTIVE_EXAM, JSON.stringify(exam))
    } else {
      localStorage.removeItem(KEYS.ACTIVE_EXAM)
    }
  }

  /**
   * 清空当前考试状态
   */
  clearActiveExam(): void {
    localStorage.removeItem(KEYS.ACTIVE_EXAM)
  }

  /**
   * 获取设置
   */
  getSettings(): Settings {
    const data = localStorage.getItem(KEYS.SETTINGS)
    return data
      ? JSON.parse(data)
      : {
          warnTime: 5,
          soundEnabled: true,
          apiEndpoint: 'https://worldtimeapi.org/api/ip',
        }
  }

  /**
   * 保存设置
   */
  saveSettings(settings: Settings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
  }

  /**
   * 保存最后一次同步信息
   */
  saveLastSync(syncInfo: {
    time: string
    offset: number
    status: 'normal' | 'warning' | 'error'
  }): void {
    localStorage.setItem(KEYS.LAST_SYNC, JSON.stringify(syncInfo))
  }

  /**
   * 获取最后一次同步信息
   */
  getLastSync(): { time: string; offset: number; status: string } | null {
    const data = localStorage.getItem(KEYS.LAST_SYNC)
    return data ? JSON.parse(data) : null
  }

  /**
   * 清空所有数据（用于测试或重置）
   */
  clearAll(): void {
    localStorage.removeItem(KEYS.REMOTE_TEMPLATES)
    localStorage.removeItem(KEYS.LOCAL_TEMPLATES)
    localStorage.removeItem(KEYS.ACTIVE_EXAM)
    localStorage.removeItem(KEYS.SETTINGS)
    localStorage.removeItem(KEYS.LAST_SYNC)
  }

  /**
   * 导出所有数据
   */
  exportAllData(): string {
    const data = {
      remoteTemplates: this.getRemoteTemplates(),
      localTemplates: this.getLocalTemplates(),
      activeExam: this.getActiveExam(),
      settings: this.getSettings(),
      lastSync: this.getLastSync(),
      exportTime: new Date().toISOString(),
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * 导入数据
   */
  importAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString)

      if (data.remoteTemplates) this.saveRemoteTemplates(data.remoteTemplates)
      if (data.localTemplates) this.saveLocalTemplates(data.localTemplates)
      if (data.activeExam) this.saveActiveExam(data.activeExam)
      if (data.settings) this.saveSettings(data.settings)
      if (data.lastSync) this.saveLastSync(data.lastSync)

      return true
    } catch (error) {
      console.error('导入数据失败:', error)
      return false
    }
  }
}

// 单例导出
export const storageService = new StorageService()
