import type { Dataset, Match, Team } from "../types.ts";

/**
 * Live provider: football-data.org v4. Needs FOOTBALL_DATA_API_KEY.
 * https://www.football-data.org/documentation/api
 */
interface FDTeam { id: number; name: string; shortName?: string; tla?: string; crest?: string }
interface FDMatch {
  id: number; utcDate: string; matchday: number | null; status: string;
  homeTeam: FDTeam; awayTeam: FDTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

const PALETTE = ["#9b1c31", "#0f3d6e", "#1f5e3b", "#c2410c", "#6d28d9", "#0e7490", "#b45309", "#1d4ed8", "#be123c", "#3f3f46"];

export async function fetchFootballData(apiKey: string, competition: string): Promise<Dataset> {
  const res = await fetch(`https://api.football-data.org/v4/competitions/${encodeURIComponent(competition)}/matches`, {
    headers: { "X-Auth-Token": apiKey },
  });
  if (!res.ok) throw new Error(`football-data.org responded ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { competition: { name: string; area?: { name: string } }; filters?: { season?: string }; matches: FDMatch[] };

  const teams = new Map<string, Team>();
  const addTeam = (t: FDTeam) => {
    const id = String(t.id);
    if (!teams.has(id)) {
      teams.set(id, {
        id, name: t.shortName ?? t.name, short: t.tla ?? t.name.slice(0, 3).toUpperCase(),
        colors: [PALETTE[t.id % PALETTE.length], "#f4f1e8"], crest: t.crest,
      });
    }
    return id;
  };

  const matches: Match[] = [];
  for (const m of body.matches) {
    if (!m.homeTeam?.id || !m.awayTeam?.id) continue;
    const homeId = addTeam(m.homeTeam), awayId = addTeam(m.awayTeam);
    const finished = m.status === "FINISHED" && m.score.fullTime.home != null;
    if (!finished && !["SCHEDULED", "TIMED"].includes(m.status)) continue;
    matches.push({
      id: String(m.id), date: m.utcDate, matchday: m.matchday ?? 0, homeId, awayId,
      status: finished ? "finished" : "scheduled",
      ...(finished ? { homeGoals: m.score.fullTime.home!, awayGoals: m.score.fullTime.away! } : {}),
    });
  }
  return {
    source: "football-data.org",
    league: { name: body.competition.name, season: body.filters?.season ?? "", country: body.competition.area?.name },
    teams: [...teams.values()],
    matches,
  };
}
