import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import "./styles.css";
import { providerName, useApi, type Meta } from "./api";
import { I18nProvider, LANGS, useI18n } from "./i18n";
import { Fixtures } from "./pages/Fixtures";
import { MatchPage } from "./pages/Match";
import { Rankings } from "./pages/Rankings";
import { ModelPage } from "./pages/Model";

function ScrollTop() {
  const { pathname } = useLocation();
  // Braces matter: newer browsers return a Promise from scrollTo, and an effect
  // must return nothing or a cleanup function.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return null;
}

/** Keeps one broken page from blanking the whole app; resets when the route changes. */
class PageBoundary extends Component<{ children: ReactNode; message: string; retry: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="loading">
        <span>{this.props.message}</span>
        <button className="btn-gold" onClick={() => this.setState({ error: null })}>{this.props.retry}</button>
      </div>
    );
  }
}

function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang" role="group" aria-label={t("lang.switch")}>
      {LANGS.map((l) => (
        <button key={l.code} className={lang === l.code ? "on" : ""} aria-pressed={lang === l.code} title={l.label}
          lang={l.code === "zh" ? "zh-CN" : "en"} onClick={() => setLang(l.code)}>
          {l.short}
        </button>
      ))}
    </div>
  );
}

function Shell() {
  const meta = useApi<Meta>("/meta").data;
  const { t } = useI18n();
  const { pathname } = useLocation();
  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <header className="nav">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span className="brand-word">Oracle</span>
          <span className="brand-sub">{t("brand.sub")}</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/" end>{t("nav.fixtures")}</NavLink>
          <NavLink to="/rankings">{t("nav.rankings")}</NavLink>
          <NavLink to="/model">{t("nav.model")}</NavLink>
        </nav>
        <div className="nav-meta">
          {meta && (
            <span className={`chip ${meta.dataSource === "demo" ? "chip-demo" : "chip-live"}`}
              title={meta.dataSource === "demo" ? t("chip.demoTitle") : t("chip.liveTitle")}>
              <i />{meta.dataSource === "demo" ? t("chip.demo") : t("chip.live")}
            </span>
          )}
          <LangSwitch />
        </div>
      </header>
      {meta?.warning && <div className="banner">{meta.warning}</div>}
      <main className="page">
        <PageBoundary key={pathname} message={t("common.crashed")} retry={t("common.retry")}>
        <Routes>
          <Route path="/" element={<Fixtures meta={meta} />} />
          <Route path="/match/:id" element={<MatchPage meta={meta} />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/model" element={<ModelPage />} />
        </Routes>
        </PageBoundary>
      </main>
      <footer className="foot">
        <span>{t("foot.tagline")}</span>
        <span className="muted">{t("foot.method", { analysis: meta?.aiEnabled ? t("foot.byClaude", { provider: providerName(meta.aiProvider) }) : t("foot.statistical") })}</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <ScrollTop />
        <Shell />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
