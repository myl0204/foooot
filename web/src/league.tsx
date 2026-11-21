import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { LeagueInfo } from "./api";
import { useI18n, useNames } from "./i18n";

const STORAGE_KEY = "oracle.league";

interface Ctx {
  league?: LeagueInfo; // undefined until /api/meta has loaded
  leagues: LeagueInfo[];
  setLeague: (id: string) => void;
}
const LeagueContext = createContext<Ctx>({ leagues: [], setLeague: () => {} });

/** `?league=` in the URL wins (shareable links), then the last choice. */
function initial(): string | null {
  const fromUrl = new URLSearchParams(location.search).get("league");
  if (fromUrl) return fromUrl;
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function LeagueProvider({ leagues, children }: { leagues: LeagueInfo[]; children: ReactNode }) {
  const [id, setId] = useState<string | null>(initial);
  const setLeague = useCallback((next: string) => {
    setId(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked */ }
  }, []);
  // An id from another data source (or a removed league) falls back to the first league.
  const league = leagues.find((l) => l.id === id) ?? leagues[0];
  const value = useMemo(() => ({ league, leagues, setLeague }), [league, leagues, setLeague]);
  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export const useLeague = () => useContext(LeagueContext);

type Region = "intl" | "europe" | "americas" | "asia" | "other";
const REGIONS: Region[] = ["intl", "europe", "americas", "asia", "other"];
const COUNTRIES: [Region, string][] = [
  ["intl", "World Europe International"],
  ["europe", "England Spain Italy Germany France Netherlands Portugal Belgium Turkey Scotland Austria Switzerland Denmark Sweden Norway Greece Poland Czech-Republic Croatia Serbia Ukraine Russia Wales Ireland Northern-Ireland Romania Hungary Bulgaria Cyprus Israel Slovakia Slovenia Finland Iceland"],
  ["americas", "Brazil Argentina USA Mexico Colombia Chile Uruguay Peru Ecuador Paraguay Bolivia Venezuela Canada Costa-Rica"],
  ["asia", "China Japan South-Korea Saudi-Arabia Australia Qatar United-Arab-Emirates Iran Thailand India Uzbekistan Vietnam"],
];
const REGION_OF = new Map(COUNTRIES.flatMap(([r, list]) => list.split(" ").map((c) => [c.toLowerCase(), r] as const)));
const regionOf = (l: LeagueInfo): Region => REGION_OF.get((l.country ?? "World").replace(/\s+/g, "-").toLowerCase()) ?? "other";

/** Leagues shown as one-click pills; the rest are one tap away in the "all competitions" panel. */
const PINNED = 8;

/** Competition switcher; hidden when there is only one league. */
export function LeagueBar() {
  const { leagues, league, setLeague } = useLeague();
  const { t } = useI18n();
  const names = useNames();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { active.current?.scrollIntoView({ block: "nearest", inline: "center" }); }, [league?.id]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (leagues.length < 2) return null;

  const pick = (id: string) => { setLeague(id); setOpen(false); if (pathname.startsWith("/match/")) navigate("/"); };
  const many = leagues.length > PINNED + 2;
  const pills = many ? leagues.slice(0, PINNED) : leagues;
  if (many && league && !pills.includes(league)) pills.push(league);
  const pill = (l: LeagueInfo, withRef = true) => {
    const on = l.id === league?.id;
    return (
      <button key={l.id} ref={on && withRef ? active : undefined} className={on ? "on" : ""} aria-pressed={on} title={`${l.name} · ${l.seasonLabel}`} onClick={() => pick(l.id)}>
        {l.logo && <span className="league-logo"><img src={l.logo} alt="" loading="lazy" /></span>}
        {names.league(l)}
      </button>
    );
  };
  const groups = REGIONS.map((r) => [r, leagues.filter((l) => regionOf(l) === r)] as const).filter(([, ls]) => ls.length);

  return (
    <div className="leagues-wrap" ref={wrap}>
      <div className="leagues-row">
        <nav className="leagues" aria-label={t("nav.leagues")}>{pills.map((l) => pill(l))}</nav>
        {many && (
          <button className={`leagues-all${open ? " open" : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
            {t("lg.all", { n: leagues.length })}
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>
      {open && (
        <div className="league-panel" role="dialog" aria-label={t("nav.leagues")}>
          {groups.map(([r, ls]) => (
            <section key={r}>
              <h4>{t(`lg.region.${r}`)}</h4>
              <div className="leagues league-grid">{ls.map((l) => pill(l, false))}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
