import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "zh";
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "zh", label: "简体中文", short: "中" },
];

const en = {
  "brand.sub": "Football Intelligence",
  "nav.fixtures": "Fixtures",
  "nav.rankings": "Power Rankings",
  "nav.model": "Track Record",
  "chip.demo": "Demo league · fictional clubs",
  "chip.demoTitle": "Fictional clubs with simulated results — set API_FOOTBALL_KEY for real data",
  "chip.live": "Live data",
  "chip.liveTitle": "Live data from {source}",
  "nav.leagues": "Competitions",
  "foot.tagline": "Oracle · probabilistic forecasts, not certainties.",
  "foot.method": "Dixon–Coles Poisson model · Elo cross-check · {analysis}",
  "foot.byClaude": "analysis by {provider}",
  "foot.statistical": "statistical analysis",
  "lang.switch": "Language",

  "common.loading": "Loading model…",
  "common.noFixtures": "No upcoming fixtures.",
  "common.notFound": "Match not found",
  "common.noData": "No data",
  "common.crashed": "Something went wrong displaying this page.",
  "common.retry": "Try again",
  "common.home": "Home",
  "common.away": "Away",
  "common.draw": "Draw",
  "common.win": "{team} win",
  "common.pts": "pts",
  "conf.Low": "Low",
  "conf.Medium": "Medium",
  "conf.High": "High",
  "conf.aria": "{label} confidence",
  "form.W": "W",
  "form.D": "D",
  "form.L": "L",

  "fx.matchday": "Matchday {n}",
  "fx.featured": "Featured fixture",
  "fx.likeliest": "likeliest",
  "fx.predict": "Predict this match",
  "fx.noFixtures": "No upcoming fixtures in {league}: the season is over or the next round isn't scheduled yet.",
  "fx.fixtures": "{n} fixtures",
  "fx.pick": "Pick",
  "fx.latest": "Latest results",
  "fx.latestSub": "How the model's pick compared to the final whistle",
  "fx.called": "✓ Called",
  "fx.missed": "✕ Missed",
  "stat.accuracy": "Outcome accuracy",
  "stat.accuracyNote": "Walk-forward test, last {n} matches",
  "stat.logloss": "Log-loss",
  "stat.loglossNote": "vs {b} for guessing ⅓ each way · lower is better",
  "stat.skill": "Skill over baseline",
  "stat.skillNote": "Information gained per prediction",
  "stat.modelled": "Matches modelled",
  "stat.modelledNote": "{n} clubs · {s} seasons · time-weighted",

  "m.back": "← All fixtures",
  "m.fullTime": "Full time",
  "m.pick": "Model pick",
  "m.pickWas": "Model pick was",
  "m.xg": "Expected goals",
  "m.scorelines": "Scoreline probabilities",
  "m.goalsAxis": "{team} goals →",
  "m.hoverCell": "Hover a cell for the exact scoreline probability",
  "m.cellChance": "{p} chance",
  "m.markets": "Markets",
  "m.btts": "Both teams to score",
  "m.over25": "Over 2.5 goals",
  "m.cleanSheet": "{team} clean sheet",
  "m.eloExpected": "Elo: {team} expected score",
  "m.tape": "Tale of the tape",
  "m.tapeSub": "Highlighted side holds the edge",
  "m.position": "League position",
  "m.points": "Points",
  "m.last5": "Points, last five",
  "m.attack": "Attack (× league avg)",
  "m.defence": "Defence (× avg conceded)",
  "m.elo": "Elo rating",
  "m.venueRecord": "Home / away record",
  "m.recentForm": "Recent form · newest first",
  "m.h2h": "Head to head",
  "m.formVs": "{score} vs {opp} ({venue})",
  "m.start": "Start prediction",
  "m.startFinished": "Reveal the model's call",
  "m.startNote": "Model trained on {n} matches",
  "m.calcAria": "Calculating the prediction",
  "m.calc.data": "Loading {n} matches",
  "m.calc.model": "Fitting team ratings",
  "m.calc.ai": "Simulating · {provider} is writing the analysis",
  "m.calc.stat": "Simulating · compiling the statistical brief",
  "m.calc.k.data": "matches loaded",
  "m.calc.k.fit": "fitting attack & defence",
  "m.calc.k.xg": "expected goals",
  "m.calc.k.sims": "simulated matches",
  "m.calc.lock": "Locking in the forecast",
  "m.predictFailed": "The prediction could not be computed ({err}).",
  "a.loadingAI": "{provider} is studying the matchup…",
  "a.loadingStat": "Compiling the statistical brief…",
  "a.unavailable": "Analysis unavailable: {err}",
  "a.byAI": "AI analysis · {model}",
  "a.statNoKey": "Statistical summary · add {key} for AI-written analysis",
  "a.statError": "Statistical summary · {provider} unavailable right now ({err})",
  "a.even": "Even",
  "a.impact.high": "high impact",
  "a.impact.medium": "medium impact",
  "a.impact.low": "low impact",
  "a.script": "Match script",
  "a.risks": "What could go wrong",
  "a.angle": "Sharpest angle",

  "r.eyebrow": "Model ratings",
  "r.title": "Power Rankings",
  "r.lede": "Every club rated by the model on attack, defence and long-run Elo. The power index is expected goal difference against an average side at a neutral ground, scaled 30–100.",
  "r.tab.strength": "Power index",
  "r.tab.position": "League table",
  "r.tab.attack": "Attack",
  "r.tab.defence": "Defence",
  "r.tab.elo": "Elo",
  "r.col.club": "Club",
  "r.col.pld": "Pld",
  "r.col.gd": "GD",
  "r.col.pts": "Pts",
  "r.col.power": "Power index",
  "r.col.att": "Att",
  "r.col.def": "Def",
  "r.col.elo": "Elo",
  "r.col.form": "Form",
  "r.foot": "Att: goals scored vs league average. Def: goals conceded vs league average (lower is better). Both are time-weighted with a 120-day half-life.",

  "t.eyebrow": "Transparency",
  "t.title": "Track Record",
  "t.lede": "Each matchday below was predicted using only results that came before it, then scored against what actually happened. Nothing here is hindsight.",
  "t.accuracyNote": "{n} matches · random guessing ≈ 33%",
  "t.baseline": "Uniform baseline {b}",
  "t.brier": "Brier score",
  "t.skill": "Skill score",
  "t.homeAdv": "Home advantage ×{x} goals",
  "t.byMatchday": "Accuracy by matchday",
  "t.chance": "33% · chance",
  "t.mdTip": "MD {md}: {p} of {n}",
  "t.mdTipSeason": "{season} · MD {md}: {p} of {n}",
  "t.method": "Method",
  "t.m1": "<b>Ratings.</b> A Dixon–Coles Poisson model fits an attack and defence strength for every club, weighting recent matches more heavily.",
  "t.m2": "<b>Goals.</b> Those ratings plus home advantage give each side's expected goals for the fixture.",
  "t.m3": "<b>Outcomes.</b> A full scoreline matrix, corrected for low-score dependence, yields win/draw/loss, BTTS and totals.",
  "t.m4": "<b>Cross-check.</b> An independent Elo rating is shown alongside, as a second opinion on each fixture.",
  "t.m5": "<b>Analysis.</b> With an API key, an AI model (Claude or OpenAI) reads the model's numbers and writes the explanation, and is not allowed to change them. Without one, a template summary is shown.",
  "t.recent": "Recent calls",
  "t.pickLabel": "pick: {team}",
};

