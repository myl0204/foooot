import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, kickoff, pct, providerName, useApi, type Analysis, type Detail, type FormEntry, type Meta, type Profile } from "../api";
import { Crest } from "../components/Crest";
import { ConfidenceDots, DuelRow, FormPills, OutcomeRing, ScoreGrid } from "../components/Charts";
import { ordinal, useI18n } from "../i18n";
import { Empty, Loading } from "./Fixtures";

function useFormLabels() {
  const { t } = useI18n();
  return (form: FormEntry[]) => form.map((f) => ({
    result: f.result,
    label: t("m.formVs", { score: `${f.gf}–${f.ga}`, opp: f.opponent, venue: f.venue === "H" ? t("common.home") : t("common.away") }),
  }));
}

export function MatchPage({ meta }: { meta?: Meta }) {
  const { id } = useParams();
  const { t, lang, locale } = useI18n();
  const formLabels = useFormLabels();
  const { data: d, loading, error } = useApi<Detail>(`/matches/${id}`);
  if (loading) return <Loading />;
  if (error || !d) return <Empty msg={error ?? t("common.notFound")} />;

  const p = d.prediction;
  const H = d.home, A = d.away;
  const finished = d.match.status === "finished";
  const pickTeam = p.pick === "home" ? H.team.name : p.pick === "away" ? A.team.name : t("common.draw");
  const pickP = p.pick === "home" ? p.pHome : p.pick === "away" ? p.pAway : p.pDraw;
  const style = { "--home-c": H.team.colors[0], "--away-c": A.team.colors[0] } as React.CSSProperties;
  const rec = (r: Profile["venueRecord"]) => `${r.w}-${r.d}-${r.l}`;
  const ppg = (r: Profile["venueRecord"]) => (3 * r.w + r.d) / Math.max(1, r.w + r.d + r.l);

  return (
    <div className="stack-xl">
      <Link to="/" className="back">{t("m.back")}</Link>

      <section className="mhero rise" style={style}>
        <div className="mhero-glow" aria-hidden="true" />
        <div className="eyebrow center">
          <span>{d.league.name}</span><span className="dot" /><span>{t("fx.matchday", { n: d.match.matchday })}</span><span className="dot" />
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
            <OutcomeRing pHome={p.pHome} pDraw={p.pDraw} pAway={p.pAway} homeName={H.team.short} awayName={A.team.short} center={
              <>
                <span className="ring-k">{finished ? t("m.pickWas") : t("m.pick")}</span>
                <span className="ring-pick">{pickTeam}</span>
                <span className="ring-p mono">{pct(pickP, 1)}</span>
                <ConfidenceDots label={p.confidenceLabel} />
              </>
            } />
            <div className="legend">
              <span><i style={{ background: "var(--c-home)" }} />{H.team.short} {pct(p.pHome)}</span>
              <span><i style={{ background: "var(--c-draw)" }} />{t("common.draw")} {pct(p.pDraw)}</span>
              <span><i style={{ background: "var(--c-away)" }} />{A.team.short} {pct(p.pAway)}</span>
            </div>
          </div>
          <TeamBlock p={A} side={t("common.away")} />
        </div>
        <div className="xg-duel">
          <span className="mono">{p.lambdaHome.toFixed(2)}</span>
          <div className="xg-track">
            <span style={{ flex: p.lambdaHome, background: "var(--c-home)" }} />
            <span style={{ flex: p.lambdaAway, background: "var(--c-away)" }} />
          </div>
          <span className="mono">{p.lambdaAway.toFixed(2)}</span>
          <span className="xg-label">{t("m.xg")}</span>
        </div>
      </section>

      <div className="two-col">
        <AnalysisPanel matchId={d.match.id} meta={meta} homeShort={H.team.short} awayShort={A.team.short} />

        <aside className="stack-l">
          <section className="card pad rise" style={{ animationDelay: "120ms" }}>
            <h4 className="card-title">{t("m.scorelines")}</h4>
            <ScoreGrid matrix={p.matrix} homeShort={H.team.short} awayShort={A.team.short} />
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
            <Market label={t("m.cleanSheet", { team: H.team.short })} p={p.matrix.reduce((s, r) => s + r[0], 0)} />
            <Market label={t("m.cleanSheet", { team: A.team.short })} p={p.matrix[0].reduce((s, x) => s + x, 0)} />
            <Market label={t("m.eloExpected", { team: H.team.short })} p={d.elo.pHomeWinish} />
          </section>
        </aside>
      </div>

      <section className="card pad rise" style={{ animationDelay: "220ms" }}>
        <div className="section-head tight">
          <h3>{t("m.tape")}</h3>
          <span className="muted">{t("m.tapeSub")}</span>
        </div>
        <div className="tape-head">
          <span><Crest team={H.team} size={26} />{H.team.name}</span>
          <span>{A.team.name}<Crest team={A.team} size={26} /></span>
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
              return <span key={m.id} className="mono h2h-i">{hFirst ? H.team.short : A.team.short} {m.homeGoals}–{m.awayGoals} {hFirst ? A.team.short : H.team.short}</span>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function TeamBlock({ p, side }: { p: Profile; side: string }) {
  const { t, lang } = useI18n();
  const formLabels = useFormLabels();
  return (
    <div className="mteam">
      <Crest team={p.team} size={110} />
      <h1>{p.team.name}</h1>
      <div className="mteam-meta">
        <span>{side}</span><span className="dot" /><span>{ordinal(p.position, lang)} · {p.points} {t("common.pts")}</span>
      </div>
      <FormPills form={formLabels(p.form)} />
    </div>
  );
}

function AnalysisPanel({ matchId, meta, homeShort, awayShort }: { matchId: string; meta?: Meta; homeShort: string; awayShort: string }) {
  const { t, lang } = useI18n();
  const [a, setA] = useState<Analysis | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setA(null); setErr(null);
    api<Analysis>(`/matches/${matchId}/analysis?lang=${lang}`, { method: "POST" }).then((r) => live && setA(r), (e: Error) => live && setErr(e.message));
    return () => { live = false; };
  }, [matchId, lang]);

  if (err) return <section className="card pad analysis"><p className="muted">{t("a.unavailable", { err })}</p></section>;
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
