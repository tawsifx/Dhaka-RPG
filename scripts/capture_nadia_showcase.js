// scripts/capture_nadia_showcase.js
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.scheduleSystem, { timeout: 20000 });

  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(200);

  // Setup Nadia at a clear spot near Charukola
  const directions = ['down', 'left', 'right', 'up'];
  for (const dir of directions) {
    await page.evaluate((d) => {
      const scene = window.__activeScene;
      if (scene.player) scene.player.setPosition(1800, 1800);
      if (scene.totoro) scene.totoro.setPosition(1800, 1800);

      const ent = scene.scheduleSystem.activeNpcs.get('nadia');
      if (ent) {
        ent.mover.setPath([]);
        ent.mover.state = 'idle';
        ent.mover.facing = d;
        ent.mover.x = 448;
        ent.mover.y = 780;
        ent.sprite.setPosition(448, 780);
        scene.scheduleSystem.update(scene.time.now, 16);
        scene.cameras.main.stopFollow();
        scene.cameras.main.centerOn(448, 770);
        scene.cameras.main.setZoom(2.4);
      }
    }, dir);
    await page.waitForTimeout(150);

    const outPath = path.join(ARTIFACT_DIR, `nadia_female_painter_${dir}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot for ${dir}: ${outPath}`);
  }

  // Trigger dialogue interaction with Nadia
  await page.evaluate(() => {
    const scene = window.__activeScene;
    const ent = scene.scheduleSystem.activeNpcs.get('nadia');
    if (ent && scene.player) {
      scene.player.setPosition(448, 812);
      scene.cameras.main.centerOn(448, 770);
      scene.cameras.main.setZoom(1.8);
      // Trigger interaction
      if (ent.interactObj && ent.interactObj.onInteract) {
        ent.interactObj.onInteract();
      }
    }
  });
  await page.waitForTimeout(400);

  const dialogPath = path.join(ARTIFACT_DIR, 'nadia_female_painter_dialogue.png');
  await page.screenshot({ path: dialogPath });
  console.log(`Saved dialogue screenshot: ${dialogPath}`);

  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
