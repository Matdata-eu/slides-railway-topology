---
theme: default
title: "Topology as foundation"
info: |
  RINF workshop · 45 minutes on railway topology.
  What it is, why it matters, what goes wrong without it, and how direction and inference work on top of it.
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
mdc: true
routerMode: hash
layout: cover
class: bn-cover
background: /assets/tracks-photo.jpeg
---

<div class="bn-cover-panel">

<img src="/assets/banenor-logo-inverted.svg" class="h-12 mb-8" alt="Bane NOR" />

# One network, one truth

## Railway topology as the foundation for RINF

<div class="mt-6 opacity-90">
Mathias Vanden Auweele · on behalf of Bane NOR · RINF workshop
</div>

</div>

<!--
45 minutes. Aitor has just framed the two regulation items:
(b) routing on a micro-level description and (e) aligning infrastructure locations with telematics locations.
This talk gives the evidence for both.
-->

---
layout: default
---

# Where is this signal?

<TopoPlayground mode="hook" view="geo" :height="250" />

<div class="grid grid-cols-4 gap-3 text-sm mt-2">
<div v-click class="ans">📍 <b>59.91 N, 10.75 E</b><br><span class="sub">Geographic</span></div>
<div v-click class="ans">📏 <b>Line 2100, km 23.456</b><br><span class="sub">Linear referencing</span></div>
<div v-click class="ans">🏷️ <b>"Track 1 in Stasjon"</b><br><span class="sub">Organisational</span></div>
<div v-click class="ans hl">🕸️ <b>e2 @ 1032 m, normal</b><br><span class="sub">Topological</span></div>
</div>

<div v-click class="mt-3 text-lg">Only the last answer tells a computer what is <b>before</b>, <b>after</b> and <b>reachable</b>.</div>


<!--
All four answers are correct. Three are for humans. Only the topological one supports reasoning: what's next, can I get there, which way does it apply.
-->

---
layout: center
class: text-center
---

# What is topology?

<div class="text-xl mt-6 max-w-3xl mx-auto leading-relaxed">
The structure of a railway track network: <b>how tracks connect</b> at switches and crossings,
and how <b>operational points connect</b> through sections of line.
</div>

<div class="text-sm muted mt-6">railML 3 wiki · IS:topology · RailTopoModel (UIC IRS 30100)</div>

---
clicks: 11
---

# Building a topology, step by step

<TopoBuildUp :step="$clicks" :height="330" />

<!--
Click through twelve steps:
1 Empty network. 2 Net elements float, nothing more. 3 They are directed: origin 0 → end 1.
4 Net relations: directed A → B, with navigability. That is the topology graph.
5 Knowledge graph: in RDF the relation is itself a node, pointing to elementA and elementB. Topology graph ≠ knowledge graph.
6 Schematic representation. 7 Geographic representation (associated positioning systems in RTM).
8 Back to the abstract elements: spot, linear and area locations with intrinsic coordinates.
9–10 The very same locations projected into schematic and geographic. Located once, shown everywhere.
11 Meso level: the station tracks aggregate into one Operational Point, with a section of line on each side.
12 Macro level: the station disappears from the graph, only the national railway line remains.
-->

---

# The same station, five times

<TopoPlayground mode="layers" view="geo" :height="300" />

<div class="text-sm muted mt-1">Same 6 elements and 3 switches. The geometry is a <b>view</b>; the connections are the <b>data</b>.</div>

<!--
Click through: Geographic → Schematic → Topology graph → Meso → Macro.
The shapes morph, the connections never change. In the meso view, the whole station becomes one node: that is aggregation (RTM levels of detail). In the macro view the station disappears and only the national railway line remains.
-->

---

# Real life looks like this

<img src="/assets/four-views.png" class="h-[420px] mx-auto rounded shadow plan" />

<!-- Infrabel: geographic, signalling plan, micro logical topology, meso logical topology. -->

---

# Connected ≠ navigable

<TopoPlayground mode="navigability" view="schematic" :height="290" />

