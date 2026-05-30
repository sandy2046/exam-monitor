<template>
  <div
    class="admin-scroll min-h-[100dvh]"
    :class="isDark ? 'bg-[#0F172A] text-slate-100' : 'bg-slate-50 text-slate-900'"
  >
    <!-- 顶部导航栏 -->
    <header
      class="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm"
      :class="isDark ? 'bg-[#0F172A]/90 border-white/10' : 'bg-slate-50/90 border-black/10'"
    >
      <div class="flex items-center gap-3">
        <!-- 返回大屏 -->
        <a
          href="#"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/8 text-slate-500'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          返回大屏
        </a>
        <span :class="isDark ? 'text-white/20' : 'text-black/20'">|</span>
        <h1 class="text-base font-semibold tracking-wide">管理配置</h1>
      </div>

      <div class="flex items-center gap-3">
        <!-- 保存状态指示 -->
        <span class="text-xs" :class="isDark ? 'text-slate-500' : 'text-slate-400'">
          配置自动保存 ✓
        </span>
        <!-- 深浅色切换 -->
        <button
          @click="config.colorMode = isDark ? 'light' : 'dark'"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/8 hover:bg-black/15'"
        >
          {{ isDark ? '☀️ 浅色' : '🌙 深色' }}
        </button>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-6 py-8 space-y-8">

      <!-- ⓪ 考试方案管理 -->
      <section :class="sectionClass">
        <h2 :class="sectionTitleClass">⓪ 考试方案管理</h2>
        <p :class="hintClass" class="mb-4">可保存、切换多套考试配置方案（时间参数 + 提示语完整保存），方便不同考场快速切换</p>

        <!-- 方案选择行 -->
        <div class="flex items-center gap-3 flex-wrap">
          <select
            :value="activePresetId"
            @change="onPresetChange($event.target.value)"
            :class="inputClass"
            class="!w-auto min-w-[240px]"
          >
            <option v-for="p in presetList" :key="p.id" :value="p.id">
              {{ p.name }}{{ p.builtin ? ' [内置]' : '' }}
            </option>
          </select>
          <button @click="onSavePreset" class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isDark ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-500 text-white hover:bg-emerald-600'">
            💾 覆盖保存
          </button>
          <button @click="showSaveAs = true" class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/8 hover:bg-black/15'">
            📋 另存为新方案
          </button>
          <button
            v-if="curPresetIsDeletable"
            @click="onDeletePreset"
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'"
          >
            🗑 删除
          </button>
        </div>

        <!-- 另存为弹窗 -->
        <div v-if="showSaveAs" class="mt-3 flex items-center gap-2">
          <input v-model="newPresetName" type="text" placeholder="输入方案名称…" :class="inputClass" class="!w-64" @keyup.enter="onSaveAsPreset" />
          <button @click="onSaveAsPreset" class="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 transition-colors">确认</button>
          <button @click="showSaveAs = false; newPresetName = ''" class="px-3 py-2 rounded-lg text-sm transition-colors"
            :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/8'">取消</button>
        </div>

        <!-- 重命名弹窗 -->
        <div v-if="showRename" class="mt-3 flex items-center gap-2">
          <input v-model="renameText" type="text" placeholder="新名称…" :class="inputClass" class="!w-64" @keyup.enter="onRenamePreset" />
          <button @click="onRenamePreset" class="px-3 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-400 transition-colors">重命名</button>
          <button @click="showRename = false; renameText = ''" class="px-3 py-2 rounded-lg text-sm transition-colors"
            :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/8'">取消</button>
        </div>

        <div class="flex items-center gap-3 mt-3">
          <button @click="showRename = true; renameText = activePresetName"
            v-if="curPresetIsDeletable"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/8 hover:bg-black/15'">
            ✏️ 重命名
          </button>
          <span class="text-xs" :class="isDark ? 'text-slate-600' : 'text-slate-400'">
            当前方案：<strong :class="isDark ? 'text-slate-300' : 'text-slate-700'">{{ activePresetName }}</strong>
          </span>
        </div>
      </section>

      <!-- ① 考试基本信息 -->
      <section :class="sectionClass">
        <h2 :class="sectionTitleClass">① 考试基本信息</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label :class="labelClass">科目名称</label>
            <input v-model="config.subject" type="text" placeholder="例：数学（理）" :class="inputClass" />
          </div>
          <div>
            <label :class="labelClass">考场编号</label>
            <input v-model="config.roomNo" type="text" placeholder="例：第三考场" :class="inputClass" />
          </div>
          <div>
            <label :class="labelClass">考试开始时间</label>
            <input v-model="config.examStartTime" type="datetime-local" :class="inputClass" />
          </div>
          <div>
            <label :class="labelClass">考试总时长（分钟）</label>
            <input v-model.number="config.examDuration" type="number" min="1" max="480" :class="inputClass" />
          </div>
          <div>
            <label :class="labelClass">考前准备阶段提前量（分钟）</label>
            <input v-model.number="config.prepareMinutesBefore" type="number" min="5" max="60" :class="inputClass" />
            <p :class="hintClass">大屏从开考前多少分钟开始显示"考前准备"阶段</p>
          </div>
        </div>

        <!-- 时间预览 -->
        <div
          v-if="config.examStartTime"
          class="mt-4 p-4 rounded-lg text-sm space-y-1"
          :class="isDark ? 'bg-white/5 text-slate-400' : 'bg-black/5 text-slate-500'"
        >
          <div class="font-medium mb-2" :class="isDark ? 'text-slate-300' : 'text-slate-700'">时间节点预览</div>
          <div v-for="node in timePreview" :key="node.label" class="flex justify-between">
            <span>{{ node.label }}</span>
            <span class="font-mono tabular-digits">{{ node.time }}</span>
          </div>
        </div>
      </section>

      <!-- ①b 阶段阈值 + 快速测试模式 -->
      <section :class="sectionClass">
        <div class="flex items-center justify-between mb-5">
          <h2 :class="sectionTitleClass" class="!mb-0">①b 阶段切换阈值 & 快速测试</h2>
          <button
            @click="applyQuickTest"
            class="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
            :class="isDark ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-500 text-white hover:bg-emerald-600'"
          >
            ⚡ 快速测试模式（每阶段30秒）
          </button>
        </div>
        <p :class="hintClass" class="mb-4">
          控制阶段切换的时间边界。点击「快速测试模式」将自动填入 6阶段×30秒 的测试参数，并把开始时间设为 <strong>当前时间+30秒</strong> 使 PREPARING 立即开始。
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label :class="labelClass">分发阶段</label>
            <div class="flex items-center gap-1">
              <input v-model.number="config.distributeMinutesBefore" type="number" min="0.1" max="60" step="0.1" :class="inputClass" />
              <span class="text-xs whitespace-nowrap" :class="isDark ? 'text-slate-500' : 'text-slate-400'">分钟</span>
            </div>
          </div>
          <div>
            <label :class="labelClass">预警阈值</label>
            <div class="flex items-center gap-1">
              <input v-model.number="config.warningMinutes" type="number" min="0.1" max="60" step="0.1" :class="inputClass" />
              <span class="text-xs whitespace-nowrap" :class="isDark ? 'text-slate-500' : 'text-slate-400'">分钟</span>
            </div>
          </div>
          <div>
            <label :class="labelClass">冲刺阈值</label>
            <div class="flex items-center gap-1">
              <input v-model.number="config.criticalMinutes" type="number" min="0.1" max="60" step="0.1" :class="inputClass" />
              <span class="text-xs whitespace-nowrap" :class="isDark ? 'text-slate-500' : 'text-slate-400'">分钟</span>
            </div>
          </div>
          <div>
            <label :class="labelClass">结束缓冲</label>
            <div class="flex items-center gap-1">
              <input v-model.number="config.finishedMinutesAfter" type="number" min="0.1" max="60" step="0.1" :class="inputClass" />
              <span class="text-xs whitespace-nowrap" :class="isDark ? 'text-slate-500' : 'text-slate-400'">分钟</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ② 时钟校准 -->
      <section :class="sectionClass">
        <h2 :class="sectionTitleClass">② 时钟校准偏移</h2>
        <p :class="hintClass" class="mb-4">
          DisplayTime = 系统时间 + 偏移量。正值表示时钟快进，负值表示时钟后退。
          对齐考场物理铃声时使用。
        </p>
        <div class="flex items-center gap-4">
          <span class="w-20 text-right font-mono tabular-digits text-sm" :class="isDark ? 'text-amber-400' : 'text-amber-600'">
            {{ calibrationDisplay }}
          </span>
          <input
            v-model.number="config.calibrationOffsetMs"
            type="range"
            min="-300000"
            max="300000"
            step="1000"
            class="flex-1 accent-emerald-500"
          />
          <button
            @click="config.calibrationOffsetMs = 0"
            class="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
            :class="isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/8 hover:bg-black/15'"
          >
            归零
          </button>
        </div>
        <div class="flex justify-between text-xs mt-1" :class="isDark ? 'text-slate-600' : 'text-slate-400'">
          <span>-300秒（后退5分钟）</span>
          <span>+300秒（快进5分钟）</span>
        </div>
      </section>

      <!-- ③ 音效设置 -->
      <section :class="sectionClass">
        <h2 :class="sectionTitleClass">③ 阶段切换音效</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">阶段切换提示音</p>
            <p :class="hintClass">每当考试进入新阶段时播放短促提示音（使用浏览器 Web Audio API，无需额外音频文件）</p>
          </div>
          <!-- Toggle -->
          <button
            @click="config.audioEnabled = !config.audioEnabled"
            class="relative w-12 h-6 rounded-full transition-colors duration-200"
            :class="config.audioEnabled ? 'bg-emerald-500' : (isDark ? 'bg-white/20' : 'bg-black/20')"
            :aria-checked="config.audioEnabled"
            role="switch"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
              :class="config.audioEnabled ? 'translate-x-6' : 'translate-x-0'"
            />
          </button>
        </div>
        <button
          @click="testAudio"
          class="mt-3 px-4 py-2 text-sm rounded-lg font-medium transition-colors"
          :class="isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/8 hover:bg-black/15'"
        >
          🔊 测试音效
        </button>
      </section>

      <!-- ③b TTS 语音播报 -->
      <section :class="sectionClass">
        <h2 :class="sectionTitleClass">③b 语音播报（TTS）</h2>
        <p :class="hintClass" class="mb-4">
          每次进入新阶段时，自动用语音朗读「考生提示」文本。使用浏览器内置语音合成引擎（无需联网）。
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <!-- TTS 开关 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">启用语音播报</p>
              <p :class="hintClass">阶段切换时朗读考生提示</p>
            </div>
            <button
              @click="config.ttsEnabled = !config.ttsEnabled"
              class="relative w-12 h-6 rounded-full transition-colors duration-200"
              :class="config.ttsEnabled ? 'bg-emerald-500' : (isDark ? 'bg-white/20' : 'bg-black/20')"
              :aria-checked="config.ttsEnabled"
              role="switch"
            >
              <span
                class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                :class="config.ttsEnabled ? 'translate-x-6' : 'translate-x-0'"
              />
            </button>
          </div>
          <!-- 语速调节 -->
          <div>
            <label :class="labelClass">语速：{{ config.ttsRate?.toFixed(1) || '1.0' }}x</label>
            <div class="flex items-center gap-3">
              <span class="text-xs" :class="isDark ? 'text-slate-500' : 'text-slate-400'">慢</span>
              <input
                v-model.number="config.ttsRate"
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                class="flex-1 accent-emerald-500"
              />
              <span class="text-xs" :class="isDark ? 'text-slate-500' : 'text-slate-400'">快</span>
            </div>
          </div>
        </div>
        <button
          @click="testTts"
          class="mt-4 px-4 py-2 text-sm rounded-lg font-medium transition-colors"
          :class="isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/8 hover:bg-black/15'"
        >
          🗣 测试语音播报
        </button>
      </section>

      <!-- ④ 每阶段提示语 -->
      <section :class="sectionClass">
        <h2 :class="sectionTitleClass">④ 各阶段提示语</h2>
        <p :class="hintClass" class="mb-5">每个考试阶段可分别自定义考生和监考老师看到的提示内容</p>

        <div class="space-y-6">
          <div
            v-for="(stageInfo, stageKey) in stagePromptDefs"
            :key="stageKey"
            class="border rounded-xl overflow-hidden"
            :class="isDark ? 'border-white/10' : 'border-black/10'"
          >
            <!-- 阶段标题栏 -->
            <div
              class="flex items-center gap-3 px-4 py-3 border-b"
              :class="[isDark ? 'border-white/10' : 'border-black/10', stageInfo.headerBg]"
            >
              <span class="text-lg">{{ stageInfo.icon }}</span>
              <div>
                <span class="font-semibold text-sm">{{ stageInfo.label }}</span>
                <span class="ml-2 text-xs" :class="isDark ? 'text-slate-500' : 'text-slate-400'">{{ stageInfo.timing }}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              <div>
                <label :class="labelClass">
                  <span class="mr-1">👤</span>考生提示
                </label>
                <textarea
                  v-model="config.prompts[stageKey].student"
                  rows="2"
                  :class="textareaClass"
                  :placeholder="`${stageInfo.label} — 考生提示语`"
                />
              </div>
              <div>
                <label :class="labelClass">
                  <span class="mr-1">👮</span>监考操作
                </label>
                <textarea
                  v-model="config.prompts[stageKey].invigilator"
                  rows="2"
                  :class="textareaClass"
                  :placeholder="`${stageInfo.label} — 监考提示语`"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 重置默认 -->
        <button
          @click="resetPrompts"
          class="mt-4 px-4 py-2 text-sm rounded-lg font-medium transition-colors"
          :class="isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'"
        >
          ↩ 重置为内置默认提示语
        </button>
      </section>

      <!-- 底部间距 -->
      <div class="h-8" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useConfig } from '@/composables/useConfig.js'
