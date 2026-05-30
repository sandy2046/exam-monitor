/**
 * usePresets.js
 * 多套考试方案管理 —— 保存/加载/切换/删除考试配置预设
 * 全部持久化到 localStorage: exam_monitor_presets
 */
import { reactive, computed, watch } from 'vue'
import { useConfig } from './useConfig.js'

const STORAGE_KEY = 'exam_monitor_presets'

/** 默认内置预设（快速测试方案） */
const BUILTIN_PRESETS = [
  {
    id: '__quick_test__',
    name: '⚡ 快速测试（6阶段×30秒）',
    config: {
      subject: '🧪 快速测试科目',
      roomNo: '测试考场',
      examDuration: 1.5,
      prepareMinutesBefore: 1.0,
      distributeMinutesBefore: 0.5,
      warningMinutes: 1.0,
      criticalMinutes: 0.5,
      finishedMinutesAfter: 0.5,
      calibrationOffsetMs: 0,
      audioEnabled: true,
      ttsEnabled: true,
      ttsRate: 1.0,
      colorMode: 'dark',
    },
    createdAt: Date.now(),
    builtin: true,
  },
]

function uid() {
  return 'preset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function buildState() {
  return {
    presets: JSON.parse(JSON.stringify(BUILTIN_PRESETS)),
    activePresetId: '__quick_test__',
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildState()
    const saved = JSON.parse(raw)
    // 确保内置预设始终存在
    const hasBuiltin = saved.presets?.some(p => p.id === '__quick_test__')
    return {
      presets: hasBuiltin
        ? saved.presets
        : [...JSON.parse(JSON.stringify(BUILTIN_PRESETS)), ...(saved.presets || [])],
      activePresetId: saved.activePresetId || '__quick_test__',
    }
  } catch {
    return buildState()
  }
}

// 单例响应式状态
const state = reactive(loadState())

// 自动持久化
let saveTimer = null
watch(state, () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        presets: state.presets,
        activePresetId: state.activePresetId,
      }))
    } catch { /* ignore */ }
  }, 300)
}, { deep: true })

/** 获取当前激活的预设 */
function getActivePreset() {
  return state.presets.find(p => p.id === state.activePresetId) || null
}

/** 列出所有预设（内置排最前） */
const presetList = computed(() => {
  return [...state.presets].sort((a, b) => {
    if (a.builtin && !b.builtin) return -1
    if (!a.builtin && b.builtin) return 1
    return b.createdAt - a.createdAt
  })
})

const activePreset = computed(() => getActivePreset())
const activePresetName = computed(() => activePreset.value?.name || '未命名方案')

/**
 * 将当前 config 保存为预设（新建或覆盖）
 * @param {string} name  预设名称
 * @param {boolean} overwrite  是否覆盖当前激活的预设
 */
function saveAsPreset(name, overwrite = false) {
  const { config } = useConfig()
  const snapshot = JSON.parse(JSON.stringify(config))

  if (overwrite && activePreset.value && !activePreset.value.builtin) {
    // 覆盖当前预设
    const p = state.presets.find(p => p.id === state.activePresetId)
    if (p) {
      p.name = name
      p.config = snapshot
      p.createdAt = Date.now()
      return p.id
    }
  }

  // 新建预设
  const id = uid()
  state.presets.push({
    id,
    name,
    config: snapshot,
    createdAt: Date.now(),
    builtin: false,
  })
  state.activePresetId = id
  return id
}

/** 加载预设到当前 config */
function loadPreset(presetId) {
  const preset = state.presets.find(p => p.id === presetId)
  if (!preset) return false

  const { config } = useConfig()
  // 保留 prompts（提示语通常不随预设整体覆盖，除非预设里有）
  const savedPrompts = preset.config.prompts
  Object.assign(config, preset.config)
  if (savedPrompts) {
    config.prompts = JSON.parse(JSON.stringify(savedPrompts))
  }
  state.activePresetId = presetId
  return true
}

/** 删除预设 */
function deletePreset(presetId) {
  const preset = state.presets.find(p => p.id === presetId)
  if (!preset || preset.builtin) return false

  const idx = state.presets.findIndex(p => p.id === presetId)
  state.presets.splice(idx, 1)

  // 如果删除的是当前激活的，切到第一个
  if (state.activePresetId === presetId) {
    state.activePresetId = state.presets[0]?.id || '__quick_test__'
    if (state.presets[0]) {
      loadPreset(state.presets[0].id)
    }
  }
  return true
}

/** 重命名预设 */
function renamePreset(presetId, newName) {
  const preset = state.presets.find(p => p.id === presetId)
  if (!preset || preset.builtin) return false
  preset.name = newName
  return true
}

export function usePresets() {
  return {
    presetList,
    activePreset,
    activePresetName,
    activePresetId: computed(() => state.activePresetId),
    saveAsPreset,
    loadPreset,
    deletePreset,
    renamePreset,
  }
}
