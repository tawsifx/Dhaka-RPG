# Kart Feel Research & Kinematics Specification (M2)
## Reverse-Engineering Mario Kart & SuperTuxKart Gameplay Mechanics

**Author:** Gameplay & Physics Systems Team  
**Date:** October 26, 2026  
**Milestone:** M2 — Kart Feel (Drift, Mini-Turbo, Boost, Surfaces, Air, Collisions)  
**Host Engine:** Three.js + TypeScript Pure Kinematics

---

## 1. The Core Philosophy of Arcade Kart Feel

Unlike realistic driving simulators (e.g. Gran Turismo or Project CARS), Mario Kart's celebrated handling relies on **exaggerated, non-physical kinematic rules** crafted to maximize player agency, readability, and reward:

1. **Immediate Responsiveness:** Input must translate directly into movement without realistic driveline spooling, tire deformation lag, or uncommanded snap-oversteer.
2. **Intentional Drift Over-Steer (Slip Angle):** Drifting is not an emergency loss of traction; it is an active, offensive cornering stance where the chassis rotates inward (20°–35°) while the trajectory arcs cleanly through the apex.
3. **Tactile Reward Loop (The 3-Tier Mini-Turbo):** Charging through Blue $\rightarrow$ Orange $\rightarrow$ Purple sparks converts aggressive cornering into instant speed bursts.
4. **Forgiving Surface & Wall Transitions:** Off-road terrain and barriers should penalize mistakes (speed loss, missed turbo) without abruptly halting player momentum or trapping the vehicle.

---

## 2. Mathematical Foundations & Kinematic Models

### 2.1 Drift Kinematics & The "Hop-to-Drift" Mechanics

```
                 Trajectory Arc (v)
              ╭───────────────────────╮
             ╱                         ╲
            ╱    ┌───────┐              ╲
           │     │ Chassis\  θ_slip      │
           │     │ Heading ╲             │
           │     └───────┬──┘            │
           │             │               │
```

#### A. Hop Initiation
- When the player presses **Drift** (`Shift` / `K` / Gamepad `RB` / Touch `DRIFT`) while moving forward ($v > 5.0\text{ u/s}$) and holding a steering direction ($|u_{steer}| > 0.1$):
  - Kart executes a vertical hop: duration $T_{hop} = 180\text{ ms}$, peak height $h = 0.35\text{ m}$.
  - Locking of drift direction: `driftSign` $\in \{-1, +1\}$ is captured and locked.
  - Normal steering transitions into **Drift Arc Mode**.

#### B. Trajectory Arc vs. Visual Slip Angle
- In normal driving, chassis heading $\theta_{body}$ equals velocity vector angle $\theta_{vel}$.
- In drift mode:
  $$\theta_{vel}(t + \Delta t) = \theta_{vel}(t) + \omega_{arc} \cdot \Delta t$$
  $$\omega_{arc} = \text{driftSign} \cdot \left(\omega_{base} + \text{clamp}(u_{steer} \cdot \text{driftSign}, -0.5, 1.0) \cdot \omega_{control}\right)$$
  $$\theta_{body} = \theta_{vel} + \text{driftSign} \cdot \theta_{slip}$$

| Constant | Value | Description |
| :--- | :--- | :--- |
| $v_{min\_drift}$ | $6.0\text{ u/s}$ | Minimum speed required to trigger or sustain drift |
| $\omega_{base}$ | $1.85\text{ rad/s}$ | Base turning rate of locked drift arc |
| $\omega_{control}$ | $1.40\text{ rad/s}$ | Tightening / widening steering influence |
| $\theta_{slip}$ | $0.45\text{ rad}$ (~$26^\circ$) | Visual chassis outward slip angle |
| Counter-steer clamp | $[-0.5, 1.0]$ | Player can widen arc by counter-steering, but cannot flip drift direction |

