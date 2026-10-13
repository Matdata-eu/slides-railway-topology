<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  type Pt, type View, type ElementDef,
  elements, elementById, nodes, points, pathD, at, nodePos, kmSign, route, connectedToMatrix,
} from '../lib/net'

const props = withDefaults(defineProps<{
  mode?: 'layers' | 'navigability' | 'flip' | 'infer' | 'connected' | 'hook'
  view?: View
  height?: number
  /** hook mode: how many answers are revealed */
  step?: number
}>(), { mode: 'layers', view: 'schematic', height: 300, step: 0 })

const view = ref<View>(props.view)
const reversed = reactive<Record<string, boolean>>(Object.fromEntries(elements.map(e => [e.id, e.reversed])))

// ---------- signals (canonical t, facing +1 = towards canonical `to`) ----------
interface Sig { id: string; el: string; t: number; facing: 1 | -1 }
const signals: Sig[] = [
  { id: 'S11', el: 'e1', t: 0.7, facing: 1 },
  { id: 'S12', el: 'e2', t: 0.86, facing: 1 },
  { id: 'S13', el: 'e4', t: 0.3, facing: -1 },
  { id: 'S14', el: 'e5', t: 0.3, facing: -1 },
  { id: 'S15', el: 'e6', t: 0.3, facing: -1 },
]
const selectedSig = ref<string>(props.mode === 'hook' ? 'S12' : 'S12')

function sigGeom(s: Sig) {
  const el = elementById[s.el]
  const { p, dir } = at(el, view.value, s.t)
  const f = s.facing
  const fd: Pt = [dir[0] * f, dir[1] * f]
  // signals stand on the right-hand side of the direction they face
  const nrm: Pt = [-fd[1], fd[0]]
  const base: Pt = [p[0] + nrm[0] * 16, p[1] + nrm[1] * 16]
  const tip: Pt = [base[0] + fd[0] * 13, base[1] + fd[1] * 13]
  const back1: Pt = [base[0] - nrm[0] * 6, base[1] - nrm[1] * 6]
  const back2: Pt = [base[0] + nrm[0] * 6, base[1] + nrm[1] * 6]
  return { p, base, tri: [tip, back1, back2] as Pt[], label: [base[0] + nrm[0] * 14, base[1] + nrm[1] * 14] as Pt, fd }
}
function orientX(s: Sig) {
  const { dir } = at(elementById[s.el], view.value, s.t)
  return dir[0] * (reversed[s.el] ? -1 : 1)
}
const applies = (s: Sig) => (s.facing * (reversed[s.el] ? -1 : 1) > 0 ? 'normal' : 'reverse')
const kmDir = (s: Sig) => (s.facing * kmSign(elementById[s.el]) > 0 ? 'normal' : 'opposite')
function offsetFromOrigin(s: Sig) {
  const len = elementLength(elementById[s.el])
  const t = reversed[s.el] ? 1 - s.t : s.t
  return Math.round(t * len)
}
function elementLength(el: ElementDef) {
  // nominal length in metres, proportional to the schematic drawing
  const pts = points(el, 'schematic')
  let l = 0
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return Math.round(l * 2.4)
}

// ---------- orientation chevrons ----------
function chevrons(el: ElementDef) {
  return [0.3, 0.55, 0.8].map((t) => {
    const { p, dir } = at(el, view.value, t)
    const s = reversed[el.id] ? -1 : 1
    const d: Pt = [dir[0] * s, dir[1] * s]
    const n: Pt = [-d[1], d[0]]
    const a: Pt = [p[0] - d[0] * 6 + n[0] * 6, p[1] - d[1] * 6 + n[1] * 6]
    const b: Pt = [p[0] + d[0] * 4, p[1] + d[1] * 4]
    const c: Pt = [p[0] - d[0] * 6 - n[0] * 6, p[1] - d[1] * 6 - n[1] * 6]
    return `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]}`
  })
}
function originMark(el: ElementDef) {
  const t = reversed[el.id] ? 0.97 : 0.03
  const { p, dir } = at(el, view.value, t)
  const n: Pt = [-dir[1], dir[0]]
  return [p[0] + n[0] * -13, p[1] + n[1] * -13] as Pt
}
function flip(id: string) {
  if (props.mode === 'flip') reversed[id] = !reversed[id]
}

