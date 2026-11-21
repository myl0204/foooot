import fs from "node:fs";
import path from "node:path";
import type { Dataset, League } from "../types.ts";
import { aiEnabled } from "../ai/llm.ts";
import { translateNames } from "../ai/translate.ts";
import { CLUBS_ZH_BY_AF_ID } from "./clubsZh.ts";

/**
 * Chinese display names for clubs and competitions.
 *   1. API-Football clubs: a reviewed table keyed by club id (clubsZh.ts).
 *   2. A curated dictionary of well-known clubs and leagues by name (any provider, works with no AI key).
 *   3. Everything else is translated once by the configured AI, in the background,
 *      and remembered in data/names-zh.json. Names are set in place on the Team and
 *      League objects, so they appear as soon as a translation lands.
 */

/** Lowercase, no accents or punctuation, without legal-form noise: "1. FC Köln" → "koln". */
export function normName(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ")
    .split(" ").filter((w) => w && !NOISE.has(w)).join(" ");
}
const NOISE = new Set(["fc", "afc", "cf", "cfc", "sc", "ac", "acf", "as", "ss", "ssc", "us", "ca", "cd", "ud", "rcd", "rc", "ogc", "losc", "fk", "club", "de", "calcio", "1"]);

// [Chinese, ...English spellings used by API-Football and football-data.org]
const CLUBS: string[][] = [
  // England
  ["阿森纳", "Arsenal"], ["阿斯顿维拉", "Aston Villa"], ["伯恩茅斯", "Bournemouth"], ["布伦特福德", "Brentford"],
  ["布莱顿", "Brighton", "Brighton Hove", "Brighton & Hove Albion"], ["切尔西", "Chelsea"], ["水晶宫", "Crystal Palace"],
  ["埃弗顿", "Everton"], ["富勒姆", "Fulham"], ["利物浦", "Liverpool"], ["曼城", "Manchester City", "Man City"],
  ["曼联", "Manchester United", "Man United", "Man Utd"], ["纽卡斯尔联", "Newcastle", "Newcastle United"],
  ["诺丁汉森林", "Nottingham Forest", "Nottingham", "Nott'm Forest"], ["热刺", "Tottenham", "Tottenham Hotspur"],
  ["西汉姆联", "West Ham", "West Ham United"], ["狼队", "Wolves", "Wolverhampton", "Wolverhampton Wanderers"],
  ["利兹联", "Leeds", "Leeds United"], ["伯恩利", "Burnley"], ["桑德兰", "Sunderland"], ["莱斯特城", "Leicester", "Leicester City"],
  ["南安普顿", "Southampton"], ["伊普斯维奇", "Ipswich", "Ipswich Town"], ["卢顿", "Luton", "Luton Town"],
  ["谢菲联", "Sheffield Utd", "Sheffield United"], ["考文垂", "Coventry", "Coventry City"], ["赫尔城", "Hull City"],
  ["米德尔斯堡", "Middlesbrough"], ["诺维奇", "Norwich", "Norwich City"], ["西布朗", "West Brom", "West Bromwich Albion"],
  ["沃特福德", "Watford"], ["斯旺西", "Swansea", "Swansea City"], ["斯托克城", "Stoke", "Stoke City"],
  ["布莱克本", "Blackburn", "Blackburn Rovers"], ["女王公园巡游者", "QPR", "Queens Park Rangers"], ["布里斯托尔城", "Bristol City"],
  ["普雷斯顿", "Preston", "Preston North End"], ["德比郡", "Derby", "Derby County"], ["米尔沃尔", "Millwall"],
  ["卡迪夫城", "Cardiff", "Cardiff City"], ["朴茨茅斯", "Portsmouth"], ["雷克瑟姆", "Wrexham"],
  ["普利茅斯", "Plymouth", "Plymouth Argyle"], ["牛津联", "Oxford United"], ["查尔顿", "Charlton", "Charlton Athletic"],
  ["谢周三", "Sheffield Wednesday", "Sheffield Wed"], ["伯明翰", "Birmingham", "Birmingham City"],
  // Spain
  ["皇马", "Real Madrid"], ["巴萨", "Barcelona"], ["马竞", "Atletico Madrid", "Atlético Madrid", "Club Atlético de Madrid"],
  ["毕尔巴鄂竞技", "Athletic Club", "Athletic Bilbao"], ["皇家社会", "Real Sociedad"], ["贝蒂斯", "Real Betis", "Betis"],
  ["比利亚雷亚尔", "Villarreal"], ["瓦伦西亚", "Valencia"], ["塞维利亚", "Sevilla"], ["赫罗纳", "Girona"], ["赫塔费", "Getafe"],
  ["奥萨苏纳", "Osasuna"], ["塞尔塔", "Celta Vigo", "Celta"], ["巴列卡诺", "Rayo Vallecano"], ["马略卡", "Mallorca"],
  ["阿拉维斯", "Alaves", "Deportivo Alavés"], ["西班牙人", "Espanyol"], ["拉斯帕尔马斯", "Las Palmas"], ["莱加内斯", "Leganes"],
  ["巴拉多利德", "Valladolid", "Real Valladolid"], ["埃尔切", "Elche"], ["莱万特", "Levante"], ["奥维耶多", "Oviedo", "Real Oviedo"],
  ["加的斯", "Cadiz"], ["格拉纳达", "Granada"], ["阿尔梅里亚", "Almeria"],
  // Italy
  ["国际米兰", "Inter", "Internazionale", "Inter Milan"], ["AC米兰", "AC Milan", "Milan"], ["尤文图斯", "Juventus"],
  ["那不勒斯", "Napoli"], ["罗马", "Roma", "AS Roma"], ["拉齐奥", "Lazio"], ["亚特兰大", "Atalanta"], ["佛罗伦萨", "Fiorentina"],
  ["博洛尼亚", "Bologna"], ["都灵", "Torino"], ["乌迪内斯", "Udinese"], ["热那亚", "Genoa"], ["莱切", "Lecce"],
  ["卡利亚里", "Cagliari"], ["维罗纳", "Verona", "Hellas Verona"], ["恩波利", "Empoli"], ["帕尔马", "Parma"], ["科莫", "Como", "Como 1907"],
  ["威尼斯", "Venezia"], ["蒙扎", "Monza"], ["萨索洛", "Sassuolo"], ["比萨", "Pisa"], ["克雷莫纳", "Cremonese"],
  ["萨勒尼塔纳", "Salernitana"], ["弗罗西诺内", "Frosinone"],
  // Germany
  ["拜仁", "Bayern Munich", "Bayern München", "FC Bayern München", "Bayern"], ["多特蒙德", "Borussia Dortmund", "Dortmund"],
  ["勒沃库森", "Bayer Leverkusen", "Leverkusen"], ["莱比锡", "RB Leipzig"], ["法兰克福", "Eintracht Frankfurt", "Frankfurt"],
  ["斯图加特", "VfB Stuttgart", "Stuttgart"], ["门兴", "Borussia Mönchengladbach", "M'gladbach", "Mönchengladbach"],
  ["沃尔夫斯堡", "VfL Wolfsburg", "Wolfsburg"], ["弗赖堡", "SC Freiburg", "Freiburg"],
  ["霍芬海姆", "1899 Hoffenheim", "TSG Hoffenheim", "Hoffenheim"], ["美因茨", "FSV Mainz 05", "Mainz", "Mainz 05"],
  ["奥格斯堡", "Augsburg"], ["柏林联合", "Union Berlin"], ["不莱梅", "Werder Bremen", "Bremen"], ["波鸿", "VfL Bochum", "Bochum"],
  ["圣保利", "St. Pauli"], ["海登海姆", "Heidenheim", "1. FC Heidenheim 1846"], ["基尔", "Holstein Kiel"], ["科隆", "Köln"],
  ["汉堡", "Hamburger SV", "Hamburg", "HSV"], ["达姆施塔特", "Darmstadt", "SV Darmstadt 98"], ["柏林赫塔", "Hertha Berlin", "Hertha BSC"],
  ["沙尔克04", "Schalke 04", "Schalke"],
  // France
  ["大巴黎", "Paris Saint Germain", "PSG"], ["马赛", "Marseille", "Olympique Marseille", "Olympique de Marseille"],
  ["里昂", "Lyon", "Olympique Lyonnais"], ["摩纳哥", "Monaco"], ["里尔", "Lille"], ["尼斯", "Nice"], ["朗斯", "Lens"],
  ["雷恩", "Rennes", "Stade Rennais"], ["斯特拉斯堡", "Strasbourg", "Strasbourg Alsace"], ["南特", "Nantes"], ["图卢兹", "Toulouse"],
  ["蒙彼利埃", "Montpellier"], ["兰斯", "Reims", "Stade de Reims"], ["布雷斯特", "Brest", "Stade Brestois 29"], ["勒阿弗尔", "Le Havre"],
  ["欧塞尔", "Auxerre"], ["昂热", "Angers"], ["圣埃蒂安", "Saint Etienne", "St Etienne"], ["洛里昂", "Lorient"], ["梅斯", "Metz"],
  ["巴黎FC", "Paris FC"],
  // Elsewhere in Europe
  ["阿贾克斯", "Ajax"], ["埃因霍温", "PSV Eindhoven", "PSV"], ["费耶诺德", "Feyenoord"], ["阿尔克马尔", "AZ Alkmaar", "AZ"],
  ["特温特", "Twente"], ["本菲卡", "Benfica", "SL Benfica"], ["波尔图", "Porto"], ["葡萄牙体育", "Sporting CP", "Sporting Lisbon"],
  ["布拉加", "Braga", "Sporting Braga"], ["凯尔特人", "Celtic"], ["流浪者", "Rangers"], ["加拉塔萨雷", "Galatasaray"],
  ["费内巴切", "Fenerbahce"], ["萨尔茨堡红牛", "Red Bull Salzburg", "Salzburg"], ["布鲁日", "Club Brugge", "Club Brugge KV"],
  ["奥林匹亚科斯", "Olympiacos", "Olympiakos Piraeus"], ["顿涅茨克矿工", "Shakhtar Donetsk"], ["贝尔格莱德红星", "Crvena Zvezda", "Red Star Belgrade"],
  // China
  ["上海海港", "Shanghai Port", "Shanghai SIPG"], ["上海申花", "Shanghai Shenhua"], ["北京国安", "Beijing Guoan"],
  ["山东泰山", "Shandong Taishan", "Shandong Luneng"], ["成都蓉城", "Chengdu Rongcheng"], ["天津津门虎", "Tianjin Jinmen Tiger"],
  ["浙江队", "Zhejiang", "Zhejiang Professional"], ["武汉三镇", "Wuhan Three Towns"], ["河南队", "Henan", "Henan Songshan Longmen"],
  ["青岛海牛", "Qingdao Hainiu"], ["长春亚泰", "Changchun Yatai"], ["梅州客家", "Meizhou Hakka"], ["深圳新鹏城", "Shenzhen Peng City"],
  ["青岛西海岸", "Qingdao West Coast"], ["大连英博", "Dalian Yingbo"], ["云南玉昆", "Yunnan Yukun"], ["沧州雄狮", "Cangzhou Mighty Lions"],
];
const CLUB_ZH = new Map(CLUBS.flatMap(([zh, ...en]) => en.map((e) => [normName(e), zh] as const)));

