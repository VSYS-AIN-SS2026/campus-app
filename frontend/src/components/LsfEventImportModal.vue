<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { supabase, supabaseConfigError } from '../supabase'
import type { ModuleEntry } from '../types'

const props = defineProps<{
  module: ModuleEntry | null
}>()
const emit = defineEmits<{
  close: []
  imported: []
}>()

interface LsfEventRow {
  id: string
  event_type: string
  weekday: string | null
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  room_building: string | null
  room_number: string | null
  rhythm: number
  course_code: string
  course_name: string
}

interface EventTypeGroup {
  type: string
  label: string
  courseName: string
  courseCode: string
  events: LsfEventRow[]
}

const loading = ref(false)
const error = ref<string | null>(null)
const importError = ref<string | null>(null)
const groups = ref<EventTypeGroup[]>([])
const selectedByGroup = ref<Map<string, string>>(new Map())

const EVENT_TYPE_LABELS: Record<string, string> = {
  lecture: 'Vorlesung',
  exercise: 'Übung',
  lab: 'Labor',
  seminar: 'Seminar',
}

function eventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function onBackdropClick() {
  emit('close')
}

async function fetchData(moduleId: string) {
  loading.value = true
  error.value = null
  importError.value = null
  groups.value = []
  selectedByGroup.value = new Map()

  if (!supabase) {
    error.value = supabaseConfigError
    loading.value = false
    return
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const { data, error: fetchError } = await supabase
    .from('lsf_events')
    .select(`
      id,
      event_type,
      weekday,
      start_date,
      end_date,
      start_time,
      end_time,
      room_building,
      room_number,
      rhythm,
      status,
      courses!inner(
        id,
        code,
        name,
        course_type,
        module_id
      )
    `)
    .gte('end_date', todayStr)
    .eq('courses.module_id', moduleId)
    .order('event_type', { ascending: true })
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true })

  loading.value = false

  if (fetchError) {
    error.value = `LSF-Termine konnten nicht geladen werden: ${fetchError.message}`
    return
  }

  if (!data || !data.length) {
    error.value = 'Keine LSF-Termine für dieses Modul gefunden.'
    return
  }

  const rawRows = data as any[]
  const typeMap = new Map<string, EventTypeGroup>()

  for (const row of rawRows) {
    const course = row.courses as { code: string; name: string; course_type: string }
    const eventType = row.event_type ?? course.course_type ?? 'unknown'

    if (!typeMap.has(eventType)) {
      typeMap.set(eventType, {
        type: eventType,
        label: eventTypeLabel(eventType),
        courseName: course.name,
        courseCode: course.code,
        events: [],
      })
    }

    const group = typeMap.get(eventType)!
    group.events.push({
      id: row.id,
      event_type: row.event_type,
      weekday: row.weekday,
      start_date: row.start_date,
      end_date: row.end_date,
      start_time: row.start_time,
      end_time: row.end_time,
      room_building: row.room_building,
      room_number: row.room_number,
      rhythm: row.rhythm,
      course_code: course.code,
      course_name: course.name,
    })
  }

  groups.value = Array.from(typeMap.values())
}

function toggleGroup(type: string) {
  const group = groups.value.find(g => g.type === type)
  if (!group || group.events.length > 1) return
  const next = new Map(selectedByGroup.value)
  if (next.has(type)) {
    next.delete(type)
  } else {
    next.set(type, group.events[0].id)
  }
  selectedByGroup.value = next
}

function selectEvent(type: string, eventId: string) {
  const next = new Map(selectedByGroup.value)
  next.set(type, eventId)
  selectedByGroup.value = next
}

const hasSelection = computed(() => selectedByGroup.value.size > 0)
const totalEvents = computed(() => groups.value.reduce((s, g) => s + g.events.length, 0))

async function importSelected() {
  importError.value = null

  if (!supabase) {
    importError.value = supabaseConfigError
    return
  }

  const eventsToInsert: any[] = []

  for (const [type, eventId] of selectedByGroup.value) {
    const group = groups.value.find(g => g.type === type)
    if (!group) continue
    const event = group.events.find(e => e.id === eventId)
    if (!event) continue

    const roomParts = [event.room_building, event.room_number].filter(Boolean)
    const roomStr = roomParts.length ? ' · ' + roomParts.join(' ') : ''

    eventsToInsert.push({
      lsf_event_id: event.id,
      title: event.course_name || group.courseName,
      subtitle: `${group.label}${roomStr}`,
      day_index: WEEKDAY_MAP[event.weekday ?? ''] ?? 0,
      start_time: event.start_time.slice(0, 5),
      end_time: event.end_time.slice(0, 5),
      series_id: `lsf:${group.courseCode}:${type}`,
      status: 'belegt',
    })
  }

  if (!eventsToInsert.length) return

  const { error: insertError } = await supabase.rpc('insert_demo_user_events', {
    events: eventsToInsert,
  })

  if (insertError) {
    importError.value = `Fehler beim Importieren: ${insertError.message}`
    return
  }

  emit('imported')
  emit('close')
}

