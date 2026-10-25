// tests/race/race_m3.test.ts - Unit test suite for Milestone 3 (Track Pipeline, BVH, Laps, Checkpoints, Rescue)
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  TrackSpline,
  LapTracker,
  RaceStateMachine,
  RescueSystem,
  TrackValidator,
  TrackAutopilot,
  BvhGroundQuery,
  BvhCollisionWorld,
  KartController
} from '../../src/scenes/minigames/race';
import { CheckpointGate, SplinePoint, TrackDefinition } from '../../src/types/race.types';

describe('Milestone 3: Track Pipeline & 3D Spatial Systems', () => {

  // ── 1. BvhGroundQuery Tests ───────────────────────────────────────────────
  describe('BvhGroundQuery', () => {
    let groundMesh: THREE.Mesh;
    let query: BvhGroundQuery;

    beforeEach(() => {
      // Create a stepped multi-level terrain:
      // Lower ground: Plane at y = 0
      // Upper bridge: Box at y = 6.0
      const geom = new THREE.PlaneGeometry(50, 50);
      geom.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ name: 'surf_asphalt' });
      groundMesh = new THREE.Mesh(geom, mat);
      query = new BvhGroundQuery(groundMesh);
    });

    it('queries flat ground height accurately', () => {
      const res = query.queryGround(0, 0.5, 0);
      expect(res.onGround).toBe(true);
      expect(res.height).toBeCloseTo(0.0, 2);
      expect(res.type).toBe('asphalt');
    });

    it('identifies ground normal vector (0, 1, 0) for flat plane', () => {
      const res = query.queryGround(5, 2.0, 5);
      expect(res.normalY).toBeCloseTo(1.0, 2);
      expect(res.normalX).toBeCloseTo(0.0, 2);
      expect(res.normalZ).toBeCloseTo(0.0, 2);
    });

    it('correctly parses canonical surface names from materials', () => {
      expect(query.parseSurfaceName('surf_asphalt')).toBe('asphalt');
      expect(query.parseSurfaceName('surf_grass_infield')).toBe('grass');
      expect(query.parseSurfaceName('surf_mud_chicane')).toBe('mud');
      expect(query.parseSurfaceName('surf_puddle_water')).toBe('puddle');
      expect(query.parseSurfaceName('surf_boostpad_petal')).toBe('boost_pad');
      expect(query.parseSurfaceName('surf_ramp_jump')).toBe('ramp');
      expect(query.parseSurfaceName('surf_offtrack_kill')).toBe('offtrack_kill');
    });

    it('handles multi-level flyovers and picks highest hit below ray origin', () => {
      // Build two-tier geometry: Ground at y = 0, Bridge at y = 6
      const lowerGeom = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2);
      const upperGeom = new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2);
      upperGeom.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 6.0, 0));

      const merged = BufferGeometryUtils.mergeGeometries([lowerGeom, upperGeom], false);
      const multiQuery = new BvhGroundQuery(merged);

      // Kart driving on upper bridge at y = 6.0 (ray starts at y = 8.0)
      const upperRes = multiQuery.queryGround(0, 6.0, 0);
      expect(upperRes.height).toBeCloseTo(6.0, 1);

      // Kart driving on lower ground at y = 0.0 (bridge above at y = 6.0, ray starts at y = 2.0)
      const lowerRes = multiQuery.queryGround(0, 0.0, 0);
      expect(lowerRes.height).toBeCloseTo(0.0, 1);
    });

    it('reports isKillPlane when query lands on offtrack_kill surface or below -15m', () => {
      const killGeom = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2);
      const killMesh = new THREE.Mesh(killGeom, new THREE.MeshBasicMaterial({ name: 'surf_offtrack_kill' }));
      const killQuery = new BvhGroundQuery(killMesh);

      const res = killQuery.queryGround(0, 0.5, 0);
      expect(res.isKillPlane).toBe(true);
      expect(res.type).toBe('offtrack_kill');
    });

    it('identifies tilted normal on inclined ramp', () => {
      const rampGeom = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2 + 0.3);
      const rampQuery = new BvhGroundQuery(rampGeom);

      const res = rampQuery.queryGround(0, 0.5, 0);
      expect(res.normalY).toBeLessThan(1.0);
      expect(res.normalZ).not.toBe(0);
    });

    it('recognizes boost pad surface from material name', () => {
      const padGeom = new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2);
      const padMesh = new THREE.Mesh(padGeom, new THREE.MeshBasicMaterial({ name: 'surf_boostpad_petal' }));
      const padQuery = new BvhGroundQuery(padMesh);

      const res = padQuery.queryGround(0, 0.5, 0);
      expect(res.isBoostPad).toBe(true);
      expect(res.type).toBe('boost_pad');
    });

    it('recognizes ramp surface and returns ramp inclination angle', () => {
      const rampGeom = new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2 + 0.28);
      const rampMesh = new THREE.Mesh(rampGeom, new THREE.MeshBasicMaterial({ name: 'surf_ramp_jump' }));
      const rampQuery = new BvhGroundQuery(rampMesh);

      const res = rampQuery.queryGround(0, 0.5, 0);
      expect(res.isRamp).toBe(true);
      expect(res.rampAngleRad).toBeCloseTo(0.28, 1);
    });
  });

  // ── 2. BvhCollisionWorld Tests ────────────────────────────────────────────
  describe('BvhCollisionWorld', () => {
    let wallMesh: THREE.Mesh;
    let colWorld: BvhCollisionWorld;

    beforeEach(() => {
      // A wall barrier box at x = 10, spanning z = -20 to 20, height = 2m
      const wallGeom = new THREE.BoxGeometry(1.0, 2.0, 40.0);
      wallMesh = new THREE.Mesh(wallGeom, new THREE.MeshBasicMaterial({ name: 'wall_barrier' }));
      wallMesh.position.set(10, 1.0, 0);
      wallMesh.updateMatrixWorld(true);

      const bakedGeom = wallGeom.clone().applyMatrix4(wallMesh.matrixWorld);
      colWorld = new BvhCollisionWorld(bakedGeom);
    });

    it('detects 3D sphere collision when within kart radius of wall', () => {
      // Wall center at x = 10, width = 1.0 -> front edge is x = 9.5
      // Kart at x = 9.0 with radius = 0.75 -> overlaps (9.0 + 0.75 = 9.75 > 9.5)
      const hit = colWorld.checkCollision3D(9.0, 1.0, 0, 0.75);
      expect(hit).not.toBeNull();
      expect(hit?.collided).toBe(true);
      expect(hit?.normalX).toBeCloseTo(-1.0, 1);
    });

    it('returns null when kart is clear of wall', () => {
      const hit = colWorld.checkCollision3D(5.0, 1.0, 0, 0.75);
      expect(hit).toBeNull();
    });

    it('resolves glancing collision (<40 deg) with slide velocity preserved', () => {
      // Driving forward along -Z at angle: velX = 2.0, velZ = -20.0
      // Normal points along -X
      const collision = colWorld.checkCollision3D(9.2, 1.0, 0, 0.75)!;
      expect(collision).not.toBeNull();

      const resolved = colWorld.resolveResponse(9.2, 0, 2.0, -20.0, collision);
      expect(resolved.cancelDrift).toBe(false);
      // Tangential velocity along Z retained with slight glancing slide friction (0.92)
      expect(resolved.newVelZ).toBeCloseTo(-18.4, 1);
      // Penetration resolved by pushing out along normal
      expect(resolved.newPosX).toBeLessThan(9.2);
    });

    it('resolves head-on collision (>=40 deg) with bounce and drift cancellation', () => {
      // Driving directly into wall along +X: velX = 22.0, velZ = 0
      const collision = colWorld.checkCollision3D(9.2, 1.0, 0, 0.75)!;
      expect(collision).not.toBeNull();

      const resolved = colWorld.resolveResponse(9.2, 0, 22.0, 0.0, collision);
      expect(resolved.cancelDrift).toBe(true);
      // Velocity reflected backwards away from wall
      expect(resolved.newVelX).toBeLessThan(0);
    });

    it('disposes BVH boundsTree without error', () => {
      expect(() => colWorld.dispose()).not.toThrow();
    });
  });

  // ── 3. TrackSpline Tests ──────────────────────────────────────────────────
  describe('TrackSpline', () => {
    let spline: TrackSpline;
    const points: SplinePoint[] = [
      { x: 0, y: 0, z: 0, width: 16.0 },
      { x: 0, y: 0, z: -100, width: 16.0 },
      { x: 50, y: 0, z: -100, width: 20.0 },
      { x: 50, y: 0, z: 0, width: 20.0 }
    ];

    beforeEach(() => {
      spline = new TrackSpline(points, true, 200);
    });

    it('computes positive total arc length of closed circuit', () => {
      const len = spline.getTotalLength();
      expect(len).toBeGreaterThan(250);
    });

    it('interpolates points smoothly along parameter t in [0, 1]', () => {
      const p0 = spline.getPoint(0.0);
      const pMid = spline.getPoint(0.5);
      expect(p0.x).toBeCloseTo(0, 1);
      expect(p0.z).toBeCloseTo(0, 1);
      expect(pMid.x).toBeCloseTo(50, 1);
      expect(pMid.z).toBeCloseTo(-100, 1);
    });

    it('findNearest accurately locates closest point and lateral distance', () => {
      const pMid = spline.getPoint(0.25);
      const res = spline.findNearest(pMid.x, pMid.y, pMid.z);
      expect(res.closestPoint.x).toBeCloseTo(pMid.x, 1);
      expect(res.closestPoint.z).toBeCloseTo(pMid.z, 1);
      expect(res.distanceFromCenter).toBeCloseTo(0, 1);
    });

    it('detects wrong-way travel when kart velocity opposes spline tangent (>100 deg)', () => {
      // Tangent at t = 0.1 heads along -Z: (0, 0, -1)
      const res = spline.findNearest(0, 0, -50);
      // Kart heading along +Z at 15 m/s (reversing)
      const wrongWay = spline.isWrongWay(res.t, 0, 15.0);
      expect(wrongWay).toBe(true);

      // Kart heading along -Z at 15 m/s (correct way)
      const correctWay = spline.isWrongWay(res.t, 0, -15.0);
      expect(correctWay).toBe(false);
    });

    it('computes monotonic normalized race progress across laps', () => {
      const prog1 = spline.computeRaceProgress(1, 0.25);
      const prog2 = spline.computeRaceProgress(1, 0.75);
      const prog3 = spline.computeRaceProgress(2, 0.10);
      expect(prog2).toBeGreaterThan(prog1);
      expect(prog3).toBeGreaterThan(prog2);
    });

    it('interpolates track widths across spline control points', () => {
      const p0 = spline.findNearest(0, 0, 0);
      const pTurn = spline.findNearest(50, 0, -100);
      expect(p0.width).toBeCloseTo(16.0, 1);
      expect(pTurn.width).toBeCloseTo(20.0, 1);
    });

    it('returns normalized tangent vector at parameter t', () => {
      const tan = spline.getTangent(0.0);
      const len = Math.hypot(tan.x, tan.y, tan.z);
      expect(len).toBeCloseTo(1.0, 2);
    });
  });

  // ── 4. LapTracker & Anti-Cheat Tests ───────────────────────────────────────
  describe('LapTracker', () => {
    let gates: CheckpointGate[];
    let tracker: LapTracker;

    beforeEach(() => {
      // 4 checkpoints along a square circuit
      gates = [
        { id: 0, center: { x: 0, y: 0, z: -50 }, normal: { x: 0, y: 0, z: -1 }, width: 18, height: 8 },
        { id: 1, center: { x: 25, y: 0, z: -100 }, normal: { x: 1, y: 0, z: 0 }, width: 18, height: 8 },
        { id: 2, center: { x: 50, y: 0, z: -50 }, normal: { x: 0, y: 0, z: 1 }, width: 18, height: 8 },
        { id: 3, center: { x: 0, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 }, width: 18, height: 8 } // Finish Line
      ];
      tracker = new LapTracker(gates, 3);
      tracker.startRace(1000);
    });

    it('registers gate crossing when motion segment pierces gate plane in correct direction', () => {
      const res = tracker.update(0, 0, -45, 0, 0, -55, 1500);
      expect(res.gatePassed).toBe(true);
      expect(res.gateId).toBe(0);
      expect(tracker.getNextGateIndex()).toBe(1);
    });

    it('anti-cheat strictly rejects reversing across gate plane (from front to behind)', () => {
      // Moving from z = -55 to z = -45 (reversing across gate 0)
      const res = tracker.update(0, 0, -55, 0, 0, -45, 1500);
      expect(res.gatePassed).toBe(false);
      expect(tracker.getNextGateIndex()).toBe(0);
    });

    it('anti-cheat rejects skipping gates out of sequence', () => {
      // Try to jump straight to gate 2 without crossing gate 0 or 1
      const res = tracker.update(50, 0, -55, 50, 0, -45, 2000);
      expect(res.gatePassed).toBe(false);
      expect(tracker.getNextGateIndex()).toBe(0);
    });

    it('supports shortcut any-of alternative gates with matching groupId', () => {
      const shortcutGates: CheckpointGate[] = [
        { id: 0, center: { x: 0, y: 0, z: -20 }, normal: { x: 0, y: 0, z: -1 }, width: 18, height: 8 },
        // Branching gates (Main road vs Grass shortcut)
        { id: 1, groupId: 'shortcut_1', center: { x: 10, y: 0, z: -50 }, normal: { x: 0, y: 0, z: -1 }, width: 12, height: 8 },
        { id: 2, groupId: 'shortcut_1', center: { x: -10, y: 0, z: -50 }, normal: { x: 0, y: 0, z: -1 }, width: 8, height: 8 },
        { id: 3, center: { x: 0, y: 0, z: -80 }, normal: { x: 0, y: 0, z: -1 }, width: 18, height: 8 }
      ];

      const sTracker = new LapTracker(shortcutGates, 1);
      sTracker.startRace();

      // Pass gate 0
      sTracker.update(0, 0, -15, 0, 0, -25);
      expect(sTracker.getNextGateIndex()).toBe(1);

      // Pass shortcut alternative (Gate 2)
      const res = sTracker.update(-10, 0, -45, -10, 0, -55);
      expect(res.gatePassed).toBe(true);
      expect(res.gateId).toBe(2);
      // Advances directly past both gate 1 and gate 2 to gate 3!
      expect(sTracker.getNextGateIndex()).toBe(3);
    });

    it('tracks lap splits and triggers raceFinished after 3 full laps', () => {
      for (let lap = 1; lap <= 3; lap++) {
        tracker.update(0, 0, -45, 0, 0, -55, lap * 20000);
        tracker.update(20, 0, -100, 30, 0, -100, lap * 20000 + 5000);
        tracker.update(50, 0, -55, 50, 0, -45, lap * 20000 + 10000);
        const lapRes = tracker.update(5, 0, 0, -5, 0, 0, lap * 20000 + 15000);

        expect(lapRes.lapCompleted).toBe(true);
        if (lap === 3) {
          expect(lapRes.raceFinished).toBe(true);
        } else {
          expect(lapRes.raceFinished).toBe(false);
          expect(lapRes.currentLap).toBe(lap + 1);
        }
      }

      const finalState = tracker.getState();
      expect(finalState.raceFinished).toBe(true);
      expect(finalState.splits.length).toBe(3);
      expect(finalState.bestLapMs).toBeGreaterThan(0);
    });

    it('rejects crossing gate when lateral distance exceeds gate half-width', () => {
      // Gate width is 18m -> half-width is 9m
      // Moving at x = 12m (lateral distance = 12 > 9)
      const res = tracker.update(12, 0, -45, 12, 0, -55, 1500);
      expect(res.gatePassed).toBe(false);
    });

    it('rejects crossing gate when vertical distance exceeds gate half-height', () => {
      // Gate height is 8m -> half-height is 4m
      // Moving at y = 6m (vertical distance = 6 > 4)
      const res = tracker.update(0, 6, -45, 0, 6, -55, 1500);
      expect(res.gatePassed).toBe(false);
    });

    it('resets all progress on startRace', () => {
      tracker.update(0, 0, -45, 0, 0, -55, 1500);
      expect(tracker.getNextGateIndex()).toBe(1);
      tracker.startRace();
      expect(tracker.getNextGateIndex()).toBe(0);
      expect(tracker.getState().splits).toHaveLength(0);
    });
  });

  // ── 5. RaceStateMachine Tests ─────────────────────────────────────────────
  describe('RaceStateMachine', () => {
    let sm: RaceStateMachine;

    beforeEach(() => {
      sm = new RaceStateMachine(1.5);
    });

    it('starts in loading phase', () => {
      expect(sm.getPhase()).toBe('loading');
    });

    it('transitions to intro upon track loading', () => {
      sm.notifyTrackLoaded();
      expect(sm.getPhase()).toBe('intro');
    });

    it('automatically transitions from intro to countdown after intro duration', () => {
      sm.notifyTrackLoaded();
      sm.update(1.0);
      expect(sm.getPhase()).toBe('intro');
      sm.update(0.6); // Total 1.6s > 1.5s
      expect(sm.getPhase()).toBe('countdown');
    });

    it('transitions to racing on notifyGo', () => {
      sm.startCountdown();
      sm.notifyGo();
      expect(sm.getPhase()).toBe('racing');
      expect(sm.isRacing()).toBe(true);
    });

    it('notifies listeners on phase change and race finish', () => {
      let notifiedFinish = false;
      sm.addListener({
        onRaceFinished: () => { notifiedFinish = true; }
      });

      sm.transitionTo('racing');
      sm.finish();
      expect(sm.getPhase()).toBe('finished');
      expect(notifiedFinish).toBe(true);
    });
  });

  // ── 6. RescueSystem Tests ─────────────────────────────────────────────────
  describe('RescueSystem', () => {
    let rescue: RescueSystem;
    const gate: CheckpointGate = {
      id: 2,
      center: { x: 50, y: 0, z: -30 },
      normal: { x: 0, y: 0, z: -1 },
      width: 16,
      height: 8
    };

    beforeEach(() => {
      rescue = new RescueSystem(-8.0, 3.5);
    });

    it('triggers rescue when kart falls below killPlaneY', () => {
      const dummyKart = {
        x: 50, y: -9.5, z: -30, speed: 10,
        surface: 'asphalt', air: { isAirborne: true }
      } as any;

      const res = rescue.update(0.1, dummyKart, 1.0, gate, true);
      expect(res.triggerRescue).toBe(true);
      expect(rescue.isRescuing()).toBe(true);
    });

    it('triggers rescue when kart hits offtrack_kill surface', () => {
      const dummyKart = {
        x: 50, y: 0, z: -30, speed: 5,
        surface: 'offtrack_kill', air: { isAirborne: false }
      } as any;

      const res = rescue.update(0.1, dummyKart, 1.0, gate, true);
      expect(res.triggerRescue).toBe(true);
    });

    it('triggers rescue when kart is stuck (throttle held with near-zero speed for 3.5s)', () => {
      const dummyKart = {
        x: 50, y: 0, z: -30, speed: 0.1,
        surface: 'asphalt', air: { isAirborne: false }
      } as any;

      let res = rescue.update(3.0, dummyKart, 1.0, gate, true);
      expect(res.triggerRescue).toBe(false);

      res = rescue.update(0.6, dummyKart, 1.0, gate, true); // Total 3.6s > 3.5s
      expect(res.triggerRescue).toBe(true);
    });

    it('spawns kart facing forward at last passed checkpoint upon rescue completion', () => {
      const pose = rescue.getRespawnPose(gate);
      // Gate center is (50, 0, -30), normal is (0, 0, -1)
      // Respawn 1.5m behind: z = -30 - (-1)*1.5 = -28.5
      expect(pose.x).toBeCloseTo(50, 1);
      expect(pose.z).toBeCloseTo(-28.5, 1);
      expect(pose.y).toBeCloseTo(0.5, 1);
      expect(pose.rotation).toBeCloseTo(0, 1); // Heading along -Z
    });

    it('does not trigger stuck when throttle is zero', () => {
      const dummyKart = {
        x: 50, y: 0, z: -30, speed: 0.0,
        surface: 'asphalt', air: { isAirborne: false }
      } as any;

      const res = rescue.update(4.0, dummyKart, 0.0, gate, true);
      expect(res.triggerRescue).toBe(false);
    });

    it('does not trigger stuck when kart is airborne', () => {
      const dummyKart = {
        x: 50, y: 3.0, z: -30, speed: 0.1,
        surface: 'asphalt', air: { isAirborne: true }
      } as any;

      const res = rescue.update(4.0, dummyKart, 1.0, gate, true);
      expect(res.triggerRescue).toBe(false);
    });

    it('reset clears stuck timer and active rescue state', () => {
      rescue.forceRescue(gate);
      expect(rescue.isRescuing()).toBe(true);
      rescue.reset();
      expect(rescue.isRescuing()).toBe(false);
    });
  });

  // ── 7. TrackValidator Tests ───────────────────────────────────────────────
  describe('TrackValidator', () => {
    it('validates a complete, compliant TrackDefinition', () => {
      const validTrack: TrackDefinition = {
        id: 'test_circuit',
        name: 'Test Circuit',
        version: 1,
        units: 'meters',
        lapCount: 3,
        centerline: [
          { x: 0, y: 0, z: 0, width: 16 },
          { x: 0, y: 0, z: -100, width: 16 },
          { x: 50, y: 0, z: -100, width: 16 },
          { x: 50, y: 0, z: 0, width: 16 }
        ],
        checkpoints: [
          { id: 0, center: { x: 0, y: 0, z: -50 }, normal: { x: 0, y: 0, z: -1 }, width: 16, height: 8 },
          { id: 1, center: { x: 25, y: 0, z: -100 }, normal: { x: 1, y: 0, z: 0 }, width: 16, height: 8 },
          { id: 2, center: { x: 50, y: 0, z: -50 }, normal: { x: 0, y: 0, z: 1 }, width: 16, height: 8 },
          { id: 3, center: { x: 0, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 }, width: 16, height: 8 }
        ],
        startGrid: [
          { slot: 1, x: 0, y: 0, z: 10, rotation: 0 },
          { slot: 2, x: 3, y: 0, z: 10, rotation: 0 }
        ],
        finishLine: { id: 3, center: { x: 0, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 }, width: 16, height: 8 },
        minimapBounds: { minX: -20, maxX: 70, minZ: -120, maxZ: 20 },
        lightingPreset: 'noon',
        musicId: 'bgm_race',
        skyPreset: 'dhaka_clear'
      };

      const report = TrackValidator.validate(validTrack);
      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    it('rejects TrackDefinition missing required fields or having insufficient gates', () => {
      const invalidTrack: any = {
        id: 'broken',
        centerline: [{ x: 0, y: 0, z: 0 }],
        checkpoints: [{ id: 0, center: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } }]
      };

      const report = TrackValidator.validate(invalidTrack);
      expect(report.valid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
    });
  });

  // ── 8. TrackAutopilot Tests ───────────────────────────────────────────────
  describe('TrackAutopilot', () => {
    let spline: TrackSpline;
    let autopilot: TrackAutopilot;

    beforeEach(() => {
      const points: SplinePoint[] = [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: -100 },
        { x: 100, y: 0, z: -100 },
        { x: 100, y: 0, z: 0 }
      ];
      spline = new TrackSpline(points, true, 200);
      autopilot = new TrackAutopilot(spline, 22.0, 14.0);
    });

    it('steers right when spline curves right ahead', () => {
      // Kart at (0, 0, -90) heading along -Z (rotation = 0). Spline turns right (+X) at z = -100
      const kart = {
        x: 0, y: 0, z: -90, rotation: 0, speed: 20,
        surface: 'asphalt', air: { isAirborne: false }
      } as any;

      const input = autopilot.computeInput(kart);
      // Turning right requires positive steer
      expect(input.steer).toBeGreaterThan(0.2);
    });

    it('eases throttle on sharp bends to maintain racing ribbon grip', () => {
      const kart = {
        x: 0, y: 0, z: -95, rotation: 0, speed: 22,
        surface: 'asphalt', air: { isAirborne: false }
      } as any;

      const input = autopilot.computeInput(kart);
      expect(input.throttle).toBeLessThan(1.0);
    });

    it('tracks spline parameter monotonically as kart advances', () => {
      const k1 = { x: 0, y: 0, z: -10, rotation: 0, speed: 15, surface: 'asphalt', air: { isAirborne: false } } as any;
      const k2 = { x: 0, y: 0, z: -30, rotation: 0, speed: 15, surface: 'asphalt', air: { isAirborne: false } } as any;
      autopilot.computeInput(k1);
      const t1 = autopilot.getCurrentSplineParameter();
      autopilot.computeInput(k2);
      const t2 = autopilot.getCurrentSplineParameter();
      expect(t2).toBeGreaterThan(t1);
    });
  });

  // ── 9. Track Determinism Replay Test ──────────────────────────────────────
  describe('3D Track Deterministic Simulation', () => {
    it('produces bit-for-bit identical kart trajectories given fixed input sequences on 3D terrain', () => {
      // Flat 3D ground geometry
      const geom = new THREE.PlaneGeometry(100, 100).rotateX(-Math.PI / 2);
      const groundQuery = new BvhGroundQuery(geom);

      const runSimulation = () => {
        const kart = new KartController({}, { x: 0, y: 0, z: 0, rotation: 0, speed: 0 }, undefined, groundQuery);
        const inputs = [
          { throttle: 1.0, brake: 0, steer: 0, drift: false, lookBehind: false, bell: false, trick: false },
          { throttle: 1.0, brake: 0, steer: 0.5, drift: false, lookBehind: false, bell: false, trick: false },
          { throttle: 1.0, brake: 0, steer: -0.3, drift: true, lookBehind: false, bell: false, trick: false },
          { throttle: 0.5, brake: 0.2, steer: 0, drift: false, lookBehind: false, bell: false, trick: false }
        ];

        for (const input of inputs) {
          for (let step = 0; step < 30; step++) {
            kart.update(1 / 60, input);
          }
        }
        return kart.getState();
      };

      const runA = runSimulation();
      const runB = runSimulation();

      expect(runA.x).toBe(runB.x);
      expect(runA.y).toBe(runB.y);
      expect(runA.z).toBe(runB.z);
      expect(runA.speed).toBe(runB.speed);
      expect(runA.rotation).toBe(runB.rotation);
    });
  });

});
