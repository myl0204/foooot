# Oracle — AI football predictions

A full-stack match-prediction app: a statistical engine forecasts every fixture, Claude
writes the analysis that explains the forecast, and a dark, editorial UI presents it.

## Run

```bash
npm install
cp .env.example .env      # optional: add keys (see below)
npm run dev               # API on :8787, web on http://localhost:5173
```

Production: `npm run build && npm start` (serves the built UI and the API on `PORT`, default 8787).
Engine self-test: `npm test`.

| Env var | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | AI analysis by Claude (`claude-opus-5-5`). |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | AI analysis by OpenAI (Responses API with structured outputs; model defaults to `gpt-5.5`). |
| `ANALYSIS_PROVIDER` | `anthropic` or `openai` to force one when both keys are set (default: Anthropic first). With no key, a clearly-labelled statistical summary is shown. |
| `FOOTBALL_DATA_API_KEY` / `FOOTBALL_DATA_COMPETITION` | Real fixtures and results from football-data.org (e.g. `PL`, `PD`, `SA`, `BL1`). Without it the app runs on a **demo league of fictional clubs with simulated results**, flagged in the UI. |

## Architecture

```
server/src
  engine/poisson.ts   Dixon–Coles Poisson model: time-weighted attack/defence fit, scoreline matrix, 1X2/BTTS/O2.5
  engine/elo.ts       Independent Elo ratings (cross-check)
  engine/predict.ts   Engine: standings, team profiles, match detail, walk-forward backtest
  data/               Provider layer: football-data.org, or the deterministic demo league (dates relative to today)
  ai/analysis.ts      Claude structured-output analysis + statistical fallback, cached in data/analysis-cache.json
  index.ts            Express API
web/src               React + Vite UI (Fixtures, Match detail, Power Rankings, Track Record)
```

**Division of labour:** every number (probabilities, xG, confidence) comes from the engine. Claude receives
those numbers plus form, ratings and records, and returns structured JSON (headline, verdict, key
factors, match script, risks, sharpest angle). It is told to use only the supplied data — it has no
knowledge of injuries or lineups — and cannot alter the forecast. Analysis is generated on demand per
match and cached by an inputs hash, so it is only regenerated when the data changes.

The Claude request uses `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): if a safety
classifier declines, the API retries on Anthropic's recommended fallback model inside the same call.

## Languages

English and Simplified Chinese. The **EN / 中** switch in the nav changes the language and remembers the choice in the browser; the first visit follows the browser language, and `?lang=zh` / `?lang=en` in a URL forces one (handy for sharing).

- UI strings live in `web/src/i18n.tsx`: one dictionary per language, and `zh` is typed against the English keys, so a missing translation is a compile error. To add a language, add a dictionary and an entry in `LANGS`.
- Match analysis is requested with `?lang=`. Claude is told to write in that language (keeping club names as-is), and the statistical fallback has templates in both languages. Cached per language.
- Dates use the browser's `Intl` formatting for the active locale; Chinese uses Noto Serif SC / Noto Sans SC.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/meta` | League, data source, whether AI is enabled |
| GET | `/api/fixtures?limit=` | Upcoming fixtures with predictions |
| GET | `/api/results?limit=` | Recent results with the model's pick |
| GET | `/api/standings` | Table + attack/defence/Elo/power index |
| GET | `/api/model` | Walk-forward backtest (accuracy, log-loss, Brier) |
| GET | `/api/matches/:id` | Full prediction, scoreline matrix, team profiles, H2H |
| POST | `/api/matches/:id/analysis?lang=en\|zh` | Claude analysis (or statistical fallback) in the given language |
