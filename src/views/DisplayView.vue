<template>
  <div
    class="display-grid"
    :class="isDark ? 'bg-screen-bg' : 'bg-screen-bg-light'"
  >
    <!-- 顶部元数据 8% -->
    <TopMetaBar
      :stage="stage"
      :stage-label="stageLabel"
      :now-formatted="nowFormatted"
    />

    <!-- 中部倒计时 52% -->
    <CountdownCore
      :stage="stage"
      :countdown-text="countdownText"
      :countdown-subtitle="countdownSubtitle"
      :remaining-sec="remainingSec"
    />

    <!-- 双角色任务栏 32% -->
    <DualRolePanel :stage="stage" />

    <!-- 底部时间轴 8% -->
    <TimelineBar
      :stage="stage"
      :timeline-progress="timelineProgress"
      :display-time-ms="displayTimeMs"
    />
  </div>
</template>

<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import TopMetaBar    from '@/components/display/TopMetaBar.vue'
import CountdownCore from '@/components/display/CountdownCore.vue'
import DualRolePanel from '@/components/display/DualRolePanel.vue'
import TimelineBar   from '@/components/display/TimelineBar.vue'

import { useMasterClock }  from '@/composables/useMasterClock.js'
import { useExamState, STAGES }    from '@/composables/useExamState.js'
import { useAudioAlert }   from '@/composables/useAudioAlert.js'
import { useConfig }       from '@/composables/useConfig.js'
import { speakStagePrompt, unlockSpeech, resetSpeechMemory } from '@/composables/useSpeech.js'

const { config, configReadonly } = useConfig()
const isDark = computed(() => config.colorMode === 'dark')

// ── 时钟引擎 ──────────────────────────────────────────────
const { displayTimeMs, nowFormatted, registerSecondCallback } = useMasterClock()

// ── 状态机 ────────────────────────────────────────────────
const {
  stage, stageLabel,
  remainingSec, totalSec,
  timelineProgress,
  countdownText, countdownSubtitle,
  saveSnapshot,
} = useExamState(displayTimeMs)

// ── 音效 ──────────────────────────────────────────────────
const { playStageSound } = useAudioAlert()
const prevStage = ref(stage.value)

watch(stage, (newStage, oldStage) => {
  if (newStage !== oldStage) {
    playStageSound(newStage)
    prevStage.value = newStage
  }
})

// ── TTS 语音播报 ──────────────────────────────────────────
// 阶段切换时朗读考生提示文本
watch(stage, (newStage, oldStage) => {
  if (newStage === oldStage) return
  if (newStage === STAGES.STANDBY) return

  const prompt = config.prompts?.[newStage]?.student
  if (prompt) {
    speakStagePrompt(newStage, prompt)
  }
})

// 首次交互解锁语音（浏览器音频策略要求用户交互后才能播放）
function onFirstInteraction() {
  unlockSpeech()
}

onMounted(() => {
  // 添加全局一次性点击监听
  document.addEventListener('click', onFirstInteraction, { once: true })
})

// ── 每秒心跳：保存 localStorage 快照 ────────────────────
registerSecondCallback((nowMs) => {
  saveSnapshot(nowMs)
})
</script>
