import { Link } from "react-router-dom";
import { pct, useApi, type ModelInfo } from "../api";
import { Tip, useMounted } from "../components/Charts";
import { useI18n, type TKey } from "../i18n";
import { Empty, Loading } from "./Fixtures";

/** Method steps are stored as "<b>Lead.</b> body" — split without injecting HTML. */
function Step({ text }: { text: string }) {
  const m = text.match(/^<b>(.*?)<\/b>\s*(.*)$/s);
  return <li>{m ? <><b>{m[1]}</b> {m[2]}</> : text}</li>;
}

export function ModelPage() {
  const { t } = useI18n();
  const { data, loading, error } = useApi<ModelInfo>("/model");
  const on = useMounted(150);
  if (loading) return <Loading />;
  if (error || !data) return <Empty msg={error ?? t("common.noData")} />;
  const bt = data.backtest;
  const skill = 1 - bt.logLoss / bt.baselineLogLoss;

  return (
    <div className="stack-l">
      <div className="page-head rise">
        <div>
          <div className="eyebrow"><span>{t("t.eyebrow")}</span></div>
          <h1 className="display">{t("t.title")}</h1>
          <p className="lede">{t("t.lede")}</p>
        </div>
      </div>

      <section className="stats rise" style={{ animationDelay: "60ms" }}>
        <div className="stat"><div className="stat-v">{pct(bt.accuracy, 1)}</div><div className="stat-l">{t("stat.accuracy")}</div><div className="stat-n">{t("t.accuracyNote", { n: bt.matches })}</div></div>
        <div className="stat"><div className="stat-v">{bt.logLoss.toFixed(3)}</div><div className="stat-l">{t("stat.logloss")}</div><div className="stat-n">{t("t.baseline", { b: bt.baselineLogLoss.toFixed(3) })}</div></div>
        <div className="stat"><div className="stat-v">{bt.brier.toFixed(3)}</div><div className="stat-l">{t("t.brier")}</div><div className="stat-n">{t("t.baseline", { b: "0.667" })}</div></div>
        <div className="stat"><div className="stat-v">{`${(skill * 100).toFixed(1)}%`}</div><div className="stat-l">{t("t.skill")}</div><div className="stat-n">{t("t.homeAdv", { x: data.homeAdvantage.toFixed(2) })}</div></div>
      </section>

      <div className="two-col even">
        <section className="card pad rise" style={{ animationDelay: "120ms" }}>
          <h4 className="card-title">{t("t.byMatchday")}</h4>
          <div className="bars" role="img" aria-label={t("t.byMatchday")}>
            <div className="bars-ref" style={{ bottom: `${(1 / 3) * 100}%` }}><span>{t("t.chance")}</span></div>
            {bt.perDay.map((d) => (
              <Tip key={d.matchday} label={t("t.mdTip", { md: d.matchday, p: pct(d.accuracy), n: d.n })}>
                <div className="bar-col">
                  <div className="bar" style={{ height: on ? `${Math.max(2, d.accuracy * 100)}%` : 0 }} />
                  <span className="bar-x mono">{d.matchday}</span>
                </div>
              </Tip>
            ))}
          </div>
        </section>

        <section className="card pad rise" style={{ animationDelay: "180ms" }}>
          <h4 className="card-title">{t("t.method")}</h4>
          <ol className="method">
            {(["t.m1", "t.m2", "t.m3", "t.m4", "t.m5"] as TKey[]).map((k) => <Step key={k} text={t(k)} />)}
          </ol>
        </section>
      </div>

      <section className="card pad rise" style={{ animationDelay: "220ms" }}>
        <h4 className="card-title">{t("t.recent")}</h4>
        <div className="calls">
          {bt.recent.map((r) => {
            const pick = r.pick === "home" ? r.home : r.pick === "away" ? r.away : t("common.draw");
            return (
              <Link to={`/match/${r.matchId}`} key={r.matchId} className={`call ${r.correct ? "hit" : "miss"}`}>
                <span className="mono">{r.home} {r.score} {r.away}</span>
                <span className="muted">{t("t.pickLabel", { team: pick })}</span>
                <span>{r.correct ? "✓" : "✕"}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
