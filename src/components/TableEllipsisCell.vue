<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value?: string | number | null
  title?: string
}>()

const text = computed(() => (props.value == null ? '' : String(props.value)))
</script>

<template>
  <span class="table-ellipsis-cell" :title="title ?? text">{{ text }}</span>
</template>

<style scoped>
.table-ellipsis-cell {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>