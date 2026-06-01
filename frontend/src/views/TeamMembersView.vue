<script setup lang="ts">
import { inject, type Ref } from 'vue'
import type { TeamDetail } from '../types/team'

// Team-Detail wird von der TeamDetailView bereitgestellt (provide/inject),
// damit nicht erneut geladen werden muss.
const team = inject<Ref<TeamDetail | null>>('teamDetail')
</script>

<template>
  <section v-if="team" class="detail-members">
    <div class="members-content">
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
    </div>
  </section>
</template>

<style scoped>
.detail-members {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.members-content {
  max-width: 48rem;
  width: 100%;
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
