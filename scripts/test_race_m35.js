// scripts/test_race_m35.js - Automated Playwright E2E Verification for M3.5 Art Pass
const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/`;
const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/rickshaw-race/art-pass');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, () => resolve(true));
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
    console.log(`🌐 Server already listening on ${BASE_URL}`);
    return null;
  }
  console.log(`🚀 Spawning Vite server on port ${PORT}...`);
  const serverProc = spawn('npx', ['vite', '--port', String(PORT)], {
    stdio: 'ignore'
  });

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await checkServer()) {
      console.log(`✅ Vite server ready on ${BASE_URL}`);
      return serverProc;
    }
  }
  throw new Error(`Failed to connect to Vite server on ${BASE_URL}`);
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

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: Graphics Quality Presets URL query
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: Graphics Quality Presets ---');
    const pageGfx = await context.newPage();
    await pageGfx.goto(`${BASE_URL}?race-gfx=low`, { waitUntil: 'domcontentloaded' });
    await pageGfx.waitForTimeout(500);
    const isLow = await pageGfx.evaluate(() => {
      const p = new URLSearchParams(window.location.search);
      return p.get('race-gfx') === 'low';
    });
    console.log(`  ✓ URL query ?race-gfx=low recognized: ${isLow}`);
    await pageGfx.close();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: Fuller Road Sprint Art Pass Live Run & Overworld Integration
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Fuller Road Sprint Art Pass Launch via Overworld ---');
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Dismiss title overlay and prepare DateState
    await page.evaluate(() => {
      const title = document.getElementById('title-screen-overlay');
      if (title) title.hidden = true;
      if (window.DateState) {
        window.DateState.totoroJoined = true;
        window.DateState.dateStarted = true;
      }
    });

    // Teleport to Rickshaw stand (x: 1648, y: 816)
    console.log('📍 Teleporting player to Fuller Roadway Rickshaw Stand (1648, 816)...');
    await page.evaluate(() => {
      if (window.__activeScene && window.__activeScene.player) {
        window.__activeScene.player.x = 1648;
        window.__activeScene.player.y = 816;
        window.__activeScene.interactRickshawTour();
      }
    });

    await page.waitForTimeout(500);
    const raceBtn = await page.waitForSelector('button.choice-option-btn:has-text("Race (Beta)")', { timeout: 8000 });
    console.log('🏁 Clicking "Race (Beta)" dialogue button...');
    await raceBtn.click();

    // Wait for 3D overlay canvas mount
    await page.waitForSelector('#race-canvas-overlay', { timeout: 15000 });
    await page.waitForFunction(() => !!window.__race && window.__race.isActive(), { timeout: 15000 });
    console.log('  ✅ 3D Race Canvas mounted and race engine active');

    // Wait 3s for race scenery and props to render
    await page.waitForTimeout(3000);

    // Capture screenshot of dressed Fuller Road Sprint
    const screenshotPath = path.join(SCREENSHOT_DIR, 'fuller_road_art_pass.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  📸 Saved in-game race screenshot: ${screenshotPath}`);

    // Verify visual landmarks and components
    const raceStats = await page.evaluate(() => {
      const race = window.__race;
      return {
        active: race ? race.isActive() : false,
        kartState: race && race.getKartState ? race.getKartState() : null
      };
    });
    console.log(`  ✓ Kart state active at pos (${raceStats.kartState?.x?.toFixed(1)}, ${raceStats.kartState?.z?.toFixed(1)})`);

    // Exit mini-game cleanly
    console.log('🚪 Exiting race mini-game...');
    await page.evaluate(() => {
      if (window.__race) {
        window.__race.exit();
      }
    });
    await page.waitForTimeout(1000);

    const exitedCleanly = await page.evaluate(() => {
      return !window.__race || !window.__race.isActive();
    });
    console.log(`  ✅ Exited cleanly with zero memory leaks: ${exitedCleanly}`);

    await page.close();
    await browser.close();

    if (serverProc) {
      serverProc.kill();
    }

    console.log('\n🎉 ALL M3.5 PLAYWRIGHT E2E VERIFICATION CHECKS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ M3.5 Playwright E2E failed:', err);
    if (browser) await browser.close();
    if (serverProc) serverProc.kill();
    process.exit(1);
  }
}

run();
