<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { ModuleEntry, Course } from '../types'

const props = defineProps<{ module: ModuleEntry | null }>()
const emit = defineEmits<{ close: [] }>()

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

// ─── course-type labels ────────────────────────────────────────
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

// ─── detail-item typing ────────────────────────────────────────
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

function kindOf(k: string, v: unknown): DetailKind {
  // value-type detection takes priority over field name
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

// parse workload value → { hours, note }
function parseWorkload(v: unknown): { hours: string; note: string } {
  const s = String(v ?? '').trim()
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(h|std\.?|stunden?)?\s*(.*)$/i)
  if (m) return { hours: `${m[1]} h`, note: (m[3] ?? '').trim() }
  return { hours: s, note: '' }
}

// split prerequisites by delimiters → chip array
function splitReqs(v: unknown): string[] {
  return String(v ?? '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
}

// ─── computed ──────────────────────────────────────────────────
const totalEcts   = computed(() => props.module?.courses.reduce((s, c) => s + (c.ects ?? 0), 0) ?? 0)
const moduleItems = computed(() => buildItems(props.module?.details ?? {}))
const courseItems = computed(() => buildItems(selectedCourse.value?.details ?? {}))
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="module" class="backdrop" @click="closeAll" />
    </Transition>

    <Transition name="drawer">
      <aside v-if="module" class="drawer" role="dialog" aria-modal="true">
        <Transition :name="navDir" mode="out-in">

          <!-- ═══════════════════ MODULE VIEW ═══════════════════ -->
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
              <!-- hero -->
              <div class="hero">
                <h2 class="big-title">{{ module.name }}</h2>
                <div class="chip-row">
                  <span v-if="module.recommended_semester" class="chip chip-semester">{{ module.recommended_semester }}. Semester</span>
                  <span class="chip chip-ects">{{ totalEcts }} ECTS</span>
                  <span class="chip chip-plain">Version {{ module.version }}</span>
                </div>
              </div>

              <!-- coordinator -->
              <div class="coordinator-row">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="icon-muted">
                  <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                <span>{{ module.coordinator }}</span>
                <span class="text-muted">· ab {{ module.start_semester }}</span>
              </div>

              <!-- courses -->
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

              <!-- details -->
              <section v-if="moduleItems.length" class="section">
                <div class="section-header">
                  <h3 class="section-title">Details</h3>
                </div>
                <div class="details-stack">
                  <template v-for="item in moduleItems" :key="item.key">

                    <!-- workload -->
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

                    <!-- prüfung -->
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

                    <!-- voraussetzungen -->
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

                    <!-- generic text -->
                    <!-- html string -->
                    <div v-else-if="item.kind === 'html'" class="dcard dcard-html">
                      <div class="dcard-label">{{ item.label }}</div>
                      <div class="html-content" v-html="String(item.raw)" />
                    </div>

                    <!-- nested object -->
                    <div v-else-if="item.kind === 'object'" class="dcard dcard-object">
                      <div class="dcard-label">{{ item.label }}</div>
                      <dl class="obj-list">
                        <div v-for="[ok, ov] in objectEntries(item.raw)" :key="ok" class="obj-row">
                          <dt>{{ formatKey(ok) }}</dt>
                          <dd>{{ ov }}</dd>
                        </div>
                      </dl>
                    </div>

                    <!-- generic text -->
                    <div v-else class="dtext-item">
                      <dt>{{ item.label }}</dt>
                      <dd>{{ item.raw }}</dd>
                    </div>

                  </template>
                </div>
              </section>
            </div>
          </div>

          <!-- ═══════════════════ COURSE VIEW ═══════════════════ -->
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
              <!-- hero -->
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

              <!-- meta -->
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

              <!-- details -->
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

                    <!-- html string -->
                    <div v-else-if="item.kind === 'html'" class="dcard dcard-html">
                      <div class="dcard-label">{{ item.label }}</div>
                      <div class="html-content" v-html="String(item.raw)" />
                    </div>

                    <!-- nested object -->
                    <div v-else-if="item.kind === 'object'" class="dcard dcard-object">
                      <div class="dcard-label">{{ item.label }}</div>
                      <dl class="obj-list">
                        <div v-for="[ok, ov] in objectEntries(item.raw)" :key="ok" class="obj-row">
                          <dt>{{ formatKey(ok) }}</dt>
                          <dd>{{ ov }}</dd>
                        </div>
                      </dl>
                    </div>

                    <!-- generic text -->
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
/* ─── overlay ─── */
.backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  z-index: 40; backdrop-filter: blur(3px);
}

/* ─── drawer shell ─── */
.drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 440px; max-width: 100vw;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  z-index: 50; display: flex; flex-direction: column; overflow: hidden;
}
.view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

/* ─── transitions ─── */
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

