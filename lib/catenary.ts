// Catenary sectioning and worksite protection on the double-track station of net2.ts.
//
// The catenary department only manages *where* its sectioning elements sit on the topology.
// Cutting the topology at those points gives the catenary sections; the sectioning elements
// (bridgeable by disconnectors) and the feeders link them into a catenary topology.
import { type Pt } from './net'
import { elements2, elById2, navigable2, at2 } from './net2'

export interface SectEl { id: string; kind: 'overlap' | 'insulator'; el: string; t: number }
export const sectioning: SectEl[] = [
  { id: 'IO1', kind: 'overlap', el: 'a1', t: 0.62 },
  { id: 'IO2', kind: 'overlap', el: 'a2', t: 0.55 },
  { id: 'IO3', kind: 'overlap', el: 'a10', t: 0.38 },
  { id: 'IO4', kind: 'overlap', el: 'a11', t: 0.45 },
  { id: 'SI1', kind: 'insulator', el: 'a3', t: 0.5 },
  { id: 'SI2', kind: 'insulator', el: 'a9', t: 0.5 },
  { id: 'SI3', kind: 'insulator', el: 'a7', t: 0.12 },
  { id: 'SI4', kind: 'insulator', el: 'a7', t: 0.88 },
]

// ---------- pieces and sections ----------
export interface Piece { id: string; el: string; t0: number; t1: number }
export const pieces: Piece[] = []
for (const el of elements2) {
  const cuts = sectioning.filter(s => s.el === el.id).map(s => s.t).sort((a, b) => a - b)
  const bounds = [0, ...cuts, 1]
  for (let k = 0; k < bounds.length - 1; k++) pieces.push({ id: `${el.id}:${k}`, el: el.id, t0: bounds[k], t1: bounds[k + 1] })
}
const pieceAt = (el: string, t: number) => pieces.find(p => p.el === el && t >= p.t0 && t <= p.t1)!

// union-find over pieces: pieces meeting at a node are electrically one (the catenary runs through switches)
const parent: Record<string, string> = Object.fromEntries(pieces.map(p => [p.id, p.id]))
const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])))
const union = (a: string, b: string) => { parent[find(a)] = find(b) }
const nodeIds = new Set(elements2.flatMap(e => [e.from, e.to]))
for (const n of nodeIds) {
  const touching = pieces.filter(p => (elById2[p.el].from === n && p.t0 === 0) || (elById2[p.el].to === n && p.t1 === 1))
  for (let i = 1; i < touching.length; i++) union(touching[0].id, touching[i].id)
}

export interface Section { id: string; name: string; colour: string; pieces: Piece[] }
const named: [string, number, string, string][] = [
  ['a1', 0.2, 'Line N west', 'var(--c-purple)'],
  ['a2', 0.2, 'Line S west', 'var(--c-pink)'],
  ['a5', 0.5, 'Station N', 'var(--c-blue)'],
  ['a6', 0.5, 'Station S', 'var(--c-teal)'],
  ['a7', 0.5, 'Siding T3', 'var(--c-orange)'],
  ['a10', 0.8, 'Line N east', 'var(--c-green)'],
  ['a11', 0.8, 'Line S east', 'var(--c-amber)'],
]
export const sections: Section[] = named.map(([el, t, name, colour], i) => {
  const root = find(pieceAt(el, t).id)
  return { id: `C${i + 1}`, name, colour, pieces: pieces.filter(p => find(p.id) === root) }
})
export const sectionOfPiece = (pid: string) => sections.find(s => s.pieces.some(p => p.id === pid))!
export const sectionAt = (el: string, t: number) => sectionOfPiece(pieceAt(el, t).id)

/** the two sections a sectioning element separates */
export function sides(s: SectEl): [Section, Section] {
  return [sectionAt(s.el, Math.max(0, s.t - 0.01)), sectionAt(s.el, Math.min(1, s.t + 0.01))]
}

// ---------- feeding ----------
export interface Feeder { id: string; label: string; section: string }
export const feeders: Feeder[] = [
  { id: 'Q1', label: 'Substation Stasjon', section: 'C3' },
  { id: 'Q2', label: 'Substation Stasjon', section: 'C4' },
  { id: 'Q3', label: 'neighbour substation', section: 'C1' },
  { id: 'Q4', label: 'neighbour substation', section: 'C2' },
  { id: 'Q5', label: 'neighbour substation', section: 'C6' },
  { id: 'Q6', label: 'neighbour substation', section: 'C7' },
]

/** energised sections, given which disconnectors / breakers are open */
export function energised(open: Set<string>) {
  const on = new Set<string>()
  const q = feeders.filter(f => !open.has(f.id)).map(f => f.section)
  while (q.length) {
    const c = q.shift()!
    if (on.has(c)) continue
    on.add(c)
    for (const s of sectioning) {
      if (open.has(s.id)) continue
      const [a, b] = sides(s)
      if (a.id === c) q.push(b.id)
      if (b.id === c) q.push(a.id)
    }
  }
  return on
}

