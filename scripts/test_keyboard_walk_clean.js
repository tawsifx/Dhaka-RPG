const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.player, { timeout: 20000 });

  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
    const scene = window.__activeScene;
    // Set player on empty clear stone path
    scene.player.setPosition(650, 820);
    if (scene.totoro) scene.totoro.setPosition(250, 820);
    scene.cameras.main.centerOn(650, 820);
    scene.cameras.main.setZoom(2.8);
  });
  await page.waitForTimeout(300);

  const artifactDir = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';

  // Walk LEFT
  console.log('Pressing KeyA (Left)...');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(200);
  
  const leftStatus = await page.evaluate(() => {
    const p = window.__activeScene.player;
    return {
      vx: p.body.velocity.x,
      anim: p.anims.currentAnim?.key,
      frame: p.anims.currentFrame?.textureFrame,
      flipX: p.flipX
    };
  });
  console.log('Left status:', leftStatus);
  await page.screenshot({ path: path.join(artifactDir, 'satsuki_clean_walk_left.png') });
  await page.keyboard.up('KeyA');

  await browser.close();
  console.log('Done clean walk left test!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
