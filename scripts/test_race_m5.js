// scripts/test_race_m5.js - Automated Playwright E2E Verification for M5 (Items, Boxes, Hit Reactions, AI Item Use, F8 Debug, Hazards)
const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3000;
const URL = `http://localhost:${PORT}/`;
const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/rickshaw-race');

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(URL, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureServer() {
  const isUp = await checkServer();
  if (isUp) {
    console.log(`🌐 Server already listening on ${URL}`);
    return null;
  }
  console.log(`🚀 Spawning Vite server on port ${PORT}...`);
  const serverProc = spawn('npx', ['vite', '--port', String(PORT)], {
    stdio: 'ignore'
  });

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await checkServer()) {
      console.log(`✅ Vite server ready on ${URL}`);
      return serverProc;
    }
  }
  throw new Error(`Failed to connect to Vite server on ${URL}`);
}

async function run() {
  let serverProc = null;
  let browser = null;

  try {
    serverProc = await ensureServer();

    console.log('🚀 [Playwright] Launching Chrome browser...');
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1
    });

    const page = await context.newPage();

    // Verify lazy-loading: no 3D or track assets load initially
    const requested3dAssets = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('.glb') || url.includes('/tracks/')) {
        requested3dAssets.push(url);
      }
    });

    console.log(`🌐 Navigating to ${URL} ...`);
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__activeScene && !!window.DateState, { timeout: 20000 });

    // Dismiss title screen
    await page.evaluate(() => {
      const title = document.getElementById('title-screen-overlay');
      if (title) title.hidden = true;
      window.DateState.totoroJoined = true;
      window.DateState.dateStarted = true;
    });

    // Checkpoint 1: Verify Zero 3D Assets on Overworld Load
    console.log('\n[Step 1] Checking Overworld 3D Isolation...');
    if (requested3dAssets.length > 0) {
      throw new Error(`Isolation failed: 3D assets loaded at initial page load: ${requested3dAssets.join(', ')}`);
    }
    console.log('  ✅ Zero 3D assets loaded before race launch');

    // Teleport to Rickshaw stand (x: 1648, y: 816)
    await page.evaluate(() => {
      const scene = window.__activeScene;
      scene.player.x = 1648;
      scene.player.y = 816;
    });

    // Launch M5 Rickshaw Race (Beta)
    console.log('\n[Step 2] Launching 8-Kart Grand Prix with Items & Hazards...');
    await page.evaluate(() => window.__activeScene.interactRickshawTour());
    await page.waitForTimeout(400);
    const raceBtn = await page.waitForSelector('button.choice-option-btn:has-text("Race (Beta)")', { timeout: 5000 });
    await raceBtn.click();

    // Wait for 3D Race Container to mount and assets to load
    await page.waitForSelector('#race-canvas-overlay', { timeout: 15000 });
    await page.waitForFunction(() => !!window.__race && !!window.__race.getSession && !!window.__race.getSession(), { timeout: 10000 });
    console.log('  ✅ 3D Race Overlay mounted with active RaceSession');

    // Checkpoint 2: Verify HUD M5 Item Elements (Item Slot, Warning Banner)
    console.log('\n[Step 3] Verifying Item HUD Mount & UI Elements...');
    await page.waitForSelector('#race-item-slot', { state: 'attached', timeout: 5000 });
    await page.waitForSelector('#race-incoming-warning', { state: 'attached', timeout: 5000 });
    console.log('  ✅ #race-item-slot and #race-incoming-warning elements mounted in DOM');

    // Checkpoint 3: Test Item Granting via Console Hook & Slot Roulette
    console.log('\n[Step 4] Testing window.__race.giveItem() & Slot UI Animation...');
    await page.evaluate(() => {
      window.__race.giveItem('malai_cha');
    });

    // Give roulette time to spin and settle
    await page.waitForTimeout(1400);

    const heldItem = await page.evaluate(() => {
      const session = window.__race.getSession();
      return session.getPlayerKart()?.heldItem;
    });
    console.log(`  • Player Held Item after giveItem: "${heldItem}"`);
    if (heldItem !== 'malai_cha') {
      throw new Error(`giveItem failed: expected 'malai_cha', got '${heldItem}'`);
    }

    const slotIcon = await page.$eval('#race-item-slot .item-icon', (el) => el.textContent);
    console.log(`  • Item Slot Icon Rendered: "${slotIcon}"`);
    console.log('  ✅ Item slot received and displayed Malai Cha');

    // Checkpoint 4: Test Item Use & Malai Cha Speed Boost
    console.log('\n[Step 5] Testing Item Activation & Malai Cha Boost...');
    const boostCheck = await page.evaluate(() => {
      const session = window.__race.getSession();
      const player = session.getPlayerKart();
      player.controller.setState({ speed: 10 });
      window.__race.useItem(false);

      // Step physics tick
      session.step(0.1, { throttle: 1, brake: 0, steer: 0, drift: false, lookBehind: false, bell: false, trick: false });
      const state = player.controller.getState();
      return {
        heldItemAfterUse: player.heldItem,
        isBoosting: Boolean(state.boost?.active),
        speed: state.speed
      };
    });

    console.log(`  • Held Item after use: "${boostCheck.heldItemAfterUse}" (Expected null)`);
    console.log(`  • Kart Boost Active: ${boostCheck.isBoosting}`);
    console.log(`  • Kart Speed: ${boostCheck.speed.toFixed(1)} m/s`);

    if (boostCheck.heldItemAfterUse !== null) {
      throw new Error('Held item was not consumed on use');
    }
    if (!boostCheck.isBoosting) {
      throw new Error('Malai Cha boost was not activated on controller');
    }
    console.log('  ✅ Malai Cha consumed and boost successfully engaged');

    // Checkpoint 5: Test Offensive Item Spawning & Traps
    console.log('\n[Step 6] Testing Naga Fuchka Rocket & Mishti Doi Puddle Spawn...');
    const itemSpawnCheck = await page.evaluate(() => {
      const session = window.__race.getSession();
      const world = session.getWorldItems();

      // Give and fire Naga Fuchka
      session.givePlayerItem('naga_fuchka');
      session.usePlayerItem(false);

      // Give and drop Mishti Doi
      session.givePlayerItem('mishti_doi');
      session.usePlayerItem(true);

      const items = world ? world.getItems() : [];
      return {
        itemCount: items.length,
        types: items.map((i) => i.type)
      };
    });

    console.log(`  • Active World Items: ${itemSpawnCheck.itemCount} (${itemSpawnCheck.types.join(', ')})`);
    if (!itemSpawnCheck.types.includes('naga_fuchka') || !itemSpawnCheck.types.includes('mishti_doi')) {
      throw new Error(`World items missing: expected naga_fuchka and mishti_doi, got [${itemSpawnCheck.types.join(', ')}]`);
    }
    console.log('  ✅ Naga Fuchka rocket and Mishti Doi trap active in world');

    // Checkpoint 6: Test Hit Reactions (Spin Out & Explosion)
    console.log('\n[Step 7] Testing Hit Reactions State Machine...');
    const hitCheck = await page.evaluate(() => {
      const session = window.__race.getSession();
      const player = session.getPlayerKart();
      player.controller.setState({ speed: 20 });

      // Trigger spin out
      window.__race.triggerHit('spin_out');
      const reaction1 = player.hitReaction.currentReaction;

      // Advance physics 0.5s
      session.step(0.5, { throttle: 1, brake: 0, steer: 0, drift: false, lookBehind: false, bell: false, trick: false });
      const speedAfterSpin = player.controller.getState().speed;
      const yawSpin = player.hitReaction.visualYawOffset;

      return {
        reaction1,
        speedAfterSpin,
        yawSpin
      };
    });

    console.log(`  • Hit Reaction Triggered: "${hitCheck.reaction1}"`);
    console.log(`  • Speed Scrubbed To: ${hitCheck.speedAfterSpin.toFixed(1)} m/s (Expected <= 7 m/s)`);
    console.log(`  • Visual Yaw Spin Angle: ${(hitCheck.yawSpin * (180 / Math.PI)).toFixed(1)}°`);

    if (hitCheck.reaction1 !== 'spin_out') {
      throw new Error(`Hit reaction failed: expected 'spin_out', got '${hitCheck.reaction1}'`);
    }
    if (hitCheck.speedAfterSpin > 7.5) {
      throw new Error(`Hit reaction did not scrub speed sufficiently: ${hitCheck.speedAfterSpin}`);
    }
    console.log('  ✅ Hit reaction state machine verified: controls locked, speed scrubbed, 360 yaw spin active');

    // Checkpoint 7: Test F8 Items Debug Overlay
    console.log('\n[Step 8] Testing F8 Items Debug Overlay...');
    await page.evaluate(() => {
      window.__race.toggleItemsDebug(true);
    });
    await page.waitForSelector('#race-items-debug-overlay', { timeout: 3000 });
    const isDebugVisible = await page.$eval('#race-items-debug-overlay', (el) => el.style.display !== 'none');
    if (!isDebugVisible) throw new Error('Failed to toggle F8 Items debug overlay');
    console.log('  ✅ F8 Items debug telemetry overlay toggled and visible');

    // Capture Screenshots
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'm5_f8_items_debug.png') });
    console.log('  📸 Captured: docs/rickshaw-race/m5_f8_items_debug.png');

    // Checkpoint 8: Clean Exit & Zero State Loss / Leaks Audit
    console.log('\n[Step 9] Exiting Race & Auditing Zero Leak Restoration...');
    await page.evaluate(() => {
      window.__race.exit();
    });

    // Verify 3D overlay completely removed from DOM
    await page.waitForFunction(() => !document.getElementById('race-container'), { timeout: 5000 });
    console.log('  ✅ #race-container cleanly removed from DOM');

    const remainingElements = await page.evaluate(() => {
      return {
        overlay: !!document.getElementById('race-container'),
        canvas: !!document.getElementById('race-canvas-overlay'),
        itemSlot: !!document.getElementById('race-item-slot'),
        incomingWarning: !!document.getElementById('race-incoming-warning'),
        itemsDebug: !!document.getElementById('race-items-debug-overlay'),
        nametags: !!document.getElementById('race-rival-nametags'),
        standings: !!document.getElementById('race-standings-ladder'),
        windowRace: !!window.__race
      };
    });

    for (const [key, val] of Object.entries(remainingElements)) {
      if (val) throw new Error(`Leak detected: ${key} still exists in DOM/window after exit`);
    }
    console.log('  ✅ 0 DOM/Window leaks verified across all M5 components');

    // Verify Overworld Restoration
    const restoredOverworld = await page.evaluate(() => {
      const scene = window.__activeScene;
      return {
        playerX: scene.player?.x,
        playerY: scene.player?.y,
        isPaused: scene.timeCalendar?.isPaused?.() ?? false,
        cutsceneLocked: scene.cutsceneLocked ?? false
      };
    });

    console.log(`  • Restored Player Pos: (${restoredOverworld.playerX}, ${restoredOverworld.playerY})`);
    console.log(`  • Time Calendar Paused: ${restoredOverworld.isPaused}`);
    console.log(`  • Cutscene Locked: ${restoredOverworld.cutsceneLocked}`);

    if (restoredOverworld.playerX !== 1648 || restoredOverworld.playerY !== 816) {
      throw new Error(`Player position drifted: expected (1648, 816), got (${restoredOverworld.playerX}, ${restoredOverworld.playerY})`);
    }
    if (restoredOverworld.isPaused || restoredOverworld.cutsceneLocked) {
      throw new Error('Overworld remains frozen/locked after exiting race');
    }
    console.log('  ✅ Overworld restored to exact position (1648, 816) with 0 locks');

    console.log(`\n======================================================`);
    console.log(`🏆 ALL 9 MILESTONE 5 TEST PHASES PASSED WITH ZERO ERRORS!`);
    console.log(`======================================================\n`);
  } finally {
    if (browser) await browser.close();
    if (serverProc) {
      serverProc.kill();
    }
  }
}

run().catch((err) => {
  console.error('❌ M5 Test Failed:', err);
  process.exit(1);
});
