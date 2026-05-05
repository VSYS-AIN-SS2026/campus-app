<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { supabase, supabaseConfigError } from './supabase'
import SpoSelector from './components/SpoSelector.vue'
import ModuleList from './components/ModuleList.vue'
import ModuleDrawer from './components/ModuleDrawer.vue'
import type {
  ModuleEntry,
  ModuleCategory,
  ModuleHandbook,
  ModuleStatus,
  Spo,
  StudyProgram,
  UserProfile,
} from './types'

type ModuleStatusRow = {
  module_id: string
  status: ModuleStatus
  updated_at: string
}

let activeModuleRequestId = 0

function getStudyProgramLabel(program: StudyProgram) {
  return program.name ? `${program.code} - ${program.name}` : program.code
}

function getSpoLabel(spo: Spo) {
  return spo.valid_from ? `${spo.version_name} · gültig ab ${spo.valid_from}` : spo.version_name
}

function getUniqueSposForStudyProgram(spos: Spo[], studyProgramId: string | null) {
  if (!studyProgramId) {
    return []
  }

  const uniqueSpos = new Map<string, Spo>()

  for (const spo of spos) {
    if (spo.study_program_id !== studyProgramId) {
      continue
    }

    const key = `${spo.version_name.trim().toLowerCase()}::${spo.valid_from ?? ''}`
    const existingSpo = uniqueSpos.get(key)

    if (!existingSpo) {
      uniqueSpos.set(key, spo)
    }
  }

  return Array.from(uniqueSpos.values())
}

function beginModuleRequest() {
  activeModuleRequestId += 1
  return activeModuleRequestId
}

function isActiveModuleRequest(requestId: number) {
  return requestId === activeModuleRequestId
}

// --- raw data from DB ---
const studyPrograms = ref<StudyProgram[]>([])
const allSpos = ref<Spo[]>([])
const allHandbooks = ref<ModuleHandbook[]>([])
const demoUserProfile = ref<UserProfile | null>(null)

// --- selection state ---
const selectedStudyProgramId = ref<string | null>(localStorage.getItem('selectedStudyProgramId') || null)
const selectedSpoId = ref<string | null>(localStorage.getItem('selectedSpoId') || null)

// --- modules ---
const modules = ref<ModuleEntry[]>([])
const selectedModule = ref<ModuleEntry | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const moduleStatusError = ref<string | null>(null)
const savingModuleId = ref<string | null>(null)
const profileError = ref<string | null>(null)
const profileInfo = ref<string | null>(null)
const profileSaving = ref(false)
const restoringProfileSelection = ref(false)

// --- dropdown items ---
const studyProgramItems = computed(() =>
  studyPrograms.value.map(program => ({ id: program.id, label: getStudyProgramLabel(program) }))
)

const availableSpos = computed(() => getUniqueSposForStudyProgram(allSpos.value, selectedStudyProgramId.value))

const spoItems = computed(() =>
  availableSpos.value.map(spo => ({ id: spo.id, label: getSpoLabel(spo) }))
)

const savedStudyProgram = computed(() =>
  studyPrograms.value.find(program => program.id === demoUserProfile.value?.study_program_id) ?? null
)

const savedSpo = computed(() =>
  allSpos.value.find(spo => spo.id === demoUserProfile.value?.spo_id) ?? null
)

const selectionDirty = computed(() =>
  (selectedStudyProgramId.value ?? null) !== (demoUserProfile.value?.study_program_id ?? null)
  || (selectedSpoId.value ?? null) !== (demoUserProfile.value?.spo_id ?? null)
)
const canEditModuleStatuses = computed(() =>
  !selectionDirty.value && !!demoUserProfile.value?.spo_id
)

function clearSelectionMessages() {
  profileError.value = null
  profileInfo.value = null
}

function setModuleStatus(moduleId: string, status: ModuleStatus) {
  const module = modules.value.find(entry => entry.id === moduleId)
  if (!module) return
  module.module_status = status
}

