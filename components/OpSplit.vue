<script setup lang="ts">
import { computed } from 'vue'
import { type Pt, pathD } from '../lib/net'

/**
 * One stasjon (the area bounded by entrance and exit signals, formerly one OP) split into three primary locations
 * by intra-station borders (NetPointReferences) that cut its NetAreaReference.
 * Step 4 shows the meso view: SoLs left and right, PL/OP1 in the middle, link SoLs to PL/OP2 and PL/OP3.
 */
const props = withDefaults(defineProps<{ step?: number }>(), { step: 0 })
const s = computed(() => Math.max(0, Math.min(4, props.step)))

type Area = 'sol' | 'op1' | 'op2' | 'op3'
const tracks: { id: string; area: Area; pts: Pt[] }[] = [
  { id: 'lw', area: 'sol', pts: [[20, 170], [200, 170]] },
  { id: 'le', area: 'sol', pts: [[800, 170], [980, 170]] },
  { id: 'm', area: 'op1', pts: [[200, 170], [800, 170]] },
  { id: 'p2', area: 'op1', pts: [[250, 170], [300, 128], [620, 128], [670, 170]] },
  { id: 'y0', area: 'op2', pts: [[620, 128], [660, 95]] },
  { id: 'y1', area: 'op2', pts: [[660, 95], [690, 70], [790, 70]] },
  { id: 'y2', area: 'op2', pts: [[660, 95], [790, 95]] },
  { id: 'y3', area: 'op2', pts: [[690, 70], [715, 45], [790, 45]] },
  { id: 'f0', area: 'op3', pts: [[340, 170], [380, 210]] },
  { id: 'f1', area: 'op3', pts: [[380, 210], [410, 240], [620, 240]] },
  { id: 'f2', area: 'op3', pts: [[380, 210], [620, 210]] },
  { id: 'f3', area: 'op3', pts: [[410, 240], [440, 270], [620, 270]] },
]
const borders: { p: Pt; label: string }[] = [
  { p: [640, 111.5], label: 'border op1 | op2' },
  { p: [360, 190], label: 'border op1 | op3' },
]
const signals: { p: Pt; dir: 1 | -1; kind: 'entry' | 'exit' }[] = [
  { p: [200, 170], dir: 1, kind: 'entry' }, { p: [800, 170], dir: -1, kind: 'entry' },
  { p: [310, 170], dir: -1, kind: 'exit' }, { p: [700, 170], dir: 1, kind: 'exit' },
]
function areaColour(a: Area) {
  if (a === 'sol') return 'transparent'
  if (s.value < 3) return 'var(--c-amber)'
  return a === 'op1' ? 'var(--c-amber)' : a === 'op2' ? 'var(--c-purple)' : 'var(--c-teal)'
}
const meso = computed(() => s.value >= 4)
</script>

