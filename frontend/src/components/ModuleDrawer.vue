<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Category, ModuleEntry, Course, ModuleStatus } from '../types'

const props = defineProps<{
  module: ModuleEntry | null
  categories: Category[]
  saving: boolean
  disabled: boolean
  error: string | null
  categorySaving: boolean
  categoryDisabled: boolean
  categoryError: string | null
}>()
const emit = defineEmits<{
  close: []
  'update-status': [moduleId: string, status: ModuleStatus]
  'update-categories': [moduleId: string, categoryIds: string[]]
}>()

const selectedCourse = ref<Course | null>(null)
const navDir = ref('slide-forward')

watch(() => props.module, (m) => { if (!m) selectedCourse.value = null })

function openCourse(course: Course) { navDir.value = 'slide-forward'; selectedCourse.value = course }
function goBack()                   { navDir.value = 'slide-back';    selectedCourse.value = null }
function closeAll()                 { selectedCourse.value = null; emit('close') }

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') selectedCourse.value ? goBack() : closeAll()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const TYPE_SHORT: Record<string, string> = {
  vorlesung: 'V', lecture: 'V', praktikum: 'P',
  seminar: 'S', übung: 'Ü', exercise: 'Ü', uebung: 'Ü',
}
const TYPE_FULL: Record<string, string> = {
  vorlesung: 'Vorlesung', lecture: 'Vorlesung', praktikum: 'Praktikum',
  seminar: 'Seminar', übung: 'Übung', exercise: 'Übung', uebung: 'Übung',
}
function typeShort(t: string) { return TYPE_SHORT[t.toLowerCase()] ?? t.charAt(0).toUpperCase() }
function typeFull(t: string)  { return TYPE_FULL[t.toLowerCase()]  ?? t }

const STATUS_OPTIONS: Array<{ value: ModuleStatus; label: string; description: string }> = [
  { value: 'offen', label: 'Offen', description: 'Noch nicht begonnen' },
  { value: 'belegt', label: 'Belegt', description: 'Aktuell im Plan' },
  { value: 'abgeschlossen', label: 'Abgeschlossen', description: 'Bereits erledigt' },
]

function statusLabel(status: ModuleStatus): string {
  switch (status) {
    case 'belegt':
      return 'Belegt'
    case 'abgeschlossen':
      return 'Abgeschlossen'
    default:
      return 'Offen'
  }
}

type DetailKind = 'workload' | 'pruefung' | 'voraussetzungen' | 'html' | 'object' | 'text'

interface DetailItem {
  key: string
  label: string
  kind: DetailKind
  raw: unknown
}

const WORKLOAD_KEYS = new Set(['workload'])
const PRUEFUNG_KEYS = new Set(['pruefung', 'prüfung', 'exam', 'pruefungsform', 'prüfungsform'])
const VORAUSS_KEYS  = new Set(['voraussetzungen', 'prerequisites', 'voraussetzung'])

const KEY_LABELS: Record<string, string> = {
  beschreibung: 'Beschreibung',    description: 'Beschreibung',
  lernziele: 'Lernziele',          learning_objectives: 'Lernziele',
  voraussetzungen: 'Voraussetzungen', prerequisites: 'Voraussetzungen', voraussetzung: 'Voraussetzungen',
  literatur: 'Literatur',          literature: 'Literatur',
  sprache: 'Sprache',              language: 'Sprache',
  pruefung: 'Prüfung',             prüfung: 'Prüfung',
  exam: 'Prüfungsform',            pruefungsform: 'Prüfungsform', prüfungsform: 'Prüfungsform',
  workload: 'Workload',            niveau: 'Niveau',
}

