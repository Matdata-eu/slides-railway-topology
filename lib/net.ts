// Toy railway network used by every playground mode.
// One small station: a line from A (west) to B (east), a passing loop (track 2)
// and a dead-end siding (track 3).
//
// Every linear element has a *canonical* geometry (from -> to). Its topological
// orientation (origin -> end) is canonical unless `reversed` is true.

export type Pt = [number, number]
export type View = 'geo' | 'schematic' | 'graph' | 'meso' | 'macro'

export interface NodeDef { id: string; kind: 'end' | 'switch' | 'buffer'; label: string }
export interface ElementDef {
  id: string
  from: string
  to: string
  schematic: Pt[] // canonical polyline, schematic view
  graph: Pt[] // straight node-to-node, graph view
  meso: Pt[] // station collapsed
  track: string
  reversed: boolean // initial orientation: origin at `to` instead of `from`
}

export const N_SAMPLES = 32

export const nodes: Record<string, NodeDef> = {
  A: { id: 'A', kind: 'end', label: 'A' },
  S1: { id: 'S1', kind: 'switch', label: 'W1' },
  S3: { id: 'S3', kind: 'switch', label: 'W3' },
  S2: { id: 'S2', kind: 'switch', label: 'W2' },
  E: { id: 'E', kind: 'buffer', label: '⊣' },
  B: { id: 'B', kind: 'end', label: 'B' },
}

const ST: Pt = [500, 200] // station centre in meso view

export const elements: ElementDef[] = [
  { id: 'e1', from: 'A', to: 'S1', track: 'Line track W', reversed: false,
    schematic: [[30, 270], [250, 270]], graph: [[60, 230], [290, 230]], meso: [[60, 200], ST] },
  { id: 'e2', from: 'S1', to: 'S2', track: 'Track 1', reversed: false,
    schematic: [[250, 270], [750, 270]], graph: [[290, 230], [710, 230]], meso: [ST, ST] },
  { id: 'e3', from: 'S1', to: 'S3', track: 'Track 2', reversed: false,
    schematic: [[250, 270], [330, 170], [420, 170]], graph: [[290, 230], [450, 110]], meso: [ST, ST] },
  { id: 'e4', from: 'S3', to: 'S2', track: 'Track 2', reversed: true,
    schematic: [[420, 170], [670, 170], [750, 270]], graph: [[450, 110], [710, 230]], meso: [ST, ST] },
  { id: 'e5', from: 'S3', to: 'E', track: 'Track 3', reversed: false,
    schematic: [[420, 170], [500, 80], [640, 80]], graph: [[450, 110], [640, 40]], meso: [ST, ST] },
  { id: 'e6', from: 'S2', to: 'B', track: 'Line track E', reversed: false,
    schematic: [[750, 270], [970, 270]], graph: [[710, 230], [940, 230]], meso: [ST, [940, 200]] },
]

export const elementById = Object.fromEntries(elements.map(e => [e.id, e]))

// Navigable pairs per node (anything else meeting at the same node = navigability None)
export const navigable: Record<string, [string, string][]> = {
  S1: [['e1', 'e2'], ['e1', 'e3']],
  S3: [['e3', 'e4'], ['e3', 'e5']],
  S2: [['e2', 'e6'], ['e4', 'e6']],
}

// ---------- geometry helpers ----------
function resample(poly: Pt[], n = N_SAMPLES): Pt[] {
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < poly.length; i++) {
    const d = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1])
    seg.push(d); total += d
  }
  const out: Pt[] = []
  for (let k = 0; k < n; k++) {
    let target = total === 0 ? 0 : (k / (n - 1)) * total
    let i = 0
    while (i < seg.length - 1 && target > seg[i]) { target -= seg[i]; i++ }
    const f = seg[i] === 0 ? 0 : Math.min(1, target / seg[i])
    const a = poly[i], b = poly[i + 1] ?? poly[i]
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
  }
  return out
}

