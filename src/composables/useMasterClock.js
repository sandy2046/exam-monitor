/**
 * useMasterClock.js
 * rAF 驱动的主时钟引擎
 *
 * 核心公式: DisplayTime = Date.now() + calibrationOffsetMs
 *
 * - 放弃 setInterval，使用 requestAnimationFrame 每帧更新
 * - 16.67ms 刷新率，杜绝后台标签页时间漂移
 * - 每秒触发一次"心跳"，用于状态机推进和 localStorage 快照写入
 */
import { ref, computed, onUnmounted } from 'vue'
import { useConfig } from './useConfig.js'

const SNAPSHOT_KEY = 'exam_monitor_clock_snapshot'

export function useMasterClock() {
  const { configReadonly } = useConfig()

  /** 当前显示时间（毫秒时间戳） */
  const displayTimeMs = ref(Date.now() + configReadonly.calibrationOffsetMs)

  /** 当前绝对时间（Date 对象） */
  const now = computed(() => new Date(displayTimeMs.value))

  /** 格式化当前时间 HH:MM:SS */
  const nowFormatted = computed(() => {
    const d = now.value
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
  })

  let rafId = null
  let lastSecond = -1

  // 每秒触发的回调列表
  const secondCallbacks = []

  function registerSecondCallback(fn) {
    secondCallbacks.push(fn)
  }

  function tick() {
    displayTimeMs.value = Date.now() + configReadonly.calibrationOffsetMs
    const currentSecond = Math.floor(displayTimeMs.value / 1000)

    if (currentSecond !== lastSecond) {
      lastSecond = currentSecond
      // 触发每秒回调（状态机检查、localStorage 快照）
      secondCallbacks.forEach(fn => fn(displayTimeMs.value))
    }

    rafId = requestAnimationFrame(tick)
  }

  // 启动
  tick()

  // 组件卸载时停止
  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })

  return {
    displayTimeMs,
    now,
    nowFormatted,
    registerSecondCallback,
  }
}