function applyModuleStatuses(statusRows: ModuleStatusRow[]) {
  const statusMap = new Map(statusRows.map(row => [row.module_id, row.status]))

  for (const module of modules.value) {
    module.module_status = statusMap.get(module.id) ?? 'offen'
  }
}

async function fetchModuleStatuses(moduleIds: string[], requestId: number) {
  moduleStatusError.value = null

  if (!supabase) {
    moduleStatusError.value = supabaseConfigError
    return
  }

  if (!moduleIds.length || !isActiveModuleRequest(requestId)) {
    return
  }

  const { data, error: err } = await supabase.rpc('get_demo_user_module_statuses', {
    selected_module_ids: moduleIds,
  })

  if (!isActiveModuleRequest(requestId)) {
    return
  }

  if (err) {
    moduleStatusError.value = 'Der Modulstatus konnte nicht geladen werden.'
    return
  }

  applyModuleStatuses((data ?? []) as ModuleStatusRow[])
}

async function saveModuleStatus(moduleId: string, status: ModuleStatus) {
  if (!supabase) {
    moduleStatusError.value = supabaseConfigError
    return
  }

  if (!canEditModuleStatuses.value) {
    moduleStatusError.value = 'Speichere zuerst Studiengang und SPO im Demo-Profil, bevor du Modulstatus änderst.'
    return
  }

  if (savingModuleId.value) {
    return
  }

  const currentModule = modules.value.find(entry => entry.id === moduleId)
  if (!currentModule || currentModule.module_status === status) {
    return
  }

  const previousStatus = currentModule.module_status
  moduleStatusError.value = null
  savingModuleId.value = moduleId
  setModuleStatus(moduleId, status)

  const { data, error: err } = await supabase
    .rpc('save_demo_user_module_status', {
      selected_module_id: moduleId,
      selected_status: status,
    })
    .single()

  savingModuleId.value = null

  if (err) {
    setModuleStatus(moduleId, previousStatus)
    moduleStatusError.value = 'Der Modulstatus konnte nicht gespeichert werden.'
    return
  }

  const savedStatus = (data ?? null) as ModuleStatusRow | null

  if (savedStatus?.status) {
    setModuleStatus(moduleId, savedStatus.status)
  }
}

async function saveStudyProfileSelection() {
  clearSelectionMessages()

  if (!supabase) {
    profileError.value = supabaseConfigError
    return
  }

  if (!selectedStudyProgramId.value) {
    profileError.value = 'Bitte wähle zuerst einen Studiengang aus.'
    return
  }

  profileSaving.value = true

  const { data, error: err } = await supabase
    .rpc('save_demo_user_profile_selection', {
      selected_study_program_id: selectedStudyProgramId.value,
      selected_spo_id: selectedSpoId.value,
    })
    .single()

  profileSaving.value = false

  if (err) {
    profileError.value = 'Studiengang und SPO konnten nicht gespeichert werden.'
    return
  }

  demoUserProfile.value = (data ?? null) as UserProfile | null
  profileInfo.value = 'Studiengang und SPO wurden im Demo-Profil gespeichert.'
}

