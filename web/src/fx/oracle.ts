/**
 * Canvas show for the match page's forecast run, drawn over the whole match hero.
 *
 *   idle      thin streams drift from both crests into the start button
 *   gather    "loading the data": both crests pour particles into the core
 *   fit       the core spins up into a vortex, ringed by the three outcome arcs
 *   simulate  the vortex bursts into the 6×6 scoreline grid, then a Monte Carlo
 *             run keeps firing sampled scorelines into it
 *   finale    the grid collapses into the core and detonates
 *   afterglow the blast fades out, then the loop stops
 *
 * The simulation is real: every scoreline is drawn from the model's own score
 * matrix, and the tallies it reports are the counts of those draws.
 */

export type FxMode = "off" | "idle" | "gather" | "fit" | "simulate" | "finale" | "afterglow";

export interface FxStats {
  sims: number;
  home: number; draw: number; away: number;
  top: { h: number; a: number; p: number } | null;
}

export interface FxTeams {
  homeColor: string; awayColor: string;
  homeLabel: string; awayLabel: string;
  /** Recent scorelines, drifted in as text while the data loads. */
  homeGlyphs: string[]; awayGlyphs: string[];
}

type RGB = readonly [number, number, number];
interface Anchor { x: number; y: number; r: number; w: number; h: number }
type Kind = "stream" | "glyph" | "orbit" | "shot" | "implode" | "spark";

interface Particle {
  kind: Kind;
  rgb: RGB; spr: HTMLCanvasElement; size: number; alpha: number;
  // path particles: quadratic bezier from (x0,y0) through (cx,cy) to (x1,y1), t in [0,1]
  x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; t: number; dur: number;
  // orbit particles
  r: number; rt: number; a: number; w: number; sq: number; tilt: number; age: number;
  // sparks
  x: number; y: number; vx: number; vy: number; life: number; max: number;
  cell: number; text: string;
}

interface Wave { x: number; y: number; r: number; v: number; life: number; decay: number; rgb: RGB; width: number }

const TAU = Math.PI * 2;
const GOLD: RGB = [232, 196, 116];
const WHITE: RGB = [255, 246, 228];
// Outcome series, a touch brighter than the CSS palette so they glow on the dark hero.
const OUT = { home: [226, 168, 66] as RGB, draw: [170, 158, 240] as RGB, away: [48, 204, 170] as RGB };
const MAX_PARTICLES = 1800;
const GRID = 6;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
/** Simulated matches after `t` seconds: 10,000 in the first 2.6 s, then a steady climb. */
const simTarget = (t: number) => Math.floor(10_000 * easeOut(t / 2.6) + Math.max(0, t - 2.6) * 6_000);

export class OracleFx {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private W = 0;
  private H = 0;
  private home: Anchor = { x: 0, y: 0, r: 40, w: 80, h: 80 };
  private away: Anchor = { x: 0, y: 0, r: 40, w: 80, h: 80 };
  private core: Anchor = { x: 0, y: 0, r: 100, w: 200, h: 200 };
  private measured = false;

  private ps: Particle[] = [];
  private waves: Wave[] = [];
  private mode: FxMode = "off";
  private modeT = 0;
  private time = 0;
  private last = 0;
  private raf = 0;
  private visible = true;
  private hover = false;
  private sinceMeasure = 0;
  private emitCarry = 0;
  private pulse = 0;

  private homeRgb: RGB = OUT.home;
  private awayRgb: RGB = OUT.away;
  private teams: FxTeams = { homeColor: "", awayColor: "", homeLabel: "", awayLabel: "", homeGlyphs: [], awayGlyphs: [] };
  private sprites = new Map<string, HTMLCanvasElement>();

  private energy = 0; // core glow
  private flash = 0; // full-hero flash
  private arcA = 0; // outcome arcs around the vortex
  private gridA = 0;
  private detonated = false;

  // Monte Carlo over the score matrix
  private cdf: Float64Array | null = null;
  private cellsI: Int32Array = new Int32Array(0);
  private cellsJ: Int32Array = new Int32Array(0);
  private counts = new Float64Array(GRID * GRID);
  private shown = new Float64Array(GRID * GRID);
  private hits = new Float64Array(GRID * GRID);
  private tally = { h: 0, d: 0, a: 0 };
  private sims = 0;
  private simBase = 0; // draws made when the vortex burst, before the timed run
  private pendingBurst = false;

