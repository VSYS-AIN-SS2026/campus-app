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
  <section class="auth-card">
    <span class="panel-eyebrow">Registrierung & Login</span>
    <h1 class="page-title">Anmelden per Magic Link</h1>
    <p class="page-subtitle">
      Gib deine E-Mail-Adresse ein – wir schicken dir einen Link zum Einloggen.
    </p>

    <form class="auth-form" @submit.prevent="emit('submit')">
      <label class="meta-label" for="magic-link-first-name">Vorname</label>
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
      <label class="meta-label" for="magic-link-last-name">Nachname</label>
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
      <label class="meta-label" for="magic-link-email">E-Mail</label>
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
      <button class="save-button auth-submit" type="submit" :disabled="authSending">
        {{ authSending ? 'Wird versendet…' : 'Magic Link senden' }}
      </button>
    </form>

    <p class="helper-copy">
      Redirect URL: <code>{{ magicLinkRedirectTo }}</code>
    </p>
  </section>

  <div v-if="authError" class="error-banner">
    ⚠️ {{ authError }}
  </div>

  <div v-if="authInfo" class="success-banner">
    {{ authInfo }}
  </div>
</template>