async function fetchInitialData() {
  loading.value = true
  error.value = null
  profileError.value = null

  if (!supabase) {
    loading.value = false
    error.value = supabaseConfigError
    return
  }

  const [spRes, spoRes, hbRes, profileRes] = await Promise.all([
    supabase.from('study_programs').select('id, faculty_id, code, name').order('name').order('code'),
    supabase
      .from('spos')
      .select('id, study_program_id, version_name, valid_from')
      .order('study_program_id')
      .order('valid_from', { ascending: false, nullsFirst: false })
      .order('version_name'),
    supabase.from('module_handbooks').select('id, spo_id, code').order('code'),
    supabase.rpc('get_demo_user_profile').maybeSingle(),
  ])

  loading.value = false

  if (spRes.error) { error.value = spRes.error.message; return }
  if (spoRes.error) { error.value = spoRes.error.message; return }
  if (hbRes.error) { error.value = hbRes.error.message; return }

  studyPrograms.value = (spRes.data ?? []) as StudyProgram[]
  allSpos.value = (spoRes.data ?? []) as Spo[]
  allHandbooks.value = (hbRes.data ?? []) as ModuleHandbook[]

  if (profileRes.error) {
    profileError.value = 'Das Demo-Profil konnte nicht geladen werden.'
  } else {
    demoUserProfile.value = (profileRes.data ?? null) as UserProfile | null
  }

  restoringProfileSelection.value = true

  if (demoUserProfile.value?.study_program_id) {
    selectedStudyProgramId.value = demoUserProfile.value.study_program_id
  }

  if (demoUserProfile.value?.spo_id) {
    selectedSpoId.value = demoUserProfile.value.spo_id
  }

  if (
    selectedStudyProgramId.value
    && !studyPrograms.value.some(program => program.id === selectedStudyProgramId.value)
  ) {
    selectedStudyProgramId.value = null
  }

  if (
    selectedSpoId.value
    && !allSpos.value.some(
      spo => spo.id === selectedSpoId.value && spo.study_program_id === selectedStudyProgramId.value
    )
  ) {
    selectedSpoId.value = null
  }

  restoringProfileSelection.value = false

  if (selectedSpoId.value) {
    await fetchModulesForSpo(selectedSpoId.value, beginModuleRequest())
  }
}

function shouldReplaceModule(existingModule: ModuleEntry, nextModule: ModuleEntry) {
  if (existingModule.recommended_semester == null && nextModule.recommended_semester != null) {
    return true
  }

  if (
    existingModule.recommended_semester != null
    && nextModule.recommended_semester != null
    && nextModule.recommended_semester < existingModule.recommended_semester
  ) {
    return true
  }

  return false
}

async function fetchModules(handbookIds: string[], requestId: number) {
  loading.value = true
  error.value = null
  moduleStatusError.value = null

  if (!supabase) {
    loading.value = false
    error.value = supabaseConfigError
    return
  }

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
    .in('handbook_id', handbookIds)
    .order('recommended_semester', { nullsFirst: false })

  if (!isActiveModuleRequest(requestId)) {
    return
  }

  if (err) {
    loading.value = false
    error.value = err.message
    return
  }

  const uniqueModules = new Map<string, ModuleEntry>()

  for (const row of data as any[]) {
    const module = {
      ...row.modules,
      recommended_semester: row.recommended_semester,
      categories: [],
      courses: row.modules?.courses ?? [],
      module_status: 'offen',
    } as ModuleEntry

    const existingModule = uniqueModules.get(module.id)

    if (!existingModule || shouldReplaceModule(existingModule, module)) {
      uniqueModules.set(module.id, module)
    }
  }

  modules.value = Array.from(uniqueModules.values())

  const moduleIds = modules.value.map(module => module.id)

  if (moduleIds.length) {
    const { data: categoryData } = await supabase
      .from('module_category_entries')
      .select(`
        module_id,
        categories (
          id, name, color, type
        )
      `)
      .in('module_id', moduleIds)

    const categoriesByModuleId = new Map<string, ModuleCategory[]>()

    for (const row of (categoryData ?? []) as any[]) {
      const category = row?.categories as ModuleCategory | null

      if (!row?.module_id || !category?.id || !category?.name) {
        continue
      }

      const existingCategories = categoriesByModuleId.get(row.module_id) ?? []
      existingCategories.push(category)
      categoriesByModuleId.set(row.module_id, existingCategories)
    }

    modules.value = modules.value.map(module => ({
      ...module,
      categories: categoriesByModuleId.get(module.id) ?? [],
    }))
  }

  await fetchModuleStatuses(moduleIds, requestId)

  if (!isActiveModuleRequest(requestId)) {
    return
  }

  loading.value = false
}

