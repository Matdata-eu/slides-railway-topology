<script setup lang="ts">
import { computed } from 'vue'
import { type Pt, elements, elementById, points, pathD, N_SAMPLES } from '../lib/net'

/**
 * Step-by-step build-up of a railway topology (RailTopoModel vocabulary):
 * network → net elements → orientation → net relations → knowledge graph view
 * → schematic / geographic representation → locations on the topology, shown in every representation
 * → aggregation to the meso level (OP + sections of line) and the macro level (only the national railway line).
 */
const props = withDefaults(defineProps<{ step?: number; height?: number }>(), { step: 0, height: 330 })

type Mode = 'empty' | 'abstract' | 'kg' | 'schematic' | 'geo' | 'meso' | 'macro'
const stages: { mode: Mode; title: string; sub: string }[] = [
  { mode: 'empty', title: 'Network', sub: 'An empty network: «Norwegian railway network». Nothing in it yet.' },
  { mode: 'abstract', title: 'Net elements', sub: 'Abstract building blocks. No position, no shape — just things that exist.' },
  { mode: 'abstract', title: 'Net elements are directed', sub: 'Every linear element has an origin (0) and an end (1).' },
  { mode: 'abstract', title: 'Net relations', sub: 'Directed from element A to element B, with a navigability: Both · AB · BA · None. This is the topology graph.' },
  { mode: 'kg', title: 'Topology graph ≠ knowledge graph', sub: 'In RDF, net elements AND net relations are nodes. elementA / elementB are themselves directed triples.' },
  { mode: 'schematic', title: 'Representation: schematic', sub: 'The same net elements get a schematic geometry (an associated positioning system with x/y).' },
  { mode: 'geo', title: 'Representation: geographic', sub: 'And a geographic geometry (e.g. EPSG:25833). Same elements, same relations, other view.' },
  { mode: 'abstract', title: 'Locations on the topology', sub: 'Spot, linear and area locations only need the net elements and intrinsic coordinates.' },
  { mode: 'schematic', title: 'Same locations, schematic', sub: 'Nothing was re-entered: the positions are projected onto the schematic representation.' },
  { mode: 'geo', title: 'Same locations, geographic', sub: '… and onto the geographic one. One position, many representations.' },
  { mode: 'meso', title: 'Aggregation: meso level', sub: 'The station tracks collapse into one Operational Point, with a section of line to the left and to the right.' },
  { mode: 'macro', title: 'Aggregation: macro level', sub: 'The station disappears from the graph. Only the national railway line remains.' },
]
const s = computed(() => Math.max(0, Math.min(stages.length - 1, props.step)))
const stage = computed(() => stages[s.value])
const mode = computed(() => stage.value.mode)
const showLocations = computed(() => s.value >= 7 && s.value <= 9)
const aggregated = computed(() => mode.value === 'meso' || mode.value === 'macro')

