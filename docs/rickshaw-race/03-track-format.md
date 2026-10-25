# Dhaka Date RPG — 3D Rickshaw Racing
## Specification: 03-track-format.md — Track Asset Pipeline & Data Format

*Milestone: M3 (Track Pipeline — Mesh Surfaces & Collision, Laps, Checkpoints, Minimap, Fuller Road Sprint)*  
*Canonical Reference: `src/types/race.types.ts` (`TrackDefinition`)*

---

### 1. Overview & Directory Convention

All track assets live exclusively under `public/assets/race/tracks/<track_id>/` and are dynamically fetched at race runtime. They are never bundled into the initial Phaser game bundle.

```
public/assets/race/tracks/<track_id>/
├── track.json          # Track definition schema (centerline, checkpoints, start grid, pads)
├── collision.glb       # Low-poly collision geometry (<1 MB, <40k tris) with semantic materials
├── visual.glb          # Full visual mesh (<8 MB) with landmarks, Curzon façade, trees, decals
└── preview.png         # Optional UI preview thumbnail for track selection
```

---

### 2. File Budgets & Standards

| Asset | File Budget | Tri Budget | Description |
| :--- | :--- | :--- | :--- |
| `track.json` | $\le 50\text{ kB}$ | N/A | Centerline spline, checkpoints, start grid, ramps, pads, minimap bounds |
| `collision.glb` | $\le 1000\text{ kB}$ | $\le 40,000$ tris | Low-poly untextured geometry. Material names denote physics surfaces |
| `visual.glb` | $\le 8000\text{ kB}$ | $\le 150,000$ tris | Optimized textured/colored geometry, instanced props, heritage landmarks |
| **Total Track Download** | $\le 8\text{ MB}$ | — | Downloaded during `RaceLoadingScreen` with progress reporting |

---

### 3. Surface Material Naming Standard

The collision mesh parser (`BvhGroundQuery`) inspects node/material names to extract surface interaction properties:

| Material Substring | Surface Type | Speed Mult | Accel Mult | Steer Mult | Friction Mult | Special Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `surf_asphalt` | `asphalt` | $1.00$ | $1.00$ | $1.00$ | $1.00$ | Standard racing tarmac |
| `surf_grass` | `grass` | $0.65$ | $0.50$ | $0.85$ | $1.80$ | Off-road slowdown; green particles |
| `surf_mud` | `mud` | $0.40$ | $0.35$ | $0.60$ | $2.50$ | Heavy drag; mud splash particles |
| `surf_puddle` | `puddle` | $0.82$ | $0.70$ | $0.45$ | $0.80$ | Low grip / slippery; water spray |
| `surf_boostpad` | `boost_pad` | $1.80$ | $3.00$ | $1.00$ | $0.50$ | Triggers petal boost (+80% speed) |
| `surf_ramp` | `ramp` | $1.00$ | $1.00$ | $0.90$ | $1.00$ | Launches kart into air; allows trick |
| `surf_offtrack_kill` | `offtrack_kill` | $0.00$ | $0.00$ | $0.00$ | $5.00$ | Triggers paper-lantern rescue |
| `wall_barrier` | Wall | — | — | — | — | Glancing slide ($<40^\circ$) vs head-on bounce ($\ge 40^\circ$) |

---

### 4. Checkpoint Gates & Anti-Cheat Protocol

Checkpoints are mathematical planes defined by:
- `center`: 3D center point $(x, y, z)$
- `normal`: Normalized direction of travel vector $(n_x, n_y, n_z)$
- `width`: Gate aperture width in meters
- `height`: Vertical clearance in meters (supports high jump detection)
- `groupId`: Optional string identifier for branching pathways (e.g. `shortcut_courtyard`)

#### Intersection Math (`LapTracker`):
1. **Segment-vs-Plane Intersection**: For kart motion segment $(P_1 \to P_2)$, compute signed distances $d_1 = (P_1 - C) \cdot N$ and $d_2 = (P_2 - C) \cdot N$.
2. **Direction Invariant**: Valid crossing requires $d_1 \le 0$ and $d_2 > 0$. Reversing across gate ($d_1 > 0 \land d_2 < 0$) is strictly rejected.
3. **Sequential Invariant**: Karts must pass Gate $k$ before Gate $k+1$ can be triggered. Skipping gates is rejected.
4. **Any-Of Groups**: For alternative branches (shortcuts), passing ANY gate with matching `groupId` satisfies the checkpoint requirement and advances to the next group/gate.
5. **Lap Completion**: Crossing the final gate (Finish Line) increments current lap and records split times. After `lapCount` laps, the race transitions to `finished`.

---

### 5. Paper-Lantern Rescue System

- **Kill Plane**: If kart drops below `y < killPlaneY` (default $-10\text{m}$) or contacts `surf_offtrack_kill`.
- **Stuck Detection**: If throttle $> 0.6$ and kart speed $< 0.6\text{ m/s}$ continuously for $3.5\text{ s}$ while not airborne.
- **Respawn Behavior**: Kart is lifted by a glowing paper lantern and placed $1.5\text{m}$ behind the last crossed checkpoint center, elevated $0.5\text{m}$ above track ground, oriented forward along gate normal with zero velocity and $0.8\text{s}$ post-respawn invulnerability.

---

### 6. Reference Track: "Fuller Road Sprint"

- **Location**: Dhaka University Heritage Circuit (Curzon Hall $\leftrightarrow$ TSC Rotunda)
- **Circuit Arc Length**: $1316.4\text{ meters}$
- **Target Lap Time**: $57.2\text{ s}$ at $23\text{ m/s}$ ($45\text{--}60\text{ s}$ target)
- **Checkpoints**: 14 gates (13 intermediate + 1 finish line) + 1 shortcut branch gate
- **Features**:
  - Terracotta red-brick Curzon Hall start/finish straight
  - Curzon East S-Chicane
  - TSC Rotunda 180° drift hairpin (apex at $x=235\text{m}$)
  - Krishnachura Avenue long straight with petal boost pads
  - Elevated flyover bridge cresting at $y=6.0\text{m}$
  - Ramp gap jump with air trick bonus
  - Puddle & mud chicane
  - Curzon Courtyard grass shortcut with petal boost pad entry
