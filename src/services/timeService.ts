/**
 * 时间同步服务
 * 支持多种时间源：World Time API、阿里云NTP、自定义NTP
 */

// World Time API 响应接口
interface WorldTimeResponse {
  unixtime: number
  utc_datetime: string
  datetime: string
  timezone: string
  client_ip: string
}

// NTP 时间响应（简化版）
interface NtpTimeResponse {
  timestamp: number  // Unix 时间戳（毫秒）
  time: string       // ISO 格式时间
}

// 时间同步结果
export interface TimeSyncResult {
  success: boolean
  serverTime: Date | null
  localTime: Date
  offset: number // 本地时间与服务器时间的偏差（秒）
  source: string // 时间源
  errorMessage?: string
}

class TimeService {
  // 时间源配置
  private timeSources = {
    worldTime: 'https://worldtimeapi.org/api/ip',
    aliyunNtp: 'https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp',
    customNtp: 'https://ntp.aliyun.com/api/getTime', // 阿里云NTP HTTP接口
  }

  private lastSync: TimeSyncResult | null = null

  /**
   * 尝试多个时间源同步时间
   */
  async syncTime(): Promise<TimeSyncResult> {
    const localTime = new Date()

    // 优先尝试阿里云NTP（HTTP接口）
    const aliSync = await this.syncWithAliyunNtp(localTime)
    if (aliSync.success) {
      this.lastSync = aliSync
      return aliSync
    }

    // 备用：World Time API
    const worldSync = await this.syncWithWorldTime(localTime)
    if (worldSync.success) {
      this.lastSync = worldSync
      return worldSync
    }

    // 都失败，使用本地时间
    this.lastSync = {
      success: false,
      serverTime: null,
      localTime,
      offset: 0,
      source: 'local',
      errorMessage: aliSync.errorMessage || worldSync.errorMessage || '所有同步源失败',
    }

    return this.lastSync
  }

  /**
   * 使用阿里云NTP（淘宝API获取时间戳）
   */
  private async syncWithAliyunNtp(localTime: Date): Promise<TimeSyncResult> {
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          // 使用淘宝API获取时间戳
          const response = await fetch(this.timeSources.aliyunNtp, {
            signal: controller.signal,
            mode: 'cors',
          })
          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const text = await response.text()
          // 解析淘宝API响应：mtop.common.getTimestamp({"data":"1735689600000"})
          const match = text.match(/"data":"(\d+)"/)
          if (!match || !match[1]) {
            throw new Error('无法解析时间戳')
          }

          const timestamp = parseInt(match[1]) // 毫秒时间戳
          const serverTime = new Date(timestamp)
          const offset = (localTime.getTime() - serverTime.getTime()) / 1000

          return {
            success: true,
            serverTime,
            localTime,
            offset,
            source: 'aliyun-ntp',
          }
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      }

      // 备用：使用 axios
      const axios = await import('axios')
      const response = await axios.default.get(this.timeSources.aliyunNtp, {
        timeout: 5000,
      })

      const text = response.data
      const match = text.match(/"data":"(\d+)"/)
      if (!match || !match[1]) {
        throw new Error('无法解析时间戳')
      }

      const timestamp = parseInt(match[1])
      const serverTime = new Date(timestamp)
      const offset = (localTime.getTime() - serverTime.getTime()) / 1000

      return {
        success: true,
        serverTime,
        localTime,
        offset,
        source: 'aliyun-ntp',
      }
    } catch (error) {
      return {
        success: false,
        serverTime: null,
        localTime,
        offset: 0,
        source: 'aliyun-ntp',
        errorMessage: error instanceof Error ? error.message : '阿里云NTP失败',
      }
    }
  }

  /**
   * 使用 World Time API
   */
  private async syncWithWorldTime(localTime: Date): Promise<TimeSyncResult> {
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetch(this.timeSources.worldTime, {
            signal: controller.signal,
            mode: 'cors',
          })
          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const data: WorldTimeResponse = await response.json()
          const serverTime = new Date(data.utc_datetime)
          const offset = (localTime.getTime() - serverTime.getTime()) / 1000

          return {
            success: true,
            serverTime,
            localTime,
            offset,
            source: 'worldtimeapi',
          }
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      }

      // 备用：使用 axios
      const axios = await import('axios')
      const response = await axios.default.get<WorldTimeResponse>(this.timeSources.worldTime, {
        timeout: 5000,
      })

      const serverTime = new Date(response.data.utc_datetime)
      const offset = (localTime.getTime() - serverTime.getTime()) / 1000

      return {
        success: true,
        serverTime,
        localTime,
        offset,
        source: 'worldtimeapi',
      }
    } catch (error) {
      return {
        success: false,
        serverTime: null,
        localTime,
        offset: 0,
        source: 'worldtimeapi',
        errorMessage: error instanceof Error ? error.message : 'World Time API失败',
      }
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
   * 获取时间同步状态
   */
  getTimeSyncStatus(): {
    status: 'normal' | 'warning' | 'error'
    offset: number
    lastSyncTime: Date | null
    message: string
    source: string
  } {
    if (!this.lastSync) {
      return {
        status: 'error',
        offset: 0,
        lastSyncTime: null,
        message: '尚未同步',
        source: 'none',
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
      }
    }

    const now = new Date()
    const timeSinceSync = this.lastSync.serverTime
      ? (now.getTime() - this.lastSync.serverTime.getTime()) / 1000 / 60
      : 999

    // 显示时间源
    const sourceMap: Record<string, string> = {
      'aliyun-ntp': '阿里云',
      'worldtimeapi': 'WorldTime',
      'local': '本地',
    }
    const sourceName = sourceMap[this.lastSync.source] || this.lastSync.source

    // 偏差 > 60秒 或 超过10分钟未同步 = 错误
    if (Math.abs(this.lastSync.offset) > 60 || timeSinceSync > 10) {
      return {
        status: 'error',
        offset: this.lastSync.offset,
        lastSyncTime: this.lastSync.serverTime,
        message: `${sourceName} 偏差 ${this.lastSync.offset.toFixed(1)}s, ${timeSinceSync.toFixed(0)}分钟未同步`,
        source: this.lastSync.source,
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
      }
    }

    // 正常
    return {
      status: 'normal',
      offset: this.lastSync.offset,
      lastSyncTime: this.lastSync.serverTime,
      message: `${sourceName} 偏差 ${this.lastSync.offset.toFixed(1)}s`,
      source: this.lastSync.source,
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

