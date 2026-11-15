import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import type { MatchDetail } from "../types.ts";

export const AnalysisSchema = z.object({
  headline: z.string().describe("A sharp 4-9 word editorial headline for the match preview"),
  verdict: z.string().describe("One sentence stating the predicted outcome and why, consistent with the model's pick"),
  summary: z.string().describe("2-3 sentence overview of how the matchup is likely to play out"),
  keyFactors: z.array(z.object({
    title: z.string().describe("2-5 words"),
    detail: z.string().describe("1-2 sentences citing specific supplied numbers"),
    favours: z.enum(["home", "away", "neutral"]),
    weight: z.enum(["high", "medium", "low"]),
  })).describe("3-5 factors, most important first"),
  matchScript: z.string().describe("2-3 sentences on the likely game state: who controls, where goals come from"),
  risks: z.array(z.string()).describe("2-3 ways the prediction could go wrong, grounded in the data"),
  bestAngle: z.object({
    market: z.string().describe("e.g. 'Home win', 'Under 2.5 goals', 'Both teams to score'"),
    rationale: z.string().describe("One sentence referencing the model probability"),
  }),
});
export type Analysis = z.infer<typeof AnalysisSchema>;
export interface AnalysisResult { source: "claude" | "openai" | "statistical"; model?: string; generatedAt: string; analysis: Analysis; aiError?: string }

const SYSTEM = `You are the lead analyst for a premium football prediction service. You write match previews that explain a statistical model's forecast.

Rules:
- The probabilities, expected goals and confidence come from the model and are final. Do not change, re-estimate or contradict them; your verdict must agree with the model's pick.
- Use ONLY the data supplied in the request. You have no information about injuries, lineups, transfers, managers or news for these fixtures, so never mention or invent them.
- Cite concrete numbers (form, ratings, xG, venue records, Elo) when you make a point.
- Write with calm authority: precise, editorial, no hype, no gambling encouragement. Present the "best angle" as an analytical observation, not betting advice.
- British football vocabulary is fine. Keep every field concise.`;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function briefing(d: MatchDetail, league: string) {
  const p = d.prediction;
  const side = (t: MatchDetail["home"], venue: string) => ({
    club: t.team.name,
    venue,
    tablePosition: t.position,
    points: t.points,
    played: t.played,
    goalsFor: t.gf,
    goalsAgainst: t.ga,
    lastFive: t.form.map((f) => `${f.result} ${f.gf}-${f.ga} vs ${f.opponent} (${f.venue})`),
    lastFivePoints: t.formPoints,
    [`${venue.toLowerCase()}Record`]: `W${t.venueRecord.w} D${t.venueRecord.d} L${t.venueRecord.l}, goals ${t.venueRecord.gf}-${t.venueRecord.ga}`,
    attackRating: `${t.attackRating.toFixed(2)}x league average (rank ${t.attackRank})`,
    defenceRating: `${t.defenseRating.toFixed(2)}x league average goals conceded (rank ${t.defenseRank}, lower is better)`,
    elo: t.elo,
    restDays: t.restDays,
  });
  return {
    competition: league,
    kickoff: d.match.date,
    home: side(d.home, "Home"),
    away: side(d.away, "Away"),
    model: {
      method: "Time-weighted Dixon–Coles Poisson model; Elo shown as an independent cross-check",
      expectedGoals: { home: +p.lambdaHome.toFixed(2), away: +p.lambdaAway.toFixed(2) },
      homeWin: pct(p.pHome), draw: pct(p.pDraw), awayWin: pct(p.pAway),
      pick: p.pick, confidence: p.confidenceLabel,
      bothTeamsToScore: pct(p.btts), over2_5Goals: pct(p.over25),
      likeliestScores: p.topScores.slice(0, 4).map((s) => `${s.home}-${s.away} (${pct(s.p)})`),
      eloHomeExpectedScore: pct(d.elo.pHomeWinish),
    },
    headToHeadThisDataset: d.headToHead.map((m) => `${m.homeId === d.match.homeId ? d.home.team.short : d.away.team.short} ${m.homeGoals}-${m.awayGoals} ${m.homeId === d.match.homeId ? d.away.team.short : d.home.team.short}`),
  };
}

