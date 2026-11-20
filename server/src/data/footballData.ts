import type { Dataset, Match, Team } from "../types.ts";
import { needsRefresh, RateGate, readCache, seasonLabel, sleep, teamColors, writeCache } from "./http.ts";
import type { LoadResult } from "./index.ts";

/**
 * Fallback live provider: football-data.org v4. Needs FOOTBALL_DATA_API_KEY.
 * https://www.football-data.org/documentation/api
 * The free tier covers 12 competitions, the current season and three before it, at 10 requests/minute.
 */
interface FDTeam { id: number; name: string; shortName?: string; tla?: string; crest?: string }
interface FDScore { home: number | null; away: number | null }
interface FDMatch {
  id: number; utcDate: string; matchday: number | null; status: string; stage?: string;
  area?: { name?: string };
  season?: { startDate?: string; endDate?: string };
  homeTeam: FDTeam; awayTeam: FDTeam;
  score: { fullTime: FDScore; regularTime?: FDScore };
}
interface FDBody { competition: { name: string; code?: string; emblem?: string }; filters?: { season?: string | number }; matches: FDMatch[] }

const BASE = "https://api.football-data.org/v4";
const gate = new RateGate();

async function call(key: string, competition: string, season?: number): Promise<FDBody> {
  return gate.run(async () => {
    for (let attempt = 0; ; attempt++) {
      const qs = season ? `?season=${season}` : "";
      const res = await fetch(`${BASE}/competitions/${encodeURIComponent(competition)}/matches${qs}`, {
        headers: { "X-Auth-Token": key },
        signal: AbortSignal.timeout(30_000),
      });
      const reset = Number(res.headers.get("x-requestcounter-reset")) || 60;
      if (res.headers.get("x-requests-available-minute") === "0") gate.pause(reset * 1000 + 500);
      if (res.status === 429 && attempt === 0) { await sleep(reset * 1000 + 500); continue; }
      if (!res.ok) throw Object.assign(new Error(`football-data.org responded ${res.status}: ${(await res.text()).slice(0, 200)}`), { status: res.status });
      return (await res.json()) as FDBody;
    }
  });
}

export interface FootballDataOptions { key: string; competitions: string[]; history: number; fetchHistory: boolean; refreshMinutes: number }

const DAY = 86_400_000;

export async function fetchFootballData(o: FootballDataOptions): Promise<LoadResult> {
  const warnings: string[] = [];
  const datasets: Dataset[] = [];
  let pendingHistory = false;

  for (const code of o.competitions) {
    const curName = `football-data/${code}-current.json`;
    let cur = readCache<FDBody>(curName);
    if (needsRefresh(cur, cur ? cur.body.matches.filter((m) => !isDone(m)).map((m) => ({ date: m.utcDate })) : [], o.refreshMinutes * 60_000)) {
      try {
        cur = writeCache(curName, await call(o.key, code));
      } catch (err) {
        warnings.push(`${code}: ${(err as Error).message}`);
        if (!cur) continue;
      }
    }
    const body = cur!.body;
    const year = Number(body.filters?.season ?? body.matches[0]?.season?.startDate?.slice(0, 4));
    const bodies: [number, FDBody][] = [];

    for (let back = o.history; back >= 1 && year; back--) {
      const season = year - back;
      const name = `football-data/${code}-${season}.json`;
      const cached = readCache<FDBody>(name);
      if (cached) { bodies.push([season, cached.body]); continue; }
      const denied = readCache<string>(`${name}.denied`);
      if (denied && Date.now() - denied.fetchedAt < DAY) continue;
      if (!o.fetchHistory) { pendingHistory = true; continue; }
      try {
        bodies.push([season, writeCache(name, await call(o.key, code, season)).body]);
      } catch (err) {
        // 403 = outside the plan's seasons; remember so we don't spend requests on it.
        if ((err as { status?: number }).status === 403) writeCache(`${name}.denied`, (err as Error).message);
        else warnings.push(`${code} ${season}: ${(err as Error).message}`);
      }
    }
    bodies.push([year, body]);
    const ds = toDataset(bodies, year);
    if (ds) datasets.push(ds);
  }
  return { datasets, warnings, pendingHistory };
}

const isDone = (m: FDMatch) => m.status === "FINISHED" && m.score.fullTime.home != null;
const STAGES: Record<string, string> = {
  PLAYOFFS: "Knockout Round Play-offs", LAST_32: "Round of 32", LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals", SEMI_FINALS: "Semi-finals", THIRD_PLACE: "3rd Place Final", FINAL: "Final",
};

function toDataset(bodies: [number, FDBody][], currentYear: number): Dataset | null {
  const teams = new Map<string, Team>();
  const matches: Match[] = [];
  const addTeam = (t: FDTeam) => {
    const id = String(t.id);
    teams.set(id, { id, name: t.shortName ?? t.name, short: t.tla ?? t.name.slice(0, 3).toUpperCase(), colors: teamColors(t.id), crest: t.crest });
    return id;
  };
  for (const [season, body] of bodies) {
    for (const m of body.matches) {
      if (!m.homeTeam?.id || !m.awayTeam?.id) continue;
      const finished = isDone(m);
      if (!finished && !["SCHEDULED", "TIMED", "IN_PLAY", "PAUSED"].includes(m.status)) continue;
      const score = m.score.regularTime ?? m.score.fullTime; // 90-minute score when extra time was played
      matches.push({
        id: String(m.id), date: m.utcDate, season: String(season), matchday: m.matchday ?? 0,
        round: m.matchday ? undefined : STAGES[m.stage ?? ""] ?? m.stage,
        homeId: addTeam(m.homeTeam), awayId: addTeam(m.awayTeam),
        status: finished ? "finished" : "scheduled",
        ...(finished ? { homeGoals: score.home!, awayGoals: score.away! } : {}),
      });
    }
  }
  const latest = bodies.at(-1)![1];
  if (!matches.length) return null;
  const s = latest.matches[0]?.season;
  return {
    source: "football-data.org",
    league: {
      id: latest.competition.code ?? latest.competition.name,
      name: latest.competition.name,
      country: latest.matches[0]?.area?.name,
      season: String(currentYear),
      seasonLabel: seasonLabel(s?.startDate, s?.endDate, String(currentYear)),
      logo: latest.competition.emblem,
    },
    teams: [...teams.values()],
    matches,
  };
}