function formatKey(k: string): string {
  return KEY_LABELS[k.toLowerCase()] ?? k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const HTML_RE = /<[a-z][\s\S]*>/i

function htmlToText(value: unknown): string {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim()
}

function kindOf(k: string, v: unknown): DetailKind {
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) return 'object'
  if (typeof v === 'string' && HTML_RE.test(v)) return 'html'
  const l = k.toLowerCase()
  if (WORKLOAD_KEYS.has(l)) return 'workload'
  if (PRUEFUNG_KEYS.has(l)) return 'pruefung'
  if (VORAUSS_KEYS.has(l))  return 'voraussetzungen'
  return 'text'
}

function buildItems(details: Record<string, unknown>): DetailItem[] {
  return Object.entries(details)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => ({ key: k, label: formatKey(k), kind: kindOf(k, v), raw: v }))
}

function objectEntries(raw: unknown): [string, unknown][] {
  return Object.entries(raw as Record<string, unknown>).filter(([, v]) => v != null && v !== '')
}

function parseWorkload(v: unknown): { hours: string; note: string } {
  const s = String(v ?? '').trim()
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(h|std\.?|stunden?)?\s*(.*)$/i)
  if (m) return { hours: `${m[1]} h`, note: (m[3] ?? '').trim() }
  return { hours: s, note: '' }
}

function splitReqs(v: unknown): string[] {
  return String(v ?? '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
}

const totalEcts   = computed(() => props.module?.courses.reduce((s, c) => s + (c.ects ?? 0), 0) ?? 0)
const moduleItems = computed(() => buildItems(props.module?.details ?? {}))
const courseItems = computed(() => buildItems(selectedCourse.value?.details ?? {}))

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  kontext: 'Kontext',
  thema: 'Thema',
  fachgebiet: 'Fachgebiet',
  kompetenz: 'Kompetenz',
}

const categoryGroups = computed(() => {
  const groups = new Map<string, Category[]>()

  for (const category of props.categories) {
    const group = groups.get(category.type) ?? []
    group.push(category)
    groups.set(category.type, group)
  }

  return Array.from(groups.entries())
})

function categoryTypeLabel(type: string) {
  return CATEGORY_TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1)
}

function hasCategory(categoryId: string) {
  return !!props.module?.categories.some(category => category.id === categoryId)
}

