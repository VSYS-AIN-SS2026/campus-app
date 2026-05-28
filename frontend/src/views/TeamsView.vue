<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import type { TeamOverview } from '../types/team'

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
    <header class="teams-header">
      <h1 class="teams-title">Teams</h1>
      <p class="teams-subtitle">Übersicht aller Projektteams</p>
    </header>

    <div v-if="loading" class="teams-loading">
      <div class="spinner" />
      <p>Teams werden geladen…</p>
    </div>

    <div v-else-if="error" class="error-banner">
      {{ error }}
    </div>

    <div v-else-if="teams.length === 0" class="teams-empty">
      Keine Teams gefunden.
    </div>

    <ul v-else class="teams-grid">
      <li
        v-for="team in teams"
        :key="team.id"
        class="team-card"
        @click="router.push(`/teams/${team.id}`)"
      >
        <h2 class="team-card-name">{{ team.name }}</h2>
        <p v-if="team.short_info" class="team-card-info">{{ team.short_info }}</p>
        <span class="team-card-link">Details ansehen →</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.teams-page {
  padding: var(--space-4xl) var(--space-3xl);
  max-width: 56rem;
}

.teams-header {
  margin-bottom: var(--space-4xl);
}

.teams-title {
  font-size: var(--font-size-xl);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
  margin: 0 0 var(--space-sm);
}

.teams-subtitle {
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
</style>