// [Chinese, country, ...names]; country "" matches any (international competitions)
const LEAGUES: string[][] = [
  ["英超", "England", "Premier League"], ["英冠", "England", "Championship"], ["英甲", "England", "League One"],
  ["西甲", "Spain", "La Liga", "Primera Division", "LaLiga"], ["意甲", "Italy", "Serie A"], ["德甲", "Germany", "Bundesliga"],
  ["法甲", "France", "Ligue 1"], ["荷甲", "Netherlands", "Eredivisie"], ["葡超", "Portugal", "Primeira Liga", "Liga Portugal"],
  ["巴甲", "Brazil", "Serie A", "Campeonato Brasileiro Série A"], ["中超", "China", "Super League", "Chinese Super League"],
  ["日职联", "Japan", "J1 League"], ["韩K联", "South-Korea", "K League 1"], ["韩K联", "South Korea", "K League 1"],
  ["美职联", "USA", "Major League Soccer", "MLS"], ["沙特联", "Saudi-Arabia", "Pro League"], ["沙特联", "Saudi Arabia", "Pro League"],
  ["土超", "Turkey", "Süper Lig"], ["苏超", "Scotland", "Premiership"], ["比甲", "Belgium", "Jupiler Pro League"],
  ["阿甲", "Argentina", "Liga Profesional Argentina"], ["墨超", "Mexico", "Liga MX"], ["澳超", "Australia", "A-League"],
  ["欧冠", "", "UEFA Champions League"], ["欧联杯", "", "UEFA Europa League"], ["欧协联", "", "UEFA Europa Conference League", "UEFA Conference League"],
  ["世界杯", "", "World Cup", "FIFA World Cup"], ["欧洲杯", "", "European Championship", "Euro Championship"],
];
const LEAGUE_ZH = new Map(LEAGUES.flatMap(([zh, country, ...names]) => names.map((n) => [`${normName(country)}|${normName(n)}`, zh] as const)));

