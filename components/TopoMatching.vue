<script setup lang="ts">
import { computed, ref } from 'vue'
import { type Pt, elements, elementById, points, pathD, at, nodePos, nodes } from '../lib/net'

// Left: DIM (geographic micro topology, e2 split in two at a pass-through node)
// Right: TPS (schematic topology holding the primary locations)
const dimEdges = [
  { id: 'd1', el: 'e1', t0: 0, t1: 1 },
  { id: 'd2a', el: 'e2', t0: 0, t1: 0.5 },
  { id: 'd2b', el: 'e2', t0: 0.5, t1: 1 },
  { id: 'd3', el: 'e3', t0: 0, t1: 1 },
  { id: 'd4', el: 'e4', t0: 0, t1: 1 },
  { id: 'd5', el: 'e5', t0: 0, t1: 1 },
  { id: 'd6', el: 'e6', t0: 0, t1: 1 },
]
const tpsEdges = elements.map((e, i) => ({ id: 't' + (i + 1), el: e.id }))

const steps = [
  { title: 'Start', text: 'Two topologies of the same station, built by different teams for different purposes. Nothing mapped yet.', map: [] as [string[], string][] },
  { title: '1 · Anchor', text: 'A user confirms one mapping: d1 ↔ t1.', map: [[['d1'], 't1']] as [string[], string][] },
  { title: '2 · Turnout W1', text: 'Common branch known (d1). Looking from it into the switch: left branch d3 ↔ t3, right branch ↔ t2. d2a + d2b meet at a pass-through node, so they are fused and mapped as one.', map: [[['d3'], 't3'], [['d2a', 'd2b'], 't2']] as [string[], string][] },
  { title: '3 · Turnout W3', text: 'From d3 (common): left d5 ↔ t5, right d4 ↔ t4. Length of d5 vs t5 differs by 9% → shown as a warning only, it never decides.', map: [[['d5'], 't5'], [['d4'], 't4']] as [string[], string][] },
  { title: '4 · Turnout W2', text: 'Both branches known → the remaining edge is the common one: d6 ↔ t6. Whole station mapped from one click, deterministically.', map: [[['d6'], 't6']] as [string[], string][] },
]
const step = ref(0)
const palette = ['var(--c-blue)', 'var(--c-green)', 'var(--c-purple)', 'var(--c-orange)', 'var(--c-teal)', 'var(--c-pink)']
const colourOf = computed(() => {
  const m: Record<string, string> = {}
  let k = 0
  for (let i = 1; i <= step.value; i++) {
    for (const [ds, t] of steps[i].map) {
      const c = palette[k++ % palette.length]
      ds.forEach(d => (m[d] = c)); m[t] = c
    }
  }
  return m
})
const fresh = computed(() => new Set(steps[step.value].map.flatMap(([ds, t]) => [...ds, t])))

function sub(elId: string, t0: number, t1: number) {
  const el = elementById[elId]
  const out: Pt[] = []
  for (let k = 0; k <= 16; k++) out.push(at(el, 'geo', t0 + (t1 - t0) * (k / 16)).p)
  return pathD(out)
}
const mid = (elId: string, view: 'geo' | 'schematic', t: number) => at(elementById[elId], view, t).p
const switches = Object.values(nodes).filter(n => n.kind === 'switch')
</script>

<template>
  <div class="tm">
    <div class="panes">
      <div class="pane">
        <div class="pt">DIM · geographic micro topology</div>
        <svg viewBox="0 90 1000 230">
          <g v-for="d in dimEdges" :key="d.id">
            <path :d="sub(d.el, d.t0, d.t1)" class="edge" :class="{ fresh: fresh.has(d.id) }" :style="{ stroke: colourOf[d.id] }" />
            <text :x="mid(d.el, 'geo', (d.t0 + d.t1) / 2)[0]" :y="mid(d.el, 'geo', (d.t0 + d.t1) / 2)[1] - 12" class="lbl">{{ d.id }}</text>
          </g>
          <circle :cx="mid('e2', 'geo', 0.5)[0]" :cy="mid('e2', 'geo', 0.5)[1]" r="5" class="pass" />
          <g v-for="n in switches" :key="n.id"><circle :cx="nodePos(n.id, 'geo')[0]" :cy="nodePos(n.id, 'geo')[1]" r="6" class="sw" /></g>
        </svg>
      </div>
      <div class="pane">
        <div class="pt">TPS · schematic topology with primary locations</div>
        <svg viewBox="0 50 1000 250">
          <rect x="235" y="60" width="530" height="230" rx="14" class="plc" />
          <text x="500" y="285" class="plc-t">Primary location «Stasjon»</text>
          <g v-for="t in tpsEdges" :key="t.id">
            <path :d="pathD(points(elementById[t.el], 'schematic'))" class="edge" :class="{ fresh: fresh.has(t.id) }" :style="{ stroke: colourOf[t.id] }" />
            <text :x="mid(t.el, 'schematic', 0.5)[0]" :y="mid(t.el, 'schematic', 0.5)[1] - 12" class="lbl">{{ t.id }}</text>
          </g>
          <g v-for="n in switches" :key="n.id"><circle :cx="nodePos(n.id, 'schematic')[0]" :cy="nodePos(n.id, 'schematic')[1]" r="6" class="sw" /></g>
        </svg>
      </div>
    </div>
    <div class="bar">
      <button @click="step = 0">Reset</button>
      <button class="go" :disabled="step >= steps.length - 1" @click="step++">Next ▶</button>
      <div class="expl"><b>{{ steps[step].title }}</b> — {{ steps[step].text }}</div>
    </div>
  </div>
</template>

<style scoped>
.tm { font-size: 13px; }
.panes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pane { border: 1px solid var(--c-stroke); border-radius: 10px; padding: 6px; }
.pt { font-weight: 700; font-size: 12px; color: var(--c-ink-mod); }
svg { width: 100%; height: 190px; }
.edge { fill: none; stroke: var(--c-ink-subtle); stroke-width: 6; stroke-linecap: round; transition: stroke .6s; }
.edge.fresh { animation: pulse 1s ease-out 2; }
@keyframes pulse { 50% { stroke-width: 13; } }
.lbl { font-size: 22px; text-anchor: middle; fill: var(--c-ink-mod); font-family: ui-monospace, monospace; }
.sw { fill: var(--c-bg); stroke: var(--c-ink); stroke-width: 3; }
.pass { fill: var(--c-amber); }
.plc { fill: var(--c-amber-bg); stroke: var(--c-amber); stroke-dasharray: 8 6; }
.plc-t { font-size: 18px; text-anchor: middle; fill: var(--c-amber-ink); font-weight: 700; }
.bar { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.bar button { border: 1px solid var(--c-stroke); border-radius: 6px; padding: 3px 10px; background: var(--c-bg); color: var(--c-ink); font-size: 12px; }
.bar button.go { background: var(--c-blue); color: var(--c-bg); border-color: var(--c-blue); }
.bar button:disabled { opacity: .4; }
.expl { flex: 1; background: var(--c-surface); border-radius: 6px; padding: 6px 10px; min-height: 44px; }
</style>
