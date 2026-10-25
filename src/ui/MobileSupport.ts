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

export function initMobileSupport(): void {
  if (typeof document === 'undefined') return;
  const touch = isTouchDevice();

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
