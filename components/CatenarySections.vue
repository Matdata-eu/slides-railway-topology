<script setup lang="ts">
import { computed, reactive } from 'vue'
import { type Pt, pathD } from '../lib/net'
import { elements2, elById2, nodes2, points2, at2, nodePos2 } from '../lib/net2'
import { type SectEl, sectioning, sections, sides, energised, describe, feeders } from '../lib/catenary'

/**
 * Catenary sectioning: sectioning elements placed on the topology cut it into catenary sections.
 * Sections + sectioning elements (bridgeable by disconnectors) + feeders = a catenary topology.
 * Track, OP, SoL and km of every section are inferred from the shared topology.
 */
const props = withDefaults(defineProps<{ step?: number }>(), { step: 3 })
const s = computed(() => Math.max(0, Math.min(3, props.step)))
const open = reactive(new Set<string>())
const live = computed(() => energised(open))
const toggle = (id: string) => { if (s.value >= 1) open.has(id) ? open.delete(id) : open.add(id) }

function sub(el: string, t0: number, t1: number) {
  const out: Pt[] = []
  for (let k = 0; k <= 16; k++) out.push(at2(elById2[el], 'schematic', t0 + (t1 - t0) * (k / 16)).p)
  return pathD(out)
}
function symbol(se: SectEl) {
  const { p, dir } = at2(elById2[se.el], 'schematic', se.t)
  const n: Pt = [-dir[1], dir[0]]
  const ang = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI
  return { p, n, ang }
}
const colourOf = (id: string) => sections.find(c => c.id === id)!.colour
const secById = Object.fromEntries(sections.map(c => [c.id, c]))

// catenary topology graph layout
const gpos: Record<string, Pt> = { C1: [70, 40], C3: [265, 40], C6: [460, 40], C2: [70, 125], C4: [265, 125], C7: [460, 125], C5: [265, 200] }
const SS: Pt = [395, 82]
function edge(se: SectEl, idx: number) {
  const [a, b] = sides(se)
  const A = gpos[a.id], B = gpos[b.id]
  const twin = sectioning.filter(x => { const [p, q] = sides(x); return (p.id === a.id && q.id === b.id) || (p.id === b.id && q.id === a.id) })
  const k = twin.indexOf(se)
  const off = twin.length > 1 ? (k === 0 ? -16 : 16) : 0
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy)
  const nx = -dy / L * off, ny = dx / L * off
  return { x1: A[0] + nx, y1: A[1] + ny, x2: B[0] + nx, y2: B[1] + ny, mx: (A[0] + B[0]) / 2 + nx, my: (A[1] + B[1]) / 2 + ny, idx }
}
const labelPos: Record<string, Pt> = { C1: [95, 96], C3: [420, 96], C6: [905, 96], C2: [100, 214], C4: [500, 213], C7: [895, 214], C5: [500, 286] }
const stationFeeders = feeders.filter(f => f.label.startsWith('Substation'))
</script>