<div class="text-sm mt-1">

`era:NetRelation` → `era:navigability` **AB · BA · Both · None** — a switch connects 3 elements but only allows 2 movements.

</div>

<!--
Default route: from the siding e5 to the east (e6).
With topology + navigability: no route without reversing — the siding only leads west.
Switch to "mechanical connection only": a route is found e5 → e4 → e6 … straight through W3 the wrong way.
-->

---
layout: section
---

# What goes wrong without topology?

---
clicks: 3
---

# Problem 1 · The kilometre lie

<KmLie :step="$clicks" />

<div v-click="3" class="text-lg text-center">"Line + km" is a <b>human address</b>, not a unique location.</div>

---

# Problem 2 · `era:connectedTo` does not scale

<div class="grid grid-cols-2 gap-4">
<div>

<img src="/assets/kongsvinger-track-plan.jpeg" class="h-52 mx-auto rounded plan" />
<div class="text-center text-sm mt-1">Kongsvinger · a handful of tracks · doable by hand</div>

</div>
<div>

<img src="/assets/oslo-s-track-plan.jpeg" class="h-52 mx-auto rounded plan" />
<div class="text-center text-sm mt-1">Oslo S · about 50 station tracks · not doable by hand</div>

</div>
</div>

<div class="grid grid-cols-3 gap-3 mt-3 text-sm">
<div v-click class="card">✂️ connectedTo links the <b>main line track directly to the station tracks</b>, leaving out the switches and short tracks in between</div>
<div v-click class="card">✍️ To fill it in, someone <b>traces every switch and track</b> to find out <b>if</b> a train can get from the line track to each station track</div>
<div v-click class="card">🔁 Supply the topology and connectedTo is <b>inferred</b>, so it no longer needs to be delivered</div>
</div>

<!--
Aitor's counter-example for regulation item (b). Bane NOR network statement track plans.
Note: era:connectedTo is about navigable connections, not only mechanical ones (confirmed in ERA discussions).
-->

---

# Generate it, don't trace it

<ConnectedToStation />

<!--
Double-track line, crossover before and after the station, three station tracks.
Switch to the connectedTo view: the switches and short tracks disappear, only line track → station track remains.
Hover a cell to see the route behind it. Lock W1 in its straight position: Line S west loses Track 1.
-->

---

# Problems 3–5

<div class="grid grid-cols-3 gap-5 mt-6">
<div v-click class="prob">

### 🚆 Route compatibility
"Can vehicle X reach platform 3?"<br>
The SoL chain says **yes**. Micro topology shows platform 3 is **not reachable from that side**.

</div>
<div v-click class="prob">

### 🕳️ Data gaps & overlaps
Data kept as km-from / km-to rows (speed, gradient, track circuits) overlaps or leaves holes, and **nobody sees it**.
Located on a topology, every gap and overlap becomes visible.

</div>
<div v-click class="prob">

### 🔁 Map it again
The same switch-to-topology mapping done **twice**, by two departments.
Without a shared topology, every system re-engineers location.

</div>
</div>



---
clicks: 6
---

# Benefits · topology as the spine

<TopologySpine :step="$clicks" />

<div v-click="6" class="text-center text-lg -mt-2">If you want to do data once, model it for all use cases.</div>

---

# Bonus · schematic layouts from topology

<TurnoutRules />

<div class="text-sm mt-2 muted">

Left/right of a switch branch can be inferred. **Which branch is continuous** cannot — RINF still lacks it. Bane NOR rule: ① same name ② same type ③ closest curvature.

</div>

---

# Same idea, three syntaxes

<div class="rosetta">

