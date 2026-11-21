import type { Dataset, DataSource } from "../types.ts";
import { Engine } from "../engine/predict.ts";
import { buildDemoDataset } from "./demo.ts";
import { fetchFootballData } from "./footballData.ts";
import { DEFAULT_LEAGUES, fetchApiFootball } from "./apiFootball.ts";
import { applyChineseNames } from "./names.ts";
import { toInt } from "./http.ts";

/** What a live provider returns: one dataset per league. */
export interface LoadResult {
  datasets: Dataset[];
  warnings: string[];
  pendingHistory: boolean; // past seasons not on disk yet; fetch them in the background
}

export interface DataState {
  source: DataSource;
  engines: Engine[]; // one per league, in configured order
  loadedAt: number;
  warnings: string[];
}

const TTL_MS = 30 * 60 * 1000;
let state: DataState | null = null;
let loading: Promise<DataState> | null = null;
let backfilling = false;

type Provider = { source: DataSource; load: (fetchHistory: boolean) => Promise<LoadResult> };

/** Providers with a key, in precedence order: API-Football, then football-data.org. None: the demo league. */
function liveProviders(): Provider[] {
  const history = toInt(process.env.HISTORY_SEASONS, 2, 0, 10);
  const out: Provider[] = [];
  const afKey = process.env.API_FOOTBALL_KEY;
  if (afKey) {
    const ids = (process.env.API_FOOTBALL_LEAGUES ?? "").split(",").map((s) => Number.parseInt(s.trim(), 10)).filter((n) => n > 0);
    out.push({
      source: "api-football",
      load: (fetchHistory) => fetchApiFootball({
        key: afKey, leagues: ids.length ? ids : DEFAULT_LEAGUES, history, fetchHistory,
        refreshMinutes: toInt(process.env.API_FOOTBALL_REFRESH_MINUTES, 60, 5, 24 * 60),
      }),
    });
  }
  const fdKey = process.env.FOOTBALL_DATA_API_KEY;
  if (fdKey) {
    const competitions = (process.env.FOOTBALL_DATA_COMPETITION || "PL").split(",").map((s) => s.trim()).filter(Boolean);
    out.push({
      source: "football-data.org",
      load: (fetchHistory) => fetchFootballData({ key: fdKey, competitions, history: Math.min(history, 3), fetchHistory, refreshMinutes: 30 }),
    });
  }
  return out;
}

function makeState(source: DataSource, datasets: Dataset[], warnings: string[]): DataState {
  applyChineseNames(datasets);
  return { source, engines: datasets.map((d) => new Engine(d)), loadedAt: Date.now(), warnings };
}

/** The first provider with usable data wins; one that fails or returns nothing hands over to the next. */
async function build(fetchHistory: boolean): Promise<{ next: DataState; pendingHistory: boolean }> {
  const failed: string[] = [];
  for (const live of liveProviders()) {
    try {
      const r = await live.load(fetchHistory);
      for (const w of r.warnings) console.warn(`[data] ${w}`);
      const usable = r.datasets.filter((d) => d.matches.some((m) => m.status === "finished"));
      if (!usable.length) throw new Error(r.warnings[0] ?? "no finished matches returned");
      const counts = usable.map((d) => `${d.league.name} ${d.matches.filter((m) => m.status === "finished").length}`).join(", ");
      console.log(`[data] ${live.source}: ${counts}`);
      const note = failed.length ? [`${failed.join("; ")} — using ${live.source}`] : [];
      return { next: makeState(live.source, usable, [...note, ...r.warnings]), pendingHistory: r.pendingHistory };
    } catch (err) {
      console.error(`[data] ${live.source} failed:`, (err as Error).message);
      failed.push(`${live.source} unavailable (${(err as Error).message})`);
    }
  }
  const warnings = failed.length ? [`${failed.join("; ")} — showing demo league.`] : [];
  return { next: makeState("demo", [buildDemoDataset()], warnings), pendingHistory: false };
}

function reload(): Promise<DataState> {
  loading ??= build(false)
    .then(({ next, pendingHistory }) => {
      // A failed refresh must not replace good live data with the demo league.
      if (!(next.source === "demo" && state && state.source !== "demo")) state = next;
      if (pendingHistory) backfill();
      return state ?? next;
    })
    .finally(() => (loading = null));
  return loading;
}

/** Past seasons can take minutes on a rate-limited plan: serve the current season meanwhile. */
function backfill() {
  if (backfilling) return;
  backfilling = true;
  console.log("[data] loading past seasons in the background…");
  build(true)
    .then(({ next }) => { if (next.source !== "demo") state = next; })
    .catch((err) => console.error("[data] backfill failed:", (err as Error).message))
    .finally(() => (backfilling = false));
}

/** Current data. After the first load, stale data is served while a refresh runs. */
export async function getState(): Promise<DataState> {
  if (!state) return reload();
  if (Date.now() - state.loadedAt >= TTL_MS) void reload().catch((err) => console.error("[data] refresh failed:", err));
  return state;
}

/** The engine for a league id; unknown or missing ids get the first league. */
export async function getEngine(leagueId?: unknown): Promise<Engine> {
  const s = await getState();
  return s.engines.find((e) => e.data.league.id === leagueId) ?? s.engines[0];
}

/** The engine whose league contains this match. */
export async function engineForMatch(matchId: string): Promise<Engine | null> {
  const s = await getState();
  return s.engines.find((e) => e.match(matchId)) ?? null;
}
