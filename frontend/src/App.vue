<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { supabase } from './supabase'
import SpoSelector from './components/SpoSelector.vue'
import ModuleList from './components/ModuleList.vue'
import ModuleDrawer from './components/ModuleDrawer.vue'
import type { ModuleEntry } from './types'

// --- raw data from DB ---
const studyPrograms = ref<{ id: string; name: string | null; code: string }[]>([])
const allHandbooks = ref<any[]>([])

// --- selection state ---
const selectedStudyProgramId = ref<string | null>(localStorage.getItem('selectedStudyProgramId') || null)
const selectedHandbookId = ref<string | null>(localStorage.getItem('selectedHandbookId') || null)

// --- modules ---
const modules = ref<ModuleEntry[]>([])
const selectedModule = ref<ModuleEntry | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// --- dropdown items ---
const studyProgramItems = computed(() =>
  studyPrograms.value.map(sp => ({ id: sp.id, label: sp.name ?? sp.code }))
)

const handbookItems = computed(() => {
  if (!selectedStudyProgramId.value) return []
  return allHandbooks.value
    .filter(h => h.spos?.study_program_id === selectedStudyProgramId.value)
    .map(h => ({ id: h.id, label: h.code }))
})

// --- stats ---
const totalEcts = computed(() =>
  modules.value.reduce((s, m) => s + m.courses.reduce((cs, c) => cs + (c.ects ?? 0), 0), 0)
)
const totalCourses = computed(() =>
  modules.value.reduce((s, m) => s + m.courses.length, 0)
)

async function fetchInitialData() {
  loading.value = true
  error.value = null

  const [spRes, hbRes] = await Promise.all([
    supabase.from('study_programs').select('id, name, code').order('name'),
    supabase.from('module_handbooks').select('id, code, spos(study_program_id, version_name)').order('code'),
  ])

  loading.value = false

  if (spRes.error) { error.value = spRes.error.message; return }
  if (hbRes.error) { error.value = hbRes.error.message; return }

  studyPrograms.value = spRes.data as typeof studyPrograms.value
  allHandbooks.value = hbRes.data ?? []
}

async function fetchModules(handbookId: string) {
  loading.value = true
  error.value = null
  const { data, error: err } = await supabase
    .from('module_handbook_entries')
    .select(`
      recommended_semester,
      modules!module_handbook_entries_module_id_fkey (
        id, code, name, coordinator, start_semester, version, details,
        is_mandatory, is_specialization, specialization_name, language,
        courses (*)
      )
    `)
    .eq('handbook_id', handbookId)
    .order('recommended_semester', { nullsFirst: false })
  loading.value = false
  if (err) { error.value = err.message; return }

  modules.value = (data as any[]).map(row => ({
    ...row.modules,
    recommended_semester: row.recommended_semester,
    courses: row.modules?.courses ?? [],
  })) as ModuleEntry[]
}

// when study program changes, reset handbook selection
watch(selectedStudyProgramId, (id) => {
  localStorage.setItem('selectedStudyProgramId', id ?? '')
  selectedHandbookId.value = null
  modules.value = []
})

watch(selectedHandbookId, (id) => {
  localStorage.setItem('selectedHandbookId', id ?? '')
  if (id) fetchModules(id)
  else modules.value = []
}, { immediate: true })

fetchInitialData()
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
        <p class="page-subtitle">Wähle deinen Studiengang und die SPO, um alle zugehörigen Module zu sehen.</p>
      </div>

      <div class="controls-bar">
        <SpoSelector
          v-model="selectedStudyProgramId"
          :items="studyProgramItems"
          :loading="loading && !studyPrograms.length"
          label="Studiengang"
          placeholder="— Studiengang auswählen —"
        />
        <SpoSelector
          v-model="selectedHandbookId"
          :items="handbookItems"
          :loading="false"
          label="SPO Kürzel"
          placeholder="— SPO auswählen —"
        />
      </div>

      <div v-if="error" class="error-banner">
        ⚠️ {{ error }}
      </div>

      <template v-if="selectedHandbookId && !loading">
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value">{{ modules.length }}</span>
            <span class="stat-label">Module gesamt</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalCourses }}</span>
            <span class="stat-label">Lehrveranstaltungen</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalEcts }}</span>
            <span class="stat-label">ECTS gesamt</span>
          </div>
        </div>

        <ModuleList :modules="modules" @select="selectedModule = $event" />
      </template>

      <div v-else-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Wird geladen…</p>
      </div>

      <div v-else-if="!selectedStudyProgramId" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Wähle einen Studiengang aus, um fortzufahren.</p>
      </div>

      <div v-else-if="!selectedHandbookId" class="empty-state">
        <div class="empty-icon">📑</div>
        <p>Wähle eine SPO aus, um die zugehörigen Module anzuzeigen.</p>
      </div>
    </main>
  </div>

  <ModuleDrawer :module="selectedModule" @close="selectedModule = null" />
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
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.controls-bar > * {
  flex: 1;
  min-width: 200px;
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
