<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTeamDetails, type TeamDetails } from '../services/teamService'

const route = useRoute()
const router = useRouter()
const team = ref<TeamDetails | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    team.value = await getTeamDetails(Number(route.params.id))
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="team-detail-view">
    <button class="back-button" @click="router.push('/teams')">← Zurück zur Übersicht</button>

    <div v-if="error" class="error-banner">⚠️ {{ error }}</div>

    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <p>Team wird geladen…</p>
    </div>

    <div v-else-if="!team && !loading" class="empty-state">
      <div class="empty-icon">🔍</div>
      <p>Team nicht gefunden.</p>
    </div>

    <template v-else-if="team">
      <div class="team-header">
        <h1 class="team-name">{{ team.name }}</h1>
        <p v-if="team.description" class="team-description">{{ team.description }}</p>
      </div>

      <div class="members-section">
        <h2 class="members-title">Mitglieder</h2>
        <p v-if="team.members.length === 0" class="empty-members">
          Keine Mitglieder vorhanden.
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
              <td>{{ member.full_name ?? '—' }}</td>
              <td>{{ member.email }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.team-detail-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.back-button {
  align-self: flex-start;
  border: 0.0625rem solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.86rem;
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.back-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.team-header { display: flex; flex-direction: column; gap: 8px; }

.team-name {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.team-description {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text-muted);
}

.members-section { display: flex; flex-direction: column; gap: 12px; }

.members-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.empty-members {
  font-size: 0.88rem;
  color: var(--color-text-muted);
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.members-table th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 0.0625rem solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
}

.members-table td {
  padding: 10px 12px;
  border-bottom: 0.0625rem solid var(--color-border);
  color: var(--color-text);
}

.members-table tr:last-child td { border-bottom: none; }

.error-banner {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.88rem;
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
