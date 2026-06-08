<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useOrganisations } from '../composables/useOrganisations'
import type { OrganisationWithState } from '../types/organisations'

const {
  organisationsWithState,
  events,
  savedEventIds,
  loading,
  saving,
  error,
  info,
  fetchOrganisations,
  fetchOrganisationEvents,
  fetchSavedEvents,
  createOrganisation,
  joinOrganisation,
  leaveOrganisation,
  createOrganisationEvent,
  deleteOrganisationEvent,
  saveEvent,
  unsaveEvent,
} = useOrganisations()

const organisationName = ref('')
const organisationDescription = ref('')
const organisationColor = ref('#6366f1')
const showOrganisationForm = ref(false)
const showEventForm = ref(false)

const selectedOrganisationId = ref<string | null>(null)
const eventTitle = ref('')
const eventDescription = ref('')
const eventLocation = ref('')
const eventStartsAt = ref('')
const eventEndsAt = ref('')

const ownedOrganisations = computed(() => {
  return organisationsWithState.value.filter(organisation => organisation.isOwner)
})

const selectedOrganisation = computed(() => {
  return organisationsWithState.value.find(
    organisation => organisation.id === selectedOrganisationId.value,
  )
})

const visibleEvents = computed(() => {
  return events.value.filter(event => {
    return organisationsWithState.value.some(
      organisation => organisation.id === event.organisation_id && organisation.isMember,
    )
  })
})

function getOrganisationName(organisationId: string) {
  return organisationsWithState.value.find(item => item.id === organisationId)?.name ?? 'Organisation'
}

