/**
 * useExamState.js
 * 考试确定性有限状态机 (Deterministic FSM)
 *
 * 六大阶段:
 *   PREPARING        开考前 30~15 分钟（考前准备）
 *   DISTRIBUTING     开考前 15~0 分钟（试卷分发）
 *   EXAMING_NORMAL   开考后，距结束 > 15 分钟
 *   EXAMING_WARNING  距结束 5~15 分钟
 *   EXAMING_CRITICAL 距结束 ≤ 5 分钟
 *   EXAM_FINISHED    考试结束后 0~15 分钟
 *   STANDBY          上述时间段之外（待机）
 *
 * 状态流转唯一驱动源：Master Clock displayTimeMs
 */
import { ref, computed, watch } from 'vue'
import { useConfig } from './useConfig.js'

const SNAPSHOT_KEY = 'exam_monitor_state_snapshot'

// 阶段定义（方便枚举）
export const STAGES = {
  STANDBY:          'STANDBY',
  PREPARING:        'PREPARING',
  DISTRIBUTING:     'DISTRIBUTING',
  EXAMING_NORMAL:   'EXAMING_NORMAL',
  EXAMING_WARNING:  'EXAMING_WARNING',
  EXAMING_CRITICAL: 'EXAMING_CRITICAL',
  EXAM_FINISHED:    'EXAM_FINISHED',
}

/** 各阶段的中文名称 */
export const STAGE_LABELS = {
  STANDBY:          '待机',
  PREPARING:        '考前准备',
  DISTRIBUTING:     '试卷分发',
  EXAMING_NORMAL:   '正常答题',
  EXAMING_WARNING:  '答题预警',
  EXAMING_CRITICAL: '极端冲刺',
  EXAM_FINISHED:    '考试结束',
}

/**
 * 根据当前时间和配置计算当前阶段
 * @param {number} nowMs   当前显示时间（毫秒）
 * @param {object} config  考试配置
 * @returns {{ stage, remainingSec, totalSec, elapsedSec, examStartMs, examEndMs }}
 */
export function calcExamState(nowMs, config) {
  // 没有配置开始时间时，直接待机
  if (!config.examStartTime) {
    return {
      stage: STAGES.STANDBY,
      remainingSec: 0,
      totalSec: config.examDuration * 60,
      elapsedSec: 0,
      examStartMs: 0,
      examEndMs: 0,
      prepareStartMs: 0,
      distributeStartMs: 0,
      finishedEndMs: 0,
    }
  }

  const examStartMs     = new Date(config.examStartTime).getTime()
  const examDurationMs  = config.examDuration * 60 * 1000
  const examEndMs       = examStartMs + examDurationMs

  const prepareMs         = config.prepareMinutesBefore * 60 * 1000
  const distributeMs      = (config.distributeMinutesBefore ?? 15) * 60 * 1000
  const warningSec        = (config.warningMinutes ?? 15) * 60
  const criticalSec       = (config.criticalMinutes ?? 5) * 60
  const finishedMs        = (config.finishedMinutesAfter ?? 15) * 60 * 1000

  const prepareStartMs    = examStartMs - prepareMs
  const distributeStartMs = examStartMs - distributeMs
  const finishedEndMs     = examEndMs + finishedMs

  const totalSec        = config.examDuration * 60
  const remainingSec    = Math.max(0, Math.ceil((examEndMs - nowMs) / 1000))
  const elapsedSec      = Math.max(0, Math.floor((nowMs - examStartMs) / 1000))

  let stage

  if (nowMs < prepareStartMs) {
    stage = STAGES.STANDBY
  } else if (nowMs < distributeStartMs) {
    stage = STAGES.PREPARING
  } else if (nowMs < examStartMs) {
    stage = STAGES.DISTRIBUTING
  } else if (nowMs >= examEndMs && nowMs < finishedEndMs) {
    stage = STAGES.EXAM_FINISHED
  } else if (nowMs >= finishedEndMs) {
    stage = STAGES.STANDBY
  } else if (remainingSec > warningSec) {
    stage = STAGES.EXAMING_NORMAL
  } else if (remainingSec > criticalSec) {
    stage = STAGES.EXAMING_WARNING
  } else {
    stage = STAGES.EXAMING_CRITICAL
  }

  return {
    stage,
    remainingSec,
    totalSec,
    elapsedSec,
    examStartMs,
    examEndMs,
    prepareStartMs,
    distributeStartMs,
    finishedEndMs,
  }
}

/**
 * 格式化秒数为 HH:MM:SS 或 MM:SS
 */
export function formatDuration(totalSeconds, forceHours = false) {
  const s = Math.abs(Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  if (h > 0 || forceHours) {
    return `${String(h).padStart(2, '0')}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

/**
 * 主 composable
 * 依赖 useMasterClock 提供的 displayTimeMs
 */
export function useExamState(displayTimeMs) {
  const { configReadonly } = useConfig()

  const examStateData = computed(() => calcExamState(displayTimeMs.value, configReadonly))

  const stage        = computed(() => examStateData.value.stage)
  const stageLabel   = computed(() => STAGE_LABELS[stage.value])
  const remainingSec = computed(() => examStateData.value.remainingSec)
  const totalSec     = computed(() => examStateData.value.totalSec)
  const elapsedSec   = computed(() => examStateData.value.elapsedSec)
  const examStartMs  = computed(() => examStateData.value.examStartMs)
  const examEndMs    = computed(() => examStateData.value.examEndMs)

  /** 倒计时文字（主倒计时区域显示内容） */
  const countdownText = computed(() => {
    const s = stage.value
    if (s === STAGES.STANDBY) return '--:--'
    if (s === STAGES.PREPARING || s === STAGES.DISTRIBUTING) {
      // 距开考倒计时
      const secsToStart = Math.max(0, Math.ceil((examStartMs.value - displayTimeMs.value) / 1000))
      return formatDuration(secsToStart, secsToStart >= 3600)
    }
    if (s === STAGES.EXAM_FINISHED) return '00:00'
    return formatDuration(remainingSec.value, remainingSec.value >= 3600)
  })

  /** 倒计时副标题（说明当前倒计时含义） */
  const countdownSubtitle = computed(() => {
    const s = stage.value
    if (s === STAGES.STANDBY)       return '等待考试开始'
    if (s === STAGES.PREPARING)     return '距开考还有'
    if (s === STAGES.DISTRIBUTING)  return '距开考还有'
    if (s === STAGES.EXAM_FINISHED) return '考试已结束'
    return '剩余答题时间'
  })

  /** 进度轴进度 0~1（全程时间轴，从 prepareStart 到 finishedEnd） */
  const timelineProgress = computed(() => {
    const d = examStateData.value
    if (!d.prepareStartMs || !d.finishedEndMs) return 0
    const total = d.finishedEndMs - d.prepareStartMs
    const elapsed = displayTimeMs.value - d.prepareStartMs
    return Math.min(1, Math.max(0, elapsed / total))
  })

  /** 保存到 localStorage 的状态快照（每秒调用） */
  function saveSnapshot(nowMs) {
    try {
      const snapshot = {
        examId: configReadonly.examId,
        stage: stage.value,
        calibrationOffsetMs: configReadonly.calibrationOffsetMs,
        savedAt: nowMs,
      }
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
    } catch { /* ignore */ }
  }

  return {
    stage,
    stageLabel,
    remainingSec,
    totalSec,
    elapsedSec,
    examStartMs,
    examEndMs,
    countdownText,
    countdownSubtitle,
    timelineProgress,
    examStateData,
    saveSnapshot,
    STAGES,
    STAGE_LABELS,
  }
}