#### C. Mini-Turbo Accumulation & Tier Thresholds
Charge $C(t)$ accumulates continuously while drifting on grounded surfaces:
$$\frac{dC}{dt} = R_{base} \times \left(1.0 + K_{steer} \times \max(0, u_{steer} \cdot \text{driftSign})\right) \times M_{drift\_stat}$$

- **Tier 1 (Mini-Turbo / Blue Sparks):** $C \ge 100$ (~$0.8\text{ s}$ inward steer). Grants $+30\%$ speed for $0.85\text{ s}$.
- **Tier 2 (Super Mini-Turbo / Orange Sparks):** $C \ge 220$ (~$1.6\text{ s}$). Grants $+50\%$ speed for $1.40\text{ s}$.
- **Tier 3 (Ultra Mini-Turbo / Purple Sparks):** $C \ge 360$ (~$2.4\text{ s}$). Grants $+75\%$ speed for $2.20\text{ s}$.

#### D. Drift Cancellation
Drift cancels with zero turbo reward if:
1. Braking is pressed ($u_{brake} > 0$).
2. Forward speed drops below $v_{min\_drift}$.
3. Severe wall collision occurs (impact angle $\theta_{impact} < 40^\circ$).

---

### 2.2 Unified Boost State Machine

To prevent speed spikes from clipping through collision bounds, boosts do not stack additively. Instead, a **Priority & Duration Refresh** model is implemented:

```
┌────────────────────────────────────────────────────────┐
│                      BOOST SYSTEM                      │
├────────────────────────────────────────────────────────┤
│ Active Sources:                                        │
│  - Ultra Mini-Turbo (T3):   strength: 0.75, dur: 2.2s  │
│  - Super Mini-Turbo (T2):   strength: 0.50, dur: 1.4s  │
│  - Mini-Turbo (T1):         strength: 0.30, dur: 0.85s │
│  - Boost Pad (Petal Pad):   strength: 0.80, dur: 1.2s  │
│  - Start Boost:             strength: 0.65, dur: 1.8s  │
│  - Air Trick:               strength: 0.35, dur: 0.7s  │
├────────────────────────────────────────────────────────┤
│ Resolution Rule:                                       │
│  if new.strength > active.strength:                    │
│      active = new                                      │
│  else if new.strength == active.strength:              │
│      active.remaining = max(active.remaining, new.dur) │
└────────────────────────────────────────────────────────┘
```

During boost:
- $v_{max} = v_{base\_max} \times (1.0 + \text{boost.strength})$
- Acceleration is overridden to $a_{boost} = 42.0\text{ u/s}^2$
- Camera FOV kicks outward dynamically ($\Delta\text{FOV} = +12^\circ$)
- Exhaust flame VFX and speed lines emit from the kart rear.

---

### 2.3 Analytic Surface Model & Off-Road Penalties

Surfaces modify four core attributes: top speed, acceleration, steering grip, and friction.

| Surface Type | Display Name | Max Speed Mult | Accel Mult | Steer Mult | Friction Mult | VFX / SFX Response |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `asphalt` | Main Courtyard | 1.00 | 1.00 | 1.00 | 1.00 | Clean tire grip, engine hum |
| `grass` | Green Infield | 0.65 | 0.50 | 0.85 | 1.80 | Grass dust particles, low rumble loop |
| `mud` | Monsoon Clay | 0.40 | 0.35 | 0.60 | 2.50 | Mud spray, heavy resistance |
| `puddle` | Rain Basin | 0.82 | 0.70 | 0.45 (slick) | 0.80 | Water droplet splash particles, water spray SFX |
| `boost_pad` | Petal Pad | 1.80 (forced) | 3.00 | 1.00 | 0.50 | High-energy chime, instant boost grant |

#### Boost Shielding
When a kart is actively boosting (e.g. from an Ultra Mini-Turbo or Boost Pad), off-road slowdown (grass/mud) is **ignored for the duration of the boost**, enabling authentic Mario Kart shortcut cutting across grass infields!