function isEventOwner(organisationId: string) {
  return organisationsWithState.value.some(o => o.id === organisationId && o.isOwner)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function submitOrganisation() {
  await createOrganisation({
    name: organisationName.value,
    description: organisationDescription.value,
    color: organisationColor.value,
  })

  if (!error.value) {
    organisationName.value = ''
    organisationDescription.value = ''
    organisationColor.value = '#6366f1'
    showOrganisationForm.value = false
  }
}

async function submitEvent() {
  if (!selectedOrganisationId.value) {
    return
  }

  await createOrganisationEvent({
    organisationId: selectedOrganisationId.value,
    title: eventTitle.value,
    description: eventDescription.value,
    location: eventLocation.value,
    startsAt: new Date(eventStartsAt.value).toISOString(),
    endsAt: new Date(eventEndsAt.value).toISOString(),
  })

  if (!error.value) {
    eventTitle.value = ''
    eventDescription.value = ''
    eventLocation.value = ''
    eventStartsAt.value = ''
    eventEndsAt.value = ''
    showEventForm.value = false
  }
}

onMounted(async () => {
  await fetchOrganisations()
  await Promise.all([
    fetchOrganisationEvents(),
    fetchSavedEvents(),
  ])

  selectedOrganisationId.value = ownedOrganisations.value[0]?.id ?? null
})
</script>

<template>
  <section class="organisations-page">
    <header class="organisations-header">
      <div>
        <h1>Organisationen</h1>
        <p>Erstelle Organisationen, tritt ihnen bei und speichere Events für deine Wochenansicht.</p>
      </div>
    </header>

    <p v-if="error" class="state state-error">{{ error }}</p>
    <p v-if="info" class="state state-info">{{ info }}</p>

    <div v-if="loading" class="loading-box">
      Organisationen werden geladen…
    </div>

    <template v-else>
    <section class="panel">
        <div class="panel-head">
            <h2>Neue Organisation erstellen</h2>
            <button
            type="button"
            class="secondary-button"
            @click="showOrganisationForm = !showOrganisationForm"
            >
            {{ showOrganisationForm ? 'Schließen' : 'Organisation erstellen' }}
            </button>
        </div>

        <form
            v-if="showOrganisationForm"
            class="form"
            @submit.prevent="submitOrganisation"
        >
          <label>
            Name
            <input
              v-model="organisationName"
              type="text"
              required
              minlength="2"
              placeholder="z. B. AStA"
            />
          </label>

          <label>
            Beschreibung
            <textarea
              v-model="organisationDescription"
              rows="3"
              placeholder="Kurzbeschreibung der Organisation"
            />
          </label>

          <label class="color-label">
            Farbe in der Wochenansicht
            <div class="color-picker-row">
              <input
                v-model="organisationColor"
                type="color"
                class="color-input"
              />
              <span class="color-preview" :style="{ background: organisationColor }">{{ organisationColor }}</span>
            </div>
          </label>

          <button type="submit" class="primary-button" :disabled="saving">
            Organisation erstellen
          </button>
        </form>
      </section>

      <section class="panel">
        <h2>Alle Organisationen</h2>

        <div v-if="organisationsWithState.length === 0" class="empty">
          Noch keine Organisationen vorhanden.
        </div>

        <div v-else class="organisation-list">
          <article
            v-for="organisation in organisationsWithState"
            :key="organisation.id"
            class="organisation-card"
          >
            <div>
              <h3>{{ organisation.name }}</h3>
              <p v-if="organisation.description">{{ organisation.description }}</p>
              <p v-else class="muted">Keine Beschreibung.</p>

              <span v-if="organisation.isOwner" class="badge">Ersteller</span>
              <span v-else-if="organisation.isMember" class="badge">Beigetreten</span>
            </div>

            <div class="card-actions">
              <button
                v-if="!organisation.isMember"
                type="button"
                class="secondary-button"
                :disabled="saving"
                @click="joinOrganisation(organisation.id)"
              >
                Beitreten
              </button>

              <button
                v-else-if="!organisation.isOwner"
                type="button"
                class="secondary-button"
                :disabled="saving"
                @click="leaveOrganisation(organisation.id)"
              >
                Verlassen
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
            <h2>Event erstellen</h2>
            <button
            v-if="ownedOrganisations.length > 0"
            type="button"
            class="secondary-button"
            @click="showEventForm = !showEventForm"
            >
            {{ showEventForm ? 'Schließen' : 'Event erstellen' }}
            </button>
        </div>

        <div v-if="ownedOrganisations.length === 0" class="empty">
          Du kannst Events erstellen, sobald du selbst eine Organisation erstellt hast.
        </div>

        <form
            v-else-if="showEventForm"
            class="form"
            @submit.prevent="submitEvent"
            >
          <label>
            Organisation
            <select v-model="selectedOrganisationId" required>
              <option
                v-for="organisation in ownedOrganisations"
                :key="organisation.id"
                :value="organisation.id"
              >
                {{ organisation.name }}
              </option>
            </select>
          </label>

          <label>
            Titel
            <input
              v-model="eventTitle"
              type="text"
              required
              minlength="2"
              placeholder="z. B. Sommerfest"
            />
          </label>

          <label>
            Beschreibung
            <textarea
              v-model="eventDescription"
              rows="3"
              placeholder="Details zum Event"
            />
          </label>

          <label>
            Ort
            <input
              v-model="eventLocation"
              type="text"
              placeholder="z. B. Aula"
            />
          </label>

          <div class="form-grid">
            <label>
              Start
              <input v-model="eventStartsAt" type="datetime-local" required />
            </label>

            <label>
              Ende
              <input v-model="eventEndsAt" type="datetime-local" required />
            </label>
          </div>

          <button
            type="submit"
            class="primary-button"
            :disabled="saving || !selectedOrganisation"
          >
            Event erstellen
          </button>
        </form>
      </section>

      <section class="panel">
        <h2>Events meiner Organisationen</h2>

        <div v-if="visibleEvents.length === 0" class="empty">
          Keine Events vorhanden.
        </div>

        <div v-else class="event-list">
          <article
            v-for="event in visibleEvents"
            :key="event.id"
            class="event-card"
          >
            <div class="event-card-info">
              <h3>{{ event.title }}</h3>
              <p class="muted">{{ getOrganisationName(event.organisation_id) }}</p>
              <p>
                {{ formatDateTime(event.starts_at) }} – {{ formatDateTime(event.ends_at) }}
              </p>
              <p v-if="event.location">Ort: {{ event.location }}</p>
              <p v-if="event.description">{{ event.description }}</p>
            </div>

            <div class="event-card-actions">
              <button
                v-if="!savedEventIds.has(event.id)"
                type="button"
                class="secondary-button"
                :disabled="saving"
                @click="saveEvent(event.id)"
              >
                Zur Wochenansicht hinzufügen
              </button>

              <button
                v-else
                type="button"
                class="secondary-button"
                :disabled="saving"
                @click="unsaveEvent(event.id)"
              >
                Aus Wochenansicht entfernen
              </button>

              <button
                v-if="isEventOwner(event.organisation_id)"
                type="button"
                class="danger-button"
                :disabled="saving"
                @click="deleteOrganisationEvent(event.id)"
              >
                Löschen
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.organisations-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: clamp(1rem, 2vw, 1.5rem);
}

