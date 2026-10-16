# One network, one truth: railway topology as the foundation for RINF

Slidev deck for the 45-minute railway topology talk at the ERA RINF workshop, presented on behalf of Bane NOR.

**Live slides:** https://matdata-eu.github.io/slides-railway-topology/

## Getting started

```bash
npm ci
npm run dev
```

Open http://localhost:3030 to see the slides, and http://localhost:3030/presenter for presenter mode with speaker notes.

| Script | What it does |
|---|---|
| `npm run dev` | Live-reloading dev server |
| `npm run build` | Static site in `dist/` |
| `npm run export` | PDF export (`slides-export.pdf`, needs Playwright Chromium) |

## Publishing

- **GitHub Pages** (`.github/workflows/deploy.yml`): every push to `main` builds the deck with base path `/slides-railway-topology/` and deploys it. In the repository settings, set *Pages → Source* to **GitHub Actions** once.
- **PDF release** (`.github/workflows/release.yml`): pushing a tag such as `v1.0.0` exports the slides (with click steps) to PDF and attaches it to a GitHub release. Running it by hand uploads the PDF as a workflow artifact.

## Interactive components

The playground slides run on two toy networks:

- `lib/net.ts`: a single-track station with a passing loop, a siding and switches W1–W3.
- `lib/net2.ts`: a double-track station with a crossover on each side and three station tracks.

| Component | Slide | What you can do live |
|---|---|---|
| `TopoBuildUp` | Building a topology, step by step | Twelve clicks from an empty network to net elements, relations, the knowledge-graph view, schematic and geographic representations, spot/linear/area locations, and aggregation to the meso and macro levels |
| `TopoPlayground mode="hook"` | Where is this signal? | One signal, four answers to "where is it?" |
| `TopoPlayground mode="layers"` | The same station, five times | Morph between geographic, schematic, graph, meso (OP and SoL) and macro (the line with its ends, junctions and interchange stations) |
| `TopoPlayground mode="navigability"` | Connected ≠ navigable | Click two elements to route between them; compare with a mechanical connection only |
| `KmLie` | Problem 1 | Mileage change, same km on two lines, opposite counting directions |
| `ConnectedToStation` | Generate it, don't trace it | `era:connectedTo` derived from the micro topology; lock a switch or hover a cell to trace the route |
| `TopologySpine`, `TurnoutRules` | Benefits, schematic layouts | Click-driven build and continuous-branch rules |
| `DirectionPlayground` | Two directions on one signal | Flip an element: `appliesToDirection` flips, `signalOrientation` (relative to the track's main direction) does not |
| `TopoPlayground mode="infer"` | Two teams, one spine | Drag the OP boundary: relations to track, OP, SoL and line are re-inferred |
| `OpSplit` | One station, three primary locations | Splitting a station area into primary locations with intra-station borders, plus the meso view |
| `TopoMatching` | Two topologies, one network | Assisted matching from one anchor (teaser for the tps-topo-matching demo) |

## References

- [ERA ontology](https://gitlab.com/era-europa-eu/public/interoperable-data-programme/era-ontology/era-ontology)
- [RailTopoModel](https://wiki.railtopomodel.org) · [railML 3](https://wiki3.railml.org)
- [tp-lib](https://github.com/Matdata-eu/tp-lib): GNSS positions on the topology
- [railML-to-ERA AI skills](https://github.com/Matdata-eu/raillML-to-ERA/tree/main/.github/skills)
