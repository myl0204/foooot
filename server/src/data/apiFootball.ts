import type { Dataset, Match, Team } from "../types.ts";
import { clubCode, needsRefresh, RateGate, readCache, seasonLabel, sleep, teamColors, writeCache } from "./http.ts";
import type { LoadResult } from "./index.ts";

/**
 * Live provider: API-Football v3 (api-sports.io). Needs API_FOOTBALL_KEY.
 * https://www.api-football.com/documentation-v3
 *
 * Loads several leagues, each with its current season plus `history` previous ones.
 * Every response is cached on disk (data/cache/api-football): finished seasons are
 * fetched once, the current season only when a result is due or every 12 hours, so
 * restarts and reloads cost no quota.
 */
const BASE = "https://v3.football.api-sports.io";

/** API-Football league ids. Override with API_FOOTBALL_LEAGUES. */
export const DEFAULT_LEAGUES = [
  39, 140, 135, 78, 61, // Premier League, La Liga, Serie A, Bundesliga, Ligue 1
  2, 3, 848, // Champions League, Europa League, Conference League
  40, 41, // Championship, League One
  88, 94, 144, 203, 179, // Eredivisie, Primeira Liga, Belgian Pro League, Süper Lig, Scottish Premiership
  71, 128, 253, 262, // Brasileirão, Argentine Liga Profesional, MLS, Liga MX
  169, 98, 292, 307, 188, // Chinese Super League, J1 League, K League 1, Saudi Pro League, A-League
]

interface AFTeam { id: number; name: string; logo?: string }
export interface AFFixture {
  fixture: { id: number; date: string; status?: { short?: string } };
  league: { id: number; season: number; round?: string | null };
  teams: { home: AFTeam; away: AFTeam };
  goals?: { home: number | null; away: number | null };
  score?: { fulltime?: { home: number | null; away: number | null } };
}
export interface AFLeague {
  league: { id: number; name: string; type?: string; logo?: string };
  country?: { name?: string };
  seasons: { year: number; start?: string; end?: string; current?: boolean }[];
}
interface Envelope<T> { errors?: unknown; response?: T[] }

/** Thrown when no further request can succeed this run (bad key, daily quota used up). */
class FatalApiError extends Error {}
/** The plan does not cover this request (typically a season outside the plan's range). */
class PlanError extends Error {}

const gate = new RateGate();
let quotaResetAt = 0; // daily quota exhausted until this time (next 00:00 UTC)

function describeErrors(errors: unknown): { keys: string[]; text: string } | null {
  if (!errors) return null;
  const entries: [string, unknown][] = Array.isArray(errors) ? errors.map((e) => ["", e]) : typeof errors === "object" ? Object.entries(errors) : [["", errors]];
  if (!entries.length) return null;
  const str = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
  return { keys: entries.map(([k]) => k.toLowerCase()), text: entries.map(([k, v]) => (k ? `${k}: ${str(v)}` : str(v))).join("; ") };
}

const nextUtcMidnight = () => {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
};

async function call<T>(key: string, endpoint: string, params: Record<string, string>): Promise<T[]> {
  return gate.run(async () => {
    for (let attempt = 0; ; attempt++) {
      if (Date.now() < quotaResetAt) throw new FatalApiError("API-Football daily request quota used up");
      const res = await fetch(`${BASE}/${endpoint}?${new URLSearchParams(params)}`, {
        headers: { "x-apisports-key": key },
        signal: AbortSignal.timeout(30_000),
      });
      // Per-minute and per-day allowances left (header names per the API-Sports docs).
      if (res.headers.get("x-ratelimit-remaining") === "0") gate.pause(61_000);
      if (res.headers.get("x-ratelimit-requests-remaining") === "0") quotaResetAt = nextUtcMidnight();

      if (res.status === 429 && attempt === 0) { await sleep(61_000); continue; }
      if (res.status === 401 || res.status === 403) throw new FatalApiError(`API-Football rejected the key (HTTP ${res.status})`);
      if (!res.ok) throw new Error(`API-Football responded ${res.status}`);

      // Errors arrive with HTTP 200, in `errors` (an object keyed by kind, or an array).
      const body = (await res.json()) as Envelope<T>;
      const err = describeErrors(body.errors);
      if (err) {
        if (err.keys.includes("ratelimit") && attempt === 0) { await sleep(61_000); continue; }
        if (err.keys.includes("requests")) quotaResetAt = nextUtcMidnight();
        if (err.keys.some((k) => k === "token" || k === "requests" || k === "access")) throw new FatalApiError(`API-Football: ${err.text}`);
        if (err.keys.includes("plan")) throw new PlanError(`API-Football: ${err.text}`);
        throw new Error(`API-Football: ${err.text}`);
      }
      return body.response ?? [];
    }
  });
}