import { useAudioAlert } from '@/composables/useAudioAlert.js'
import { usePresets } from '@/composables/usePresets.js'
import { speakText } from '@/composables/useSpeech.js'
import { STAGES } from '@/composables/useExamState.js'

const { config, resetConfig, DEFAULT_PROMPTS } = useConfig()
const { playStageSound } = useAudioAlert()
const { presetList, activePresetName, activePresetId, saveAsPreset, loadPreset, deletePreset, renamePreset } = usePresets()

const isDark = computed(() => config.colorMode === 'dark')

// ── 方案管理状态 ──────────────────────────────────────────
const showSaveAs    = ref(false)
const newPresetName = ref('')
const showRename    = ref(false)
const renameText    = ref('')
const curPresetIsDeletable = computed(() => {
  const p = presetList.value.find(p => p.id === activePresetId.value)
  return p && !p.builtin
})

function onPresetChange(id) {
  if (!id) return
  loadPreset(id)
}

function onSavePreset() {
  if (!activePresetName.value || activePresetName.value === '未命名方案') {
    showSaveAs.value = true
    return
  }
  saveAsPreset(activePresetName.value, true)
  alert('✅ 当前方案已覆盖保存')
}

function onSaveAsPreset() {
  const name = newPresetName.value.trim()
  if (!name) { alert('请输入方案名称'); return }
  saveAsPreset(name, false)
  showSaveAs.value = false
  newPresetName.value = ''
  alert(`✅ 方案「${name}」已保存`)
}

