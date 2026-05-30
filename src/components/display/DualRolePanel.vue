<template>
  <!-- 双角色任务栏 32%：左考生 / 右监考 -->
  <div
    class="grid grid-cols-2 border-t"
    :class="isDark ? 'border-white/10' : 'border-black/8'"
  >
    <!-- 左侧：考生 -->
    <div
      class="flex flex-col items-center justify-center px-6 md:px-10 py-4 border-r"
      :class="[
        isDark ? 'border-white/10' : 'border-black/8',
        panelBgClass('student')
      ]"
    >
      <!-- 角色标签 -->
      <div class="flex items-center gap-2 mb-3 md:mb-4">
        <!-- 考生图标 -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="isDark ? 'text-white/40' : 'text-black/40'">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span
          class="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase"
          :class="isDark ? 'text-white/40' : 'text-black/40'"
        >
          考生须知
        </span>
      </div>

      <!-- 提示文字 -->
      <p
        class="text-center text-sm sm:text-base md:text-lg lg:text-xl font-medium leading-relaxed max-w-[40ch]"
        :class="textColorClass"
      >
        {{ studentPrompt }}
      </p>
    </div>

    <!-- 右侧：监考老师 -->
    <div
      class="flex flex-col items-center justify-center px-6 md:px-10 py-4"
      :class="panelBgClass('invigilator')"
    >
      <!-- 角色标签 -->
      <div class="flex items-center gap-2 mb-3 md:mb-4">
        <!-- 监考图标 -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="isDark ? 'text-white/40' : 'text-black/40'">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <span
          class="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase"
          :class="isDark ? 'text-white/40' : 'text-black/40'"
        >
          监考操作
        </span>
      </div>

      <!-- 提示文字 -->
      <p
        class="text-center text-sm sm:text-base md:text-lg lg:text-xl font-medium leading-relaxed max-w-[40ch]"
        :class="textColorClass"
      >
        {{ invigilatorPrompt }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConfig } from '@/composables/useConfig.js'
import { STAGES } from '@/composables/useExamState.js'

const props = defineProps({
  stage: { type: String, required: true },
})

const { config } = useConfig()
const isDark = computed(() => config.colorMode === 'dark')

// 当前阶段提示语
const currentPrompts = computed(() => {
  const stage = props.stage
  if (stage === STAGES.STANDBY) {
    return {
      student:     '请等待考试信息配置完成',
      invigilator: '请前往管理页配置考试时间',
    }
  }
  return config.prompts[stage] || { student: '', invigilator: '' }
})

const studentPrompt     = computed(() => currentPrompts.value.student)
const invigilatorPrompt = computed(() => currentPrompts.value.invigilator)

// 文字颜色
const textColorClass = computed(() => {
  return isDark.value ? 'text-screen-text' : 'text-screen-text-light'
})

// 面板背景（危急时左侧轻微红色渲染）
function panelBgClass(role) {
  if (props.stage === STAGES.EXAMING_CRITICAL) {
    if (role === 'student') {
      return isDark.value
        ? 'bg-red-950/20'
        : 'bg-red-50'
    }
  }
  if (props.stage === STAGES.EXAMING_WARNING) {
    if (role === 'student') {
      return isDark.value
        ? 'bg-amber-950/20'
        : 'bg-amber-50'
    }
  }
  return isDark.value ? 'bg-screen-bg' : 'bg-screen-bg-light'
}
</script>