---

### 2.4 Air Mechanics, Ramps & Trick Boost

#### Vertical Integration
$$\frac{dv_y}{dt} = -g, \quad g = 28.0\text{ u/s}^2$$
$$y(t + \Delta t) = y(t) + v_y \cdot \Delta t$$

- Ramp launch: when crossing a ramp threshold at speed $v_x$, vertical velocity is imparted: $v_y = v_x \cdot \tan(\theta_{ramp})$.
- Air control: steering influence is attenuated by $75\%$ while airborne ($\text{steerFactor} = 0.25$).
- **Air Trick Window:** Pressing **Drift** or **Bell** while airborne triggers a dynamic 360° spin / flip animation.
- **Landing Evaluation:**
  - If a trick was triggered: upon touching ground ($y \le 0$), grants `air_trick` boost ($+35\%$ speed for $0.7\text{ s}$) + landing squash tween + landing dust particle burst.
  - Camera executes a brief vertical dip and shake ($I = 0.20$).

---

### 2.5 Collision Response: Glancing Slide vs. Head-On Bounce

Kart collision geometry is modeled as a bounding circle of radius $R = 0.75\text{ m}$.
Walls are defined analytically by oriented boundary planes with normal $\hat{n}$.

Given velocity $\vec{v}$ approaching wall normal $\hat{n}$:
$$v_n = \vec{v} \cdot \hat{n}, \quad \vec{v}_t = \vec{v} - v_n \hat{n}$$
$$\theta_{impact} = \arccos\left(\frac{|v_n|}{|\vec{v}|}\right)$$

1. **Glancing Collision ($\theta_{impact} \ge 35^\circ$):**
   - Kart slides along tangential vector $\vec{v}_t$.
   - Forward speed is maintained with slight wall-scrape drag: $v_{new} = |\vec{v}_t| \times 0.92$.
   - Drift is preserved if the impact is shallow ($\theta_{impact} \ge 60^\circ$).
2. **Head-On Impact ($\theta_{impact} < 35^\circ$):**
   - Elastic restitution bounce: $\vec{v}_{bounce} = \vec{v}_t - e \cdot v_n \hat{n}$ ($e = 0.25$).
   - Speed cut by $60\%$.
   - Active drift is immediately cancelled.
   - Screen shake triggered ($I = 0.40$).

---

### 2.6 Start Countdown Boost Window

The 3-2-1-GO sequence governs race startup:
- Interval: $1000\text{ ms}$ per step.
- At $t = 0$ (GO!), the audio bell rings.
- **Perfect Window:** Accelerate pressed between $t \in [-150\text{ ms}, +220\text{ ms}]$ relative to GO! $\rightarrow$ **Rocket Start Boost** ($+65\%$ speed for $1.8\text{ s}$).
- **Early Press Penalty:** Accelerate held $> 200\text{ ms}$ before GO! $\rightarrow$ **Engine Stall** (tires spin out, kart immobilized for $1.2\text{ s}$, smoke puff).
- **Late Press:** Accelerate pressed $> 220\text{ ms}$ after GO! $\rightarrow$ Standard start, no boost.

---

### 2.7 Kart Archetypes (`KartStats`)

To support balanced vehicle choice, three canonical archetypes are established:

| Archetype | Top Speed | Acceleration | Handling (Turn Rate) | Weight (Bump Resistance) | Drift Charge Mult |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Light** (e.g. Satsuki) | 26.0 u/s | 19.0 u/s² | 3.2 rad/s | 0.80 | **1.25×** (Fast Charge) |
| **Balanced** (Default) | 28.0 u/s | 16.0 u/s² | 2.8 rad/s | 1.00 | **1.00×** (Standard) |
| **Heavy** (e.g. Totoro) | **31.0 u/s** | 13.0 u/s² | 2.3 rad/s | **1.35×** | 0.85× (High Top Speed) |
