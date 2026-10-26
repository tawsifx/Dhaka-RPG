# Dhaka Street Items & Hazards Design Dossier (Milestone 5)
## "Tring-Tring Grand Prix" — SuperTuxKart Gameplay Port

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Document:** `docs/rickshaw-race/05-items-design.md`  
**Date:** October 26, 2026  
**Status:** Canonical Gameplay Specification  
**Upstream Reference:** SuperTuxKart (`stk-code` commit `3ec7e05`)  

---

### 1. Item Concept & SuperTuxKart Port Mapping

Every street item in Tring-Tring Grand Prix directly ports the deterministic mathematics, collision physics, and probability distributions of SuperTuxKart (`stk-code/src/items/`):

| Dhaka Street Item | STK Archetype | Source C++ Implementation | Physics / Trajectory Mechanics | Hit Reaction Triggered |
| :--- | :--- | :--- | :--- | :--- |
| **Malai Cha Boost** | `zipper` | `powerup.cpp`, `kart.cpp` | Instant velocity boost $+6.0\text{ m/s}$ (capped at $+10\text{ m/s}$ over max speed) lasting $2.5\text{ s}$. Provides off-road grass shielding. | None (Self-buff) |
| **Naga Fuchka Rocket** | `bowling` | `bowling.cpp`, `flyable.cpp` | Linear projectile moving at $35.0\text{ m/s}$. Bounces off track barriers with restitution $e = 0.8$, stays on road ribbon, explodes on kart contact or expires after $6.0\text{ s}$. Can be aimed backward via Look-Behind (`KeyC` / `ButtonY`). | `explosion` (flip + tumble, lose 80% speed, 1.2s recovery) |
| **Mishti Doi Splat** | `cake` / `bubblegum` | `cake.cpp` | Dropped behind kart (or tossed forward with forward pitch). Remains stationary on track for $20.0\text{ s}$. Any kart driving over it spins out. | `spin_out` (360° yaw spin, lose 50% speed, 0.8s recovery) |
| **Parasol Shield** | `swatter` / `bubblegum` | `attachment.cpp` | Vibrant hand-painted Bangladeshi umbrella rotating around kart for $7.5\text{ s}$. Absorbs 1 incoming projectile or provides passive barrier contact immunity. | Contact karts get `bounce_recoil` |
| **Rickshaw Bell Shockwave** | `plunger` / `swatter` | `powerup.cpp` | Acoustic brass shockwave expanding in a $6.0\text{ m}$ spherical radius around the kart. Instantly stuns and spins out adjacent rivals. | `stun` (acoustic bell ringing, 1.0s handling freeze) |
| **Ghuri Kite (Patang)** | `rubber-ball` | `rubber_ball.cpp` | Homing flying kite gliding $1.5\text{ m}$ above the track centerline at $38.0\text{ m/s}$ targeting the 1st place leader. On contact, delivers a squash shockwave. | `squash` (flattened kart height 50%, speed halved for 2.0s) |

---

### 2. Item Probability Weight Distribution (1000-Sum Normalized)

Ported from SuperTuxKart's `data/powerup.xml` (`weights num-karts="9"`), calibrated for 8 karts in race mode across ranks 1 to 8:

```json
{
  "ranks": {
    "1": { "malai_cha": 50, "naga_fuchka": 200, "mishti_doi": 350, "parasol_shield": 250, "rickshaw_bell": 150, "ghuri_kite": 0 },
    "2": { "malai_cha": 100, "naga_fuchka": 280, "mishti_doi": 240, "parasol_shield": 200, "rickshaw_bell": 180, "ghuri_kite": 0 },
    "3": { "malai_cha": 150, "naga_fuchka": 270, "mishti_doi": 180, "parasol_shield": 180, "rickshaw_bell": 170, "ghuri_kite": 50 },
    "4": { "malai_cha": 220, "naga_fuchka": 240, "mishti_doi": 140, "parasol_shield": 150, "rickshaw_bell": 170, "ghuri_kite": 80 },
    "5": { "malai_cha": 280, "naga_fuchka": 200, "mishti_doi": 100, "parasol_shield": 140, "rickshaw_bell": 160, "ghuri_kite": 120 },
    "6": { "malai_cha": 340, "naga_fuchka": 160, "mishti_doi": 70, "parasol_shield": 120, "rickshaw_bell": 150, "ghuri_kite": 160 },
    "7": { "malai_cha": 400, "naga_fuchka": 120, "mishti_doi": 40, "parasol_shield": 100, "rickshaw_bell": 140, "ghuri_kite": 200 },
    "8": { "malai_cha": 450, "naga_fuchka": 80, "mishti_doi": 20, "parasol_shield": 80, "rickshaw_bell": 120, "ghuri_kite": 250 }
  }
}
```

