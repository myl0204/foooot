import type { Dataset, Match, Team } from "../types.ts";
import { mulberry32, samplePoisson } from "../engine/random.ts";

/**
 * A deterministic demo league of FICTIONAL clubs. Results are simulated from
 * hidden "true" strengths, so the prediction engine has something realistic to
 * learn from — but none of it is real football data.
 */
const CLUBS: (Omit<Team, "id"> & { att: number; def: number })[] = [
  { name: "Aldermoor Athletic", nameZh: "奥德摩尔竞技", short: "ALD", city: "Aldermoor", colors: ["#9b1c31", "#f2e6c9"], att: 0.32, def: -0.28 },
  { name: "Port Varanne", nameZh: "瓦兰港", short: "PVA", city: "Varanne", colors: ["#0f3d6e", "#e8c15a"], att: 0.28, def: -0.22 },
  { name: "Kestrel Vale", nameZh: "红隼谷", short: "KES", city: "Kestrel", colors: ["#1f5e3b", "#f4f1e8"], att: 0.18, def: -0.2 },
  { name: "Redmarsh Rovers", nameZh: "红沼流浪者", short: "RED", city: "Redmarsh", colors: ["#c2410c", "#1c1917"], att: 0.22, def: -0.05 },
  { name: "Halcyon City", nameZh: "哈尔西恩城", short: "HAL", city: "Halcyon", colors: ["#7dd3fc", "#0c2340"], att: 0.12, def: -0.12 },
  { name: "Brightwater FC", nameZh: "明水", short: "BRI", city: "Brightwater", colors: ["#e11d48", "#ffffff"], att: 0.08, def: -0.04 },
  { name: "Thornbury Wanderers", nameZh: "桑伯里漫游者", short: "THO", city: "Thornbury", colors: ["#3f3f46", "#facc15"], att: 0.02, def: -0.08 },
  { name: "Saltcliff United", nameZh: "盐崖联", short: "SAL", city: "Saltcliff", colors: ["#1e3a8a", "#ffffff"], att: 0.0, def: 0.0 },
  { name: "Elmstead Town", nameZh: "榆树镇", short: "ELM", city: "Elmstead", colors: ["#6d28d9", "#f5f3ff"], att: -0.04, def: 0.02 },
  { name: "Corvane Albion", nameZh: "科尔文阿尔比恩", short: "COR", city: "Corvane", colors: ["#111827", "#d1d5db"], att: -0.06, def: 0.06 },
  { name: "Harrowgate Forest", nameZh: "哈罗盖特森林", short: "HAR", city: "Harrowgate", colors: ["#166534", "#fde68a"], att: -0.1, def: 0.04 },
  { name: "Lindqvist Park", nameZh: "林德奎斯特公园", short: "LIN", city: "Lindqvist", colors: ["#b45309", "#1f2937"], att: -0.08, def: 0.1 },
  { name: "Mirefield Borough", nameZh: "米尔菲尔德", short: "MIR", city: "Mirefield", colors: ["#0e7490", "#ecfeff"], att: -0.16, def: 0.08 },
  { name: "Ostrava Vale", nameZh: "俄斯特拉谷", short: "OST", city: "Ostrava", colors: ["#be123c", "#0f172a"], att: -0.14, def: 0.16 },
  { name: "Cinderford", nameZh: "辛德福德", short: "CIN", city: "Cinderford", colors: ["#57534e", "#f97316"], att: -0.22, def: 0.18 },
  { name: "Wexley Rangers", nameZh: "韦克斯利流浪者", short: "WEX", city: "Wexley", colors: ["#1d4ed8", "#dc2626"], att: -0.26, def: 0.22 },
];

const PLAYED_MATCHDAYS = 14;
const KICKOFFS = [
  [0, 12, 30], [0, 15, 0], [0, 15, 0], [0, 17, 30], [1, 14, 0], [1, 16, 30], [1, 19, 0], [2, 20, 0],
] as const; // [days after Saturday, hour, minute] (UTC)

function roundRobin(ids: string[]): [string, string][][] {
  const n = ids.length;
  const arr = [...ids];
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()!);
  }
  return [...rounds, ...rounds.map((rd) => rd.map(([a, b]) => [b, a] as [string, string]))];
}

export function buildDemoDataset(today = new Date()): Dataset {
  const rnd = mulberry32(20261114);
  const teams: Team[] = CLUBS.map(({ att, def, ...c }) => ({ ...c, id: c.short.toLowerCase() }));
  const truth = new Map(CLUBS.map((c) => [c.short.toLowerCase(), c]));
  const rounds = roundRobin(teams.map((t) => t.id));

  // Anchor: matchday PLAYED_MATCHDAYS+1 starts on the most recent Saturday (today, if
  // it is one). Whether a match is finished is decided by its kickoff vs `today`, so a
  // round in progress is split correctly between results and fixtures.
  const sat = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  sat.setUTCDate(sat.getUTCDate() - ((sat.getUTCDay() + 1) % 7));

  const matches: Match[] = [];
  rounds.forEach((pairs, r) => {
    const md = r + 1;
    const weekStart = new Date(sat);
    weekStart.setUTCDate(sat.getUTCDate() + (md - (PLAYED_MATCHDAYS + 1)) * 7);
    pairs.forEach(([h, a], i) => {
      const [dOff, hh, mm] = KICKOFFS[i % KICKOFFS.length];
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + dOff);
      date.setUTCHours(hh, mm, 0, 0);
      // A kickoff more than two hours ago counts as a result.
      const finished = date.getTime() + 2 * 3_600_000 <= today.getTime();
      const th = truth.get(h)!, ta = truth.get(a)!;
      // Simulate every fixture (even future ones) so the RNG stream is stable.
      const noise = () => (rnd() - 0.5) * 0.25;
      const S = 1.6; // spread of hidden strengths
      const lh = Math.exp(Math.log(1.15) + 0.25 + S * (th.att + ta.def) + noise());
      const la = Math.exp(Math.log(1.15) + S * (ta.att + th.def) + noise());
      const hg = samplePoisson(lh, rnd), ag = samplePoisson(la, rnd);
      matches.push({
        id: `md${md}-${h}-${a}`, date: date.toISOString(), season: String(today.getUTCFullYear()), matchday: md, homeId: h, awayId: a,
        status: finished ? "finished" : "scheduled",
        ...(finished ? { homeGoals: hg, awayGoals: ag } : {}),
      });
    });
  });

  const year = today.getUTCFullYear();
  return {
    source: "demo",
    league: {
      id: "demo", name: "Meridian Premier Division", nameZh: "子午线超级联赛",
      season: String(year), seasonLabel: `${year}/${String((year + 1) % 100).padStart(2, "0")}`,
    },
    teams,
    matches,
  };
}