async function fetchModulesForSpo(spoId: string, requestId: number) {
  const matchingHandbooks = allHandbooks.value.filter(handbook => handbook.spo_id === spoId)

  if (!matchingHandbooks.length) {
    modules.value = []
    error.value = 'Zur ausgewählten SPO wurde kein Modulhandbuch gefunden.'
    loading.value = false
    return
  }

  await fetchModules(matchingHandbooks.map(handbook => handbook.id), requestId)
}

// when study program changes, reset handbook selection
watch(selectedStudyProgramId, (id) => {
  localStorage.setItem('selectedStudyProgramId', id ?? '')
  clearSelectionMessages()

  if (!selectedSpoId.value) {
    return
  }

  const selectedSpoIsAvailable = allSpos.value.some(
    spo => spo.id === selectedSpoId.value && spo.study_program_id === id
  )

  if (!selectedSpoIsAvailable) {
    selectedSpoId.value = null
  }
})

watch(selectedSpoId, (id) => {
  const requestId = beginModuleRequest()

  localStorage.setItem('selectedSpoId', id ?? '')
  modules.value = []
  selectedModule.value = null
  moduleStatusError.value = null
  error.value = null
  clearSelectionMessages()

  if (restoringProfileSelection.value) {
    return
  }

  if (id) {
    fetchModulesForSpo(id, requestId)
  }
  else {
    loading.value = false
    moduleStatusError.value = null
  }
})

fetchInitialData()
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <img src="/favicon.ico" alt="HTWG Logo" class="brand-logo" />
          <span class="brand-name">Campus App</span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="page-header">
        <h1 class="page-title">Meine Module</h1>
        <p class="page-subtitle">Wähle deinen Studiengang und die SPO, speichere die Auswahl im Demo-Profil und sieh direkt die zugehörigen Module.</p>
      </div>

      <div class="profile-grid">
        <section class="profile-panel">
          <span class="panel-eyebrow">Demo-Profil</span>
          <h2 class="panel-title">Alex Beispiel</h2>

          <div class="profile-meta">
            <div class="profile-meta-item">
              <span class="meta-label">E-Mail</span>
              <span class="meta-value">{{ demoUserProfile?.email ?? 'alex.beispiel@htwg-konstanz.de' }}</span>
            </div>
            <div class="profile-meta-item">
              <span class="meta-label">Hochschule</span>
              <span class="meta-value">HTWG Konstanz</span>
            </div>
          </div>
        </section>

        <section class="profile-panel">
          <span class="panel-eyebrow">Gespeicherte Auswahl</span>
          <h2 class="panel-title">Studiengang und SPO</h2>

          <p class="profile-selection" :class="savedStudyProgram ? 'profile-selection-active' : ''">
            {{ savedStudyProgram ? getStudyProgramLabel(savedStudyProgram) : 'Noch kein Studiengang gespeichert.' }}
          </p>
          <p class="profile-selection profile-selection-secondary" :class="savedSpo ? 'profile-selection-active' : ''">
            {{ savedSpo ? getSpoLabel(savedSpo) : savedStudyProgram ? 'Noch keine SPO gespeichert.' : 'Bitte zuerst eine Auswahl treffen.' }}
          </p>

          <p class="helper-copy">
            {{ selectionDirty ? 'Du hast Änderungen, die noch nicht im Demo-Profil gespeichert sind.' : 'Auswahl und Demo-Profil sind aktuell gleich.' }}
          </p>
        </section>
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
          v-model="selectedSpoId"
          :items="spoItems"
          :loading="false"
          label="SPO"
          placeholder="— SPO auswählen —"
        />
      </div>

      <div class="selection-toolbar">
        <div class="selection-toolbar-inner">
          <div class="selection-toolbar-copy">
            <p class="selection-toolbar-title">Auswahl speichern</p>
            <p class="helper-copy">
              Studiengang und SPO werden für den Demo-User in <code>users</code> gespeichert.
            </p>
          </div>

          <button
            class="save-button"
            type="button"
            :disabled="profileSaving || !selectedStudyProgramId || !selectionDirty"
            @click="saveStudyProfileSelection"
          >
            {{ profileSaving ? 'Wird gespeichert…' : 'Im Demo-Profil speichern' }}
          </button>
        </div>
      </div>

      <div v-if="profileError" class="error-banner">
        {{ profileError }}
      </div>

      <div v-if="profileInfo" class="success-banner">
        {{ profileInfo }}
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div v-if="moduleStatusError" class="info-banner">
        {{ moduleStatusError }}
      </div>

      <div v-if="selectedSpoId && !canEditModuleStatuses" class="info-banner">
        Speichere zuerst deine Auswahl im Demo-Profil, damit Modulstatus erhalten bleibt.
      </div>

      <template v-if="selectedSpoId && !loading">
        <ModuleList :modules="modules" @select="selectedModule = $event" />
      </template>

      <div v-else-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Wird geladen…</p>
      </div>

      <div v-else-if="!selectedStudyProgramId" class="empty-state">
        <div class="empty-icon"></div>
        <p>Wähle einen Studiengang aus, um fortzufahren.</p>
      </div>

      <div v-else-if="!selectedSpoId" class="empty-state">
        <div class="empty-icon"></div>
        <p>Wähle eine SPO aus, um die zugehörigen Module anzuzeigen.</p>
      </div>
    </main>
  </div>

  <ModuleDrawer
    :module="selectedModule"
    :saving="savingModuleId === selectedModule?.id"
    :disabled="!canEditModuleStatuses"
    :error="moduleStatusError"
    @close="selectedModule = null"
    @update-status="saveModuleStatus"
  />
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
  max-width: 960px;
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

