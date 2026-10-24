// scripts/test_dialogue_restoration.js
const { chromium } = require('playwright');
const path = require('path');

async function testDialogueRestoration() {
  console.log('🚀 [Playwright] Launching Chrome test runner...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  // Wait for game scene initialization
  console.log('Waiting for active scene and scheduleSystem...');
  await page.waitForFunction(() => !!window.__activeScene && !!window.__activeScene.scheduleSystem, { timeout: 20000 });

  // Dismiss title screen overlay if present
  await page.evaluate(() => {
    const title = document.getElementById('title-screen-overlay');
    if (title) title.hidden = true;
  });
  await page.waitForTimeout(500);

  // Evaluate inside game scene
  const testResults = await page.evaluate(async () => {
    const results = [];
    const scene = window.__activeScene || (window.game ? window.game.scene.getScene('DhakaValleyScene') : null);
    if (!scene) {
      return { error: 'DhakaValleyScene not found' };
    }

    const sched = scene.scheduleSystem;
    if (!sched) {
      return { error: 'ScheduleSystem not found on scene' };
    }

    // Helper to get active NPC by ID
    const getNpc = (id) => sched.activeNpcs.get(id);

    // Helper to read current dialogue DOM
    const getDialogueState = () => {
      const overlay = document.getElementById('dialogue-overlay');
      const speaker = document.getElementById('dlg-speaker')?.textContent || '';
      const text = document.getElementById('dlg-text')?.textContent || '';
      const choices = Array.from(document.querySelectorAll('.choice-option-btn')).map(b => b.textContent.trim());
      const isVisible = overlay && !overlay.hidden;
      return { isVisible, speaker, text, choices };
    };

    const closeDlg = () => {
      const overlay = document.getElementById('dialogue-overlay');
      if (overlay) overlay.hidden = true;
    };

    const npcsToTest = ['anamika', 'mimi', 'baki_bhai', 'sami', 'arif', 'nadia', 'tania'];

    for (const npcId of npcsToTest) {
      const ent = getNpc(npcId);
      if (!ent) {
        results.push({ id: npcId, success: false, reason: 'NPC entity not found in activeNpcs' });
        continue;
      }

      // Trigger interaction
      ent.onInteract();
      await new Promise(r => setTimeout(r, 50));

      // Fast forward typing to reveal choices immediately
      if (window.UI && typeof window.UI.advanceDialogue === 'function') {
        window.UI.advanceDialogue();
      } else {
        document.getElementById('dialogue-overlay')?.click();
      }
      await new Promise(r => setTimeout(r, 100));

      const state = getDialogueState();
      results.push({
        id: npcId,
        displayName: ent.def.displayName,
        speaker: state.speaker,
        dialogueVisible: state.isVisible,
        fullText: state.text,
        choices: state.choices,
        success: state.isVisible && state.choices.length > 0 && !state.text.includes('A beautiful day across Dhaka Valley.')
      });

      // Close dialogue before next test
      closeDlg();
      await new Promise(r => setTimeout(r, 100));
    }

    // Now test Anamika's Bestie high-five SP restore action
    const anamika = getNpc('anamika');
    window.DateState.sp = 10;
    anamika.onInteract();
    await new Promise(r => setTimeout(r, 50));
    if (window.UI && typeof window.UI.advanceDialogue === 'function') window.UI.advanceDialogue();
    await new Promise(r => setTimeout(r, 100));

    // Find and click the bestie high-five button
    const choiceButtons = Array.from(document.querySelectorAll('.choice-option-btn'));
    const highFiveBtn = choiceButtons.find(b => b.textContent.includes('Bestie high-five'));
    let spRestored = false;
    if (highFiveBtn) {
      highFiveBtn.click();
      await new Promise(r => setTimeout(r, 100));
      spRestored = (window.DateState.sp === window.DateState.maxSp);
    }
    results.push({
      test: 'anamika_sp_boost',
      success: spRestored,
      spAfter: window.DateState.sp,
      maxSp: window.DateState.maxSp
    });

    closeDlg();
    await new Promise(r => setTimeout(r, 100));

    // Test Mimi's crunchy snack bite HP restore
    const mimi = getNpc('mimi');
    window.DateState.hp = 50;
    mimi.onInteract();
    await new Promise(r => setTimeout(r, 50));
    if (window.UI && typeof window.UI.advanceDialogue === 'function') window.UI.advanceDialogue();
    await new Promise(r => setTimeout(r, 100));

    const mimiButtons = Array.from(document.querySelectorAll('.choice-option-btn'));
    const snackBtn = mimiButtons.find(b => b.textContent.includes('crunchy snack bite'));
    let hpRestored = false;
    if (snackBtn) {
      snackBtn.click();
      await new Promise(r => setTimeout(r, 100));
      hpRestored = (window.DateState.hp === 70);
    }
    results.push({
      test: 'mimi_hp_boost',
      success: hpRestored,
      hpAfter: window.DateState.hp
    });

    closeDlg();
    await new Promise(r => setTimeout(r, 100));

    // Test Sami's photo capture flash & toast
    const sami = getNpc('sami');
    window.DateState.sideQuests.sq_photo_pose = false;
    sami.onInteract();
    await new Promise(r => setTimeout(r, 50));
    if (window.UI && typeof window.UI.advanceDialogue === 'function') window.UI.advanceDialogue();
    await new Promise(r => setTimeout(r, 100));

    const samiButtons = Array.from(document.querySelectorAll('.choice-option-btn'));
    const photoBtn = samiButtons.find(b => b.textContent.includes('Romantic Sunset Gaze'));
    let photoTaken = false;
    if (photoBtn) {
      photoBtn.click();
      await new Promise(r => setTimeout(r, 100));
      photoTaken = window.DateState.sideQuests.sq_photo_pose === true;
    }
    results.push({
      test: 'sami_photo_capture',
      success: photoTaken,
      sq_photo_pose: window.DateState.sideQuests.sq_photo_pose
    });

    closeDlg();

    return results;
  });

  console.log('Test Results:');
  console.log(JSON.stringify(testResults, null, 2));

  // Trigger Anamika's dialogue for a screenshot evidence
  await page.evaluate(() => {
    const scene = window.__activeScene;
    const anamika = scene.scheduleSystem.activeNpcs.get('anamika');
    anamika.onInteract();
    if (window.UI && typeof window.UI.advanceDialogue === 'function') window.UI.advanceDialogue();
  });
  await page.waitForTimeout(500);

  const screenshotPath = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89/anamika_dialogue_restored.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);

  // Trigger Nadia's dialogue for screenshot evidence
  await page.evaluate(() => {
    const overlay = document.getElementById('dialogue-overlay');
    if (overlay) overlay.hidden = true;
    const scene = window.__activeScene;
    const nadia = scene.scheduleSystem.activeNpcs.get('nadia');
    nadia.onInteract();
  });
  await page.waitForTimeout(500);

  const nadiaScreenshotPath = '/Users/tawsifx/.gemini/antigravity/brain/33ebc619-f311-47cd-a634-da9b73a15d89/nadia_dialogue_restored.png';
  await page.screenshot({ path: nadiaScreenshotPath });
  console.log('Saved screenshot to:', nadiaScreenshotPath);

  await browser.close();
}

testDialogueRestoration().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
