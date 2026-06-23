<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { supabase } from '../supabase'
import ModuleCard from './ModuleCard.vue'
import type { ModuleEntry } from '../types'

// "Passende Studium-Generale-Module" finder. The SG catalog comes from the
// shared module list (state.modules, which now includes SG modules) — one
// source of truth. Cards reuse ModuleCard, so they match the Modulliste and a
// click opens the drawer where the module can be marked belegt/abgeschlossen.
// Fit is computed client-side against the student's belegt schedule.
const props = defineProps<{
  modules: ModuleEntry[] // all modules, incl. SG
}>()

const emit = defineEmits<{ select: [module: ModuleEntry] }>()

const SG_CATEGORY = 'studium generale'
const WEEKDAY_ORDER = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

interface Block {
  weekday: string
  start: string
  end: string
  startMin: number
  endMin: number
}
interface Conflict {
  weekday: string
  time: string
  withCode: string
}
interface Suggestion {
  module: ModuleEntry
  termine: Block[]
  noFixedTime: boolean
  fits: boolean
  conflicts: Conflict[]
}

const loading = ref(true)
const error = ref<string | null>(null)
const onlyFitting = ref(true)
const termineByModule = ref<Map<string, Block[]>>(new Map())

const sgModules = computed(() =>
  props.modules.filter((m) => m.categories.some((c) => c.name.trim().toLowerCase() === SG_CATEGORY)),
)
const belegtModules = computed(() => props.modules.filter((m) => m.module_status === 'belegt'))

