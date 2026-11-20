import assert from "node:assert/strict";
import { buildDemoDataset } from "../data/demo.ts";
import { roundNumber, seasonComplete, toDataset, type AFFixture, type AFLeague } from "../data/apiFootball.ts";
import { clubCode, needsRefresh } from "../data/http.ts";
import { applyChineseNames, normName } from "../data/names.ts";
import type { Dataset, Match } from "../types.ts";
import { Engine } from "./predict.ts";
import { predictFromLambdas } from "./poisson.ts";

// Never call a real AI from the self-test.
delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_AUTH_TOKEN; delete process.env.OPENAI_API_KEY;

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// Distribution sanity
for (const [lh, la] of [[0.4, 0.3], [1.5, 1.1], [2.8, 0.6], [0.9, 2.4]]) {
  const p = predictFromLambdas(lh, la);
  close(p.matrix.flat().reduce((s, x) => s + x, 0), 1);
  close(p.pHome + p.pDraw + p.pAway, 1);
  assert.ok(p.matrix.flat().every((x) => x >= 0));
}
assert.ok(predictFromLambdas(2.8, 0.6).pick === "home");
assert.ok(predictFromLambdas(0.6, 2.8).pick === "away");

// Demo league on every kind of day: Sat (match day), Sun, Mon, midweek
for (const iso of ["2026-11-14T10:00:00Z", "2026-11-14T16:00:00Z", "2026-11-15T18:00:00Z", "2026-11-16T23:00:00Z", "2026-11-18T09:00:00Z", "2026-11-20T22:00:00Z"]) {
  const now = new Date(iso);
  const data = buildDemoDataset(now);
  const engine = new Engine(data, now);
  assert.equal(data.teams.length, 16);
  assert.ok(engine.upcoming().length > 0, `${iso}: has upcoming fixtures`);
  assert.ok(engine.upcoming().every((m) => new Date(m.date) > new Date(now.getTime() - 2 * 3_600_000)), `${iso}: upcoming not in the past`);
  assert.ok(engine.finished().every((m) => new Date(m.date) < now), `${iso}: finished matches have kicked off`);
  assert.ok(engine.finished().length >= 14 * 8, `${iso}: at least 14 rounds played`);
  // Walk-forward: a finished match's prediction must not use its own result
  const f = engine.finished()[0];
  assert.ok(engine.snapshotFor(f).played.every((m) => m.date < f.date && m.id !== f.id), `${iso}: no hindsight`);
  const d = engine.detail(f.id)!;
  assert.ok(d.home.played < engine.standings.find((r) => r.team.id === f.homeId)!.played, `${iso}: as-of profile`);
}

const now = new Date("2026-11-14T10:00:00Z");
const engine = new Engine(buildDemoDataset(now), now);
assert.ok(engine.ratings.attack["ald"] > engine.ratings.attack["wex"]);
const bt = engine.backtest();
console.log("backtest", { n: bt.matches, acc: bt.accuracy.toFixed(3), logLoss: bt.logLoss.toFixed(3), baseline: bt.baselineLogLoss.toFixed(3) });
assert.ok(bt.logLoss < bt.baselineLogLoss, "beats uniform guesser");
const d = engine.detail(engine.upcoming()[0].id)!;
console.log("sample", d.home.team.name, "v", d.away.team.name, {
  H: d.prediction.pHome.toFixed(3), D: d.prediction.pDraw.toFixed(3), A: d.prediction.pAway.toFixed(3),
  xg: [d.prediction.lambdaHome.toFixed(2), d.prediction.lambdaAway.toFixed(2)], conf: d.prediction.confidenceLabel,
});

// ---------- multi-season: last season's results train the model; the table is this season's ----------
{
  const DAY = 86_400_000;
  const cur = buildDemoDataset(now);
  const prev: Match[] = cur.matches.map((m, i) => {
    const swap = (id: string) => (id === "wex" ? "old" : id); // "wex" was promoted; "old" went down
    return {
      ...m, id: `p-${m.id}`, season: "2025", date: new Date(Date.parse(m.date) - 364 * DAY).toISOString(),
      homeId: swap(m.homeId), awayId: swap(m.awayId), status: "finished",
      homeGoals: m.homeGoals ?? (i * 7) % 4, awayGoals: m.awayGoals ?? (i * 3) % 3,
    };
  });
  const data: Dataset = { ...cur, teams: [...cur.teams, { id: "old", name: "Old Town", short: "OLD", colors: ["#000000", "#ffffff"] }], matches: [...prev, ...cur.matches] };
  const e = new Engine(data, now);
  const curFinished = cur.matches.filter((m) => m.status === "finished").length;
  assert.equal(e.standings.length, 16, "table: current season's clubs only");
  assert.ok(!e.standings.some((r) => r.team.id === "old"), "relegated club not in table");
  assert.equal(e.standings.reduce((s, r) => s + r.played, 0), curFinished * 2, "table counts this season only");
  assert.equal(e.trainedOn, curFinished + prev.length, "model trains on both seasons");
  // Matchday 1 of this season is not grouped with matchday 1 of last season
  const md1 = cur.matches.find((m) => m.matchday === 1)!;
  assert.ok(e.snapshotFor(md1).cutoff.slice(0, 4) === md1.date.slice(0, 4), "round grouping is per season");
  assert.ok(e.snapshotFor(md1).played.length >= prev.length, "first round of a season still has history");
  const bt2 = e.backtest(20);
  assert.ok(bt2.perDay.every((d) => d.n <= 8), "backtest rounds are not merged across seasons");
  assert.ok(bt2.perDay.some((d) => d.season === "2025") && bt2.perDay.some((d) => d.season === cur.league.season), "backtest spans seasons");
  const dd = e.detail(e.upcoming()[0].id)!;
  const homeGames = cur.matches.filter((m) => m.status === "finished" && m.homeId === dd.match.homeId).length;
  const vr = dd.home.venueRecord;
  assert.equal(vr.w + vr.d + vr.l, homeGames, "venue record is this season's");
  console.log("multi-season", { trainedOn: e.trainedOn, backtest: bt2.matches });
}