// floating positions of the abstract net elements
const floatPos: Record<string, Pt> = {
  e1: [140, 215], e2: [470, 270], e3: [330, 145], e4: [640, 150], e5: [500, 85], e6: [840, 225],
}
const HALF = 42
function abstractPts(id: string): Pt[] {
  const [cx, cy] = floatPos[id]
  const el = elementById[id]
  // drawn origin → end from left to right, so the arrow always reads 0 → 1
  const a: Pt = [cx - HALF, cy], b: Pt = [cx + HALF, cy]
  const pts: Pt[] = []
  for (let k = 0; k < N_SAMPLES; k++) {
    const f = k / (N_SAMPLES - 1)
    pts.push([a[0] + (b[0] - a[0]) * f, a[1]])
  }
  // canonical order is from→to; if the element is reversed, origin sits at `to`
  return el.reversed ? pts.reverse() : pts
}
// meso / macro: the line tracks stretch to the OP, the station elements shrink into it
const AGG_Y = 215
const OP: Pt = [500, AGG_Y]
const aggEnds: Record<string, [Pt, Pt]> = { e1: [[40, AGG_Y], OP], e6: [OP, [960, AGG_Y]] }
const isLineEl = (id: string) => id in aggEnds
function aggPts(id: string): Pt[] {
  const [a, b] = aggEnds[id] ?? [OP, OP]
  const out: Pt[] = []
  for (let k = 0; k < N_SAMPLES; k++) {
    const f = k / (N_SAMPLES - 1)
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
  }
  return out
}
function pts(id: string): Pt[] {
  if (aggregated.value) return aggPts(id)
  if (mode.value === 'schematic') return points(elementById[id], 'schematic')
  if (mode.value === 'geo') return points(elementById[id], 'geo')
  return abstractPts(id)
}
/** point at intrinsic coordinate (0 = origin, 1 = end) */
function atI(id: string, i: number): { p: Pt; d: Pt } {
  const el = elementById[id]
  const t = el.reversed ? 1 - i : i // canonical fraction
  const P = pts(id)
  const f = t * (P.length - 1)
  const k = Math.min(P.length - 2, Math.floor(f))
  const r = f - k
  const a = P[k], b = P[k + 1]
  let dx = b[0] - a[0], dy = b[1] - a[1]
  const L = Math.hypot(dx, dy) || 1
  const sgn = el.reversed ? -1 : 1
  return { p: [a[0] + dx * r, a[1] + dy * r], d: [(dx / L) * sgn, (dy / L) * sgn] }
}
function subD(id: string, i0: number, i1: number) {
  const out: Pt[] = []
  for (let k = 0; k <= 14; k++) out.push(atI(id, i0 + (i1 - i0) * (k / 14)).p)
  return pathD(out)
}
function chevron(id: string, i: number) {
  const { p, d } = atI(id, i)
  const n: Pt = [-d[1], d[0]]
  const A: Pt = [p[0] - d[0] * 6 + n[0] * 6, p[1] - d[1] * 6 + n[1] * 6]
  const B: Pt = [p[0] + d[0] * 5, p[1] + d[1] * 5]
  const C: Pt = [p[0] - d[0] * 6 - n[0] * 6, p[1] - d[1] * 6 - n[1] * 6]
  return `M ${A[0]} ${A[1]} L ${B[0]} ${B[1]} L ${C[0]} ${C[1]}`
}

// net relations (element A → element B) with navigability
const relations = [
  { id: 'r1', a: 'e1', b: 'e2', nav: 'Both' }, { id: 'r2', a: 'e1', b: 'e3', nav: 'Both' }, { id: 'r3', a: 'e2', b: 'e3', nav: 'None' },
  { id: 'r4', a: 'e3', b: 'e4', nav: 'Both' }, { id: 'r5', a: 'e3', b: 'e5', nav: 'Both' }, { id: 'r6', a: 'e4', b: 'e5', nav: 'None' },
  { id: 'r7', a: 'e2', b: 'e6', nav: 'Both' }, { id: 'r8', a: 'e4', b: 'e6', nav: 'Both' }, { id: 'r9', a: 'e2', b: 'e4', nav: 'None' },
]
function relGeom(r: { a: string; b: string }) {
  const A = floatPos[r.a], B = floatPos[r.b]
  const dx = B[0] - A[0], dy = B[1] - A[1]
  const L = Math.hypot(dx, dy)
  const ux = dx / L, uy = dy / L
  const p0: Pt = [A[0] + ux * 50, A[1] + uy * 22]
  const p1: Pt = [B[0] - ux * 50, B[1] - uy * 22]
  const mid: Pt = [(p0[0] + p1[0]) / 2 - uy * 18, (p0[1] + p1[1]) / 2 + ux * 18]
  return { d: `M ${p0[0]} ${p0[1]} Q ${mid[0]} ${mid[1]} ${p1[0]} ${p1[1]}`, mid, p0, p1 }
}
function kgGeom(r: { a: string; b: string }) {
  const A = floatPos[r.a], B = floatPos[r.b]
  const m = relGeom(r).mid
  const short = (from: Pt, to: Pt, cut: number): Pt => {
    const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy)
    return [to[0] - (dx / L) * cut, to[1] - (dy / L) * cut]
  }
  return { m, toA: `M ${m[0]} ${m[1]} L ${short(m, A, 30)[0]} ${short(m, A, 30)[1]}`, toB: `M ${m[0]} ${m[1]} L ${short(m, B, 30)[0]} ${short(m, B, 30)[1]}` }
}

