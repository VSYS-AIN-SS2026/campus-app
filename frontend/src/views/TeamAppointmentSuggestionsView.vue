<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const teamId = route.params.id as string

// Reines Layout-/Routing-Gerüst – noch ohne Such-Logik.
// Solange keine Suche durchgeführt wurde, wird der Empty State gezeigt.
const hasSearched = false
</script>

<template>
  <section class="suggestions" :data-team-id="teamId">
    <header class="suggestions__intro">
      <h2 class="suggestions__heading">Terminvorschläge</h2>
      <p class="suggestions__subtitle">
        Finde gemeinsame freie Termine basierend auf den Wochenplänen der Team-Mitglieder.
      </p>
    </header>

    <div class="suggestions__layout">
      <!-- Container für das Such-Tool (Logik folgt in einer späteren Story) -->
      <aside class="suggestions__search" aria-label="Suchformular">
        <div class="placeholder-card">
          <h3 class="placeholder-card__title">Suche</h3>
          <p class="placeholder-card__hint">
            Das Suchformular (Zeitraum, Start-/Endzeit, ausgeschlossene Tage) folgt hier.
          </p>
        </div>
      </aside>

      <!-- Container für die kombinierte Wochenansicht -->
      <div class="suggestions__week" aria-label="Kombinierte Wochenansicht">
        <div v-if="!hasSearched" class="empty-state">
          <p class="empty-state__title">Noch keine Suche durchgeführt</p>
          <p class="empty-state__hint">
            Lege links die gewünschten Kriterien fest, um Terminvorschläge zu erhalten.
            Die kombinierte Wochenansicht der Team-Mitglieder erscheint dann hier.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.suggestions__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.suggestions__heading {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.suggestions__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
  margin: 0;
}

/* Layout-Container: Such-Form links, Wochenansicht rechts.
   Stapelt auf schmalen Viewports. */
.suggestions__layout {
  display: grid;
  grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
  gap: var(--space-2xl);
  align-items: start;
}

@media (max-width: 48rem) {
  .suggestions__layout {
    grid-template-columns: 1fr;
  }
}

.suggestions__search {
  min-width: 0;
}

.suggestions__week {
  min-width: 0;
  min-height: 18rem;
  display: flex;
}

.placeholder-card {
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-raised);
  padding: var(--space-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.placeholder-card__title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.placeholder-card__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1.6;
  margin: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--space-md);
  padding: var(--space-4xl) var(--space-2xl);
  border: 0.0625rem dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.empty-state__title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.empty-state__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1.6;
  max-width: 28rem;
  margin: 0;
}
</style>