function onDeletePreset() {
  if (!confirm(`确定要删除方案「${activePresetName.value}」吗？此操作不可恢复。`)) return
  deletePreset(activePresetId.value)
}

function onRenamePreset() {
  const name = renameText.value.trim()
  if (!name) { alert('请输入新名称'); return }
  renamePreset(activePresetId.value, name)
  showRename.value = false
  renameText.value = ''
}

// ── 样式工具类 ────────────────────────────────────────────
const sectionClass   = computed(() => `rounded-2xl p-6 border ${isDark.value ? 'bg-[#131C2E] border-white/10' : 'bg-white border-black/8 shadow-sm'}`)
const sectionTitleClass = computed(() => `text-base font-bold mb-5 ${isDark.value ? 'text-slate-200' : 'text-slate-800'}`)
const labelClass     = computed(() => `block text-sm font-medium mb-1.5 ${isDark.value ? 'text-slate-400' : 'text-slate-600'}`)
const hintClass      = computed(() => `text-xs ${isDark.value ? 'text-slate-500' : 'text-slate-400'}`)
const inputClass     = computed(() => `w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors ${isDark.value ? 'bg-white/8 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50' : 'bg-slate-100 border border-black/10 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/60'}`)
const textareaClass  = computed(() => `${inputClass.value} resize-none leading-relaxed`)