// locations
const spot = { el: 'e2', i: 0.86 }
const linear = [{ el: 'e3', i0: 0, i1: 1 }, { el: 'e4', i0: 1, i1: 0 }] // Track 2: e3 forward, e4 against its orientation
const area = ['e2', 'e3', 'e4', 'e5']
</script>

<template>
  <div class="bu">
    <div class="cap">
      <span class="stepno">{{ s + 1 }}/{{ stages.length }}</span>
      <b>{{ stage.title }}</b> <span class="sub">{{ stage.sub }}</span>
    </div>
    <svg viewBox="0 20 1000 300" :style="{ height: `${height}px` }" class="cv">
      <defs>
        <marker id="bu-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" style="fill: var(--c-blue)" />
        </marker>
        <marker id="bu-ah-kg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" style="fill: var(--c-purple)" />
        </marker>
      </defs>

      <!-- network frame -->
      <rect x="8" y="26" width="984" height="288" rx="16" class="frame" />
      <text x="26" y="50" class="netlabel">rtm:Network · «Norwegian railway network»</text>

      <!-- area location -->
      <g v-if="showLocations" class="loc-in">
        <path v-for="id in area" :key="'a'+id" :d="pathD(pts(id))" class="area" />
      </g>

      <!-- net relations (topology graph) -->
      <g :class="['rels', { on: s >= 3 && mode === 'abstract' && !showLocations }]">
        <g v-for="r in relations" :key="r.id">
          <path :d="relGeom(r).d" class="rel" :class="{ none: r.nav === 'None' }" marker-end="url(#bu-ah)" />
          <text :x="relGeom(r).mid[0]" :y="relGeom(r).mid[1] - 4" class="navl">{{ r.nav }}</text>
        </g>
      </g>

      <!-- knowledge graph: relations become nodes -->
      <g :class="['kg', { on: mode === 'kg' }]">
        <g v-for="r in relations" :key="'k'+r.id">
          <path :d="kgGeom(r).toA" class="kge" marker-end="url(#bu-ah-kg)" />
          <path :d="kgGeom(r).toB" class="kge" marker-end="url(#bu-ah-kg)" />
          <rect :x="kgGeom(r).m[0] - 16" :y="kgGeom(r).m[1] - 10" width="32" height="20" rx="4" class="kgn" />
          <text :x="kgGeom(r).m[0]" :y="kgGeom(r).m[1] + 4" class="kgt">{{ r.id }}</text>
        </g>
        <text x="700" y="300" class="kglegend">▭ NetRelation node · → era:elementA / era:elementB triples</text>
      </g>

      <!-- net elements -->
      <g v-for="(el, idx) in elements" :key="el.id" class="elg" :class="{ show: s >= 1 && (!aggregated || isLineEl(el.id)), drift: mode === 'abstract' || mode === 'kg', agg: aggregated }"
        :style="{ animationDelay: `${-idx * 1.3}s` }">
        <path :d="pathD(pts(el.id))" class="ne" :class="{ abs: mode === 'abstract' || mode === 'kg' }" />
        <template v-if="s >= 2 && !aggregated">
          <path v-for="i in [0.3, 0.55, 0.8]" :key="i" :d="chevron(el.id, i)" class="chev" :class="{ dimmed: showLocations }" />
          <g :transform="`translate(${atI(el.id, 0).p[0]},${atI(el.id, 0).p[1]})`" class="org" :class="{ dimmed: showLocations }">
            <circle r="7" /><text dy="3.5">0</text>
          </g>
        </template>
        <text v-if="!aggregated" :x="atI(el.id, 0.5).p[0]" :y="atI(el.id, 0.5).p[1] - 14" class="nel">{{ el.id }}</text>
      </g>

      <!-- linear location -->
      <g v-if="showLocations" class="loc-in">
        <path v-for="l in linear" :key="'l'+l.el" :d="subD(l.el, l.i0, l.i1)" class="lin" />
      </g>

      <!-- spot location -->
      <g v-if="showLocations" class="loc-in">
        <g :transform="`translate(${atI(spot.el, spot.i).p[0]},${atI(spot.el, spot.i).p[1]})`">
          <line x1="0" y1="0" x2="0" y2="-22" class="mast" />
          <polygon points="0,-30 12,-24 0,-18" class="flag" />
          <circle r="5" class="spot" />
        </g>
      </g>

      <!-- meso: OP with a section of line on each side -->
      <g v-if="mode === 'meso'" class="loc-in">
        <text x="270" :y="AGG_Y - 16" class="soll">SoL · A – Stasjon</text>
        <text x="730" :y="AGG_Y - 16" class="soll">SoL · Stasjon – B</text>
        <circle :cx="OP[0]" :cy="OP[1]" r="22" class="opc" />
        <text :x="OP[0]" :y="OP[1] + 5" class="opt">OP</text>
        <text :x="OP[0]" :y="OP[1] + 46" class="opl">Operational Point «Stasjon» · station</text>
        <text :x="OP[0]" :y="OP[1] + 66" class="aggn">e2–e5 aggregated · e1, e6 become sections of line</text>
      </g>
      <!-- meso + macro: neighbouring OPs / line ends -->
      <g v-if="aggregated" class="loc-in">
        <circle cx="40" :cy="AGG_Y" r="9" class="opc small" /><text x="40" :y="AGG_Y + 30" class="opl">A</text>
        <circle cx="960" :cy="AGG_Y" r="9" class="opc small" /><text x="960" :y="AGG_Y + 30" class="opl">B</text>
      </g>
      <!-- macro: only the national railway line -->
      <g v-if="mode === 'macro'" class="loc-in">
        <path :d="`M 40 ${AGG_Y} L 960 ${AGG_Y}`" class="macro" />
        <text x="500" :y="AGG_Y - 22" class="macrol">National railway line</text>
        <text x="500" :y="AGG_Y + 46" class="aggn">the station is no longer a node: one line from A to B</text>
      </g>

      <!-- positioning-system badge -->
      <g v-if="mode === 'schematic' || mode === 'geo'" class="loc-in">
        <rect x="730" y="34" width="250" height="26" rx="6" class="badge" />
        <text x="855" y="52" class="badget">{{ mode === 'geo' ? 'positioning system: EPSG:25833' : 'positioning system: schematic x/y' }}</text>
      </g>
      <g v-if="aggregated" class="loc-in">
        <rect x="730" y="34" width="250" height="26" rx="6" class="badge" />
        <text x="855" y="52" class="badget">network level: {{ mode === 'meso' ? 'meso' : 'macro' }}</text>
      </g>
    </svg>

    <div class="legend" v-if="showLocations">
      <span><i class="k spotk"></i> <b>SpotLocation</b> signal on e2 @ intrinsic 0.86, applicationDirection reverse</span>
      <span><i class="k link"></i> <b>LinearLocation</b> Track 2 = e3 [0→1] + e4 [1→0]</span>
      <span><i class="k areak"></i> <b>AreaLocation</b> OP «Stasjon» = {e2, e3, e4, e5}</span>
    </div>
  </div>