function toMinutes(t: string | null | undefined): number | null {
  const m = t?.match(/(\d{1,2}):(\d{2})/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
function hhmm(t: string): string {
  const m = t.match(/(\d{1,2}):(\d{2})/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : t
}
function weekdayRank(w: string): number {
  const i = WEEKDAY_ORDER.indexOf(w)
  return i === -1 ? 99 : i
}
function deriveCurrentSemester(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  if (month >= 3 && month <= 9) return `SS${year}`
  const wsYear = month >= 10 ? year : year - 1
  return `WS${wsYear}/${String(wsYear + 1).slice(-2)}`
}

// Fetch real weekly Termine (lsf_events) for the SG + belegt modules, keyed by
// module id, with duplicate weekly slots collapsed.
async function fetchTermine(moduleIds: string[]) {
  if (!supabase || !moduleIds.length) {
    termineByModule.value = new Map()
    return
  }
  const { data, error: err } = await supabase
    .from('lsf_events')
    .select('weekday, start_time, end_time, cancelled, courses!inner(module_id)')
    .eq('term', deriveCurrentSemester())
    .in('courses.module_id', moduleIds)
  if (err) throw err

  const map = new Map<string, Block[]>()
  const seen = new Map<string, Set<string>>()
  for (const e of (data as any[]) ?? []) {
    if (e.cancelled || !e.weekday) continue
    const mid = e.courses.module_id
    const startMin = toMinutes(e.start_time)
    const endMin = toMinutes(e.end_time)
    if (startMin == null || endMin == null) continue
    const start = hhmm(e.start_time)
    const end = hhmm(e.end_time)
    const key = `${e.weekday}|${start}|${end}`
    if (!seen.has(mid)) seen.set(mid, new Set())
    if (seen.get(mid)!.has(key)) continue
    seen.get(mid)!.add(key)
    if (!map.has(mid)) map.set(mid, [])
    map.get(mid)!.push({ weekday: e.weekday, start, end, startMin, endMin })
  }
  for (const list of map.values()) {
    list.sort((a, b) => weekdayRank(a.weekday) - weekdayRank(b.weekday) || a.startMin - b.startMin)
  }
  termineByModule.value = map
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const ids = [...new Set([...sgModules.value.map((m) => m.id), ...belegtModules.value.map((m) => m.id)])]
    await fetchTermine(ids)
  } catch (e: any) {
    error.value = e?.message ?? 'Die Studium-Generale-Module konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

const suggestions = computed<Suggestion[]>(() => {
  const belegtBlocks: (Block & { code: string; moduleId: string })[] = []
  for (const m of belegtModules.value) {
    for (const t of termineByModule.value.get(m.id) ?? []) {
      belegtBlocks.push({ ...t, code: m.code, moduleId: m.id })
    }
  }

  const result = sgModules.value.map((module): Suggestion => {
    const termine = termineByModule.value.get(module.id) ?? []
    const conflicts: Conflict[] = []
    const seen = new Set<string>()
    for (const t of termine) {
      for (const b of belegtBlocks) {
        if (b.moduleId === module.id) continue // don't conflict with itself
        if (b.weekday === t.weekday && t.startMin < b.endMin && t.endMin > b.startMin) {
          const key = `${t.weekday}|${t.start}|${b.code}`
          if (!seen.has(key)) {
            seen.add(key)
            conflicts.push({ weekday: t.weekday, time: `${t.start}–${t.end}`, withCode: b.code })
          }
        }
      }
    }
    return { module, termine, noFixedTime: termine.length === 0, fits: conflicts.length === 0, conflicts }
  })
  result.sort((a, b) => Number(b.fits) - Number(a.fits) || a.module.name.localeCompare(b.module.name, 'de'))
  return result
})

const fittingCount = computed(() => suggestions.value.filter((s) => s.fits).length)
const visibleSuggestions = computed(() =>
  onlyFitting.value ? suggestions.value.filter((s) => s.fits) : suggestions.value,
)

function fitLabel(s: Suggestion): string {
  if (s.fits) return s.noFixedTime ? 'passt (kein fester Termin)' : 'passt'
  return 'Konflikt'
}
function conflictText(s: Suggestion): string {
  return s.conflicts.map((c) => `${c.withCode} (${c.weekday} ${c.time})`).join(', ')
}

onMounted(load)
// Refetch when the relevant module set changes (e.g. after marking belegt).
watch(
  () => [...sgModules.value.map((m) => m.id), '|', ...belegtModules.value.map((m) => m.id)].join(','),
  load,
)
</script>

<template>
  <div class="sg-suggestions">
    <div v-if="loading" class="sg-state">
      <div class="spinner" />
      <p>Vorschläge werden berechnet…</p>
    </div>

    <p v-else-if="error" class="sg-state sg-error">{{ error }}</p>

    <p v-else-if="!sgModules.length" class="sg-state">
      Aktuell sind keine Studium-Generale-Module verfügbar.
    </p>

    <template v-else>
      <div class="sg-head">
        <p class="sg-summary">
          <strong>{{ fittingCount }}</strong> von {{ suggestions.length }} Studium-Generale-Modulen passen in deinen Stundenplan
        </p>
        <label class="sg-toggle">
          <input v-model="onlyFitting" type="checkbox" />
          nur passende
        </label>
      </div>

      <p v-if="!belegtModules.length" class="sg-hint">
        Du hast noch keine Module als „belegt“ markiert – daher gibt es aktuell keine Terminkonflikte.
      </p>

      <p v-if="!visibleSuggestions.length" class="sg-state">Keine passenden Studium-Generale-Module gefunden.</p>

      <div class="sg-list">
        <div v-for="s in visibleSuggestions" :key="s.module.id" class="sg-suggestion">
          <div class="sg-fit-row">
            <span class="sg-fit-badge" :class="s.fits ? 'fit-yes' : 'fit-no'">{{ fitLabel(s) }}</span>
            <span v-if="s.conflicts.length" class="sg-fit-detail sg-conflict">Konflikt mit {{ conflictText(s) }}</span>
            <span v-else-if="s.termine.length" class="sg-fit-detail">
              {{ s.termine.map((t) => `${t.weekday} ${t.start}–${t.end}`).join(' · ') }}
            </span>
          </div>
          <ModuleCard :module="s.module" @select="emit('select', $event)" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sg-suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.8em;
}

.sg-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6em;
  padding: 1.5em 0.5em;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.sg-error {
  color: var(--color-error);
}

.sg-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6em;
}

.sg-summary {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-text);
}

.sg-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}

.sg-hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.sg-list {
  display: flex;
  flex-direction: column;
  gap: 0.75em;
}

.sg-suggestion {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
}

.sg-fit-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5em;
  padding-left: 0.1em;
}

.sg-fit-badge {
  font-size: 72%;
  font-weight: 700;
  padding: 0.2em 0.6em;
  border-radius: var(--radius-control);
  border: 0.0625rem solid;
  white-space: nowrap;
}

.fit-yes {
  color: #0f766e;
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.4);
}

.fit-no {
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.35);
}

.sg-fit-detail {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.sg-conflict {
  color: #b91c1c;
}
</style>
