<template>
  <aside class="sidebar" :class="{ 'sidebar-open': isOpen }" aria-label="Seitenmenü">
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
      <button
        type="button"
        class="sidebar-nav-item sidebar-nav-item-with-badge"
        :class="activeSection === 'teams' ? 'sidebar-nav-item-active' : ''"
        @click="select('teams')"
      >
        <span>Meine Teams</span>

        <span
          v-if="teamInvitationCount && teamInvitationCount > 0"
          class="notification-badge"
        >
          {{ teamInvitationCount }}
      </span>
    </button>
    <button
        type="button"
        class="sidebar-nav-item"
        :class="activeSection === 'organisations' ? 'sidebar-nav-item-active' : ''"
        @click="select('organisations')"
      >
        Organisationen
    </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
type SidebarSection = 'modules' | 'calendar' | 'profile' | 'teams' | 'organisations'

defineProps<{
  activeSection: SidebarSection
  isOpen?: boolean
  teamInvitationCount?: number
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
  width: 17.5rem;
  background: var(--color-surface);
  border-right: 0.0625rem solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  position: sticky;
  top: 3.5rem;
  height: calc(100vh - 3.5rem);
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

.sidebar-nav-item-with-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notification-badge {
  min-width: 1.3rem;
  height: 1.3rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #ff4d4f;
  color: white;
  font-size: 0.72rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 60em) {
  .sidebar {
    width: 15rem;
  }
}

@media (max-width: 45em) {
  .sidebar {
    position: fixed;
    top: 3.5rem;
    left: 0;
    width: 16rem;
    height: calc(100vh - 3.5rem);
    border-right: 0.0625rem solid var(--color-border);
    border-bottom: none;
    z-index: 20;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0.25rem 0 1.5rem color-mix(in srgb, black 15%, transparent);
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }
}
</style>
