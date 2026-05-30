<template>
  <!-- 顶部元数据栏 8% -->
  <div
    class="flex items-center justify-between px-6 md:px-10 border-b"
    :class="isDark
      ? 'bg-screen-bg border-white/10 text-screen-text'
      : 'bg-screen-bg-light border-black/10 text-screen-text-light'"
  >
    <!-- 左：科目 + 考场编号 -->
    <div class="flex items-center gap-4 min-w-0">
      <span class="font-bold text-lg md:text-xl tracking-wide truncate">
        {{ config.subject || '考试科目' }}
      </span>
      <span
        class="text-xs md:text-sm px-2 py-0.5 rounded font-mono"
        :class="isDark ? 'bg-white/10 text-screen-muted' : 'bg-black/8 text-gray-500'"
      >
        {{ config.roomNo || '考场' }}
      </span>
    </div>

    <!-- 中：当前阶段徽章 -->
    <div class="hidden sm:flex items-center gap-2">
      <span
        class="px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
        :class="stageBadgeClass"
      >
        {{ stageLabel }}
      </span>
    </div>

    <!-- 右：实时时钟 + 切换按钮 -->
    <div class="flex items-center gap-3 shrink-0">
      <span class="tabular-digits font-mono text-base md:text-xl font-semibold">
        {{ nowFormatted }}
      </span>
      <!-- 深/浅色切换 -->
      <button
        @click="toggleColorMode"
        class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        :class="isDark ? 'hover:bg-white/10 text-screen-muted' : 'hover:bg-black/8 text-gray-500'"
        :title="isDark ? '切换为浅色模式' : '切换为深色模式'"
        aria-label="切换颜色模式"
      >
        <!-- 太阳图标（深色模式下显示，点击切浅色） -->
        <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <!-- 月亮图标（浅色模式下显示） -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>

      <!-- 管理页入口（小图标，不显眼） -->
      <a
        href="#admin"
        class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        :class="isDark ? 'hover:bg-white/10 text-white/20 hover:text-white/60' : 'hover:bg-black/8 text-black/20 hover:text-black/60'"
        title="管理配置"
        aria-label="进入管理配置页"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M14.12 2.29A10 10 0 0 0 2.29 14.12M9.88 21.71A10 10 0 0 0 21.71 9.88M4.93 19.07 2.29 14.12M19.07 4.93 21.71 9.88"/>
        </svg>
      </a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConfig } from '@/composables/useConfig.js'
import { STAGE_LABELS } from '@/composables/useExamState.js'

const props = defineProps({
  stage:       { type: String, required: true },
  stageLabel:  { type: String, required: true },
  nowFormatted:{ type: String, required: true },
})

const { config } = useConfig()

const isDark = computed(() => config.colorMode === 'dark')

function toggleColorMode() {
  config.colorMode = isDark.value ? 'light' : 'dark'
}

const stageBadgeClass = computed(() => {
  const map = {
    STANDBY:          'bg-white/10 text-white/40',
    PREPARING:        'bg-emerald-500/20 text-emerald-400',
    DISTRIBUTING:     'bg-emerald-500/20 text-emerald-400',
    EXAMING_NORMAL:   'bg-emerald-500/20 text-emerald-400',
    EXAMING_WARNING:  'bg-amber-500/20 text-amber-400',
    EXAMING_CRITICAL: 'bg-red-500/20 text-red-400',
    EXAM_FINISHED:    'bg-slate-500/20 text-slate-400',
  }
  return map[props.stage] || 'bg-white/10 text-white/40'
})
</script>
