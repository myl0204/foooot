import type { Match } from "../types.ts";

const K = 24;
const HOME = 60;

export function computeElo(teamIds: string[], matches: Match[]): Record<string, number> {
  const elo: Record<string, number> = Object.fromEntries(teamIds.map((id) => [id, 1500]));
  const played = matches
    .filter((m) => m.status === "finished" && m.homeGoals != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const m of played) {
    const exp = eloExpectation(elo[m.homeId], elo[m.awayId]);
    const actual = m.homeGoals! > m.awayGoals! ? 1 : m.homeGoals === m.awayGoals ? 0.5 : 0;
    const margin = Math.abs(m.homeGoals! - m.awayGoals!);
    const mult = margin <= 1 ? 1 : Math.log2(margin + 1);
    const delta = K * mult * (actual - exp);
    elo[m.homeId] += delta;
    elo[m.awayId] -= delta;
  }
  return elo;
}

/** Expected score (win=1, draw=0.5) for the home side. */
export function eloExpectation(home: number, away: number): number {
  return 1 / (1 + Math.pow(10, (away - (home + HOME)) / 400));
}
