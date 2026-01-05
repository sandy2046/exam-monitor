/**
 * 时间同步 Store
 * 管理时间同步状态和定时器
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { timeService } from '@/services/timeService'
import type { TimeSyncStatus } from '@/stores/types'

export const useTimeStore = defineStore('time', () => {
  // 状态
  const syncStatus = ref<TimeSyncStatus>({
    status: 'error',
    offset: 0,
    lastSyncTime: null,
    message: '尚未同步',
  })

  const isLoading = ref(false)
  const lastUpdateTime = ref<Date | null>(null)

  // 定时器ID
  let syncInterval: number | null = null

  /**
   * 同步时间
   */
  async function syncTime(): Promise<boolean> {
    isLoading.value = true

    try {
      const result = await timeService.syncTime()

      if (result.success && result.serverTime) {
        // 直接使用 timeService 的状态结果
        const status = timeService.getTimeSyncStatus()
        syncStatus.value = {
          status: status.status,
          offset: result.offset,
          lastSyncTime: result.serverTime,
          message: status.message,
          source: result.source,
        }

        lastUpdateTime.value = new Date()
        return true
      } else {
        // 同步失败，但可能有本地时间可用
        const status = timeService.getTimeSyncStatus()
        syncStatus.value = {
          status: status.status,
          offset: 0,
          lastSyncTime: null,
          message: status.message,
          source: result.source,
        }
        return false
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取当前准确时间
   */
  async function getAccurateTime(): Promise<Date> {
    return await timeService.getAccurateTime()
  }

  /**
   * 启动自动同步（每5分钟）
   */
  function startAutoSync(): void {
    if (syncInterval) return // 已经在运行

    // 立即同步一次
    syncTime()

    // 每5分钟同步一次
    syncInterval = window.setInterval(() => {
      syncTime()
    }, 5 * 60 * 1000)
  }

  /**
   * 停止自动同步
   */
  function stopAutoSync(): void {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
    }
  }

  /**
   * 格式化倒计时
   */
  function formatCountdown(seconds: number): string {
    return timeService.formatCountdown(seconds)
  }

  /**
   * 格式化时间
   */
  function formatTime(date: Date, includeSeconds = true): string {
    return timeService.formatTime(date, includeSeconds)
  }

  /**
   * 计算距离目标时间的剩余秒数
   */
  function calculateRemainingSeconds(targetTime: Date): number {
    const now = new Date()
    const diff = targetTime.getTime() - now.getTime()
    return Math.floor(diff / 1000)
  }

  // 计算属性
  const isSynced = computed(() => syncStatus.value.lastSyncTime !== null)
  const isNormal = computed(() => syncStatus.value.status === 'normal')
  const isWarning = computed(() => syncStatus.value.status === 'warning')
  const isError = computed(() => syncStatus.value.status === 'error')

  return {
    // 状态
    syncStatus,
    isLoading,
    lastUpdateTime,

    // 方法
    syncTime,
    getAccurateTime,
    startAutoSync,
    stopAutoSync,
    formatCountdown,
    formatTime,
    calculateRemainingSeconds,

    // 计算属性
    isSynced,
    isNormal,
    isWarning,
    isError,
  }
})
