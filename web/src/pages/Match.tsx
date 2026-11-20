import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, kickoff, pct, providerName, useApi, type Analysis, type Detail, type FormEntry, type Meta, type PredictionResult, type Profile } from "../api";
import { Crest } from "../components/Crest";
import { ConfidenceDots, DuelRow, FormPills, OutcomeRing, ScoreGrid } from "../components/Charts";
import { ordinal, useI18n, useNames, useRoundLabel, type Lang } from "../i18n";
import { useLeague } from "../league";
import { Empty, Loading } from "./Fixtures";

function useFormLabels() {
  const { t, lang } = useI18n();
  return (form: FormEntry[]) => form.map((f) => ({
    result: f.result,
    label: t("m.formVs", {
      score: `${f.gf}–${f.ga}`, opp: (lang === "zh" && f.opponentZh) || f.opponent,
      venue: f.venue === "H" ? t("common.home") : t("common.away"),
    }),
  }));
}

export function MatchPage({ meta }: { meta?: Meta }) {
  const { id = "" } = useParams();
  const { t, lang, locale } = useI18n();
  const names = useNames();
  const roundLabel = useRoundLabel();
  const formLabels = useFormLabels();
  const { league, setLeague } = useLeague();
  const { data: d, loading, error } = useApi<Detail>(`/matches/${id}`);
  const run = usePrediction(id, lang);

  // Opening a match from another competition switches the league bar to it.
  const matchLeague = d?.league.id;
  useEffect(() => { if (matchLeague && matchLeague !== league?.id) setLeague(matchLeague); }, [matchLeague]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loading />;
  if (error || !d) return <Empty msg={error ?? t("common.notFound")} />;

  const H = d.home, A = d.away;
  const finished = d.match.status === "finished";
  const style = { "--home-c": H.team.colors[0], "--away-c": A.team.colors[0] } as React.CSSProperties;
  const rec = (r: Profile["venueRecord"]) => `${r.w}-${r.d}-${r.l}`;
  const ppg = (r: Profile["venueRecord"]) => (3 * r.w + r.d) / Math.max(1, r.w + r.d + r.l);
  const [hs, as] = [names.short(H.team), names.short(A.team)];
  const r = run.phase === "done" ? run.result : null;
  const p = r?.prediction;
  const aiLabel = meta?.aiEnabled ? t("m.calc.ai", { provider: providerName(meta.aiProvider) }) : t("m.calc.stat");

  return (
    <div className="stack-xl">
      <Link to="/" className="back">{t("m.back")}</Link>

      <section className="mhero rise" style={style}>
        <div className="mhero-glow" aria-hidden="true" />
        <div className="eyebrow center">
          <span>{names.league(d.league)}</span><span className="dot" /><span>{roundLabel(d.match)}</span><span className="dot" />
          <span className="mono">{kickoff(d.match.date, locale)}</span>
        </div>
        <div className="mhero-grid">
          <TeamBlock p={H} side={t("common.home")} />
          <div className="mhero-center">
            {finished && (
              <div className="ft">
                <span className="ft-label">{t("m.fullTime")}</span>
                <span className="ft-score mono">{d.match.homeGoals}<i>–</i>{d.match.awayGoals}</span>
              </div>
            )}
            {p ? (
              <div className="reveal">
                <OutcomeRing pHome={p.pHome} pDraw={p.pDraw} pAway={p.pAway} homeName={hs} awayName={as} center={
                  <>
                    <span className="ring-k">{finished ? t("m.pickWas") : t("m.pick")}</span>
                    <span className="ring-pick">{p.pick === "home" ? names.team(H.team) : p.pick === "away" ? names.team(A.team) : t("common.draw")}</span>
                    <span className="ring-p mono">{pct(p.pick === "home" ? p.pHome : p.pick === "away" ? p.pAway : p.pDraw, 1)}</span>
                    <ConfidenceDots label={p.confidenceLabel} />
                  </>
                } />
                <div className="legend">
                  <span><i style={{ background: "var(--c-home)" }} />{hs} {pct(p.pHome)}</span>
                  <span><i style={{ background: "var(--c-draw)" }} />{t("common.draw")} {pct(p.pDraw)}</span>
                  <span><i style={{ background: "var(--c-away)" }} />{as} {pct(p.pAway)}</span>
                </div>
              </div>
            ) : run.phase === "running" ? (
              run.instant
                ? <div className="calc-quick"><span className="spinner" /></div>
                : <Calculating step={run.step} trainedOn={d.trainedOn} aiLabel={aiLabel} />
            ) : (
              <StartPanel finished={finished} trainedOn={d.trainedOn} error={run.error} onStart={() => void run.start()} />
            )}
          </div>
          <TeamBlock p={A} side={t("common.away")} />
        </div>
        {p && (
          <div className="xg-duel reveal">
            <span className="mono">{p.lambdaHome.toFixed(2)}</span>
            <div className="xg-track">
              <span style={{ flex: p.lambdaHome, background: "var(--c-home)" }} />
              <span style={{ flex: p.lambdaAway, background: "var(--c-away)" }} />
            </div>
            <span className="mono">{p.lambdaAway.toFixed(2)}</span>
            <span className="xg-label">{t("m.xg")}</span>
          </div>
        )}
      </section>

      {r && p && (
        <div className="two-col">
          <AnalysisPanel a={run.analysis} err={run.analysisErr} meta={meta} homeShort={hs} awayShort={as} />

          <aside className="stack-l">
            <section className="card pad rise" style={{ animationDelay: "120ms" }}>
              <h4 className="card-title">{t("m.scorelines")}</h4>
              <ScoreGrid matrix={p.matrix} homeShort={hs} awayShort={as} />
              <div className="top-scores">
                {p.topScores.slice(0, 3).map((s, i) => (
                  <div key={i} className="ts">
                    <span className="mono">{s.home}–{s.away}</span><span className="muted">{pct(s.p, 1)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card pad rise" style={{ animationDelay: "180ms" }}>
              <h4 className="card-title">{t("m.markets")}</h4>
              <Market label={t("m.btts")} p={p.btts} />
              <Market label={t("m.over25")} p={p.over25} />
              <Market label={t("m.cleanSheet", { team: hs })} p={p.matrix.reduce((s, row) => s + row[0], 0)} />
              <Market label={t("m.cleanSheet", { team: as })} p={p.matrix[0].reduce((s, x) => s + x, 0)} />
              <Market label={t("m.eloExpected", { team: hs })} p={r.elo.pHomeWinish} />
            </section>
          </aside>
        </div>
      )}

      <section className="card pad rise" style={{ animationDelay: "220ms" }}>
        <div className="section-head tight">
          <h3>{t("m.tape")}</h3>
          <span className="muted">{t("m.tapeSub")}</span>
        </div>
        <div className="tape-head">
          <span><Crest team={H.team} size={26} />{names.team(H.team)}</span>
          <span>{names.team(A.team)}<Crest team={A.team} size={26} /></span>
        </div>
        <DuelRow label={t("m.position")} home={ordinal(H.position, lang)} away={ordinal(A.position, lang)} hv={1 / H.position} av={1 / A.position} />
        <DuelRow label={t("m.points")} home={H.points} away={A.points} hv={H.points} av={A.points} />
        <DuelRow label={t("m.last5")} home={H.formPoints} away={A.formPoints} hv={H.formPoints} av={A.formPoints} />
        <DuelRow label={t("m.attack")} home={H.attackRating.toFixed(2)} away={A.attackRating.toFixed(2)} hv={H.attackRating} av={A.attackRating} />
        <DuelRow label={t("m.defence")} home={H.defenseRating.toFixed(2)} away={A.defenseRating.toFixed(2)} hv={1 / H.defenseRating} av={1 / A.defenseRating} />
        <DuelRow label={t("m.elo")} home={H.elo} away={A.elo} hv={H.elo - 1300} av={A.elo - 1300} />
        <DuelRow label={t("m.venueRecord")} home={rec(H.venueRecord)} away={rec(A.venueRecord)} hv={ppg(H.venueRecord)} av={ppg(A.venueRecord)} />
        <div className="tape-form">
          <FormPills form={formLabels(H.form)} />
          <span className="muted">{t("m.recentForm")}</span>
          <FormPills form={formLabels(A.form)} />
        </div>
        {d.headToHead.length > 0 && (
          <div className="h2h">
            <span className="muted">{t("m.h2h")}</span>
            {d.headToHead.map((m) => {
              const hFirst = m.homeId === d.match.homeId;
              return <span key={m.id} className="mono h2h-i">{hFirst ? hs : as} {m.homeGoals}–{m.awayGoals} {hFirst ? as : hs}</span>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- running the forecast ----------

const STARTED_KEY = "oracle.started";
function startedIds(): string[] {
  try { return JSON.parse(sessionStorage.getItem(STARTED_KEY) ?? "[]") as string[]; } catch { return []; }
}
function markStarted(id: string) {
  try { sessionStorage.setItem(STARTED_KEY, JSON.stringify([...new Set([...startedIds(), id])].slice(-200))); } catch { /* storage blocked */ }
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * The forecast is computed on demand. Steps advance as the server finishes them
 * (the model, then the written analysis); each is held briefly so the sequence reads.
 * A match already run this session reopens straight to its result.
 */
function usePrediction(matchId: string, lang: Lang) {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [instant, setInstant] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [analyses, setAnalyses] = useState<Partial<Record<Lang, Analysis>>>({});
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0); // bumping it abandons a run in flight
  const langNow = useRef(lang);
  langNow.current = lang;

  const start = useCallback(async (quick = false) => {
    const id = ++runId.current;
    const live = () => runId.current === id;
    const hold = (ms: number) => (quick ? Promise.resolve() : sleep(ms));
    setPhase("running"); setInstant(quick); setStep(0); setError(null); setAnalysisErr(null);
    try {
      await hold(900); // the match count animates up
      if (!live()) return;
      setStep(1);
      const [res] = await Promise.all([api<PredictionResult>(`/matches/${matchId}/prediction`, { method: "POST" }), hold(1000)]);
      if (!live()) return;
      setResult(res);
      setStep(2);
      const l = langNow.current;
      try {
        const [a] = await Promise.all([api<Analysis>(`/matches/${matchId}/analysis?lang=${l}`, { method: "POST" }), hold(800)]);
        if (live()) setAnalyses({ [l]: a });
      } catch (e) {
        if (live()) setAnalysisErr((e as Error).message); // the numbers still stand
      }
      if (!live()) return;
      setStep(3);
      await hold(400);
      if (!live()) return;
      markStarted(matchId);
      setPhase("done");
    } catch (e) {
      if (live()) { setError((e as Error).message); setPhase("error"); }
    }
  }, [matchId]);

  useEffect(() => {
    runId.current++;
    setPhase("idle"); setResult(null); setAnalyses({}); setStep(0); setError(null);
    if (startedIds().includes(matchId)) void start(true);
    return () => { runId.current++; };
  }, [matchId, start]);

  // Switching language after the run fetches the analysis in the new language.
  const have = Boolean(analyses[lang]);
  useEffect(() => {
    if (phase !== "done" || have) return;
    let live = true;
    setAnalysisErr(null);
    api<Analysis>(`/matches/${matchId}/analysis?lang=${lang}`, { method: "POST" }).then(
      (a) => live && setAnalyses((x) => ({ ...x, [lang]: a })),
      (e: Error) => live && setAnalysisErr(e.message),
    );
    return () => { live = false; };
  }, [phase, lang, matchId, have]);

  return { phase, instant, step, result, analysis: analyses[lang], analysisErr, error, start };
}

/** Counts from 0 to `target` over `ms`. */
function useCountUp(target: number, ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

function StartPanel({ finished, trainedOn, error, onStart }: { finished: boolean; trainedOn: number; error: string | null; onStart: () => void }) {
  const { t, locale } = useI18n();
  return (
    <div className="start">
      <div className="start-stage">
        <span className="start-orbit" aria-hidden="true" />
        <button className="start-btn" onClick={onStart}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
          <span>{finished ? t("m.startFinished") : t("m.start")}</span>
        </button>
      </div>
      <span className="start-note">{t("m.startNote", { n: trainedOn.toLocaleString(locale) })}</span>
      {error && <span className="start-err">{t("m.predictFailed", { err: error })}</span>}
    </div>
  );
}

function Calculating({ step, trainedOn, aiLabel }: { step: number; trainedOn: number; aiLabel: string }) {
  const { t, locale } = useI18n();
  const n = useCountUp(trainedOn, 850);
  const steps = [t("m.calc.data", { n: trainedOn.toLocaleString(locale) }), t("m.calc.model"), aiLabel];
  const captions = [t("m.calc.k.data"), t("m.calc.k.model"), t("m.calc.k.ai")];
  return (
    <div className="calc" role="status" aria-label={t("m.calcAria")}>
      <div className="ring">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="84" fill="none" stroke="var(--line)" strokeWidth="10" />
          {(["home", "draw", "away"] as const).map((k, i) => (
            <circle key={k} className={`orbit o${i + 1}`} cx="100" cy="100" r="84" fill="none" stroke={`var(--c-${k})`}
              strokeWidth="10" strokeLinecap="round" strokeDasharray={`${[74, 46, 60][i]} 528`} />
          ))}
        </svg>
        <div className="ring-center">
          <span className="calc-n mono">{n.toLocaleString(locale)}</span>
          <span className="ring-k">{captions[Math.min(step, 2)]}</span>
        </div>
      </div>
      <ol className="calc-steps">
        {steps.map((label, i) => (
          <li key={i} className={i < step ? "done" : i === step ? "on" : ""}>
            <span className="step-dot" aria-hidden="true">{i < step ? "✓" : ""}</span>{label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function TeamBlock({ p, side }: { p: Profile; side: string }) {
  const { t, lang } = useI18n();
  const names = useNames();
  const formLabels = useFormLabels();
  return (
    <div className="mteam">
      <Crest team={p.team} size={110} />
      <h1>{names.team(p.team)}</h1>
      <div className="mteam-meta">
        <span>{side}</span><span className="dot" /><span>{ordinal(p.position, lang)} · {p.points} {t("common.pts")}</span>
      </div>
      <FormPills form={formLabels(p.form)} />
    </div>
  );
}

function AnalysisPanel({ a, err, meta, homeShort, awayShort }: { a?: Analysis; err: string | null; meta?: Meta; homeShort: string; awayShort: string }) {
  const { t } = useI18n();
  if (err && !a) return <section className="card pad analysis"><p className="muted">{t("a.unavailable", { err })}</p></section>;
  if (!a) {
    return (
      <section className="card pad analysis rise">
        <div className="analysis-src"><span className="spark" />{meta?.aiEnabled ? t("a.loadingAI", { provider: providerName(meta.aiProvider) }) : t("a.loadingStat")}</div>
        <div className="skel w60" /><div className="skel w90" /><div className="skel w80" /><div className="skel w70" />
        <div className="skel-grid"><div className="skel tall" /><div className="skel tall" /></div>
      </section>
    );
  }
  const x = a.analysis;
  const favLabel = { home: homeShort, away: awayShort, neutral: t("a.even") };
  const [keyBefore, keyAfter] = t("a.statNoKey").split("{key}");
  return (
    <section className="card pad analysis rise" style={{ animationDelay: "60ms" }}>
      <div className="analysis-src">
        {a.source !== "statistical"
          ? <><span className="spark" />{t("a.byAI", { model: a.model ?? providerName(a.source) })}</>
          : a.aiError
            ? <><span className="spark off" />{t("a.statError", { err: a.aiError, provider: providerName(meta?.aiProvider) })}</>
            : <><span className="spark off" />{keyBefore}<code>OPENAI_API_KEY</code> / <code>ANTHROPIC_API_KEY</code>{keyAfter}</>}
      </div>
      <h2 className="analysis-h">{x.headline}</h2>
      <p className="analysis-verdict">{x.verdict}</p>
      <p className="analysis-body">{x.summary}</p>

      <div className="factors">
        {x.keyFactors.map((f, i) => (
          <div key={i} className={`factor fav-${f.favours}`}>
            <div className="factor-top">
              <span className="factor-t">{f.title}</span>
              <span className={`factor-fav fav-${f.favours}`}>{favLabel[f.favours]}</span>
            </div>
            <p>{f.detail}</p>
            <span className={`weight w-${f.weight}`}>{t(`a.impact.${f.weight}`)}</span>
          </div>
        ))}
      </div>

      <div className="analysis-split">
        <div>
          <h5>{t("a.script")}</h5>
          <p>{x.matchScript}</p>
        </div>
        <div>
          <h5>{t("a.risks")}</h5>
          <ul>{x.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      </div>

      <div className="angle">
        <span className="angle-k">{t("a.angle")}</span>
        <span className="angle-m">{x.bestAngle.market}</span>
        <span className="angle-r">{x.bestAngle.rationale}</span>
      </div>
    </section>
  );
}

function Market({ label, p }: { label: string; p: number }) {
  return (
    <div className="market">
      <span>{label}</span>
      <div className="market-bar"><span style={{ width: `${p * 100}%` }} /></div>
      <span className="mono">{pct(p)}</span>
    </div>
  );
}
