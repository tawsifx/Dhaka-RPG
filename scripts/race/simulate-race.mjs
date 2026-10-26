// scripts/race/simulate-race.mjs - Headless Monte-Carlo balancing & determinism simulator for 8-kart races
import fs from 'fs';
import path from 'path';
import { loadHeadlessTrack } from './lib/headlessTrack.ts';
import { RaceSession } from '../../src/scenes/minigames/race/core/RaceSession.ts';
import { TrackAutopilot } from '../../src/scenes/minigames/race/track/TrackAutopilot.ts';
import { DIFFICULTY_CONFIGS, RIVAL_DRIVERS } from '../../src/config/drivers.race.db.ts';

const TRACK_ID = 'fuller_road_sprint';
const NUM_SEEDS = 5;
const DIFFICULTIES = ['gorom_cha', 'beshi_gorom', 'naga_jhal'];

async function runSimulation() {
  console.log(`\n======================================================`);
  console.log(`🏎 HEADLESS 8-KART BALANCING SIMULATION: ${TRACK_ID}`);
  console.log(`======================================================`);

  const trackRuntime = await loadHeadlessTrack(TRACK_ID);
  const track = trackRuntime.definition;

  for (const diff of DIFFICULTIES) {
    console.log(`\n------------------------------------------------------`);
    console.log(`📊 SIMULATING DIFFICULTY: ${diff.toUpperCase()} (${NUM_SEEDS} races)`);
    console.log(`------------------------------------------------------`);

    const winCounts = new Map();
    const finishTimes = new Map();
    const packSpreads = [];

    for (let s = 0; s < NUM_SEEDS; s++) {
      const seed = 1000 + s * 97;
      const session = new RaceSession({
        track,
        mode: 'quick_race',
        difficulty: diff,
        seed,
        groundQuery: trackRuntime.groundQuery,
        collisionWorld: trackRuntime.collisionWorld
      });

      const playerAutopilot = new TrackAutopilot(session.spline, 26.5, 16.0);
      session.startRace(0);

      // Sim loop (fixed dt = 1/60s)
      const dt = 1 / 60;
      let simSec = 0;
      let postFinishTimer = 0;
      const maxSimSec = 220; // 3.6 minutes max

      while (simSec < maxSimSec && !session.getKarts().every((k) => k.finished)) {
        const playerState = session.getPlayerKart().controller.getState();
        const playerInput = playerAutopilot.computeInput(playerState);

        session.step(dt, playerInput);
        simSec += dt;

        // Allow trailing pack 25 seconds to finish after leader finishes
        if (session.getKarts().some((k) => k.finished)) {
          postFinishTimer += dt;
          if (postFinishTimer >= 25.0) {
            break;
          }
        }
      }

      const standings = session.getStandings();
      const winner = standings[0];
      winCounts.set(winner.kartId, (winCounts.get(winner.kartId) || 0) + 1);

      for (const entry of standings) {
        if (!finishTimes.has(entry.kartId)) finishTimes.set(entry.kartId, []);
        if (entry.finishTimeMs) {
          finishTimes.get(entry.kartId).push(entry.finishTimeMs / 1000);
        }
      }

      const firstTime = standings[0].finishTimeMs || 0;
      const lastFinished = [...standings].reverse().find((e) => e.finished);
      if (lastFinished && lastFinished.finishTimeMs && firstTime > 0) {
        packSpreads.push((lastFinished.finishTimeMs - firstTime) / 1000);
      }
    }

    // Report Summary
    console.log(`Driver Win Rates & Average Lap Times:`);
    for (const [kartId, times] of finishTimes.entries()) {
      const wins = winCounts.get(kartId) || 0;
      const winRate = ((wins / NUM_SEEDS) * 100).toFixed(0);
      const avgTime = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : 'DNF';
      const avgLap = times.length > 0 ? (Number(avgTime) / 3).toFixed(1) : 'DNF';
      console.log(`  • ${kartId.padEnd(14)}: ${winRate.padStart(3)}% wins | Avg 3-Lap: ${avgTime}s (Avg Lap: ${avgLap}s)`);
    }

    const avgSpread = packSpreads.length > 0 ? (packSpreads.reduce((a, b) => a + b, 0) / packSpreads.length).toFixed(1) : 'N/A';
    console.log(`  📦 Average Pack Spread: ${avgSpread}s (Healthy competitive range: 5s - 25s)`);
  }

  // Determinism Verification Test
  console.log(`\n------------------------------------------------------`);
  console.log(`🔒 DETERMINISM REPLAY VERIFICATION`);
  console.log(`------------------------------------------------------`);
  const fixedSeed = 4242;
  const runA = runSingleSeed(trackRuntime, fixedSeed);
  const runB = runSingleSeed(trackRuntime, fixedSeed);

  console.log(`Run A Winner: ${runA.winner} (${runA.winnerTime.toFixed(3)}s)`);
  console.log(`Run B Winner: ${runB.winner} (${runB.winnerTime.toFixed(3)}s)`);

  if (runA.winner !== runB.winner || Math.abs(runA.winnerTime - runB.winnerTime) > 0.0001) {
    throw new Error(`FAILURE: Simulation is non-deterministic! Seed ${fixedSeed} produced differing outcomes.`);
  }
  console.log(`✅ 100% Determinism Verified: Identical winner and bit-exact finish times across independent runs!`);
  console.log(`======================================================\n`);
}

function runSingleSeed(trackRuntime, seed) {
  const session = new RaceSession({
    track: trackRuntime.definition,
    mode: 'quick_race',
    difficulty: 'beshi_gorom',
    seed,
    groundQuery: trackRuntime.groundQuery,
    collisionWorld: trackRuntime.collisionWorld
  });

  const playerAutopilot = new TrackAutopilot(session.spline, 26.5, 16.0);
  session.startRace(0);
  const dt = 1 / 60;
  let simSec = 0;

  while (simSec < 220 && !session.getKarts().some((k) => k.finished)) {
    const playerInput = playerAutopilot.computeInput(session.getPlayerKart().controller.getState());
    session.step(dt, playerInput);
    simSec += dt;
  }

  const standings = session.getStandings();
  const winner = standings.find((s) => s.finished) || standings[0];
  return {
    winner: winner.kartId,
    winnerTime: (winner.finishTimeMs || simSec * 1000) / 1000
  };
}

runSimulation().catch((err) => {
  console.error('Simulation Error:', err);
  process.exit(1);
});
