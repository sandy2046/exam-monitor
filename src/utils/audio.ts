/**
 * 音频工具
 * 封装浏览器 Audio API
 */

/**
 * 播放提示音
 * @param frequency 频率 (Hz), 默认 800
 * @param duration 持续时间 (秒), 默认 0.3
 * @param volume 音量 (0-1), 默认 0.3
 */
export function playBeep(
  frequency: number = 800,
  duration: number = 0.3,
  volume: number = 0.3
): void {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) {
      console.warn('浏览器不支持 AudioContext')
      return
    }

    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)
  } catch (error) {
    console.error('播放音频失败:', error)
  }
}

/**
 * 播放提醒声音（双响）
 */
export function playReminder(): void {
  playBeep(800, 0.2, 0.3)
  setTimeout(() => playBeep(1000, 0.2, 0.3), 250)
}

/**
 * 播放警告声音（三响）
 */
export function playAlert(): void {
  playBeep(600, 0.15, 0.4)
  setTimeout(() => playBeep(800, 0.15, 0.4), 180)
  setTimeout(() => playBeep(1000, 0.15, 0.4), 360)
}

/**
 * 检查是否可以播放音频
 * 浏览器通常需要用户交互后才能播放音频
 */
export function canPlayAudio(): boolean {
  // 简单检查 AudioContext 是否可用
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext
  return !!AudioContext
}

/**
 * 请求音频权限（在用户交互时调用）
 */
export function requestAudioPermission(): void {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContext) {
      const context = new AudioContext()
      // 创建一个静音的振荡器来激活音频系统
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      gainNode.gain.value = 0
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.01)
    }
  } catch (error) {
    console.warn('音频权限请求失败:', error)
  }
}