.organisations-header {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.875rem;
  padding: 1rem;
}

.organisations-header h1 {
  margin: 0;
  font-size: 1.35rem;
}

.organisations-header p {
  margin: 0.35rem 0 0;
  color: var(--color-text-muted);
}

.panel {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.875rem;
  padding: 1rem;
}

.panel h2 {
  margin: 0 0 0.875rem;
  font-size: 1rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
}

input,
textarea,
select {
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.625rem;
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  padding: 0.625rem 0.75rem;
}

textarea {
  resize: vertical;
}

.primary-button,
.secondary-button {
  border: 0.0625rem solid var(--color-border);
  border-radius: 999px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  padding: 0.625rem 0.9rem;
}

.primary-button {
  align-self: flex-start;
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.secondary-button {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.organisation-list,
.event-list {
  display: grid;
  gap: 0.75rem;
}

.organisation-card,
.event-card {
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.875rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  background: var(--color-surface-raised);
}

.organisation-card h3,
.event-card h3 {
  margin: 0 0 0.25rem;
  font-size: 0.98rem;
}

.organisation-card p,
.event-card p {
  margin: 0.25rem 0;
}

.card-actions {
  display: flex;
  align-items: flex-start;
}

.badge {
  display: inline-flex;
  margin-top: 0.5rem;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  background: var(--color-primary-glow);
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 800;
}

.state {
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  margin: 0;
  font-size: 0.85rem;
}

.state-error {
  background: var(--color-error-bg);
  color: var(--color-error);
  border: 0.0625rem solid var(--color-error-border);
}

.state-info {
  background: var(--color-primary-glow);
  color: var(--color-primary);
  border: 0.0625rem solid var(--color-primary-light);
}

.loading-box,
.empty,
.muted {
  color: var(--color-text-muted);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.875rem;
}

.panel-head h2 {
  margin: 0;
}

.event-card-info {
  flex: 1;
  min-width: 0;
}

.event-card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
  flex-shrink: 0;
}

.danger-button {
  border: 0.0625rem solid var(--color-error-border, #fca5a5);
  border-radius: 999px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  padding: 0.625rem 0.9rem;
  background: var(--color-error-bg, #fef2f2);
  color: var(--color-error, #dc2626);
}

.danger-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.color-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-input {
  width: 2.75rem;
  height: 2.25rem;
  padding: 0.125rem;
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface-raised);
  cursor: pointer;
}

.color-preview {
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.35);
  letter-spacing: 0.04em;
}

@media (max-width: 45em) {
  .form-grid,
  .organisation-card,
  .event-card {
    grid-template-columns: 1fr;
  }

  .organisation-card,
  .event-card {
    flex-direction: column;
  }

  .event-card-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>