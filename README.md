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
| `API_FOOTBALL_KEY` | Real fixtures and results from [API-Football](https://www.api-football.com) for many leagues (see [Data](#data)). |
| `API_FOOTBALL_LEAGUES` | Comma-separated API-Football league ids. Default: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Championship, Eredivisie, Primeira Liga, Chinese Super League, J1 League, K League 1. |
| `HISTORY_SEASONS` | Previous seasons loaded per league to train the model (default `2`). |
| `API_FOOTBALL_REFRESH_MINUTES` | Minimum gap between re-fetches of a current season while a result is due (default `60`). |
| `FOOTBALL_DATA_API_KEY` / `FOOTBALL_DATA_COMPETITION` | Fallback provider when there is no API-Football key: football-data.org, comma-separated codes (e.g. `PL,SA,BL1`). With neither key the app runs on a **demo league of fictional clubs with simulated results**, flagged in the UI. |

## Deploy (PM2)

On the server (needs Node.js 22+ and git), once:

```bash
npm install -g pm2
git clone https://github.com/myl0204/foooot.git oracle && cd oracle
# put your .env here (copy it from your machine with scp)
npm run app:setup     # install, build, start, remember
pm2 startup           # prints one sudo command — run it so the app survives reboots
```

The app is then on port 8787. Day to day:

| Command | What it does |
|---|---|
| `npm run app:update` | Pull latest code, rebuild, restart |
| `npm run app:stop` / `app:start` / `app:restart` | Stop / start / restart |
| `npm run app:logs` | Follow the logs (Ctrl+C to exit) |
| `npm run app:status` | Is it running? Memory, restarts |

For HTTPS on a domain, put Caddy in front: see `deploy/Caddyfile`.

## Data

Each league loads its current season plus `HISTORY_SEASONS` previous ones. The model learns from all of them
(time-weighted, 120-day half-life), so ratings are meaningful from the first matchday; the league table,
home/away records and the track record's matchday grouping stay per season. The UI shows a competition
switcher when more than one league is loaded.

API-Football responses are cached on disk in `data/cache/`: past seasons are fetched once, the current season
only when a result is due (at most every `API_FOOTBALL_REFRESH_MINUTES`) or every 12 hours. Restarts cost no
quota. On first start the current seasons load first and past seasons follow in the background, so a plan with a
per-minute limit is never a long wait. The free API-Football plan (100 requests/day) does not cover every
season; when the plan refuses one, the warning appears in the banner and that season is not asked for again
that day.

## Architecture

```
server/src
  engine/poisson.ts   Dixon–Coles Poisson model: time-weighted attack/defence fit, scoreline matrix, 1X2/BTTS/O2.5
  engine/elo.ts       Independent Elo ratings (cross-check)
  engine/predict.ts   Engine: standings, team profiles, match detail, walk-forward backtest
  data/               Providers (API-Football, football-data.org, demo league), disk cache, Chinese names
  ai/                 llm.ts: Claude/OpenAI structured output · analysis.ts: match analysis + statistical fallback (cached in data/analysis-cache.json) · translate.ts: Chinese names
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
- Club and competition names: a dictionary of well-known clubs and leagues (`server/src/data/names.ts`), and the configured AI translates any others once, in the background (remembered in `data/names-zh.json`). Without an AI key, clubs outside the dictionary keep their English names.
- Match analysis is requested with `?lang=`. The AI writes in that language using the Chinese club names, and the statistical fallback has templates in both languages. Cached per language.
- Dates use the browser's `Intl` formatting for the active locale; Chinese uses Noto Serif SC / Noto Sans SC.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/meta` | Leagues loaded, data source, whether AI is enabled |
| GET | `/api/fixtures?league=&limit=` | Upcoming fixtures with predictions |
| GET | `/api/results?league=&limit=` | Recent results with the model's pick |
| GET | `/api/standings?league=` | Table + attack/defence/Elo/power index |
| GET | `/api/model?league=` | Walk-forward backtest (accuracy, log-loss, Brier) |
| GET | `/api/matches/:id` | Match context: team profiles, form, H2H, matches the model learnt from |
| POST | `/api/matches/:id/prediction` | Run the model: probabilities, scoreline matrix, Elo (the UI's "Start prediction") |
| POST | `/api/matches/:id/analysis?lang=en\|zh` | AI analysis (or statistical fallback) in the given language |

`league` is a league id from `/api/meta`; omitted or unknown, the first league is used.
