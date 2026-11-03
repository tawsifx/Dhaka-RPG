// scripts/test_farmhouse_farming.js - Automated Playwright integration verification of Stardew farming inside farmhouse
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = 5174;
const URL = `http://localhost:${PORT}/`;
const ARTIFACTS_DIR = path.resolve('public/assets');

async function run() {
  console.log('🚀 Starting Vite dev server on port', PORT);
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    stdio: 'pipe',
    shell: true
  });

  vite.stdout.on('data', (d) => {
    // console.log('[Vite]', d.toString());
  });

  // Wait for server to start
  await new Promise((r) => setTimeout(r, 2200));

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();

  try {
    console.log('🌐 Navigating to game...');
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);

    // Click start if menu screen is visible
    const startBtn = await page.$('#btn-start, #btn-date, button:has-text("Start")');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(1200);
    }

    console.log('🏡 Entering Farmhouse...');
    await page.evaluate(() => {
      const scene = window.__activeScene || (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES[0] && window.Phaser.GAMES[0].scene.scenes[0]);
      window.__activeScene = scene;
      scene.enterFarmhouse();
    });
    await page.waitForTimeout(800);

    // Verify Farmhouse and Controller state
    const farmState = await page.evaluate(() => {
      const scene = window.__activeScene;
      const ctrl = scene.farmhouseFarmingController;
      return {
        currentWorld: window.DateState.currentWorld,
        hasController: Boolean(ctrl),
        hasSoilSprites: ctrl ? ctrl.soilSprites.size : 0,
        hasCropSprites: ctrl ? ctrl.cropSprites.size : 0,
        hasHotbar: Boolean(ctrl && ctrl.hotbarContainer)
      };
    });

    console.log('📊 Initial Farmhouse State:', farmState);
    if (!farmState.hasController) {
      throw new Error('FarmhouseFarmingController was not initialized!');
    }

    // Step 1: Till plot at (12, 10) using Hoe [1]
    console.log('⛏️ [Step 1] Selecting Hoe [1] and tilling plot (12, 10)...');
    const tillResult = await page.evaluate(() => {
      const scene = window.__activeScene;
      const ctrl = scene.farmhouseFarmingController;
      ctrl.setActiveTool('hoe');
      const ok = ctrl.executeToolAction(12, 10);
      const cell = scene.farmingSystem.getCell(12, 10);
      return { ok, isTilled: cell ? cell.isTilled : false, soilCount: ctrl.soilSprites.size };
    });
    console.log('   Till Result:', tillResult);
    if (!tillResult.isTilled) throw new Error('Failed to till soil at (12, 10)!');

    // Step 2: Water plot at (12, 10) using Can [2]
    console.log('💧 [Step 2] Selecting Watering Can [2] and watering plot (12, 10)...');
    const waterResult = await page.evaluate(() => {
      const scene = window.__activeScene;
      const ctrl = scene.farmhouseFarmingController;
      ctrl.setActiveTool('water');
      const ok = ctrl.executeToolAction(12, 10);
      const cell = scene.farmingSystem.getCell(12, 10);
      return { ok, isWatered: cell ? cell.isWatered : false };
    });
    console.log('   Water Result:', waterResult);
    if (!waterResult.isWatered) throw new Error('Failed to water soil at (12, 10)!');

    // Step 3: Give seeds and Plant at (12, 10) using Seeds [3]
    console.log('🌱 [Step 3] Sowing Sylhet Tea seeds at (12, 10)...');
    const plantResult = await page.evaluate(() => {
      const scene = window.__activeScene;
      const ctrl = scene.farmhouseFarmingController;
      window.RPGStats.addItem('seed_tea', 5);
      ctrl.setActiveTool('seed');
      ctrl.setActiveSeed('sylhet_tea');
      const ok = ctrl.executeToolAction(12, 10);
      const cell = scene.farmingSystem.getCell(12, 10);
      return {
        ok,
        cropId: cell && cell.crop ? cell.crop.cropId : null,
        stage: cell && cell.crop ? cell.crop.currentStage : null,
        cropCount: ctrl.cropSprites.size
      };
    });
    console.log('   Plant Result:', plantResult);
    if (plantResult.cropId !== 'sylhet_tea') throw new Error('Failed to plant crop at (12, 10)!');

    // Step 4: Advance Day via Resting
    console.log('🌙 [Step 4] Advancing day (Resting to grow crops)...');
    const growthResult = await page.evaluate(() => {
      const scene = window.__activeScene;
      const ctrl = scene.farmhouseFarmingController;
      // Advance 2 days so Sylhet Tea advances a stage
      ctrl.advanceDay();
      const cell = scene.farmingSystem.getCell(12, 10);
      return {
        isWateredDay2: cell.isWatered,
        daysInStage: cell.crop ? cell.crop.daysInStage : null,
        currentStage: cell.crop ? cell.crop.currentStage : null
      };
    });
    console.log('   Day 1 Growth Result:', growthResult);

    // Screenshot verified farming garden
    const screenshotPath = path.resolve('public/assets/farmhouse_farming_verified.png');
    await page.screenshot({ path: screenshotPath });
    console.log('📸 Saved verification screenshot:', screenshotPath);

    console.log('🎉 ALL FARMHOUSE FARMING INTEGRATION CHECKS PASSED!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    vite.kill('SIGTERM');
  }
}

run();
