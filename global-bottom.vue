<script setup lang="ts">
import { useNav } from '@slidev/client'
const { currentPage, total, currentLayout } = useNav()
</script>

<template>
  <footer v-if="currentLayout !== 'cover'" class="abs-b bn-foot">
    <span>Bane NOR · RINF workshop · Railway topology</span>
    <span>{{ currentPage }} / {{ total }}</span>
  </footer>
</template>

<style>
.bn-foot { display: flex; justify-content: space-between; padding: 4px 24px; font-size: 10px; letter-spacing: .04em;
  color: var(--c-ink-mod); border-top: 3px solid var(--c-sky); }
.slidev-layout.section ~ .bn-foot { color: #C4EFFF; }
</style>
