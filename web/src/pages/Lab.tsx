import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { pct, type Detail, type Evidence, type PredictionResult, type Standing } from "../api";
import type { OracleFx } from "../fx/oracle";
import { useI18n, useNames, type TKey } from "../i18n";

/**
 * The run's read-out, in the middle of the match hero: live counters, the data
 * feed, the ratings board, the simulation grid and chart (drawn by the canvas
 * layer into [data-fx=grid] / [data-fx=chart]), a running log, and progress.
 *
 *   step 0  data     hundreds of real results scroll past, totals count up
 *   step 1  model    every club's attack / defence settles into place
 *   step 2  simulate Monte Carlo grid + convergence chart; the analysis is written
 *   step 3  lock     the canvas collapses and detonates
 */
export function Lab({ fx, step, d, evidence, board, result, provider, aiDone, aiFailed, stepLabel }: {
  fx: OracleFx | null; step: number; d: Detail; evidence?: Evidence; board?: Standing[];
  result: PredictionResult | null; provider: string | null; aiDone: boolean; aiFailed: boolean; stepLabel: string;
}) {
  const { t, locale } = useI18n();
  const names = useNames();
  const hs = names.short(d.home.team), as = names.short(d.away.team);
  const p = result?.prediction;
  const log = useRunLog(step, { d, evidence, board, result, provider, aiDone, aiFailed, hs, as });

  // Live values from the simulation, written straight to the DOM (~20 updates a second).
  const sims = useRef<HTMLSpanElement>(null);
  const top = useRef<HTMLSpanElement>(null);
  const margin = useRef<HTMLSpanElement>(null);
  useEffect(() => fx?.onStats((s) => {
    if (sims.current) sims.current.textContent = s.sims.toLocaleString(locale);
    if (top.current && s.top) top.current.textContent = `${s.top.h}–${s.top.a}`;
    if (margin.current) margin.current.textContent = `±${(s.err * 100).toFixed(2)}%`;
  }), [fx, locale, step]);

  const clubs = evidence?.clubs ?? board?.length ?? 20;
  const kpis: [ReactNode, TKey][] =
    step === 0 ? [
      [<CountUp key="m" to={evidence?.matches ?? d.trainedOn} />, "lab.k.matches"],
      [<CountUp key="g" to={evidence?.goals ?? 0} />, "lab.k.goals"],
      [<CountUp key="s" to={evidence?.seasons ?? 1} ms={600} />, "lab.k.seasons"],
      [<CountUp key="c" to={clubs} ms={800} />, "lab.k.clubs"],
    ] : step === 1 ? [
      [<CountUp key="r" to={board?.length ?? clubs} ms={500} />, "lab.k.rated"],
      [<CountUp key="p" to={2 * clubs + 2} ms={700} />, "lab.k.params"],
      [<CountUp key="i" to={60} ms={1400} />, "lab.k.iters"],
      [<span key="e">{signed(Math.round(d.home.elo - d.away.elo))}</span>, "lab.k.eloGap"],
    ] : [
      [<span key="n" ref={sims}>{fx ? "0" : "—"}</span>, "lab.k.sims"],
      [<span key="x" className="lock-in">{p ? `${p.lambdaHome.toFixed(2)}–${p.lambdaAway.toFixed(2)}` : "—"}</span>, "lab.k.xg"],
      [<span key="t" ref={top}>{p && !fx ? `${p.topScores[0].home}–${p.topScores[0].away}` : "—"}</span>, "lab.k.top"],
      [<span key="e" ref={margin}>—</span>, "lab.k.margin"],
    ];

  return (
    <div className="lab" data-fx="panel" role="status" aria-label={t("m.calcAria")}>
      <div className="lab-head">
        <span className="lab-live"><i />{t("lab.engine")}</span>
        <Clock />
      </div>

      <div className="lab-kpis" key={`k${Math.min(step, 2)}`}>
        {kpis.map(([v, k], i) => (
          <div key={k} className="kpi" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="kpi-v mono">{v}</span>
            <span className="kpi-k">{t(k)}</span>
          </div>
        ))}
      </div>

      <div className="lab-main" data-fx="core">
        {step === 0 && (evidence ? <Feed ev={evidence} homeId={d.match.homeId} awayId={d.match.awayId} /> : <div className="lab-wait"><span className="spinner" /></div>)}
        {step === 1 && <Board rows={board} homeId={d.match.homeId} awayId={d.match.awayId} />}
        {step >= 2 && (fx ? (
          <div className="lab-sim">
            <div className="lab-grid" data-fx="grid" />
            <div className="lab-chart-wrap">
              <div className="lab-chart" data-fx="chart" />
              <div className="lab-legend">
                <span><i style={{ background: "var(--c-home)" }} />{t("common.win", { team: hs })}</span>
                <span><i style={{ background: "var(--c-draw)" }} />{t("common.draw")}</span>
                <span><i style={{ background: "var(--c-away)" }} />{t("common.win", { team: as })}</span>
              </div>
            </div>
          </div>
        ) : p && (
          <div className="lab-static mono">
            <span>{hs} {pct(p.pHome, 1)}</span><span>{t("common.draw")} {pct(p.pDraw, 1)}</span><span>{as} {pct(p.pAway, 1)}</span>
          </div>
        ))}
      </div>

      <ol className="lab-log mono" aria-hidden="true">
        {log.slice(-3).map((l, i, all) => (
          <li key={l.id} className={i === all.length - 1 ? "new" : ""}>
            <span className="lab-ts">{(l.at / 1000).toFixed(2).padStart(5, "0")}</span>
            {t(l.key, l.params)}
          </li>
        ))}
      </ol>

      <div className="sim-prog">
        <div className="sim-segs">
          {[0, 1, 2].map((i) => <span key={i} className={i < step ? "done" : i === step ? "on" : ""}><i /></span>)}
        </div>
        <span key={step} className="sim-step">{stepLabel}</span>
      </div>
    </div>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function CountUp({ to, ms = 1200 }: { to: number; ms?: number }) {
  const { locale } = useI18n();
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{n.toLocaleString(locale)}</>;
}

/** Elapsed run time, mm:ss.cc. */
function Clock() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      if (ref.current) ref.current.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span className="lab-clock mono" ref={ref}>00:00.00</span>;
}

const ROW = 21, VISIBLE = 9, HALF_LIFE_DAYS = 120;

/** The results the model learned from, rolling past oldest → newest; the bar is each result's recency weight. */
function Feed({ ev, homeId, awayId }: { ev: Evidence; homeId: string; awayId: string }) {
  const names = useNames();
  const { t } = useI18n();
  const rows = useMemo(() => [...ev.rows].reverse(), [ev]);
  const now = Date.now();
  const dist = Math.max(0, rows.length - VISIBLE) * ROW;
  return (
    <div className="feed">
      <div className="lab-cap">{t("lab.feed")}</div>
      <div className="feed-win" style={{ height: VISIBLE * ROW }}>
        <div className="feed-roll" style={{ "--dist": `-${dist}px` } as React.CSSProperties}>
          {rows.map(([date, h, a, hg, ag], i) => {
            const side = h === homeId || a === homeId ? " home" : h === awayId || a === awayId ? " away" : "";
            const w = Math.pow(0.5, Math.max(0, (now - Date.parse(date)) / 86_400_000) / HALF_LIFE_DAYS);
            return (
              <div key={i} className={`feed-row${side}`} style={{ height: ROW }}>
                <span className="mono feed-d">{date}</span>
                <span className="feed-h">{names.short(ev.teams[h])}</span>
                <span className="mono feed-s">{hg}–{ag}</span>
                <span className="feed-a">{names.short(ev.teams[a])}</span>
                <span className="feed-w"><i style={{ width: `${Math.max(3, w * 100)}%` }} /></span>
                <span className="mono feed-wv">{w.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Every club's attack and defence, scrambling and then settling row by row. */
function Board({ rows, homeId, awayId }: { rows?: Standing[]; homeId: string; awayId: string }) {
  const names = useNames();
  const { t } = useI18n();
  const [frame, setFrame] = useState(0);
  const list = rows ?? [];
  const settled = Math.floor(Math.max(0, frame * 50 - 150) / 40);
  useEffect(() => {
    if (settled > list.length) return;
    const id = setTimeout(() => setFrame((f) => f + 1), 50);
    return () => clearTimeout(id);
  }, [frame, settled, list.length]);
  const noise = () => (0.5 + Math.random() * 1.4).toFixed(2);
  return (
    <div className="board">
      <div className="lab-cap">{t("lab.board")}</div>
      <div className="board-grid" style={{ gridTemplateRows: `repeat(${Math.ceil(list.length / 2)}, 16px)` }}>
        {list.map((r, i) => {
          const done = i < settled;
          const side = r.team.id === homeId ? " home" : r.team.id === awayId ? " away" : "";
          return (
            <div key={r.team.id} className={`board-row${side}${done ? " done" : ""}`}>
              <span className="board-t">{names.short(r.team)}</span>
              <span className="board-bar att"><i style={{ width: done ? `${Math.min(100, (r.attackRating / 2) * 100)}%` : "0%" }} /></span>
              <span className="mono board-v">{done ? r.attackRating.toFixed(2) : noise()}</span>
              <span className="board-bar def"><i style={{ width: done ? `${Math.min(100, (r.defenseRating / 2) * 100)}%` : "0%" }} /></span>
              <span className="mono board-v">{done ? r.defenseRating.toFixed(2) : noise()}</span>
            </div>
          );
        })}
      </div>
      <div className="board-key"><span><i className="att" />{t("lab.att")}</span><span><i className="def" />{t("lab.def")}</span></div>
    </div>
  );
}

interface LogLine { id: number; at: number; key: TKey; params?: Record<string, string | number> }

/** The run's log: a few lines per step, timed from the click. */
function useRunLog(step: number, x: {
  d: Detail; evidence?: Evidence; board?: Standing[]; result: PredictionResult | null;
  provider: string | null; aiDone: boolean; aiFailed: boolean; hs: string; as: string;
}) {
  const { locale } = useI18n();
  const [lines, setLines] = useState<LogLine[]>([]);
  const t0 = useRef(performance.now());
  const stepAt = useRef(performance.now());
  const logged = useRef(-1); // the step whose opening line is out (effects can run twice in dev)
  const reported = useRef(false); // "analysis received" is out
  const seq = useRef(0);
  const ctx = useRef(x);
  ctx.current = x;

  const push = (key: TKey, params?: LogLine["params"]) =>
    setLines((ls) => [...ls, { id: seq.current++, at: performance.now() - t0.current, key, params }]);

  useEffect(() => {
    const first = logged.current !== step;
    logged.current = step;
    if (first) stepAt.current = performance.now();
    const once = (key: TKey, params?: LogLine["params"]) => { if (first) push(key, params); };
    const c = ctx.current;
    const later = (ms: number, f: () => void) => setTimeout(f, ms);
    const n = (v: number) => v.toLocaleString(locale);
    const clubs = c.evidence?.clubs ?? c.board?.length ?? 20;
    let timers: ReturnType<typeof setTimeout>[] = [];
    if (step === 0) {
      once("lab.log.load", { n: n(c.evidence?.matches ?? c.d.trainedOn), s: c.evidence?.seasons ?? 1 });
      timers = [later(750, () => push("lab.log.weight", { d: HALF_LIFE_DAYS }))];
    } else if (step === 1) {
      once("lab.log.fit", { p: 2 * clubs + 2, c: clubs });
      timers = [later(750, () => push("lab.log.elo", { h: c.hs, he: Math.round(c.d.home.elo), a: c.as, ae: Math.round(c.d.away.elo) }))];
    } else if (step === 2) {
      const p = c.result?.prediction;
      if (p) once("lab.log.xg", { xg: `${p.lambdaHome.toFixed(2)}–${p.lambdaAway.toFixed(2)}` });
      timers = [
        later(350, () => push("lab.log.sim")),
        later(1100, () => { if (!ctx.current.aiDone) push(c.provider ? "lab.log.ai" : "lab.log.stat", { provider: c.provider ?? "" }); }),
      ];
    } else if (step === 3) {
      if (first && !reported.current && c.aiDone) {
        reported.current = true;
        push(c.aiFailed ? "lab.log.aiFail" : "lab.log.aiDone");
      }
      once("lab.log.lock");
    }
    return () => timers.forEach(clearTimeout);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Analysis received" waits until the simulation lines are out, however early the analysis lands.
  useEffect(() => {
    if (!x.aiDone || reported.current || step < 2) return;
    const wait = step === 2 ? Math.max(0, stepAt.current + 1900 - performance.now()) : 0;
    const id = setTimeout(() => {
      reported.current = true;
      push(x.aiFailed ? "lab.log.aiFail" : "lab.log.aiDone");
    }, wait);
    return () => clearTimeout(id);
  }, [x.aiDone, x.aiFailed, step]); // eslint-disable-line react-hooks/exhaustive-deps

  return lines;
}
