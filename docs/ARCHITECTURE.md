# Architecture

The project is a small source monorepo with one npm dependency graph and a pinned
Python environment. It deliberately avoids a workspace orchestrator: there are two
processes and four small shared packages, with no independent package releases.

```text
data/tracks + data/vehicles
         │
         ▼
FastAPI → validation → bounded line optimization → speed envelope → telemetry
  ▲                                                               │
  │               Vite /api development proxy                      ▼
React setup ──────────────────────────────────────────────── validated Lap
                                                             │  │  │  │
                      procedural Three.js viewer ◀────────────┘  │  │  │
                      corner/sector analysis ◀───────────────────┘  │  │
                      shared PlaybackClock + interpolation ◀───────┘  │
                          │              │                            │
                          ▼              ▼                            ▼
                       ghost          charts                      audio
```

Track geometry is data-driven and generated procedurally. `normalizeTrack` derives
closed-loop distance, tangents, horizontal lateral normals and boundaries;
`ribbonGeometry` emits indexed, top-facing triangles. Three.js constructs and
disposes GPU geometries when data changes, never on every playback frame. Terrain
and synthetic tree placements are original contextual geometry, not surveyed data.

Simulation telemetry is authoritative. The renderer draws solved positions and
braking values. A single external playback clock exposes time, play/pause, rate and
loop state; binary-search interpolation supplies ghost, plots and sound. React's
high-level setup state does not rerender at playback frequency. The chart component
subscribes to the clock, while the ghost reads it within the Three.js render loop.

The backend validates all input with Pydantic. Zod validates catalog and simulation
responses before they enter the UI. The API runs synchronous simulation functions
in FastAPI's worker pool. A bounded 24-entry in-process cache avoids re-solving
identical track/vehicle/setup requests. A generation counter prevents old responses
from replacing a newer selected run. A failed run preserves the last completed lap.

`apps/simulation/numerics.py` builds a sparse, distance-weighted curvature quadratic
and solves its box constraints. `solver.py` owns geometry, the speed envelope,
optional local lap-time refinement and result assembly. Refinement repeatedly calls
the same vehicle/setup speed envelope; accepted positions and the matching profile
are returned together. No renderer or UI computes an independent optimized path.
Numerical demand diagnostics and refinement accounting cross the existing Lap API.
Before that solve, `sampling.py` prepares a checked source or uniform grid and
source-progress alignment. The Lap response carries effective points for rendering;
the project retains the original imported track. Reference restoration verifies
source geometry independently of the selected solver resolution.

Every new Lap also contains its validated vehicle snapshot, including provenance
and model assumptions. Reference selection survives a vehicle change on the same
source track. Result names and ghost body style come from the completed Lap, so a
failed profile change cannot relabel old telemetry. Legacy references without a
snapshot fall back to the catalog name or their stored vehicle ID.

Device-local project state lives in versioned browser storage, with explicit Save.
Telemetry exports remain on the user's device. Imports use the same validated
custom-track contract. There is no account system, database or external telemetry.

Blender is not a source of truth. Future licensed GLB cars, barriers or buildings
may decorate the scene without defining track or physics. Neither track-specific
coordinates nor vehicle performance conditionals belong in React components.
