<template>
  <!-- 底部 SVG 时间轴 8% -->
  <div
    class="flex items-center px-8 md:px-14 border-t"
    :class="isDark ? 'bg-screen-bg border-white/10' : 'bg-screen-bg-light border-black/8'"
  >
    <svg
      ref="svgEl"
      class="w-full"
      :height="svgHeight"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- 已完成进度渐变 -->
        <linearGradient id="fillGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   :stop-color="gradientStart" />
          <stop offset="100%" :stop-color="gradientEnd" />
        </linearGradient>

        <!-- 游标外发光滤镜 -->
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- 轨道背景 -->
      <rect
        :x="trackX"
        :y="trackY"
        :width="trackWidth"
        :height="trackH"
        rx="3"
        :fill="isDark ? '#1E293B' : '#CBD5E1'"
      />

      <!-- 已流逝进度填充 -->
      <rect
        :x="trackX"
        :y="trackY"
        :width="fillWidth"
        :height="trackH"
        rx="3"
        fill="url(#fillGradient)"
      />

      <!-- 关键节点标注 -->
      <g v-for="node in timelineNodes" :key="node.label">
        <!-- 节点竖线 -->
        <line
          :x1="node.x"
          :y1="trackY - 6"
          :x2="node.x"
          :y2="trackY + trackH + 6"
          :stroke="isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'"
          stroke-width="1"
          stroke-dasharray="3 2"
        />
        <!-- 节点文字 -->
        <text
          :x="node.x"
          :y="trackY - 10"
          text-anchor="middle"
          :font-size="labelFontSize"
          font-family="Inter, PingFang SC, sans-serif"
          :fill="isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'"
        >{{ node.label }}</text>
      </g>

      <!-- 当前时间游标（外发光） -->
      <g
        filter="url(#glow)"
        :transform="`translate(${cursorX}, 0)`"
        style="will-change: transform"
      >
        <!-- 游标竖线 -->
        <line
          :y1="trackY - 4"
          :y2="trackY + trackH + 4"
          x1="0" x2="0"
          :stroke="cursorColor"
          stroke-width="2"
        />
        <!-- 游标菱形头 -->
        <polygon
          :points="`0,${trackY - 10} 5,${trackY - 4} 0,${trackY + 2} -5,${trackY - 4}`"
          :fill="cursorColor"
        />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConfig } from '@/composables/useConfig.js'
import { STAGES, calcExamState } from '@/composables/useExamState.js'

const props = defineProps({
  stage:            { type: String, required: true },
  timelineProgress: { type: Number, default: 0 },  // 0~1
  displayTimeMs:    { type: Number, required: true },
})

const { config } = useConfig()
const isDark = computed(() => config.colorMode === 'dark')

// ── SVG 尺寸 ─────────────────────────────────────────────
const svgEl     = ref(null)
const svgWidth  = ref(1000)
const svgHeight = 56

const trackPad  = 60   // 左右留白给文字
const trackX    = computed(() => trackPad)
const trackWidth= computed(() => svgWidth.value - trackPad * 2)
const trackY    = 32
const trackH    = 6
const labelFontSize = computed(() => Math.max(10, svgWidth.value * 0.011))

// 监听容器宽度变化
const ro = new ResizeObserver(entries => {
  for (const entry of entries) {
    svgWidth.value = entry.contentRect.width || 1000
  }
})
onMounted(() => { if (svgEl.value) ro.observe(svgEl.value) })
onUnmounted(() => ro.disconnect())

// ── 关键节点 ──────────────────────────────────────────────
const timelineNodes = computed(() => {
  const d = calcExamState(props.displayTimeMs, config)
  if (!d.prepareStartMs || !d.finishedEndMs) return []

  const total   = d.finishedEndMs - d.prepareStartMs
  const tw      = trackWidth.value
  const tx      = trackX.value

  const pct = (ms) => {
    const p = (ms - d.prepareStartMs) / total
    return tx + Math.min(1, Math.max(0, p)) * tw
  }

  return [
    { x: pct(d.prepareStartMs),   label: '准备入场' },
    { x: pct(d.distributeStartMs),label: '分发试卷' },
    { x: pct(d.examStartMs),      label: '开考' },
    { x: pct(d.examEndMs - 15*60*1000), label: '-15min' },
    { x: pct(d.examEndMs - 5*60*1000),  label: '-5min' },
    { x: pct(d.examEndMs),        label: '交卷' },
    { x: pct(d.finishedEndMs),    label: '收卷结束' },
  ]
})

// ── 已填充宽度 ───────────────────────────────────────────
const fillWidth = computed(() => {
  return Math.max(0, props.timelineProgress * trackWidth.value)
})

// ── 游标位置 ─────────────────────────────────────────────
const cursorX = computed(() => {
  return trackX.value + fillWidth.value
})

// ── 游标颜色（跟随阶段） ─────────────────────────────────
const cursorColor = computed(() => {
  if (props.stage === STAGES.EXAMING_CRITICAL) return '#EF4444'
  if (props.stage === STAGES.EXAMING_WARNING)  return '#F59E0B'
  if (props.stage === STAGES.EXAM_FINISHED)    return '#64748B'
  if (props.stage === STAGES.STANDBY)          return '#475569'
  return '#10B981'
})

// ── 渐变颜色 ─────────────────────────────────────────────
const gradientStart = computed(() => {
  return isDark.value ? '#10B981' : '#059669'
})
const gradientEnd = computed(() => {
  if (props.stage === STAGES.EXAMING_CRITICAL) return '#EF4444'
  if (props.stage === STAGES.EXAMING_WARNING)  return '#F59E0B'
  return isDark.value ? '#10B981' : '#059669'
})
</script>
