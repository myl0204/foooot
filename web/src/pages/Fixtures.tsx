import { Link } from "react-router-dom";
import { kickoff, longDate, pct, useApi, type ModelInfo, type Summary } from "../api";
import { Crest } from "../components/Crest";
import { ConfidenceDots, OutcomeBar } from "../components/Charts";
import { useI18n, useNames, useRoundLabel } from "../i18n";
import { useLeague } from "../league";

export function Fixtures() {
  const { t, locale } = useI18n();
  const names = useNames();
  const roundLabel = useRoundLabel();
  const { league } = useLeague();
  const q = league ? `league=${encodeURIComponent(league.id)}` : null;
  const fx = useApi<Summary[]>(q && `/fixtures?${q}&limit=24`);
  const results = useApi<Summary[]>(q && `/results?${q}&limit=8`);
  const model = useApi<ModelInfo>(q && `/model?${q}`);

  if (fx.loading) return <Loading />;
  if (fx.error || !fx.data) return <Empty msg={fx.error ?? t("common.noFixtures")} />;

  const list = fx.data;
  const bt = model.data?.backtest;
  const stats = bt && league && (
    <section className="stats rise" style={{ animationDelay: "80ms" }}>
      <Stat value={pct(bt.accuracy)} label={t("stat.accuracy")} note={t("stat.accuracyNote", { n: bt.matches })} />
      <Stat value={bt.logLoss.toFixed(3)} label={t("stat.logloss")} note={t("stat.loglossNote", { b: bt.baselineLogLoss.toFixed(3) })} />
      <Stat value={`${((1 - bt.logLoss / bt.baselineLogLoss) * 100).toFixed(1)}%`} label={t("stat.skill")} note={t("stat.skillNote")} />
      <Stat value={league.played.toLocaleString(locale)} label={t("stat.modelled")} note={t("stat.modelledNote", { n: league.teams, s: league.seasons })} />
    </section>
  );
  const latest = results.data && results.data.length > 0 && (
    <section className="rise" style={{ animationDelay: "260ms" }}>
      <div className="section-head">
        <h3>{t("fx.latest")}</h3>
        <span className="muted">{t("fx.latestSub")}</span>
      </div>
      <div className="results">
        {results.data.map((m) => <ResultRow key={m.id} m={m} />)}
      </div>
    </section>
  );

  // Between seasons (or before the next round is scheduled) there is nothing to feature.
  if (!list.length) {
    return (
      <div className="stack-xl">
        <div className="loading short">{t("fx.noFixtures", { league: league ? names.league(league) : "" })}</div>
        {stats}
        {latest}
      </div>
    );
  }

  const nextRound = list.filter((m) => roundKey(m) === roundKey(list[0]));
  const featured = [...nextRound].sort((a, b) => interest(b) - interest(a))[0];
  const rounds = groupBy(list.filter((m) => m.id !== featured.id), roundKey).slice(0, 2);
  const fp = featured.prediction;

  return (
    <div className="stack-xl">
      <section className="hero rise">
        <div className="hero-pitch" aria-hidden="true" />
        <div className="eyebrow">
          <span>{league ? names.league(league) : ""}</span><span className="dot" />
          <span>{roundLabel(featured)}</span><span className="dot" />
          <span>{t("fx.featured")}</span>
        </div>

        <div className="hero-duel">
          <div className="hero-team">
            <Crest team={featured.home} size={96} />
            <h2>{names.team(featured.home)}</h2>
            <span className="muted">{t("common.home")}</span>
          </div>
          <div className="hero-core">
            <div className="hero-kick mono">{kickoff(featured.date, locale)}</div>
            <div className="hero-probs">
              <Prob label={t("common.home")} p={fp.pHome} k="home" big={fp.pick === "home"} />
              <Prob label={t("common.draw")} p={fp.pDraw} k="draw" big={fp.pick === "draw"} />
              <Prob label={t("common.away")} p={fp.pAway} k="away" big={fp.pick === "away"} />
            </div>
            <OutcomeBar {...fp} homeName={names.short(featured.home)} awayName={names.short(featured.away)} height={8} />
            <div className="hero-xg mono">
              xG <b>{fp.lambdaHome.toFixed(2)}</b> — <b>{fp.lambdaAway.toFixed(2)}</b>
              <span className="sep" /> {t("fx.likeliest")} {fp.topScore.home}–{fp.topScore.away}
            </div>
            <Link to={`/match/${featured.id}`} className="btn-gold">{t("fx.predict")} <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero-team">
            <Crest team={featured.away} size={96} />
            <h2>{names.team(featured.away)}</h2>
            <span className="muted">{t("common.away")}</span>
          </div>
        </div>
      </section>

      {stats}

      {rounds.map(([key, games], i) => (
        <section key={key} className="rise" style={{ animationDelay: `${140 + i * 60}ms` }}>
          <div className="section-head">
            <h3>{roundLabel(games[0])}</h3>
            <span className="muted">{t("fx.fixtures", { n: games.length })} · {longDate(games[0].date, locale)}</span>
          </div>
          <div className="fx-grid">
            {games.map((m) => <FixtureCard key={m.id} m={m} />)}
          </div>
        </section>
      ))}

      {latest}
    </div>
  );
}