<template>
  <div class="ops">
    <div class="cap">
      <template v-if="s === 0">In Bane NOR a <b>stasjon</b> is a technical term: the network area bounded by its <b>entrance and exit signals</b>. It used to be <b>one OP</b>.</template>
      <template v-else-if="s === 1">But the train planning system routes trains to <b>three primary locations</b>.</template>
      <template v-else-if="s === 2"><b>Intra-station borders</b> are placed on the topology as <code>NetPointReference</code>s.</template>
      <template v-else-if="s === 3">They cut the stasjon <code>NetAreaReference</code> into <b>three parts</b>, no geometry drawn by hand.</template>
      <template v-else><b>Meso view:</b> SoLs left and right connect to PL/OP1. SoLs with <code>solNature</code> <b>link</b> lead to PL/OP2 and PL/OP3.</template>
    </div>
    <svg viewBox="0 10 1000 300" class="cv">
      <defs>
        <marker id="ops-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" style="fill: var(--c-ink-mod)" />
        </marker>
      </defs>
      <g :class="['micro', { faded: meso }]">
        <!-- OP boundary as interlocking area -->
        <rect x="200" y="28" width="600" height="262" rx="18" class="opbox" :class="{ gone: s >= 3 }" />
        <text x="215" y="48" class="oplabel" :class="{ gone: s >= 3 }">stasjon «Stasjon» · entrance to exit signals</text>

        <!-- area shading -->
        <path v-for="t in tracks" :key="'a' + t.id" :d="pathD(t.pts)" class="area" :style="{ stroke: areaColour(t.area) }" />
        <!-- platforms -->
        <rect x="330" y="141" width="260" height="16" rx="3" class="platform" />
        <!-- tracks -->
        <path v-for="t in tracks" :key="t.id" :d="pathD(t.pts)" class="trk" />

        <!-- signals -->
        <g v-for="(g, i) in signals" :key="i" :transform="`translate(${g.p[0]},${g.p[1]})`">
          <line x1="0" y1="0" x2="0" y2="-22" class="mast" />
          <polygon :points="g.dir > 0 ? '0,-28 13,-22 0,-16' : '0,-28 -13,-22 0,-16'" :class="g.kind" />
          <text v-if="g.kind === 'entry'" :x="g.dir > 0 ? -6 : 6" y="-30" :class="['sigt', g.dir > 0 ? 'r' : 'l']">entrance signal</text>
        </g>

        <!-- primary location labels -->
        <g v-if="s >= 1" class="fade">
          <text x="460" y="115" class="pl k-op1">Passenger area · op1</text>
          <text x="885" y="64" class="pl k-op2">Maintenance yard</text><text x="885" y="82" class="pl k-op2">op2</text>
          <text x="715" y="236" class="pl k-op3">Freight terminal</text><text x="715" y="254" class="pl k-op3">op3</text>
        </g>
        <!-- borders -->
        <g v-if="s >= 2" class="fade">
          <g v-for="b in borders" :key="b.label" :transform="`translate(${b.p[0]},${b.p[1]})`">
            <circle r="10" class="border-halo" /><circle r="6" class="border" />
          </g>
          <text x="900" y="275" class="npr">● NetPointReference</text>
          <text x="900" y="291" class="npr sub">intra-station border</text>
        </g>
      </g>

      <!-- meso -->
      <g v-if="meso" class="fade meso">
        <line x1="20" y1="170" x2="464" y2="170" class="sol" />
        <line x1="980" y1="170" x2="538" y2="170" class="sol" />
        <text x="120" y="160" class="solt">SoL</text><text x="880" y="160" class="solt">SoL</text>
        <path d="M 525 145 Q 620 70 712 70" class="link" marker-end="url(#ops-ah)" />
        <path d="M 485 196 Q 470 240 474 252" class="link" marker-end="url(#ops-ah)" />
        <text x="640" y="88" class="lnk">SoL · solNature link</text>
        <text x="380" y="232" class="lnk">SoL · solNature link</text>
        <g transform="translate(500,170)"><circle r="36" class="pln k-op1" /><text dy="5" class="plt">PL/OP1</text></g>
        <g transform="translate(745,70)"><circle r="32" class="pln k-op2" /><text dy="5" class="plt">PL/OP2</text></g>
        <g transform="translate(500,280)"><circle r="28" class="pln k-op3" /><text dy="5" class="plt">PL/OP3</text></g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.ops { font-size: 13px; }
.cap { min-height: 30px; font-size: 15px; color: var(--c-ink); }
.cap code { font-size: 13px; }
.cv { width: 100%; height: 360px; display: block; }
.micro { transition: opacity .8s; }
.micro.faded { opacity: .16; }
.opbox { fill: var(--c-amber-bg); stroke: var(--c-amber); stroke-width: 2; stroke-dasharray: 8 6; transition: opacity .8s; }
.oplabel { font-size: 14px; font-weight: 700; fill: var(--c-amber-ink); transition: opacity .8s; }
.gone { opacity: 0; }
.area { fill: none; stroke-width: 20; stroke-linecap: round; stroke-linejoin: round; opacity: .38; transition: stroke .8s; }
.trk { fill: none; stroke: var(--c-ink); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
.platform { fill: var(--c-ink-subtle); opacity: .6; }
.mast { stroke: var(--c-ink); stroke-width: 1.6; }
.entry { fill: var(--c-red); } .exit { fill: var(--c-ink-mod); }
.sigt { font-size: 11px; fill: var(--c-red-ink); font-weight: 600; }
.sigt.r { text-anchor: end; } .sigt.l { text-anchor: start; }
.pl { font-size: 14px; font-weight: 700; text-anchor: middle; }
.pl.k-op1 { fill: var(--c-amber-ink); } .pl.k-op2 { fill: var(--c-purple); } .pl.k-op3 { fill: var(--c-teal); }
.border { fill: var(--c-red); } .border-halo { fill: var(--c-bg); stroke: var(--c-red); stroke-width: 2; }
.npr { font-size: 12px; fill: var(--c-red); font-weight: 700; text-anchor: middle; }
.npr.sub { font-weight: 400; fill: var(--c-ink-mod); }
.fade { animation: fadein .7s ease-out; }
@keyframes fadein { from { opacity: 0 } to { opacity: 1 } }
.sol { stroke: var(--c-ink); stroke-width: 5; }
.solt { font-size: 14px; font-weight: 700; fill: var(--c-ink); text-anchor: middle; }
.link { fill: none; stroke: var(--c-ink-mod); stroke-width: 3; stroke-dasharray: 7 5; }
.lnk { font-size: 12px; fill: var(--c-ink-mod); font-style: italic; text-anchor: middle; }
.pln { stroke-width: 3; }
.pln.k-op1 { fill: var(--c-bg); stroke: var(--c-amber); }
.pln.k-op2 { fill: var(--c-bg); stroke: var(--c-purple); }
.pln.k-op3 { fill: var(--c-bg); stroke: var(--c-teal); }
.plt { font-size: 13px; font-weight: 800; text-anchor: middle; fill: var(--c-ink); }
</style>
