// src/ui/MobileSupport.ts - Phone/browser play helpers
// Fullscreen + landscape lock + screen wake lock, rotate-device hint, iOS "Add to Home Screen" hint,
// and suppression of browser gestures (pinch zoom, double-tap zoom, long-press menu) that break touch play.

type WakeLockSentinelLike = { release: () => Promise<void> };

const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(hover: none) and (pointer: coarse)').matches || navigator.maxTouchPoints > 0);

const isIOS = (): boolean =>
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches ||
  (navigator as any).standalone === true;

const fsElement = (): Element | null =>
  document.fullscreenElement || (document as any).webkitFullscreenElement || null;

async function enterFullscreen(): Promise<void> {
  const el: any = document.documentElement;
  try {
    if (!fsElement()) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }
  } catch {
    /* denied or unsupported (e.g. iPhone Safari) - ignore */
  }
  try {
    // Only permitted while fullscreen on Android/Chrome; harmless elsewhere
    await (screen.orientation as any)?.lock?.('landscape');
  } catch {
    /* ignore */
  }
}

async function exitFullscreen(): Promise<void> {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    (screen.orientation as any)?.unlock?.();
  } catch {
    /* ignore */
  }
}

export function injectMobileFitStyles(): void {
  if (typeof document === 'undefined' || document.getElementById('mobile-fit-style')) return;
  const css = `
@media (hover: none) and (pointer: coarse), (max-width: 950px) {
  :root {
    --slot: clamp(24px, calc((100vw - 380px) / 10 - 3px), 32px);
  }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

  /* HUD above the mobile joystick/arc buttons so the drawer is always tappable */
  #top-hud {
    z-index: 40;
    top: calc(env(safe-area-inset-top, 0px) + 4px);
    left: calc(env(safe-area-inset-left, 0px) + 6px);
    right: calc(env(safe-area-inset-right, 0px) + 6px);
    gap: 4px;
  }
  .hud-card { padding: 3px 7px; border-width: 1.5px; border-radius: 8px; }
  .hud-zone-card, .hud-stats-card { min-width: 0; }
  .hud-row { font-size: 0.7rem; gap: 4px; }
  .hud-subrow { font-size: 0.6rem; margin-top: 0; }
  .stat-top { font-size: 0.64rem; }
  .heart-container { font-size: 0.7rem; letter-spacing: 0; }
  .bar-group { gap: 4px; }
  .stat-bar { height: 11px; min-width: 52px; }
  .stat-bar span { font-size: 0.5rem; }
  .hud-quest-card { flex: 1 1 120px; min-width: 0; }
  .quest-header { font-size: 0.42rem; margin-bottom: 1px; }
  #hud-quest {
    font-size: 0.62rem; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: none;
  }

  /* Burger button + drawer */
  .hamburger-btn { width: 34px; height: 34px; gap: 3px; border-radius: 8px; }
  .hamburger-bar { width: 16px; height: 2px; }
  .hamburger-btn.open .hamburger-bar:nth-child(1) { transform: translateY(5px) rotate(45deg); }
  .hamburger-btn.open .hamburger-bar:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }
  .hud-dropdown-drawer {
    top: calc(100% + 4px);
    width: max-content;
    max-width: calc(100vw - 16px);
    padding: 5px;
    gap: 4px;
    display: grid;
    grid-template-columns: repeat(2, auto);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    border-width: 2px;
    outline-width: 1.5px;
    border-radius: 10px;
  }
  .hud-dropdown-drawer[hidden] { display: none !important; }
  .drawer-item-btn {
    padding: 7px 9px;
    font-size: 0.7rem;
    white-space: nowrap;
    touch-action: manipulation;
  }

  /* Minimap */
  #minimap-panel {
    top: calc(env(safe-area-inset-top, 0px) + 64px);
    right: calc(env(safe-area-inset-right, 0px) + 6px);
    transform: scale(0.7);
    transform-origin: top right;
  }

  /* Hotbar */
  #bottom-hud {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
    transform: translateX(-50%) !important;
  }
  #inventory-bar { gap: 3px; padding: 3px; border-width: 2px; border-radius: 9px; }
  .hotbar-slot { width: var(--slot); height: var(--slot); border-width: 1.5px; border-radius: 6px; }
  .slot-key { font-size: 0.42rem; top: 1px; left: 3px; }
  .slot-emoji { font-size: calc(var(--slot) * 0.52); }
}

/* Portrait phones: lift the hotbar above the thumb controls, and fit 10 slots across */
@media ((hover: none) and (pointer: coarse), (max-width: 950px)) and (orientation: portrait) {
  :root { --slot: clamp(22px, calc((100vw - 48px) / 10 - 3px), 32px); }
  #bottom-hud { bottom: calc(env(safe-area-inset-bottom, 0px) + 190px); }
}`;

  const style = document.createElement('style');
  style.id = 'mobile-fit-style';
  style.textContent = css;
  document.head.appendChild(style);
}

