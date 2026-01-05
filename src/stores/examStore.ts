/**
 * 考试监控 Store
 * 管理考试状态、进度、提醒
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storageService } from '@/services/storageService'
import { timeService } from '@/services/timeService'
import type { ExamState, ProcessNode, ExamLog, ExamProgress, Reminder } from '@/stores/types'
import { useTemplateStore } from './templateStore'
import { useTimeStore } from './timeStore'

export const useExamStore = defineStore('exam', () => {
  // 状态
  const examState = ref<ExamState | null>(null)
  const isRunning = ref(false)
  const error = ref<string | null>(null)
  const currentReminder = ref<Reminder | null>(null)

  // 定时器
  let countdownInterval: number | null = null
  let reminderInterval: number | null = null

  // 依赖 stores
  const templateStore = useTemplateStore()
  const timeStore = useTimeStore()

  /**
   * 启动考试
   */
  async function startExam(templateId: string, startTime?: Date): Promise<boolean> {
    const template = templateStore.getLocalTemplate(templateId)
    if (!template) {
      error.value = '模板不存在'
      return false
    }

    // 获取准确时间
    const accurateTime = startTime || await timeStore.getAccurateTime()

    // 创建考试状态
    examState.value = {
      templateId: templateId,
      templateName: template.name,
      startTime: accurateTime.toISOString(),
      status: 'running',
      completedNodes: [],
      ntpOffset: timeStore.syncStatus.offset,
      lastSyncTime: new Date().toISOString(),
      logs: [
        {
          timestamp: new Date().toISOString(),
          action: 'start',
          note: `考试开始时间: ${timeService.formatTime(accurateTime)}`,
        },
      ],
    }

    isRunning.value = true
    error.value = null

    // 保存到本地
    storageService.saveActiveExam(examState.value)

    // 启动定时器
    startTimers()

    return true
  }

  /**
   * 暂停考试
   */
  function pauseExam(): boolean {
    if (!examState.value || examState.value.status !== 'running') {
      error.value = '考试未在运行'
      return false
    }

    examState.value.status = 'paused'
    examState.value.pausedAt = new Date().toISOString()
    examState.value.logs.push({
      timestamp: new Date().toISOString(),
      action: 'pause',
      note: '考试暂停',
    })

    storageService.saveActiveExam(examState.value)
    stopTimers()

    return true
  }

  /**
   * 继续考试
   */
  function resumeExam(): boolean {
    if (!examState.value || examState.value.status !== 'paused') {
      error.value = '考试未在暂停状态'
      return false
    }

    examState.value.status = 'running'
    examState.value.logs.push({
      timestamp: new Date().toISOString(),
      action: 'resume',
      note: '考试继续',
    })

    storageService.saveActiveExam(examState.value)
    startTimers()

    return true
  }

  /**
   * 跳过当前节点
   */
  function skipCurrentNode(): boolean {
    if (!examState.value || examState.value.status !== 'running') {
      return false
    }

    const progress = calculateProgress()
    const currentNode = progress.currentNode
    if (!currentNode) return false

    // 标记为已完成
    if (!examState.value.completedNodes.includes(currentNode.name)) {
      examState.value.completedNodes.push(currentNode.name)
    }

    examState.value.logs.push({
      timestamp: new Date().toISOString(),
      action: 'skip',
      nodeName: currentNode.name,
      note: '手动跳过',
    })

    // 强制触发更新
    examState.value = { ...examState.value }

    storageService.saveActiveExam(examState.value)

    // 检查是否需要提醒下一节点
    checkNextReminder()

    return true
  }

  /**
   * 结束考试
   */
  function endExam(): boolean {
    if (!examState.value) {
      return false
    }

    examState.value.status = 'ended'
    examState.value.endedAt = new Date().toISOString()
    examState.value.logs.push({
      timestamp: new Date().toISOString(),
      action: 'end',
      note: '考试结束',
    })

    storageService.saveActiveExam(examState.value)
    stopTimers()

    // 显示考试结束提醒
    showReminder({
      type: 'alert',
      title: '考试结束',
      content: '请停止答题，整理试卷和答题卡',
    })

    return true
  }

  /**
   * 恢复考试（从本地存储）
   */
  function restoreExam(): boolean {
    const savedExam = storageService.getActiveExam()
    if (!savedExam) {
      return false
    }

    // 检查是否超时（10分钟）
    const lastSync = new Date(savedExam.lastSyncTime)
    const now = new Date()
    const minutesSinceLastSync = (now.getTime() - lastSync.getTime()) / 1000 / 60

    if (minutesSinceLastSync > 10) {
      // 超时，清空数据
      storageService.clearActiveExam()
      return false
    }

    examState.value = savedExam
    isRunning.value = savedExam.status === 'running'

    if (isRunning.value) {
      startTimers()
    }

    return true
  }

  /**
   * 开始定时器
   */
  function startTimers(): void {
    stopTimers() // 清除旧的

    // 主定时器（每秒）
    countdownInterval = window.setInterval(() => {
      updateProgress()
      checkReminders() // 每秒检查提醒和节点完成
    }, 1000)

    // 立即检查一次
    updateProgress()
    checkReminders()
  }

  /**
   * 停止定时器
   */
  function stopTimers(): void {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    if (reminderInterval) {
      clearInterval(reminderInterval)
      reminderInterval = null
    }
  }

  /**
   * 更新进度
   */
  function updateProgress(): void {
    if (!examState.value || examState.value.status !== 'running') {
      return
    }

    // 更新最后同步时间
    examState.value.lastSyncTime = new Date().toISOString()

    // 强制触发 progress 重新计算（通过修改一个不影响逻辑的值）
    // 这样可以确保依赖 progress 的 computed 属性会更新
    examState.value = { ...examState.value }

    storageService.saveActiveExam(examState.value)

    // 调试日志
    if (import.meta.env.DEV) {
      console.log('[updateProgress] called, lastSyncTime updated to:', examState.value.lastSyncTime)
    }
  }

  /**
   * 检查提醒
   */
  function checkReminders(): void {
    if (!examState.value || examState.value.status !== 'running') {
      return
    }

    const progress = calculateProgress()
    if (!progress.currentNode && !progress.nextNode) {
      return
    }

    // 检查下一节点的提前提醒（只在特定时间窗口提醒一次）
    if (progress.nextNode && progress.nextNode.warnTime > 0) {
      const warnSeconds = progress.nextNode.warnTime * 60
      const timeToWarn = warnSeconds - progress.remainingTime

      // 只在距离提醒时间30秒内，且还没提醒过的时候提醒
      if (progress.remainingTime <= warnSeconds && progress.remainingTime > warnSeconds - 30) {
        // 检查是否已经提醒过这个节点
        const lastLog = examState.value.logs[examState.value.logs.length - 1]
        const hasWarned = lastLog &&
          lastLog.action === 'warning' &&
          lastLog.nodeName === progress.nextNode.name

        if (!hasWarned) {
          showReminder({
            type: 'warning',
            title: `距离 ${progress.nextNode.name} 还有 ${progress.nextNode.warnTime} 分钟`,
            content: progress.nextNode.description || '',
            nextNode: progress.nextNode.name,
            remainingTime: progress.remainingTime,
          })

          // 记录已提醒
          examState.value.logs.push({
            timestamp: new Date().toISOString(),
            action: 'warning',
            nodeName: progress.nextNode.name,
            note: `提前${progress.nextNode.warnTime}分钟提醒`
          })
          storageService.saveActiveExam(examState.value)
        }
      }
    }

    // 检查当前节点是否完成
    if (progress.currentNode && progress.remainingTime <= 0) {
      if (import.meta.env.DEV) {
        console.log('[checkReminders] 准备完成节点:', {
          currentNode: progress.currentNode.name,
          remainingTime: progress.remainingTime,
          completedNodes: examState.value.completedNodes
        })
      }
      completeCurrentNode(progress.currentNode)
    }
  }

  /**
   * 检查下一提醒（手动跳过后）
   */
  function checkNextReminder(): void {
    if (!examState.value) return

    const progress = calculateProgress()
    if (progress.nextNode && progress.nextNode.warnTime > 0) {
      const warnSeconds = progress.nextNode.warnTime * 60
      if (progress.remainingTime <= warnSeconds) {
        showReminder({
          type: 'warning',
          title: `即将进入: ${progress.nextNode.name}`,
          content: progress.nextNode.description || '',
          nextNode: progress.nextNode.name,
          remainingTime: progress.remainingTime,
        })
      }
    }
  }

  /**
   * 完成当前节点
   */
  function completeCurrentNode(node: ProcessNode): void {
    if (!examState.value) return

    if (!examState.value.completedNodes.includes(node.name)) {
      examState.value.completedNodes.push(node.name)

      examState.value.logs.push({
        timestamp: new Date().toISOString(),
        action: 'complete',
        nodeName: node.name,
      })

      // 强制触发 computed 属性更新
      examState.value = { ...examState.value }

      storageService.saveActiveExam(examState.value)

      // 调试日志
      if (import.meta.env.DEV) {
        console.log(`[completeCurrentNode] 节点 "${node.name}" 已完成`)
      }

      // 显示完成提醒
      showReminder({
        type: 'alert',
        title: `已完成: ${node.name}`,
        content: '进入下一环节',
        nextNode: calculateProgress().nextNode?.name,
      })
    }
  }

  /**
   * 显示提醒
   */
  function showReminder(reminder: Reminder): void {
    currentReminder.value = reminder

    // 播放声音（如果启用）
    if (storageService.getSettings().soundEnabled) {
      playSound()
    }

    // 5秒后自动关闭
    setTimeout(() => {
      currentReminder.value = null
    }, 5000)
  }

  /**
   * 播放提醒声音
   */
  function playSound(): void {
    // 使用浏览器 Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800 // Hz
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  /**
   * 计算进度
   */
  function calculateProgress(): ExamProgress {
    if (!examState.value) {
      return {
        currentNode: null,
        nextNode: null,
        remainingTime: 0,
        progress: 0,
        completedNodes: [],
        upcomingNodes: [],
      }
    }

    const template = templateStore.getLocalTemplate(examState.value.templateId)
    if (!template) {
      return {
        currentNode: null,
        nextNode: null,
        remainingTime: 0,
        progress: 0,
        completedNodes: [],
        upcomingNodes: [],
      }
    }

    const startTime = new Date(examState.value.startTime)
    const now = new Date()
    const elapsedMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60

    // 找出当前节点和下一节点
    const sortedNodes = [...template.nodes].sort((a, b) => a.offset - b.offset)
    let currentNode: ProcessNode | null = null
    let nextNode: ProcessNode | null = null
    let remainingTime = 0

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i]
      if (!node) continue

      const isCompleted = examState.value.completedNodes.includes(node.name)

      if (!isCompleted && node.offset >= elapsedMinutes) {
        // 找到下一个未完成的节点
        nextNode = node

        // 如果是第一个未完成的节点，且时间已到，设为当前节点
        if (node.offset <= elapsedMinutes) {
          currentNode = node
        } else if (i > 0) {
          // 上一个节点是当前节点
          const prevNode = sortedNodes[i - 1]
          if (prevNode) {
            currentNode = prevNode
          }
        }

        // 计算剩余时间
        remainingTime = Math.ceil((node.offset - elapsedMinutes) * 60)
        break
      }
    }

    // 如果所有节点都已完成
    if (!nextNode && sortedNodes.length > 0) {
      const lastNode = sortedNodes[sortedNodes.length - 1]
      if (lastNode && examState.value.completedNodes.includes(lastNode.name)) {
        remainingTime = 0
      }
    }

    // 计算进度百分比
    const totalNodes = template.nodes.length
    const completedCount = examState.value.completedNodes.length
    const progress = totalNodes > 0 ? (completedCount / totalNodes) * 100 : 0

    // 调试日志 - 专门查看进度计算
    if (import.meta.env.DEV) {
      console.log('[calculateProgress-进度计算]', {
        totalNodes,
        completedCount,
        completedNodes: examState.value.completedNodes,
        progress: progress.toFixed(1) + '%'
      })
    }

    // 已完成和待进行的节点
    const completedNodes = template.nodes.filter(n =>
      examState.value?.completedNodes.includes(n.name)
    )
    const upcomingNodes = template.nodes.filter(n =>
      !examState.value?.completedNodes.includes(n.name) && n.offset >= elapsedMinutes
    )

    // 调试日志（生产环境可移除）
    if (import.meta.env.DEV) {
      console.log('[calculateProgress]', {
        elapsedMinutes: elapsedMinutes.toFixed(2),
        completedCount,
        totalNodes,
        progress: progress.toFixed(1),
        currentNode: currentNode?.name,
        nextNode: nextNode?.name,
        remainingTime: remainingTime.toFixed(0) + 's',
        completedNodes: examState.value.completedNodes
      })
    }

    return {
      currentNode,
      nextNode,
      remainingTime,
      progress,
      completedNodes,
      upcomingNodes,
    }
  }

  // 计算属性
  const progress = computed(() => calculateProgress())
  const hasActiveExam = computed(() => examState.value !== null)
  const isExamRunning = computed(() => examState.value?.status === 'running')
  const isExamPaused = computed(() => examState.value?.status === 'paused')
  const isExamEnded = computed(() => examState.value?.status === 'ended')

  // 初始化时尝试恢复考试
  restoreExam()

  return {
    // 状态
    examState,
    isRunning,
    error,
    currentReminder,

    // 方法
    startExam,
    pauseExam,
    resumeExam,
    skipCurrentNode,
    endExam,
    restoreExam,
    stopTimers,

    // 计算属性
    progress,
    hasActiveExam,
    isExamRunning,
    isExamPaused,
    isExamEnded,
  }
})
