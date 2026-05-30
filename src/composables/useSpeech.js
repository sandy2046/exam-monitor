/**
 * useSpeech.js
 * 阶段切换时用 Web Speech API 朗读考生任务提示
 *
 * 使用方式：
 *   在 DisplayView 中 watch(stage) → speakPrompt(stageValue, studentPromptText)
 *
 * 浏览器兼容：所有现代浏览器均支持 SpeechSynthesis
 * 注意事项：首次调用需要用户交互（点击页面）以解锁音频策略
 */
import { ref } from 'vue'
import { useConfig } from './useConfig.js'

const { configReadonly } = useConfig()

/** 是否已经完成首次用户交互解锁 */
const unlocked = ref(false)
/** 最后一次播报的阶段 */
let lastSpokenStage = null

/**
 * 标记用户已交互，解锁语音播报
 * 在 DisplayView 的 mounted / 首次点击中调用
 */
export function unlockSpeech() {
  if (unlocked.value) return
  // 尝试发出一个空 utterance 来解锁浏览器音频策略
  try {
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    u.rate = 2
    speechSynthesis.speak(u)
    unlocked.value = true
  } catch {
    // 静默失败
  }
}

/**
 * 获取最佳中文语音
 */
function getChineseVoice() {
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return null

  // 优先级：1. 中文女声(zh-CN female) 2. 中文任意 3. 默认
  const prefer = voices.find(v => v.lang.startsWith('zh-CN') && v.name.includes('Female'))
  if (prefer) return prefer
  const anyChinese = voices.find(v => v.lang.startsWith('zh'))
  if (anyChinese) return anyChinese
  return voices.find(v => v.default) || voices[0]
}

/**
 * 播报指定文本
 * @param {string} text  要朗读的文本
 * @returns {Promise}  播报完成的 Promise
 */
export function speakText(text) {
  return new Promise((resolve) => {
    if (!text || !text.trim()) {
      resolve()
      return
    }

    // 检查 TTS 开关
    if (!configReadonly.ttsEnabled) {
      resolve()
      return
    }

    // 停止当前正在播放的语音
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = getChineseVoice()
    if (voice) utterance.voice = voice
    utterance.lang = 'zh-CN'
    utterance.rate = configReadonly.ttsRate ?? 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onend = () => resolve()
    utterance.onerror = (e) => {
      // 'interrupted' 是正常的（被 cancel 打断），不报错
      if (e.error !== 'interrupted') {
        console.warn('[TTS] 语音播报出错:', e.error)
      }
      resolve()
    }

    speechSynthesis.speak(utterance)
  })
}

/**
 * 阶段切换时播报考生提示
 * @param {string} stage     当前阶段 STAGE 枚举值
 * @param {string} prompt    考生提示文本
 */
export async function speakStagePrompt(stage, prompt) {
  // 去重：同一阶段只播一次
  if (stage === lastSpokenStage) return
  lastSpokenStage = stage

  if (!configReadonly.ttsEnabled) return
  if (!prompt || !prompt.trim()) return

  // 短暂延迟确保 UI 先更新
  await new Promise(r => setTimeout(r, 300))
  await speakText(prompt)
}

/**
 * 重置阶段记忆（用于切换预设/恢复时重新播报）
 */
export function resetSpeechMemory() {
  lastSpokenStage = null
}

export function useSpeech() {
  return {
    unlocked,
    unlockSpeech,
    speakText,
    speakStagePrompt,
    resetSpeechMemory,
  }
}