  private listeners = new Set<(s: FxStats) => void>();
  private statsAt = 0;
  private impact?: () => void;
  private ro: ResizeObserver;
  private io: IntersectionObserver;

  constructor(private canvas: HTMLCanvasElement, private hero: HTMLElement) {
    this.ctx = canvas.getContext("2d")!;
    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(hero);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.wake();
    });
    this.io.observe(hero);
    this.measure();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro.disconnect();
    this.io.disconnect();
    this.listeners.clear();
  }

  // ---------- inputs ----------

  setTeams(t: FxTeams) {
    this.teams = t;
    this.homeRgb = vivid(t.homeColor, OUT.home);
    this.awayRgb = vivid(t.awayColor, OUT.away);
  }

  setMatrix(matrix: number[][] | null) {
    if (!matrix) { this.cdf = null; return; }
    const I: number[] = [], J: number[] = [], C: number[] = [];
    let acc = 0;
    matrix.forEach((row, i) => row.forEach((p, j) => {
      if (!(p > 0)) return;
      acc += p;
      I.push(i); J.push(j); C.push(acc);
    }));
    this.cdf = Float64Array.from(C, (c) => c / acc);
    this.cellsI = Int32Array.from(I);
    this.cellsJ = Int32Array.from(J);
    if (this.pendingBurst) this.burstIntoGrid();
  }

  setHover(on: boolean) { this.hover = on; }

  onStats(cb: (s: FxStats) => void) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  onImpact(cb: () => void) { this.impact = cb; }

  setMode(mode: FxMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.modeT = 0;
    this.measure();
    switch (mode) {
      case "off":
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.energy = 0;
        this.ps.length = 0;
        this.waves.length = 0;
        this.flash = 0;
        this.clear();
        break;
      case "idle":
        this.resetRun();
        break;
      case "gather":
        this.resetRun();
        this.ignite();
        break;
      case "fit":
        this.spinUp();
        break;
      case "simulate":
        if (this.cdf) this.burstIntoGrid(); else this.pendingBurst = true;
        break;
      case "finale":
        this.collapse();
        break;
      case "afterglow":
        if (!this.detonated) this.detonate();
        break;
    }
    this.wake();
  }

  // ---------- layout ----------

  /** Anchors come from the DOM: [data-fx=crest] (home, away) and [data-fx=core]. */
  private measure() {
    const hr = this.hero.getBoundingClientRect();
    if (!hr.width || !hr.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (hr.width !== this.W || hr.height !== this.H || dpr !== this.dpr) {
      this.W = hr.width; this.H = hr.height; this.dpr = dpr;
      this.canvas.width = Math.round(this.W * dpr);
      this.canvas.height = Math.round(this.H * dpr);
    }
    const rel = (el: Element | null | undefined, fallback: Anchor): Anchor => {
      if (!el) return fallback;
      const r = el.getBoundingClientRect();
      if (!r.width) return fallback;
      return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height / 2, r: Math.min(r.width, r.height) / 2, w: r.width, h: r.height };
    };
    const crests = this.hero.querySelectorAll("[data-fx=crest]");
    this.home = rel(crests[0], { x: this.W * 0.18, y: this.H / 2, r: 50, w: 100, h: 100 });
    this.away = rel(crests[1], { x: this.W * 0.82, y: this.H / 2, r: 50, w: 100, h: 100 });
    this.core = rel(this.hero.querySelector("[data-fx=core]"), { x: this.W / 2, y: this.H / 2, r: 110, w: 220, h: 220 });
    this.measured = true;
    this.sinceMeasure = 0;
  }

  private grid() {
    const c = this.core;
    const gutter = 26; // digits and team labels
    const size = Math.max(60, Math.min(c.w, c.h) - gutter);
    const gap = Math.max(2, Math.round(size * 0.018));
    const cell = (size - gap * (GRID - 1)) / GRID;
    const x = c.x - (size + gutter) / 2 + gutter;
    const y = c.y - (size + gutter) / 2 + gutter;
    return { x, y, cell, gap, size };
  }

  private cellCenter(c: number): [number, number] {
    const g = this.grid();
    const i = Math.floor(c / GRID), j = c % GRID;
    return [g.x + j * (g.cell + g.gap) + g.cell / 2, g.y + i * (g.cell + g.gap) + g.cell / 2];
  }

  private vortexRadius() { return Math.max(40, Math.min(this.core.w, this.core.h) / 2 - 16); }

  // ---------- particles ----------

  private sprite(rgb: RGB) {
    const key = rgb.join();
    let s = this.sprites.get(key);
    if (!s) {
      const n = 64;
      s = document.createElement("canvas");
      s.width = s.height = n;
      const g = s.getContext("2d")!;
      const grd = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.14, `rgba(${rgb},0.95)`);
      grd.addColorStop(0.38, `rgba(${rgb},0.32)`);
      grd.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, n, n);
      this.sprites.set(key, s);
    }
    return s;
  }

  private add(kind: Kind, rgb: RGB, size: number, extra: Partial<Particle>) {
    if (this.ps.length >= MAX_PARTICLES) return null;
    const p: Particle = {
      kind, rgb, spr: this.sprite(rgb), size, alpha: 1,
      x0: 0, y0: 0, cx: 0, cy: 0, x1: 0, y1: 0, t: 0, dur: 1,
      r: 0, rt: 0, a: 0, w: 0, sq: 1, tilt: 0, age: 0,
      x: 0, y: 0, vx: 0, vy: 0, life: 1, max: 1,
      cell: -1, text: "",
      ...extra,
    };
    this.ps.push(p);
    return p;
  }

  /** A curved path particle; `bend` is the sideways pull as a share of the distance. */
  private path(kind: Kind, rgb: RGB, size: number, from: [number, number], to: [number, number], dur: number, bend = 0.35, extra: Partial<Particle> = {}) {
    const [x0, y0] = from, [x1, y1] = to;
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
    const off = rand(-bend, bend) * d;
    return this.add(kind, rgb, size, {
      x0, y0, x1, y1, dur,
      cx: (x0 + x1) / 2 - (dy / d) * off,
      cy: (y0 + y1) / 2 + (dx / d) * off,
      ...extra,
    });
  }

  private fromCrest(a: Anchor): [number, number] {
    const ang = rand(0, TAU), rr = a.r * Math.sqrt(Math.random()) * 0.85;
    return [a.x + Math.cos(ang) * rr, a.y + Math.sin(ang) * rr];
  }

  private intoCore(spread: number): [number, number] {
    const ang = rand(0, TAU), rr = spread * Math.sqrt(Math.random());
    return [this.core.x + Math.cos(ang) * rr, this.core.y + Math.sin(ang) * rr];
  }

  private stream(side: "home" | "away", dur: number, size: number, alpha = 1, spread = 10) {
    const a = side === "home" ? this.home : this.away;
    const rgb = side === "home" ? this.homeRgb : this.awayRgb;
    this.path("stream", rgb, size, this.fromCrest(a), this.intoCore(spread), dur, 0.32, { alpha });
  }

  private glyph(side: "home" | "away") {
    const list = side === "home" ? this.teams.homeGlyphs : this.teams.awayGlyphs;
    if (!list.length) return;
    const a = side === "home" ? this.home : this.away;
    const rgb = side === "home" ? this.homeRgb : this.awayRgb;
    this.path("glyph", rgb, rand(10, 13), this.fromCrest(a), this.intoCore(16), rand(1.0, 1.5), 0.45, { text: pick(list) });
  }

  private spark(x: number, y: number, rgb: RGB, speed: number, life: number, size: number) {
    const ang = rand(0, TAU);
    this.add("spark", rgb, size, { x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life, max: life });
  }

  private wave(x: number, y: number, rgb: RGB, v: number, decay: number, width: number, r = 0) {
    this.waves.push({ x, y, r, v, life: 1, decay, rgb, width });
  }

  private orbit(rgb: RGB, from?: [number, number]) {
    const R = this.vortexRadius();
    const rt = 12 + (R - 12) * Math.pow(Math.random(), 0.75);
    const disc = Math.random() < 0.8;
    const p = this.add("orbit", rgb, rand(8, 15), {
      rt, a: rand(0, TAU), w: rand(0.75, 1.3),
      sq: disc ? rand(0.28, 0.48) : rand(0.8, 1),
      tilt: disc ? -0.32 + rand(-0.12, 0.12) : rand(-1.2, 1.2),
    });
    if (p && from) {
      // Join the vortex where the stream arrived.
      p.r = Math.hypot(from[0] - this.core.x, from[1] - this.core.y);
      p.a = Math.atan2(from[1] - this.core.y, from[0] - this.core.x);
    }
    return p;
  }

  // ---------- the run ----------

  private resetRun() {
    this.counts.fill(0); this.shown.fill(0); this.hits.fill(0);
    this.tally = { h: 0, d: 0, a: 0 };
    this.sims = 0; this.simBase = 0;
    this.pendingBurst = false; this.detonated = false;
    this.energy = 0; this.arcA = 0; this.gridA = 0;
  }

  private ignite() {
    const { x, y } = this.core;
    this.wave(x, y, GOLD, 760, 0.9, 4, 40);
    this.wave(x, y, WHITE, 460, 1.3, 2, 20);
    for (let k = 0; k < 110; k++) this.spark(x, y, Math.random() < 0.7 ? GOLD : WHITE, rand(80, 560), rand(0.5, 1.2), rand(8, 16));
    this.flash = 0.45;
  }

  private spinUp() {
    const { x, y } = this.core;
    this.wave(x, y, GOLD, 320, 1.4, 2, 10);
    for (let k = 0; k < 340; k++) {
      const p = this.orbit(k % 5 === 0 ? GOLD : k % 2 ? this.homeRgb : this.awayRgb);
      if (p) p.r = 0;
    }
  }

  private sample(): [number, number] {
    const cdf = this.cdf!;
    const u = Math.random();
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1; else hi = mid;
    }
    return [this.cellsI[lo], this.cellsJ[lo]];
  }

  /** One simulated match: tally it, return its grid cell and outcome colour. */
  private simulate(): { cell: number; rgb: RGB; side: "home" | "away" | "draw" } {
    const [i, j] = this.sample();
    this.sims++;
    const side = i > j ? "home" : i < j ? "away" : "draw";
    this.tally[side === "home" ? "h" : side === "away" ? "a" : "d"]++;
    const cell = Math.min(i, GRID - 1) * GRID + Math.min(j, GRID - 1);
    this.counts[cell]++;
    return { cell, rgb: OUT[side], side };
  }

  private shoot(cell: number, rgb: RGB, from: [number, number], dur: number, size: number) {
    return this.path("shot", rgb, size, from, this.cellCenter(cell), dur, 0.28, { cell });
  }

  private burstIntoGrid() {
    this.pendingBurst = false;
    const { x, y } = this.core;
    this.wave(x, y, GOLD, 900, 1.1, 3, 10);
    this.wave(x, y, WHITE, 600, 1.6, 1.5, 6);
    this.flash = Math.max(this.flash, 0.3);
    // Every particle of the vortex becomes one simulated match.
    for (const p of this.ps) {
      if (p.kind !== "orbit" && p.kind !== "stream") continue;
      const s = this.simulate();
      const from = this.pos(p);
      Object.assign(p, {
        kind: "shot", rgb: s.rgb, spr: this.sprite(s.rgb), cell: s.cell, t: 0, dur: rand(0.35, 0.9),
        x0: from[0], y0: from[1],
      } satisfies Partial<Particle>);
      const [x1, y1] = this.cellCenter(s.cell);
      const dx = x1 - p.x0, dy = y1 - p.y0, d = Math.hypot(dx, dy) || 1, off = rand(-0.5, 0.5) * d;
      p.x1 = x1; p.y1 = y1;
      p.cx = (p.x0 + x1) / 2 - (dy / d) * off;
      p.cy = (p.y0 + y1) / 2 + (dx / d) * off;
    }
    this.simBase = this.sims;
    this.emitStats(true);
  }

  private collapse() {
    const g = this.grid();
    const max = Math.max(1, ...this.shown);
    for (let c = 0; c < GRID * GRID; c++) {
      const b = Math.pow(this.shown[c] / max, 0.6);
      const n = Math.round(b * 12) + (b > 0.02 ? 1 : 0);
      const i = Math.floor(c / GRID), j = c % GRID;
      const rgb = i > j ? OUT.home : i < j ? OUT.away : OUT.draw;
      for (let k = 0; k < n; k++) {
        const [cx, cy] = this.cellCenter(c);
        const from: [number, number] = [cx + rand(-0.4, 0.4) * g.cell, cy + rand(-0.4, 0.4) * g.cell];
        this.path("implode", Math.random() < 0.5 ? GOLD : rgb, rand(9, 15), from, this.intoCore(4), rand(0.4, 0.68), 0.6, { t: -rand(0, 0.35) });
      }
    }
  }

  private detonate() {
    this.detonated = true;
    const { x, y } = this.core;
    const n = Math.max(1, this.sims);
    const shares = [this.tally.h / n, this.tally.d / n, this.tally.a / n];
    const colour = () => {
      const u = Math.random();
      return u < shares[0] ? OUT.home : u < shares[0] + shares[1] ? OUT.draw : OUT.away;
    };
    this.flash = 1;
    this.energy = 0;
    this.wave(x, y, WHITE, 1500, 1.1, 6, 20);
    this.wave(x, y, GOLD, 1000, 0.9, 5, 10);
    this.wave(x, y, GOLD, 560, 1.2, 3, 0);
    for (let k = 0; k < 280; k++) this.spark(x, y, k % 4 === 0 ? GOLD : colour(), rand(160, 980), rand(0.7, 1.7), rand(9, 20));
    for (const p of this.ps) if (p.kind === "shot") p.t = Math.max(p.t, 0.999);
    this.impact?.();
  }

  // ---------- loop ----------

  private wake() {
    if (this.raf || !this.visible || this.mode === "off") return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.modeT += dt;
    this.sinceMeasure += dt;
    if (this.sinceMeasure > 0.3 || !this.measured) this.measure();

    this.update(dt);
    this.draw();

    const settled = this.mode === "afterglow" && !this.ps.length && !this.waves.length && this.flash < 0.01;
    if (settled) { this.clear(); return; }
    if (this.visible && this.mode !== "off") this.raf = requestAnimationFrame(this.frame);
  };

  private emit(rate: number, dt: number, fn: () => void) {
    this.emitCarry += rate * dt;
    while (this.emitCarry >= 1) { this.emitCarry--; fn(); }
  }

  private update(dt: number) {
    const m = this.mode, t = this.modeT;

    if (m === "idle") {
      this.emit(this.hover ? 46 : 14, dt, () =>
        this.stream(Math.random() < 0.5 ? "home" : "away", rand(1.5, 2.4), rand(6, 11), 0.6, this.core.r * 0.35));
      this.energy += ((this.hover ? 0.35 : 0.12) - this.energy) * Math.min(1, dt * 3);
    } else if (m === "gather") {
      const ramp = easeOut(t / 0.4);
      this.emit(300 * ramp, dt, () => {
        const side = Math.random() < 0.5 ? "home" : "away";
        if (Math.random() < 0.08) this.glyph(side);
        else this.stream(side, rand(0.45, 0.95), rand(9, 17));
      });
    } else if (m === "fit") {
      this.emit(90, dt, () => this.stream(Math.random() < 0.5 ? "home" : "away", rand(0.7, 1.1), rand(8, 14), 1, this.vortexRadius() * 0.6));
      this.arcA = Math.min(1, this.arcA + dt * 2);
      this.energy = 0.8 + 0.25 * Math.sin(this.time * 7);
    } else if (m === "simulate" && this.cdf && !this.pendingBurst) {
      this.arcA = Math.max(0, this.arcA - dt * 3);
      this.gridA = Math.min(1, this.gridA + dt * 2.5);
      this.energy += (0.12 - this.energy) * Math.min(1, dt * 2);
      const n = Math.min(4000, this.simBase + simTarget(t) - this.sims);
      const visual = t < 2.6 ? 7 : 2;
      for (let k = 0; k < n; k++) {
        const s = this.simulate();
        if (k >= visual) continue;
        // Home wins fly from the home crest, away wins from the away crest, draws from either.
        const src = s.side === "home" ? this.home : s.side === "away" ? this.away : Math.random() < 0.5 ? this.home : this.away;
        this.shoot(s.cell, s.rgb, this.fromCrest(src), rand(0.5, 0.95), rand(9, 14));
      }
      for (let c = 0; c < GRID * GRID; c++) this.shown[c] += (this.counts[c] - this.shown[c]) * Math.min(1, dt * 4);
      this.emitStats();
    } else if (m === "finale") {
      this.gridA = Math.max(0, 1 - t / 0.5);
      this.arcA = 0;
      if (!this.detonated) this.energy = Math.min(1.8, this.energy + dt * 2.6);
      if (t >= 0.7 && !this.detonated) this.detonate();
    } else if (m === "afterglow") {
      this.gridA = Math.max(0, this.gridA - dt * 3);
      this.energy = Math.max(0, this.energy - dt * 4);
    }

    // Crests beat while the model works.
    if (m === "gather" || m === "fit") {
      this.pulse += dt;
      if (this.pulse > 0.55) {
        this.pulse = 0;
        this.wave(this.home.x, this.home.y, this.homeRgb, 120, 1.5, 2, this.home.r * 0.9);
        this.wave(this.away.x, this.away.y, this.awayRgb, 120, 1.5, 2, this.away.r * 0.9);
      }
    }

    for (let c = 0; c < GRID * GRID; c++) this.hits[c] = Math.max(0, this.hits[c] - dt * 3.5);
    this.flash = Math.max(0, this.flash - dt * (this.flash > 0.5 ? 1.6 : 2.4));

    const spin = m === "fit" ? 1 + 2.4 * easeOut(t / 2.2) : 1;
    let w = 0;
    for (const p of this.ps) {
      let keep = true;
      switch (p.kind) {
        case "stream": case "glyph": case "shot": case "implode":
          p.t += dt / p.dur;
          if (p.t >= 1) { keep = false; this.arrive(p); }
          break;
        case "orbit":
          p.age += dt;
          p.r += (p.rt - p.r) * Math.min(1, dt * 3);
          p.a += p.w * spin * dt * (70 / (p.r + 25));
          if (m !== "fit" && m !== "gather") { p.alpha -= dt * 2; keep = p.alpha > 0; }
          break;
        case "spark": {
          const drag = Math.exp(-dt * 2.6);
          p.vx *= drag; p.vy *= drag;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.life -= dt;
          keep = p.life > 0;
          break;
        }
      }
      if (keep) this.ps[w++] = p;
    }
    this.ps.length = w;

    let v = 0;
    for (const wv of this.waves) {
      wv.r += wv.v * dt;
      wv.life -= wv.decay * dt;
      if (wv.life > 0) this.waves[v++] = wv;
    }
    this.waves.length = v;
  }

  private arrive(p: Particle) {
    if (p.kind === "stream" || p.kind === "glyph") {
      if (this.mode === "gather") this.energy = Math.min(1.1, this.energy + 0.012);
      else if (this.mode === "fit" && p.kind === "stream" && this.ps.length < 700) this.orbit(p.rgb, [p.x1, p.y1]);
    } else if (p.kind === "shot" && p.cell >= 0) {
      this.hits[p.cell] = 1;
      if (Math.random() < 0.25) this.spark(p.x1, p.y1, p.rgb, rand(30, 90), rand(0.2, 0.4), rand(6, 10));
    } else if (p.kind === "implode") {
      this.energy = Math.min(1.8, this.energy + 0.01);
    }
  }

  private emitStats(force = false) {
    if (!this.listeners.size || (!force && this.time - this.statsAt < 0.05)) return;
    this.statsAt = this.time;
    const n = Math.max(1, this.sims);
    let top = -1, best = 0;
    for (let c = 0; c < GRID * GRID; c++) if (this.counts[c] > best) { best = this.counts[c]; top = c; }
    const s: FxStats = {
      sims: this.sims,
      home: this.tally.h / n, draw: this.tally.d / n, away: this.tally.a / n,
      top: top < 0 ? null : { h: Math.floor(top / GRID), a: top % GRID, p: best / n },
    };
    for (const f of this.listeners) f(s);
  }

  // ---------- drawing ----------

  private pos(p: Particle, dt = 0): [number, number] {
    if (p.kind === "spark") return [p.x, p.y];
    if (p.kind === "orbit") {
      const a = p.a - dt;
      const ca = Math.cos(a) * p.r, sa = Math.sin(a) * p.r * p.sq;
      const ct = Math.cos(p.tilt), st = Math.sin(p.tilt);
      return [this.core.x + ca * ct - sa * st, this.core.y + ca * st + sa * ct];
    }
    const t = clamp01(p.t - dt);
    // Streams accelerate into their target; shots ease out to land softly.
    const u = p.kind === "shot" ? easeOut(t) : Math.pow(t, 1.6);
    const k = 1 - u;
    return [k * k * p.x0 + 2 * k * u * p.cx + u * u * p.x1, k * k * p.y0 + 2 * k * u * p.cy + u * u * p.y1];
  }

  private stamp(spr: HTMLCanvasElement, x: number, y: number, size: number, alpha: number) {
    if (alpha <= 0.01) return;
    this.ctx.globalAlpha = Math.min(1, alpha);
    this.ctx.drawImage(spr, x - size / 2, y - size / 2, size, size);
  }

  private clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private draw() {
    const ctx = this.ctx;
    this.clear();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = "lighter";

    this.drawCore();
    if (this.arcA > 0) this.drawArcs();
    if (this.gridA > 0) this.drawGrid();

    for (const w of this.waves) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(${w.rgb},${0.75 * w.life})`;
      ctx.lineWidth = 0.5 + w.width * w.life;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();
    }

    for (const p of this.ps) this.drawParticle(p);

    if (this.flash > 0.01) {
      const { x, y } = this.core;
      const R = Math.max(this.W, this.H);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(255,240,214,${0.85 * this.flash})`);
      g.addColorStop(0.25, `rgba(232,196,116,${0.35 * this.flash})`);
      g.addColorStop(1, "rgba(232,196,116,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private drawParticle(p: Particle) {
    const ctx = this.ctx;
    switch (p.kind) {
      case "stream": case "shot": case "implode": {
        if (p.t < 0) return;
        const fade = p.kind === "shot" ? 1 : Math.min(1, p.t * 6);
        for (let k = 0; k < 4; k++) {
          const [x, y] = this.pos(p, k * 0.03);
          this.stamp(p.spr, x, y, p.size * (1 - k * 0.16), p.alpha * fade * (1 - k * 0.28));
        }
        break;
      }
      case "glyph": {
        const [x, y] = this.pos(p);
        ctx.globalAlpha = Math.sin(Math.PI * clamp01(p.t)) * 0.9;
        ctx.fillStyle = `rgb(${p.rgb})`;
        ctx.font = `600 ${p.size}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.text, x, y);
        break;
      }
      case "orbit": {
        const [x, y] = this.pos(p);
        const depth = 0.6 + 0.4 * Math.sin(p.a); // front of the disc is brighter
        const grow = Math.min(1, p.age * 2);
        const [tx, ty] = this.pos(p, 0.14);
        this.stamp(p.spr, tx, ty, p.size * 0.7 * depth, 0.35 * p.alpha * grow);
        this.stamp(p.spr, x, y, p.size * depth, p.alpha * depth * grow);
        break;
      }
      case "spark": {
        const k = p.life / p.max;
        this.stamp(p.spr, p.x, p.y, p.size * (0.4 + 0.6 * k), k);
        break;
      }
    }
  }

  private drawCore() {
    if (this.energy <= 0.01) return;
    const ctx = this.ctx;
    const { x, y } = this.core;
    const e = this.energy;
    const R = this.vortexRadius() * (0.35 + 0.45 * Math.min(1.8, e));
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(255,246,228,${Math.min(1, 0.75 * e)})`);
    g.addColorStop(0.25, `rgba(232,196,116,${Math.min(0.8, 0.45 * e)})`);
    g.addColorStop(1, "rgba(232,196,116,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fill();
  }

  /** Home, draw and away arcs chasing each other around the vortex, with comet tails. */
  private drawArcs() {
    const ctx = this.ctx;
    const { x, y } = this.core;
    const R = this.vortexRadius() + 10;
    const spin = 1 + 1.6 * easeOut(this.modeT / 2.2);
    const arcs: [RGB, number, number, number][] = [
      [OUT.home, R, 2.3, 0], [OUT.draw, R + 6, -1.7, 2], [OUT.away, R + 12, 1.25, 4],
    ];
    ctx.lineCap = "round";
    for (const [rgb, r, speed, phase] of arcs) {
      const head = phase + this.time * speed * spin;
      const len = 1.3, steps = 10, dir = Math.sign(speed);
      for (let k = 0; k < steps; k++) {
        const a0 = head - dir * len * (k + 1) / steps, a1 = head - dir * len * k / steps;
        ctx.globalAlpha = this.arcA * Math.pow(1 - k / steps, 1.6);
        ctx.strokeStyle = `rgb(${rgb})`;
        ctx.lineWidth = 3.2 * (1 - k / (steps * 1.4));
        ctx.beginPath();
        ctx.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1));
        ctx.stroke();
      }
    }
  }

  private drawGrid() {
    const ctx = this.ctx;
    const g = this.grid();
    const max = Math.max(1, ...this.shown);
    let top = -1, best = 0;
    for (let c = 0; c < GRID * GRID; c++) if (this.shown[c] > best) { best = this.shown[c]; top = c; }

    ctx.globalCompositeOperation = "source-over";
    const scale = 0.85 + 0.15 * this.gridA;
    for (let c = 0; c < GRID * GRID; c++) {
      const [cx, cy] = this.cellCenter(c);
      const s = g.cell * scale;
      const b = Math.pow(this.shown[c] / max, 0.9);
      ctx.globalAlpha = this.gridA;
      ctx.fillStyle = `rgba(${GOLD},${0.05 + 0.8 * b})`;
      roundRect(ctx, cx - s / 2, cy - s / 2, s, s, 4);
      ctx.fill();
      if (this.hits[c] > 0) {
        ctx.fillStyle = `rgba(255,248,232,${0.3 * this.hits[c]})`;
        ctx.fill();
      }
      if (c === top && this.mode === "simulate") {
        ctx.strokeStyle = `rgba(255,240,206,${0.55 + 0.4 * Math.sin(this.time * 6)})`;
        ctx.lineWidth = 1.5;
        roundRect(ctx, cx - s / 2 - 2.5, cy - s / 2 - 2.5, s + 5, s + 5, 6);
        ctx.stroke();
      }
    }

    // Axis digits and team labels: rows are home goals, columns away goals.
    ctx.globalAlpha = 0.55 * this.gridA;
    ctx.fillStyle = "#b9b4aa";
    ctx.font = `500 10px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let k = 0; k < GRID; k++) {
      const off = k * (g.cell + g.gap) + g.cell / 2;
      ctx.fillText(k === GRID - 1 ? `${k}+` : String(k), g.x + off, g.y - 8);
      ctx.fillText(k === GRID - 1 ? `${k}+` : String(k), g.x - 9, g.y + off);
    }
    ctx.globalAlpha = 0.8 * this.gridA;
    ctx.fillStyle = "#d9b870";
    ctx.font = `600 10px "Inter Tight", ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`${this.teams.awayLabel} →`, g.x, g.y - 21);
    ctx.save();
    ctx.translate(g.x - 21, g.y);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(`${this.teams.homeLabel} →`, 0, 0);
    ctx.restore();

    // A scan line sweeps the grid while the analysis is written.
    if (this.mode === "simulate" && this.modeT > 3) {
      const k = ((this.modeT - 3) % 2.4) / 2.4;
      const sy = g.y - 10 + k * (g.size + 20);
      const grd = ctx.createLinearGradient(0, sy - 18, 0, sy + 2);
      grd.addColorStop(0, "rgba(232,196,116,0)");
      grd.addColorStop(1, "rgba(255,240,206,0.28)");
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = this.gridA * Math.sin(Math.PI * k);
      ctx.fillStyle = grd;
      ctx.fillRect(g.x - 4, sy - 18, g.size + 8, 20);
    }
    ctx.globalCompositeOperation = "lighter";
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** A team colour bright enough to glow on the dark hero (greys stay grey). */
function vivid(hex: string, fallback: RGB): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const L = Math.min(0.74, Math.max(0.62, l));
  const S = s < 0.12 ? s : Math.max(0.65, s);
  const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), o = L - c / 2;
  const [R, G, B] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((R + o) * 255), Math.round((G + o) * 255), Math.round((B + o) * 255)];
}
