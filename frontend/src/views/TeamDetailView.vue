<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { normalizeError } from '../utils/normalizeError'
import type { TeamDetail } from '../types/team'

const route = useRoute()
const router = useRouter()
const team = ref<TeamDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const teamId = computed(() => route.params.id as string)

provide('teamDetail', team)

onMounted(async () => {
  if (!supabase) {
    error.value = 'Supabase nicht konfiguriert.'
    loading.value = false
    return
  }

  const { data, error: rpcError } = await supabase
    .rpc('get_team_details', { p_team_id: teamId.value })
    .maybeSingle()

  loading.value = false

  if (rpcError) {
    error.value = normalizeError(rpcError)
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
    <button class="back-button" type="button" @click="router.push('/teams')">
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

      <nav class="detail-tabs" aria-label="Team-Bereiche">
        <RouterLink class="detail-tab" :to="{ name: 'team-members', params: { id: teamId } }">
          Mitglieder
        </RouterLink>
        <RouterLink class="detail-tab" :to="{ name: 'team-appointment-suggestions', params: { id: teamId } }">
          Terminvorschläge
        </RouterLink>
      </nav>

      <RouterView />
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  padding: var(--space-4xl) var(--space-3xl);
  width: 100%;
  max-width: none;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4xl);
  box-sizing: border-box;
}

@media (max-width: 45em) {
  .detail-page {
    padding: var(--space-2xl) var(--space-lg);
    gap: var(--space-2xl);
  }
}

.back-button {
  align-self: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  transition: color 0.15s;
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

.detail-tabs {
  display: flex;
  gap: var(--space-md);
  border-bottom: 0.0625rem solid var(--color-border);
}

.detail-tab {
  padding: var(--space-md) var(--space-lg);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-decoration: none;
  border-bottom: 0.125rem solid transparent;
  margin-bottom: -0.0625rem;
}

.detail-tab:hover {
  color: var(--color-text);
}

.detail-tab.router-link-exact-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.error-banner {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 0.0625rem solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: #ef4444;
  font-size: var(--font-size-sm);
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
