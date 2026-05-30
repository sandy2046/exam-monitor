/**
 * useConfig.js
 * 考试配置的读写层 —— 所有配置持久化到 localStorage
 * 大屏主页和 admin 页共用同一个响应式配置对象
 */
import { reactive, watch, readonly } from 'vue'

const STORAGE_KEY = 'exam_monitor_config'

/** 每个阶段的默认提示语 */
const DEFAULT_PROMPTS = {
  PREPARING: {
    student: '请保持安静，有序入场，对号入座，将手机存放于指定位置',
    invigilator: '请核对考生名单，检查座位标牌，确认手机收缴完毕',
  },
  DISTRIBUTING: {
    student: '请在桌面放好文具，不得翻看试卷，等待开考信号',
    invigilator: '请开始分发试卷，提醒考生在封面填写信息，勿开封',
  },
  EXAMING_NORMAL: {
    student: '认真作答，合理分配时间，保持卷面整洁',
    invigilator: '请巡视考场，维护考场纪律，记录异常情况',
  },
  EXAMING_WARNING: {
    student: '注意时间，尽快完成未答题目，检查答题卡',
    invigilator: '提醒考生注意时间，准备收卷工作',
  },
  EXAMING_CRITICAL: {
    student: '停止答题，等待收卷，不得再写任何内容',
    invigilator: '请立即准备收卷，确保每位考生停笔',
  },
  EXAM_FINISHED: {
    student: '请保持安静，等待监考老师收取试卷，不得离开座位',
    invigilator: '按顺序收取全部试卷，清点数量，填写考场记录',
  },
}

function buildDefault() {
  return {
    // 考试基本信息
    examId: 'exam_' + Date.now(),
    subject: '请在管理页配置科目名称',
    roomNo: '考场一',
    // 考试时间（ISO 字符串，如 "2026-06-07T09:00"）
    examStartTime: '',
    // 考试总时长（分钟）
    examDuration: 120,
    // 考前多少分钟开始 PREPARING 阶段
    prepareMinutesBefore: 30,
    // ── 可配置的阶段切换阈值（分钟） ──
    // 开考前多少分钟进入 DISTRIBUTING 阶段
    distributeMinutesBefore: 15,
    // 距考试结束多少分钟进入 WARNING 阶段
    warningMinutes: 15,
    // 距考试结束多少分钟进入 CRITICAL 阶段
    criticalMinutes: 5,
    // 考试结束后多少分钟退出 EXAM_FINISHED 阶段
    finishedMinutesAfter: 15,
    // 时钟校准偏移（毫秒），DisplayTime = Date.now() + calibrationOffsetMs
    calibrationOffsetMs: 0,
    // 是否启用音效
    audioEnabled: true,
    // 是否启用 TTS 语音播报（阶段切换时朗读考生提示）
    ttsEnabled: true,
    // TTS 语速（0.5~2.0，1.0 正常）
    ttsRate: 1.0,
    // 颜色模式：'dark' | 'light'
    colorMode: 'dark',
    // 每阶段提示语（深拷贝默认值）
    prompts: JSON.parse(JSON.stringify(DEFAULT_PROMPTS)),
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefault()
    const saved = JSON.parse(raw)
    // 合并默认值（兼容旧版本缺失字段）
    const base = buildDefault()
    return {
      ...base,
      ...saved,
      prompts: {
        PREPARING:       { ...base.prompts.PREPARING,       ...(saved.prompts?.PREPARING || {}) },
        DISTRIBUTING:    { ...base.prompts.DISTRIBUTING,    ...(saved.prompts?.DISTRIBUTING || {}) },
        EXAMING_NORMAL:  { ...base.prompts.EXAMING_NORMAL,  ...(saved.prompts?.EXAMING_NORMAL || {}) },
        EXAMING_WARNING: { ...base.prompts.EXAMING_WARNING, ...(saved.prompts?.EXAMING_WARNING || {}) },
        EXAMING_CRITICAL:{ ...base.prompts.EXAMING_CRITICAL,...(saved.prompts?.EXAMING_CRITICAL || {}) },
        EXAM_FINISHED:   { ...base.prompts.EXAM_FINISHED,   ...(saved.prompts?.EXAM_FINISHED || {}) },
      }
    }
  } catch {
    return buildDefault()
  }
}

// 单例响应式配置对象
const config = reactive(loadFromStorage())

// 自动持久化：配置变更 → 写入 localStorage（防抖 500ms）
let saveTimer = null
watch(config, () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      console.warn('[ExamMonitor] localStorage 写入失败')
    }
  }, 500)
}, { deep: true })

/** 重置为默认值 */
function resetConfig() {
  const defaults = buildDefault()
  Object.assign(config, defaults)
}

/** 导出可供外部修改的响应式对象 + 只读视图 */
export function useConfig() {
  return {
    config,           // 可写，供 admin 页使用
    configReadonly: readonly(config),  // 只读，供大屏主页使用
    resetConfig,
    DEFAULT_PROMPTS,
  }
}
