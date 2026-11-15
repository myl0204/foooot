import { useEffect, useState, type ReactNode } from "react";
import { OUTCOME, pct } from "../api";
import { useI18n } from "../i18n";

/** Animate from 0 after mount so bars and rings "draw in". */
export function useMounted(delay = 60) {
  const [m, setM] = useState(false);
  useEffect(() => { const t = setTimeout(() => setM(true), delay); return () => clearTimeout(t); }, [delay]);
  return m;
}

export function Tip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <span className="tip-wrap" tabIndex={0}>
      {children}
      <span className="tip" role="tooltip">{label}</span>
    </span>
  );
}

/** Three-way stacked outcome bar with 2px gaps; labels in text ink, not series color. */
export function OutcomeBar({ pHome, pDraw, pAway, homeName, awayName, height = 6, labels = false }: {
  pHome: number; pDraw: number; pAway: number; homeName: string; awayName: string; height?: number; labels?: boolean;
}) {
  const on = useMounted();
  const { t } = useI18n();
  const segs = [
    { k: "home" as const, p: pHome, name: t("common.win", { team: homeName }) },
    { k: "draw" as const, p: pDraw, name: t("common.draw") },
    { k: "away" as const, p: pAway, name: t("common.win", { team: awayName }) },
  ];
  return (
    <div className="obar">
      <div className="obar-track" style={{ height }}>
        {segs.map((s) => (
          <span key={s.k} className="tip-wrap obar-seg" tabIndex={0} style={{ width: on ? `${s.p * 100}%` : "0%", background: OUTCOME[s.k], height }}>
            <span className="tip" role="tooltip"><b>{s.name}</b> {pct(s.p, 1)}</span>
          </span>
        ))}
      </div>
      {labels && (
        <div className="obar-labels">
          {segs.map((s) => (
            <span key={s.k} style={{ width: `${s.p * 100}%` }}>
              <i style={{ background: OUTCOME[s.k] }} />{pct(s.p)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Donut of the 1X2 distribution with the pick in the centre. */
export function OutcomeRing({ pHome, pDraw, pAway, center, homeName, awayName }: {
  pHome: number; pDraw: number; pAway: number; center: ReactNode; homeName: string; awayName: string;
}) {
  const on = useMounted(120);
  const { t } = useI18n();
  const R = 84, C = 2 * Math.PI * R, GAP = 4;
  let acc = 0;
  const segs = (["home", "draw", "away"] as const).map((k, i) => {
    const p = [pHome, pDraw, pAway][i];
    const len = Math.max(0, p * C - GAP);
    const seg = { k, p, len, off: acc };
    acc += p * C;
    return seg;
  });
  const names = { home: t("common.win", { team: homeName }), draw: t("common.draw"), away: t("common.win", { team: awayName }) };
  return (
    <div className="ring">
      <svg viewBox="0 0 200 200" role="img" aria-label={`${names.home} ${pct(pHome)}, ${names.draw} ${pct(pDraw)}, ${names.away} ${pct(pAway)}`}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="10" />
        {segs.map((s) => (
          <circle key={s.k} cx="100" cy="100" r={R} fill="none" stroke={OUTCOME[s.k]} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${on ? s.len : 0} ${C}`} strokeDashoffset={-s.off}
            transform="rotate(-90 100 100)" className="ring-seg">
            <title>{`${names[s.k]} ${pct(s.p, 1)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="ring-center">{center}</div>
    </div>
  );
}

/** Scoreline probability heatmap — sequential single hue (gold), magnitude only. */
export function ScoreGrid({ matrix, homeShort, awayShort, size = 6 }: { matrix: number[][]; homeShort: string; awayShort: string; size?: number }) {
  const cells = matrix.slice(0, size).map((r) => r.slice(0, size));
  const max = Math.max(...cells.flat());
  const [hover, setHover] = useState<{ h: number; a: number } | null>(null);
  const { t } = useI18n();
  return (
    <div className="grid-wrap">
      <div className="grid-axis-x">{t("m.goalsAxis", { team: awayShort })}</div>
      <div className="grid-body">
        <div className="grid-axis-y">{t("m.goalsAxis", { team: homeShort })}</div>
        <div className="scoregrid" style={{ gridTemplateColumns: `24px repeat(${size}, 1fr)` }} onMouseLeave={() => setHover(null)}>
          <span />
          {cells[0].map((_, a) => <span key={a} className="sg-head">{a}</span>)}
          {cells.map((row, h) => (
            <Row key={h} h={h} row={row} max={max} hover={hover} setHover={setHover} />
          ))}
        </div>
      </div>
      <div className="grid-caption">
        {hover
          ? <><b className="mono">{homeShort} {hover.h}–{hover.a} {awayShort}</b> · {t("m.cellChance", { p: pct(cells[hover.h][hover.a], 1) })}</>
          : <>{t("m.hoverCell")}</>}
      </div>
    </div>
  );
}

function Row({ h, row, max, hover, setHover }: {
  h: number; row: number[]; max: number; hover: { h: number; a: number } | null; setHover: (v: { h: number; a: number }) => void;
}) {
  return (
    <>
      <span className="sg-head">{h}</span>
      {row.map((p, a) => {
        const t = Math.pow(p / max, 0.75);
        const active = hover && hover.h === h && hover.a === a;
        return (
          <button key={a} className={`sg-cell${active ? " active" : ""}`} onMouseEnter={() => setHover({ h, a })} onFocus={() => setHover({ h, a })}
            aria-label={`${h}-${a}: ${pct(p, 1)}`}
            style={{ background: `color-mix(in oklab, var(--seq-hi) ${Math.round(t * 100)}%, var(--seq-lo))`, color: t > 0.55 ? "#17120a" : "var(--ink-2)" }}>
            {p >= 0.01 ? (p * 100).toFixed(p >= 0.1 ? 0 : 1) : ""}
          </button>
        );
      })}
    </>
  );
}

/** Mirrored comparison row for the tale-of-the-tape. `better` decides which side is highlighted. */
export function DuelRow({ label, home, away, hv, av, better = "high" }: {
  label: string; home: ReactNode; away: ReactNode; hv: number; av: number; better?: "high" | "low";
}) {
  const on = useMounted(200);
  const total = Math.abs(hv) + Math.abs(av) || 1;
  const hs = Math.abs(hv) / total, as = Math.abs(av) / total;
  const homeWins = better === "high" ? hv > av : hv < av;
  const awayWins = better === "high" ? av > hv : av < hv;
  return (
    <div className="duel">
      <div className={`duel-v ${homeWins ? "win" : ""}`}>{home}</div>
      <div className="duel-mid">
        <div className="duel-label">{label}</div>
        <div className="duel-bars">
          <span className="duel-bar left" style={{ width: on ? `${hs * 100}%` : 0, opacity: homeWins ? 1 : 0.35 }} />
          <span className="duel-bar right" style={{ width: on ? `${as * 100}%` : 0, opacity: awayWins ? 1 : 0.35 }} />
        </div>
      </div>
      <div className={`duel-v right ${awayWins ? "win" : ""}`}>{away}</div>
    </div>
  );
}

export function FormPills({ form }: { form: { result: "W" | "D" | "L"; label?: string }[] }) {
  const { t } = useI18n();
  return (
    <span className="form">
      {form.map((f, i) => (
        <Tip key={i} label={f.label ?? t(`form.${f.result}`)}>
          <span className={`pill pill-${f.result}`}>{t(`form.${f.result}`)}</span>
        </Tip>
      ))}
    </span>
  );
}

export function ConfidenceDots({ label }: { label: "Low" | "Medium" | "High" }) {
  const n = label === "High" ? 3 : label === "Medium" ? 2 : 1;
  const { t } = useI18n();
  return (
    <span className="conf" aria-label={t("conf.aria", { label: t(`conf.${label}`) })}>
      {[0, 1, 2].map((i) => <i key={i} className={i < n ? "on" : ""} />)}
      <span>{t(`conf.${label}`)}</span>
    </span>
  );
}
