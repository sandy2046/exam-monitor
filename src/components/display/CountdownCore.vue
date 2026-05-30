<template>
  <!-- 中部倒计时区域 52% -->
  <div
    class="flex flex-col items-center justify-center relative overflow-hidden"
    :class="isDark ? 'bg-screen-bg' : 'bg-screen-bg-light'"
  >
    <!-- 副标题 -->
    <p
      class="text-sm sm:text-base md:text-lg font-medium tracking-[0.3em] uppercase mb-2 md:mb-4 transition-colors duration-700"
      :class="subtitleColorClass"
    >
      {{ countdownSubtitle }}
    </p>

    <!-- 主倒计时数字 -->
    <div
      ref="countdownEl"
      class="tabular-digits font-display select-none leading-none transition-colors duration-700"
      :class="[countdownSizeClass, countdownColorClass, { 'font-extrabold': isCritical }]"
      :style="heartbeatStyle"
      aria-live="polite"
      aria-label="`倒计时 ${countdownText}`"
    >
      {{ countdownText }}
    </div>

    <!-- 阶段描述（考试已结束等特殊态） -->
    <p
      v-if="stage === 'EXAM_FINISHED'"
      class="mt-4 text-xl md:text-2xl font-semibold tracking-widest"
      :class="isDark ? 'text-slate-400' : 'text-slate-500'"
    >
      请等待监考老师收卷
    </p>

    <!-- 待机态 -->
    <p
      v-if="stage === 'STANDBY'"
      class="mt-3 text-base md:text-lg tracking-wider"
      :class="isDark ? 'text-white/30' : 'text-black/30'"
    >
      {{ config.examStartTime ? '考试尚未开始' : '请前往管理页配置考试信息' }}
    </p>

    <!-- 背景装饰光晕（危急状态） -->
    <div
      v-if="isCritical"
      class="absolute inset-0 pointer-events-none"
      style="background: radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 70%)"
    />
    <!-- 预警背景光晕 -->
    <div
      v-else-if="isWarning"
      class="absolute inset-0 pointer-events-none"
      style="background: radial-gradient(ellipse at center, rgba(245,158,11,0.04) 0%, transparent 70%)"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useConfig } from '@/composables/useConfig.js'
import { STAGES } from '@/composables/useExamState.js'

const props = defineProps({
  stage:            { type: String, required: true },
  countdownText:    { type: String, required: true },
  countdownSubtitle:{ type: String, required: true },
  remainingSec:     { type: Number, default: 0 },
})

const { config } = useConfig()
const isDark = computed(() => config.colorMode === 'dark')

const isWarning  = computed(() => props.stage === STAGES.EXAMING_WARNING)
const isCritical = computed(() => props.stage === STAGES.EXAMING_CRITICAL)
const isFinished = computed(() => props.stage === STAGES.EXAM_FINISHED)

// ── 颜色状态 ──────────────────────────────────────────────
const countdownColorClass = computed(() => {
  if (isCritical.value) return 'text-red-500'
  if (isWarning.value)  return 'text-amber-500 animate-pulse-slow'
  if (isFinished.value) return isDark.value ? 'text-slate-500' : 'text-slate-400'
  if (props.stage === STAGES.STANDBY) return isDark.value ? 'text-white/20' : 'text-black/20'
  return 'text-emerald-500'
})

const subtitleColorClass = computed(() => {
  if (isCritical.value) return 'text-red-400/70'
  if (isWarning.value)  return 'text-amber-400/70'
  if (isFinished.value) return isDark.value ? 'text-slate-500' : 'text-slate-400'
  return isDark.value ? 'text-screen-muted' : 'text-slate-500'
})

// ── 字体大小（响应式） ────────────────────────────────────
const countdownSizeClass = computed(() => {
  const text = props.countdownText
  // HH:MM:SS = 8 chars, MM:SS = 5 chars
  if (text.length >= 8) return 'text-[14vw] sm:text-[16vw]'
  return 'text-[20vw] sm:text-[22vw]'
})

// ── 心跳动画（危急期，每秒整秒触发一次 scale pulse）──────
const heartbeatStyle = ref({})
let heartbeatTimer = null

function triggerHeartbeat() {
  heartbeatStyle.value = { transform: 'scale(1.04)' }
  clearTimeout(heartbeatTimer)
  heartbeatTimer = setTimeout(() => {
    heartbeatStyle.value = { transform: 'scale(1)', transition: 'transform 150ms ease-out' }
  }, 150)
}

// 监听秒数变化 → 危急期触发心跳
let lastSec = -1
watch(() => props.remainingSec, (newSec) => {
  if (isCritical.value && newSec !== lastSec) {
    lastSec = newSec
    triggerHeartbeat()
  }
})

onUnmounted(() => clearTimeout(heartbeatTimer))
</script>