type Dict = Record<keyof typeof en, string>;

const zh: Dict = {
  "brand.sub": "足球智能预测",
  "nav.fixtures": "赛程",
  "nav.rankings": "实力排行",
  "nav.model": "预测战绩",
  "chip.demo": "演示联赛 · 虚构球队",
  "chip.demoTitle": "虚构球队与模拟赛果 —— 配置 API_FOOTBALL_KEY 以接入真实数据",
  "chip.live": "实时数据",
  "chip.liveTitle": "数据来自 {source}",
  "nav.leagues": "赛事",
  "foot.tagline": "Oracle · 概率预测，而非定论。",
  "foot.method": "Dixon–Coles 泊松模型 · Elo 交叉验证 · {analysis}",
  "foot.byClaude": "由 {provider} 撰写分析",
  "foot.statistical": "统计分析",
  "lang.switch": "语言",

  "common.loading": "模型加载中…",
  "common.noFixtures": "暂无即将进行的比赛。",
  "common.notFound": "未找到该比赛",
  "common.noData": "暂无数据",
  "common.crashed": "页面显示出错了。",
  "common.retry": "重试",
  "common.home": "主场",
  "common.away": "客场",
  "common.draw": "平局",
  "common.win": "{team} 胜",
  "common.pts": "分",
  "conf.Low": "低",
  "conf.Medium": "中",
  "conf.High": "高",
  "conf.aria": "置信度：{label}",
  "form.W": "胜",
  "form.D": "平",
  "form.L": "负",

  "fx.matchday": "第 {n} 轮",
  "fx.featured": "焦点战",
  "fx.likeliest": "最可能比分",
  "fx.predict": "预测这场比赛",
  "fx.noFixtures": "{league}暂无即将进行的比赛：赛季已结束，或下一轮尚未排期。",
  "fx.fixtures": "{n} 场比赛",
  "fx.pick": "预测",
  "fx.latest": "最新赛果",
  "fx.latestSub": "模型预测与最终结果对照",
  "fx.called": "✓ 命中",
  "fx.missed": "✕ 未中",
  "stat.accuracy": "胜平负准确率",
  "stat.accuracyNote": "滚动回测，最近 {n} 场",
  "stat.logloss": "对数损失",
  "stat.loglossNote": "均匀猜测为 {b} · 越低越好",
  "stat.skill": "超越基准",
  "stat.skillNote": "每次预测的信息增益",
  "stat.modelled": "建模场次",
  "stat.modelledNote": "{n} 支球队 · {s} 个赛季 · 时间加权",

  "m.back": "← 全部赛程",
  "m.fullTime": "全场结束",
  "m.pick": "模型预测",
  "m.pickWas": "赛前模型预测",
  "m.xg": "预期进球",
  "m.scorelines": "比分概率",
  "m.goalsAxis": "{team} 进球 →",
  "m.hoverCell": "将鼠标悬停在格子上查看具体比分概率",
  "m.cellChance": "概率 {p}",
  "m.markets": "盘口概率",
  "m.btts": "双方均有进球",
  "m.over25": "总进球大于 2.5",
  "m.cleanSheet": "{team} 零封对手",
  "m.eloExpected": "Elo：{team} 期望得分",
  "m.tape": "数据对比",
  "m.tapeSub": "高亮一方占优",
  "m.position": "联赛排名",
  "m.points": "积分",
  "m.last5": "近五场积分",
  "m.attack": "进攻（× 联赛平均）",
  "m.defence": "防守（× 平均失球）",
  "m.elo": "Elo 评分",
  "m.venueRecord": "主 / 客场战绩",
  "m.recentForm": "近期状态 · 最新在前",
  "m.h2h": "历史交锋",
  "m.formVs": "{score} 对阵 {opp}（{venue}）",
  "m.start": "开始预测",
  "m.startFinished": "查看赛前预测",
  "m.startNote": "模型已学习 {n} 场比赛",
  "m.calcAria": "正在计算预测",
  "m.calc.data": "载入 {n} 场比赛数据",
  "m.calc.model": "拟合球队攻防模型",
  "m.calc.ai": "模拟比赛中 · {provider} 正在撰写分析",
  "m.calc.stat": "模拟比赛中 · 生成统计简报",
  "m.calc.k.data": "场比赛已载入",
  "m.calc.k.fit": "拟合攻防强度",
  "m.calc.k.xg": "预期进球",
  "m.calc.k.sims": "次模拟比赛",
  "m.calc.lock": "锁定预测结果",
  "m.predictFailed": "预测计算失败（{err}）。",
  "a.loadingAI": "{provider} 正在研究这场对决…",
  "a.loadingStat": "正在生成统计简报…",
  "a.unavailable": "分析暂不可用：{err}",
  "a.byAI": "AI 分析 · {model}",
  "a.statNoKey": "统计摘要 · 配置 {key} 即可启用 AI 撰写的分析",
  "a.statError": "统计摘要 · {provider} 暂时不可用（{err}）",
  "a.even": "均势",
  "a.impact.high": "影响大",
  "a.impact.medium": "影响中等",
  "a.impact.low": "影响小",
  "a.script": "比赛走势",
  "a.risks": "潜在变数",
  "a.angle": "最佳切入点",

  "r.eyebrow": "模型评分",
  "r.title": "实力排行",
  "r.lede": "模型从进攻、防守和长期 Elo 三个维度为每支球队评分。实力指数为在中立场地对阵平均水平球队时的预期净胜球，换算为 30–100 分。",
  "r.tab.strength": "实力指数",
  "r.tab.position": "积分榜",
  "r.tab.attack": "进攻",
  "r.tab.defence": "防守",
  "r.tab.elo": "Elo",
  "r.col.club": "球队",
  "r.col.pld": "场次",
  "r.col.gd": "净胜",
  "r.col.pts": "积分",
  "r.col.power": "实力指数",
  "r.col.att": "攻",
  "r.col.def": "守",
  "r.col.elo": "Elo",
  "r.col.form": "近况",
  "r.foot": "攻：进球数相对联赛平均水平。守：失球数相对联赛平均水平（越低越好）。两者均按 120 天半衰期进行时间加权。",

  "t.eyebrow": "公开透明",
  "t.title": "预测战绩",
  "t.lede": "下列每一轮都只使用该轮之前的赛果进行预测，再与实际结果比对。没有任何事后诸葛亮。",
  "t.accuracyNote": "{n} 场 · 随机猜测约 33%",
  "t.baseline": "均匀基准 {b}",
  "t.brier": "Brier 分数",
  "t.skill": "技能分数",
  "t.homeAdv": "主场优势 ×{x} 进球",
  "t.byMatchday": "各轮准确率",
  "t.chance": "33% · 随机",
  "t.mdTip": "第 {md} 轮：{n} 场中命中 {p}",
  "t.mdTipSeason": "{season} 赛季第 {md} 轮：{n} 场中命中 {p}",
  "t.method": "方法",
  "t.m1": "<b>评分。</b>Dixon–Coles 泊松模型为每支球队拟合进攻与防守强度，近期比赛权重更高。",
  "t.m2": "<b>进球。</b>结合上述评分与主场优势，得出双方在本场的预期进球。",
  "t.m3": "<b>结果。</b>经低比分相关性修正的完整比分矩阵，推导出胜平负、双方进球及大小球概率。",
  "t.m4": "<b>交叉验证。</b>独立的 Elo 评分同时展示，作为每场比赛的第二意见。",
  "t.m5": "<b>分析。</b>配置 API 密钥后，AI 模型（Claude 或 OpenAI）读取模型数据并撰写解读，且不得修改任何数字；未配置时显示模板摘要。",
  "t.recent": "近期预测",
  "t.pickLabel": "预测：{team}",
};