export interface ApiFootballOptions {
  key: string;
  leagues: number[];
  history: number; // previous seasons to load per league
  fetchHistory: boolean; // false: only previous seasons already on disk (fast first load)
  refreshMinutes: number;
}

const DAY = 86_400_000;
/** Current seasons the plan refused ("league-season" → when, why). In memory only: a restart after upgrading retries at once. */
const refusedCurrent = new Map<string, { at: number; msg: string }>();

export async function fetchApiFootball(o: ApiFootballOptions): Promise<LoadResult> {
  const warnings: string[] = [];
  let fatal: string | null = null; // once set, use only what is on disk
  let pendingHistory = false;

  // League metadata, including each league's current season. One request for all leagues, daily.
  type LeagueCache = { requested: number[]; leagues: AFLeague[] };
  const lc = readCache<LeagueCache>("api-football/leagues.json");
  let leagues = lc?.body.leagues ?? [];
  const leagueFresh = lc && Date.now() - lc.fetchedAt < DAY && o.leagues.every((id) => lc.body.requested.includes(id));
  if (!leagueFresh) {
    try {
      const all = await call<AFLeague>(o.key, "leagues", { current: "true" });
      leagues = all.filter((l) => o.leagues.includes(l.league.id));
      writeCache<LeagueCache>("api-football/leagues.json", { requested: o.leagues, leagues });
    } catch (err) {
      if (err instanceof FatalApiError) fatal = err.message;
      if (!leagues.length) throw err;
      warnings.push(`League list not refreshed: ${(err as Error).message}`);
    }
  }
  const unknown = o.leagues.filter((id) => !leagues.some((l) => l.league.id === id));
  if (unknown.length) warnings.push(`API-Football has no current season for league id ${unknown.join(", ")}`);

  const datasets: Dataset[] = [];
  for (const id of o.leagues) {
    const meta = leagues.find((l) => l.league.id === id);
    const current = meta?.seasons.find((s) => s.current) ?? meta?.seasons.at(-1);
    if (!meta || !current) continue;
    // Without its current season a league has nothing to forecast: don't spend requests on it.
    const refused = refusedCurrent.get(`${id}-${current.year}`);
    if (refused && Date.now() - refused.at < DAY) { warnings.push(`${meta.league.name} ${current.year}: ${refused.msg}`); continue; }

    const seasons: AFFixture[][] = [];
    for (let back = o.history; back >= 0; back--) {
      const season = current.year - back;
      const name = `api-football/fixtures-${id}-${season}.json`;
      const cached = readCache<AFFixture[]>(name);
      const isCurrent = back === 0;

      if (!isCurrent) {
        // Last season's file was written while it was current: refetch once if it predates the final round.
        const done = cached && seasonComplete(cached.body, cached.fetchedAt);
        if (cached && (done || !o.fetchHistory || fatal)) {
          seasons.push(cached.body);
          pendingHistory ||= !done && !fatal;
          continue;
        }
        if (!cached) {
          // A season the plan cannot see: don't ask again for a day.
          const denied = readCache<string>(`${name}.denied`);
          if (denied && Date.now() - denied.fetchedAt < DAY) continue;
          if (!o.fetchHistory || fatal) { pendingHistory ||= !fatal; continue; }
        }
      } else if (cached && !needsRefresh(cached, openFixtures(cached.body), o.refreshMinutes * 60_000)) {
        seasons.push(cached.body);
        continue;
      }

      if (fatal) {
        if (cached) seasons.push(cached.body);
        continue;
      }
      try {
        const fixtures = await call<AFFixture>(o.key, "fixtures", { league: String(id), season: String(season) });
        writeCache(name, fixtures);
        seasons.push(fixtures);
      } catch (err) {
        const msg = (err as Error).message;
        if (err instanceof FatalApiError) fatal = msg;
        else if (err instanceof PlanError && isCurrent) refusedCurrent.set(`${id}-${season}`, { at: Date.now(), msg });
        else if (err instanceof PlanError) writeCache(`${name}.denied`, msg);
        if (cached) seasons.push(cached.body);
        if (isCurrent || !(err instanceof FatalApiError)) warnings.push(`${meta.league.name} ${season}: ${msg}`);
      }
    }
    if (!seasons.some((fx) => fx.some((f) => f.league.season === current.year))) continue;
    const ds = toDataset(meta, current, seasons);
    if (ds) datasets.push(ds);
  }
  if (fatal) warnings.unshift(fatal);
  return { datasets, warnings, pendingHistory };
}