watch(() => props.module, (m) => {
  if (m) {
    importError.value = null
    fetchData(m.id)
  }
}, { immediate: true })

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WEEKDAY_MAP: Record<string, number> = { So: 0, Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6 }
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div v-if="module" class="modal-backdrop" @click="onBackdropClick" />
    </Transition>

    <Transition name="modal">
      <div v-if="module" class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">LSF-Termine importieren</h2>
          <button class="icon-btn" @click="emit('close')" aria-label="Schließen">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <p class="modal-subtitle">
            Modul: <strong>{{ module.code }} {{ module.name }}</strong>
          </p>

          <div v-if="loading" class="modal-loading">
            <div class="spinner" />
            <p>LSF-Termine werden geladen…</p>
          </div>

          <div v-else-if="error" class="modal-error">
            <p>{{ error }}</p>
          </div>

          <template v-else>
            <div v-if="importError" class="modal-error">
              <p>{{ importError }}</p>
            </div>

            <p class="event-count">{{ totalEvents }} Termin{{ totalEvents !== 1 ? 'e' : '' }} gefunden</p>

            <div class="event-groups">
              <div
                v-for="group in groups"
                :key="group.type"
                class="event-group"
                :class="{ 'event-group-selected': selectedByGroup.has(group.type) }"
              >
                <label v-if="group.events.length === 1" class="group-header">
                  <input
                    type="checkbox"
                    :checked="selectedByGroup.has(group.type)"
                    @change="toggleGroup(group.type)"
                  />
                  <div class="group-info">
                    <span class="group-type-badge">{{ group.label }}</span>
                    <span class="group-course-name">{{ group.courseName }}</span>
                    <span class="group-event-count">1 Termin</span>
                  </div>
                </label>
                <div v-else class="group-header group-header-radio">
                  <div class="group-info">
                    <span class="group-type-badge">{{ group.label }}</span>
                    <span class="group-course-name">{{ group.courseName }}</span>
                    <span class="group-event-count">{{ group.events.length }} Termine</span>
                  </div>
                </div>

                <div class="group-events">
                  <div
                    v-for="event in group.events"
                    :key="event.id"
                    class="event-row"
                    :class="{ 'event-row-radio': group.events.length > 1, 'event-row-selected': selectedByGroup.get(group.type) === event.id }"
                  >
                    <input
                      v-if="group.events.length > 1"
                      type="radio"
                      :name="'radio-' + group.type"
                      :value="event.id"
                      :checked="selectedByGroup.get(group.type) === event.id"
                      @change="selectEvent(group.type, event.id)"
                      class="event-radio"
                    />
                    <span class="event-day">{{ WEEKDAY_LABELS[Number(event.weekday)] ?? event.weekday }}</span>
                    <span class="event-time">{{ event.start_time.slice(0, 5) }}–{{ event.end_time.slice(0, 5) }}</span>
                    <span class="event-room">{{ event.room_building ?? '' }}{{ event.room_number ? ' ' + event.room_number : '' }}</span>
                    <span v-if="event.rhythm > 1" class="event-rhythm">{{ event.rhythm }}-wöch.</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="emit('close')">
            Abbrechen
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!hasSelection || loading"
            @click="importSelected"
          >
            Ausgewählte importieren ({{ selectedByGroup.size }})
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; background: #0000008c;
  z-index: 60; backdrop-filter: blur(3px);
}

.modal {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 36rem; max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 4rem);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  z-index: 70;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-backdrop-enter-active,
.modal-backdrop-leave-active {
  transition: opacity .2s ease;
}
.modal-backdrop-enter-from,
.modal-backdrop-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: transform .2s cubic-bezier(.4,0,.2,1), opacity .2s ease;
}
.modal-enter-from,
.modal-leave-to {
  transform: translate(-50%, -50%) scale(.95);
  opacity: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
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

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.modal-subtitle {
  margin: 0;
  font-size: .85rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 0;
  color: var(--color-text-muted);
  font-size: .88rem;
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin .6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-error {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: .88rem;
  background: var(--color-surface-raised);
  border-radius: 0.5rem;
}

.event-count {
  margin: 0;
  font-size: .78rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.event-groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.event-group {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
  transition: border-color .15s;
}

.event-group-selected {
  border-color: var(--color-primary);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-raised);
  cursor: pointer;
  transition: background .15s;
}

.group-header:hover {
  background: var(--color-surface);
}

.group-header-radio {
  cursor: default;
}

.group-header-radio:hover {
  background: var(--color-surface-raised);
}

.group-header input[type="checkbox"] {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.group-info {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  flex: 1;
}

.group-type-badge {
  font-size: .72rem;
  font-weight: 700;
  padding: 0.2em 0.55em;
  border-radius: 0.3em;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: .05em;
}

.group-course-name {
  font-size: .82rem;
  font-weight: 600;
  color: var(--color-text);
}

.group-event-count {
  font-size: .72rem;
  color: var(--color-text-muted);
  margin-left: auto;
}

.group-events {
  border-top: 1px solid var(--color-border);
}

.event-row {
  display: grid;
  grid-template-columns: 2rem 1fr 1fr auto;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: .78rem;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  align-items: center;
}

.event-row-radio {
  grid-template-columns: 1.2rem 2rem 1fr 1fr auto;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background .15s;
}

.event-row-radio:hover {
  background: var(--color-surface-raised);
}

.event-row-radio:last-child {
  border-bottom: none;
}

.event-row-radio.event-row-selected {
  background: var(--color-primary-subtle);
}

.event-row:last-child {
  border-bottom: none;
}

.event-radio {
  width: 0.95rem;
  height: 0.95rem;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.event-day {
  font-weight: 600;
  color: var(--color-text-muted);
}

.event-time {
  font-weight: 500;
}

.event-room {
  color: var(--color-text-muted);
}

.event-rhythm {
  font-size: .7rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.625rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.btn {
  font: inherit;
  font-size: .85rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-control);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background .15s, border-color .15s, opacity .15s;
}

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  opacity: .9;
}

.btn-secondary {
  background: var(--color-surface-raised);
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn-secondary:hover {
  border-color: var(--color-primary);
}
</style>
