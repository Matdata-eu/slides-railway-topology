// Second toy network: a station with 3 station tracks on a double-track line,
// with a crossover before and after the station.
//
//  WN ───────── XN1 ══════════ Track 1 ══════════ XN2 ───────── EN    main track N (runs with km)
//               ╱                                    ╲
//  WS ─── XS1 ─── W3 ══════════ Track 2 ═══════ E3 ─── XS2 ─── ES     main track S (runs against km)
//                   ╲                          ╱
//                    ════════ Track 3 ════════                       (siding, no main direction)
//
// Km increases west → east. Every element has a canonical geometry (from → to);
// its topological orientation is canonical unless `reversed`.
import { type Pt, N_SAMPLES } from './net'

export type View2 = 'schematic' | 'geo'
export interface Node2 { id: string; kind: 'end' | 'switch'; label: string }
export interface El2 {
  id: string; from: string; to: string; schematic: Pt[]
  track: string // owning track (line track or station track)
  kind: 'line' | 'station' | 'link'
  reversed: boolean
}
export interface Track2 { id: string; label: string; kind: 'line' | 'station'; main: 'normal' | 'opposite' | 'undefined' }

export const tracks2: Track2[] = [
  { id: 'WN', label: 'Line N (west)', kind: 'line', main: 'normal' },
  { id: 'WS', label: 'Line S (west)', kind: 'line', main: 'opposite' },
  { id: 'T1', label: 'Track 1', kind: 'station', main: 'normal' },
  { id: 'T2', label: 'Track 2', kind: 'station', main: 'opposite' },
  { id: 'T3', label: 'Track 3', kind: 'station', main: 'undefined' },
  { id: 'EN', label: 'Line N (east)', kind: 'line', main: 'normal' },
  { id: 'ES', label: 'Line S (east)', kind: 'line', main: 'opposite' },
]
export const trackById2 = Object.fromEntries(tracks2.map(t => [t.id, t]))

export const nodes2: Record<string, Node2> = {
  nWN: { id: 'nWN', kind: 'end', label: '' }, nWS: { id: 'nWS', kind: 'end', label: '' },
  XS1: { id: 'XS1', kind: 'switch', label: 'W1' }, XN1: { id: 'XN1', kind: 'switch', label: 'W2' },
  W3: { id: 'W3', kind: 'switch', label: 'W3' }, E3: { id: 'E3', kind: 'switch', label: 'W4' },
  XN2: { id: 'XN2', kind: 'switch', label: 'W5' }, XS2: { id: 'XS2', kind: 'switch', label: 'W6' },
  nEN: { id: 'nEN', kind: 'end', label: '' }, nES: { id: 'nES', kind: 'end', label: '' },
}

const N = 110, S = 190, T = 265
export const elements2: El2[] = [
  { id: 'a1', from: 'nWN', to: 'XN1', schematic: [[30, N], [250, N]], track: 'WN', kind: 'line', reversed: false },
  { id: 'a2', from: 'nWS', to: 'XS1', schematic: [[30, S], [160, S]], track: 'WS', kind: 'line', reversed: true },
  { id: 'a3', from: 'XS1', to: 'XN1', schematic: [[160, S], [250, N]], track: 'WS', kind: 'link', reversed: false },
  { id: 'a4', from: 'XS1', to: 'W3', schematic: [[160, S], [300, S]], track: 'WS', kind: 'link', reversed: false },
  { id: 'a5', from: 'XN1', to: 'XN2', schematic: [[250, N], [750, N]], track: 'T1', kind: 'station', reversed: false },
  { id: 'a6', from: 'W3', to: 'E3', schematic: [[300, S], [700, S]], track: 'T2', kind: 'station', reversed: true },
  { id: 'a7', from: 'W3', to: 'E3', schematic: [[300, S], [370, T], [630, T], [700, S]], track: 'T3', kind: 'station', reversed: false },
  { id: 'a8', from: 'E3', to: 'XS2', schematic: [[700, S], [840, S]], track: 'ES', kind: 'link', reversed: false },
  { id: 'a9', from: 'XN2', to: 'XS2', schematic: [[750, N], [840, S]], track: 'ES', kind: 'link', reversed: false },
  { id: 'a10', from: 'XN2', to: 'nEN', schematic: [[750, N], [970, N]], track: 'EN', kind: 'line', reversed: false },
  { id: 'a11', from: 'XS2', to: 'nES', schematic: [[840, S], [970, S]], track: 'ES', kind: 'line', reversed: true },
]
export const elById2 = Object.fromEntries(elements2.map(e => [e.id, e]))

