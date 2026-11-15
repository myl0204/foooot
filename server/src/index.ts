import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { getEngine, dataWarning } from "./data/index.ts";
import { aiEnabled, aiProvider, getAnalysis, parseLang } from "./ai/analysis.ts";
import type { Engine } from "./engine/predict.ts";
import type { Match } from "./types.ts";

const app = express();
app.use(express.json());

const summary = (engine: Engine, m: Match) => {
  const p = engine.predict(m);
  return {
    id: m.id, date: m.date, matchday: m.matchday, status: m.status,
    homeGoals: m.homeGoals, awayGoals: m.awayGoals,
    home: engine.team(m.homeId), away: engine.team(m.awayId),
    prediction: {
      pHome: p.pHome, pDraw: p.pDraw, pAway: p.pAway, lambdaHome: p.lambdaHome, lambdaAway: p.lambdaAway,
      pick: p.pick, confidence: p.confidence, confidenceLabel: p.confidenceLabel, btts: p.btts, over25: p.over25,
      topScore: p.topScores[0],
    },
  };
};

const route = (fn: (req: express.Request, res: express.Response) => Promise<unknown>) =>
  (req: express.Request, res: express.Response) => {
    fn(req, res).catch((err) => {
      console.error(err);
      res.status(500).json({ error: "internal_error", message: (err as Error).message });
    });
  };

app.get("/api/meta", route(async (_req, res) => {
  const e = await getEngine();
  res.json({
    league: e.data.league, dataSource: e.data.source, aiEnabled: aiEnabled(), aiProvider: aiProvider(), warning: dataWarning(),
    teams: e.data.teams.length, played: e.finished().length, upcoming: e.upcoming().length,
  });
}));

app.get("/api/fixtures", route(async (req, res) => {
  const e = await getEngine();
  const limit = Math.min(Number(req.query.limit) || 24, 100);
  res.json(e.upcoming().slice(0, limit).map((m) => summary(e, m)));
}));

app.get("/api/results", route(async (req, res) => {
  const e = await getEngine();
  const limit = Math.min(Number(req.query.limit) || 16, 100);
  res.json(e.finished().slice(0, limit).map((m) => summary(e, m)));
}));

app.get("/api/standings", route(async (_req, res) => {
  const e = await getEngine();
  res.json(e.standings);
}));

app.get("/api/model", route(async (_req, res) => {
  const e = await getEngine();
  res.json({ homeAdvantage: Math.exp(e.ratings.homeAdv), backtest: e.backtest() });
}));

app.get("/api/matches/:id", route(async (req, res) => {
  const e = await getEngine();
  const d = e.detail(String(req.params.id));
  if (!d) return void res.status(404).json({ error: "not_found" });
  res.json({ ...d, homeTeam: d.home.team, awayTeam: d.away.team, league: e.data.league });
}));

app.post("/api/matches/:id/analysis", route(async (req, res) => {
  const e = await getEngine();
  const d = e.detail(String(req.params.id));
  if (!d) return void res.status(404).json({ error: "not_found" });
  res.json(await getAnalysis(d, e.data.league.name, parseLang(req.query.lang)));
}));

// Serve the built frontend in production
const dist = path.resolve("dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`API on http://localhost:${port}  (AI analysis: ${aiProvider() ?? "statistical fallback"})`);
});
