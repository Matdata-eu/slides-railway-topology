<script setup lang="ts">
const props = withDefaults(defineProps<{ step?: number }>(), { step: 99 })
const views = [
  { x: 120, y: 60, t: 'GIS geometry', s: 'coordinates are a view', c: 'var(--c-teal)' },
  { x: 120, y: 240, t: 'Kilometres / LRS', s: 'human address', c: 'var(--c-orange)' },
  { x: 450, y: 30, t: 'Schematic layout', s: 'generated, not drawn', c: 'var(--c-purple)' },
  { x: 780, y: 60, t: 'Assets', s: 'signals, switches, balises', c: 'var(--c-red)' },
  { x: 780, y: 240, t: 'Organisation', s: 'OP, SoL, track, line', c: 'var(--c-amber)' },
  { x: 450, y: 275, t: 'Timetable · TPS · RINF', s: 'routing, RCC, route book', c: 'var(--c-green)' },
]
</script>

<template>
  <svg viewBox="0 0 900 320" class="spine">
    <g v-for="(v, i) in views" :key="i" :style="{ opacity: props.step > i ? 1 : 0.08 }" class="v">
      <line :x1="v.x" :y1="v.y" x2="450" y2="160" :style="{ stroke: v.c }" stroke-width="3" stroke-dasharray="6 5" />
      <rect :x="v.x - 95" :y="v.y - 24" width="190" height="48" rx="10" :style="{ fill: 'var(--c-bg)', stroke: v.c }" stroke-width="2.5" />
      <text :x="v.x" :y="v.y - 3" class="t">{{ v.t }}</text>
      <text :x="v.x" :y="v.y + 14" class="s">{{ v.s }}</text>
    </g>
    <g>
      <rect x="300" y="125" width="300" height="70" rx="14" style="fill: #1E2869; stroke: var(--c-sky); stroke-width: 2" />
      <path d="M 320 172 L 390 172 L 420 150 L 480 150 M 390 172 L 580 172" style="stroke: #64C8FA" stroke-width="4" fill="none" />
      <circle cx="390" cy="172" r="5" style="fill: #fff" /><circle cx="420" cy="150" r="0" />
      <text x="450" y="146" class="core">TOPOLOGY</text>
    </g>
  </svg>
</template>

<style scoped>
.spine { width: 100%; height: 330px; }
.v { transition: opacity .5s; }
.t { font-size: 15px; font-weight: 700; text-anchor: middle; fill: var(--c-ink); }
.s { font-size: 12px; text-anchor: middle; fill: var(--c-ink-mod); }
.core { font-size: 20px; font-weight: 800; text-anchor: middle; fill: #fff; letter-spacing: 3px; }
</style>