export function initDrawerViewportFit(): void {
  if (typeof document === 'undefined') return;
  const dd = () => document.getElementById('hud-dropdown-menu');

  // Cap the drawer to the *visible* iOS viewport (not the 100vh that hides under Safari's toolbar)
  function fitDrawer(): void {
    const el = dd();
    if (!el || el.hidden) return;
    const vv = window.visualViewport;
    const viewH = Math.min(window.innerHeight, vv ? vv.height : window.innerHeight);
    el.style.maxHeight = 'none';
    const top = el.getBoundingClientRect().top;
    el.style.maxHeight = Math.max(100, Math.floor(viewH - top - 16)) + 'px';
    el.scrollTop = 0;
  }

  const el = dd();
  if (el) new MutationObserver(() => requestAnimationFrame(fitDrawer))
    .observe(el, { attributes: true, attributeFilter: ['hidden'] });
  const mb = document.getElementById('btn-menu-toggle');
  if (mb) mb.addEventListener('click', () => setTimeout(fitDrawer, 30));
  window.addEventListener('resize', fitDrawer);
  window.addEventListener('orientationchange', () => setTimeout(fitDrawer, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitDrawer);
}

export function initMobileSupport(): void {
  if (typeof document === 'undefined') return;
  injectMobileFitStyles();
  initDrawerViewportFit();
  const touch = isTouchDevice();

  // ---- Tag mobile device / small viewport on body for clean responsive styling
  const updateMobileClass = (): void => {
    const isMobile = isTouchDevice() || window.innerWidth <= 950 || window.innerHeight <= 550;
    document.body.classList.toggle('is-mobile-device', isMobile);
  };
  updateMobileClass();
  window.addEventListener('resize', updateMobileClass);
  window.addEventListener('orientationchange', updateMobileClass);

  // ---- Suppress browser gestures that fight the game (pinch zoom, double-tap zoom, context menu)
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev =>
    document.addEventListener(ev, e => e.preventDefault(), { passive: false } as any)
  );
  document.addEventListener(
    'touchmove',
    e => {
      if ((e as TouchEvent).touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    e => {
      const now = Date.now();
      if (now - lastTouchEnd < 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );
  if (touch) document.addEventListener('contextmenu', e => e.preventDefault());

  if (!touch) return;

  // ---- Screen wake lock (keeps the phone awake while playing)
  let wake: WakeLockSentinelLike | null = null;
  const requestWake = async (): Promise<void> => {
    try {
      if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') {
        wake = await (navigator as any).wakeLock.request('screen');
        (wake as any).addEventListener?.('release', () => (wake = null));
      }
    } catch {
      wake = null;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestWake();
  });

  // ---- Fullscreen button (not shown in standalone/PWA mode, or where fullscreen is impossible)
  const canFullscreen = Boolean(
    (document.documentElement as any).requestFullscreen || (document.documentElement as any).webkitRequestFullscreen
  );
  let fsBtn: HTMLButtonElement | null = null;
  if (canFullscreen && !isStandalone()) {
    fsBtn = document.createElement('button');
    fsBtn.id = 'btn-fullscreen';
    fsBtn.type = 'button';
    fsBtn.className = 'fullscreen-btn';
    fsBtn.setAttribute('aria-label', 'Toggle fullscreen');
    fsBtn.textContent = '⛶';
    fsBtn.addEventListener('click', () => {
      if (fsElement()) exitFullscreen();
      else enterFullscreen();
    });
    document.body.appendChild(fsBtn);
    const sync = () => fsBtn && (fsBtn.textContent = fsElement() ? '🗗' : '⛶');
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
  }

  // ---- First tap on a title command: go fullscreen + landscape + wake lock (needs a user gesture)
  ['btn-title-new', 'btn-title-continue'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      requestWake();
      if (canFullscreen && !isStandalone()) enterFullscreen();
    });
  });
  document.addEventListener('pointerdown', () => requestWake(), { once: true });

  // ---- Rotate-device hint (portrait) + iOS install hint
  const hint = document.createElement('div');
  hint.id = 'rotate-hint';
  hint.hidden = true;
  const iosTip =
    isIOS() && !isStandalone()
      ? '<div class="rotate-sub">Tip: tap Share → “Add to Home Screen” to play full-screen.</div>'
      : '';
  hint.innerHTML =
    '<div class="rotate-card"><div class="rotate-icon">📱↻</div>' +
    '<div class="rotate-title">ROTATE YOUR PHONE</div>' +
    '<div class="rotate-sub">The adventure plays best in landscape.</div>' +
    iosTip +
    '<button type="button" id="btn-rotate-dismiss" class="rotate-btn">PLAY ANYWAY</button></div>';
  document.body.appendChild(hint);

  let dismissed = false;
  const updateHint = (): void => {
    const portrait = window.innerHeight > window.innerWidth;
    hint.hidden = !(portrait && !dismissed);
  };
  hint.querySelector('#btn-rotate-dismiss')?.addEventListener('click', () => {
    dismissed = true;
    updateHint();
  });
  window.addEventListener('resize', () => {
    // Returning to landscape re-arms the hint for the next time the phone is held upright
    if (window.innerWidth >= window.innerHeight) dismissed = false;
    updateHint();
  });
  window.addEventListener('orientationchange', () => setTimeout(updateHint, 200));
  updateHint();
}
