import type { Dataset, FormEntry, Match, MatchDetail, Prediction, Ratings, Team, TeamProfile } from "../types.ts";
import { computeElo, eloExpectation } from "./elo.ts";
import { expectedGoals, fitRatings, predictFromLambdas } from "./poisson.ts";
import { hashString } from "./random.ts";

export interface StandingRow {
  team: Team;
  position: number;
  played: number; w: number; d: number; l: number;
  gf: number; ga: number; points: number;
  form: ("W" | "D" | "L")[];
  attackRating: number; defenseRating: number; elo: number;
  strength: number; // composite power index 30-100
}

/** Everything the model knew at a point in time. */
interface Snapshot {
  cutoff: string; // ISO; only results strictly before this were used
  season: string; // the season the table and venue records describe
  ratings: Ratings;
  elo: Record<string, number>;
  table: StandingRow[];
  played: Match[]; // finished before cutoff, all seasons, newest first
}

/** Matches in the same season and numbered round are predicted together; cup knockouts one by one. */
const roundKey = (m: Match) => (m.matchday ? `${m.season}|${m.round ?? m.matchday}` : null);

/**
 * The model for one league. Ratings and Elo learn from every loaded season (older
 * results fade with a 120-day half-life); the league table, venue records and
 * matchday grouping are per season.
 */
export class Engine {
  private teams: Map<string, Team>;
  private ids: string[];
  private byId: Map<string, Match>;
  private finishedDesc: Match[];
  private rounds = new Map<string, Match[]>(); // roundKey → finished matches
  private seasonTeams = new Map<string, Set<string>>();
  private snapshots = new Map<string, Snapshot>();
  readonly now: Snapshot;

  constructor(readonly data: Dataset, readonly asOf = new Date()) {
    this.ids = data.teams.map((t) => t.id);
    this.teams = new Map(data.teams.map((t) => [t.id, t]));
    this.byId = new Map(data.matches.map((m) => [m.id, m]));
    this.finishedDesc = data.matches.filter((m) => m.status === "finished").sort((a, b) => b.date.localeCompare(a.date));
    for (const m of data.matches) {
      if (!this.seasonTeams.has(m.season)) this.seasonTeams.set(m.season, new Set());
      this.seasonTeams.get(m.season)!.add(m.homeId).add(m.awayId);
      const k = roundKey(m);
      if (k && m.status === "finished") {
        if (!this.rounds.has(k)) this.rounds.set(k, []);
        this.rounds.get(k)!.push(m);
      }
    }
    this.now = this.snapshot(asOf.toISOString(), data.league.season);
  }

  get ratings() { return this.now.ratings; }
  get elo() { return this.now.elo; }
  get standings() { return this.now.table; }

  team(id: string) { return this.teams.get(id)!; }
  match(id: string) { return this.byId.get(id); }

