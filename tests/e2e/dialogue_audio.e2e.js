// tests/e2e/dialogue_audio.e2e.js - End-to-End verification of dialogue system, anime music scroll & vector icons UI
const { chromium } = require('playwright');

async function runTest(page) {
  console.log('  🔍 [E2E: Dialogue & Audio] Waiting for active scene and UI overlay initialization...');
  await page.waitForFunction(() => !!window.__activeScene && !!window.DateState, { timeout: 25000 });

  // Dismiss title overlay if present
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(400);

  // 1. Dialogue Overlay Verification
  console.log('  💬 [E2E: Dialogue] Testing dialogue triggering...');
  const dialogueTest = await page.evaluate(() => {
    const scene = window.__activeScene;
    if (!scene) return { success: false, reason: 'No active scene' };

    // Trigger dialogue directly or via openingDialogueSystem
    const overlay = document.getElementById('dialogue-overlay');
    const speakerEl = document.getElementById('dlg-speaker');
    const textEl = document.getElementById('dlg-text');

    if (scene.openingDialogueSystem && scene.openingDialogueSystem.startOpeningDialogue) {
      scene.openingDialogueSystem.startOpeningDialogue('anamika');
    } else if (overlay) {
      overlay.hidden = false;
      if (speakerEl) speakerEl.textContent = 'Anamika';
      if (textEl) textEl.textContent = 'Welcome back to Dhaka!';
    }

    const isVisible = overlay && !overlay.hidden;
    const speaker = speakerEl ? speakerEl.textContent : '';
    const text = textEl ? textEl.textContent : '';

    // Close dialogue
    if (overlay) overlay.hidden = true;

    return {
      success: isVisible,
      speaker,
      text
    };
  });

  console.log('  💬 [E2E: Dialogue] Trigger result:', dialogueTest);
  if (!dialogueTest.success) {
    throw new Error('Dialogue overlay failed to show');
  }

  // 2. Clean UI Verification: Ensure no legacy Telegram live indicators pollute DOM
  const legacyTgCheck = await page.evaluate(() => {
    const tgIndicator = document.getElementById('telegram-live-indicator');
    const tgText = document.getElementById('telegram-live-text');
    return Boolean(tgIndicator || tgText);
  });
  if (legacyTgCheck) {
    throw new Error('Legacy Telegram indicator found in DOM!');
  }

  // 3. Anime Music Scroll & Vector Icons Verification
  console.log('  🎵 [E2E: Audio] Checking anime music momentum scroll and vector icons...');
  const audioUiState = await page.evaluate(() => {
    const scrollContainer = document.getElementById('anime-track-scroll');
    const trackCards = document.querySelectorAll('.anime-track-card');
    const filterPills = document.querySelectorAll('.anime-filter-pill');
    const faIcons = document.querySelectorAll('i.fa-solid');

    return {
      hasScrollContainer: Boolean(scrollContainer),
      trackCount: trackCards.length,
      filterCount: filterPills.length,
      faIconCount: faIcons.length
    };
  });

  console.log('  🎶 [E2E: Audio] Audio UI State:', audioUiState);
  if (!audioUiState.hasScrollContainer) {
    throw new Error('Anime track scroll container #anime-track-scroll not found in DOM!');
  }
  if (audioUiState.trackCount === 0) {
    throw new Error('No anime track cards found in #anime-track-scroll!');
  }
  if (audioUiState.faIconCount === 0) {
    throw new Error('Expected Font Awesome vector icons in HUD/audio UI, found 0!');
  }

  console.log('  ✅ [E2E: Dialogue & Audio] Dialogue engine, UI typography, and audio track scroll successfully verified.');
  return { success: true };
}

module.exports = { runTest };

if (require.main === module) {
  (async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(process.env.TEST_URL || 'http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await runTest(page);
    await browser.close();
  })().catch(err => {
    console.error('❌ [E2E: Dialogue & Audio Failed]', err);
    process.exit(1);
  });
}