// ---------- cache (JSON file, keyed by match + inputs hash) ----------
const CACHE_FILE = path.resolve("data/analysis-cache.json");
let cache: Record<string, AnalysisResult> = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch { /* fresh */ }
const persist = () => { fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true }); fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); };
const inflight = new Map<string, Promise<AnalysisResult>>();

export type Provider = "anthropic" | "openai";

/**
 * Which AI writes the analysis. ANALYSIS_PROVIDER forces one; otherwise the first
 * provider with a key wins (Anthropic, then OpenAI). null = statistical fallback only.
 */
export function aiProvider(): Provider | null {
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const forced = process.env.ANALYSIS_PROVIDER?.toLowerCase();
  if (forced === "openai") return hasOpenAI ? "openai" : null;
  if (forced === "anthropic") return hasAnthropic ? "anthropic" : null;
  return hasAnthropic ? "anthropic" : hasOpenAI ? "openai" : null;
}
export const aiEnabled = () => aiProvider() !== null;

const ANTHROPIC_MODEL = "claude-opus-5-5";
const openaiModel = () => process.env.OPENAI_MODEL || "gpt-5.5";
let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

export type Lang = "en" | "zh";
export const parseLang = (v: unknown): Lang => (v === "zh" ? "zh" : "en");

const LANGUAGE_RULE: Record<Lang, string> = {
  en: "Write every text field in British English.",
  zh: "Write every text field in Simplified Chinese (简体中文), in the register of a quality Chinese sports column. Keep club names and three-letter club codes exactly as supplied (do not translate them). Use standard Chinese football terms (e.g. 预期进球, 零封, 主场优势).",
};

export async function getAnalysis(d: MatchDetail, league: string, lang: Lang = "en"): Promise<AnalysisResult> {
  const provider = aiProvider();
  const key = `${d.match.id}:${d.inputsHash}:${provider ?? "stat"}:${lang}`;
  if (cache[key]) return cache[key];
  if (!inflight.has(key)) {
    inflight.set(key, (async () => {
      let result: AnalysisResult;
      if (provider) {
        try {
          result = provider === "openai" ? await openaiAnalysis(d, league, lang) : await claudeAnalysis(d, league, lang);
        } catch (err) {
          console.error(`[analysis] ${provider} call failed, serving statistical summary:`, (err as Error).message);
          // not cached, so a later request can retry Claude
          return { ...statisticalAnalysis(d, lang), aiError: (err as Error).message };
        }
      } else {
        result = statisticalAnalysis(d, lang);
      }
      cache[key] = result;
      persist();
      return result;
    })().finally(() => inflight.delete(key)));
  }
  return inflight.get(key)!;
}

async function claudeAnalysis(d: MatchDetail, league: string, lang: Lang): Promise<AnalysisResult> {
  anthropic ??= new Anthropic();
  const response = await anthropic.beta.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // a safety-classifier decline is retried server-side on Anthropic's recommended model
    output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
    system: SYSTEM, // kept byte-stable for prompt caching; the language rule goes in the user turn
    messages: [{
      role: "user",
      content: userPrompt(d, league, lang),
    }],
  });
  if (response.stop_reason === "refusal") throw new Error("model declined the request");
  if (response.stop_reason === "max_tokens") throw new Error("analysis truncated");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("no structured output returned");
  return { source: "claude", model: response.model, generatedAt: new Date().toISOString(), analysis: parsed };
}

function userPrompt(d: MatchDetail, league: string, lang: Lang) {
  return `${LANGUAGE_RULE[lang]}\n\nWrite the preview for this fixture. Data:\n\n${JSON.stringify(briefing(d, league), null, 2)}`;
}

async function openaiAnalysis(d: MatchDetail, league: string, lang: Lang): Promise<AnalysisResult> {
  openai ??= new OpenAI();
  const response = await openai.responses.parse({
    model: openaiModel(),
    instructions: SYSTEM,
    input: userPrompt(d, league, lang),
    text: { format: zodTextFormat(AnalysisSchema, "match_analysis") },
  });
  if (response.status === "incomplete") throw new Error(`analysis incomplete (${response.incomplete_details?.reason ?? "unknown"})`);
  const refused = response.output.some((o) => o.type === "message" && o.content.some((c) => c.type === "refusal"));
  if (refused) throw new Error("model declined the request");
  const parsed = response.output_parsed;
  if (!parsed) throw new Error("no structured output returned");
  return { source: "openai", model: response.model, generatedAt: new Date().toISOString(), analysis: parsed };
}

