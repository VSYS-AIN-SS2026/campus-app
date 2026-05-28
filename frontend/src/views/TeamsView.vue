<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import type { TeamOverview } from '../types/team'
import TeamsManager from '../components/TeamsManager.vue'

const router = useRouter()
const teams = ref<TeamOverview[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  if (!supabase) {
    error.value = 'Supabase nicht konfiguriert.'
    loading.value = false
    return
  }

  const { data, error: rpcError } = await supabase.rpc('get_teams')
  loading.value = false

  if (rpcError) {
    error.value = rpcError.message
    return
  }

  teams.value = (data ?? []) as TeamOverview[]
})
</script>

<template>
  <div class="teams-page">
    <header class="page-header">
      <h1 class="page-title">Teams</h1>
    </header>

    <TeamsManager />

    <hr class="section-divider" />

    <section class="all-teams-section">
      <h2 class="section-title">Alle Teams</h2>
      <p class="section-subtitle">Übersicht aller Projektteams</p>

      <div v-if="loading" class="teams-loading">
        <div class="spinner" />
        <p>Teams werden geladen…</p>
      </div>

      <div v-else-if="error" class="error-banner">
        {{ error }}
      </div>

      <p v-else-if="teams.length === 0" class="teams-empty">
        Keine Teams gefunden.
      </p>

      <ul v-else class="teams-grid">
        <li
          v-for="team in teams"
          :key="team.id"
          class="team-card"
          @click="router.push(`/teams/${team.id}`)"
        >
          <h3 class="team-card-name">{{ team.name }}</h3>
          <p v-if="team.short_info" class="team-card-info">{{ team.short_info }}</p>
          <span class="team-card-link">Details ansehen →</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.teams-page {
  padding: var(--space-4xl) var(--space-3xl);
  max-width: 56rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-3xl);
}

.page-header {
  margin-bottom: 0;
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
  margin: 0;
}

.section-divider {
  border: none;
  border-top: 0.0625rem solid var(--color-border);
  margin: 0;
}

.all-teams-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--space-xs);
}

.section-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
}

.teams-loading {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.teams-empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.error-banner {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 0.0625rem solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: #ef4444;
  font-size: var(--font-size-sm);
}

.teams-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: var(--space-2xl);
}

.team-card {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3xl);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.team-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0.125rem 0.75rem 0 color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.team-card-name {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.team-card-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.55;
  margin: 0;
  flex: 1;
}

.team-card-link {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-primary);
  margin-top: var(--space-sm);
}

.spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 0.1875rem solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