| Concept | RailTopoModel | railML 3 | ERA ontology |
|---|---|---|---|
| edge | `LinearElement` | `netElement` | `era:LinearElement` |
| connection | `PositionedRelation` | `netRelation` · positionOnA/B 0/1 | `era:NetRelation` · isOnOriginOfElementA/B |
| navigability | `Navigability` | AB · BA · Both · None | `era:navigability` AB · BA · Both · None |
| point position | `SpotLocation` · intrinsic 0..1 | `spotLocation` · intrinsicCoord | `NetPointReference` → `TopologicalCoordinate` · offsetFromOrigin (m) |
| direction | `applicationDirection` | normal · reverse · both | `era:appliesToDirection` 00 · 01 · 02 |
| levels | micro · meso · macro | `network/level` + elementCollection | — no level concept |

</div>

<div class="mt-3 text-center">Converting between them is <b>mechanical</b> — the hard part is having the topology at all.</div>

---
layout: section
---

# Direction: normal or reverse?

---

# Three arrows on one signal

<DirectionPlayground />

<!--
Double-track line: Line N has its main running direction with the km, Line S against it. Track 3 is a siding: no main direction.
Green: where the signal faces. Orange: the track's main running direction. Blue: element orientation, origin 0 → end.
appliesToDirection (ERA, railML applicationDirection) is relative to the element. signalOrientation (RINF) is relative to the track's main direction.
Click a2 or a6 to flip them: appliesToDirection flips, signalOrientation never moves. S3 is a signal against the main direction: opposite. S4 on the siding: undefined.
-->

---

# Rules of thumb for direction

<div class="grid grid-cols-5 gap-6 mt-2">
<div class="col-span-2 text-[0.95rem]">

1. Direction is **never a property of the signal alone**. It is relative to the element it is positioned on.
2. Store it relative to the **topology** (`appliesToDirection`).
3. **Derive** the track's `trackDirection` value from it, as long as the element orientation and the track direction are known.
4. A reviewer asking "normal or reverse?" must first ask **"relative to what?"**

<div class="card warn-card mt-3 text-[0.85rem]">⚠️ <b>Don't base direction on ascending/descending km.</b> Kilometres are ambiguous (mileage changes, two lines with the same km, opposite counting directions) and not available everywhere, e.g. on sidings, in yards or across line borders.</div>

</div>
<div class="col-span-3">

<div class="smallcode">

```turtle {all|1-5|7-13|5,13}
:T1 a era:Track ;
  era:trackDirection :normal ;         # main running dir.
  era:netReference [ a era:NetLinearReference ;
    era:onLinearElement :a5 ;          # (simplified)
    era:appliesToDirection orientations:00 ] .

:N2 a era:Signal ;
  era:signalOrientation :normal ;      # faces main dir.
  era:netReference [ a era:NetPointReference ;
    era:hasTopoCoordinate [ era:onLinearElement :a5 ;
                            era:offsetFromOrigin 1056.0 ] ;
  # inferred: same element, same direction as the track
    era:appliesToDirection orientations:00 ] .
```

</div>

<div class="text-xs muted">Signal and track meet on <code>:a5</code>. signalOrientation normal ⇒ same direction as the track's reference; opposite ⇒ the other one. Works both ways.</div>

</div>
</div>

---
layout: section
---

# Locate once, infer the rest

## Cohesion through topology · autonomy through ownership

---

# Two teams, one spine

<TopoPlayground mode="infer" view="schematic" :height="270" />

<!--
Signalling team places signals. Traffic team draws OP and SoL extents. Track team draws tracks.
Nobody types onTrack / inOperationalPoint / onRailwayLine. Drag the OP boundary across S11: its inOP and onSoL change, the signal data is untouched.
Direction is translated too: appliesToDirection on e1 → normal/opposite with respect to line 2100.
-->

---

# The rule behind it

<div class="grid grid-cols-5 gap-4">
<div class="col-span-3">

