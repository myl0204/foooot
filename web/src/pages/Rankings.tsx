import { useMemo, useState } from "react";
import { useApi, type Standing } from "../api";
import { Crest } from "../components/Crest";
import { FormPills, Tip, useMounted } from "../components/Charts";
import { useI18n } from "../i18n";
import { Empty, Loading } from "./Fixtures";

type SortKey = "position" | "strength" | "attackRating" | "defenseRating" | "elo";

export function Rankings() {
  const { t } = useI18n();
  const { data, loading, error } = useApi<Standing[]>("/standings");
  const [sort, setSort] = useState<SortKey>("strength");
  const on = useMounted(150);
  const rows = useMemo(() => {
    if (!data) return [];
    const r = [...data];
    const dir: Record<SortKey, number> = { position: 1, strength: -1, attackRating: -1, defenseRating: 1, elo: -1 };
    return r.sort((a, b) => dir[sort] * ((a[sort] as number) - (b[sort] as number)));
  }, [data, sort]);

  if (loading) return <Loading />;
  if (error || !data) return <Empty msg={error ?? t("common.noData")} />;

  const tabs: [SortKey, string][] = [["strength", t("r.tab.strength")], ["position", t("r.tab.position")], ["attackRating", t("r.tab.attack")], ["defenseRating", t("r.tab.defence")], ["elo", t("r.tab.elo")]];

  return (
    <div className="stack-l">
      <div className="page-head rise">
        <div>
          <div className="eyebrow"><span>{t("r.eyebrow")}</span></div>
          <h1 className="display">{t("r.title")}</h1>
          <p className="lede">{t("r.lede")}</p>
        </div>
        <div className="seg" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={sort === k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
      </div>

      <section className="card table-card rise" style={{ animationDelay: "80ms" }}>
        <div className="trow thead">
          <span>#</span><span>{t("r.col.club")}</span><span className="hide-s">{t("r.col.pld")}</span><span className="hide-s">{t("r.col.gd")}</span><span>{t("r.col.pts")}</span>
          <span>{t("r.col.power")}</span><span className="hide-m">{t("r.col.att")}</span><span className="hide-m">{t("r.col.def")}</span><span className="hide-m">{t("r.col.elo")}</span><span className="hide-s">{t("r.col.form")}</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.team.id} className="trow">
            <span className="mono muted">{sort === "position" ? r.position : i + 1}</span>
            <span className="t-club"><Crest team={r.team} size={26} /><span>{r.team.name}</span></span>
            <span className="mono hide-s">{r.played}</span>
            <span className="mono hide-s">{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</span>
            <span className="mono strong">{r.points}</span>
            <span className="t-power">
              <Tip label={<>{t("r.col.power")} <b>{r.strength}</b></>}>
                <span className="power-track"><span className="power-fill" style={{ width: on ? `${r.strength}%` : 0 }} /></span>
              </Tip>
              <span className="mono">{r.strength}</span>
            </span>
            <span className="mono hide-m">{r.attackRating.toFixed(2)}</span>
            <span className="mono hide-m">{r.defenseRating.toFixed(2)}</span>
            <span className="mono hide-m">{Math.round(r.elo)}</span>
            <span className="hide-s"><FormPills form={r.form.map((f) => ({ result: f }))} /></span>
          </div>
        ))}
      </section>
      <p className="muted small">{t("r.foot")}</p>
    </div>
  );
}
