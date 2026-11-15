export interface Team {
  id: string;
  name: string;
  short: string; // 3-letter code
  city?: string;
  colors: [string, string];
  crest?: string; // URL, live data only
}

export interface Match {
  id: string;
  date: string; // ISO
  matchday: number;
  homeId: string;
  awayId: string;
  status: "finished" | "scheduled";
  homeGoals?: number;
  awayGoals?: number;
}

export interface Dataset {
  source: "demo" | "football-data.org";
  league: { name: string; season: string; country?: string };
  teams: Team[];
  matches: Match[];
}

export interface Ratings {
  attack: Record<string, number>; // log-scale, mean 0
  defense: Record<string, number>; // log-scale, higher = concedes more
  homeAdv: number;
  base: number;
}

export interface Prediction {
  lambdaHome: number;
  lambdaAway: number;
  pHome: number;
  pDraw: number;
  pAway: number;
  btts: number;
  over25: number;
  matrix: number[][]; // [home][away], 0..MAX_GOALS
  topScores: { home: number; away: number; p: number }[];
  pick: "home" | "draw" | "away";
  confidence: number; // 0..1, derived from distribution sharpness
  confidenceLabel: "Low" | "Medium" | "High";
}

export interface FormEntry {
  result: "W" | "D" | "L";
  gf: number;
  ga: number;
  opponent: string;
  venue: "H" | "A";
}

export interface TeamProfile {
  team: Team;
  position: number;
  played: number;
  points: number;
  gf: number;
  ga: number;
  form: FormEntry[]; // most recent first, up to 5
  formPoints: number; // points from last 5
  venueRecord: { w: number; d: number; l: number; gf: number; ga: number };
  attackRating: number; // goals vs league avg, multiplicative (1.0 = avg)
  defenseRating: number; // goals conceded multiplier (lower = better)
  attackRank: number;
  defenseRank: number;
  elo: number;
  restDays: number | null;
}

export interface MatchDetail {
  match: Match;
  home: TeamProfile;
  away: TeamProfile;
  prediction: Prediction;
  elo: { home: number; away: number; pHomeWinish: number };
  headToHead: Match[];
  inputsHash: string;
}
