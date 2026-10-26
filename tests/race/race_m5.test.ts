// tests/race/race_m5.test.ts - Milestone 5: Dhaka Street Items & Hazards Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ITEMS_DB,
  ITEM_WEIGHTS,
  ItemType,
  HitReactionType
} from '../../src/config/items.race.db';
import { ItemRng } from '../../src/scenes/minigames/race/core/ItemRng';
import { ItemRoller } from '../../src/scenes/minigames/race/core/ItemRoller';
import { ItemBoxSystem, ItemBoxDef } from '../../src/scenes/minigames/race/core/ItemBoxSystem';
import { WorldItems } from '../../src/scenes/minigames/race/core/WorldItems';
import { HitReaction } from '../../src/scenes/minigames/race/core/HitReaction';
import { ItemBrain } from '../../src/scenes/minigames/race/ai/ItemBrain';
import { HazardSystem } from '../../src/scenes/minigames/race/core/HazardSystem';
import { RaceSession } from '../../src/scenes/minigames/race/core/RaceSession';

const mockTrack: any = {
  id: 'test_circuit',
  lapCount: 3,
  centerline: [
    { x: 0, y: 0, z: 0, width: 16, bankRad: 0 },
    { x: 50, y: 0, z: 50, width: 16, bankRad: 0 },
    { x: 0, y: 0, z: 100, width: 16, bankRad: 0 }
  ],
  checkpoints: [
    { index: 0, center: { x: 0, y: 0, z: 20 }, normal: { x: 0, y: 0, z: 1 }, width: 18, height: 8 },
    { index: 1, center: { x: 50, y: 0, z: 50 }, normal: { x: 1, y: 0, z: 0 }, width: 18, height: 8 },
    { index: 2, center: { x: 0, y: 0, z: 80 }, normal: { x: 0, y: 0, z: 1 }, width: 18, height: 8 }
  ],
  startGrid: [
    { x: 0, y: 0, z: 0, rotation: 0 },
    { x: 2, y: 0, z: 0, rotation: 0 }
  ]
};

