<script setup lang="ts">
defineProps<{
  magicLinkRedirectTo: string
  authFirstName: string
  authLastName: string
  authEmail: string
  authSending: boolean
  authError: string | null
  authInfo: string | null
}>()

const emit = defineEmits<{
  'update:authFirstName': [value: string]
  'update:authLastName': [value: string]
  'update:authEmail': [value: string]
  submit: []
}>()
</script>

<template>
  <section class="auth-card auth-card-centered">
    <header class="auth-header">
      <span class="panel-eyebrow">Anmeldung</span>
      <h1 class="auth-title">Willkommen in der Campus App</h1>
      <p class="auth-subtitle">
        Melde dich mit deiner E-Mail-Adresse an. Wir schicken dir sofort einen sicheren Link zum Einloggen.
      </p>
    </header>

    <div class="auth-divider" />

    <form class="auth-form" @submit.prevent="emit('submit')">
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="magic-link-first-name">Vorname</label>
          <input
            id="magic-link-first-name"
            :value="authFirstName"
            class="auth-input"
            type="text"
            autocomplete="given-name"
            placeholder="Vorname"
            required
            @input="emit('update:authFirstName', ($event.target as HTMLInputElement).value)"
          >
        </div>
        <div class="field-group">
          <label class="field-label" for="magic-link-last-name">Nachname</label>
          <input
            id="magic-link-last-name"
            :value="authLastName"
            class="auth-input"
            type="text"
            autocomplete="family-name"
            placeholder="Nachname"
            required
            @input="emit('update:authLastName', ($event.target as HTMLInputElement).value)"
          >
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" for="magic-link-email">E-Mail-Adresse</label>
        <input
          id="magic-link-email"
          :value="authEmail"
          class="auth-input"
          type="email"
          autocomplete="email"
          placeholder="name@beispiel.de"
          required
          @input="emit('update:authEmail', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <div class="auth-actions">
        <button class="save-button app-button" type="submit" :disabled="authSending">
          {{ authSending ? 'Wird versendet…' : 'Magic Link senden' }}
        </button>
        <p class="auth-redirect-hint">
          Nach dem Klick landest du automatisch wieder in der App.
        </p>
      </div>
    </form>
  </section>

  <div v-if="authError" class="error-banner">
    {{ authError }}
  </div>

  <div v-if="authInfo" class="success-banner">
    {{ authInfo }}
  </div>
</template>

<style scoped>

.auth-card {
  background: var(--color-surface);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.auth-card-centered {
  max-width: 420px;
  margin: 40px auto 0 auto;
  box-shadow: 0 2px 24px 0 color-mix(in srgb, var(--color-border) 30%, transparent);
  width: 100%;
}

.auth-header {
  padding: var(--space-3xl) var(--space-3xl) var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.auth-title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.auth-subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.55;
}

.auth-divider {
  height: 0.0625rem;
  background: var(--color-border);
}

.auth-form {
  padding: var(--space-4xl) var(--space-3xl) var(--space-3xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-3xl);
}

.field-row {
  display: flex;
  gap: var(--space-2xl);
}

.field-group {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.field-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-muted);
}

.auth-input {
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-text);
  padding: 0.625rem 0.875rem;
  font: inherit;
  font-size: var(--font-size-sm);
  min-height: 2.625rem;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.auth-input::placeholder {
  color: var(--color-text-muted);
}

.auth-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 0.2rem var(--color-primary-glow);
}

.auth-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2xl);
  flex-wrap: wrap;
  margin-top: var(--space-sm);
  padding-top: var(--space-xl);
  border-top: 0.0625rem solid var(--color-border);
}

.auth-redirect-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 720px) {
  .auth-card-centered {
    margin: 24px 8px 0 8px;
    max-width: 100%;
    border-radius: var(--radius-md);
    box-shadow: 0 1px 8px 0 color-mix(in srgb, var(--color-border) 20%, transparent);
  }
  .auth-header {
    padding: var(--space-2xl) var(--space-xl) var(--space-lg);
  }
  .auth-form {
    padding: var(--space-2xl) var(--space-xl) var(--space-xl);
  }
  .field-row {
    flex-direction: column;
    gap: var(--space-xl);
  }
  .auth-actions {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-lg);
  }
}
</style>
