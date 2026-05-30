<template>
  <!-- 极简 hash 路由：#admin → 管理页，其他 → 大屏主页 -->
  <AdminView v-if="isAdmin" />
  <DisplayView v-else />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DisplayView from '@/views/DisplayView.vue'
import AdminView   from '@/views/AdminView.vue'
import { useConfig } from '@/composables/useConfig.js'

const { config } = useConfig()

// ── Hash 路由 ─────────────────────────────────────────────
const isAdmin = ref(window.location.hash === '#admin')

function onHashChange() {
  isAdmin.value = window.location.hash === '#admin'
}

onMounted(() => {
  window.addEventListener('hashchange', onHashChange)

  // 同步 colorMode → document class（Tailwind dark mode）
  updateDarkClass()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
})

// ── Dark mode class 同步 ──────────────────────────────────
import { watch } from 'vue'

function updateDarkClass() {
  if (config.colorMode === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

watch(() => config.colorMode, updateDarkClass)
</script>
