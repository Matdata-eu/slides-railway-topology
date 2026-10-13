<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { type Pt, pathD } from '../lib/net'
import { type View2, type El2, elements2, elById2, nodes2, trackById2, points2, at2, nodePos2 } from '../lib/net2'

/**
 * Direction on a double-track station.
 * appliesToDirection is relative to the linear element's orientation (origin 0 → end).
 * signalOrientation is relative to the track's main running direction (undefined on sidings).
 * Flipping an element changes the first, never the second.
 */
const view = ref<View2>('schematic')
const reversed = reactive<Record<string, boolean>>(Object.fromEntries(elements2.map(e => [e.id, e.reversed])))

interface Sig { id: string; el: string; t: number; facing: 1 | -1 } // facing +1 = towards canonical `to` (east)
const signals: Sig[] = [
  { id: 'N1', el: 'a1', t: 0.55, facing: 1 },
  { id: 'N2', el: 'a5', t: 0.88, facing: 1 },
  { id: 'S1', el: 'a11', t: 0.55, facing: -1 },
  { id: 'S2', el: 'a6', t: 0.12, facing: -1 },
  { id: 'S3', el: 'a6', t: 0.88, facing: 1 },
  { id: 'S4', el: 'a7', t: 0.12, facing: -1 },
]
const selected = ref('S3')
const sel = computed(() => signals.find(s => s.id === selected.value)!)

const trackOf = (s: Sig) => trackById2[elById2[s.el].track]
const applies = (s: Sig) => (s.facing * (reversed[s.el] ? -1 : 1) > 0 ? 'normal' : 'opposite')
function orientation(s: Sig) {
  const main = trackOf(s).main
  if (main === 'undefined') return 'undefined'
  const withKm = s.facing > 0 // canonical geometry runs west → east, with the km
  return (main === 'normal') === withKm ? 'normal' : 'opposite'
}

function sigGeom(s: Sig) {
  const { p, dir } = at2(elById2[s.el], view.value, s.t)
  const fd: Pt = [dir[0] * s.facing, dir[1] * s.facing]
  const n: Pt = [-fd[1], fd[0]]
  const base: Pt = [p[0] + n[0] * 16, p[1] + n[1] * 16]
  const tip: Pt = [base[0] + fd[0] * 14, base[1] + fd[1] * 14]
  return {
    p, base, fd,
    tri: [tip, [base[0] - n[0] * 7, base[1] - n[1] * 7], [base[0] + n[0] * 7, base[1] + n[1] * 7]] as Pt[],
    label: [base[0] + n[0] * 22, base[1] + n[1] * 22 + 7] as Pt,
  }
}
function chevrons(el: El2) {
  return [0.3, 0.55, 0.8].map((t) => {
    const { p, dir } = at2(el, view.value, t)
    const k = reversed[el.id] ? -1 : 1
    const d: Pt = [dir[0] * k, dir[1] * k], n: Pt = [-d[1], d[0]]
    return `M ${p[0] - d[0] * 6 + n[0] * 6} ${p[1] - d[1] * 6 + n[1] * 6} L ${p[0] + d[0] * 4} ${p[1] + d[1] * 4} L ${p[0] - d[0] * 6 - n[0] * 6} ${p[1] - d[1] * 6 - n[1] * 6}`
  })
}
function originMark(el: El2): Pt {
  const { p, dir } = at2(el, view.value, reversed[el.id] ? 0.96 : 0.04)
  return [p[0] + dir[1] * 13, p[1] - dir[0] * 13]
}
const flip = (id: string) => { reversed[id] = !reversed[id] }
const mainOf = computed(() => trackOf(sel.value).main)
const orientX = computed(() => at2(elById2[sel.value.el], view.value, sel.value.t).dir[0] * (reversed[sel.value.el] ? -1 : 1))
</script>