function toggleCategory(categoryId: string) {
  if (!props.module || props.categorySaving || props.categoryDisabled) {
    return
  }

  const categoryIds = new Set(props.module.categories.map(category => category.id))

  if (categoryIds.has(categoryId)) {
    categoryIds.delete(categoryId)
  } else {
    categoryIds.add(categoryId)
  }

  emit('update-categories', props.module.id, Array.from(categoryIds))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="module" class="backdrop" @click="closeAll" />
    </Transition>

    <Transition name="drawer">
      <aside v-if="module" class="drawer" role="dialog" aria-modal="true">
        <Transition :name="navDir" mode="out-in">
          <div v-if="!selectedCourse" key="module" class="view">
            <header class="drawer-header">
              <span class="code-pill">{{ module.code }}</span>
              <button class="icon-btn" @click="closeAll" aria-label="Schließen">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
            </header>

            <div class="drawer-body">
              <div class="hero">
                <h2 class="big-title">{{ module.name }}</h2>
                <div class="chip-row">
                  <span v-if="module.recommended_semester" class="chip chip-semester">{{ module.recommended_semester }}. Semester</span>
                  <span class="chip chip-ects">{{ totalEcts }} ECTS</span>
                  <span class="chip chip-plain">Version {{ module.version }}</span>
                  <span class="chip chip-status" :class="`chip-status-${module.module_status}`">{{ statusLabel(module.module_status) }}</span>
                </div>
              </div>

              <section class="section">
                <div class="section-header">
                  <h3 class="section-title">Modulstatus</h3>
                </div>
                <div class="status-grid" role="group" aria-label="Modulstatus auswählen">
                  <button
                    v-for="option in STATUS_OPTIONS"
                    :key="option.value"
                    type="button"
                    class="status-button"
                    :class="[
                      `status-button-${option.value}`,
                      { 'status-button-active': module.module_status === option.value }
                    ]"
                    :aria-pressed="module.module_status === option.value"
                    :disabled="saving || disabled"
                    @click="emit('update-status', module.id, option.value)"
                  >
                    <span class="status-button-label">{{ option.label }}</span>
                    <span class="status-button-text">{{ option.description }}</span>
                  </button>
                </div>
                <p v-if="saving" class="status-feedback">Modulstatus wird gespeichert…</p>
                <p v-else-if="disabled" class="status-feedback">Speichere zuerst die aktuelle Auswahl im Demo-Profil.</p>
                <p v-else-if="error" class="status-feedback status-feedback-error">{{ error }}</p>
              </section>

              <section class="section">
                <div class="section-header">
                  <h3 class="section-title">Kategorien</h3>
                  <span class="count-badge">{{ module.categories.length }}</span>
                </div>

                <div v-if="module.categories.length" class="category-chip-row">
                  <span
                    v-for="category in module.categories"
                    :key="category.id"
                    class="category-chip"
                  >
                    {{ category.name }}
                  </span>
                </div>

                <div v-if="categories.length" class="category-groups">
                  <div v-for="[type, entries] in categoryGroups" :key="type" class="category-group">
                    <span class="category-group-label">{{ categoryTypeLabel(type) }}</span>
                    <div class="category-toggle-grid">
                      <button
                        v-for="category in entries"
                        :key="category.id"
                        type="button"
                        class="category-toggle"
                        :class="{ 'category-toggle-active': hasCategory(category.id) }"
                        :disabled="categorySaving || categoryDisabled"
                        @click="toggleCategory(category.id)"
                      >
                        {{ category.name }}
                      </button>
                    </div>
                  </div>
                </div>

                <p v-else class="status-feedback">Es wurden noch keine Kategorien angelegt.</p>
                <p v-if="categorySaving" class="status-feedback">Kategorien werden gespeichert…</p>
                <p v-else-if="categoryDisabled" class="status-feedback">Speichere zuerst die aktuelle Auswahl im Demo-Profil.</p>
                <p v-else-if="categoryError" class="status-feedback status-feedback-error">{{ categoryError }}</p>
              </section>

              <div class="coordinator-row">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="icon-muted">
                  <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                <span>{{ module.coordinator }}</span>
                <span class="text-muted">· ab {{ module.start_semester }}</span>
              </div>

              <section v-if="module.courses.length" class="section">
                <div class="section-header">
                  <h3 class="section-title">Lehrveranstaltungen</h3>
                  <span class="count-badge">{{ module.courses.length }}</span>
                </div>
                <div class="course-list">
                  <button v-for="c in module.courses" :key="c.id" class="course-btn" @click="openCourse(c)">
                    <span class="type-badge" :class="c.course_type.toLowerCase()">{{ typeShort(c.course_type) }}</span>
                    <div class="course-info">
                      <span class="course-name">{{ c.name }}</span>
                      <span class="course-meta">
                        {{ c.ects }} ECTS &nbsp;·&nbsp; {{ c.sws }} SWS
                        <span v-if="c.coordinator"> &nbsp;·&nbsp; {{ c.coordinator }}</span>
                      </span>
                    </div>
                    <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </section>

              <section v-if="moduleItems.length" class="section">
                <div class="section-header">
                  <h3 class="section-title">Details</h3>
                </div>
                <div class="details-stack">
                  <template v-for="item in moduleItems" :key="item.key">
                    <div v-if="item.kind === 'workload'" class="dcard dcard-workload">
                      <div class="dcard-label">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.6"/>
                          <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                        {{ item.label }}
                      </div>
                      <div class="workload-body">
                        <span class="workload-hours">{{ parseWorkload(item.raw).hours }}</span>
                        <span v-if="parseWorkload(item.raw).note" class="workload-note">{{ parseWorkload(item.raw).note }}</span>
                      </div>
                    </div>

                    <div v-else-if="item.kind === 'pruefung'" class="dcard dcard-pruefung">
                      <div class="dcard-label">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/>
                          <path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        {{ item.label }}
                      </div>
                      <p class="dcard-text">{{ item.raw }}</p>
                    </div>

                    <div v-else-if="item.kind === 'voraussetzungen'" class="dcard dcard-vorauss">
                      <div class="dcard-label">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
                          <circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
                          <circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/>
                          <path d="M6 7.3l4-2.6M6 8.7l4 2.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        </svg>
                        {{ item.label }}
                      </div>
                      <div v-if="splitReqs(item.raw).length > 1" class="req-chips">
                        <span v-for="r in splitReqs(item.raw)" :key="r" class="req-chip">{{ r }}</span>
                      </div>
                      <p v-else class="dcard-text">{{ item.raw }}</p>
                    </div>

                    <div v-else-if="item.kind === 'html'" class="dcard dcard-html">
                      <div class="dcard-label">{{ item.label }}</div>
                      <div class="html-content html-content-text">{{ htmlToText(item.raw) }}</div>
                    </div>

                    <div v-else-if="item.kind === 'object'" class="dcard dcard-object">
                      <div class="dcard-label">{{ item.label }}</div>
                      <dl class="obj-list">
                        <div v-for="[ok, ov] in objectEntries(item.raw)" :key="ok" class="obj-row">
                          <dt>{{ formatKey(ok) }}</dt>
                          <dd>{{ ov }}</dd>
                        </div>
                      </dl>
                    </div>

                    <div v-else class="dtext-item">
                      <dt>{{ item.label }}</dt>
                      <dd>{{ item.raw }}</dd>
                    </div>
                  </template>
                </div>
              </section>
            </div>
          </div>

          <div v-else key="course" class="view">
            <header class="drawer-header">
              <button class="back-btn" @click="goBack">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 4L6 8l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Zurück
              </button>
              <button class="icon-btn" @click="closeAll" aria-label="Schließen">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
            </header>

            <div class="drawer-body">
              <div class="hero">
                <span class="type-label" :class="selectedCourse.course_type.toLowerCase()">{{ typeFull(selectedCourse.course_type) }}</span>
                <h2 class="big-title">{{ selectedCourse.name }}</h2>
                <div class="stat-row">
                  <div class="stat-card">
                    <span class="stat-number">{{ selectedCourse.ects }}</span>
                    <span class="stat-unit">ECTS</span>
                  </div>
                  <div class="stat-divider" />
                  <div class="stat-card">
                    <span class="stat-number">{{ selectedCourse.sws }}</span>
                    <span class="stat-unit">SWS</span>
                  </div>
                </div>
              </div>

              <div class="info-block">
                <div class="info-row">
                  <span class="info-label">Kürzel</span>
                  <span class="info-value mono">{{ selectedCourse.code }}</span>
                </div>
                <div v-if="selectedCourse.coordinator" class="info-row">
                  <span class="info-label">Lehrperson</span>
                  <span class="info-value">{{ selectedCourse.coordinator }}</span>
                </div>
              </div>

              <section v-if="courseItems.length" class="section">
                <div class="section-header">
                  <h3 class="section-title">Details</h3>
                </div>
                <div class="details-stack">
                  <template v-for="item in courseItems" :key="item.key">
                    <div v-if="item.kind === 'workload'" class="dcard dcard-workload">
                      <div class="dcard-label">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.6"/>
                          <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                        {{ item.label }}
                      </div>
                      <div class="workload-body">
                        <span class="workload-hours">{{ parseWorkload(item.raw).hours }}</span>
                        <span v-if="parseWorkload(item.raw).note" class="workload-note">{{ parseWorkload(item.raw).note }}</span>
                      </div>
                    </div>

                    <div v-else-if="item.kind === 'pruefung'" class="dcard dcard-pruefung">
                      <div class="dcard-label">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/>
                          <path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        {{ item.label }}
                      </div>
                      <p class="dcard-text">{{ item.raw }}</p>
                    </div>

                    <div v-else-if="item.kind === 'voraussetzungen'" class="dcard dcard-vorauss">
                      <div class="dcard-label">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
                          <circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
                          <circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/>
                          <path d="M6 7.3l4-2.6M6 8.7l4 2.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        </svg>
                        {{ item.label }}
                      </div>
                      <div v-if="splitReqs(item.raw).length > 1" class="req-chips">
                        <span v-for="r in splitReqs(item.raw)" :key="r" class="req-chip">{{ r }}</span>
                      </div>
                      <p v-else class="dcard-text">{{ item.raw }}</p>
                    </div>

                    <div v-else-if="item.kind === 'html'" class="dcard dcard-html">
                      <div class="dcard-label">{{ item.label }}</div>
                      <div class="html-content html-content-text">{{ htmlToText(item.raw) }}</div>
                    </div>

                    <div v-else-if="item.kind === 'object'" class="dcard dcard-object">
                      <div class="dcard-label">{{ item.label }}</div>
                      <dl class="obj-list">
                        <div v-for="[ok, ov] in objectEntries(item.raw)" :key="ok" class="obj-row">
                          <dt>{{ formatKey(ok) }}</dt>
                          <dd>{{ ov }}</dd>
                        </div>
                      </dl>
                    </div>

                    <div v-else class="dtext-item">
                      <dt>{{ item.label }}</dt>
                      <dd>{{ item.raw }}</dd>
                    </div>
                  </template>
                </div>
              </section>

              <div v-else-if="!selectedCourse.coordinator" class="empty-hint">
                Keine weiteren Informationen verfügbar.
              </div>
            </div>
          </div>
        </Transition>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; background: #0000008c;
  z-index: 40; backdrop-filter: blur(3px);
}

.drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 29rem; max-width: 100vw;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  z-index: 50; display: flex; flex-direction: column; overflow: hidden;
}
.view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.backdrop-enter-active, .backdrop-leave-active { transition: opacity .22s ease; }
.backdrop-enter-from, .backdrop-leave-to       { opacity: 0; }
.drawer-enter-active, .drawer-leave-active { transition: transform .3s cubic-bezier(.4,0,.2,1); }
.drawer-enter-from, .drawer-leave-to       { transform: translateX(100%); }
.slide-forward-enter-active, .slide-forward-leave-active,
.slide-back-enter-active,    .slide-back-leave-active {
  transition: transform .2s cubic-bezier(.4,0,.2,1), opacity .2s ease;
}
.slide-forward-enter-from { transform: translateX(40px);  opacity: 0; }
.slide-forward-leave-to   { transform: translateX(-40px); opacity: 0; }
.slide-back-enter-from    { transform: translateX(-40px); opacity: 0; }
.slide-back-leave-to      { transform: translateX(40px);  opacity: 0; }

.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);
  flex-shrink: 0; min-height: 3.5rem;
}
.code-pill {
  font-size: 75%; font-weight: 700; letter-spacing: .07em;
  color: var(--color-primary); background: var(--color-surface-raised);
  padding: 0.3em 0.69em; border-radius: 99em;
}
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 1.875em; height: 1.875em; border: none; background: transparent;
  color: var(--color-text-muted); cursor: pointer; border-radius: var(--radius-control);
  transition: background .15s, color .15s; flex-shrink: 0;
}
.icon-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
.icon-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 0.2em var(--color-primary-glow);
}
.back-btn {
  display: flex; align-items: center; gap: 0.3em; border: none;
  background: transparent; color: var(--color-text-muted); cursor: pointer;
  font-size: 85%; font-weight: 600; font-family: inherit;
  padding: 0.3em 0.625em 0.3em 0.375em; border-radius: var(--radius-control);
  transition: background .15s, color .15s;
}
.back-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
.back-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 0.2em var(--color-primary-glow);
}