<template>
  <div class="cat">
    <div class="cap">
      <template v-if="s === 0">The track topology, as the rest of the organisation already uses it.</template>
      <template v-else-if="s === 1">The catenary department places its <b>sectioning elements</b> on it: <span class="io">overlaps</span> and <span class="si">section insulators</span>.</template>
      <template v-else-if="s === 2">Cutting the topology at those points gives the <b>catenary sections</b>, the smallest parts that can be switched off.</template>
      <template v-else>Sections, sectioning elements and feeders form a <b>catenary topology</b>. Click a sectioning element to open its disconnector.</template>
    </div>
    <svg viewBox="20 52 960 240" class="trk-svg">
      <!-- section bands -->
      <g v-if="s >= 2" class="fade">
        <template v-for="c in sections" :key="c.id">
          <path v-for="p in c.pieces" :key="p.id" :d="sub(p.el, p.t0, p.t1)" class="band"
            :class="{ dead: s >= 3 && !live.has(c.id) }" :style="{ stroke: c.colour }" />
        </template>
        <text v-for="c in sections" :key="'l'+c.id" class="seclabel" :style="{ fill: c.colour }"
          :x="labelPos[c.id][0]" :y="labelPos[c.id][1]">{{ c.id }} · {{ c.name }}</text>
      </g>
      <!-- track topology -->
      <path v-for="el in elements2" :key="el.id" :d="pathD(points2(el, 'schematic'))" class="trk" />
      <g v-for="n in Object.values(nodes2)" :key="n.id" :transform="`translate(${nodePos2(n.id, 'schematic')[0]},${nodePos2(n.id, 'schematic')[1]})`">
        <circle :r="n.kind === 'switch' ? 5 : 4" :class="n.kind === 'switch' ? 'swn' : 'endn'" />
      </g>
      <!-- feeders -->
      <g v-if="s >= 3" class="fade">
        <rect x="540" y="56" width="140" height="24" rx="5" class="ss" />
        <text x="610" y="73" class="sst">⚡ Substation</text>
        <path d="M 580 80 L 580 110" class="feed" :class="{ off: open.has('Q1') }" />
        <path d="M 640 80 L 640 190" class="feed" :class="{ off: open.has('Q2') }" />
      </g>
      <!-- sectioning elements -->
      <g v-if="s >= 1" class="fade">
        <g v-for="se in sectioning" :key="se.id" class="se" :class="{ open: open.has(se.id) }" @click="toggle(se.id)"
          :transform="`translate(${symbol(se).p[0]},${symbol(se).p[1]}) rotate(${symbol(se).ang})`">
          <rect x="-14" y="-16" width="28" height="32" class="hit" />
          <template v-if="se.kind === 'insulator'">
            <rect x="-4" y="-11" width="8" height="22" rx="2" class="ins" />
          </template>
          <template v-else>
            <line x1="-14" y1="-7" x2="5" y2="-7" class="ovl" /><line x1="-5" y1="7" x2="14" y2="7" class="ovl" />
            <line x1="-14" y1="-7" x2="-14" y2="0" class="ovl" /><line x1="14" y1="7" x2="14" y2="0" class="ovl" />
          </template>
          <text :transform="`rotate(${-symbol(se).ang})`" y="-17" class="sel">{{ se.id }}</text>
        </g>
      </g>
    </svg>

    <div v-if="s >= 3" class="below fade">
      <svg viewBox="0 10 530 215" class="graph">
        <!-- feeders -->
        <line v-for="f in stationFeeders" :key="f.id" :x1="SS[0]" :y1="SS[1]" :x2="gpos[f.section][0]" :y2="gpos[f.section][1]" class="gfeed" :class="{ off: open.has(f.id) }" />
        <!-- sectioning edges -->
        <g v-for="(se, i) in sectioning" :key="se.id" @click="toggle(se.id)" class="gedge" :class="{ open: open.has(se.id) }">
          <line :x1="edge(se, i).x1" :y1="edge(se, i).y1" :x2="edge(se, i).x2" :y2="edge(se, i).y2" />
          <rect :x="edge(se, i).mx - 15" :y="edge(se, i).my - 9" width="30" height="18" rx="4" />
          <text :x="edge(se, i).mx" :y="edge(se, i).my + 4">{{ se.id }}</text>
        </g>
        <g v-for="(p, id) in gpos" :key="id" :transform="`translate(${p[0]},${p[1]})`" class="gnode" :class="{ dead: !live.has(id) }">
          <rect x="-46" y="-15" width="92" height="30" rx="8" :style="{ stroke: colourOf(id), fill: live.has(id) ? colourOf(id) : 'var(--c-surface)' }" />
          <text y="5">{{ id }} · {{ secById[id].name.replace('Station ', 'St. ').replace('Siding ', '') }}</text>
        </g>
        <g :transform="`translate(${SS[0]},${SS[1]})`"><rect x="-38" y="-12" width="76" height="24" rx="5" class="ss" /><text y="5" class="sst">⚡ SS</text></g>
      </svg>
      <div>
        <div class="th">Inferred from the topology, nothing typed</div>
        <table>
          <thead><tr><th>Section</th><th>tracks</th><th>OP</th><th>SoL</th><th>km</th></tr></thead>
          <tbody>
            <tr v-for="c in sections" :key="c.id" :class="{ deadrow: !live.has(c.id) }">
              <td><i class="dot" :style="{ background: c.colour }"></i>{{ c.id }}</td>
              <td>{{ describe(c).tracks }}</td><td>{{ describe(c).op }}</td><td>{{ describe(c).sol }}</td><td class="mono">{{ describe(c).km }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat { font-size: 13px; }
.cap { min-height: 24px; font-size: 14.5px; }
.io { color: var(--c-ink); font-weight: 700; } .si { color: var(--c-red); font-weight: 700; }
.trk-svg { width: 100%; height: 200px; display: block; }
.trk { fill: none; stroke: var(--c-ink); stroke-width: 3.5; stroke-linecap: round; }
.swn { fill: var(--c-bg); stroke: var(--c-ink); stroke-width: 2; } .endn { fill: var(--c-ink); }
.band { fill: none; stroke-width: 16; stroke-linecap: butt; opacity: .45; transition: opacity .4s; }
.band.dead { opacity: .12; stroke-dasharray: 6 5; }
.seclabel { font-size: 12.5px; font-weight: 700; text-anchor: middle; }
.se { cursor: pointer; }
.se .hit { fill: transparent; }
.ins { fill: var(--c-red); stroke: var(--c-bg); stroke-width: 1.5; }
.ovl { stroke: var(--c-ink); stroke-width: 2.6; }
.se.open .ins { fill: var(--c-bg); stroke: var(--c-red); stroke-width: 2.5; }
.se.open .ovl { stroke: var(--c-red); stroke-dasharray: 3 2; }
.sel { font-size: 11.5px; text-anchor: middle; font-weight: 700; fill: var(--c-ink-mod); }
.se.open .sel { fill: var(--c-red); }
.ss { fill: var(--c-amber-bg); stroke: var(--c-amber); stroke-width: 2; }
.sst { font-size: 12.5px; font-weight: 700; text-anchor: middle; fill: var(--c-amber-ink); }
.feed { stroke: var(--c-amber); stroke-width: 2.5; stroke-dasharray: 5 3; }
.feed.off { stroke: var(--c-red); opacity: .4; }
.fade { animation: fadein .6s ease-out; }
@keyframes fadein { from { opacity: 0 } to { opacity: 1 } }
.below { display: grid; grid-template-columns: 42% 1fr; gap: 12px; align-items: start; margin-top: 4px; }
.graph { width: 100%; height: 178px; }
.gnode rect { stroke-width: 2.5; transition: fill .4s; }
.gnode text { font-size: 12px; font-weight: 700; text-anchor: middle; fill: var(--c-bg); }
.gnode.dead text { fill: var(--c-ink-mod); }
.gedge { cursor: pointer; }
.gedge line { stroke: var(--c-ink); stroke-width: 2.5; }
.gedge rect { fill: var(--c-bg); stroke: var(--c-ink-mod); }
.gedge text { font-size: 10.5px; text-anchor: middle; font-weight: 700; fill: var(--c-ink); }
.gedge.open line { stroke: var(--c-red); stroke-dasharray: 5 4; }
.gedge.open rect { stroke: var(--c-red); }
.gedge.open text { fill: var(--c-red); }
.gfeed { stroke: var(--c-amber); stroke-width: 2.5; stroke-dasharray: 5 3; }
.gfeed.off { stroke: var(--c-red); opacity: .3; }
.th { font-weight: 700; font-size: 12px; color: var(--c-ink-mod); margin-bottom: 2px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 2px 5px; font-size: 11.5px; border-bottom: 1px solid var(--c-stroke); text-align: left; }
th { font-size: 10.5px; color: var(--c-ink-mod); }
.deadrow { opacity: .45; }
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; }
.mono { font-family: ui-monospace, monospace; }
</style>
