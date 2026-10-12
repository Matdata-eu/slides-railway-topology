<script setup lang="ts">
defineProps<{ step?: number }>()
</script>

<template>
  <svg viewBox="0 0 900 300" class="km">
    <!-- 1. km jump -->
    <g v-if="(step ?? 3) >= 1">
      <text x="10" y="30" class="h">① Mileage change</text>
      <line x1="40" y1="70" x2="860" y2="70" class="trk" />
      <g v-for="(k, i) in ['12.0','12.5','13.0','13.5','13.9','13.2','13.7','14.2','14.7']" :key="i">
        <line :x1="60 + i * 95" y1="60" :x2="60 + i * 95" y2="80" class="tick" :class="{ bad: i === 4 || i === 5 }" />
        <text :x="60 + i * 95" y="98" class="k" :class="{ bad: i === 4 || i === 5 }">{{ k }}</text>
      </g>
      <text x="485" y="50" class="warn">km 13.2–13.9 exists twice</text>
    </g>
    <!-- 2. two lines same km -->
    <g v-if="(step ?? 3) >= 2">
      <text x="10" y="135" class="h">② Same km on two lines, through the same station</text>
      <path d="M 40 175 L 860 175" class="trk" />
      <path d="M 300 175 Q 420 175 520 225 L 860 225" class="trk l2" />
      <text x="600" y="168" class="k">Line 2100 km 23.4</text>
      <text x="600" y="246" class="k l2t">Line 2400 km 23.4</text>
    </g>
    <!-- 3. opposite direction -->
    <g v-if="(step ?? 3) >= 3">
      <text x="10" y="275" class="h">③ Lines counting in opposite directions</text>
      <text x="360" y="275" class="k">→ km 0 … 54 (2100)</text>
      <text x="600" y="275" class="k l2t">km 87 … 31 ← (2400)</text>
    </g>
  </svg>
</template>

<style scoped>
.km { width: 100%; height: 300px; }
.h { font-size: 15px; font-weight: 700; fill: var(--c-ink); }
.trk { stroke: var(--c-ink); stroke-width: 5; fill: none; }
.trk.l2 { stroke: var(--c-teal); }
.tick { stroke: var(--c-ink); stroke-width: 2; }
.tick.bad { stroke: var(--c-red); stroke-width: 4; }
.k { font-size: 13px; text-anchor: middle; fill: var(--c-ink-mod); font-family: ui-monospace, monospace; }
.k.bad { fill: var(--c-red); font-weight: 700; }
.l2t { fill: var(--c-teal); }
.warn { font-size: 13px; fill: var(--c-red); font-weight: 700; text-anchor: middle; }
</style>
