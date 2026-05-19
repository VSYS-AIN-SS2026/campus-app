<script setup lang="ts">
import type { ModuleEntry, ModuleStatus } from '../../types'

defineProps<{
  module: ModuleEntry
  totalEcts: number
  statusLabel: (status: ModuleStatus) => string
}>()
</script>

<template>
  <div class="hero">
    <h2 class="big-title">{{ module.name }}</h2>
    <div class="chip-row">
      <span v-if="module.recommended_semester" class="chip chip-semester">{{ module.recommended_semester }}. Semester</span>
      <span class="chip chip-ects">{{ totalEcts }} ECTS</span>
      <span class="chip chip-plain">Version {{ module.version }}</span>
      <span class="chip chip-status" :class="`chip-status-${module.module_status}`">{{ statusLabel(module.module_status) }}</span>
    </div>
  </div>
</template>
