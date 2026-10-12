<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { pathD } from '../lib/net'
import { elements2, nodes2, tracks2, trackById2, points2, at2, nodePos2, reachable, elById2 } from '../lib/net2'

/**
 * era:connectedTo on a double-track station: the line tracks are linked directly to the station
 * tracks, leaving out the switches and the short tracks in between. Filling it in by hand means
 * tracing every route; with a topology it is a query.
 */
const view = ref<'micro' | 'connected'>('micro')
const locked = reactive(new Set<string>())
const lineTracks = tracks2.filter(t => t.kind === 'line').map(t => t.id)
const stationTracks = tracks2.filter(t => t.kind === 'station').map(t => t.id)
const reach = computed(() => Object.fromEntries(lineTracks.map(l => [l, reachable(l, locked)])))
const hover = ref<{ l: string; s: string } | null>(null)
const hoverPath = computed(() => (hover.value ? reach.value[hover.value.l][hover.value.s] ?? [] : []))
const pairs = computed(() => lineTracks.flatMap(l => Object.keys(reach.value[l]).map(s => ({ l, s }))))

function toggle(id: string) {
  if (nodes2[id].kind !== 'switch') return
  locked.has(id) ? locked.delete(id) : locked.add(id)
}
const isLinkish = (id: string) => elById2[id].kind === 'link'
// connectedTo view: line track inner end → station track end on the same side
function lineEnd(l: string) {
  const el = elements2.find(e => e.track === l && e.kind === 'line')!
  const p = points2(el, 'schematic')
  return l.startsWith('W') ? p[p.length - 1] : p[0]
}
function stationEnd(s: string, west: boolean) {
  const el = elements2.find(e => e.track === s)!
  return at2(el, 'schematic', west ? 0.3 : 0.7).p
}
function ctPath(l: string, s: string) {
  const a = lineEnd(l), b = stationEnd(s, l.startsWith('W'))
  const mx = (a[0] + b[0]) / 2
  return `M ${a[0]} ${a[1]} C ${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`
}
const short = (id: string) => trackById2[id].label.replace('Line ', '').replace('Track ', 'T').replace(' (west)', ' west').replace(' (east)', ' east')
</script>

<template>
  <div class="ct">
    <div class="main">
      <svg viewBox="0 80 1000 210" class="cv">
        <!-- micro topology -->
        <g v-for="el in elements2" :key="el.id" class="el"
          :class="{ ghost: view === 'connected' && isLinkish(el.id), lit: hoverPath.includes(el.id) }">
          <path :d="pathD(points2(el, 'schematic'))" class="trk" :class="el.kind" />
        </g>
        <g v-for="n in Object.values(nodes2)" :key="n.id" :transform="`translate(${nodePos2(n.id, 'schematic')[0]},${nodePos2(n.id, 'schematic')[1]})`"
          :class="{ ghost: view === 'connected' && n.kind === 'switch' }">
          <g v-if="n.kind === 'switch'" class="sw" @click="toggle(n.id)">
            <circle r="9" :class="{ locked: locked.has(n.id) }" />
            <text dy="-14">{{ n.label }}</text>
          </g>
          <circle v-else r="5" class="end" />
        </g>
        <!-- track labels -->
        <text x="110" y="100" class="tl">Line N</text><text x="85" y="208" class="tl">Line S</text>
        <text x="880" y="100" class="tl">Line N</text><text x="905" y="208" class="tl">Line S</text>
        <text x="500" y="100" class="tl st">Track 1</text><text x="500" y="182" class="tl st">Track 2</text><text x="500" y="257" class="tl st">Track 3</text>

        <!-- connectedTo shortcut edges -->
        <g v-if="view === 'connected'" class="fade">
          <path v-for="p in pairs" :key="p.l + p.s" :d="ctPath(p.l, p.s)" class="cte"
            :class="{ hl: hover && hover.l === p.l && hover.s === p.s }" />
        </g>
      </svg>
      <div class="ctrl">
        <button :class="{ on: view === 'micro' }" @click="view = 'micro'">Micro topology</button>
        <button :class="{ on: view === 'connected' }" @click="view = 'connected'">era:connectedTo</button>
        <small>Click a switch to lock it in its straight position · hover a cell to trace the route</small>
      </div>
    </div>
    <div class="side">
      <div class="mt">Which station track can a train reach?</div>
      <table class="matrix">
        <thead><tr><th></th><th v-for="s in stationTracks" :key="s">{{ short(s) }}</th></tr></thead>
        <tbody>
          <tr v-for="l in lineTracks" :key="l">
            <th>{{ short(l) }}</th>
            <td v-for="s in stationTracks" :key="s" :class="{ yes: reach[l][s] }"
              @mouseenter="hover = { l, s }" @mouseleave="hover = null">{{ reach[l][s] ? '●' : '' }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">By hand, every cell means tracing switches and short tracks. Oslo S has about
        <b>50 station tracks</b>. With the topology supplied, connectedTo is a query, so it no longer needs to be delivered.</p>
    </div>
  </div>
</template>

<style scoped>
.ct { display: grid; grid-template-columns: 1fr 30%; gap: 14px; font-size: 13px; align-items: start; }
.cv { width: 100%; height: 260px; display: block; }
.trk { fill: none; stroke: var(--c-ink); stroke-width: 4.5; stroke-linecap: round; transition: stroke .3s, opacity .5s; }
.trk.station { stroke: var(--c-blue); }
.trk.link { stroke: var(--c-ink-mod); stroke-width: 3; }
.lit .trk { stroke: var(--c-green); stroke-width: 7; }
.ghost { opacity: .12; transition: opacity .6s; }
.el, g { transition: opacity .6s; }
.sw { cursor: pointer; }
.sw circle { fill: var(--c-bg); stroke: var(--c-ink); stroke-width: 2.5; }
.sw circle.locked { fill: var(--c-red-bg); stroke: var(--c-red); }
.sw text { font-size: 12px; text-anchor: middle; fill: var(--c-ink-mod); font-weight: 600; }
.end { fill: var(--c-ink); }
.tl { font-size: 13px; text-anchor: middle; fill: var(--c-ink-mod); font-weight: 600; }
.tl.st { fill: var(--c-blue); }
.cte { fill: none; stroke: var(--c-green); stroke-width: 4; stroke-dasharray: 8 5; opacity: .9; }
.cte.hl { stroke-width: 5; opacity: 1; }
.fade { animation: fadein .6s ease-out; }
@keyframes fadein { from { opacity: 0 } to { opacity: 1 } }
.ctrl { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
.ctrl button { border: 1px solid var(--c-stroke); border-radius: 6px; padding: 3px 10px; background: var(--c-bg); color: var(--c-ink-mod); font-size: 12px; }
.ctrl button.on { background: var(--c-blue); color: var(--c-bg); border-color: var(--c-blue); }
.ctrl small { color: var(--c-ink-mod); }
.mt { font-weight: 700; margin-bottom: 4px; }
.matrix { border-collapse: collapse; }
.matrix th { font-size: 12px; padding: 3px 6px; text-align: center; color: var(--c-ink-mod); }
.matrix tbody th { text-align: right; }
.matrix td { width: 40px; height: 28px; text-align: center; border: 1px solid var(--c-stroke); cursor: default; transition: background .3s; }
.matrix td.yes { background: var(--c-green-bg); color: var(--c-green); font-size: 15px; cursor: pointer; }
.note { font-size: 12px; color: var(--c-ink-mod); margin-top: 8px !important; line-height: 1.4; }
</style>
