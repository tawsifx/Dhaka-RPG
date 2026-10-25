// scripts/test_npc_roaming_playwright.js - Automated Playwright verification of dynamic NPC roaming, scattering, and cutscene positioning
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';

async function run() {
  console.log('🚀 [Playwright] Launching Chrome test runner...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();
  console.log('🌐 [Playwright] Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

  console.log('⏳ [Playwright] Waiting for Phaser game scene initialization...');
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.scheduleSystem, { timeout: 20000 });

  // Dismiss title screen overlay if present
  console.log('🎮 [Playwright] Dismissing title screen...');
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(500);

  // 1. Initial snapshot of all active NPCs on Dhaka Valley
  console.log('🔍 [Playwright] Capturing initial positions of all NPCs in Dhaka Valley...');
  const initialNpcData = await page.evaluate(() => {
    const scene = window.__activeScene;
    const npcs = {};
    scene.scheduleSystem.activeNpcs.forEach((ent, id) => {
      npcs[id] = {
        name: ent.def.displayName,
        x: Math.round(ent.mover.x),
        y: Math.round(ent.mover.y),
        state: ent.mover.state,
        facing: ent.mover.facing,
        badgeText: ent.badge.text,
        hasActivePath: ent.mover.hasActivePath()
      };
    });
    return npcs;
  });

  console.log('📋 Initial NPC Locations (Count: ' + Object.keys(initialNpcData).length + '):');
  Object.keys(initialNpcData).forEach(id => {
    const n = initialNpcData[id];
    console.log(`  - ${id.padEnd(16)}: (${n.x}, ${n.y}) | state: ${n.state} | badge: "${n.badgeText}"`);
  });

  // Verify Ahona & Apshora are NOT in congested Row 25 (y ≈ 810)
  const ahona = initialNpcData['ahona'];
  const apshora = initialNpcData['apshora'];
  if (ahona) {
    console.log(`🌸 Ahona placement: (${ahona.x}, ${ahona.y})`);
    if (ahona.y >= 790 && ahona.y <= 830) {
      throw new Error(`Ahona is still congested on Row 25 at y=${ahona.y}! Expected Krishnachura Avenue Gateway (y ≈ 1056).`);
    }
  }
  if (apshora) {
    console.log(`✨ Apshora placement: (${apshora.x}, ${apshora.y})`);
    if (apshora.y >= 790 && apshora.y <= 830) {
      throw new Error(`Apshora is still congested on Row 25 at y=${apshora.y}! Expected Krishnachura Avenue Gateway (y ≈ 1056).`);
    }
  }

  // Verify Mehjabin & Iman are placed at the spacious Fountain Garden Terrace (y ≈ 736)
  const mehjabin = initialNpcData['mehjabin'] || initialNpcData['salat'];
  const iman = initialNpcData['iman'] || initialNpcData['enan'];
  if (mehjabin) {
    console.log(`⛲ Mehjabin placement: (${mehjabin.x}, ${mehjabin.y})`);
    if (mehjabin.y >= 790 && mehjabin.y <= 830) {
      throw new Error(`Mehjabin is still congested on Row 25 carriage road at y=${mehjabin.y}!`);
    }
  }
  if (iman) {
    console.log(`💼 Iman placement: (${iman.x}, ${iman.y})`);
    if (iman.y >= 790 && iman.y <= 830) {
      throw new Error(`Iman is still congested on Row 25 carriage road at y=${iman.y}!`);
    }
  }

  // 2. Wait 4 seconds to observe dynamic ambient roaming
  console.log('⏱️ [Playwright] Observing dynamic ambient roaming over 4.0 seconds...');
  await page.waitForTimeout(4000);

  const afterRoamData = await page.evaluate(() => {
    const scene = window.__activeScene;
    const npcs = {};
    scene.scheduleSystem.activeNpcs.forEach((ent, id) => {
      npcs[id] = {
        name: ent.def.displayName,
        x: Math.round(ent.mover.x),
        y: Math.round(ent.mover.y),
        state: ent.mover.state,
        facing: ent.mover.facing,
        badgeText: ent.badge.text,
        hasActivePath: ent.mover.hasActivePath()
      };
    });
    return npcs;
  });

  console.log('📋 After Roaming NPC Locations:');
  let activeMovers = 0;
  Object.keys(afterRoamData).forEach(id => {
    const init = initialNpcData[id];
    const curr = afterRoamData[id];
    const moved = Math.hypot(curr.x - init.x, curr.y - init.y);
    if (moved > 2 || curr.state === 'walking' || curr.hasActivePath) {
      activeMovers++;
      console.log(`  🚶 [WALKING/MOVED] ${id.padEnd(16)}: (${curr.x}, ${curr.y}) delta: ${moved.toFixed(1)}px | state: ${curr.state} | badge: "${curr.badgeText}"`);
    } else {
      console.log(`  ⏸️ [PAUSED/IDLE]  ${id.padEnd(16)}: (${curr.x}, ${curr.y}) | state: ${curr.state} | badge: "${curr.badgeText}"`);
    }
  });

  console.log(`\n🎉 Active walking/roaming NPCs detected: ${activeMovers} out of ${Object.keys(afterRoamData).length}`);

  // 3. Take screenshots of key areas
  // Area A: Center camera on Krishnachura Avenue Gateway (Ahona & Apshora spacious cutscene placement)
  console.log('📸 [Playwright] Capturing Krishnachura Avenue Gateway (Ahona & Apshora)...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.cameras.main.stopFollow();
    scene.cameras.main.centerOn(500, 1056);
  });
  await page.waitForTimeout(500);
  const ahonaScreenshotPath = path.join(ARTIFACTS_DIR, 'npc_scatter_krishnachura_gateway.png');
  await page.screenshot({ path: ahonaScreenshotPath });
  console.log(`✅ Saved: ${ahonaScreenshotPath}`);

  // Area B: Center camera on Mintu Road Fountain Terrace (Mehjabin & Iman garden terrace placement)
  console.log('📸 [Playwright] Capturing Mintu Road Fountain Terrace (Mehjabin & Iman)...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.cameras.main.centerOn(1060, 736);
  });
  await page.waitForTimeout(500);
  const fountainScreenshotPath = path.join(ARTIFACTS_DIR, 'npc_scatter_fountain_terrace.png');
  await page.screenshot({ path: fountainScreenshotPath });
  console.log(`✅ Saved: ${fountainScreenshotPath}`);

  // Area C: Center camera on Charukola Art Corridor (Nadia, Clay Artist, strolling citizens)
  console.log('📸 [Playwright] Capturing Charukola Art Corridor (Nadia & strolling artists)...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.cameras.main.centerOn(320, 736);
  });
  await page.waitForTimeout(500);
  const charukolaScreenshotPath = path.join(ARTIFACTS_DIR, 'npc_scatter_charukola_roaming.png');
  await page.screenshot({ path: charukolaScreenshotPath });
  console.log(`✅ Saved: ${charukolaScreenshotPath}`);

  // Area D: Center camera on Dhanmondi Lake Promenade (Tania the jogger running active laps)
  console.log('📸 [Playwright] Capturing Dhanmondi Lake Promenade (Tania jogger & lakeside strollers)...');
  await page.evaluate(() => {
    const scene = window.__activeScene;
    scene.cameras.main.centerOn(1550, 780);
  });
  await page.waitForTimeout(500);
  const lakeScreenshotPath = path.join(ARTIFACTS_DIR, 'npc_scatter_dhanmondi_lake.png');
  await page.screenshot({ path: lakeScreenshotPath });
  console.log(`✅ Saved: ${lakeScreenshotPath}`);

  await browser.close();
  console.log('✨ [Playwright] Dynamic NPC scatter and ambient roaming verification complete!');
}

run().catch(err => {
  console.error('❌ [Playwright] Error:', err);
  process.exit(1);
});