const DICTS: Record<Lang, Dict> = { en, zh };
export type TKey = keyof typeof en;

const STORAGE_KEY = "oracle.lang";

function detect(): Lang {
  const fromUrl = typeof location !== "undefined" ? new URLSearchParams(location.search).get("lang") : null;
  if (fromUrl === "en" || fromUrl === "zh") return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh") return saved;
  } catch { /* storage blocked */ }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  locale: string; // BCP-47 for Intl
}
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = lang === "zh" ? "Oracle — 足球智能预测" : "Oracle — Football Intelligence";
  }, [lang]);
  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    locale: lang === "zh" ? "zh-CN" : "en-GB",
    t: (key, vars) => {
      let s: string = DICTS[lang][key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
  }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}

/** Ordinal league position: 1st / 第1 */
export function ordinal(n: number, lang: Lang) {
  if (lang === "zh") return `第${n}`;
  const s = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${s}`;
}

type Named = { name: string; nameZh?: string };

/** Display names in the active language: Chinese club and league names when the server knows them. */
export function useNames() {
  const { lang } = useI18n();
  return useMemo(() => ({
    team: (t: Named) => (lang === "zh" && t.nameZh) || t.name,
    /** Compact label: the 3-letter code in English, the (already short) Chinese name in Chinese. */
    short: (t: Named & { short: string }) => (lang === "zh" && t.nameZh) || t.short,
    league: (l: Named) => (lang === "zh" && l.nameZh) || l.name,
  }), [lang]);
}

const ROUNDS_ZH: Record<string, string> = {
  "Knockout Round Play-offs": "附加赛", "Play-offs": "附加赛", "Round of 32": "32 强", "Round of 16": "16 强",
  "Quarter-finals": "1/4 决赛", "Semi-finals": "半决赛", "3rd Place Final": "季军赛", "Final": "决赛",
};

/** "Matchday 12", or the round name for cup knockouts ("Round of 16" / "16 强"). */
export function useRoundLabel() {
  const { t, lang } = useI18n();
  return (m: { matchday: number; round?: string }) =>
    m.matchday ? t("fx.matchday", { n: m.matchday }) : (lang === "zh" && m.round && ROUNDS_ZH[m.round]) || m.round || "";
}
