<script setup lang="ts">
defineProps<{
  name: 'dashboard' | 'users' | 'form' | 'settings'
}>()
</script>

<template>
  <svg class="pt-icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'dashboard'">
      <path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z" />
    </template>
    <template v-else-if="name === 'users'">
      <path d="M16 19v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="8" r="3" />
      <path d="M20 19v-2a3 3 0 0 0-2.2-2.9M16 4.1a3 3 0 0 1 0 5.8" />
    </template>
    <template v-else-if="name === 'form'">
      <path d="M8 4h11v16H5V7l3-3z" />
      <path d="M8 4v3h3M9 12h8M9 16h6" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
      />
    </template>
  </svg>
</template>