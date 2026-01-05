/**
 * 格式化工具
 * 时间、数字等格式化函数
 */

/**
 * 格式化倒计时显示 (MM:SS)
 */
export function formatCountdown(seconds: number): string {
  if (seconds < 0) return '00:00'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * 格式化时间显示 (HH:MM:SS)
 */
export function formatTime(date: Date, includeSeconds = true): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  if (includeSeconds) {
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  return `${hours}:${minutes}`
}

/**
 * 格式化日期时间显示 (YYYY-MM-DD HH:MM:SS)
 */
export function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const time = formatTime(date)

  return `${year}-${month}-${day} ${time}`
}

/**
 * 格式化相对时间（如：刚刚、5分钟前）
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000 // 秒

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`

  return formatDateTime(date)
}

/**
 * 格式化偏差显示
 */
export function formatOffset(offset: number): string {
  const sign = offset >= 0 ? '+' : ''
  return `${sign}${offset.toFixed(1)}秒`
}

/**
 * 格式化进度百分比
 */
export function formatProgress(percent: number): string {
  return `${Math.round(percent)}%`
}

/**
 * 格式化节点时间（显示绝对时间）
 * @param offset 相对考试开始的分钟数
 * @param startTime 考试开始时间
 */
export function formatNodeTime(offset: number, startTime: Date): string {
  const nodeTime = new Date(startTime.getTime() + offset * 60 * 1000)
  return formatTime(nodeTime, false)
}

/**
 * 格式化节点时间范围
 * @param offset 相对考试开始的分钟数
 * @param startTime 考试开始时间
 */
export function formatNodeTimeRange(offset: number, startTime: Date): string {
  const nodeTime = new Date(startTime.getTime() + offset * 60 * 1000)
  const timeStr = formatTime(nodeTime, false)

  if (offset < 0) {
    return `${timeStr} (提前${Math.abs(offset)}分钟)`
  } else if (offset === 0) {
    return `${timeStr} (开始时间)`
  } else {
    return `${timeStr} (开始后${offset}分钟)`
  }
}

/**
 * 生成唯一ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 检查两个时间是否在同一天
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * 格式化持续时间（秒 -> X分Y秒）
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0秒'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  if (mins === 0) return `${secs}秒`
  if (secs === 0) return `${mins}分钟`

  return `${mins}分${secs}秒`
}