function FixtureCard({ m }: { m: Summary }) {
  const { t, locale } = useI18n();
  const names = useNames();
  const p = m.prediction;
  const pickName = p.pick === "home" ? names.team(m.home) : p.pick === "away" ? names.team(m.away) : t("common.draw");
  return (
    <Link to={`/match/${m.id}`} className="card fx">
      <div className="fx-top">
        <span className="mono muted">{kickoff(m.date, locale)}</span>
        <ConfidenceDots label={p.confidenceLabel} />
      </div>
      <div className="fx-teams">
        <TeamLine team={m.home} p={p.pHome} lead={p.pick === "home"} />
        <TeamLine team={m.away} p={p.pAway} lead={p.pick === "away"} />
      </div>
      <OutcomeBar {...p} homeName={names.short(m.home)} awayName={names.short(m.away)} />
      <div className="fx-foot">
        <span>{t("fx.pick")} <b>{pickName}</b></span>
        <span className="mono muted">{t("common.draw")} {pct(p.pDraw)} · {p.topScore.home}–{p.topScore.away}</span>
      </div>
    </Link>
  );
}

function TeamLine({ team, p, lead }: { team: Summary["home"]; p: number; lead: boolean }) {
  const names = useNames();
  return (
    <div className={`fx-team ${lead ? "lead" : ""}`}>
      <Crest team={team} size={28} />
      <span className="fx-name">{names.team(team)}</span>
      <span className="fx-p mono">{pct(p)}</span>
    </div>
  );
}

function ResultRow({ m }: { m: Summary }) {
  const { t } = useI18n();
  const names = useNames();
  const actual = m.homeGoals! > m.awayGoals! ? "home" : m.homeGoals === m.awayGoals ? "draw" : "away";
  const hit = actual === m.prediction.pick;
  return (
    <Link to={`/match/${m.id}`} className="result">
      <span className="r-team right">{names.team(m.home)}<Crest team={m.home} size={22} /></span>
      <span className="r-score mono">{m.homeGoals}<i>–</i>{m.awayGoals}</span>
      <span className="r-team"><Crest team={m.away} size={22} />{names.team(m.away)}</span>
      <span className={`r-verdict ${hit ? "hit" : "miss"}`}>{hit ? t("fx.called") : t("fx.missed")}</span>
    </Link>
  );
}

function Prob({ label, p, k, big }: { label: string; p: number; k: "home" | "draw" | "away"; big: boolean }) {
  return (
    <div className={`hp ${big ? "hp-big" : ""}`}>
      <span className="hp-v">{(p * 100).toFixed(0)}<small>%</small></span>
      <span className="hp-l"><i style={{ background: `var(--c-${k})` }} />{label}</span>
    </div>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="stat">
      <div className="stat-v">{value}</div>
      <div className="stat-l">{label}</div>
      <div className="stat-n">{note}</div>
    </div>
  );
}

const interest = (s: Summary) => (1 - Math.abs(s.prediction.pHome - s.prediction.pAway)) * (s.prediction.lambdaHome + s.prediction.lambdaAway);

const roundKey = (m: Summary) => `${m.matchday}|${m.round ?? ""}`;

function groupBy<T>(xs: T[], key: (x: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of xs) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k)!.push(x); }
  return [...m.entries()];
}

export function Loading() {
  const { t } = useI18n();
  return <div className="loading"><span className="spinner" />{t("common.loading")}</div>;
}
export function Empty({ msg }: { msg: string }) {
  return <div className="loading">{msg}</div>;
}
