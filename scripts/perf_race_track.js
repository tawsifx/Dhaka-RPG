// scripts/perf_race_track.js - REAL-track performance & memory measurement (PERF.md A1 + M4 8-kart audits)
// Usage: node scripts/perf_race_track.js [--rivals] [--drift-sec=60] [--json=out.json]
const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 3000;
const URL = `http://localhost:${PORT}/`;
const args = process.argv.slice(2);
const RIVALS = args.includes('--rivals');
const DRIFT_SEC = Number((args.find((a) => a.startsWith('--drift-sec=')) || '--drift-sec=60').split('=')[1]);

const ping = () => new Promise((r) => { const q = http.get(URL, () => r(true)); q.on('error', () => r(false)); q.setTimeout(1000, () => { q.destroy(); r(false); }); });
async function ensureServer() {
  if (await ping()) return null;
  const p = spawn('npx', ['vite', '--port', String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 250)); if (await ping()) return p; }
  throw new Error('vite did not start');
}

async function startRace(page) {
  await page.waitForFunction(() => !!window.__activeScene, { timeout: 30000 });
  const t0 = Date.now();
  await page.evaluate((rivals) => {
    if (rivals && window.__race === undefined) {
      window.__activeScene.startRickshawRace({ mode: 'quick', difficulty: 'beshi_gorom', seed: 1234 });
    } else {
      window.__activeScene.startRickshawRace();
    }
  }, RIVALS);
  await page.waitForFunction(() => window.__race && window.__race.engine && window.__race.engine.trackRuntime, { timeout: 60000 });
  const loadWallMs = Date.now() - t0;
  const timings = await page.evaluate(() => window.__race.engine.trackRuntime.timings);
  await page.waitForFunction(() => { const el = document.getElementById('race-countdown-overlay'); return el && el.textContent === 'GO!'; }, { timeout: 15000 });
  return { loadWallMs, timings };
}

async function fps(page, ms) {
  return page.evaluate((dur) => new Promise((res) => {
    let frames = 0; const t0 = performance.now(); let worst = 0; let last = t0;
    function f(t) { frames++; worst = Math.max(worst, t - last); last = t; if (t - t0 < dur) requestAnimationFrame(f); else res({ fps: (frames * 1000) / (t - t0), worstFrameMs: worst }); }
    requestAnimationFrame(f);
  }), ms);
}

async function runScenario(browser, label, { mobile, throttle }) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
    : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.goto(URL, { waitUntil: 'load' });
  const load = await startRace(page);
  // autopilot drive
  await page.evaluate(() => {
    const e = window.__race.engine; const ap = new window.__race.TrackAutopilot(e.trackRuntime.spline, 24.5, 16.0);
    const orig = e.controller.update.bind(e.controller);
    e.controller.update = function (dt, input) { return orig(dt, ap.computeInput(this.getState())); };
  });
  await page.waitForTimeout(3000);
  const f = await fps(page, 6000);
  const info = await page.evaluate(() => { const r = window.__race.engine.renderer; const ri = r.getRenderInfo(); const mi = r.getMemoryInfo(); return { drawCalls: ri.calls, triangles: ri.triangles, geometries: mi.geometries, textures: mi.textures }; });
  // sustained drift on open infield, heap samples
  await page.evaluate(() => {
    const e = window.__race.engine; e.controller.update = Object.getPrototypeOf(e.controller).update.bind(e.controller);
    window.__race.teleport(60, 0, -60, 0);
  });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(800);
  await page.keyboard.down('KeyA'); await page.keyboard.down('ShiftLeft');
  const heap = [];
  const sample = async () => { await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); return page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize / 1048576 : -1); };
  heap.push({ t: 0, mb: await sample() });
  for (let s = 15; s <= DRIFT_SEC; s += 15) { await page.waitForTimeout(15000); heap.push({ t: s, mb: await sample() }); }
  const driftFps = await fps(page, 3000);
  await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyA'); await page.keyboard.up('KeyW');
  await page.evaluate(() => window.__race.exit('user'));
  await ctx.close();
  return { label, mobile, throttle, load, fps: f, info, heap, driftFps };
}

(async () => {
  const server = await ensureServer();
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const out = [];
  try {
    out.push(await runScenario(browser, 'desktop', { mobile: false, throttle: 1 }));
    out.push(await runScenario(browser, 'mobile-4x', { mobile: true, throttle: 4 }));
    console.log(JSON.stringify(out, null, 2));
  } finally { await browser.close(); if (server) server.kill(); }
})().catch((e) => { console.error(e); process.exit(1); });
