<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { supabase } from './supabase'
import SpoSelector from './components/SpoSelector.vue'
import ModuleList from './components/ModuleList.vue'
import type { Spo, SpoModule } from './types'

const spos = ref<Spo[]>([])
const selectedSpoId = ref<number | null>(Number(localStorage.getItem('selectedSpoId')) || null)
const modules = ref<SpoModule[]>([])
const loadingSpos = ref(false)
const loadingModules = ref(false)
const error = ref<string | null>(null)

const totalEcts = computed(() => modules.value.reduce((s, m) => s + (m.ects ?? 0), 0))
const mandatoryCount = computed(() => modules.value.filter(m => m.is_mandatory).length)
const electiveCount = computed(() => modules.value.filter(m => !m.is_mandatory).length)

async function fetchSpos() {
  loadingSpos.value = true
  error.value = null
  const { data, error: err } = await supabase.from('spos').select('*').order('valid_from')
  loadingSpos.value = false
  if (err) { error.value = err.message; return }
  spos.value = data as Spo[]
}

async function fetchModules(spoId: number) {
  loadingModules.value = true
  error.value = null
  const { data, error: err } = await supabase
    .from('spo_modules')
    .select('is_mandatory, module_group, modules(*)')
    .eq('spo_id', spoId)
    .order('semester_recommendation', { foreignTable: 'modules' })
  loadingModules.value = false
  if (err) { error.value = err.message; return }
  modules.value = (data as any[]).map(row => ({
    ...row.modules,
    is_mandatory: row.is_mandatory,
    module_group: row.module_group,
  })) as SpoModule[]
}

watch(selectedSpoId, (id) => {
  localStorage.setItem('selectedSpoId', id != null ? String(id) : '')
  if (id != null) fetchModules(id)
  else modules.value = []
}, { immediate: true })

fetchSpos()
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <span class="brand-icon">🎓</span>
          <span class="brand-name">Campus App</span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="page-header">
        <h1 class="page-title">Meine Module</h1>
        <p class="page-subtitle">Wähle deine Studienprüfungsordnung, um alle zugehörigen Module zu sehen.</p>
      </div>

      <div class="controls-bar">
        <SpoSelector
          v-model="selectedSpoId"
          :spos="spos"
          :loading="loadingSpos"
        />
      </div>

      <div v-if="error" class="error-banner">
        ⚠️ {{ error }}
      </div>

      <template v-if="selectedSpoId && !loadingModules">
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value">{{ modules.length }}</span>
            <span class="stat-label">Module gesamt</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalEcts }}</span>
            <span class="stat-label">ECTS gesamt</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ mandatoryCount }}</span>
            <span class="stat-label">Pflichtmodule</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ electiveCount }}</span>
            <span class="stat-label">Wahlpflicht</span>
          </div>
        </div>

        <ModuleList :modules="modules" />
      </template>

      <div v-else-if="loadingModules" class="loading-state">
        <div class="spinner" />
        <p>Module werden geladen…</p>
      </div>

      <div v-else-if="!selectedSpoId" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Wähle eine SPO aus, um die zugehörigen Module anzuzeigen.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
}

.header-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon { font-size: 1.3rem; }

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.app-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.page-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.controls-bar {
  max-width: 420px;
}

.error-banner {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.88rem;
}

.stats-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat {
  flex: 1;
  min-width: 100px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1;
}

.stat-label {
  font-size: 0.72rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.empty-icon { font-size: 2.5rem; }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
