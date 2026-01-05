/**
 * 时间同步服务
 * 支持多种时间源：阿里云、腾讯云、百度云、World Time API
 */

// 时间同步结果
export interface TimeSyncResult {
  success: boolean
  serverTime: Date | null
  localTime: Date
  offset: number // 本地时间与服务器时间的偏差（秒）
  source: string // 时间源
  errorMessage?: string
}

// 时间源配置
interface TimeSource {
  name: string
  url: string
  type: string
  timeout: number
}

class TimeService {
  // 时间源配置 - 按优先级排序（国内优先）
  private timeSources: TimeSource[] = [
    {
      name: '阿里云-淘宝API',
      url: 'https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp',
      type: 'aliyun-taobao',
      timeout: 5000,
    },
    {
      name: '阿里云NTP',
      url: 'https://ntp.aliyun.com/api/getTime',
      type: 'aliyun-ntp',
      timeout: 5000,
    },
    {
      name: '腾讯云NTP',
      url: 'https://timeapi.cloud.tencent.com/api/getTime',
      type: 'tencent-ntp',
      timeout: 5000,
    },
    {
      name: '百度云NTP',
      url: 'https://cloud.baidu.com/api/getTime',
      type: 'baidu-ntp',
      timeout: 5000,
    },
    {
      name: 'World Time API',
      url: 'https://worldtimeapi.org/api/ip',
      type: 'worldtimeapi',
      timeout: 5000,
    },
  ]

  private lastSync: TimeSyncResult | null = null
  private isSyncing = false

  /**
   * 尝试多个时间源同步时间
   * 优化：按优先级尝试，自动切换到可用源
   */
  async syncTime(): Promise<TimeSyncResult> {
    // 防止重复同步
    if (this.isSyncing) {
      await new Promise(resolve => setTimeout(resolve, 100))
      return this.lastSync || this.createFallbackResult(new Date())
    }

    this.isSyncing = true
    const localTime = new Date()

    try {
      // 按优先级尝试所有时间源
      for (const source of this.timeSources) {
        try {
          const result = await this.syncWithSource(source, localTime)
          if (result.success) {
            this.lastSync = result
            console.log(`✅ 时间同步成功: ${source.name}`)
            return result
          }
        } catch (error) {
          console.warn(`⚠️ ${source.name} 同步失败:`, error)
          continue // 继续尝试下一个
        }
      }

      // 所有源都失败
      const fallback = this.createFallbackResult(localTime, '所有时间源同步失败')
      this.lastSync = fallback
      return fallback
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 同步到指定源
   */
  private async syncWithSource(source: TimeSource, localTime: Date): Promise<TimeSyncResult> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), source.timeout)

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache',
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const text = await response.text()
      let serverTime: Date | null = null

      // 根据不同源解析响应
      switch (source.type) {
        case 'aliyun-taobao':
          // {\"data\":\"1735689600000\"}
          const match1 = text.match(/"data":"(\d+)"/)
          if (match1 && match1[1]) {
            serverTime = new Date(parseInt(match1[1]))
          }
          break

        case 'aliyun-ntp':
          // 可能是 JSON 或文本格式
          try {
            const json = JSON.parse(text)
            if (json.timestamp) {
              serverTime = new Date(json.timestamp)
            } else if (json.data) {
              serverTime = new Date(json.data)
            }
          } catch {
            // 尝试文本格式
            const match = text.match(/(\d{13})/)
            if (match && match[1]) {
              serverTime = new Date(parseInt(match[1]))
            }
          }
          break

        case 'tencent-ntp':
        case 'baidu-ntp':
          // 尝试 JSON 解析
          try {
            const json = JSON.parse(text)
            if (json.timestamp || json.serverTime) {
              serverTime = new Date(json.timestamp || json.serverTime)
            }
          } catch {
            // 尝试提取时间戳
            const match = text.match(/(\d{13})/)
            if (match && match[1]) {
              serverTime = new Date(parseInt(match[1]))
            }
          }
          break

        case 'worldtimeapi':
          const json = JSON.parse(text)
          serverTime = new Date(json.utc_datetime)
          break
      }

      if (!serverTime) {
        throw new Error('无法解析服务器时间')
      }

      const offset = (localTime.getTime() - serverTime.getTime()) / 1000