.drawer-body {
  flex: 1; overflow-y: auto; padding: 1.75em 1.375em 2.5rem;
  display: flex; flex-direction: column; gap: 1.875em;
  scrollbar-width: thin; scrollbar-color: var(--color-border) transparent;
}

.hero { display: flex; flex-direction: column; gap: 0.875em; }
.big-title {
  margin: 0; font-size: 140%; font-weight: 800;
  letter-spacing: -.025em; color: var(--color-text); line-height: 1.25;
}
.chip-row { display: flex; flex-wrap: wrap; gap: 0.375em; }
.chip {
  font-size: 72%; font-weight: 600; padding: 0.25em 0.625em; border-radius: var(--radius-control);
  border: 1px solid var(--color-border); background: var(--color-surface-raised);
  color: var(--color-text-muted); white-space: nowrap;
}
.chip-semester { color: var(--color-primary); background: var(--color-primary-subtle); border-color: var(--color-primary-glow); }
.chip-ects     { color: var(--color-primary); background: var(--color-primary-subtle); border-color: var(--color-primary-glow); }
.chip-status-offen { color: var(--color-text-muted); background: var(--color-surface-raised); border-color: var(--color-border); }
.chip-status-belegt { color: #f6b94b; background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.28); }
.chip-status-abgeschlossen { color: #6ee7b7; background: rgba(16, 185, 129, 0.14); border-color: rgba(16, 185, 129, 0.28); }

.coordinator-row {
  display: flex; align-items: center; gap: 0.5em;
  font-size: 88%; font-weight: 500; color: var(--color-text);
}
.icon-muted { color: var(--color-text-muted); flex-shrink: 0; }
.text-muted { color: var(--color-text-muted); font-size: 82%; }

.section { display: flex; flex-direction: column; gap: 0.625em; }
.section-header { display: flex; align-items: center; gap: 0.625em; }
.section-title {
  margin: 0; font-size: 68%; font-weight: 700;
  text-transform: uppercase; letter-spacing: .1em; color: var(--color-text-muted); flex: 1;
}
.count-badge {
  font-size: 68%; font-weight: 700; color: var(--color-text-muted);
  background: var(--color-surface-raised); border: 1px solid var(--color-border);
  padding: 0.06em 0.44em; border-radius: 99em;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5em;
}

.status-button {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  min-height: 70px;
  padding: 0.75em 0.875em;
  border-radius: var(--radius-control);
  border: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  color: var(--color-text-muted);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color .15s, background .15s, color .15s, transform .15s;
}

.status-button:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: var(--color-surface);
  transform: translateY(-1px);
}

.status-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 0.2em var(--color-primary-glow);
}