// ── 校准值显示 ────────────────────────────────────────────
const calibrationDisplay = computed(() => {
  const sec = Math.round(config.calibrationOffsetMs / 1000)
  if (sec === 0) return '±0 秒'
  return `${sec > 0 ? '+' : ''}${sec} 秒`
})

// ── 时间节点预览 ──────────────────────────────────────────
const timePreview = computed(() => {
  if (!config.examStartTime) return []
  const start = new Date(config.examStartTime)
  const fmt = (ms) => {
    const d = new Date(ms)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }
  const startMs = start.getTime()
  const durationMs = config.examDuration * 60 * 1000
  const prepareMs = config.prepareMinutesBefore * 60 * 1000
  const distributeMs = (config.distributeMinutesBefore ?? 15) * 60 * 1000
  const warningMs = (config.warningMinutes ?? 15) * 60 * 1000
  const criticalMs = (config.criticalMinutes ?? 5) * 60 * 1000
  const finishedMs = (config.finishedMinutesAfter ?? 15) * 60 * 1000
  return [
    { label: '开始准备（PREPARING）',   time: fmt(startMs - prepareMs) },
    { label: '分发试卷（DISTRIBUTING）', time: fmt(startMs - distributeMs) },
    { label: '正式开考（EXAMING_NORMAL）',time: fmt(startMs) },
    { label: '答题预警（WARNING）',      time: fmt(startMs + durationMs - warningMs) },
    { label: '极端冲刺（CRITICAL）',     time: fmt(startMs + durationMs - criticalMs) },
    { label: '考试结束（EXAM_FINISHED）', time: fmt(startMs + durationMs) },
    { label: '收卷完成（返回待机）',      time: fmt(startMs + durationMs + finishedMs) },
  ]
})

