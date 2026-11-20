import fs from "node:fs";
import path from "node:path";

/** Disk cache for provider responses, so restarts don't spend the API quota. */
const CACHE_DIR = path.resolve("data/cache");

export interface Cached<T> { fetchedAt: number; body: T }

export function readCache<T>(name: string): Cached<T> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, name), "utf8")) as Cached<T>;
  } catch {
    return null;
  }
}

export function writeCache<T>(name: string, body: T): Cached<T> {
  const entry = { fetchedAt: Date.now(), body };
  const file = path.join(CACHE_DIR, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(entry));
  fs.renameSync(`${file}.tmp`, file); // atomic: a crash never leaves half a file
  return entry;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Serialises requests to one provider and lets responses pause it (per-minute limits). */
export class RateGate {
  private queue: Promise<unknown> = Promise.resolve();
  private pausedUntil = 0;

  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(async () => {
      const wait = this.pausedUntil - Date.now();
      if (wait > 0) await sleep(wait);
      return fn();
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  pause(ms: number) {
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + ms);
  }
}

const HOUR = 3_600_000;

/**
 * Should the current season be fetched again? Always after 12h (schedule changes);
 * sooner, but at most every `minIntervalMs`, when a match has ended since the last
 * fetch and its result is not in the cache yet.
 */
export function needsRefresh(cached: Cached<unknown> | null, open: { date: string }[], minIntervalMs: number, now = Date.now()) {
  if (!cached) return true;
  const age = now - cached.fetchedAt;
  if (age > 12 * HOUR) return true;
  if (age < minIntervalMs) return false;
  return open.some((m) => {
    const end = Date.parse(m.date) + 2 * HOUR;
    return end < now && end > cached.fetchedAt - 2 * HOUR;
  });
}

/** "2026/27" for a season that spans two years, "2026" for a calendar-year one. */
export function seasonLabel(start: string | undefined, end: string | undefined, fallback: string) {
  const a = start?.slice(0, 4), b = end?.slice(0, 4);
  if (a && b && a !== b) return `${a}/${b.slice(2)}`;
  return a ?? fallback;
}

export const PALETTE = ["#9b1c31", "#0f3d6e", "#1f5e3b", "#c2410c", "#6d28d9", "#0e7490", "#b45309", "#1d4ed8", "#be123c", "#3f3f46"];
export const teamColors = (id: number): [string, string] => [PALETTE[id % PALETTE.length], "#f4f1e8"];

const NOISE = new Set(["fc", "afc", "cf", "sc", "ac", "as", "ssc", "cd", "ud", "rcd", "fk", "sk", "club", "de", "the"]);

/** Fallback 3-letter code from a club name: Manchester United → MUN, Liverpool → LIV. */
export function clubCode(name: string): string {
  const words = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .split(/[^A-Z]+/).filter((w) => w && !NOISE.has(w.toLowerCase()));
  if (!words.length) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3);
  return (words[0][0] + words[1].slice(0, 2)).padEnd(3, words[0][1] ?? "X");
}

export const toInt = (v: string | undefined, def: number, min: number, max: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