      return {
        success: true,
        serverTime,
        localTime,
        offset,
        source: source.type,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      return {
        success: false,
        serverTime: null,
        localTime,
        offset: 0,
        source: source.type,
        errorMessage: error instanceof Error ? error.message : '同步失败',
      }
    }
  }

  /**
   * 创建回退结果
   */
  private createFallbackResult(localTime: Date, errorMessage?: string): TimeSyncResult {
    return {
      success: false,
      serverTime: null,
      localTime,
      offset: 0,
      source: 'local',
      errorMessage: errorMessage || '使用本地时间',
    }
  }

  /**
   * 获取当前准确时间（基于最后一次同步）
   * 如果没有同步过，先进行同步
   */
  async getAccurateTime(): Promise<Date> {
    if (!this.lastSync || !this.lastSync.success) {
      await this.syncTime()
    }

    if (this.lastSync?.success) {
      // 返回本地时间减去偏差 = 服务器时间
      return new Date(Date.now() - this.lastSync.offset * 1000)
    }

    // 如果同步失败，返回本地时间
    return new Date()
  }

  /**
   * 页面加载时自动同步（带用户体验优化）
   * 显示友好的加载状态
   */
  async autoSyncOnLoad(): Promise<TimeSyncResult> {
    console.log('🕐 开始自动时间同步...')

    const startTime = Date.now()
    const result = await this.syncTime()
    const duration = Date.now() - startTime

    if (result.success) {
      console.log(`✅ 同步完成，耗时 ${duration}ms`)
      console.log(`   时间源: ${this.getSourceDisplayName(result.source)}`)
      console.log(`   时间偏差: ${result.offset.toFixed(3)}s`)
    } else {
      console.warn(`⚠️ 同步失败，使用本地时间`)
      console.log(`   错误: ${result.errorMessage}`)
    }

    return result
  }

  /**
   * 获取时间源显示名称
   */
  private getSourceDisplayName(source: string): string {
    const displayMap: Record<string, string> = {
      'aliyun-taobao': '阿里云(淘宝API)',
      'aliyun-ntp': '阿里云NTP',
      'tencent-ntp': '腾讯云NTP',
      'baidu-ntp': '百度云NTP',
      'worldtimeapi': 'WorldTimeAPI',
      'local': '本地时间',
    }
    return displayMap[source] || source
  }

  /**
   * 获取时间同步状态（用于UI显示）
   */
  getTimeSyncStatus(): {
    status: 'syncing' | 'normal' | 'warning' | 'error'
    offset: number
    lastSyncTime: Date | null
    message: string
    source: string
    sourceName: string
  } {
    if (this.isSyncing) {
      return {
        status: 'syncing',
        offset: 0,
        lastSyncTime: null,
        message: '正在同步...',
        source: 'syncing',
        sourceName: '同步中',
      }
    }

    if (!this.lastSync) {
      return {
        status: 'error',
        offset: 0,
        lastSyncTime: null,
        message: '尚未同步',
        source: 'none',
        sourceName: '未同步',
      }
    }

    // 如果同步失败但有本地时间，显示警告而非错误
    if (!this.lastSync.success) {
      return {
        status: 'warning',
        offset: 0,
        lastSyncTime: null,
        message: `使用本地时间 (${this.lastSync.errorMessage || '网络错误'})`,
        source: this.lastSync.source,
        sourceName: this.getSourceDisplayName(this.lastSync.source),
      }
    }

    const now = new Date()
    const timeSinceSync = this.lastSync.serverTime
      ? (now.getTime() - this.lastSync.serverTime.getTime()) / 1000 / 60
      : 999

    const sourceName = this.getSourceDisplayName(this.lastSync.source)

    // 偏差 > 60秒 或 超过10分钟未同步 = 错误
    if (Math.abs(this.lastSync.offset) > 60 || timeSinceSync > 10) {
      return {
        status: 'error',
        offset: this.lastSync.offset,
        lastSyncTime: this.lastSync.serverTime,
        message: `${sourceName} 偏差 ${this.lastSync.offset.toFixed(1)}s, ${timeSinceSync.toFixed(0)}分钟未同步`,
        source: this.lastSync.source,
        sourceName,
      }
    }

    // 偏差 30-60秒 或 5-10分钟未同步 = 警告
    if (Math.abs(this.lastSync.offset) > 30 || timeSinceSync > 5) {
      return {
        status: 'warning',
        offset: this.lastSync.offset,
        lastSyncTime: this.lastSync.serverTime,
        message: `${sourceName} 偏差 ${this.lastSync.offset.toFixed(1)}s, ${timeSinceSync.toFixed(0)}分钟未同步`,
        source: this.lastSync.source,
        sourceName,
      }
    }

    // 正常
    return {
      status: 'normal',
      offset: this.lastSync.offset,
      lastSyncTime: this.lastSync.serverTime,
      message: `${sourceName} 偏差 ${this.lastSync.offset.toFixed(1)}s`,
      source: this.lastSync.source,
      sourceName,
    }
  }

  /**
   * 获取最后一次同步结果
   */
  getLastSync(): TimeSyncResult | null {
    return this.lastSync
  }

  /**
   * 格式化倒计时显示
   * @param seconds 剩余秒数
   */
  formatCountdown(seconds: number): string {
    if (seconds < 0) return '00:00'

    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)

    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * 格式化时间显示
   * @param date 日期对象
   * @param includeSeconds 是否包含秒
   */
  formatTime(date: Date, includeSeconds = true): string {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    if (includeSeconds) {
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    }

    return `${hours}:${minutes}`
  }
}

// 单例导出
export const timeService = new TimeService()