.status-button:disabled {
  cursor: progress;
  opacity: .7;
}

.status-button-active {
  box-shadow: inset 0 0 0 1px currentColor;
}

.status-button-label {
  font-size: 82%;
  font-weight: 700;
  color: var(--color-text);
}

.status-button-text {
  font-size: 72%;
  line-height: 1.4;
}

.status-button-offen.status-button-active {
  background: var(--color-surface-raised);
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.status-button-belegt.status-button-active {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.28);
  color: #f6b94b;
}

.status-button-abgeschlossen.status-button-active {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.28);
  color: #6ee7b7;
}

.status-feedback {
  margin: 2px 2px 0;
  font-size: 76%;
  color: var(--color-text-muted);
}

.status-feedback-error {
  color: var(--color-primary);
}

.category-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: .76rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  color: var(--color-text-muted);
  background: var(--color-surface-raised);
  border-color: var(--color-border);
}

.category-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-group-label {
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.category-toggle-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-toggle {
  font: inherit;
  font-size: .78rem;
  font-weight: 700;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--color-surface-raised);
  color: var(--color-text);
  border-color: var(--color-border);
  cursor: pointer;
  transition: transform .15s, box-shadow .15s, opacity .15s;
}

.category-toggle:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, .14);
}

.category-toggle:disabled {
  cursor: progress;
  opacity: .75;
}

