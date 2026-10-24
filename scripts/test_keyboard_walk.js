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
    scene.player.setPosition(480, 820);
    if (scene.totoro) scene.totoro.setPosition(430, 820);
    scene.cameras.main.centerOn(480, 820);
    scene.cameras.main.setZoom(2.8);
  });
  await page.waitForTimeout(300);

  const artifactDir = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89';

  // 1. Press and hold 'KeyD' to walk RIGHT
  console.log('Pressing KeyD (Right)...');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  
  const rightStatus = await page.evaluate(() => {
    const p = window.__activeScene.player;
    return {
      vx: p.body.velocity.x,
      anim: p.anims.currentAnim?.key,
      frame: p.anims.currentFrame?.textureFrame,
      flipX: p.flipX
    };
  });
  console.log('Right status:', rightStatus);
  await page.screenshot({ path: path.join(artifactDir, 'satsuki_live_walk_right.png') });
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(200);

  // 2. Press and hold 'KeyA' to walk LEFT
  console.log('Pressing KeyA (Left)...');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(300);
  
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
  await page.screenshot({ path: path.join(artifactDir, 'satsuki_live_walk_left.png') });
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(200);

  await browser.close();
  console.log('Done live walk tests!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