.brand-logo {
  height: 28px;
  width: auto;
  display: block;
}

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.app-main {
  max-width: 960px;
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

.profile-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.panel-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
}

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.meta-value {
  font-size: 0.92rem;
  color: var(--color-text);
}

.profile-selection {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-text-muted);
}

.profile-selection-secondary {
  font-size: 0.84rem;
}

.profile-selection-active {
  color: var(--color-text);
}

.helper-copy {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.helper-copy code {
  color: var(--color-text);
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

.selection-toolbar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 16px;
}

.selection-toolbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.selection-toolbar-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selection-toolbar-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
}

.save-button {
  border: none;
  border-radius: var(--radius-control);
  min-height: 42px;
  padding: 11px 16px;
  font: inherit;
  font-weight: 700;
  color: white;
  background: var(--color-primary);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  flex-shrink: 0;
}

.save-button:hover:enabled {
  transform: translateY(-1px);
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.error-banner {
  padding: 12px 16px;
  background: var(--color-error-bg);
  border: 1px solid var(--color-error-border);
  border-radius: 8px;
  color: var(--color-error);
  font-size: 0.88rem;
}

.info-banner {
  padding: 12px 16px;
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning-border);
  border-radius: 8px;
  color: var(--color-warning);
  font-size: 0.88rem;
}

.success-banner {
  padding: 12px 16px;
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  border-radius: 8px;
  color: var(--color-success);
  font-size: 0.88rem;
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

@media (max-width: 720px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .app-main {
    padding: 24px 16px 60px;
    gap: 20px;
  }
  .header-inner {
    padding: 0 16px;
  }
  .controls-bar {
    flex-direction: column;
  }
  .controls-bar > * {
    min-width: unset;
  }
  .selection-toolbar {
    padding: 12px;
  }
  .selection-toolbar-inner {
    flex-direction: column;
    align-items: stretch;
  }
  .save-button {
    width: 100%;
  }
  .page-title {
    font-size: 1.4rem;
  }
}
</style>
