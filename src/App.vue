<script setup lang="ts">
import { initThemeFromStorage } from './composables/useTheme'

initThemeFromStorage()
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主内容</a>
  <router-view />
</template>