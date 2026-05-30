/**
 * useAudioAlert.js
 * 用 Web Audio API 生成阶段切换提示音（无需任何外部音频文件）
 *
 * 音效设计：
 *   - 进入 DISTRIBUTING    → 单音"叮"（提示准备）
 *   - 进入 EXAMING_NORMAL  → 双音"叮咚"（开考）
 *   - 进入 EXAMING_WARNING → 三声短鸣（预警）
 *   - 进入 EXAMING_CRITICAL → 急促短鸣×4（危急）
 *   - 进入 EXAM_FINISHED   → 长音下行（结束）
 */
import { ref } from 'vue'
import { useConfig } from './useConfig.js'
import { STAGES } from './useExamState.js'

export function useAudioAlert() {
  const { configReadonly } = useConfig()
  let audioCtx = null

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtx
  }

  /**
   * 播放一个纯音
   * @param {number} freq      频率 Hz
   * @param {number} startAt   从 AudioContext.currentTime 偏移多少秒开始
   * @param {number} duration  持续秒数
   * @param {number} volume    音量 0~1
   * @param {'sine'|'square'|'triangle'|'sawtooth'} type
   */
  function playTone(freq, startAt, duration, volume = 0.3, type = 'sine') {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt)
    gain.gain.setValueAtTime(0, ctx.currentTime + startAt)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration)
    osc.start(ctx.currentTime + startAt)
    osc.stop(ctx.currentTime + startAt + duration + 0.05)
  }

  const SOUNDS = {
    [STAGES.DISTRIBUTING]: () => {
      playTone(880, 0,    0.3, 0.25)
    },
    [STAGES.EXAMING_NORMAL]: () => {
      // 开考双音
      playTone(880,  0,    0.3, 0.3)
      playTone(1100, 0.35, 0.3, 0.3)
    },
    [STAGES.EXAMING_WARNING]: () => {
      // 三声预警
      playTone(660, 0,   0.2, 0.3, 'triangle')
      playTone(660, 0.3, 0.2, 0.3, 'triangle')
      playTone(660, 0.6, 0.2, 0.3, 'triangle')
    },
    [STAGES.EXAMING_CRITICAL]: () => {
      // 四声急促
      playTone(880, 0,    0.15, 0.35, 'square')
      playTone(880, 0.2,  0.15, 0.35, 'square')
      playTone(880, 0.4,  0.15, 0.35, 'square')
      playTone(1100, 0.6, 0.2,  0.35, 'square')
    },
    [STAGES.EXAM_FINISHED]: () => {
      // 下行长音
      playTone(880, 0,   0.4, 0.3)
      playTone(660, 0.45,0.4, 0.3)
      playTone(440, 0.9, 0.6, 0.3)
    },
  }

  function playStageSound(stage) {
    if (!configReadonly.audioEnabled) return
    const fn = SOUNDS[stage]
    if (!fn) return
    try {
      // iOS/Chrome 需要用户交互后才能播放，安静失败即可
      fn()
    } catch (e) {
      console.warn('[ExamMonitor] 音效播放失败:', e.message)
    }
  }

  return { playStageSound }
}
