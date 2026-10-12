<script setup lang="ts">
import { computed, reactive } from 'vue'

type Branch = { name: string; type: 'main' | 'siding'; radius: number } // radius 0 = straight
const common = reactive<Branch>({ name: 'Track 1', type: 'main', radius: 0 })
const x = reactive<Branch>({ name: 'Track 1', type: 'main', radius: 300 })
const y = reactive<Branch>({ name: 'Track 2', type: 'siding', radius: 0 })

const curv = (b: Branch) => (b.radius === 0 ? 0 : 1 / b.radius)
const result = computed(() => {
  if (x.name === common.name) return { cont: 'X', rule: 1, why: `X has the same name as the common branch (${common.name})` }
  if (y.name === common.name) return { cont: 'Y', rule: 1, why: `Y has the same name as the common branch (${common.name})` }
  if (x.type !== y.type) {
    const c = x.type === common.type ? 'X' : 'Y'
    return { cont: c, rule: 2, why: `${c} has the same type as the common branch (${common.type})` }
  }
  const c = Math.abs(curv(x) - curv(common)) <= Math.abs(curv(y) - curv(common)) ? 'X' : 'Y'
  return { cont: c, rule: 3, why: `${c} has the curvature closest to the common branch` }
})
function preset(n: number) {
  Object.assign(common, { name: 'Track 1', type: 'main', radius: 0 })
  if (n === 1) { Object.assign(x, { name: 'Track 1', type: 'main', radius: 300 }); Object.assign(y, { name: 'Track 2', type: 'siding', radius: 0 }) }
  if (n === 2) { Object.assign(x, { name: 'Track 5', type: 'main', radius: 300 }); Object.assign(y, { name: 'Track 2', type: 'siding', radius: 0 }) }
  if (n === 3) { Object.assign(x, { name: 'Track 5', type: 'siding', radius: 300 }); Object.assign(y, { name: 'Track 2', type: 'siding', radius: 0 }) }
}
const radii = [0, 300, 500, 1000]
const names = ['Track 1', 'Track 2', 'Track 5']
// survey view: X goes up, Y goes down, each with its own real curvature
function surveyPath(b: Branch, up: boolean) {
  const s = up ? -1 : 1
  const bend = b.radius === 0 ? 4 : 14000 / b.radius
  return `M 150 90 Q 230 ${90 + s * bend * 0.3} 320 ${90 + s * bend}`
}
</script>

<template>
  <div class="tr">
    <div class="cols">
      <div>
        <div class="h">As surveyed</div>
        <svg viewBox="0 0 340 180">
          <path d="M 10 90 L 150 90" class="c" />
          <path :d="surveyPath(x, true)" class="b" :class="result.cont === 'X' ? 'cont' : 'dev'" />
          <path :d="surveyPath(y, false)" class="b" :class="result.cont === 'Y' ? 'cont' : 'dev'" />
          <circle cx="150" cy="90" r="6" class="sw" />
          <text x="20" y="80" class="t">common · {{ common.name }} · {{ common.type }}</text>
          <text x="210" y="20" class="t">X</text><text x="210" y="172" class="t">Y</text>
        </svg>
      </div>
      <div>
        <div class="h">Generated schematic</div>
        <svg viewBox="0 0 340 180">
          <path d="M 10 90 L 150 90" class="c" />
          <path d="M 150 90 L 330 90" class="b cont" />
          <path :d="result.cont === 'X' ? 'M 150 90 L 200 140 L 330 140' : 'M 150 90 L 200 40 L 330 40'" class="b dev" />
          <circle cx="150" cy="90" r="6" class="sw" />
          <text x="240" y="82" class="t">{{ result.cont }} continues</text>
          <text x="240" :y="result.cont === 'X' ? 132 : 32" class="t">{{ result.cont === 'X' ? 'Y' : 'X' }} deviates</text>
        </svg>
      </div>
      <div class="form">
        <div class="h">Branch data</div>
        <table>
          <thead><tr><th></th><th>name</th><th>type</th><th>radius</th></tr></thead><tbody>
          <tr v-for="[lbl, b] in ([['X', x], ['Y', y]] as const)" :key="lbl">
            <td><b>{{ lbl }}</b></td>
            <td><select v-model="b.name"><option v-for="n in names" :key="n">{{ n }}</option></select></td>
            <td><select v-model="b.type"><option>main</option><option>siding</option></select></td>
            <td><select v-model.number="b.radius"><option v-for="r in radii" :key="r" :value="r">{{ r === 0 ? 'straight' : 'R ' + r }}</option></select></td>
          </tr>
        </tbody></table>
        <div class="presets"><button v-for="n in [1,2,3]" :key="n" @click="preset(n)">Rule {{ n }} case</button></div>
      </div>
    </div>
    <div class="verdict"><span class="rule">Rule {{ result.rule }}</span> {{ result.why }}.</div>
  </div>
</template>

<style scoped>
.tr { font-size: 13px; }
.cols { display: grid; grid-template-columns: 1fr 1fr 1.1fr; gap: 12px; align-items: start; }
.h { font-weight: 700; font-size: 12px; color: var(--c-ink-mod); }
svg { width: 100%; height: 170px; }
.c { stroke: var(--c-ink-mod); stroke-width: 6; fill: none; stroke-linecap: round; }
.b { stroke-width: 6; fill: none; stroke-linecap: round; transition: d .6s, stroke .4s; }
.cont { stroke: var(--c-green); } .dev { stroke: var(--c-orange); }
.sw { fill: var(--c-bg); stroke: var(--c-ink); stroke-width: 2.5; }
.t { font-size: 12px; fill: var(--c-ink-mod); }
table { border-collapse: collapse; width: 100%; }
td, th { padding: 2px 4px; font-size: 12px; text-align: left; }
select { border: 1px solid var(--c-stroke); border-radius: 4px; font-size: 12px; padding: 1px 2px; background: var(--c-bg); color: var(--c-ink); }
.presets { display: flex; gap: 6px; margin-top: 8px; }
.presets button { border: 1px solid var(--c-stroke); border-radius: 6px; padding: 2px 8px; font-size: 12px; background: var(--c-bg); color: var(--c-ink); }
.verdict { margin-top: 6px; padding: 6px 10px; background: var(--c-green-bg); border-radius: 6px; color: var(--c-green-ink); }
.rule { background: var(--c-green); color: var(--c-bg); border-radius: 4px; padding: 1px 6px; margin-right: 6px; font-weight: 700; }
</style>
