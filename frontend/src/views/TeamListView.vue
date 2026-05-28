<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTeamsOverview, type TeamOverview } from '../services/teamService'

const router = useRouter()
const teams = ref<TeamOverview[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    teams.value = await getTeamsOverview()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="team-list-view">
    <div class="page-header">
      <h1 class="page-title">Teams</h1>
      <p class="page-subtitle">Übersicht aller Teams</p>
    </div>

    <div v-if="error" class="error-banner">⚠️ {{ error }}</div>

    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <p>Teams werden geladen…</p>
    </div>

    <div v-else-if="!loading && teams.length === 0" class="empty-state">
      <div class="empty-icon">👥</div>
      <p>Keine Teams vorhanden.</p>
    </div>

    <div v-else class="team-cards">
      <div
        v-for="team in teams"
        :key="team.id"
        class="team-card"
        @click="router.push(`/teams/${team.id}`)"
      >
        <div class="team-card-name">{{ team.name }}</div>
        <div v-if="team.short_info" class="team-card-info">{{ team.short_info }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-list-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.page-header { display: flex; flex-direction: column; gap: 6px; }

.page-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.page-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.error-banner {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.88rem;
}

.team-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.team-card {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.625rem;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.team-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0.125rem 0.75rem var(--color-primary-glow);
}

.team-card-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.team-card-info {
  margin-top: 4px;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: var(--color-text-muted);
}

.empty-icon { font-size: 2.5rem; }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