// ---------- inferred network description ----------
const KM0 = 12.0
export const kmAt = (x: number) => KM0 + (x - 30) * 0.004
const ENTRY: Record<string, { t: number; west: boolean }> = { a1: { t: 0.5, west: true }, a2: { t: 0.45, west: true }, a10: { t: 0.5, west: false }, a11: { t: 0.55, west: false } }
function inOP(p: Piece) {
  const el = elById2[p.el]
  if (el.kind !== 'line') return true
  const e = ENTRY[p.el]
  return e.west ? p.t1 > e.t : p.t0 < e.t
}
function onSoL(p: Piece) {
  const el = elById2[p.el]
  if (el.kind !== 'line') return false
  const e = ENTRY[p.el]
  return e.west ? p.t0 < e.t : p.t1 > e.t
}
const trackLabel: Record<string, string> = { WN: 'Line N', WS: 'Line S', EN: 'Line N', ES: 'Line S', T1: 'Track 1', T2: 'Track 2', T3: 'Track 3' }
export function describe(sec: Section) {
  const xs = sec.pieces.flatMap(p => [at2(elById2[p.el], 'schematic', p.t0).p[0], at2(elById2[p.el], 'schematic', p.t1).p[0]])
  const tracks = [...new Set(sec.pieces.map(p => trackLabel[elById2[p.el].track]))]
  const sols = [...new Set(sec.pieces.filter(onSoL).map(p => (p.el === 'a1' || p.el === 'a2' ? 'SoL A–Stasjon' : 'SoL Stasjon–B')))]
  return {
    tracks: tracks.join(', '),
    op: sec.pieces.some(inOP) ? 'Stasjon' : '—',
    sol: sols.join(', ') || '—',
    km: `${kmAt(Math.min(...xs)).toFixed(3)}–${kmAt(Math.max(...xs)).toFixed(3)}`,
  }
}

// ---------- signals and worksite protection ----------
export interface Sig2 { id: string; el: string; t: number; facing: 1 | -1 }
export const signals2: Sig2[] = [
  { id: 'A', el: 'a1', t: 0.5, facing: 1 }, { id: 'B', el: 'a2', t: 0.45, facing: 1 },
  { id: 'C', el: 'a10', t: 0.5, facing: -1 }, { id: 'D', el: 'a11', t: 0.55, facing: -1 },
  { id: 'N1', el: 'a5', t: 0.1, facing: -1 }, { id: 'N2', el: 'a5', t: 0.9, facing: 1 },
  { id: 'S1', el: 'a6', t: 0.1, facing: -1 }, { id: 'S2', el: 'a6', t: 0.9, facing: 1 },
  { id: 'T1', el: 'a7', t: 0.2, facing: -1 }, { id: 'T2', el: 'a7', t: 0.8, facing: 1 },
]

export interface Worksite { el: string; t0: number; t1: number }
export interface Span { el: string; t0: number; t1: number }

/**
 * Walk outwards from both ends of the worksite through navigable relations.
 * The first signal that faces a train heading towards the worksite closes that route.
 */
export function protect(ws: Worksite) {
  const boundary = new Set<string>()
  const zone: Span[] = [{ el: ws.el, t0: ws.t0, t1: ws.t1 }]
  const openEnds: string[] = []
  type St = { el: string; t: number; dir: 1 | -1 } // dir: +1 = walking towards `to`
  const q: St[] = [{ el: ws.el, t: ws.t0, dir: -1 }, { el: ws.el, t: ws.t1, dir: 1 }]
  const seen = new Set<string>()
  while (q.length) {
    const s = q.shift()!
    const key = `${s.el}${s.dir}${s.t}`
    if (seen.has(key)) continue
    seen.add(key)
    const ahead = signals2
      .filter(g => g.el === s.el && g.facing === -s.dir && (s.dir > 0 ? g.t > s.t : g.t < s.t))
      .sort((a, b) => (s.dir > 0 ? a.t - b.t : b.t - a.t))[0]
    if (ahead) {
      boundary.add(ahead.id)
      zone.push({ el: s.el, t0: Math.min(s.t, ahead.t), t1: Math.max(s.t, ahead.t) })
      continue
    }
    zone.push({ el: s.el, t0: s.dir > 0 ? s.t : 0, t1: s.dir > 0 ? 1 : s.t })
    const el = elById2[s.el]
    const node = s.dir > 0 ? el.to : el.from
    const pairs = navigable2[node]
    if (!pairs) { openEnds.push(node); continue }
    for (const [a, b] of pairs) {
      const nxt = a === s.el ? b : b === s.el ? a : null
      if (!nxt) continue
      const n = elById2[nxt]
      q.push(n.from === node ? { el: nxt, t: 0, dir: 1 } : { el: nxt, t: 1, dir: -1 })
    }
  }
  // catenary: every section the worksite touches, isolated at its borders
  const secIds = new Set(pieces.filter(p => p.el === ws.el && p.t1 > ws.t0 && p.t0 < ws.t1).map(p => sectionOfPiece(p.id).id))
  const openEls = sectioning.filter(s => sides(s).some(x => secIds.has(x.id)) && !sides(s).every(x => secIds.has(x.id))).map(s => s.id)
  const openFeeders = feeders.filter(f => secIds.has(f.section)).map(f => f.id)
  const open = new Set([...openEls, ...openFeeders])
  const live = energised(open)
  const dead = sections.filter(c => !live.has(c.id) && !secIds.has(c.id)).map(c => c.id)
  return { boundary: [...boundary], zone, openEnds, sections: [...secIds], openEls, openFeeders, dead }
}

export const sigPoint = (g: Sig2): { p: Pt; dir: Pt } => at2(elById2[g.el], 'schematic', g.t)