const FINISHED = new Set(["FT", "AET", "PEN"]);
// Postponed, cancelled, abandoned, awarded, walkover, suspended, interrupted: no usable result.
const DROPPED = new Set(["PST", "CANC", "ABD", "AWD", "WO", "SUSP", "INT"]);

function openFixtures(fixtures: AFFixture[]) {
  return fixtures
    .filter((f) => !FINISHED.has(f.fixture.status?.short ?? "") && !DROPPED.has(f.fixture.status?.short ?? ""))
    .map((f) => ({ date: f.fixture.date }));
}

/** Fetched more than a day after the season's last fixture, so every result is in. */
export function seasonComplete(fixtures: AFFixture[], fetchedAt: number) {
  const last = Math.max(...fixtures.map((f) => Date.parse(f.fixture.date)).filter(Number.isFinite));
  return !Number.isFinite(last) || fetchedAt > last + DAY;
}

/** "Regular Season - 12" → 12; knockout rounds ("Round of 16", "Final") → 0. */
export const roundNumber = (round?: string | null) => Number(round?.match(/\s-\s(\d+)$/)?.[1] ?? 0);

export function toDataset(meta: AFLeague, current: AFLeague["seasons"][number], seasons: AFFixture[][]): Dataset | null {
  const teams = new Map<string, Team>();
  const matches = new Map<string, Match>();
  const addTeam = (t: AFTeam) => {
    const id = String(t.id);
    // Later seasons overwrite earlier ones, so a renamed club shows its current name.
    teams.set(id, { id, name: t.name, short: clubCode(t.name), colors: teamColors(t.id), crest: t.logo });
    return id;
  };

  for (const f of seasons.flat()) {
    const status = f.fixture.status?.short ?? "";
    if (DROPPED.has(status) || !f.teams?.home?.id || !f.teams?.away?.id) continue;
    const finished = FINISHED.has(status);
    // Model on the 90-minute score: score.fulltime excludes extra time and penalties.
    const hg = f.score?.fulltime?.home ?? f.goals?.home;
    const ag = f.score?.fulltime?.away ?? f.goals?.away;
    if (finished && (hg == null || ag == null)) continue;
    const date = new Date(f.fixture.date);
    if (Number.isNaN(date.getTime())) continue;
    matches.set(String(f.fixture.id), {
      id: String(f.fixture.id),
      date: date.toISOString(),
      season: String(f.league.season),
      matchday: roundNumber(f.league.round),
      round: f.league.round ?? undefined,
      homeId: addTeam(f.teams.home),
      awayId: addTeam(f.teams.away),
      status: finished ? "finished" : "scheduled",
      ...(finished ? { homeGoals: hg!, awayGoals: ag! } : {}),
    });
  }
  if (!matches.size) return null;
  return {
    source: "api-football",
    league: {
      id: String(meta.league.id),
      name: meta.league.name,
      country: meta.country?.name,
      season: String(current.year),
      seasonLabel: seasonLabel(current.start, current.end, String(current.year)),
      logo: meta.league.logo,
    },
    teams: [...teams.values()],
    matches: [...matches.values()],
  };
}