- **Rank 1**: Heavy bias towards defensive traps (Mishti Doi 35%, Parasol Shield 25%) with 0% chance of getting the Ghuri Kite.
- **Rank 8**: Strong catch-up bias towards Malai Cha Boost (45%) and 1st-place targeting Ghuri Kite (25%).
- **Pure Determinism:** Item selection uses a dedicated seeded PRNG stream (`ItemRng.ts`, Mulberry32), completely isolated from visual effects or frame rates.

---

### 3. Tiffin Item Boxes (`ItemBoxSystem.ts`)

- **Appearance:** Rotating traditional brass Dhaka tiffin carrier (`tiffin_box.glb`), floating $1.1\text{ m}$ above track ground with soft golden bobbing animation.
- **Hit Detection:** Sphere overlap radius $r = 1.3\text{ m}$ against kart center.
- **Respawn Interval:** $3.5\text{ s}$ cooldown after collection before reappearing with a sparkle burst.
- **Item Roulette:** Rolling cycle lasts $1.2\text{ s}$ on HUD with sound tick envelopes before revealing the acquired item.

---

### 4. Hit Reaction State Machine (`HitReaction.ts`)

Every hit reaction overrides kart kinematics while preserving momentum and track ground clamping:

1. **`spin_out`**:
   - Triggered by: Mishti Doi Splat, Petal Slick hazard.
   - Duration: $0.85\text{ s}$.
   - Yaw rotation: $2\pi$ radians ($360^\circ$) spin.
   - Velocity scrub: speed reduced by $50\%$ on trigger, throttle disabled during spin.
   - Post-hit immunity: $1.5\text{ s}$ flashing invulnerability window.
2. **`explosion`**:
   - Triggered by: Naga Fuchka direct hit, Crossing Rickshaw Convoy collision.
   - Duration: $1.25\text{ s}$.
   - Vertical pop: upward impulse $+3.5\text{ m/s}$ with pitch tumble.
   - Velocity scrub: speed reduced by $80\%$.
   - Post-hit immunity: $2.0\text{ s}$ flashing invulnerability window.
3. **`squash`**:
   - Triggered by: Ghuri Kite strike.
   - Duration: $2.0\text{ s}$.
   - Kart visual scale: $Y$ compressed to $0.4\times$, $X/Z$ expanded to $1.2\times$.
   - Speed cap: Max speed clamped to $14.0\text{ m/s}$ ($50\%$) for the duration.
   - Post-hit immunity: $1.5\text{ s}$ invulnerability window.
4. **`stun`**:
   - Triggered by: Rickshaw Bell Shockwave within 6m.
   - Duration: $1.0\text{ s}$.
   - Visual tremor with floating musical note particles; steering locked neutral.

---

### 5. AI Item Brain (`ItemBrain.ts`)

Ported from SuperTuxKart `stk-code/src/karts/controller/skidding_ai.cpp`:
- **Defensive Traps (Mishti Doi):** Evaluates rear proximity. If a rival is directly behind within $15.0\text{ m}$ and $|\Delta \theta| < 30^\circ$, drop immediately. Otherwise, drop at technical corner exits.
- **Projectiles (Naga Fuchka):** If a kart ahead is within line-of-sight cone ($< 45\text{ m}$, $|\Delta \theta| < 20^\circ$, no wall occluding), fire forward. If chased closely from behind, aim backward.
- **Boosts (Malai Cha):** Fire on straights or off-road shortcuts; withhold in hairpin apexes to prevent overshooting.
- **Shield (Parasol):** Deploy immediately upon hearing incoming projectile warning or when entering heavy traffic pack.
- **Catch-up Budget Scaling:** In M5 with items enabled, rubber-banding scale is attenuated by $0.67\times$ (`rubberBandScaleWithItems = 0.67`) so items drive legitimate tactical overtakes rather than artificial speed warping.
