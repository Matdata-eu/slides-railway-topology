<script setup lang="ts">
import { computed, ref } from 'vue'
import { type Pt, pathD } from '../lib/net'
import { elements2, elById2, nodes2, trackById2, points2, at2, nodePos2 } from '../lib/net2'
import { type Worksite, sectioning, sections, signals2, protect, kmAt } from '../lib/catenary'

/**
 * A worksite is one linear location on the topology. From it we infer:
 * the signals that close every route towards it, and the catenary sections (plus the sectioning
 * elements and breakers) to switch off — and which other sections lose supply as a side effect.
 */
const props = withDefaults(defineProps<{ step?: number }>(), { step: 3 })
const s = computed(() => Math.max(0, Math.min(3, props.step)))
const ws = ref<Worksite>({ el: 'a6', t0: 0.3, t1: 0.7 })
const res = computed(() => protect(ws.value))
function place(el: string) { ws.value = { el, t0: 0.3, t1: 0.7 } }

function sub(el: string, t0: number, t1: number) {
  const out: Pt[] = []
  for (let k = 0; k <= 16; k++) out.push(at2(elById2[el], 'schematic', t0 + (t1 - t0) * (k / 16)).p)
  return pathD(out)
}
function sigGeom(g: { el: string; t: number; facing: number }) {
  const { p, dir } = at2(elById2[g.el], 'schematic', g.t)
  const fd: Pt = [dir[0] * g.facing, dir[1] * g.facing]
  const n: Pt = [-fd[1], fd[0]]
  const base: Pt = [p[0] + n[0] * 14, p[1] + n[1] * 14]
  const tip: Pt = [base[0] + fd[0] * 12, base[1] + fd[1] * 12]
  return { p, base, tri: [tip, [base[0] - n[0] * 6, base[1] - n[1] * 6], [base[0] + n[0] * 6, base[1] + n[1] * 6]] as Pt[], label: [base[0] + n[0] * 15, base[1] + n[1] * 15 + 4] as Pt }
}
const sigDesc: Record<string, string> = {
  A: 'entry signal, Line N west', B: 'entry signal, Line S west', C: 'entry signal, Line N east', D: 'entry signal, Line S east',
  N1: 'exit signal, Track 1 west', N2: 'exit signal, Track 1 east', S1: 'exit signal, Track 2 west', S2: 'exit signal, Track 2 east',
  T1: 'exit signal, Track 3 west', T2: 'exit signal, Track 3 east',
}
const secById = Object.fromEntries(sections.map(c => [c.id, c]))
const wsTrack = computed(() => trackById2[elById2[ws.value.el].track].label.replace(' (west)', '').replace(' (east)', ''))
const wsKm = computed(() => {
  const a = at2(elById2[ws.value.el], 'schematic', ws.value.t0).p[0], b = at2(elById2[ws.value.el], 'schematic', ws.value.t1).p[0]
  return `km ${kmAt(Math.min(a, b)).toFixed(3)}–${kmAt(Math.max(a, b)).toFixed(3)}`
})
const isolated = computed(() => new Set(res.value.sections))
const dead = computed(() => new Set(res.value.dead))
const openSE = computed(() => new Set(res.value.openEls))
</script>