const FILE = path.resolve("data/names-zh.json");
let learned: Record<string, string> = {};
try { learned = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* none yet */ }

const clubKey = (name: string) => `club:${name}`;
const leagueKey = (l: League) => `league:${l.name}|${l.country ?? ""}`;
const clubZh = (name: string) => CLUB_ZH.get(normName(name)) ?? learned[clubKey(name)];
const leagueZh = (l: League) =>
  LEAGUE_ZH.get(`${normName(l.country ?? "")}|${normName(l.name)}`) ?? LEAGUE_ZH.get(`|${normName(l.name)}`) ?? learned[leagueKey(l)];

let latest: Dataset[] = [];
let running = false;
let retryAfter = 0;
const unanswered = new Set<string>(); // the AI gave no usable name; don't ask again this run

export function applyChineseNames(datasets: Dataset[]) {
  latest = datasets;
  assign();
  translateMissing();
}

function assign() {
  for (const d of latest) {
    d.league.nameZh ??= leagueZh(d.league);
    for (const t of d.teams) t.nameZh ??= (d.source === "api-football" ? CLUBS_ZH_BY_AF_ID[t.id] : undefined) ?? clubZh(t.name);
  }
}

function translateMissing() {
  if (running || !aiEnabled() || Date.now() < retryAfter) return;
  const todo = new Map<string, { name: string; context: string }>();
  for (const d of latest) {
    const where = d.league.country ? `${d.league.name}, ${d.league.country}` : d.league.name;
    if (!d.league.nameZh && !unanswered.has(leagueKey(d.league))) {
      todo.set(leagueKey(d.league), { name: d.league.name, context: `football competition (${d.league.country ?? "international"})` });
    }
    for (const t of d.teams) {
      if (!t.nameZh && !unanswered.has(clubKey(t.name))) todo.set(clubKey(t.name), { name: t.name, context: `football club, ${where}` });
    }
  }
  if (!todo.size) return;
  running = true;
  console.log(`[names] translating ${todo.size} names to Chinese…`);
  translateNames([...todo.values()])
    .then((zh) => {
      for (const [key, item] of todo) {
        const name = zh.get(item.name);
        if (name) learned[key] = name;
        else unanswered.add(key);
      }
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(learned, null, 1));
      assign();
      console.log(`[names] ${zh.size} Chinese names learned`);
    })
    .catch((err) => {
      retryAfter = Date.now() + 3_600_000;
      console.error("[names] translation failed, retrying in an hour:", (err as Error).message);
    })
    .finally(() => {
      running = false;
      translateMissing(); // datasets loaded meanwhile (e.g. past seasons) may have new clubs
    });
}
