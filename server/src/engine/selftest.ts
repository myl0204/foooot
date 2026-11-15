import assert from "node:assert/strict";
import { buildDemoDataset } from "../data/demo.ts";
import { Engine } from "./predict.ts";
import { predictFromLambdas } from "./poisson.ts";

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
console.log("ok");