/* ─── header ─── */
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--color-border);
  flex-shrink: 0; min-height: 57px;
}
.code-pill {
  font-size: .75rem; font-weight: 700; letter-spacing: .07em;
  color: var(--color-primary); background: var(--color-primary-subtle);
  padding: 5px 11px; border-radius: 99px;
}
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; background: transparent;
  color: var(--color-text-muted); cursor: pointer; border-radius: 6px;
  transition: background .15s, color .15s; flex-shrink: 0;
}
.icon-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
.back-btn {
  display: flex; align-items: center; gap: 5px; border: none;
  background: transparent; color: var(--color-text-muted); cursor: pointer;
  font-size: .85rem; font-weight: 600; font-family: inherit;
  padding: 5px 10px 5px 6px; border-radius: 6px;
  transition: background .15s, color .15s;
}
.back-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }

/* ─── body ─── */
.drawer-body {
  flex: 1; overflow-y: auto; padding: 28px 22px 40px;
  display: flex; flex-direction: column; gap: 30px;
  scrollbar-width: thin; scrollbar-color: var(--color-border) transparent;
}

/* ─── hero ─── */
.hero { display: flex; flex-direction: column; gap: 14px; }
.big-title {
  margin: 0; font-size: 1.4rem; font-weight: 800;
  letter-spacing: -.025em; color: var(--color-text); line-height: 1.25;
}
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  font-size: .72rem; font-weight: 600; padding: 4px 10px; border-radius: 99px;
  border: 1px solid var(--color-border); background: var(--color-surface-raised);
  color: var(--color-text-muted); white-space: nowrap;
}
.chip-semester { color: var(--color-primary); background: var(--color-primary-subtle); border-color: rgba(99,102,241,.2); }
.chip-ects     { color: #10b981; background: rgba(16,185,129,.1); border-color: rgba(16,185,129,.2); }

/* ─── coordinator ─── */
.coordinator-row {
  display: flex; align-items: center; gap: 8px;
  font-size: .88rem; font-weight: 500; color: var(--color-text);
}
.icon-muted { color: var(--color-text-muted); flex-shrink: 0; }
.text-muted { color: var(--color-text-muted); font-size: .82rem; }

/* ─── sections ─── */
.section { display: flex; flex-direction: column; gap: 10px; }
.section-header { display: flex; align-items: center; gap: 10px; }
.section-title {
  margin: 0; font-size: .68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .1em; color: var(--color-text-muted); flex: 1;
}
.count-badge {
  font-size: .68rem; font-weight: 700; color: var(--color-text-muted);
  background: var(--color-surface-raised); border: 1px solid var(--color-border);
  padding: 1px 7px; border-radius: 99px;
}

/* ─── course buttons ─── */
.course-list { display: flex; flex-direction: column; gap: 6px; }
.course-btn {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 13px 14px; background: var(--color-surface-raised);
  border: 1px solid var(--color-border); border-radius: 10px;
  cursor: pointer; text-align: left; font-family: inherit;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.course-btn:hover {
  border-color: var(--color-primary); background: var(--color-surface);
  box-shadow: 0 2px 10px rgba(99,102,241,.1);
}
.course-btn:hover .chevron { color: var(--color-primary); }
.type-badge {
  flex-shrink: 0; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 7px; font-size: .7rem; font-weight: 800;
  background: var(--color-surface); color: var(--color-text-muted); border: 1px solid var(--color-border);
}
.type-badge.vorlesung, .type-badge.lecture { background: rgba(99,102,241,.12); color: var(--color-primary); border-color: rgba(99,102,241,.25); }
.type-badge.praktikum                      { background: rgba(16,185,129,.12); color: #10b981; border-color: rgba(16,185,129,.25); }
.type-badge.seminar                        { background: rgba(245,158,11,.12); color: #f59e0b; border-color: rgba(245,158,11,.25); }
.type-badge.übung, .type-badge.exercise, .type-badge.uebung { background: rgba(236,72,153,.12); color: #ec4899; border-color: rgba(236,72,153,.25); }
.course-info { flex: 1; min-width: 0; }
.course-name { display: block; font-size: .88rem; font-weight: 600; color: var(--color-text); line-height: 1.3; margin-bottom: 3px; }
.course-meta { display: block; font-size: .75rem; color: var(--color-text-muted); line-height: 1.4; }
.chevron { color: var(--color-border); flex-shrink: 0; transition: color .15s; }

/* ─── details stack ─── */
.details-stack { display: flex; flex-direction: column; gap: 8px; }

/* generic text item */
.dtext-item {
  padding: 12px 14px; background: var(--color-surface-raised);
  border: 1px solid var(--color-border); border-radius: 8px;
}
.dtext-item dt {
  font-size: .68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: var(--color-text-muted); margin-bottom: 5px;
}
.dtext-item dd {
  margin: 0; font-size: .88rem; color: var(--color-text);
  line-height: 1.65; word-break: break-word;
}

/* shared card base */
.dcard {
  border-radius: 10px; border: 1px solid; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.dcard-label {
  display: flex; align-items: center; gap: 7px;
  font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
}
.dcard-text {
  margin: 0; font-size: .88rem; line-height: 1.65; word-break: break-word;
  color: var(--color-text);
}

/* workload — amber */
.dcard-workload { background: rgba(245,158,11,.07); border-color: rgba(245,158,11,.25); }
.dcard-workload .dcard-label { color: #d97706; }
.workload-body { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.workload-hours {
  font-size: 2rem; font-weight: 800; letter-spacing: -.03em;
  color: #d97706; line-height: 1;
}
.workload-note { font-size: .82rem; color: var(--color-text-muted); line-height: 1.4; }

/* prüfung — indigo */
.dcard-pruefung { background: rgba(99,102,241,.07); border-color: rgba(99,102,241,.25); }
.dcard-pruefung .dcard-label { color: var(--color-primary); }

/* voraussetzungen — teal */
.dcard-vorauss { background: rgba(20,184,166,.07); border-color: rgba(20,184,166,.25); }
.dcard-vorauss .dcard-label { color: #0d9488; }
.req-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.req-chip {
  font-size: .78rem; font-weight: 600; padding: 4px 11px; border-radius: 99px;
  background: rgba(20,184,166,.12); color: #0d9488; border: 1px solid rgba(20,184,166,.3);
}

/* ─── course stat row ─── */
.stat-row {
  display: flex; align-items: center;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden;
}
.stat-card { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 18px 16px; gap: 3px; }
.stat-divider { width: 1px; height: 48px; background: var(--color-border); flex-shrink: 0; }
.stat-number { font-size: 2.2rem; font-weight: 800; letter-spacing: -.04em; color: var(--color-primary); line-height: 1; }
.stat-unit { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--color-text-muted); }

/* ─── type label (course view) ─── */
.type-label {
  display: inline-block; font-size: .7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: .1em; padding: 4px 10px; border-radius: 6px;
  background: var(--color-surface-raised); color: var(--color-text-muted); border: 1px solid var(--color-border);
}
.type-label.vorlesung, .type-label.lecture { background: rgba(99,102,241,.12); color: var(--color-primary); border-color: rgba(99,102,241,.3); }
.type-label.praktikum                      { background: rgba(16,185,129,.12); color: #10b981; border-color: rgba(16,185,129,.3); }
.type-label.seminar                        { background: rgba(245,158,11,.12); color: #f59e0b; border-color: rgba(245,158,11,.3); }
.type-label.übung, .type-label.exercise, .type-label.uebung { background: rgba(236,72,153,.12); color: #ec4899; border-color: rgba(236,72,153,.3); }

/* ─── course meta ─── */
.info-block { display: flex; flex-direction: column; gap: 1px; }
.info-row {
  display: flex; align-items: baseline; gap: 12px; padding: 10px 14px;
  background: var(--color-surface-raised);
}
.info-row:first-child { border-radius: 8px 8px 0 0; }
.info-row:last-child  { border-radius: 0 0 8px 8px; }
.info-row:only-child  { border-radius: 8px; }
.info-label {
  font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: var(--color-text-muted); min-width: 80px; flex-shrink: 0;
}
.info-value { font-size: .88rem; font-weight: 500; color: var(--color-text); }
.info-value.mono { font-family: ui-monospace, 'SF Mono', monospace; font-size: .82rem; color: var(--color-primary); }

.empty-hint { font-size: .85rem; color: var(--color-text-muted); text-align: center; padding: 32px 0; }

/* ─── html content card ─── */
.dcard-html { background: var(--color-surface-raised); border-color: var(--color-border); }
.dcard-html .dcard-label { color: var(--color-text-muted); }

.html-content :deep(ul) {
  margin: 2px 0 0; padding-left: 18px;
  display: flex; flex-direction: column; gap: 6px;
}
.html-content :deep(li) {
  font-size: .85rem; line-height: 1.6; color: var(--color-text);
}
.html-content :deep(li::marker) { color: var(--color-primary); }
.html-content :deep(p) {
  margin: 4px 0 0; font-size: .85rem; line-height: 1.65; color: var(--color-text);
}
.html-content :deep(a) { color: var(--color-primary); text-decoration: underline; }
.html-content :deep(b), .html-content :deep(strong) { font-weight: 700; }

/* ─── nested object card ─── */
.dcard-object { background: var(--color-surface-raised); border-color: var(--color-border); padding-bottom: 0; }
.dcard-object .dcard-label { color: var(--color-text-muted); margin-bottom: 2px; }

.obj-list { margin: 0; display: flex; flex-direction: column; }

.obj-row {
  display: grid; grid-template-columns: minmax(120px, 40%) 1fr;
  gap: 10px; padding: 9px 0;
  border-top: 1px solid var(--color-border);
}
.obj-row:first-child { border-top-color: transparent; }

.obj-row dt {
  font-size: .75rem; font-weight: 600; color: var(--color-text-muted);
  padding-top: 1px; word-break: break-word;
}
.obj-row dd {
  margin: 0; font-size: .85rem; color: var(--color-text);
  line-height: 1.55; word-break: break-word;
}
</style>
