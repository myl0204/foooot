import { useEffect, useState } from "react";

export interface Team { id: string; name: string; short: string; city?: string; colors: [string, string]; crest?: string }
export interface Summary {
  id: string; date: string; matchday: number; status: "finished" | "scheduled";
  homeGoals?: number; awayGoals?: number; home: Team; away: Team;
  prediction: {
    pHome: number; pDraw: number; pAway: number; lambdaHome: number; lambdaAway: number;
    pick: "home" | "draw" | "away"; confidence: number; confidenceLabel: "Low" | "Medium" | "High";
    btts: number; over25: number; topScore: { home: number; away: number; p: number };
  };
}
export interface FormEntry { result: "W" | "D" | "L"; gf: number; ga: number; opponent: string; venue: "H" | "A" }
export interface Profile {
  team: Team; position: number; played: number; points: number; gf: number; ga: number;
  form: FormEntry[]; formPoints: number; venueRecord: { w: number; d: number; l: number; gf: number; ga: number };
  attackRating: number; defenseRating: number; attackRank: number; defenseRank: number; elo: number; restDays: number | null;
}
export interface MatchRaw { id: string; date: string; matchday: number; homeId: string; awayId: string; status: string; homeGoals?: number; awayGoals?: number }
export interface Detail {
  match: MatchRaw; home: Profile; away: Profile; league: { name: string; season: string };
  prediction: Summary["prediction"] & { matrix: number[][]; topScores: { home: number; away: number; p: number }[] };
  elo: { home: number; away: number; pHomeWinish: number }; headToHead: MatchRaw[];
}
export interface Analysis {
  source: "claude" | "openai" | "statistical"; model?: string; generatedAt: string; aiError?: string;
  analysis: {
    headline: string; verdict: string; summary: string;
    keyFactors: { title: string; detail: string; favours: "home" | "away" | "neutral"; weight: "high" | "medium" | "low" }[];
    matchScript: string; risks: string[]; bestAngle: { market: string; rationale: string };
  };
}
export interface Standing {
  team: Team; position: number; played: number; w: number; d: number; l: number; gf: number; ga: number; points: number;
  form: ("W" | "D" | "L")[]; attackRating: number; defenseRating: number; elo: number; strength: number;
}
export interface Meta { league: { name: string; season: string; country?: string }; dataSource: "demo" | "football-data.org"; aiEnabled: boolean; aiProvider: "anthropic" | "openai" | null; warning?: string; played: number; upcoming: number; teams: number }
export interface ModelInfo {
  homeAdvantage: number;
  backtest: {
    matches: number; accuracy: number; logLoss: number; brier: number; baselineLogLoss: number;
    perDay: { matchday: number; accuracy: number; n: number }[];
    recent: { matchId: string; home: string; away: string; score: string; pick: string; correct: boolean; pHome: number; pDraw: number; pAway: number }[];
  };
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    if (!path) return;
    let live = true;
    setState({ loading: true });
    api<T>(path).then(
      (data) => live && setState({ data, loading: false }),
      (e: Error) => live && setState({ error: e.message, loading: false }),
    );
    return () => { live = false; };
  }, [path]);
  return state;
}

export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
export const kickoff = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const longDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long" });
export const OUTCOME = { home: "var(--c-home)", draw: "var(--c-draw)", away: "var(--c-away)" } as const;

export const providerName = (p?: string | null) => (p === "openai" ? "OpenAI" : "Claude");