```sparql {all|3-6|7-10|11-13}
CONSTRUCT { ?child era:isPartOf $this . $this era:hasPart ?child . }
WHERE {
  # the OP / SoL ($this) is located on micro-topology elements
  $this rtm:hasAreaLocation/rtm:hasAssociatedNetElement ?a .
  ?a rtm:onNetElement ?ne ;
     rtm:hasIntrinsicCoordinateBegin ?ab ; rtm:hasIntrinsicCoordinateEnd ?ae .
  # the child (track, signal, …) is located on the SAME element
  ?child rtm:hasLinearLocation/rtm:hasAssociatedNetElement ?c .
  ?c rtm:onNetElement ?ne ;
     rtm:hasIntrinsicCoordinateBegin ?cb ; rtm:hasIntrinsicCoordinateEnd ?ce .
  # window containment, independent of orientation
  FILTER(IF(?cb<?ce,?cb,?ce) >= IF(?ab<?ae,?ab,?ae)
      && IF(?cb<?ce,?ce,?cb) <= IF(?ab<?ae,?ae,?ab))
}
```

<div class="text-xs muted">Simplified from the Bane NOR RINF dataset generator (SHACL <code>sh:SPARQLRule</code>, moving to kg-gen).</div>

<div class="card text-xs mt-2">🤖 <b>AI skills</b> that give an agent the context to write these rules: <code>era-topology-relations</code>, <code>era-dual-positioning</code>, <code>era-wkt-geometry-enrichment</code>, …<br>
<span class="muted">github.com/Matdata-eu/raillML-to-ERA › .github/skills</span></div>

</div>
<div class="col-span-2 text-sm">

**Patterns**
- **point-in-extent**: signal → track, OP, SoL, line
- **extent-overlap**: track → OP, SoL
- **direction**: element orientation → line km direction

**Effect**
- providers enter **positions**
- relationships are **always consistent**
- each business unit stays **autonomous**

</div>
</div>

---

# tp-lib · GNSS positions on the topology

<div class="grid grid-cols-4 gap-2 mt-1">
<div class="tplib"><img src="/assets/tplib-raw.png" /><div><b>1 · Raw GNSS</b><br>noisy, gaps, which track?</div></div>
<div v-click class="tplib"><img src="/assets/tplib-simple-projection.png" /><div><b>2 · Nearest track</b><br>jumps between tracks</div></div>
<div v-click class="tplib"><img src="/assets/tplib-path.png" /><div><b>3 · Path through the topology</b><br>HMM / Viterbi on net relations</div></div>
<div v-click class="tplib"><img src="/assets/tplib-path-projection.png" /><div><b>4 · Projected on the path</b><br>netelement + intrinsic offset</div></div>
</div>

<div v-click class="text-center mt-3">Without topology a train teleports between tracks. With it, the only answers are <b>routes a train can actually drive</b>.</div>

<div class="text-xs muted text-center mt-1">github.com/Matdata-eu/tp-lib · Rust core, CLI, Python and .NET bindings, review webapp · can fetch the RINF topology on demand</div>

<!--
Open-source train positioning library (Apache 2.0), heading to the OpenRail Association.
Measurement-train GNSS → map matching using netrelations (Newson & Krumm HMM). Bridge netelements are inserted for continuity.
Output is a topological position: exactly what the inference rules need.
-->

---
clicks: 4
---

# One stasjon, three primary locations

<OpSplit :step="$clicks" />

<div class="card text-sm mt-1">🇳🇴 Latest Norwegian RINF release: <b>1 OP = 1 PL</b>. Each stasjon is split into as many areas as it has primary locations.</div>

<!--
1 A Bane NOR "stasjon" is a technical term: the network area bounded by entrance and exit signals (interlocking principle). It used to be one OP.
2 The train planning system routes trains to three primary locations: passenger area, maintenance yard, freight terminal.
3 Intra-station borders as NetPointReferences on the topology.
4 They cut the stasjon NetAreaReference into three parts.
5 Meso: line tracks (SoL) left and right, PL/OP1 in the middle, SoLs of solNature "link" to PL/OP2 and PL/OP3.
Since the latest Norwegian RINF release, OP and PL are 1:1, so every stasjon is split into as many areas as it has PLs.
-->

---

# Oslo S, coloured by primary location