<template>
  <div class="dp">
    <div class="main">
      <svg viewBox="20 62 960 250" class="cv">
        <defs>
          <marker v-for="c in ['blue','orange','green','gray']" :id="`dp-${c}`" :key="c" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" :class="`f-${c}`" /></marker>
        </defs>
        <!-- main running direction labels -->
        <text x="40" y="90" class="md n">Line N · main direction → (with km)</text>
        <text x="40" y="232" class="md s">Line S · main direction ← (against km)</text>
        <text x="500" y="305" class="md u">Track 3 · siding, track direction undefined</text>

        <g v-for="el in elements2" :key="el.id" class="el" @click="flip(el.id)">
          <path :d="pathD(points2(el, view))" class="hit" />
          <path :d="pathD(points2(el, view))" class="trk" :class="trackById2[el.track].main" />
          <path v-for="(d, i) in chevrons(el)" :key="i" :d="d" class="chev" />
          <g :transform="`translate(${originMark(el)[0]},${originMark(el)[1]})`"><circle r="7" class="org" /><text dy="3" class="org-t">0</text></g>
        </g>
        <g v-for="n in Object.values(nodes2)" :key="n.id" :transform="`translate(${nodePos2(n.id, view)[0]},${nodePos2(n.id, view)[1]})`">
          <circle :r="n.kind === 'switch' ? 6 : 4" :class="n.kind === 'switch' ? 'swn' : 'endn'" />
        </g>

        <g v-for="s in signals" :key="s.id" class="sig" :class="{ active: s.id === selected }" @click.stop="selected = s.id">
          <line :x1="sigGeom(s).p[0]" :y1="sigGeom(s).p[1]" :x2="sigGeom(s).base[0]" :y2="sigGeom(s).base[1]" class="mast" />
          <polygon :points="sigGeom(s).tri.map(p => p.join(',')).join(' ')" class="head" />
          <text :x="sigGeom(s).label[0]" :y="sigGeom(s).label[1]" class="sl">{{ s.id }}</text>
        </g>

        <!-- three arrows above the selected signal -->
        <g :transform="`translate(${Math.min(900, Math.max(80, sigGeom(sel).p[0]))},${sigGeom(sel).p[1] < 150 ? sigGeom(sel).p[1] + 70 : sigGeom(sel).p[1] - 44})`" class="arrows">
          <line x1="-30" y1="-28" x2="30" y2="-28" class="a green" marker-end="url(#dp-green)" :transform="sigGeom(sel).fd[0] < 0 ? 'scale(-1,1)' : ''" />
          <line x1="-30" y1="-14" x2="30" y2="-14" class="a orange" v-if="mainOf !== 'undefined'" marker-end="url(#dp-orange)" :transform="mainOf === 'opposite' ? 'scale(-1,1)' : ''" />
          <line x1="-30" y1="-14" x2="30" y2="-14" class="a gray" v-else marker-end="url(#dp-gray)" marker-start="url(#dp-gray)" />
          <line x1="-30" y1="0" x2="30" y2="0" class="a blue" marker-end="url(#dp-blue)" :transform="orientX < 0 ? 'scale(-1,1)' : ''" />
        </g>
      </svg>
      <div class="ctrl">
        <small>Click a track element to flip its orientation · click a signal to select it</small>
        <button @click="view = view === 'geo' ? 'schematic' : 'geo'">{{ view === 'geo' ? 'Schematic' : 'Geographic' }}</button>
      </div>
    </div>
    <div class="below">
      <div class="legend">
        <div><span class="sw green"></span> Signal faces</div>
        <div><span class="sw orange"></span> Main running direction of the track</div>
        <div><span class="sw blue"></span> Linear element orientation (0 → end)</div>
      </div>
      <table>
        <tbody>
          <tr><th>Signal</th><td v-for="s in signals" :key="s.id" :class="{ active: s.id === selected }" @click="selected = s.id"><b>{{ s.id }}</b> <span class="mono muted">on {{ s.el }}</span></td></tr>
          <tr><th>appliesToDirection</th><td v-for="s in signals" :key="s.id" :class="{ active: s.id === selected }"><span class="pill" :class="applies(s)">{{ applies(s) }}</span></td></tr>
          <tr><th>signalOrientation</th><td v-for="s in signals" :key="s.id" :class="{ active: s.id === selected }"><span class="pill km" :class="orientation(s)">{{ orientation(s) }}</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.dp { font-size: 13px; }