// ---------- sub paths ----------
function subPath(el: ElementDef, t0: number, t1: number) {
  const pts = points(el, view.value)
  const out: Pt[] = []
  const n = 12
  for (let k = 0; k <= n; k++) out.push(at(el, view.value, t0 + (t1 - t0) * (k / n)).p)
  return pts.length ? pathD(out) : ''
}

// ---------- navigability / routing ----------
const routeFrom = ref('e5')
const routeTo = ref('e6')
const naive = ref(false)
const pickStage = ref<0 | 1>(0)
const currentRoute = computed(() => route(routeFrom.value, routeTo.value, naive.value ? 'connectedTo' : 'topology'))
function pickElement(id: string) {
  if (props.mode === 'flip') return flip(id)
  if (props.mode !== 'navigability') return
  if (pickStage.value === 0) { routeFrom.value = id; pickStage.value = 1 }
  else { routeTo.value = id; pickStage.value = 0 }
}
const routeD = computed(() => {
  const r = currentRoute.value
  if (!r) return ''
  const e0 = elementById[r[0]]
  let cur: string
  if (r.length === 1) cur = e0.from
  else {
    const e1 = elementById[r[1]]
    const shared = [e0.from, e0.to].find(n => n === e1.from || n === e1.to)!
    cur = shared === e0.from ? e0.to : e0.from
  }
  const pts: Pt[] = []
  for (const id of r) {
    const el = elementById[id]
    const p = points(el, view.value)
    if (el.from === cur) { pts.push(...p); cur = el.to } else { pts.push(...[...p].reverse()); cur = el.from }
  }
  return pathD(pts)
})
const uTurnNode = computed(() => {
  // where the naive route breaks navigability
  const r = currentRoute.value
  if (!naive.value || !r) return null
  const topo = route(routeFrom.value, routeTo.value, 'topology')
  if (topo && topo.join() === r.join()) return null
  for (let i = 0; i < r.length - 1; i++) {
    const a = elementById[r[i]], b = elementById[r[i + 1]]
    const shared = [a.from, a.to].find(n => n === b.from || n === b.to)!
    const sub = route(r[i], r[i + 1], 'topology')
    if (!sub || sub.length > 2) return shared
  }
  return null
})

// ---------- inference ----------
const opWest = ref(0.5)
const OP_EAST = 0.6
const lineEls = new Set(['e1', 'e2', 'e6'])
function inOP(s: Sig) {
  if (s.el === 'e1') return s.t >= opWest.value
  if (s.el === 'e6') return s.t <= OP_EAST
  return true
}
function inSoL(s: Sig) {
  if (s.el === 'e1' && s.t < opWest.value) return 'SoL A – Stasjon'
  if (s.el === 'e6' && s.t > OP_EAST) return 'SoL Stasjon – B'
  return '—'
}
const inferred = computed(() => signals.map(s => ({
  s,
  track: elementById[s.el].track,
  op: inOP(s) ? 'Stasjon' : '—',
  sol: inSoL(s),
  line: lineEls.has(s.el) ? '2100' : '—',
  dirLine: lineEls.has(s.el) ? kmDir(s) : '—',
})))
const inferredCount = computed(() => inferred.value.reduce((n, r) => n + 1 + (r.op !== '—' ? 1 : 0) + (r.sol !== '—' ? 1 : 0) + (r.line !== '—' ? 2 : 0), 0))

// ---------- connectedTo matrix ----------
const disabledNodes = reactive(new Set<string>())
const matrix = computed(() => connectedToMatrix(disabledNodes))
function toggleNode(id: string) {
  if (props.mode !== 'connected' || nodes[id].kind !== 'switch') return
  disabledNodes.has(id) ? disabledNodes.delete(id) : disabledNodes.add(id)
}
const shortTrack = (t: string) => t.replace('Line track ', 'Line ').replace('Track ', 'T')

// ---------- styling helpers ----------
const trackColour: Record<string, string> = {
  'Line track W': 'var(--c-ink-mod)', 'Track 1': 'var(--c-blue)', 'Track 2': 'var(--c-teal)', 'Track 3': 'var(--c-purple)', 'Line track E': 'var(--c-ink-mod)',
}
const showChevrons = computed(() => props.mode === 'flip')
const showSignals = computed(() => ['flip', 'infer', 'hook', 'layers'].includes(props.mode))
const nodeList = computed(() => Object.values(nodes).map(n => ({ ...n, p: nodePos(n.id, view.value) })))
const views: { id: View; label: string }[] = [
  { id: 'geo', label: 'Geographic' }, { id: 'schematic', label: 'Schematic' },
  { id: 'graph', label: 'Topology graph' }, { id: 'meso', label: 'Meso (station = node)' },
  { id: 'macro', label: 'Macro (line only)' },
]
const aggregated = computed(() => view.value === 'meso' || view.value === 'macro')
const sideWidth = computed(() => (['flip', 'infer', 'connected'].includes(props.mode) ? '36%' : '0'))
const sel = computed(() => signals.find(s => s.id === selectedSig.value)!)
</script>

