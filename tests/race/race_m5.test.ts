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
  });
});
