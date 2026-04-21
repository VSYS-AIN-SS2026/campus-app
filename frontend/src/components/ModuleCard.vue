<script setup lang="ts">
import type { SpoModule } from '../types'

defineProps<{
  module: SpoModule
}>()
</script>

<template>
  <div class="module-card" :class="{ optional: !module.is_mandatory }">
    <div class="card-left">
      <span class="short-name">{{ module.short_name ?? '—' }}</span>
    </div>
    <div class="card-body">
      <p class="module-name">{{ module.name }}</p>
      <p v-if="module.description" class="module-desc">{{ module.description }}</p>
    </div>
    <div class="card-right">
      <span class="ects-badge">{{ module.ects }} ECTS</span>
      <span class="type-badge" :class="module.is_mandatory ? 'mandatory' : 'optional'">
        {{ module.is_mandatory ? 'Pflicht' : 'WP' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.module-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.module-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.12);
}

.module-card.optional {
  border-style: dashed;
}

.card-left {
  flex-shrink: 0;
  width: 52px;
  text-align: center;
}

.short-name {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-primary);
  background: var(--color-primary-subtle);
  padding: 4px 6px;
  border-radius: 5px;
  display: inline-block;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.module-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-desc {
  margin: 3px 0 0;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}

.ects-badge {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-surface-raised);
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}

.type-badge {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 7px;
  border-radius: 20px;
}

.type-badge.mandatory {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.type-badge.optional {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
</style>
