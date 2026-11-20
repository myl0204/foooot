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

/** Horizontal competition switcher; hidden when there is only one league. */
export function LeagueBar() {
  const { leagues, league, setLeague } = useLeague();
  const { t } = useI18n();
  const names = useNames();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => { active.current?.scrollIntoView({ block: "nearest", inline: "center" }); }, [league?.id]);
  if (leagues.length < 2) return null;
  return (
    <div className="leagues-wrap">
      <nav className="leagues" aria-label={t("nav.leagues")}>
        {leagues.map((l) => {
          const on = l.id === league?.id;
          return (
            <button key={l.id} ref={on ? active : undefined} className={on ? "on" : ""} aria-pressed={on} title={`${l.name} · ${l.seasonLabel}`}
              onClick={() => { setLeague(l.id); if (pathname.startsWith("/match/")) navigate("/"); }}>
              {l.logo && <span className="league-logo"><img src={l.logo} alt="" loading="lazy" /></span>}
              {names.league(l)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