// "Geographic" view: the schematic bent into a gently curving corridor,
// with tracks squeezed together like in reality.
function toGeo([x, y]: Pt): Pt {
  const base = 300 - 0.17 * x + 38 * Math.sin(x / 170)
  return [x * 0.96 + 20, base + (y - 270) * 0.42]
}

const cache = new Map<string, Pt[]>()
export function points(el: ElementDef, view: View): Pt[] {
  const key = el.id + view
  if (!cache.has(key)) {
    let pts: Pt[]
    if (view === 'geo') pts = resample(el.schematic).map(toGeo)
    // macro reuses the meso geometry: the station collapses to a point, only the line remains
    else pts = resample(el[view === 'schematic' ? 'schematic' : view === 'macro' ? 'meso' : view])
    cache.set(key, pts)
  }
  return cache.get(key)!
}

export function pathD(pts: Pt[]): string {
  return 'M ' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')
}

/** Point and tangent at canonical fraction t (0 = from, 1 = to). */
export function at(el: ElementDef, view: View, t: number): { p: Pt; dir: Pt } {
  const pts = points(el, view)
  const f = Math.max(0, Math.min(1, t)) * (pts.length - 1)
  const i = Math.min(pts.length - 2, Math.floor(f))
  const r = f - i
  const a = pts[i], b = pts[i + 1]
  let dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  dx /= len; dy /= len
  return { p: [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r], dir: [dx, dy] }
}

export function nodePos(id: string, view: View): Pt {
  for (const el of elements) {
    if (el.from === id) return points(el, view)[0]
    if (el.to === id) { const p = points(el, view); return p[p.length - 1] }
  }
  return [0, 0]
}

/** Kilometre direction: km increases west -> east along the line. +1 if canonical runs with km. */
export function kmSign(el: ElementDef): number {
  const s = el.schematic
  return s[s.length - 1][0] >= s[0][0] ? 1 : -1
}

// ---------- routing ----------
export function endAt(el: ElementDef, node: string): 'from' | 'to' {
  return el.from === node ? 'from' : 'to'
}

/**
 * Find a route between two elements.
 * mode 'topology': respects navigability at switches (no U-turns inside a switch).
 * mode 'connectedTo': only knows that elements touch the same node.
 * Returns list of element ids, or null.
 */
export function route(fromEl: string, toEl: string, mode: 'topology' | 'connectedTo'): string[] | null {
  // state: element + node we are heading to
  type S = { el: string; towards: string; path: string[] }
  const start = elementById[fromEl]
  const queue: S[] = [
    { el: fromEl, towards: start.to, path: [fromEl] },
    { el: fromEl, towards: start.from, path: [fromEl] },
  ]
  const seen = new Set<string>()
  while (queue.length) {
    const s = queue.shift()!
    if (s.el === toEl) return s.path
    const key = s.el + '>' + s.towards
    if (seen.has(key)) continue
    seen.add(key)
    for (const nxt of elements) {
      if (nxt.id === s.el) continue
      if (nxt.from !== s.towards && nxt.to !== s.towards) continue
      if (mode === 'topology') {
        const pairs = navigable[s.towards] ?? []
        const ok = pairs.some(([a, b]) => (a === s.el && b === nxt.id) || (b === s.el && a === nxt.id))
        if (!ok) continue
      }
      const other = nxt.from === s.towards ? nxt.to : nxt.from
      queue.push({ el: nxt.id, towards: other, path: [...s.path, nxt.id] })
    }
  }
  return null
}

/** Track-level connectedTo matrix derived from topology (only navigable relations). */
export function connectedToMatrix(disabled: Set<string> = new Set()) {
  const tracks = [...new Set(elements.map(e => e.track))]
  const pairs = new Set<string>()
  for (const [node, list] of Object.entries(navigable)) {
    if (disabled.has(node)) continue
    for (const [a, b] of list) {
      const ta = elementById[a].track, tb = elementById[b].track
      if (ta !== tb) { pairs.add(ta + '|' + tb); pairs.add(tb + '|' + ta) }
    }
  }
  return { tracks, has: (a: string, b: string) => pairs.has(a + '|' + b) }
}