  /** All finished matches, every season, newest first. */
  finished(): readonly Match[] { return this.finishedDesc; }
  /** Matches not yet played, soonest first; a fixture stuck as "scheduled" long after kickoff is left out. */
  upcoming() {
    const from = this.asOf.getTime() - 3 * 3_600_000;
    return this.data.matches
      .filter((m) => m.status === "scheduled" && Date.parse(m.date) >= from)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  /** Finished matches the current model was fitted on. */
  get trainedOn() { return this.now.played.length; }
  /** Seasons in the data (current plus any history loaded). */
  get seasons() { return this.seasonTeams.size; }

  /**
   * The model's state before a match. Scheduled matches use today's model; finished
   * matches use a walk-forward refit on results from before their matchday began,
   * so a "called / missed" verdict is never computed with hindsight.
   */
  snapshotFor(m: Match): Snapshot {
    if (m.status === "scheduled") {
      return m.season === this.now.season ? this.now : this.snapshot(this.now.cutoff, m.season);
    }
    const k = roundKey(m);
    const sameRound = (k && this.rounds.get(k)) || [m];
    const cutoff = sameRound.reduce((min, x) => (x.date < min ? x.date : min), m.date);
    return this.snapshot(cutoff, m.season);
  }

  predict(m: Match): Prediction {
    const s = this.snapshotFor(m);
    const { lambdaHome, lambdaAway } = expectedGoals(s.ratings, m.homeId, m.awayId);
    return predictFromLambdas(lambdaHome, lambdaAway);
  }

  private snapshot(cutoff: string, season: string): Snapshot {
    const key = `${cutoff}|${season}`;
    const hit = this.snapshots.get(key);
    if (hit) return hit;
    const played = this.finishedDesc.filter((m) => m.date < cutoff);
    const ratings = fitRatings(this.ids, played, new Date(cutoff));
    const elo = computeElo(this.ids, played);
    const table = this.buildTable(season, played.filter((m) => m.season === season), ratings, elo);
    const s: Snapshot = { cutoff, season, ratings, elo, played, table };
    this.snapshots.set(key, s);
    return s;
  }

  private buildTable(season: string, played: Match[], ratings: Ratings, elo: Record<string, number>): StandingRow[] {
    const rows = new Map<string, StandingRow>();
    const inSeason = this.seasonTeams.get(season) ?? new Set(this.ids);
    for (const t of this.data.teams) {
      if (!inSeason.has(t.id)) continue;
      rows.set(t.id, {
        team: t, position: 0, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, points: 0, form: [],
        attackRating: Math.exp(ratings.attack[t.id]),
        defenseRating: Math.exp(ratings.defense[t.id]),
        elo: elo[t.id], strength: 0,
      });
    }
    for (const m of [...played].reverse()) {
      const h = rows.get(m.homeId)!, a = rows.get(m.awayId)!;
      const hg = m.homeGoals!, ag = m.awayGoals!;
      h.played++; a.played++; h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
      if (hg > ag) { h.w++; a.l++; h.points += 3; h.form.unshift("W"); a.form.unshift("L"); }
      else if (hg < ag) { a.w++; h.l++; a.points += 3; h.form.unshift("L"); a.form.unshift("W"); }
      else { h.d++; a.d++; h.points++; a.points++; h.form.unshift("D"); a.form.unshift("D"); }
    }
    const list = [...rows.values()];
    // Power index: expected goal difference vs an average opponent at a neutral venue
    const net = list.map((r) => Math.log(r.attackRating) - Math.log(r.defenseRating));
    const lo = Math.min(...net), hi = Math.max(...net);
    list.forEach((r, i) => {
      r.form = r.form.slice(0, 5);
      r.strength = Math.round(30 + 70 * ((net[i] - lo) / (hi - lo || 1)));
    });
    list.sort((x, y) => y.points - x.points || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.team.name.localeCompare(y.team.name));
    list.forEach((r, i) => (r.position = i + 1));
    return list;
  }

  private profile(s: Snapshot, teamId: string, venue: "H" | "A", kickoff: string): TeamProfile {
    const row = s.table.find((r) => r.team.id === teamId)!;
    const past = s.played.filter((m) => m.homeId === teamId || m.awayId === teamId);
    // Form runs across seasons; the venue record is this season's.
    const form: FormEntry[] = past.slice(0, 5).map((m) => {
      const home = m.homeId === teamId;
      const gf = home ? m.homeGoals! : m.awayGoals!;
      const ga = home ? m.awayGoals! : m.homeGoals!;
      const opp = this.team(home ? m.awayId : m.homeId);
      return {
        result: gf > ga ? "W" : gf === ga ? "D" : "L", gf, ga,
        opponent: opp.short, opponentZh: opp.nameZh, venue: home ? "H" : "A",
      };
    });
    const vr = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    for (const m of past) {
      if (m.season !== s.season) continue;
      const home = m.homeId === teamId;
      if ((venue === "H") !== home) continue;
      const gf = home ? m.homeGoals! : m.awayGoals!, ga = home ? m.awayGoals! : m.homeGoals!;
      vr.gf += gf; vr.ga += ga;
      if (gf > ga) vr.w++; else if (gf === ga) vr.d++; else vr.l++;
    }
    const byAtt = [...s.table].sort((a, b) => b.attackRating - a.attackRating);
    const byDef = [...s.table].sort((a, b) => a.defenseRating - b.defenseRating);
    const last = past[0];
    return {
      team: row.team, position: row.position, played: row.played, points: row.points, gf: row.gf, ga: row.ga,
      form, formPoints: form.reduce((sum, f) => sum + (f.result === "W" ? 3 : f.result === "D" ? 1 : 0), 0),
      venueRecord: vr,
      attackRating: row.attackRating, defenseRating: row.defenseRating,
      attackRank: byAtt.findIndex((r) => r.team.id === teamId) + 1,
      defenseRank: byDef.findIndex((r) => r.team.id === teamId) + 1,
      elo: Math.round(row.elo),
      restDays: last ? Math.round((new Date(kickoff).getTime() - new Date(last.date).getTime()) / 86_400_000) : null,
    };
  }

  detail(matchId: string): MatchDetail | null {
    const match = this.byId.get(matchId);
    if (!match) return null;
    const s = this.snapshotFor(match);
    const prediction = this.predict(match);
    const home = this.profile(s, match.homeId, "H", match.date);
    const away = this.profile(s, match.awayId, "A", match.date);
    const headToHead = s.played.filter(
      (m) => (m.homeId === match.homeId && m.awayId === match.awayId) || (m.homeId === match.awayId && m.awayId === match.homeId),
    ).slice(0, 5);
    const inputsHash = hashString(JSON.stringify([match, home, away, prediction.pHome.toFixed(3), prediction.pAway.toFixed(3)]));
    return {
      match, home, away, prediction, headToHead, inputsHash, trainedOn: s.played.length,
      elo: { home: home.elo, away: away.elo, pHomeWinish: eloExpectation(home.elo, away.elo) },
    };
  }

  /** Score the walk-forward predictions for the last N numbered rounds (crossing into last season if needed). */
  backtest(rounds = 8) {
    const groups = [...this.rounds.values()]
      .map((games) => [...games].sort((a, b) => a.date.localeCompare(b.date)))
      .sort((a, b) => a[0].date.localeCompare(b[0].date))
      .slice(-rounds);
    let n = 0, correct = 0, logLoss = 0, brier = 0;
    const perDay: { season: string; matchday: number; accuracy: number; n: number }[] = [];
    const recent: { matchId: string; home: Team; away: Team; score: string; pick: string; correct: boolean; pHome: number; pDraw: number; pAway: number }[] = [];
    for (const games of groups) {
      if (this.snapshotFor(games[0]).played.length < this.ids.length * 2) continue;
      let dayCorrect = 0;
      for (const m of games) {
        const p = this.predict(m);
        const outcome = m.homeGoals! > m.awayGoals! ? "home" : m.homeGoals === m.awayGoals ? "draw" : "away";
        const probs = { home: p.pHome, draw: p.pDraw, away: p.pAway };
        const ok = p.pick === outcome;
        n++; if (ok) { correct++; dayCorrect++; }
        logLoss += -Math.log(Math.max(1e-9, probs[outcome]));
        brier += (["home", "draw", "away"] as const).reduce((s, k) => s + (probs[k] - (k === outcome ? 1 : 0)) ** 2, 0);
        recent.push({ matchId: m.id, home: this.team(m.homeId), away: this.team(m.awayId), score: `${m.homeGoals}-${m.awayGoals}`, pick: p.pick, correct: ok, pHome: p.pHome, pDraw: p.pDraw, pAway: p.pAway });
      }
      perDay.push({ season: games[0].season, matchday: games[0].matchday, accuracy: dayCorrect / games.length, n: games.length });
    }
    return {
      matches: n,
      accuracy: n ? correct / n : 0,
      logLoss: n ? logLoss / n : 0,
      brier: n ? brier / n : 0,
      baselineLogLoss: Math.log(3), // uniform 1/3-1/3-1/3 guesser
      perDay,
      recent: recent.slice(-24).reverse(),
    };
  }
}