<template>
  <div class="wp">
    <div class="main">
      <svg viewBox="20 60 960 232" class="cv">
        <defs>
          <pattern id="ws-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" style="fill: var(--c-red-bg)" /><line x1="0" y1="0" x2="0" y2="8" style="stroke: var(--c-red); stroke-width: 3" />
          </pattern>
        </defs>
        <!-- catenary sections -->
        <g v-if="s >= 2">
          <template v-for="c in sections" :key="c.id">
            <path v-for="p in c.pieces" :key="p.id" :d="sub(p.el, p.t0, p.t1)" class="band"
              :class="{ iso: isolated.has(c.id), dead: dead.has(c.id) }" :style="{ stroke: isolated.has(c.id) ? 'var(--c-amber)' : c.colour }" />
          </template>
        </g>
        <!-- protected zone -->
        <g v-if="s >= 1">
          <path v-for="(z, i) in res.zone" :key="'z' + i + z.el + z.t0" :d="sub(z.el, z.t0, z.t1)" class="zone" />
        </g>
        <!-- tracks -->
        <g v-for="el in elements2" :key="el.id" class="el" @click="place(el.id)">
          <path :d="pathD(points2(el, 'schematic'))" class="hit" />
          <path :d="pathD(points2(el, 'schematic'))" class="trk" />
        </g>
        <g v-for="n in Object.values(nodes2)" :key="n.id" :transform="`translate(${nodePos2(n.id, 'schematic')[0]},${nodePos2(n.id, 'schematic')[1]})`">
          <circle :r="n.kind === 'switch' ? 5 : 4" :class="n.kind === 'switch' ? 'swn' : 'endn'" />
        </g>
        <!-- worksite -->
        <path :d="sub(ws.el, ws.t0, ws.t1)" class="ws" />
        <text :x="at2(elById2[ws.el], 'schematic', 0.5).p[0]" :y="at2(elById2[ws.el], 'schematic', 0.5).p[1] + 30" class="wst">⛑ worksite</text>
        <!-- sectioning elements opened -->
        <g v-if="s >= 2">
          <g v-for="se in sectioning" :key="se.id" :transform="`translate(${at2(elById2[se.el], 'schematic', se.t).p[0]},${at2(elById2[se.el], 'schematic', se.t).p[1]})`">
            <rect x="-4" y="-9" width="8" height="18" rx="2" class="se" :class="{ open: openSE.has(se.id) }" />
            <text v-if="openSE.has(se.id)" y="-13" class="set">{{ se.id }} open</text>
          </g>
        </g>
        <!-- signals -->
        <g v-for="g in signals2" :key="g.id" class="sig" :class="{ bnd: s >= 1 && res.boundary.includes(g.id), faded: s >= 1 && !res.boundary.includes(g.id) }">
          <circle v-if="s >= 1 && res.boundary.includes(g.id)" :cx="sigGeom(g).base[0]" :cy="sigGeom(g).base[1]" r="15" class="halo" />
          <line :x1="sigGeom(g).p[0]" :y1="sigGeom(g).p[1]" :x2="sigGeom(g).base[0]" :y2="sigGeom(g).base[1]" class="mast" />
          <polygon :points="sigGeom(g).tri.map(p => p.join(',')).join(' ')" class="head" />
          <text :x="sigGeom(g).label[0]" :y="sigGeom(g).label[1]" class="sl">{{ g.id }}</text>
        </g>
      </svg>
      <div class="hint">Click any track to move the worksite · everything on the right is recomputed</div>
    </div>

    <div class="order">
      <div class="row"><div class="oh">Work order · inferred</div><b>Worksite</b> {{ wsTrack }} · {{ wsKm }} · OP Stasjon
      <template v-if="s >= 1">
        <div class="mt"><b>🚦 Signal boundaries</b></div>
        <div v-for="b in res.boundary" :key="b" class="item"><span class="tag red">{{ b }}</span> {{ sigDesc[b] }} · blocked at danger</div>
        <div v-for="e in res.openEnds" :key="e" class="item warn">⚠ open line beyond the model: protect from the next station</div>
      </template></div>
      <div class="row" v-if="s >= 2">
        <b>⚡ Catenary out of service</b>
        <div v-for="c in res.sections" :key="c" class="item"><span class="tag amber">{{ c }}</span> {{ secById[c].name }} · switch off and earth</div>
        <div class="item">Open: <span v-for="o in [...res.openEls, ...res.openFeeders]" :key="o" class="tag ghost">{{ o }}</span></div>
        <div v-if="res.dead.length" class="item warn">⚠ Side effect: <span v-for="d in res.dead" :key="d">{{ d }} {{ secById[d].name }}</span> loses supply</div>
      </div>
      <div class="row ok" v-if="s >= 3">✔ Defined, checked and communicated from <b>one position</b>. Signalling and catenary data stay with their own teams.</div>
    </div>
  </div>
</template>

<style scoped>
.wp { font-size: 13px; }
.cv { width: 100%; height: 232px; display: block; }
.trk { fill: none; stroke: var(--c-ink); stroke-width: 3.5; stroke-linecap: round; }
.hit { fill: none; stroke: transparent; stroke-width: 18; cursor: pointer; }
.swn { fill: var(--c-bg); stroke: var(--c-ink); stroke-width: 2; } .endn { fill: var(--c-ink); }
.band { fill: none; stroke-width: 18; opacity: .22; transition: opacity .4s, stroke .4s; }
.band.iso { opacity: .55; }
.band.dead { opacity: .5; stroke: var(--c-ink-subtle) !important; stroke-dasharray: 6 5; }
.zone { fill: none; stroke: var(--c-red); stroke-width: 8; opacity: .3; stroke-linecap: round; }
.ws { fill: none; stroke: url(#ws-hatch); stroke-width: 16; }
.wst { font-size: 13px; font-weight: 800; text-anchor: middle; fill: var(--c-red); }
.se { fill: var(--c-ink-mod); }
.se.open { fill: var(--c-bg); stroke: var(--c-red); stroke-width: 2.5; }
.set { font-size: 11px; font-weight: 700; text-anchor: middle; fill: var(--c-red); }
.mast { stroke: var(--c-ink); stroke-width: 1.6; }
.head { fill: var(--c-ink-mod); }
.sig.bnd .head { fill: var(--c-red); }
.sig.faded { opacity: .45; }
.halo { fill: var(--c-red-bg); stroke: var(--c-red); stroke-width: 2; }
.sl { font-size: 13px; font-weight: 800; text-anchor: middle; fill: var(--c-ink-mod); }
.sig.bnd .sl { fill: var(--c-red); font-size: 16px; }
.hint { font-size: 11.5px; color: var(--c-ink-mod); }
.order { display: grid; grid-template-columns: 1.1fr 1.3fr 1fr; gap: 4px 16px; align-items: start; margin-top: 4px; background: var(--c-surface); border: 1px solid var(--c-stroke); border-radius: 10px; padding: 8px 10px; font-size: 12px; }
.oh { font-weight: 800; color: var(--c-heading); margin-bottom: 4px; }
.row { line-height: 1.45; }
.mt { margin-top: 4px; }
.item { margin-left: 4px; }
.tag { display: inline-block; padding: 0 6px; border-radius: 5px; font-weight: 700; margin-right: 3px; font-size: 11px; }
.tag.red { background: var(--c-red-bg); color: var(--c-red); }
.tag.amber { background: var(--c-amber-bg); color: var(--c-amber-ink); }
.tag.ghost { border: 1px solid var(--c-red); color: var(--c-red); }
.warn { color: var(--c-amber-ink); }
.ok { background: var(--c-green-bg); color: var(--c-green-ink); border-radius: 6px; padding: 4px 6px; }
</style>