<img src="/assets/oslo-s-primary-locations-qgis.png" class="h-[430px] mx-auto rounded shadow plan" />

---
clicks: 3
---

# Catenary sections from the topology

<CatenarySections :step="$clicks" />

<!--
1 The catenary department only manages where its sectioning elements are (overlaps IO, section insulators SI) and their properties.
2 Cutting the track topology at those points gives the catenary sections: the smallest parts that can be switched off.
3 Sections + sectioning elements (bridged by disconnectors) + feeders form a catenary topology. Track, OP, SoL and km per section are inferred.
Click SI3 and SI4: the siding loses supply. Click IO2: Line S west is still fed from the neighbouring substation.
-->

---
clicks: 3
---

# One worksite, every boundary

<WorksiteProtection :step="$clicks" />

<div class="text-xs muted mt-1">⚠️ Simplified. Real worksite protection planning needs more than this data can infer: safety distances, (local) operational rules, and the judgement of the people who plan and approve it. The topology gives a consistent starting point, not the final answer.</div>

<!--
The worksite is one linear location on Track 2.
Caveat: real safety boundaries also depend on safety distances and (local) operational rules that are not in the data we discussed.
1 Signal boundaries: walk outwards through navigable relations until a signal faces a train heading for the worksite. Here B and D, not the exit signals.
2 Catenary: the section under the worksite is switched off and earthed; the sectioning elements and breaker around it are opened. Side effect: the siding loses supply.
3 Defined, checked and communicated from one position. Click Track 1, the siding or the open line to show it recompute (the open line gives a warning).
-->

---
layout: section
---

# Demo · tps-topo-matching

## Regulation item (e) in practice

---

# Two topologies, one network

<TopoMatching />

<div class="text-sm mt-2 muted">Connectivity + left/right from azimuth decide. Length and km are <b>warnings only</b> — remember the km lie.</div>

<!--
Then switch to the live tool: DIM (geographic) vs TPS (schematic with primary locations).
Show: anchor → assisted matching → fine-grained overlap → data-health panel (invalidated mappings).
Point for Aitor: once both sides are topologies, a PLC can be tied to a point on a SoL or to a point on a track inside an OP.
-->

---
layout: center
---

# Live: tps-topo-matching

<div class="text-lg mt-4">

- ⚓ anchor one mapping → assisted propagation
- 🔍 fine-grained overlap per element
- 👥 multi-user ledger · first writer wins
- 🩺 data health: invalidated mappings after source changes

</div>

---
layout: center
class: text-center
---

# Three take-aways

<div class="grid grid-cols-3 gap-6 mt-8 text-left">
<div class="tk">📍<br><b>A location is a position on the topology.</b><br>Coordinates and km are views of it.</div>
<div class="tk">🧭<br><b>Direction is relative to the element.</b><br>Always ask "relative to what?"</div>
<div class="tk">🧠<br><b>Locate once, infer the rest.</b><br>Cohesion from topology, autonomy for every team.</div>
</div>

<div class="text-sm muted mt-10">
ERA ontology: gitlab.com/era-europa-eu/public/interoperable-data-programme/era-ontology · RTM wiki: wiki.railtopomodel.org · railML: wiki3.railml.org
</div>


---
layout: center
class: text-center
---

# Questions?

<div class="flex items-center justify-center gap-12 mt-8">
<div class="text-left text-lg leading-relaxed">

Mathias Vanden Auweele · Bane NOR<br>
<a href="mailto:mathias.vanden.auweele@banenor.no">mathias.vanden.auweele@banenor.no</a>

<div class="mt-6 text-base">Slides, source and interactive playgrounds:<br>
<a href="https://github.com/Matdata-eu/slides-railway-topology" class="font-bold">github.com/Matdata-eu/slides-railway-topology</a></div>

</div>
<div class="text-center">
<img src="/assets/qr-repo.svg" class="qr" alt="QR code to github.com/Matdata-eu/slides-railway-topology" />
<div class="text-xs muted mt-1">scan for the repo</div>
</div>
</div>
