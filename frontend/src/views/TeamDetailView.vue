<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import type { TeamDetail } from '../types/team'

const route = useRoute()
const router = useRouter()
const team = ref<TeamDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const teamId = route.params.id as string

  if (!supabase) {
    error.value = 'Supabase nicht konfiguriert.'
    loading.value = false
    return
  }

  const { data, error: rpcError } = await supabase
    .rpc('get_team_details', { p_team_id: teamId })
    .maybeSingle()

  loading.value = false

  if (rpcError) {
    error.value = rpcError.message
    return
  }

  if (!data) {
    error.value = 'Team nicht gefunden.'
    return
  }

  team.value = data as TeamDetail
})
</script>

<template>
  <div class="detail-page">
    <button class="back-button ghost-button" type="button" @click="router.push('/teams')">
      ← Zurück zur Übersicht
    </button>

    <div v-if="loading" class="detail-loading">
      <div class="spinner" />
      <p>Team wird geladen…</p>
    </div>

    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <template v-else-if="team">
      <header class="detail-header">
        <h1 class="detail-title">{{ team.name }}</h1>
        <p v-if="team.description" class="detail-description">{{ team.description }}</p>
      </header>

      <section class="detail-members">
        <h2 class="members-heading">Mitglieder</h2>

        <p v-if="team.members.length === 0" class="members-empty">
          Keine Mitglieder eingetragen.
        </p>

        <table v-else class="members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in team.members" :key="member.email">
              <td>{{ member.name }}</td>
              <td>{{ member.email }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  padding: var(--space-4xl) var(--space-3xl);
  max-width: 48rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-4xl);
}

.back-button {
  align-self: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: 0;
}

.back-button:hover {
  color: var(--color-primary);
}

.detail-loading {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.detail-title {
  font-size: var(--font-size-xl);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
  margin: 0;
}

.detail-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
  margin: 0;
}

.detail-members {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.members-heading {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.members-empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.members-table th,
.members-table td {
  text-align: left;
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 0.0625rem solid var(--color-border);
}

.members-table th {
  font-weight: 700;
  text-transform: uppercase;
  font-size: var(--font-size-xs);
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.members-table td {
  color: var(--color-text);
}

.members-table tbody tr:hover td {
  background: var(--color-surface-raised);
}
</style>
