<template>
  <aside class="sidebar" aria-label="Seitenmenü">
    <nav class="sidebar-nav" aria-label="Hauptnavigation">
      <button
        type="button"
        class="sidebar-nav-item"
        :class="activeSection === 'modules' ? 'sidebar-nav-item-active' : ''"
        @click="select('modules')"
      >
        Meine Module
      </button>
      <button
        type="button"
        class="sidebar-nav-item"
        :class="activeSection === 'calendar' ? 'sidebar-nav-item-active' : ''"
        @click="select('calendar')"
      >
        Wochenansicht
      </button>
      <button
        type="button"
        class="sidebar-nav-item"
        :class="activeSection === 'profile' ? 'sidebar-nav-item-active' : ''"
        @click="select('profile')"
      >
        Profil
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
type SidebarSection = 'modules' | 'calendar' | 'profile'

defineProps<{
  activeSection: SidebarSection
}>()

const emit = defineEmits<{
  navigate: [target: SidebarSection]
}>()

function select(section: SidebarSection) {
  emit('navigate', section)
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--color-surface);
  border-right: 0.0625rem solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-nav-item {
  border: 0.0625rem solid var(--color-border);
  border-radius: 0.625rem;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  text-align: left;
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.sidebar-nav-item:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-raised);
}

.sidebar-nav-item:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 var(--button-focus-ring-width) var(--color-primary-glow);
}

.sidebar-nav-item-active {
  border-color: var(--color-primary);
  background: var(--color-surface-raised);
}

@media (max-width: 960px) {
  .sidebar {
    width: 240px;
  }
}

@media (max-width: 720px) {
  .sidebar {
    position: static;
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 0.0625rem solid var(--color-border);
  }
}
</style>