.category-toggle-active {
  box-shadow: inset 0 0 0 1px currentColor;
}

.course-list { display: flex; flex-direction: column; gap: 0.375em; }
.course-btn {
  display: flex; align-items: center; gap: 0.75em; width: 100%;
  padding: 0.81em 0.875em; background: var(--color-surface-raised);
  border: 1px solid var(--color-border); border-radius: var(--radius-control);
  min-height: 52px;
  cursor: pointer; text-align: left; font-family: inherit;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.course-btn:hover {
  border-color: var(--color-primary); background: var(--color-surface);
  box-shadow: var(--shadow);
}
.course-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 0.2em var(--color-primary-glow);
  border-color: var(--color-primary);
}
.course-btn:hover .chevron { color: var(--color-primary); }
.type-badge {
  flex-shrink: 0; width: 1.75em; height: 1.75em;
  display: flex; align-items: center; justify-content: center;
  border-radius: 0.44em; font-size: 70%; font-weight: 800;
  background: var(--color-surface); color: var(--color-text-muted); border: 1px solid var(--color-border);
}
.type-badge.vorlesung, .type-badge.lecture { background: var(--color-primary-subtle); color: var(--color-primary); border-color: var(--color-primary-glow); }
.type-badge.praktikum                      { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); }
.type-badge.seminar                        { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); }
.type-badge.übung, .type-badge.exercise, .type-badge.uebung { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); }
.course-info { flex: 1; min-width: 0; }
.course-name { display: block; font-size: 88%; font-weight: 600; color: var(--color-text); line-height: 1.3; margin-bottom: 0.1875rem; }
.course-meta { display: block; font-size: 75%; color: var(--color-text-muted); line-height: 1.4; }
.chevron { color: var(--color-border); flex-shrink: 0; transition: color .15s; }

.details-stack { display: flex; flex-direction: column; gap: 0.5em; }

.dtext-item {
  padding: 0.75em 0.875em; background: var(--color-surface-raised);
  border: 1px solid var(--color-border); border-radius: 0.5em;
}
.dtext-item dt {
  font-size: 68%; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: var(--color-text-muted); margin-bottom: 0.3em;
}
.dtext-item dd {
  margin: 0; font-size: 88%; color: var(--color-text);
  line-height: 1.65; word-break: break-word;
}

.dcard {
  border-radius: 0.625em; border: 1px solid; padding: 0.875em 1rem;
  display: flex; flex-direction: column; gap: 0.625em;
}
.dcard-label {
  display: flex; align-items: center; gap: 0.44em;
  font-size: 68%; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
}
.dcard-text {
  margin: 0; font-size: 88%; line-height: 1.65; word-break: break-word;
  color: var(--color-text);
}

.dcard-workload { background: var(--color-surface-raised); border-color: var(--color-border); }
.dcard-workload .dcard-label { color: var(--color-primary); }
.workload-body { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.workload-hours {
  font-size: 2rem; font-weight: 800; letter-spacing: -.03em;
  color: var(--color-primary); line-height: 1;
}
.workload-note { font-size: 82%; color: var(--color-text-muted); line-height: 1.4; }

.dcard-pruefung { background: var(--color-surface-raised); border-color: var(--color-primary-glow); }
.dcard-pruefung .dcard-label { color: var(--color-primary); }

.dcard-vorauss { background: var(--color-surface-raised); border-color: var(--color-border); }
.dcard-vorauss .dcard-label { color: var(--color-primary); }
.req-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.req-chip {
  font-size: .78rem; font-weight: 600; padding: 4px 11px; border-radius: 99px;
  background: var(--color-surface-raised); color: var(--color-text); border: 1px solid var(--color-border);
}

.stat-row {
  display: flex; align-items: center;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border); border-radius: 0.75em; overflow: hidden;
}
.stat-card { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 1.125rem 1rem; gap: 0.1875rem; }
.stat-divider { width: 1px; height: 3rem; background: var(--color-border); flex-shrink: 0; }
.stat-number { font-size: 2.2rem; font-weight: 800; letter-spacing: -.04em; color: var(--color-primary); line-height: 1; }
.stat-unit { font-size: 68%; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--color-text-muted); }

