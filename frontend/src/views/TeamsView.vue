<script setup lang="ts">
import TeamsManager from '../components/TeamsManager.vue'
</script>

<template>
  <div class="teams-page">
    <header class="page-header">
      <h1 class="page-title">Teams</h1>
    </header>

    <TeamsManager />
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
</style>