</template>

<style scoped>
.bu { font-size: 13px; }
.cap { min-height: 40px; line-height: 1.35; }
.cap b { color: var(--c-heading); font-size: 16px; margin-right: 6px; }
.sub { color: var(--c-ink-mod); font-size: 14px; }
.stepno { display: inline-block; background: var(--c-blue); color: var(--c-bg); border-radius: 10px; padding: 0 8px; margin-right: 8px; font-size: 11px; font-weight: 700; }
.cv { width: 100%; display: block; }
.frame { fill: var(--c-surface); stroke: var(--c-stroke); stroke-width: 1.5; }
.netlabel { font-size: 15px; font-weight: 700; fill: var(--c-heading); }
.elg { opacity: 0; transition: opacity .6s; }
.elg.show { opacity: 1; }
.elg.drift { animation: drift 6s ease-in-out infinite; }
@keyframes drift { 0%,100% { transform: translate(0, 0) } 33% { transform: translate(4px, -5px) } 66% { transform: translate(-4px, 3px) } }
.ne { fill: none; stroke: var(--c-ink); stroke-width: 5; stroke-linecap: round; transition: d 1.2s ease-in-out, stroke-width .8s; }
.ne.abs { stroke-width: 18; stroke: var(--c-blue-bg); filter: drop-shadow(0 0 1.5px var(--c-blue)); }
.chev { fill: none; stroke: var(--c-blue); stroke-width: 2.4; transition: d 1.2s ease-in-out; }
.org circle { fill: var(--c-blue); }
.org text { fill: var(--c-bg); font-size: 9px; font-weight: 700; text-anchor: middle; }
.org { transition: transform 1.2s ease-in-out, opacity .6s; }
.chev, .org { transition: d 1.2s ease-in-out, transform 1.2s ease-in-out, opacity .6s; }
.dimmed { opacity: .22; }
.nel { font-size: 13px; text-anchor: middle; fill: var(--c-ink); font-weight: 700; font-family: ui-monospace, monospace; }
.rels, .kg { opacity: 0; transition: opacity .6s; pointer-events: none; }
.rels.on, .kg.on { opacity: 1; }
.rel { fill: none; stroke: var(--c-blue); stroke-width: 2; }
.rel.none { stroke-dasharray: 5 4; opacity: .65; }
.navl { font-size: 11px; text-anchor: middle; fill: var(--c-blue); font-weight: 600; }
.kge { stroke: var(--c-purple); stroke-width: 1.8; fill: none; }
.kgn { fill: var(--c-bg); stroke: var(--c-purple); stroke-width: 2; }
.kgt { font-size: 11px; text-anchor: middle; fill: var(--c-purple); font-weight: 700; font-family: ui-monospace, monospace; }
.kglegend { font-size: 12px; fill: var(--c-purple); text-anchor: middle; }
.area { fill: none; stroke: var(--c-amber); stroke-width: 26; stroke-linecap: round; opacity: .3; transition: d 1.2s ease-in-out; }
.lin { fill: none; stroke: var(--c-teal); stroke-width: 4; stroke-linecap: round; opacity: .95; transition: d 1.2s ease-in-out; }
.mast { stroke: var(--c-ink); stroke-width: 2; }
.flag { fill: var(--c-red); }
.spot { fill: var(--c-red); stroke: var(--c-bg); stroke-width: 2; }
.loc-in { animation: fadein .6s ease-out; }
@keyframes fadein { from { opacity: 0 } to { opacity: 1 } }
g[transform] { transition: transform 1.2s ease-in-out; }
.badge { fill: var(--c-bg); stroke: var(--c-blue); }
.badget { font-size: 12px; text-anchor: middle; fill: var(--c-blue); font-family: ui-monospace, monospace; }
.legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 13px; margin-top: 4px; color: var(--c-ink); }
.k { display: inline-block; width: 18px; height: 8px; border-radius: 4px; vertical-align: middle; }
.spotk { background: var(--c-red); width: 8px; } .link { background: var(--c-teal); } .areak { background: var(--c-amber); opacity: .6; }
.elg.agg .ne { stroke-width: 6; stroke: var(--c-blue); }
.soll { font-size: 14px; text-anchor: middle; fill: var(--c-blue); font-weight: 700; }
.opc { fill: var(--c-amber-bg); stroke: var(--c-amber); stroke-width: 3; }
.opc.small { stroke-width: 2.5; }
.opt { font-size: 14px; font-weight: 800; text-anchor: middle; fill: var(--c-amber-ink); }
.opl { font-size: 14px; font-weight: 700; text-anchor: middle; fill: var(--c-ink); }
.aggn { font-size: 12px; text-anchor: middle; fill: var(--c-ink-mod); }
.macro { stroke: var(--c-purple); stroke-width: 10; stroke-linecap: round; fill: none; }
.macrol { font-size: 16px; font-weight: 800; text-anchor: middle; fill: var(--c-purple); }
@media (prefers-reduced-motion: reduce) { .elg.drift { animation: none; } }
</style>