const pc = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const ord = (n: number) => (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");

/** Template copy for the statistical fallback, one entry per language. */
const COPY = {
  en: {
    xgTitle: "Expected goals edge",
    xg: (h: string, hx: string, a: string, ax: string) => `The model projects ${hx} xG for ${h} against ${ax} for ${a}.`,
    formTitle: "Recent form",
    form: (h: string, hp: number, a: string, ap: number) => `${h} took ${hp} points from their last five; ${a} took ${ap}.`,
    avdTitle: "Attack vs defence",
    avd: (h: string, ar: number, av: string, a: string, dr: number, dv: string) =>
      `${h} attack ranks ${ar}${ord(ar)} (${av}x avg); ${a} defence ranks ${dr}${ord(dr)} (${dv}x avg conceded).`,
    eloTitle: "Elo cross-check",
    elo: (he: number, ae: number, p: string) => `Elo ${he} v ${ae} gives the hosts an expected score of ${p} including home advantage.`,
    win: (t: string) => `${t} win`, draw: "Draw",
    over: "Over 2.5 goals", under: "Under 2.5 goals", btts: "Both teams to score", noBtts: "Not both teams to score",
    headlineFav: (t: string) => `${t} hold the edge`, headlineEven: "Too close to separate",
    conf: { Low: "low", Medium: "medium", High: "high" } as Record<string, string>,
    verdictFav: (t: string, p: string, c: string) => `${t} are the model's pick at ${p}, with ${c} confidence.`,
    verdictDraw: (p: string) => `A draw is the single likeliest outcome at ${p}.`,
    shape: (x: number) => (x > 2.9 ? "an open" : x < 2.3 ? "a tight, low-scoring" : "a balanced"),
    summary: (xg: string, shape: string, s: string, p: string) => `With ${xg} total expected goals this projects as ${shape} contest. The likeliest scoreline is ${s} (${p}).`,
    script: (t: string, p: string) => `${t} should carry more of the attacking threat. Both teams score in ${p} of simulations.`,
    risk1: (p: string) => `The outsider still wins ${p} of the time.`,
    risk2: (p: string) => `A draw is live at ${p}.`,
    risk3: "Ratings rest on a limited sample and know nothing of injuries or lineups.",
    rationale: (p: string) => `The model rates it at ${p}.`,
  },
  zh: {
    xgTitle: "预期进球优势",
    xg: (h: string, hx: string, a: string, ax: string) => `模型预计 ${h} 的预期进球为 ${hx}，${a} 为 ${ax}。`,
    formTitle: "近期状态",
    form: (h: string, hp: number, a: string, ap: number) => `${h} 近五场拿到 ${hp} 分，${a} 拿到 ${ap} 分。`,
    avdTitle: "攻防对位",
    avd: (h: string, ar: number, av: string, a: string, dr: number, dv: string) =>
      `${h} 进攻排名第 ${ar}（联赛平均的 ${av} 倍）；${a} 防守排名第 ${dr}（失球为平均的 ${dv} 倍）。`,
    eloTitle: "Elo 交叉验证",
    elo: (he: number, ae: number, p: string) => `Elo 评分 ${he} 对 ${ae}，计入主场优势后主队期望得分为 ${p}。`,
    win: (t: string) => `${t} 胜`, draw: "平局",
    over: "总进球大于 2.5", under: "总进球小于 2.5", btts: "双方均有进球", noBtts: "并非双方均进球",
    headlineFav: (t: string) => `${t} 稍占上风`, headlineEven: "势均力敌，难分高下",
    conf: { Low: "低", Medium: "中等", High: "高" } as Record<string, string>,
    verdictFav: (t: string, p: string, c: string) => `模型看好 ${t}，胜率 ${p}，置信度${c}。`,
    verdictDraw: (p: string) => `平局是单一可能性最高的结果，概率 ${p}。`,
    shape: (x: number) => (x > 2.9 ? "一场开放的对攻战" : x < 2.3 ? "一场紧凑的低比分较量" : "一场攻守均衡的比赛"),
    summary: (xg: string, shape: string, s: string, p: string) => `两队预期进球合计 ${xg}，预计这将是${shape}。最可能的比分是 ${s}（${p}）。`,
    script: (t: string, p: string) => `${t} 应会承担更多进攻任务。在模拟中，双方均有进球的比例为 ${p}。`,
    risk1: (p: string) => `弱势一方仍有 ${p} 的取胜可能。`,
    risk2: (p: string) => `平局的可能性为 ${p}，不容忽视。`,
    risk3: "评分基于有限的样本，且不包含伤病或首发阵容信息。",
    rationale: (p: string) => `模型给出的概率为 ${p}。`,
  },
};

/** Deterministic, template-based summary used when no Claude credentials are configured. */
export function statisticalAnalysis(d: MatchDetail, lang: Lang = "en"): AnalysisResult {
  const c = COPY[lang];
  const p = d.prediction, H = d.home, A = d.away;
  const fav = p.pick === "home" ? H : p.pick === "away" ? A : null;
  const totalXg = p.lambdaHome + p.lambdaAway;
  const factors: Analysis["keyFactors"] = [];
  const xgGap = p.lambdaHome - p.lambdaAway;
  factors.push({
    title: c.xgTitle,
    detail: c.xg(H.team.short, p.lambdaHome.toFixed(2), A.team.short, p.lambdaAway.toFixed(2)),
    favours: Math.abs(xgGap) < 0.15 ? "neutral" : xgGap > 0 ? "home" : "away",
    weight: Math.abs(xgGap) > 0.6 ? "high" : "medium",
  });
  const formGap = H.formPoints - A.formPoints;
  factors.push({
    title: c.formTitle,
    detail: c.form(H.team.short, H.formPoints, A.team.short, A.formPoints),
    favours: Math.abs(formGap) < 2 ? "neutral" : formGap > 0 ? "home" : "away",
    weight: Math.abs(formGap) >= 5 ? "high" : "medium",
  });
  factors.push({
    title: c.avdTitle,
    detail: c.avd(H.team.short, H.attackRank, H.attackRating.toFixed(2), A.team.short, A.defenseRank, A.defenseRating.toFixed(2)),
    favours: H.attackRank < A.defenseRank ? "home" : "away",
    weight: "medium",
  });
  const eloGap = H.elo - A.elo;
  factors.push({
    title: c.eloTitle,
    detail: c.elo(H.elo, A.elo, pc(d.elo.pHomeWinish)),
    favours: Math.abs(d.elo.pHomeWinish - 0.5) < 0.05 ? "neutral" : d.elo.pHomeWinish > 0.5 ? "home" : "away",
    weight: Math.abs(eloGap) > 120 ? "high" : "low",
  });
  const best = [
    { market: fav ? c.win(fav.team.name) : c.draw, p: Math.max(p.pHome, p.pDraw, p.pAway) },
    { market: p.over25 > 0.5 ? c.over : c.under, p: Math.max(p.over25, 1 - p.over25) },
    { market: p.btts > 0.5 ? c.btts : c.noBtts, p: Math.max(p.btts, 1 - p.btts) },
  ].sort((x, y) => y.p - x.p)[0];
  const top = p.topScores[0];

  return {
    source: "statistical",
    generatedAt: new Date().toISOString(),
    analysis: {
      headline: fav ? c.headlineFav(fav.team.name) : c.headlineEven,
      verdict: fav ? c.verdictFav(fav.team.name, pc(Math.max(p.pHome, p.pAway)), c.conf[p.confidenceLabel]) : c.verdictDraw(pc(p.pDraw)),
      summary: c.summary(totalXg.toFixed(1), c.shape(totalXg), `${top.home}-${top.away}`, pc(top.p, 1)),
      keyFactors: factors,
      matchScript: c.script(p.lambdaHome >= p.lambdaAway ? H.team.short : A.team.short, pc(p.btts)),
      risks: [c.risk1(pc(Math.min(p.pHome, p.pAway))), c.risk2(pc(p.pDraw)), c.risk3],
      bestAngle: { market: best.market, rationale: c.rationale(pc(best.p)) },
    },
  };
}