/** navigable pairs per switch; the first pair is the straight route */
export const navigable2: Record<string, [string, string][]> = {
  XS1: [['a2', 'a4'], ['a2', 'a3']],
  XN1: [['a1', 'a5'], ['a3', 'a5']],
  W3: [['a4', 'a6'], ['a4', 'a7']],
  E3: [['a6', 'a8'], ['a7', 'a8']],
  XN2: [['a5', 'a10'], ['a5', 'a9']],
  XS2: [['a8', 'a11'], ['a9', 'a11']],
}

// ---------- geometry ----------
function resample(poly: Pt[], n = N_SAMPLES): Pt[] {
  const seg: number[] = []; let total = 0
  for (let i = 1; i < poly.length; i++) { const d = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]); seg.push(d); total += d }
  const out: Pt[] = []
  for (let k = 0; k < n; k++) {
    let target = (k / (n - 1)) * total; let i = 0
    while (i < seg.length - 1 && target > seg[i]) { target -= seg[i]; i++ }
    const f = seg[i] === 0 ? 0 : Math.min(1, target / seg[i])
    const a = poly[i], b = poly[i + 1] ?? poly[i]
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
  }
  return out
}
function toGeo([x, y]: Pt): Pt {
  const base = 290 - 0.15 * x + 34 * Math.sin(x / 170)
  return [x * 0.96 + 20, base + (y - 190) * 0.45]
}
const cache = new Map<string, Pt[]>()
export function points2(el: El2, view: View2): Pt[] {
  const k = el.id + view
  if (!cache.has(k)) cache.set(k, view === 'geo' ? resample(el.schematic).map(toGeo) : resample(el.schematic))
  return cache.get(k)!
}
export function at2(el: El2, view: View2, t: number): { p: Pt; dir: Pt } {
  const pts = points2(el, view)
  const f = Math.max(0, Math.min(1, t)) * (pts.length - 1)
  const i = Math.min(pts.length - 2, Math.floor(f)); const r = f - i
  const a = pts[i], b = pts[i + 1]
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1
  return { p: [a[0] + dx * r, a[1] + dy * r], dir: [dx / len, dy / len] }
}
export function nodePos2(id: string, view: View2): Pt {
  for (const el of elements2) {
    if (el.from === id) return points2(el, view)[0]
    if (el.to === id) { const p = points2(el, view); return p[p.length - 1] }
  }
  return [0, 0]
}

// ---------- reachability (what era:connectedTo summarises) ----------
/**
 * Station tracks reachable from a line track, travelling into the station.
 * `locked` switches only allow their straight route.
 * Returns the station tracks and the element path to each.
 */
export function reachable(lineTrack: string, locked: Set<string> = new Set()) {
  const start = elements2.find(e => e.track === lineTrack && e.kind === 'line')!
  const inner = ['XN1', 'XS1', 'XN2', 'XS2'].includes(start.to) ? start.to : start.from
  type St = { el: string; towards: string; path: string[] }
  const q: St[] = [{ el: start.id, towards: inner, path: [start.id] }]
  const seen = new Set<string>()
  const found: Record<string, string[]> = {}
  while (q.length) {
    const s = q.shift()!
    const key = s.el + '>' + s.towards
    if (seen.has(key)) continue
    seen.add(key)
    const pairs = (navigable2[s.towards] ?? []).filter((_, i) => !locked.has(s.towards) || i === 0)
    for (const [a, b] of pairs) {
      const nxt = a === s.el ? b : b === s.el ? a : null
      if (!nxt) continue
      const el = elById2[nxt]
      const path = [...s.path, nxt]
      if (el.kind === 'station') { found[el.track] ??= path; continue }
      q.push({ el: nxt, towards: el.from === s.towards ? el.to : el.from, path })
    }
  }
  return found
}