.cv { width: 100%; height: 255px; display: block; }
.trk { fill: none; stroke: var(--c-ink); stroke-width: 4; stroke-linecap: round; transition: d 1.1s ease-in-out; }
.trk.undefined { stroke: var(--c-ink-mod); stroke-dasharray: 1 0; }
.hit { fill: none; stroke: transparent; stroke-width: 18; cursor: pointer; transition: d 1.1s ease-in-out; }
.chev { fill: none; stroke: var(--c-blue); stroke-width: 2; opacity: .7; }
.org { fill: var(--c-blue); } .org-t { fill: var(--c-bg); font-size: 9px; text-anchor: middle; font-weight: 700; }
.swn { fill: var(--c-bg); stroke: var(--c-ink); stroke-width: 2.2; } .endn { fill: var(--c-ink); }
.sig { cursor: pointer; }
.mast { stroke: var(--c-ink); stroke-width: 1.8; }
.head { fill: var(--c-red); }
.sig.active .head { fill: var(--c-amber); stroke: var(--c-amber-ink); }
.sl { font-size: 21px; font-weight: 800; text-anchor: middle; fill: var(--c-red-ink); }
.sig.active .sl { fill: var(--c-amber-ink); }
.md { font-size: 15px; font-weight: 600; }
.md.n, .md.s { fill: var(--c-orange); } .md.u { fill: var(--c-ink-mod); text-anchor: middle; }
.a { stroke-width: 3.2; }
.a.blue { stroke: var(--c-blue); } .a.orange { stroke: var(--c-orange); } .a.green { stroke: var(--c-green); } .a.gray { stroke: var(--c-ink-subtle); stroke-dasharray: 4 3; }
.f-blue { fill: var(--c-blue); } .f-orange { fill: var(--c-orange); } .f-green { fill: var(--c-green); } .f-gray { fill: var(--c-ink-subtle); }
.arrows { transition: transform .6s; }
.ctrl { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.ctrl small { color: var(--c-ink-mod); }
.ctrl button { border: 1px solid var(--c-stroke); border-radius: 6px; padding: 3px 10px; background: var(--c-bg); color: var(--c-ink-mod); font-size: 12px; }
.legend div { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; font-size: 12px; }
.sw { display: inline-block; width: 22px; height: 4px; border-radius: 2px; }
.sw.green { background: var(--c-green); } .sw.blue { background: var(--c-blue); } .sw.orange { background: var(--c-orange); }
table { width: 100%; border-collapse: collapse; margin-top: 6px; }
th, td { padding: 4px 5px; border-bottom: 1px solid var(--c-stroke); text-align: left; font-size: 12px; }
th { font-size: 11px; color: var(--c-ink-mod); }
tr { cursor: pointer; } tr.active { background: var(--c-amber-bg); }
.mono { font-family: ui-monospace, monospace; }
.pill { padding: 1px 7px; border-radius: 9px; font-weight: 700; font-size: 11px; }
.pill.normal { background: var(--c-blue-bg); color: var(--c-blue-strong); }
.pill.opposite { background: var(--c-red-bg); color: var(--c-red); }
.pill.km.normal { background: var(--c-orange-bg); color: var(--c-orange); }
.pill.km.opposite { background: var(--c-red-bg); color: var(--c-red); }
.pill.undefined { background: var(--c-surface); color: var(--c-ink-mod); }
.note { font-size: 11.5px; color: var(--c-ink-mod); margin-top: 8px !important; line-height: 1.4; }
</style>
<style scoped>
.below { display: grid; grid-template-columns: 250px 1fr; gap: 14px; align-items: start; margin-top: 2px; }
.below th { white-space: nowrap; text-align: right; }
.below td { text-align: center; }
.below td.active { background: var(--c-amber-bg); }
.muted { color: var(--c-ink-mod); font-size: 11px; }
</style>