// ── 提示语阶段定义 ────────────────────────────────────────
const stagePromptDefs = computed(() => {
  const prep = config.prepareMinutesBefore
  const dist = config.distributeMinutesBefore ?? 15
  const warn = config.warningMinutes ?? 15
  const crit = config.criticalMinutes ?? 5
  const fin  = config.finishedMinutesAfter ?? 15
  return {
    PREPARING:        { label: '考前准备', timing: `开考前 ${dist}~${prep} 分钟`, icon: '🚶', headerBg: isDark.value ? 'bg-emerald-900/20' : 'bg-emerald-50' },
    DISTRIBUTING:     { label: '试卷分发', timing: `开考前 0~${dist} 分钟`,  icon: '📋', headerBg: isDark.value ? 'bg-emerald-900/20' : 'bg-emerald-50' },
    EXAMING_NORMAL:   { label: '正常答题', timing: `开考后距结束 >${warn} 分钟`, icon: '✏️', headerBg: isDark.value ? 'bg-emerald-900/20' : 'bg-emerald-50' },
    EXAMING_WARNING:  { label: '答题预警', timing: `距结束 ${crit}~${warn} 分钟`, icon: '⚠️', headerBg: isDark.value ? 'bg-amber-900/20' : 'bg-amber-50' },
    EXAMING_CRITICAL: { label: '极端冲刺', timing: `距结束 ≤${crit} 分钟`,   icon: '🚨', headerBg: isDark.value ? 'bg-red-900/20' : 'bg-red-50' },
    EXAM_FINISHED:    { label: '考试结束', timing: `结束后 0~${fin} 分钟`, icon: '📦', headerBg: isDark.value ? 'bg-slate-800/40' : 'bg-slate-100' },
  }
})

// ── 快速测试模式 ──────────────────────────────────────────
function applyQuickTest() {
  // 各阶段 30 秒的配置：
  // PREPARING:   prepareMinutesBefore=1.0, distribute=0.5 → 30s
  // DISTRIBUTING: distribute=0.5 → 30s
  // NORMAL:      duration=1.5, warning=1.0 → 30s
  // WARNING:     warning=1.0, critical=0.5 → 30s
  // CRITICAL:    critical=0.5 → 30s
  // FINISHED:    finished=0.5 → 30s
  const now = new Date()
  // 考试开始时间 = 当前时间 + 30秒（让 PREPARING 立即显示）
  const examStart = new Date(now.getTime() + 60 * 1000)

  config.subject = '🧪 快速测试科目'
  config.roomNo = '测试考场'
  config.examDuration = 1.5           // 总答题 90 秒
  config.prepareMinutesBefore = 1.0   // 考前 60 秒进入 PREPARING
  config.distributeMinutesBefore = 0.5
  config.warningMinutes = 1.0
  config.criticalMinutes = 0.5
  config.finishedMinutesAfter = 0.5
  config.calibrationOffsetMs = 0
  config.audioEnabled = true

  // 设置开始时间（ISO 格式）
  const pad = (n) => String(n).padStart(2, '0')
  config.examStartTime = `${examStart.getFullYear()}-${pad(examStart.getMonth()+1)}-${pad(examStart.getDate())}T${pad(examStart.getHours())}:${pad(examStart.getMinutes())}`

  alert('✅ 快速测试模式已激活！\n\n' +
    '• 6 个阶段各 30 秒，共 3 分钟完整循环\n' +
    '• 考试将于 60 秒后开始（PREPARING 立即显示）\n\n' +
    '请点击左上角「← 返回大屏」查看效果。')
}

// ── 测试音效 ──────────────────────────────────────────────
function testAudio() {
  config.audioEnabled = true
  playStageSound(STAGES.EXAMING_NORMAL)
}

// ── 测试 TTS ──────────────────────────────────────────────
function testTts() {
  config.ttsEnabled = true
  speakText('各位考生请注意，考试即将开始，请保持安静，有序入座。')
}

// ── 重置提示语 ────────────────────────────────────────────
function resetPrompts() {
  if (!confirm('确定要重置所有提示语为内置默认值吗？')) return
  Object.keys(DEFAULT_PROMPTS).forEach(key => {
    config.prompts[key] = { ...DEFAULT_PROMPTS[key] }
  })
}
</script>
