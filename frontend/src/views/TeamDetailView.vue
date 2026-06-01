<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import type { TeamDetail } from '../types/team'

const route = useRoute()
const router = useRouter()
const team = ref<TeamDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const teamId = computed(() => route.params.id as string)

// Team-Detail an die Bereichs-Tabs (Mitglieder / Terminvorschläge) weitergeben.
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
</style>