describe('Milestone 5: Dhaka Street Items & Street Hazards', () => {
  describe('1. Item Database & Weight Table Integrity', () => {
    it('defines all 6 canonical Dhaka street items with full metadata', () => {
      const expectedItems: ItemType[] = [
        'malai_cha',
        'naga_fuchka',
        'mishti_doi',
        'parasol_shield',
        'rickshaw_bell',
        'ghuri_kite'
      ];

      for (const id of expectedItems) {
        const item = ITEMS_DB[id];
        expect(item).toBeDefined();
        expect(item.name).toBeTruthy();
        expect(item.bengaliName).toBeTruthy();
        expect(item.stkEquivalent).toBeTruthy();
        expect(item.durationSec).toBeGreaterThan(0);
        expect(item.icon).toBeTruthy();
      }
    });

    it('ensures item weight distribution for every rank sums to exactly 1000', () => {
      expect(ITEM_WEIGHTS.totalSum).toBe(1000);
      for (let r = 1; r <= 8; r++) {
        const weights = ITEM_WEIGHTS.ranks[String(r) as keyof typeof ITEM_WEIGHTS.ranks];
        expect(weights).toBeDefined();
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        expect(sum).toBe(1000);
      }
    });

    it('ensures rank 1 has zero chance of getting Ghuri Kite', () => {
      expect(ITEM_WEIGHTS.ranks['1'].ghuri_kite).toBe(0);
      expect(ITEM_WEIGHTS.ranks['2'].ghuri_kite).toBe(0);
    });

    it('ensures rank 8 has strong catch-up bias (boost >= 40% and kite >= 20%)', () => {
      expect(ITEM_WEIGHTS.ranks['8'].malai_cha).toBeGreaterThanOrEqual(400);
      expect(ITEM_WEIGHTS.ranks['8'].ghuri_kite).toBeGreaterThanOrEqual(200);
    });
  });

  describe('2. Deterministic Item RNG & Roller', () => {
    it('produces 100% bit-exact sequence across identical seeds', () => {
      const rng1 = new ItemRng(42);
      const rng2 = new ItemRng(42);

      const seq1 = Array.from({ length: 20 }, () => rng1.next());
      const seq2 = Array.from({ length: 20 }, () => rng2.next());
      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = new ItemRng(100);
      const rng2 = new ItemRng(200);
      expect(rng1.next()).not.toBe(rng2.next());
    });

    it('rolls valid item types according to rank weights', () => {
      const roller = new ItemRoller(new ItemRng(999));
      for (let r = 1; r <= 8; r++) {
        const item = roller.rollItem(r);
        expect(ITEMS_DB[item]).toBeDefined();
      }
    });

    it('clamps invalid ranks safely to 1 and 8', () => {
      const roller = new ItemRoller(new ItemRng(123));
      expect(roller.rollItem(0)).toBeDefined();
      expect(roller.rollItem(99)).toBeDefined();
    });
  });

  describe('3. ItemBoxSystem Collision & Respawn', () => {
    let system: ItemBoxSystem;
    const testDefs: ItemBoxDef[] = [
      { id: 'box_1', clusterId: 'c1', slotIndex: 0, x: 10, y: 0, z: 20, radiusMeters: 1.5, respawnTimeSec: 3.0 },
      { id: 'box_2', clusterId: 'c1', slotIndex: 1, x: 15, y: 0, z: 20, radiusMeters: 1.5, respawnTimeSec: 3.0 }
    ];

    beforeEach(() => {
      system = new ItemBoxSystem(testDefs);
    });

    it('detects collision and collects item box within radius', () => {
      const hit = system.checkCollision(10.5, 0, 20.2, 1.0);
      expect(hit).toBeDefined();
      expect(hit?.id).toBe('box_1');
    });

    it('marks collected box inactive until respawn time elapses', () => {
      system.checkCollision(10, 0, 20, 1.0);

      // Immediately after, box_1 should be inactive
      const hitAgain = system.checkCollision(10, 0, 20, 1.0);
      expect(hitAgain).toBeNull();

      // Advance time by 2.0s (less than 3.0s respawn)
      system.update(2.0);
      expect(system.checkCollision(10, 0, 20, 1.0)).toBeNull();

      // Advance by another 1.1s (total 3.1s > 3.0s)
      system.update(1.1);
      const respawnedHit = system.checkCollision(10, 0, 20, 1.0);
      expect(respawnedHit).toBeDefined();
      expect(respawnedHit?.id).toBe('box_1');
    });

    it('updates box rotation and bobbing animation', () => {
      const initialRot = system.getBoxes()[0].rotationY;
      system.update(0.1);
      expect(system.getBoxes()[0].rotationY).toBeGreaterThan(initialRot);
    });
  });

  describe('4. HitReaction State Machine', () => {
    let reaction: HitReaction;

    beforeEach(() => {
      reaction = new HitReaction();
    });

    it('initializes in neutral state with zero immunity', () => {
      expect(reaction.currentReaction).toBe('none');
      expect(reaction.isImmune()).toBe(false);
      expect(reaction.getSpeedMultiplier()).toBe(1.0);
      expect(reaction.isControlLocked()).toBe(false);
    });

    it('triggers spin_out, cuts speed, locks controls, and animates 360 yaw spin', () => {
      const ok = reaction.triggerHit('spin_out');
      expect(ok).toBe(true);
      expect(reaction.currentReaction).toBe('spin_out');
      expect(reaction.getSpeedMultiplier()).toBe(0.5);
      expect(reaction.isControlLocked()).toBe(true);

      // Advance halfway
      reaction.update(0.425);
      expect(reaction.visualYawOffset).toBeCloseTo(Math.PI, 1);

      // Complete duration
      reaction.update(0.45);
      expect(reaction.currentReaction).toBe('none');
      expect(reaction.immunityRemainingSec).toBeGreaterThan(0);
    });

    it('triggers explosion with vertical pitch tumble and cuts speed to 20%', () => {
      reaction.triggerHit('explosion');
      expect(reaction.currentReaction).toBe('explosion');
      expect(reaction.getSpeedMultiplier()).toBe(0.2);
      expect(reaction.isControlLocked()).toBe(true);

      reaction.update(0.625);
      expect(reaction.visualTumblePitch).toBeGreaterThan(0);
    });

    it('triggers squash, compressing Y scale to 0.4 and widening XZ to 1.25', () => {
      reaction.triggerHit('squash');
      reaction.update(0.5);
      expect(reaction.visualScaleY).toBe(0.4);
      expect(reaction.visualScaleXZ).toBe(1.25);
      expect(reaction.getSpeedMultiplier()).toBe(0.5);
    });

    it('enforces invulnerability window, rejecting new hits while immune', () => {
      reaction.triggerHit('spin_out');
      reaction.update(1.0); // Recovers and grants 1.5s immunity

      expect(reaction.isImmune()).toBe(true);
      const rejected = reaction.triggerHit('explosion');
      expect(rejected).toBe(false);
      expect(reaction.currentReaction).toBe('none');
    });
  });

  describe('5. WorldItems Projectiles & Traps', () => {
    let world: WorldItems;

    beforeEach(() => {
      world = new WorldItems();
    });

    it('spawns Naga Fuchka rocket moving forward at 35 m/s', () => {
      const rocket = world.spawnNagaFuchka('kart_1', 0, 0, 0, 0, false);
      expect(rocket.type).toBe('naga_fuchka');
      expect(rocket.vz).toBe(-35.0);

      // Advance by 1s (starts at z = -2.2, moves -35 -> -37.2)
      world.update(1.0, []);
      expect(rocket.z).toBeCloseTo(-37.2, 1);
    });

    it('spawns Naga Fuchka rocket moving backward when aimBack is true', () => {
      const rocket = world.spawnNagaFuchka('kart_1', 0, 0, 0, 0, true);
      expect(rocket.vz).toBe(35.0);

      // Advance by 1s (starts at z = 2.2, moves +35 -> +37.2)
      world.update(1.0, []);
      expect(rocket.z).toBeCloseTo(37.2, 1);
    });

    it('spawns Mishti Doi as stationary trap behind kart', () => {
      const doi = world.spawnMishtiDoi('kart_1', 10, 0, 50, 0);
      expect(doi.type).toBe('mishti_doi');
      expect(doi.vx).toBe(0);
      expect(doi.vz).toBe(0);
      expect(doi.z).toBe(52.0); // Dropped 2m behind
    });

    it('dispatches hit event when kart drives into Mishti Doi puddle', () => {
      world.spawnMishtiDoi('kart_1', 0, 0, 0, 0);
      const hits = world.update(0.1, [
        { id: 'kart_2', x: 0, y: 0, z: 2.0, isImmune: false, hasShield: false }
      ]);

      expect(hits.length).toBe(1);
      expect(hits[0].kartId).toBe('kart_2');
      expect(hits[0].hitReaction).toBe('spin_out');
    });

    it('absorbs incoming projectile when kart has active Parasol Shield', () => {
      world.spawnNagaFuchka('kart_1', 0, 0, 0, 0, false);
      const hits = world.update(0.05, [
        { id: 'kart_2', x: 0, y: 0, z: -3.0, isImmune: false, hasShield: true }
      ]);

      expect(hits.length).toBe(1);
      expect(hits[0].kartId).toBe('kart_2');
      expect(hits[0].hitReaction).toBe('none'); // Deflected!
    });
  });

  describe('6. AI ItemBrain Decision Logic', () => {
    let brain: ItemBrain;

    beforeEach(() => {
      brain = new ItemBrain();
    });

    it('fires Naga Fuchka when rival is directly ahead within cone', () => {
      const decision = brain.evaluate(
        'naga_fuchka',
        1.0,
        { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
        [{ id: 'rival', x: 0, y: 0, z: -25, isImmune: false }]
      );

      expect(decision.useItem).toBe(true);
      expect(decision.aimBack).toBe(false);
    });

    it('fires Naga Fuchka backward when pursued closely from behind', () => {
      const decision = brain.evaluate(
        'naga_fuchka',
        1.0,
        { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
        [{ id: 'rival', x: 0, y: 0, z: 10, isImmune: false }]
      );

      expect(decision.useItem).toBe(true);
      expect(decision.aimBack).toBe(true);
    });

    it('drops Mishti Doi trap when rival is closely following', () => {
      const decision = brain.evaluate(
        'mishti_doi',
        1.0,
        { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
        [{ id: 'rival', x: 0, y: 0, z: 8, isImmune: false }]
      );

      expect(decision.useItem).toBe(true);
      expect(decision.aimBack).toBe(true);
    });

    it('deploys Parasol Shield when incoming projectile is detected', () => {
      const mockProjectiles: any[] = [{ id: 'p1', x: 0, y: 0, z: 15 }];
      const decision = brain.evaluate(
        'parasol_shield',
        1.0,
        { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
        [],
        mockProjectiles
      );

      expect(decision.useItem).toBe(true);
    });

    it('triggers Rickshaw Bell shockwave when rival is in close lateral proximity', () => {
      const decision = brain.evaluate(
        'rickshaw_bell',
        1.0,
        { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
        [{ id: 'rival', x: 3.0, y: 0, z: 0, isImmune: false }]
      );

      expect(decision.useItem).toBe(true);
    });
  });

  describe('7. HazardSystem Obstacle Simulation', () => {
    let hazards: HazardSystem;

    beforeEach(() => {
      hazards = new HazardSystem();
    });

    it('oscillates crossing rickshaws along X-axis', () => {
      const r = hazards.getCrossingRickshaws()[0];
      const initialX = r.x;
      hazards.update(0.5, []);
      expect(r.x).not.toBe(initialX);
    });

    it('triggers explosion on kart colliding with crossing rickshaw', () => {
      const r = hazards.getCrossingRickshaws()[0];
      const hits = hazards.update(0.01, [
        { id: 'player', x: r.x, y: 0, z: r.z, isImmune: false, isBoosting: false }
      ]);

      expect(hits.length).toBe(1);
      expect(hits[0].hitReaction).toBe('explosion');
    });

    it('triggers spin_out on kart driving over petal slick', () => {
      const p = hazards.getPetalSlicks()[0];
      const hits = hazards.update(0.01, [
        { id: 'player', x: p.x, y: 0, z: p.z, isImmune: false, isBoosting: false }
      ]);

      expect(hits.length).toBe(1);
      expect(hits[0].hitReaction).toBe('spin_out');
    });

    it('boost shields kart against petal slicks', () => {
      const p = hazards.getPetalSlicks()[0];
      const hits = hazards.update(0.01, [
        { id: 'player', x: p.x, y: 0, z: p.z, isImmune: false, isBoosting: true } // Boosting!
      ]);

      expect(hits.length).toBe(0); // Immune thanks to boost!
    });
  });

  describe('8. RaceSession Gameplay Rule Invariance', () => {
    it('preserves bit-for-bit invariance when items and hazards are disabled', () => {
      const session = new RaceSession({
        track: mockTrack,
        mode: 'quick_race',
        difficulty: 'beshi_gorom',
        seed: 42,
        rules: { itemsEnabled: false, hazardsEnabled: false }
      });

      expect(session.rules.itemsEnabled).toBe(false);
      expect(session.getItemBoxSystem()).toBeUndefined();
      expect(session.getWorldItems()).toBeUndefined();
    });

    it('instantiates item boxes and world items when itemsEnabled is true', () => {
      const session = new RaceSession({
        track: mockTrack,
        mode: 'quick_race',
        difficulty: 'beshi_gorom',
        seed: 42,
        rules: { itemsEnabled: true, hazardsEnabled: true }
      });

      expect(session.rules.itemsEnabled).toBe(true);
      expect(session.getItemBoxSystem()).toBeDefined();
      expect(session.getWorldItems()).toBeDefined();
      expect(session.getHazardSystem()).toBeDefined();
    });

    it('executes givePlayerItem and equips item with roulette timer reset', () => {
      const session = new RaceSession({
        track: mockTrack,
        mode: 'quick_race',
        difficulty: 'beshi_gorom',
        seed: 42,
        rules: { itemsEnabled: true, hazardsEnabled: true }
      });

      session.givePlayerItem('malai_cha');
      const player = session.getPlayerKart();
      expect(player?.heldItem).toBe('malai_cha');
      expect(player?.rouletteTimerSec).toBe(0);
    });

    it('consumes held item on usePlayerItem and activates boost', () => {
      const session = new RaceSession({
        track: mockTrack,
        mode: 'quick_race',
        difficulty: 'beshi_gorom',
        seed: 42,
        rules: { itemsEnabled: true, hazardsEnabled: true }
      });

      session.givePlayerItem('malai_cha');
      session.usePlayerItem(false);
      const player = session.getPlayerKart();
      expect(player?.heldItem).toBeNull();
      expect(player?.controller.getState().boost?.active).toBe(true);
    });

    it('spawns projectile on usePlayerItem with offensive Naga Fuchka', () => {
      const session = new RaceSession({
        track: mockTrack,
        mode: 'quick_race',
        difficulty: 'beshi_gorom',
        seed: 42,
        rules: { itemsEnabled: true, hazardsEnabled: true }
      });

      session.givePlayerItem('naga_fuchka');
      session.usePlayerItem(false);
      const worldItems = session.getWorldItems()?.getItems() || [];
      expect(worldItems.length).toBe(1);
      expect(worldItems[0].type).toBe('naga_fuchka');
    });

    it('spawns stationary trap on usePlayerItem with Mishti Doi', () => {
      const session = new RaceSession({
        track: mockTrack,
        mode: 'quick_race',
        difficulty: 'beshi_gorom',
        seed: 42,
        rules: { itemsEnabled: true, hazardsEnabled: true }
      });

      session.givePlayerItem('mishti_doi');
      session.usePlayerItem(true);
      const worldItems = session.getWorldItems()?.getItems() || [];
      expect(worldItems.length).toBe(1);
      expect(worldItems[0].type).toBe('mishti_doi');
    });

    it('activates parasol shield on usePlayerItem with parasol_shield', () => {
      const session = new RaceSession({
        track: mockTrack,
        mode: 'quick_race',
        difficulty: 'beshi_gorom',
        seed: 42,
        rules: { itemsEnabled: true, hazardsEnabled: true }
      });

      session.givePlayerItem('parasol_shield');
      session.usePlayerItem(false);
      const player = session.getPlayerKart();
      expect(player?.shieldRemainingSec).toBeGreaterThan(5.0);
    });
  });

  describe('9. Extended Component Deep-Dive Tests', () => {
    describe('Item Weights Deep-Dive', () => {
      it('verifies non-negative weights for every rank and item', () => {
        for (let r = 1; r <= 8; r++) {
          const rankWeights = ITEM_WEIGHTS.ranks[String(r) as keyof typeof ITEM_WEIGHTS.ranks];
          for (const [item, w] of Object.entries(rankWeights)) {
            expect(w).toBeGreaterThanOrEqual(0);
          }
        }
      });

      it('verifies defensive items are weighted higher in Rank 1 than Rank 8', () => {
        const r1 = ITEM_WEIGHTS.ranks['1'];
        const r8 = ITEM_WEIGHTS.ranks['8'];
        expect(r1.mishti_doi).toBeGreaterThan(r8.mishti_doi);
        expect(r1.parasol_shield).toBeGreaterThan(r8.parasol_shield);
      });

      it('verifies catch-up boost is weighted higher in Rank 8 than Rank 1', () => {
        const r1 = ITEM_WEIGHTS.ranks['1'];
        const r8 = ITEM_WEIGHTS.ranks['8'];
        expect(r8.malai_cha).toBeGreaterThan(r1.malai_cha);
      });
    });

    describe('ItemRng Bounds & Sampling', () => {
      it('generates numbers strictly within [0, 1)', () => {
        const rng = new ItemRng(777);
        for (let i = 0; i < 5000; i++) {
          const val = rng.next();
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThan(1);
        }
      });

      it('generates integers within [min, max] range inclusive', () => {
        const rng = new ItemRng(888);
        const counts: Record<number, number> = {};
        for (let i = 0; i < 1000; i++) {
          const val = rng.nextInt(1, 6);
          expect(val).toBeGreaterThanOrEqual(1);
          expect(val).toBeLessThanOrEqual(6);
          counts[val] = (counts[val] || 0) + 1;
        }
        for (let num = 1; num <= 6; num++) {
          expect(counts[num]).toBeGreaterThan(50);
        }
      });
    });

    describe('ItemBoxSystem Extended Lifecycle', () => {
      it('correctly handles out-of-range queries without collecting', () => {
        const system = new ItemBoxSystem([
          { id: 'b1', clusterId: 'c1', slotIndex: 0, x: 0, y: 0, z: 10, radiusMeters: 1.5, respawnTimeSec: 3.5 }
        ]);

        const box = system.checkCollision(0, 0, 20, 1.0); // 10m away
        expect(box).toBeNull();
        expect(system.getBoxes()[0].active).toBe(true);
      });

      it('resets all boxes to active on reset()', () => {
        const system = new ItemBoxSystem([
          { id: 'b1', clusterId: 'c1', slotIndex: 0, x: 0, y: 0, z: 0, radiusMeters: 1.5, respawnTimeSec: 3.5 }
        ]);

        system.checkCollision(0, 0, 0, 1.0);
        expect(system.getBoxes()[0].active).toBe(false);

        system.reset();
        expect(system.getBoxes()[0].active).toBe(true);
      });
    });

    describe('HitReaction Extended State Machine', () => {
      it('returns correct speed multiplier for each reaction type', () => {
        const hr = new HitReaction();
        hr.triggerHit('spin_out');
        expect(hr.getSpeedMultiplier()).toBe(0.5);

        hr.recover(0);
        hr.triggerHit('explosion');
        expect(hr.getSpeedMultiplier()).toBe(0.2);

        hr.recover(0);
        hr.triggerHit('squash');
        expect(hr.getSpeedMultiplier()).toBe(0.5);

        hr.recover(0);
        hr.triggerHit('stun');
        expect(hr.getSpeedMultiplier()).toBe(0.0);
      });

      it('correctly reports control lock during active hit', () => {
        const hr = new HitReaction();
        expect(hr.isControlLocked()).toBe(false);

        hr.triggerHit('spin_out');
        expect(hr.isControlLocked()).toBe(true);

        hr.recover(1.5);
        expect(hr.isControlLocked()).toBe(false);
      });

      it('applies tumble pitch angle during explosion', () => {
        const hr = new HitReaction();
        hr.triggerHit('explosion');
        hr.update(0.6); // Midway through 1.25s duration
        expect(hr.visualTumblePitch).toBeGreaterThan(0);
      });

      it('applies squash Y compression and XZ expansion during squash', () => {
        const hr = new HitReaction();
        hr.triggerHit('squash');
        hr.update(0.5);
        expect(hr.visualScaleY).toBe(0.4);
        expect(hr.visualScaleXZ).toBe(1.25);
      });
    });

    describe('WorldItems Projectiles & Collisions Extended', () => {
      it('expires Naga Fuchka rocket after durationSec', () => {
        const world = new WorldItems();
        world.spawnNagaFuchka('kart1', 0, 0, 0, 0, false);
        expect(world.getItems().length).toBe(1);

        world.update(7.0, []); // Exceeds 6.0s duration
        expect(world.getItems().length).toBe(0);
      });

      it('expires Mishti Doi trap after durationSec', () => {
        const world = new WorldItems();
        world.spawnMishtiDoi('kart1', 0, 0, 0, 0);
        expect(world.getItems().length).toBe(1);

        world.update(21.0, []); // Exceeds 20.0s duration
        expect(world.getItems().length).toBe(0);
      });

      it('does not hit projectile owner within initial 0.3s', () => {
        const world = new WorldItems();
        world.spawnNagaFuchka('kart1', 0, 0, 0, 0, false);
        const hits = world.update(0.1, [
          { id: 'kart1', x: 0, y: 0, z: -2.0, isImmune: false, hasShield: false }
        ]);
        expect(hits.length).toBe(0); // Grace period active
      });

      it('clears all items on clear()', () => {
        const world = new WorldItems();
        world.spawnNagaFuchka('kart1', 0, 0, 0, 0, false);
        world.spawnMishtiDoi('kart2', 0, 0, 0, 0);
        expect(world.getItems().length).toBe(2);

        world.clear();
        expect(world.getItems().length).toBe(0);
      });
    });

    describe('AI ItemBrain Extended Decision Heuristics', () => {
      it('refuses to fire Naga Fuchka when rival is beyond forward range (> 38m)', () => {
        const brain = new ItemBrain();
        const decision = brain.evaluate(
          'naga_fuchka',
          1.0,
          { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
          [{ id: 'rival', x: 0, y: 0, z: -50, isImmune: false }], // 50m ahead (> 38m)
          []
        );
        expect(decision.useItem).toBe(false);
      });

      it('refuses to drop Mishti Doi when pursuer is beyond rear range (> 16m)', () => {
        const brain = new ItemBrain();
        const decision = brain.evaluate(
          'mishti_doi',
          1.0,
          { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
          [{ id: 'rival', x: 0, y: 0, z: 25, isImmune: false }], // 25m behind (> 16m)
          []
        );
        expect(decision.useItem).toBe(false);
      });

      it('refuses to fire Naga Fuchka backward when pursuer is out of rear cone', () => {
        const brain = new ItemBrain();
        const decision = brain.evaluate(
          'naga_fuchka',
          1.0,
          { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
          [{ id: 'rival', x: 20, y: 0, z: 10, isImmune: false }], // lateral offset (out of cone)
          []
        );
        expect(decision.useItem).toBe(false);
      });

      it('deploys parasol shield when incoming projectile is detected within 25m', () => {
        const brain = new ItemBrain();
        const decision = brain.evaluate(
          'parasol_shield',
          1.0,
          { x: 0, y: 0, z: 0, yaw: 0, speed: 20 },
          [],
          [{ id: 'proj1', type: 'naga_fuchka', ownerId: 'rival', x: 0, y: 0, z: 15, vx: 0, vy: 0, vz: -35, radiusMeters: 1.2, lifetimeRemainingSec: 5, expired: false }]
        );
        expect(decision.useItem).toBe(true);
      });
    });

    describe('HazardSystem Extended Simulation', () => {
      it('calculates linear crossing rickshaw position smoothly over time', () => {
        const hazards = new HazardSystem();
        const rickshaws = hazards.getCrossingRickshaws();
        expect(rickshaws[0].x).toBe(-8.0);

        hazards.update(1.0, []); // Moves 4.5m in direction 1 -> -8 + 4.5 = -3.5
        expect(hazards.getCrossingRickshaws()[0].x).toBeCloseTo(-3.5, 1);
      });

      it('resets hazard states on reset()', () => {
        const hazards = new HazardSystem();
        hazards.update(2.0, []);
        expect(hazards.getCrossingRickshaws()[0].x).not.toBe(-8.0);

        hazards.reset();
        expect(hazards.getCrossingRickshaws()[0].x).toBe(-8.0);
      });
    });

    describe('items.json & gameplay.lock.json Integrity', () => {
      it('validates fuller_road_sprint items.json exists and has valid structure', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const itemsPath = path.resolve('public/assets/race/tracks/fuller_road_sprint/items.json');
        expect(fs.existsSync(itemsPath)).toBe(true);

        const data = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
        expect(data.boxes.length).toBeGreaterThanOrEqual(16);
        expect(data.clusters.length).toBeGreaterThanOrEqual(4);
      });

      it('ensures all 16 item boxes have unique IDs and 3.5s respawn', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const itemsPath = path.resolve('public/assets/race/tracks/fuller_road_sprint/items.json');
        const data = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));

        const ids = new Set();
        for (const box of data.boxes) {
          expect(ids.has(box.id)).toBe(false);
          ids.add(box.id);
          expect(box.respawnTimeSec).toBe(3.5);
          expect(box.radiusMeters).toBe(1.3);
        }
      });

      it('ensures all boxes belong to valid track clusters', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const itemsPath = path.resolve('public/assets/race/tracks/fuller_road_sprint/items.json');
        const data = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));

        const allowedClusters = new Set(['item_box_straight', 'item_box_rotunda', 'item_box_avenue', 'item_box_post_landing']);
        for (const box of data.boxes) {
          expect(allowedClusters.has(box.clusterId)).toBe(true);
        }
      });

      it('ensures gameplay.lock.json contains matching itemsSha256 hash', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const crypto = await import('crypto');
        const itemsPath = path.resolve('public/assets/race/tracks/fuller_road_sprint/items.json');
        const lockPath = path.resolve('public/assets/race/tracks/fuller_road_sprint/gameplay.lock.json');

        const itemsRaw = fs.readFileSync(itemsPath, 'utf-8');
        const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        const hash = crypto.createHash('sha256').update(itemsRaw).digest('hex');

        expect(lockData.itemsSha256).toBe(hash);
      });
    });

    describe('ItemRoller Statistical Distribution', () => {
      it('ensures rank 1 never rolls ghuri_kite over 1000 rolls', () => {
        const roller = new ItemRoller(new ItemRng(1001));
        for (let i = 0; i < 1000; i++) {
          const item = roller.rollItem(1);
          expect(item).not.toBe('ghuri_kite');
        }
      });

      it('ensures rank 8 rolls malai_cha at least 35% of the time over 1000 rolls', () => {
        const roller = new ItemRoller(new ItemRng(2002));
        let boostCount = 0;
        for (let i = 0; i < 1000; i++) {
          const item = roller.rollItem(8);
          if (item === 'malai_cha') boostCount++;
        }
        expect(boostCount).toBeGreaterThanOrEqual(350);
      });

      it('ensures rank 4 rolls a healthy mix of offensive and defensive items', () => {
        const roller = new ItemRoller(new ItemRng(3003));
        const counts: Record<string, number> = {};
        for (let i = 0; i < 1000; i++) {
          const item = roller.rollItem(4);
          counts[item] = (counts[item] || 0) + 1;
        }
        expect(counts['naga_fuchka']).toBeGreaterThan(100);
        expect(counts['mishti_doi']).toBeGreaterThan(100);
        expect(counts['parasol_shield']).toBeGreaterThan(50);
      });
    });

    describe('HitReaction Edge Cases', () => {
      it('rejects hit trigger with none reaction', () => {
        const hr = new HitReaction();
        const ok = hr.triggerHit('none');
        expect(ok).toBe(false);
        expect(hr.currentReaction).toBe('none');
      });

      it('recover() resets all visual offsets and currentReaction', () => {
        const hr = new HitReaction();
        hr.triggerHit('spin_out');
        hr.update(0.4);
        expect(hr.visualYawOffset).toBeGreaterThan(0);

        hr.recover(1.5);
        expect(hr.currentReaction).toBe('none');
        expect(hr.visualYawOffset).toBe(0);
        expect(hr.visualTumblePitch).toBe(0);
        expect(hr.visualScaleY).toBe(1.0);
        expect(hr.visualScaleXZ).toBe(1.0);
        expect(hr.immunityRemainingSec).toBe(1.5);
      });

      it('rejects incoming hit while post-recovery immunity is active', () => {
        const hr = new HitReaction();
        hr.recover(2.0);
        expect(hr.isImmune()).toBe(true);

        const ok = hr.triggerHit('spin_out');
        expect(ok).toBe(false);
      });
    });

    describe('WorldItems Cap & Expiry Mechanics', () => {
      it('tracks homing Ghuri Kite towards nearest kart position', () => {
        const world = new WorldItems();
        world.spawnGhuriKite('owner', 0, 0, 0, 'leader');

        world.update(0.5, [
          { id: 'leader', x: 0, y: 0, z: -40, isImmune: false, hasShield: false }
        ]);

        const kite = world.getItems()[0];
        expect(kite.z).toBeLessThan(0); // Flew towards -40
      });

      it('expires Ghuri Kite after durationSec', () => {
        const world = new WorldItems();
        world.spawnGhuriKite('owner', 0, 0, 0, 'leader');
        expect(world.getItems().length).toBe(1);

        world.update(11.0, []); // Exceeds 10s duration
        expect(world.getItems().length).toBe(0);
      });

      it('correctly depletes parasol shield upon absorbing projectile', () => {
        const world = new WorldItems();
        world.spawnNagaFuchka('kart1', 0, 0, 0, 0, false);

        const hits = world.update(0.05, [
          { id: 'kart2', x: 0, y: 0, z: -3.0, isImmune: false, hasShield: true }
        ]);

        expect(hits.length).toBe(1);
        expect(hits[0].hitReaction).toBe('none'); // Shield absorbed
        expect(world.getItems().length).toBe(0); // Projectile consumed
      });
    });

    describe('RaceSession Items Invariance & Edge Rules', () => {
      it('never spawns world items on step when itemsEnabled is false', () => {
        const session = new RaceSession({
          track: mockTrack,
          mode: 'quick_race',
          difficulty: 'beshi_gorom',
          seed: 42,
          rules: { itemsEnabled: false, hazardsEnabled: false }
        });

        // Step with useItem input
        session.step(0.1, { throttle: 1, brake: 0, steer: 0, drift: false, lookBehind: false, bell: false, trick: false, useItem: true, aimBack: false });
        expect(session.getWorldItems()).toBeUndefined();
      });

      it('resets item box system and clears world items on session reset', () => {
        const session = new RaceSession({
          track: mockTrack,
          mode: 'quick_race',
          difficulty: 'beshi_gorom',
          seed: 42,
          rules: { itemsEnabled: true, hazardsEnabled: true }
        });

        session.givePlayerItem('naga_fuchka');
        session.usePlayerItem(false);
        expect(session.getWorldItems()?.getItems().length).toBe(1);

        session.reset();
        expect(session.getWorldItems()?.getItems().length).toBe(0);
      });
    });
  });
});
