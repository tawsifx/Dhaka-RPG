# Architecture Decisions Record (ADR) — Living-World NPC Behavior Engine

**Project**: *Totoro & Moon Walker: Chronicles of the Six Realms*  
**Date**: October 18, 2026  

---

## ADR-001: Tile-Step Grid Pathfinding with Smooth Pixel Interpolation
- **Context**: The game is rendered on a 32×32 grid, but the player moves smoothly at pixel level with Arcade physics.
- **Decision**: NPCs will plan paths strictly on the 32×32 tile grid (A*), but execution (`NpcMover.ts`) will interpolate smoothly between tile centers at their assigned speed, eliminating jerky teleporting while preserving 100% collision predictability.
- **Justification**: Matches Pokémon HGSS visual fidelity and Stardew Valley movement feel while avoiding fractional tile stuck states.

## ADR-002: In-House A* Pathfinding Engine with Terrain Costs
- **Context**: External pathfinding libraries (like EasyStar) add external dependency overhead, while NavMesh is designed for 3D/convex polygons rather than 32×32 discrete grids.
- **Decision**: Implement a clean, high-performance, in-house A* algorithm in `src/systems/npc/NpcNavigator.ts` with discrete terrain weights (Paved Path: 1.0, Grass: 2.0, Flower Beds: 5.0, Tilled Soil / Growing Crops: 999.0 / Blocked).
- **Justification**: Zero dependencies, fully tree-shakeable, 100% testable in Vitest without DOM dependencies, and natively aware of `FarmingSystem` cell states.

## ADR-003: Deterministic Seeded Pseudo-RNG for Idle Variances
- **Context**: NPCs need natural subtle variance in idle durations, look-around directions, and walking speed micro-variances ($\pm 5\%$) without desynchronizing across save reloads or map re-entries.
- **Decision**: All non-deterministic micro-decisions use a mulberry32 PRNG seeded deterministically by `(npcIdHash ^ (year * 1000 + seasonIdx * 100 + day))`.
- **Justification**: Preserves the "pure function" principle: entering a map at the exact same time produces identical, deterministic NPC poses and positions.

## ADR-004: Priority-Based Schedule Variant Resolver with Strict Tie-Breaking
- **Context**: Stardew Valley uses complex implicit string sorting rules (e.g. `summer_Mon_4` vs `summer_15`), which can produce subtle bugs and order ambiguities.
- **Decision**: Every `ScheduleVariant` must declare an explicit numeric `priority: number`. The `ScheduleResolver` filters matching variants and picks the highest numeric priority. Ties with overlapping conditions are flagged as fatal errors by `npm run validate:npc`.
- **Justification**: Ensures 100% predictable behavior, zero ambiguity, and automated lint verification in CI.

## ADR-005: Analytic Offscreen Simulation without Background Frame Ticking
- **Context**: Simulating 38 NPCs with A* stepping on 8 maps simultaneously would waste CPU cycles on non-visible entities.
- **Decision**: NPCs on inactive maps advance their `ScheduleCursor` analytically based on departure time, destination ETA, and current in-game clock. On map entry, `OffscreenSimulator.ts` calculates their exact tile coordinate and facing immediately.
- **Justification**: O(1) CPU cost for offscreen maps; guarantees zero pop-in and 60 FPS performance on mid-range laptops and mobile devices.

## ADR-006: Non-Destructive Obstacle Yielding & Sidestepping
- **Context**: In Stardew Valley, NPCs can destroy player chests or fences if placed in their path.
- **Decision**: In Dhaka Valley, if Moon Walker stands in an NPC's direct path, the NPC pauses for `waitSec` (default 2.0s), displays a "..." emote, and then sidesteps one tile orthogonally to continue. If completely boxed in, they repath. They never destroy player items.
- **Justification**: Preserves the whimsical, heartwarming tone of the game.

## ADR-007: Event-Driven Clock Subscription Model
- **Context**: `TimeCalendarSystem` originally used single callback slots (`onMinuteCallback`), making multi-system subscriptions fragile.
- **Decision**: Enhance `TimeCalendarSystem` with a lightweight, multi-listener event bus supporting `onMinute`, `onPhaseChanged`, `onDayStarted`, `onSeasonChanged`, and `onWeatherChanged`.
- **Justification**: Allows `ScheduleSystem`, `AtmosphereSystem`, `WeatherSystem`, and UI to subscribe concurrently without overwriting each other.
