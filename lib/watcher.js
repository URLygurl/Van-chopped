// Stage 5: WATCH for changes. Uses Node's built-in recursive fs.watch
// (supported on macOS/Windows and Linux on Node 20+), debounced like Chops'
// 0.5s FileWatcher. Falls back silently per-root if recursive watch is
// unsupported on the platform.

import fs from 'node:fs';
import { expandHome } from './sources.js';

export class Watcher {
  constructor(onChange, { debounceMs = 500 } = {}) {
    this.onChange = onChange;
    this.debounceMs = debounceMs;
    this.watchers = [];
    this.timer = null;
  }

  watch(scanPaths) {
    this.stop();
    const roots = [...new Set(scanPaths.map(expandHome))];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      try {
        const w = fs.watch(root, { recursive: true }, () => this.trigger());
        this.watchers.push(w);
      } catch {
        try {
          const w = fs.watch(root, () => this.trigger()); // non-recursive fallback
          this.watchers.push(w);
        } catch { /* unwatchable root, ignore */ }
      }
    }
    return this.watchers.length;
  }

  trigger() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onChange(), this.debounceMs);
  }

  stop() {
    clearTimeout(this.timer);
    for (const w of this.watchers) { try { w.close(); } catch {} }
    this.watchers = [];
  }
}
