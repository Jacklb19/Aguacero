/**
 * Measures how responsive the page stays: a requestAnimationFrame gap sampler (all browsers)
 * plus `longtask` entries where supported (Chromium). Feature-detected, never assumed.
 */
export interface ResponsivenessSample {
  blockedMs: number;
  peakFrameGapMs: number;
}

export class ResponsivenessMonitor {
  private raf = 0;
  private last = 0;
  private peak = 0;
  private gapBlocked = 0;
  private longTaskMs = 0;
  private observer: PerformanceObserver | null = null;
  private longTasksSupported = false;

  start() {
    this.peak = 0;
    this.gapBlocked = 0;
    this.longTaskMs = 0;
    this.last = performance.now();
    const tick = (now: number) => {
      const gap = now - this.last;
      this.last = now;
      if (gap > this.peak) this.peak = gap;
      // Anything over 50 ms counts as the page being unable to respond.
      if (gap > 50) this.gapBlocked += gap;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    const types = typeof PerformanceObserver !== "undefined" ? PerformanceObserver.supportedEntryTypes ?? [] : [];
    if (types.includes("longtask")) {
      this.longTasksSupported = true;
      this.observer = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) this.longTaskMs += e.duration;
      });
      this.observer.observe({ type: "longtask", buffered: false });
    }
  }

  /** Stops sampling and includes the frame gap still open at the time of the call. */
  stop(): ResponsivenessSample {
    cancelAnimationFrame(this.raf);
    const open = performance.now() - this.last;
    if (open > this.peak) this.peak = open;
    if (open > 50) this.gapBlocked += open;
    this.observer?.disconnect();
    this.observer = null;
    return {
      blockedMs: this.longTasksSupported ? Math.max(this.longTaskMs, 0) : this.gapBlocked,
      peakFrameGapMs: this.peak,
    };
  }
}

/** Yields to the browser so it can paint. rAF does not fire in hidden tabs, so a timeout backs it up. */
export const nextFrame = () =>
  new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setTimeout(resolve, 0);
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 50);
  });