.type-label {
  display: inline-block; font-size: 70%; font-weight: 800;
  text-transform: uppercase; letter-spacing: .1em; padding: 0.25em 0.625em; border-radius: 0.375em;
  background: var(--color-surface-raised); color: var(--color-text-muted); border: 1px solid var(--color-border);
}
.type-label.vorlesung, .type-label.lecture { background: var(--color-primary-subtle); color: var(--color-primary); border-color: var(--color-primary-glow); }
.type-label.praktikum                      { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); }
.type-label.seminar                        { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); }
.type-label.übung, .type-label.exercise, .type-label.uebung { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); }

.info-block { display: flex; flex-direction: column; gap: 0.06em; }
.info-row {
  display: flex; align-items: baseline; gap: 0.75em; padding: 0.625em 0.875em;
  background: var(--color-surface-raised);
}
.info-row:first-child { border-radius: 0.5em 0.5em 0 0; }
.info-row:last-child  { border-radius: 0 0 0.5em 0.5em; }
.info-row:only-child  { border-radius: 0.5em; }
.info-label {
  font-size: 72%; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: var(--color-text-muted); min-width: 5rem; flex-shrink: 0;
}
.info-value { font-size: 88%; font-weight: 500; color: var(--color-text); }
.info-value.mono { font-family: ui-monospace, 'SF Mono', monospace; font-size: 82%; color: var(--color-primary); }

.empty-hint { font-size: 85%; color: var(--color-text-muted); text-align: center; padding: 2rem 0; }

.dcard-html { background: var(--color-surface-raised); border-color: var(--color-border); }
.dcard-html .dcard-label { color: var(--color-text-muted); }

.html-content :deep(ul) {
  margin: 0.125rem 0 0; padding-left: 1.125rem;
  display: flex; flex-direction: column; gap: 0.375em;
}
.html-content :deep(li) {
  font-size: 85%; line-height: 1.6; color: var(--color-text);
}
.html-content :deep(li::marker) { color: var(--color-primary); }
.html-content :deep(p) {
  margin: 0.25em 0 0; font-size: 85%; line-height: 1.65; color: var(--color-text);
}
.html-content :deep(a) { color: var(--color-primary); text-decoration: underline; }
.html-content :deep(b), .html-content :deep(strong) { font-weight: 700; }

.html-content-text {
  font-size: 85%;
  line-height: 1.65;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.dcard-object { background: var(--color-surface-raised); border-color: var(--color-border); padding-bottom: 0; }
.dcard-object .dcard-label { color: var(--color-text-muted); margin-bottom: 2px; }

.obj-list { margin: 0; display: flex; flex-direction: column; }

.obj-row {
  display: grid; grid-template-columns: minmax(7.5rem, 40%) 1fr;
  gap: 0.625em; padding: 0.5625rem 0;
  border-top: 1px solid var(--color-border);
}
.obj-row:first-child { border-top-color: transparent; }

.obj-row dt {
  font-size: 75%; font-weight: 600; color: var(--color-text-muted);
  padding-top: 0.06em; word-break: break-word;
}
.obj-row dd {
  margin: 0; font-size: 85%; color: var(--color-text);
  line-height: 1.55; word-break: break-word;
}

@media (max-width: 640px) {
  .drawer {
    width: 100vw;
  }

  .drawer-body {
    padding: 1.25em 1rem 1.5rem;
    gap: 1.25em;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
