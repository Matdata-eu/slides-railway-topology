<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentLayout } = useNav()
</script>

<template>
  <div v-if="currentLayout !== 'cover' && currentLayout !== 'section'" class="abs-tr mt-4 mr-6 bn-logo">
    <img src="/assets/banenor-logo.svg" class="h-9 dark:hidden" alt="Bane NOR" />
    <img src="/assets/banenor-logo-inverted.svg" class="h-9 hidden dark:block" alt="Bane NOR" />
  </div>
</template>
