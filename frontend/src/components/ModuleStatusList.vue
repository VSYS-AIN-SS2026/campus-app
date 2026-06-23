<script setup lang="ts">
import { computed, ref } from 'vue'
import ModuleCard from './ModuleCard.vue'
import type { ModuleEntry, ModuleStatus } from '../types'
import { moduleEcts } from '../utils/progress'

const props = defineProps<{
  modules: ModuleEntry[]
}>()

const emit = defineEmits<{ select: [module: ModuleEntry] }>()

// Completed first, then in-progress, then still-open. Completed collapsed by default.
const STATUS_ORDER: ModuleStatus[] = ['abgeschlossen', 'belegt', 'offen']
const STATUS_LABEL: Record<ModuleStatus, string> = {
  abgeschlossen: 'Abgeschlossen',
  belegt: 'Belegt',
  offen: 'Offen',
}

const groups = computed(() =>
  STATUS_ORDER.map((status) => {
    const mods = props.modules.filter((m) => m.module_status === status)
    return {
      status,
      label: STATUS_LABEL[status],
      modules: mods,
      count: mods.length,
      ects: mods.reduce((sum, m) => sum + moduleEcts(m), 0),
    }
  }),
)

const collapsed = ref<Record<ModuleStatus, boolean>>({
  abgeschlossen: true,
  belegt: false,
  offen: false,
})

function toggle(status: ModuleStatus) {
  collapsed.value[status] = !collapsed.value[status]
}
</script>

<template>
  <div class="status-list">
    <section
      v-for="grp in groups"
      :id="`module-group-${grp.status}`"
      :key="grp.status"
      class="status-group"
      :class="`status-group-${grp.status}`"
    >
      <button
        type="button"
        class="group-header"
        :aria-expanded="!collapsed[grp.status]"
        @click="toggle(grp.status)"
      >
        <span class="group-caret" :class="{ open: !collapsed[grp.status] }" aria-hidden="true">▸</span>
        <span class="group-name">{{ grp.label }}</span>
        <span class="group-meta">
          <span class="group-badge">{{ grp.count }} {{ grp.count === 1 ? 'Modul' : 'Module' }}</span>
          <span class="group-badge group-badge-ects">{{ grp.ects }} ECTS</span>
        </span>
      </button>

      <div v-show="!collapsed[grp.status]" class="group-modules">
        <p v-if="!grp.count" class="group-empty">Keine Module in dieser Kategorie.</p>
        <ModuleCard v-for="m in grp.modules" :key="m.id" :module="m" @select="emit('select', $event)" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.status-list {
  display: flex;
  flex-direction: column;
  gap: 1.1em;
}

.status-group {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-left-width: 0.1875rem;
  border-radius: 0;
}

.status-group-abgeschlossen { border-left-color: rgba(16, 185, 129, 0.55); }
.status-group-belegt { border-left-color: rgba(245, 158, 11, 0.55); }
.status-group-offen { border-left-color: var(--color-border); }

.group-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.7em 0.75em;
  background: transparent;
  border: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--color-text);
}

.group-caret {
  display: inline-block;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  transition: transform 0.15s ease;
}

.group-caret.open {
  transform: rotate(90deg);
}

.group-name {
  font-size: 0.95rem;
  font-weight: 700;
}

.group-meta {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4em;
}

.group-badge {
  font-size: 75%;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface-raised);
  border: 0.0625rem solid var(--color-border);
  padding: 0.15em 0.6em;
  border-radius: var(--radius-control);
}

.group-badge-ects {
  color: var(--color-primary);
  background: var(--color-surface);
  border-color: var(--color-primary-light);
}

.group-modules {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding: 0 0.75em 0.75em;
}

.group-empty {
  margin: 0;
  padding: 0.4em 0.2em;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

@media (max-width: 40em) {
  .group-header {
    flex-wrap: wrap;
  }

  .group-meta {
    width: 100%;
    justify-content: flex-start;
    margin-left: 1.3em;
  }
}
</style>