<template>
  <div class="topo-pg" :style="{ '--side': sideWidth }">
    <div class="topo-main">
      <svg :viewBox="`0 20 1000 300`" :style="{ height: `${height}px` }" class="topo-svg">
        <!-- OP / SoL bands (inference) -->
        <g v-if="mode === 'infer'">
          <path :d="subPath(elementById.e1, opWest, 1)" class="band op" />
          <path v-for="id in ['e2','e3','e4','e5']" :key="'op'+id" :d="subPath(elementById[id], 0, 1)" class="band op" />
          <path :d="subPath(elementById.e6, 0, OP_EAST)" class="band op" />
          <path :d="subPath(elementById.e1, 0, opWest)" class="band sol" />
          <path :d="subPath(elementById.e6, OP_EAST, 1)" class="band sol" />
          <text :x="at(elementById.e2, view, 0.5).p[0]" y="300" class="band-label op-t">OP «Stasjon»</text>
          <text :x="at(elementById.e1, view, opWest/2).p[0]" y="300" class="band-label sol-t">SoL A – Stasjon</text>
          <text :x="at(elementById.e6, view, 0.8).p[0]" y="300" class="band-label sol-t">SoL Stasjon – B</text>
        </g>

        <!-- elements -->
        <g v-for="el in elements" :key="el.id" class="el" @click="pickElement(el.id)">
          <path :d="pathD(points(el, view))" class="hit" />
          <path :d="pathD(points(el, view))" class="track"
            :style="{ stroke: mode === 'infer' || mode === 'connected' ? trackColour[el.track] : undefined }"
            :class="{ dim: mode === 'navigability' && currentRoute && !currentRoute.includes(el.id), sel: mode==='navigability' && (el.id===routeFrom || el.id===routeTo) }" />
          <text v-if="['graph','flip','navigability','connected'].includes(mode) || view === 'graph'"
            :x="at(el, view, 0.5).p[0]" :y="at(el, view, 0.5).p[1] - 10" class="el-label">{{ el.id }}</text>
          <template v-if="showChevrons">
            <path v-for="(d,i) in chevrons(el)" :key="i" :d="d" class="chev" />
            <g :transform="`translate(${originMark(el)[0]},${originMark(el)[1]})`">
              <circle r="7" class="origin" /><text class="origin-t" dy="3">0</text>
            </g>
          </template>
        </g>

        <!-- route -->
        <path v-if="mode === 'navigability' && routeD" :d="routeD" class="route" :class="{ bad: !!uTurnNode }" />

        <!-- nodes -->
        <g v-for="n in nodeList" :key="n.id" :transform="`translate(${n.p[0]},${n.p[1]})`"
          @click="toggleNode(n.id)" :class="{ clickable: mode === 'connected' && n.kind === 'switch' }">
          <circle v-if="n.kind === 'switch' && !aggregated" r="7" class="node"
            :class="{ off: disabledNodes.has(n.id), uturn: uTurnNode === n.id }" />
          <circle v-else-if="n.kind === 'end'" r="5" class="node end" />
          <rect v-else-if="n.kind === 'buffer' && !aggregated" x="-2" y="-9" width="5" height="18" class="buffer" />
          <text v-if="n.kind === 'switch' && !aggregated && view !== 'geo'" class="node-label" dy="-13">{{ n.label }}</text>
          <text v-if="uTurnNode === n.id" class="uturn-t" dy="34">✗ not navigable</text>
        </g>
        <g v-if="view === 'meso'" transform="translate(500,200)">
          <circle r="26" class="op-node" /><text class="op-node-t" dy="5">OP</text>
        </g>
        <g v-if="view === 'meso'">
          <text x="270" y="190" class="sol-meso">SoL</text><text x="730" y="190" class="sol-meso">SoL</text>
        </g>
        <g v-if="view === 'macro'">
          <path d="M 60 200 L 940 200" class="macro-line" />
          <text x="500" y="182" class="sol-meso">National railway line</text>
          <text x="500" y="232" class="macro-sub">the station is no longer a node</text>
        </g>

        <!-- signals -->
        <g v-if="showSignals && !aggregated">
          <g v-for="s in signals" :key="s.id" class="sig" @click="selectedSig = s.id"
            :class="{ active: s.id === selectedSig && (mode === 'flip' || mode === 'hook'), faded: mode==='hook' && s.id !== selectedSig }">
            <line :x1="sigGeom(s).p[0]" :y1="sigGeom(s).p[1]" :x2="sigGeom(s).base[0]" :y2="sigGeom(s).base[1]" class="mast" />
            <polygon :points="sigGeom(s).tri.map(p => p.join(',')).join(' ')" class="sig-head" />
            <text :x="sigGeom(s).label[0]" :y="sigGeom(s).label[1] + 4" class="sig-label">{{ s.id }}</text>
          </g>
        </g>

        <!-- flip: three direction arrows on the selected signal -->
        <g v-if="mode === 'flip' && !aggregated">
          <g :transform="`translate(${sigGeom(sel).p[0]},${sigGeom(sel).p[1] - 46})`">
            <!-- element orientation (blue) -->
            <line x1="-30" y1="0" x2="30" y2="0" class="arr blue"
              :transform="orientX(sel) < 0 ? 'scale(-1,1)' : ''" marker-end="url(#ah-blue)" />
            <!-- km direction (orange) -->
            <line x1="-30" y1="-14" x2="30" y2="-14" class="arr orange" marker-end="url(#ah-orange)" />
            <!-- facing / running direction (green) -->
            <line x1="-30" y1="-28" x2="30" y2="-28" class="arr green"
              :transform="sigGeom(sel).fd[0] < 0 ? 'scale(-1,1)' : ''" marker-end="url(#ah-green)" />
          </g>
        </g>
        <defs>
          <marker v-for="c in ['blue','orange','green']" :id="`ah-${c}`" :key="c" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" :class="`fill-${c}`" />
          </marker>
        </defs>
      </svg>

      <!-- controls -->
      <div class="ctrl" v-if="mode === 'layers'">
        <button v-for="v in views" :key="v.id" :class="{ on: view === v.id }" @click="view = v.id">{{ v.label }}</button>
      </div>
      <div class="ctrl" v-if="mode === 'navigability'">
        <span>Route <b>{{ routeFrom }}</b> → <b>{{ routeTo }}</b> <small>(click two elements)</small></span>
        <button :class="{ on: !naive }" @click="naive = false">Topology + navigability</button>
        <button :class="{ on: naive, warn: naive }" @click="naive = true">mechanical connection only</button>
        <span class="verdict" :class="{ ok: currentRoute && !uTurnNode, ko: !currentRoute || uTurnNode }">
          {{ !currentRoute ? 'No route without reversing' : uTurnNode ? 'Route found… through a switch the wrong way' : 'Route: ' + currentRoute.join(' → ') }}
        </span>
      </div>
      <div class="ctrl" v-if="mode === 'flip'">
        <span><small>Click an element to flip its orientation · click a signal to select it</small></span>
        <button @click="view = view === 'geo' ? 'schematic' : 'geo'">{{ view === 'geo' ? 'Schematic' : 'Geographic' }}</button>
      </div>
      <div class="ctrl" v-if="mode === 'infer'">
        <span>Traffic team moves the OP boundary:</span>
        <input type="range" min="0.15" max="0.95" step="0.01" v-model.number="opWest" />
        <span class="mono">e1 @ {{ Math.round(opWest * elementLength(elementById.e1)) }} m</span>
      </div>
      <div class="ctrl" v-if="mode === 'connected'">
        <span><small>Click a switch to take it out of the topology · the matrix is regenerated</small></span>
      </div>
    </div>

    <!-- side panels -->
    <div class="side" v-if="mode === 'flip'">
      <div class="legend">
        <div><span class="sw green"></span> Running direction (where the signal faces)</div>
        <div><span class="sw blue"></span> Element orientation (origin 0 → end)</div>
        <div><span class="sw orange"></span> Kilometre direction of the line</div>
      </div>
      <table>
        <thead><tr><th>Signal</th><th>on</th><th>offset</th><th>era:appliesToDirection</th><th>RINF signalOrientation</th></tr></thead>
        <tbody>
          <tr v-for="s in signals" :key="s.id" :class="{ active: s.id === selectedSig }" @click="selectedSig = s.id">
            <td>{{ s.id }}</td><td>{{ s.el }}</td><td class="mono">{{ offsetFromOrigin(s) }} m</td>
            <td><span class="pill" :class="applies(s)">{{ applies(s) }}</span></td>
            <td><span class="pill km">{{ kmDir(s) }}</span></td>
          </tr>
        </tbody>
      </table>
      <p class="note">Flip an element: the signal does not move and still faces the same way, yet its
        <b>appliesToDirection</b> flips. Direction only means something relative to the element it sits on.</p>
    </div>

    <div class="side" v-if="mode === 'infer'">
      <div class="teams">
        <span class="team sigt">Signalling team · 5 signal positions</span>
        <span class="team traf">Traffic team · 1 OP, 2 SoL</span>
        <span class="team trk">Track team · 5 tracks</span>
      </div>
      <table>
        <thead><tr><th>Signal</th><th>onTrack</th><th>inOP</th><th>onSoL</th><th>onLine</th><th>dir. vs line</th></tr></thead>
        <tbody>
          <tr v-for="r in inferred" :key="r.s.id">
            <td>{{ r.s.id }}</td><td>{{ shortTrack(r.track) }}</td>
            <td :key="r.op" class="flash">{{ r.op }}</td>
            <td :key="r.sol" class="flash">{{ r.sol.replace('SoL ', '') }}</td>
            <td>{{ r.line }}</td><td>{{ r.dirLine }}</td>
          </tr>
        </tbody>
      </table>
      <div class="counter"><b>{{ inferredCount }}</b> relationships inferred · <b>0</b> typed by hand</div>
    </div>

    <div class="side" v-if="mode === 'connected'">
      <div class="mtitle">era:connectedTo, generated from the topology</div>
      <table class="matrix">
        <thead><tr><th></th><th v-for="t in matrix.tracks" :key="t">{{ shortTrack(t) }}</th></tr></thead>
        <tbody>
          <tr v-for="a in matrix.tracks" :key="a">
            <th>{{ shortTrack(a) }}</th>
            <td v-for="b in matrix.tracks" :key="b" :class="{ yes: matrix.has(a, b), diag: a === b }">{{ a === b ? '' : matrix.has(a, b) ? '●' : '' }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">5 tracks → 20 cells to keep right by hand. Oslo S has ~50 station tracks.
        From the topology it is a query; the reverse is impossible.</p>
    </div>
  </div>
</template>

<style scoped>
.topo-pg { display: grid; grid-template-columns: 1fr var(--side); gap: 14px; align-items: start; font-size: 13px; }
.topo-pg:has(.side) { grid-template-columns: 1fr 36%; }
.topo-svg { width: 100%; display: block; }
.track { fill: none; stroke: var(--c-ink); stroke-width: 4; stroke-linecap: round; transition: d 1.1s ease-in-out, stroke .4s, opacity .4s; }
.track.dim { opacity: .25; }
.track.sel { stroke: var(--c-blue); }
.hit { fill: none; stroke: transparent; stroke-width: 18; cursor: pointer; transition: d 1.1s ease-in-out; }
.el-label { font-size: 12px; fill: var(--c-ink-mod); text-anchor: middle; font-family: ui-monospace, monospace; pointer-events: none; }
.node { fill: var(--c-bg); stroke: var(--c-ink); stroke-width: 2.5; transition: all .4s; }
.node.end { fill: var(--c-ink); }
.node.off { fill: var(--c-red-bg); stroke: var(--c-red); }
.node.uturn { fill: var(--c-red); stroke: var(--c-red); }
.clickable { cursor: pointer; }
.buffer { fill: var(--c-ink); }
.node-label { font-size: 11px; text-anchor: middle; fill: var(--c-ink-mod); font-weight: 600; }
.uturn-t { font-size: 12px; text-anchor: middle; fill: var(--c-red); font-weight: 700; }
.op-node { fill: var(--c-amber-bg); stroke: var(--c-amber-ink); stroke-width: 2.5; }
.macro-line { stroke: var(--c-purple); stroke-width: 8; stroke-linecap: round; fill: none; }
.macro-sub { font-size: 12px; text-anchor: middle; fill: var(--c-ink-mod); }
.sol-meso { font-size: 15px; text-anchor: middle; fill: var(--c-purple); font-weight: 700; }
.op-node-t { font-size: 12px; text-anchor: middle; fill: var(--c-amber-ink); font-weight: 700; }
.chev { fill: none; stroke: var(--c-blue); stroke-width: 2.2; }
.origin { fill: var(--c-blue); }
.origin-t { fill: var(--c-bg); font-size: 9px; text-anchor: middle; font-weight: 700; }
.route { fill: none; stroke: var(--c-green); stroke-width: 9; stroke-opacity: .55; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 14 10; animation: march 1s linear infinite; }
.route.bad { stroke: var(--c-red); }
@keyframes march { to { stroke-dashoffset: -24; } }
.mast { stroke: var(--c-ink); stroke-width: 1.6; }
.sig-head { fill: var(--c-red); stroke: var(--c-red-ink); stroke-width: 1; }
.sig { cursor: pointer; transition: opacity .3s; }
.sig.active .sig-head { fill: var(--c-amber); stroke: var(--c-amber-ink); }
.sig.faded { opacity: .2; }
.sig-label { font-size: 11px; text-anchor: middle; fill: var(--c-red-ink); font-weight: 700; }
.band { fill: none; stroke-width: 22; stroke-linecap: butt; opacity: .35; }
.band.op { stroke: var(--c-amber); }
.band.sol { stroke: var(--c-purple); stroke-width: 14; }
.band-label { font-size: 12px; text-anchor: middle; font-weight: 700; }
.op-t { fill: var(--c-amber-ink); } .sol-t { fill: var(--c-purple); }
.arr { stroke-width: 3; }
.arr.blue { stroke: var(--c-blue); } .arr.orange { stroke: var(--c-orange); } .arr.green { stroke: var(--c-green); }
.fill-blue { fill: var(--c-blue); } .fill-orange { fill: var(--c-orange); } .fill-green { fill: var(--c-green); }
.ctrl { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 6px; }
.ctrl button { border: 1px solid var(--c-stroke); border-radius: 6px; padding: 3px 10px; background: var(--c-bg); color: var(--c-ink-mod); font-size: 12px; }
.ctrl button.on { background: var(--c-blue); color: var(--c-bg); border-color: var(--c-blue); }
.ctrl button.on.warn { background: var(--c-red); border-color: var(--c-red); }
.verdict { font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.verdict.ok { color: var(--c-green); background: var(--c-green-bg); } .verdict.ko { color: var(--c-red); background: var(--c-red-bg); }
.mono { font-family: ui-monospace, monospace; }
.side { font-size: 12px; }
.side table { width: 100%; border-collapse: collapse; }
.side th, .side td { padding: 3px 5px; border-bottom: 1px solid var(--c-stroke); text-align: left; }
.side th { font-size: 10.5px; color: var(--c-ink-mod); }
.side tr.active { background: var(--c-amber-bg); }
.side tr { cursor: pointer; }
.pill { padding: 1px 7px; border-radius: 9px; font-weight: 700; font-size: 11px; }
.pill.normal { background: var(--c-blue-bg); color: var(--c-blue-strong); } .pill.reverse { background: var(--c-red-bg); color: var(--c-red); }
.pill.km { background: var(--c-orange-bg); color: var(--c-orange); }
.legend div { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.sw { display: inline-block; width: 22px; height: 4px; border-radius: 2px; }
.sw.green { background: var(--c-green); } .sw.blue { background: var(--c-blue); } .sw.orange { background: var(--c-orange); }
.note { font-size: 11.5px; color: var(--c-ink-mod); margin-top: 8px !important; line-height: 1.35; }
.teams { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.team { padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11.5px; }
.sigt { background: var(--c-red-bg); color: var(--c-red-ink); } .traf { background: var(--c-amber-bg); color: var(--c-amber-ink); } .trk { background: var(--c-blue-bg); color: var(--c-blue-strong); }
.flash { animation: flash .9s ease-out; }
@keyframes flash { from { background: var(--c-amber-bg); } to { background: transparent; } }
.counter { margin-top: 8px; padding: 6px 8px; background: var(--c-green-bg); color: var(--c-green-ink); border-radius: 6px; }
.mtitle { font-weight: 700; margin-bottom: 4px; }
.matrix td { text-align: center; width: 34px; height: 26px; border: 1px solid var(--c-stroke); transition: background .3s; }
.matrix td.yes { background: var(--c-green-bg); color: var(--c-green); font-size: 15px; }
.matrix td.diag { background: var(--c-surface); }
.matrix th { text-align: center; }
</style>