// ---------- API-Football parsing ----------
{
  const team = (id: number, name: string) => ({ id, name, logo: `https://media.api-sports.io/football/teams/${id}.png` });
  const fx = (id: number, short: string, round: string, date: string, goals: [number | null, number | null], ft?: [number, number]): AFFixture => ({
    fixture: { id, date, status: { short } },
    league: { id: 39, season: 2026, round },
    teams: { home: team(33, "Manchester United"), away: team(40, "Liverpool") },
    goals: { home: goals[0], away: goals[1] },
    score: ft ? { fulltime: { home: ft[0], away: ft[1] } } : undefined,
  });
  const meta: AFLeague = { league: { id: 39, name: "Premier League", logo: "l.png" }, country: { name: "England" }, seasons: [{ year: 2026, start: "2026-08-15", end: "2027-05-23", current: true }] };
  const ds = toDataset(meta, meta.seasons[0], [[
    fx(1, "FT", "Regular Season - 1", "2026-08-15T14:00:00+00:00", [2, 1], [2, 1]),
    fx(2, "AET", "Round of 16", "2026-09-01T19:00:00+00:00", [2, 1], [1, 1]),
    fx(3, "PST", "Regular Season - 3", "2026-09-10T14:00:00+00:00", [null, null]),
    fx(4, "NS", "Regular Season - 12", "2026-11-22T15:00:00+00:00", [null, null]),
    fx(5, "1H", "Regular Season - 11", "2026-11-19T20:00:00+00:00", [0, 0]),
    fx(6, "FT", "Regular Season - 2", "2026-08-22T14:00:00+00:00", [null, null]),
  ]])!;
  const byId = new Map(ds.matches.map((m) => [m.id, m]));
  assert.deepEqual([...byId.keys()].sort(), ["1", "2", "4", "5"], "postponed and score-less fixtures dropped");
  assert.deepEqual([byId.get("2")!.homeGoals, byId.get("2")!.awayGoals], [1, 1], "extra time excluded: 90-minute score");
  assert.equal(byId.get("1")!.date, "2026-08-15T14:00:00.000Z", "dates normalised to UTC ISO");
  assert.equal(byId.get("4")!.matchday, 12);
  assert.equal(byId.get("2")!.matchday, 0, "knockout round has no matchday");
  assert.equal(byId.get("5")!.status, "scheduled", "live match is not a result yet");
  assert.equal(ds.league.seasonLabel, "2026/27");
  assert.equal(ds.teams.find((t) => t.id === "33")!.short, "MUN");
  assert.equal(roundNumber("Apertura - 5"), 5);
  const lastKick = Date.parse("2026-11-22T15:00:00Z");
  assert.equal(seasonComplete([], 0), true, "empty season needs no refetch");
  assert.equal(seasonComplete(ds.matches.map((m) => ({ fixture: { id: 0, date: m.date } }) as AFFixture), lastKick - 1000), false, "fetched before the last round");
  assert.equal(seasonComplete(ds.matches.map((m) => ({ fixture: { id: 0, date: m.date } }) as AFFixture), lastKick + 2 * 86_400_000), true);
  assert.equal(roundNumber("Round of 16"), 0);
  assert.equal(clubCode("Manchester City"), "MCI");
  assert.equal(clubCode("Liverpool"), "LIV");
}

// ---------- refresh policy ----------
{
  const H = 3_600_000, t = Date.parse("2026-11-14T18:00:00Z");
  const at = (ago: number) => ({ fetchedAt: t - ago, body: null });
  assert.equal(needsRefresh(null, [], H, t), true);
  assert.equal(needsRefresh(at(13 * H), [], H, t), true, "stale after 12h");
  assert.equal(needsRefresh(at(0.5 * H), [{ date: new Date(t - 3 * H).toISOString() }], H, t), false, "not more often than the interval");
  assert.equal(needsRefresh(at(2 * H), [{ date: new Date(t - 2.5 * H).toISOString() }], H, t), true, "a result is due");
  assert.equal(needsRefresh(at(2 * H), [{ date: new Date(t + 24 * H).toISOString() }], H, t), false, "nothing due");
}

// ---------- Chinese names ----------
{
  assert.equal(normName("1. FC Köln"), "koln");
  assert.equal(normName("Brighton & Hove Albion"), "brighton and hove albion");
  const ds: Dataset = {
    source: "api-football",
    league: { id: "39", name: "Premier League", country: "England", season: "2026", seasonLabel: "2026/27" },
    teams: ["Manchester United", "Man United", "Atlético Madrid", "AC Milan", "Paris Saint Germain", "Bayern München", "Shanghai Port", "Nowhere Town FC"]
      .map((name, i) => ({ id: String(i), name, short: clubCode(name), colors: ["#000000", "#ffffff"] as [string, string] })),
    matches: [],
  };
  applyChineseNames([ds]);
  assert.equal(ds.league.nameZh, "英超");
  assert.deepEqual(ds.teams.map((t) => t.nameZh), ["曼联", "曼联", "马竞", "AC米兰", "大巴黎", "拜仁", "上海海港", undefined]);
}

console.log("ok");
