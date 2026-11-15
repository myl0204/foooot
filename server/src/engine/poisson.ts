import type { Match, Prediction, Ratings } from "../types.ts";

export const MAX_GOALS = 7;
const DC_RHO = -0.06; // Dixon–Coles low-score dependence
const HALF_LIFE_DAYS = 120; // time-decay for older results
const PRIOR = 8; // ridge-style shrinkage toward league average (pseudo-matches)

export function poissonPmf(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

/**
 * Fit a Maher/Dixon–Coles style Poisson model:
 *   log E[home goals] = base + homeAdv + attack[home] + defense[away]
 *   log E[away goals] = base + attack[away] + defense[home]
 * via weighted iterative proportional fitting with shrinkage.
 */
export function fitRatings(teamIds: string[], matches: Match[], asOf: Date): Ratings {
  const played = matches.filter((m) => m.status === "finished" && m.homeGoals != null);
  const w = (m: Match) => {
    const ageDays = (asOf.getTime() - new Date(m.date).getTime()) / 86_400_000;
    return Math.pow(0.5, Math.max(0, ageDays) / HALF_LIFE_DAYS);
  };

  let totW = 0, homeG = 0, awayG = 0;
  for (const m of played) {
    const wt = w(m);
    totW += wt;
    homeG += wt * m.homeGoals!;
    awayG += wt * m.awayGoals!;
  }
  const avgHome = totW ? homeG / totW : 1.5;
  const avgAway = totW ? awayG / totW : 1.15;
  const base = Math.log(Math.max(avgAway, 0.3));
  const homeAdv = Math.log(Math.max(avgHome, 0.3) / Math.max(avgAway, 0.3));

  const att: Record<string, number> = {};
  const def: Record<string, number> = {};
  for (const id of teamIds) { att[id] = 1; def[id] = 1; }
  const H = Math.exp(homeAdv), B = Math.exp(base);

  for (let iter = 0; iter < 60; iter++) {
    // attack update
    const nextAtt: Record<string, number> = {};
    for (const id of teamIds) {
      let scored = PRIOR, expected = PRIOR;
      for (const m of played) {
        const wt = w(m);
        if (m.homeId === id) { scored += wt * m.homeGoals!; expected += wt * B * H * def[m.awayId]; }
        else if (m.awayId === id) { scored += wt * m.awayGoals!; expected += wt * B * def[m.homeId]; }
      }
      nextAtt[id] = scored / expected;
    }
    // normalise attacks to geometric mean 1
    normalise(nextAtt);
    const nextDef: Record<string, number> = {};
    for (const id of teamIds) {
      let conceded = PRIOR, expected = PRIOR;
      for (const m of played) {
        const wt = w(m);
        if (m.homeId === id) { conceded += wt * m.awayGoals!; expected += wt * B * nextAtt[m.awayId]; }
        else if (m.awayId === id) { conceded += wt * m.homeGoals!; expected += wt * B * H * nextAtt[m.homeId]; }
      }
      nextDef[id] = conceded / expected;
    }
    normalise(nextDef);
    Object.assign(att, nextAtt);
    Object.assign(def, nextDef);
  }

  const toLog = (r: Record<string, number>) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.log(v)]));
  return { attack: toLog(att), defense: toLog(def), homeAdv, base };
}

function normalise(r: Record<string, number>) {
  const ids = Object.keys(r);
  const g = Math.exp(ids.reduce((s, id) => s + Math.log(r[id]), 0) / ids.length);
  for (const id of ids) r[id] /= g;
}

export function expectedGoals(r: Ratings, homeId: string, awayId: string, neutral = false) {
  const lh = Math.exp(r.base + (neutral ? 0 : r.homeAdv) + r.attack[homeId] + r.defense[awayId]);
  const la = Math.exp(r.base + r.attack[awayId] + r.defense[homeId]);
  return { lambdaHome: lh, lambdaAway: la };
}

function dcTau(h: number, a: number, lh: number, la: number): number {
  if (h === 0 && a === 0) return 1 - lh * la * DC_RHO;
  if (h === 0 && a === 1) return 1 + lh * DC_RHO;
  if (h === 1 && a === 0) return 1 + la * DC_RHO;
  if (h === 1 && a === 1) return 1 - DC_RHO;
  return 1;
}

/** Turn expected goals into a full outcome distribution. */
export function predictFromLambdas(lambdaHome: number, lambdaAway: number): Prediction {
  const n = MAX_GOALS + 1;
  const matrix: number[][] = [];
  let total = 0;
  for (let h = 0; h < n; h++) {
    matrix.push([]);
    for (let a = 0; a < n; a++) {
      const p = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway) * dcTau(h, a, lambdaHome, lambdaAway);
      matrix[h].push(p);
      total += p;
    }
  }
  let pHome = 0, pDraw = 0, pAway = 0, btts = 0, over25 = 0;
  const scores: { home: number; away: number; p: number }[] = [];
  for (let h = 0; h < n; h++) {
    for (let a = 0; a < n; a++) {
      const p = (matrix[h][a] /= total);
      if (h > a) pHome += p; else if (h === a) pDraw += p; else pAway += p;
      if (h > 0 && a > 0) btts += p;
      if (h + a > 2) over25 += p;
      scores.push({ home: h, away: a, p });
    }
  }
  scores.sort((x, y) => y.p - x.p);

  const probs = { home: pHome, draw: pDraw, away: pAway };
  const pick = (Object.entries(probs).sort((x, y) => y[1] - x[1])[0][0]) as Prediction["pick"];
  // Confidence: 1 − normalised Shannon entropy of the 1X2 distribution,
  // blended with the margin between the top two outcomes.
  const ent = -[pHome, pDraw, pAway].reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0) / Math.log(3);
  const sorted = [pHome, pDraw, pAway].sort((x, y) => y - x);
  const confidence = Math.min(1, 0.55 * (1 - ent) * 4 + 0.45 * (sorted[0] - sorted[1]) * 1.6);
  const confidenceLabel = confidence >= 0.55 ? "High" : confidence >= 0.3 ? "Medium" : "Low";

  return {
    lambdaHome, lambdaAway, pHome, pDraw, pAway, btts, over25, matrix,
    topScores: scores.slice(0, 6), pick, confidence, confidenceLabel,
  };
}
