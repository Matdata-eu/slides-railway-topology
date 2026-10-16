<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentLayout, currentPage, total } = useNav()
</script>

<template>
  <div v-if="currentLayout !== 'cover' && currentLayout !== 'section'" class="abs-tr mt-4 mr-6 bn-logo">
    <img src="/assets/banenor-logo.svg" class="h-9 dark:hidden" alt="Bane NOR" />
    <img src="/assets/banenor-logo-inverted.svg" class="h-9 hidden dark:block" alt="Bane NOR" />
  </div>
  <!-- global-bottom renders under the opaque slide, so the page number lives here -->
  <div v-if="currentLayout !== 'cover'" class="abs-br mb-3 mr-6 bn-page" :class="{ 'on-section': currentLayout === 'section' }">
    {{ currentPage }} / {{ total }}
  </div>
</template>

<style>
.bn-page { font-size: 11px; letter-spacing: .04em; color: var(--c-ink-mod); }
.bn-page.on-section { color: var(--c-blue-strong); }
</style>
