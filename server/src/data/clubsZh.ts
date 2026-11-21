/**
 * Chinese club names keyed by API-Football team id, in the form Chinese media and fans use
 * (e.g. 曼联, 皇马, 拜仁; mainland transliterations elsewhere). Checked against Chinese Wikipedia
 * (zh-cn titles). Ids are stable across seasons and competitions, so a club reads the same in its
 * league and in Europe. Clubs not listed fall back to the name dictionary, then the AI (names.ts).
 */
export const CLUBS_ZH_BY_AF_ID: Record<string, string> = {
  // Championship (England)
  "54": "伯明翰", // Birmingham
  "67": "布莱克本", // Blackburn
  "68": "博尔顿", // Bolton
  "56": "布里斯托尔城", // Bristol City
  "43": "卡迪夫城", // Cardiff
  "1335": "查尔顿", // Charlton
  "69": "德比郡", // Derby
  "1379": "林肯城", // Lincoln
  "1359": "卢顿", // Luton
  "70": "米德尔斯堡", // Middlesbrough
  "58": "米尔沃尔", // Millwall
  "71": "诺维奇", // Norwich
  "1338": "牛津联", // Oxford United
  "1357": "普利茅斯", // Plymouth
  "1355": "朴茨茅斯", // Portsmouth
  "59": "普雷斯顿", // Preston
  "72": "女王公园巡游者", // QPR
  "62": "谢菲联", // Sheffield Utd
  "74": "谢周三", // Sheffield Wednesday
  "75": "斯托克城", // Stoke City
  "76": "斯旺西", // Swansea
  "38": "沃特福德", // Watford
  "60": "西布朗", // West Brom
  "1837": "雷克瑟姆", // Wrexham
  // League One (England)
  "1333": "AFC温布尔登", // AFC Wimbledon
  "747": "巴恩斯利", // Barnsley
  "1356": "布莱克浦", // Blackpool
  "1343": "布拉德福德", // Bradford
  "1334": "布里斯托尔流浪者", // Bristol Rovers
  "1832": "布罗姆利", // Bromley
  "748": "伯顿", // Burton Albion
  "1370": "剑桥联", // Cambridge United
  "1362": "克劳利", // Crawley Town
  "1354": "唐卡斯特", // Doncaster
  "1364": "埃克塞特城", // Exeter City
  "37": "哈德斯菲尔德", // Huddersfield
  "1373": "莱顿东方", // Leyton Orient
  "1374": "曼斯菲尔德", // Mansfield Town
  "1348": "MK唐斯", // Milton Keynes Dons
  "1337": "北安普顿", // Northampton
  "1376": "诺茨郡", // Notts County
  "1350": "彼得伯勒联", // Peterborough
  "1351": "韦尔港", // Port Vale
  "53": "雷丁", // Reading
  "73": "罗瑟汉姆", // Rotherham
  "1352": "什鲁斯伯里", // Shrewsbury
  "1368": "斯蒂夫尼奇", // Stevenage
  "4686": "斯托克港", // Stockport County
  "61": "维冈竞技", // Wigan
  "1358": "韦康比", // Wycombe
  // Premier League (England)
  "42": "阿森纳", // Arsenal
  "66": "阿斯顿维拉", // Aston Villa
  "35": "伯恩茅斯", // Bournemouth
  "55": "布伦特福德", // Brentford
  "51": "布莱顿", // Brighton
  "44": "伯恩利", // Burnley
  "49": "切尔西", // Chelsea
  "1346": "考文垂", // Coventry
  "52": "水晶宫", // Crystal Palace
  "45": "埃弗顿", // Everton
  "36": "富勒姆", // Fulham
  "64": "赫尔城", // Hull City
  "57": "伊普斯维奇", // Ipswich
  "63": "利兹联", // Leeds
  "46": "莱斯特城", // Leicester
  "40": "利物浦", // Liverpool
  "50": "曼城", // Manchester City
  "33": "曼联", // Manchester United
  "34": "纽卡斯尔联", // Newcastle
  "65": "诺丁汉森林", // Nottingham Forest
  "41": "南安普顿", // Southampton
  "746": "桑德兰", // Sunderland
  "47": "热刺", // Tottenham
  "48": "西汉姆联", // West Ham
  "39": "狼队", // Wolves
  // La Liga (Spain)
  "542": "阿拉维斯", // Alaves
  "531": "毕尔巴鄂竞技", // Athletic Club
  "530": "马竞", // Atletico Madrid
  "529": "巴萨", // Barcelona
  "538": "塞尔塔", // Celta Vigo
  "544": "拉科鲁尼亚", // Deportivo La Coruna
  "797": "埃尔切", // Elche
  "540": "西班牙人", // Espanyol
  "546": "赫塔费", // Getafe
  "547": "赫罗纳", // Girona
  "534": "拉斯帕尔马斯", // Las Palmas
  "537": "莱加内斯", // Leganes
  "539": "莱万特", // Levante
  "535": "马拉加", // Malaga
  "798": "马略卡", // Mallorca
  "727": "奥萨苏纳", // Osasuna
  "718": "奥维耶多", // Oviedo
  "4665": "桑坦德竞技", // Racing Santander
  "728": "巴列卡诺", // Rayo Vallecano
  "543": "贝蒂斯", // Real Betis
  "541": "皇马", // Real Madrid
  "548": "皇家社会", // Real Sociedad
  "536": "塞维利亚", // Sevilla
  "532": "瓦伦西亚", // Valencia
  "720": "巴拉多利德", // Valladolid
  "533": "比利亚雷亚尔", // Villarreal
  // Serie A (Italy)
  "489": "AC米兰", // AC Milan
  "497": "罗马", // AS Roma
  "499": "亚特兰大", // Atalanta
  "500": "博洛尼亚", // Bologna
  "490": "卡利亚里", // Cagliari
  "895": "科莫", // Como
  "520": "克雷莫纳", // Cremonese
  "511": "恩波利", // Empoli
  "502": "佛罗伦萨", // Fiorentina
  "512": "弗罗西诺内", // Frosinone
  "495": "热那亚", // Genoa
  "504": "维罗纳", // Hellas Verona
  "505": "国际米兰", // Inter
  "496": "尤文图斯", // Juventus
  "487": "拉齐奥", // Lazio
  "867": "莱切", // Lecce
  "1579": "蒙扎", // Monza
  "492": "那不勒斯", // Napoli
  "523": "帕尔马", // Parma
  "801": "比萨", // Pisa
  "488": "萨索洛", // Sassuolo
  "503": "都灵", // Torino
  "494": "乌迪内斯", // Udinese
  "517": "威尼斯", // Venezia
  // Bundesliga (Germany)
  "180": "海登海姆", // 1. FC Heidenheim
  "192": "科隆", // 1. FC Köln
  "167": "霍芬海姆", // 1899 Hoffenheim
  "168": "勒沃库森", // Bayer Leverkusen
  "157": "拜仁", // Bayern München
  "165": "多特蒙德", // Borussia Dortmund
  "163": "门兴", // Borussia Mönchengladbach
  "169": "法兰克福", // Eintracht Frankfurt
  "170": "奥格斯堡", // FC Augsburg
  "174": "沙尔克04", // FC Schalke 04
  "186": "圣保利", // FC St. Pauli
  "164": "美因茨", // FSV Mainz 05
  "175": "汉堡", // Hamburger SV
  "191": "基尔", // Holstein Kiel
  "173": "莱比锡", // RB Leipzig
  "160": "弗赖堡", // SC Freiburg
  "185": "帕德博恩", // SC Paderborn 07
  "1660": "埃尔沃斯贝格", // SV Elversberg
  "182": "柏林联合", // Union Berlin
  "172": "斯图加特", // VfB Stuttgart
  "176": "波鸿", // VfL Bochum
  "161": "沃尔夫斯堡", // VfL Wolfsburg
  "162": "不莱梅", // Werder Bremen
  // Ligue 1 (France)
  "77": "昂热", // Angers
  "108": "欧塞尔", // Auxerre
  "110": "特鲁瓦", // Estac Troyes
  "111": "勒阿弗尔", // Le Havre
  "1298": "勒芒", // Le Mans
  "116": "朗斯", // Lens
  "79": "里尔", // Lille
  "97": "洛里昂", // Lorient
  "80": "里昂", // Lyon
  "81": "马赛", // Marseille
  "112": "梅斯", // Metz
  "91": "摩纳哥", // Monaco
  "82": "蒙彼利埃", // Montpellier
  "83": "南特", // Nantes
  "84": "尼斯", // Nice
  "114": "巴黎FC", // Paris FC
  "85": "大巴黎", // Paris Saint Germain
  "93": "兰斯", // Reims
  "94": "雷恩", // Rennes
  "1063": "圣埃蒂安", // Saint Etienne
  "106": "布雷斯特", // Stade Brestois 29
  "95": "斯特拉斯堡", // Strasbourg
  "96": "图卢兹", // Toulouse
  // Eredivisie (Netherlands)
  "198": "海牙", // ADO Den Haag
  "194": "阿贾克斯", // Ajax
  "419": "阿尔梅勒城", // Almere City FC
  "201": "阿尔克马尔", // AZ Alkmaar
  "420": "坎布尔", // Cambuur
  "199": "格拉夫夏普", // De Graafschap
  "421": "邓伯什", // Den Bosch
  "409": "多德雷赫特", // Dordrecht
  "196": "鹿特丹精英", // Excelsior
  "416": "福伦丹", // FC Volendam
  "209": "费耶诺德", // Feyenoord
  "205": "福图纳锡塔德", // Fortuna Sittard
  "410": "前进之鹰", // GO Ahead Eagles
  "202": "格罗宁根", // Groningen
  "210": "海伦芬", // Heerenveen
  "206": "赫拉克勒斯", // Heracles
  "203": "布雷达", // NAC Breda
  "413": "奈梅亨", // NEC Nijmegen
  "193": "兹沃勒", // PEC Zwolle
  "197": "埃因霍温", // PSV Eindhoven
  "426": "鹿特丹斯巴达", // Sparta Rotterdam
  "427": "特尔斯达", // Telstar
  "415": "特温特", // Twente
  "207": "乌德勒支", // Utrecht
  "417": "瓦尔韦克", // Waalwijk
  "195": "威廉二世", // Willem II
  // Primeira Liga (Portugal)
  "238": "维塞乌学术", // Academico Viseu
  "4724": "阿尔韦卡", // Alverca
  "240": "阿罗卡", // Arouca
  "21595": "AVS", // AVS
  "211": "本菲卡", // Benfica
  "222": "博阿维斯塔", // Boavista
  "4716": "卡萨皮亚", // Casa Pia
  "230": "埃斯托里尔", // Estoril
  "15130": "阿马多拉之星", // Estrela
  "242": "法马利康", // Famalicao
  "231": "法鲁人", // Farense
  "212": "波尔图", // FC Porto
  "762": "吉尔维森特", // GIL Vicente
  "214": "马里迪莫", // Maritimo
  "215": "莫雷伦斯", // Moreirense
  "225": "马德拉国民", // Nacional
  "226": "里奥阿维", // Rio Ave
  "227": "圣克拉拉", // Santa Clara
  "217": "布拉加", // SC Braga
  "228": "葡萄牙体育", // Sporting CP
  "218": "通德拉", // Tondela
  "4799": "托伦斯", // Torreense
  "224": "吉马良斯", // Vitória SC
  "810": "维泽拉", // Vizela
  // Jupiler Pro League (Belgium)
  "554": "安德莱赫特", // Anderlecht
  "740": "安特卫普", // Antwerp
  "263": "贝尔肖特", // Beerschot VA
  "741": "色格拉布鲁日", // Cercle Brugge
  "736": "沙勒罗瓦", // Charleroi
  "569": "布鲁日", // Club Brugge KV
  "6215": "登德尔", // Dender
  "742": "亨克", // Genk
  "631": "根特", // Gent
  "734": "科特赖克", // Kortrijk
  "266": "梅赫伦", // KV Mechelen
  "261": "韦斯特洛", // KVC Westerlo
  "6220": "列日", // Liège
  "259": "洛默尔", // Lommel United
  "260": "鲁汶", // OH Leuven
  "6222": "帕特罗艾斯登", // Patro Eisden
  "5902": "拉卢维耶尔", // RAAL La Louvière
  "738": "贝弗伦", // SK Beveren
  "735": "圣特鲁伊登", // St. Truiden
  "733": "标准列日", // Standard Liege
  "1393": "圣吉罗斯联合", // Union St. Gilloise
  "600": "祖尔特瓦雷赫姆", // Zulte Waregem
  // Süper Lig (Turkey)
  "3563": "阿达纳代米尔体育", // Adana Demirspor
  "996": "阿拉尼亚体育", // Alanyaspor
  "3579": "阿梅德", // Amed
  "1005": "安塔利亚体育", // Antalyaspor
  "564": "巴沙克谢希尔", // Başakşehir
  "549": "贝西克塔斯", // Beşiktaş
  "3583": "博德鲁姆", // Bodrum FK
  "1009": "埃尔祖鲁姆体育", // Erzurumspor FK
  "3588": "埃于普体育", // Eyüpspor
  "3589": "卡拉古姆鲁克", // Fatih Karagümrük
  "611": "费内巴切", // Fenerbahçe
  "645": "加拉塔萨雷", // Galatasaray
  "3573": "加济安泰普", // Gaziantep FK
  "997": "根克勒比利吉", // Gençlerbirliği S.K.
  "994": "格兹泰佩", // Göztepe
  "3575": "哈塔体育", // Hatayspor
  "1004": "卡斯帕萨", // Kasımpaşa
  "1001": "开塞利体育", // Kayserispor
  "7411": "科贾埃利体育", // Kocaelispor
  "607": "科尼亚体育", // Konyaspor
  "1007": "里泽体育", // Rizespor
  "3603": "萨姆松体育", // Samsunspor
  "1002": "锡瓦斯体育", // Sivasspor
  "998": "特拉布宗体育", // Trabzonspor
  "6343": "乔鲁姆", // Çorum FK
  // Premiership (Scotland)
  "252": "阿伯丁", // Aberdeen
  "4249": "阿布罗斯", // Arbroath
  "1387": "艾尔联", // Ayr Utd
  "247": "凯尔特人", // Celtic
  "253": "邓迪", // Dundee
  "1386": "邓迪联", // Dundee Utd
  "1388": "邓弗姆林", // Dunfermline
  "1389": "福尔柯克", // Falkirk
  "254": "哈茨", // Heart Of Midlothian
  "249": "希伯尼安", // Hibernian
  "250": "基尔马诺克", // Kilmarnock
  "255": "利文斯顿", // Livingston
  "256": "马瑟韦尔", // Motherwell
  "901": "帕尔蒂克", // Partick
  "257": "流浪者", // Rangers
  "902": "罗斯郡", // Ross County
  "258": "圣约翰斯通", // ST Johnstone
  "251": "圣米伦", // ST Mirren
  // Serie A (Brazil)
  "144": "戈亚尼恩斯竞技", // Atletico Goianiense
  "134": "巴拉纳竞技", // Atletico Paranaense
  "1062": "米内罗竞技", // Atletico-MG
  "118": "巴伊亚", // Bahia
  "120": "博塔弗戈", // Botafogo
  "129": "塞阿拉", // Ceara
  "132": "沙佩科恩斯", // Chapecoense-sc
  "131": "科林蒂安", // Corinthians
  "147": "科里蒂巴", // Coritiba
  "140": "克里西乌马", // Criciuma
  "135": "克鲁塞罗", // Cruzeiro
  "1193": "库亚巴", // Cuiaba
  "127": "弗拉门戈", // Flamengo
  "124": "弗鲁米嫩塞", // Fluminense
  "154": "福塔莱萨", // Fortaleza EC
  "130": "格雷米奥", // Gremio
  "119": "巴西国际", // Internacional
  "152": "尤文图德", // Juventude
  "7848": "米拉索尔", // Mirassol
  "121": "帕尔梅拉斯", // Palmeiras
  "794": "布拉甘蒂诺红牛", // RB Bragantino
  "1198": "雷莫", // Remo
  "128": "桑托斯", // Santos
  "126": "圣保罗", // Sao Paulo
  "123": "累西腓体育", // Sport Recife
  "133": "瓦斯科达伽马", // Vasco DA Gama
  "136": "维多利亚", // Vitoria
  // Liga Profesional Argentina (Argentina)
  "463": "阿尔多西维", // Aldosivi
  "458": "阿根廷青年人", // Argentinos JRS
  "455": "图库曼竞技", // Atletico Tucuman
  "449": "班菲尔德", // Banfield
  "2432": "中央巴拉卡斯", // Barracas Central
  "440": "贝尔格拉诺", // Belgrano Cordoba
  "451": "博卡青年", // Boca Juniors
  "1065": "中央科尔多瓦", // Central Cordoba de Santiago
  "442": "防卫与正义", // Defensa Y Justicia
  "476": "列斯特拉体育", // Deportivo Riestra
  "2424": "里奥夸尔托大学生", // Estudiantes de Rio Cuarto
  "450": "拉普拉塔大学生", // Estudiantes L.P.
  "434": "拉普拉塔体操击剑", // Gimnasia L.P.
  "1066": "门多萨体操击剑", // Gimnasia M.
  "439": "戈多伊克鲁斯", // Godoy Cruz
  "445": "飓风", // Huracan
  "473": "里瓦达维亚独立", // Independ. Rivadavia
  "453": "独立队", // Independiente
  "478": "科尔多瓦学院", // Instituto Cordoba
  "446": "拉努斯", // Lanus
  "457": "纽维尔老男孩", // Newells Old Boys
  "1064": "普拉腾斯", // Platense
  "436": "竞赛俱乐部", // Racing Club
  "435": "河床", // River Plate
  "437": "罗萨里奥中央", // Rosario Central
  "460": "圣洛伦索", // San Lorenzo
  "461": "圣胡安圣马丁", // San Martin S.J.
  "474": "萨米恩托", // Sarmiento Junin
  "456": "科尔多瓦塔勒瑞斯", // Talleres Cordoba
  "452": "蒂格雷", // Tigre
  "441": "圣菲联", // Union Santa Fe
  "438": "萨斯菲尔德", // Velez Sarsfield
  // Major League Soccer (USA)
  "1608": "亚特兰大联", // Atlanta United FC
  "16489": "奥斯汀FC", // Austin
  "1614": "蒙特利尔", // CF Montreal
  "18310": "夏洛特FC", // Charlotte
  "1607": "芝加哥火焰", // Chicago Fire
  "1610": "科罗拉多急流", // Colorado Rapids
  "1613": "哥伦布机员", // Columbus Crew
  "1615": "华盛顿联", // DC United
  "2242": "辛辛那提", // FC Cincinnati
  "1597": "达拉斯FC", // FC Dallas
  "1600": "休斯敦迪纳摩", // Houston Dynamo
  "9568": "迈阿密国际", // Inter Miami
  "1616": "洛杉矶FC", // Los Angeles FC
  "1605": "洛杉矶银河", // Los Angeles Galaxy
  "1612": "明尼苏达联", // Minnesota United FC
  "9569": "纳什维尔", // Nashville SC
  "1609": "新英格兰革命", // New England Revolution
  "1604": "纽约城", // New York City FC
  "1602": "纽约红牛", // New York Red Bulls
  "1598": "奥兰多城", // Orlando City SC
  "1599": "费城联合", // Philadelphia Union
  "1617": "波特兰伐木者", // Portland Timbers
  "1606": "皇家盐湖城", // Real Salt Lake
  "25484": "圣迭戈FC", // San Diego
  "1596": "圣何塞地震", // San Jose Earthquakes
  "1595": "西雅图海湾人", // Seattle Sounders
  "1611": "堪萨斯城竞技", // Sporting Kansas City
  "20787": "圣路易斯城", // St. Louis City
  "1601": "多伦多FC", // Toronto FC
  "1603": "温哥华白帽", // Vancouver Whitecaps
  // Liga MX (Mexico)
  "2312": "亚特兰特", // Atlante FC
  "2283": "阿特拉斯", // Atlas
  "2314": "圣路易斯竞技", // Atletico San Luis
  "2292": "帕丘卡", // CF Pachuca
  "2287": "美洲队", // Club America
  "2290": "克雷塔罗", // Club Queretaro
  "2280": "蒂华纳", // Club Tijuana
  "2295": "蓝十字", // Cruz Azul
  "2298": "华雷斯", // FC Juarez
  "2278": "瓜达拉哈拉", // Guadalajara Chivas
  "2289": "莱昂", // Leon
  "14002": "马萨特兰", // Mazatlán
  "2282": "蒙特雷", // Monterrey
  "2288": "内卡萨", // Necaxa
  "2291": "普埃布拉", // Puebla
  "2285": "桑托斯拉古纳", // Santos Laguna
  "2279": "老虎大学", // Tigres UANL
  "2281": "托卢卡", // Toluca
  "2286": "美洲狮", // U.N.A.M. - Pumas
  // Super League (China)
  "830": "北京国安", // Beijing Guoan
  "834": "长春亚泰", // Changchun Yatai
  "5648": "成都蓉城", // Chengdu Better City
  "21262": "重庆铜梁龙", // Chongqing Tongliang Long
  "21263": "大连英博", // Dalian Zhixing
  "848": "浙江队", // Hangzhou Greentown
  "840": "河南队", // Henan Jianye
  "1439": "梅州客家", // Meizhou Kejia
  "2626": "南通支云", // Nantong Zhiyun
  "1431": "青岛海牛", // Qingdao Jonoon
  "17265": "青岛西海岸", // Qingdao Youth Island
  "844": "山东泰山", // Shandong Luneng
  "833": "上海申花", // Shanghai Shenhua
  "836": "上海海港", // SHANGHAI SIPG
  "5684": "辽宁铁人", // Shenyang Urban
  "849": "沧州雄狮", // Shijiazhuang Y. J.
  "5686": "深圳新鹏城", // Sichuan Jiuniu
  "837": "天津津门虎", // Tianjin Teda
  "5695": "武汉三镇", // Wuhan Three Towns
  "21265": "云南玉昆", // Yunnan Yukun
  // J1 League (Japan)
  "311": "新潟天鹅", // Albirex Niigata
  "316": "福冈黄蜂", // Avispa Fukuoka
  "291": "大阪樱花", // Cerezo Osaka
  "310": "冈山绿雉", // Fagiano Okayama
  "292": "东京FC", // FC Tokyo
  "293": "大阪钢巴", // Gamba Osaka
  "301": "千叶市原", // JEF United Chiba
  "290": "鹿岛鹿角", // Kashima
  "281": "柏太阳神", // Kashiwa Reysol
  "294": "川崎前锋", // Kawasaki Frontale
  "302": "京都不死鸟", // Kyoto Sanga
  "303": "町田泽维亚", // Machida Zelvia
  "305": "水户蜀葵", // Mito Hollyhock
  "288": "名古屋鲸八", // Nagoya Grampus
  "282": "广岛三箭", // Sanfrecce Hiroshima
  "283": "清水心跳", // Shimizu S-pulse
  "284": "湘南比马", // Shonan Bellmare
  "306": "东京绿茵", // Tokyo Verdy
  "287": "浦和红钻", // Urawa
  "285": "长崎航海", // V-varen Nagasaki
  "289": "神户胜利船", // Vissel Kobe
  "296": "横滨水手", // Yokohama F. Marinos
  "307": "横滨FC", // Yokohama FC
  // K League 1 (South-Korea)
  "2753": "忠南牙山", // Asan Mugunghwa
  "2745": "富川FC", // Bucheon FC 1995
  "2747": "大邱FC", // Daegu FC
  "2750": "大田韩亚市民", // Daejeon Citizen
  "2748": "安养FC", // FC Anyang
  "2766": "首尔FC", // FC Seoul
  "2746": "江原FC", // Gangwon FC
  "2768": "金泉尚武", // Gimcheon Sangmu FC
  "2759": "光州FC", // Gwangju FC
  "2763": "仁川联", // Incheon United
  "2761": "济州SK", // Jeju United FC
  "2762": "全北现代", // Jeonbuk Motors
  "2764": "浦项制铁", // Pohang Steelers
  "2749": "首尔衣恋", // Seoul E-Land FC
  "2765": "水原三星", // Suwon Bluewings
  "2756": "水原FC", // Suwon City FC
  "2767": "蔚山HD", // Ulsan Hyundai FC
  // Pro League (Saudi-Arabia)
  "2951": "阿卜哈", // Abha
  "26738": "迪里耶", // Al Diriyah
  "2928": "海湾", // Al Khaleej Saihat
  "10509": "胡卢德", // Al Kholood
  "2992": "纳杰马", // Al Najma
  "2977": "阿科多", // Al Okhdood
  "2961": "奥鲁巴", // Al Orubah
  "10511": "利雅得", // Al Riyadh
  "2940": "利雅得青年", // Al Shabab
  "2936": "塔亚文", // Al Taawon
  "2937": "麦加统一", // Al Wehda Club
  "2929": "吉达国民", // Al-Ahli Jeddah
  "2934": "达曼协作", // Al-Ettifaq
  "2930": "费萨利", // Al-Faisaly FC
  "2931": "法特赫", // Al-Fateh
  "2944": "费哈", // Al-Fayha
  "2945": "哈森姆", // Al-Hazm
  "2932": "利雅得新月", // Al-Hilal Saudi FC
  "2938": "吉达联合", // Al-Ittihad FC
  "2939": "利雅得胜利", // Al-Nassr
  "2933": "卡迪西亚", // Al-Qadisiyah FC
  "2935": "拉伊德", // Al-Raed
  "2956": "达马克", // Damac
  "10513": "尼奥姆", // NEOM
  // A-League (Australia)
  "948": "阿德莱德联", // Adelaide United
  "24608": "奥克兰FC", // Auckland
  "947": "布里斯班狮吼", // Brisbane Roar
  "941": "中央海岸水手", // Central Coast Mariners
  "15550": "麦克阿瑟FC", // Macarthur
  "945": "墨尔本城", // Melbourne City
  "944": "墨尔本胜利", // Melbourne Victory
  "946": "纽卡斯尔喷气机", // Newcastle Jets
  "940": "珀斯光荣", // Perth Glory
  "943": "悉尼FC", // Sydney
  "942": "惠灵顿凤凰", // Wellington Phoenix
  "939": "西悉尼流浪者", // Western Sydney Wanderers
  "7573": "西部联", // Western United
  // UEFA club competitions only
  "406": "奥胡斯", // Aarhus
  "575": "雅典AEK", // AEK Athens FC
  "614": "拉纳卡AEK", // AEK Larnaca
  "20406": "爱尔巴桑", // AF Elbasani
  "377": "AIK索尔纳", // AIK Stockholm
  "4563": "阿克托别", // Aktobe
  "582": "阿拉什克特", // Alashkert
  "4358": "亚鲁米尼", // Aluminij
  "2247": "阿波尔", // Apoel Nicosia
  "602": "利马索尔阿波罗", // Apollon Limassol
  "3683": "阿拉拉特-亚美尼亚", // Ararat-Armenia
  "11238": "阿拉兹", // Araz
  "1430": "阿尔达", // Arda Kardzhali
  "3408": "利马索尔阿瑞斯", // Aris
  "1123": "塞萨洛尼基阿瑞斯", // Aris Thessalonikis
  "15847": "阿特尔特比森", // Atert Bissen
  "3345": "埃斯卡尔德竞技", // Atlètic Club d'Escaldes
  "4135": "奥达", // Auda
  "601": "奥地利维也纳", // Austria Vienna
  "678": "B36托尔斯港", // B36 Torshavn
  "352": "巴拉镇", // Bala Town
  "12733": "巴尔干尼", // Ballkani
  "3858": "班加", // Banga
  "3713": "俄斯特拉发巴尼克", // Baník Ostrava
  "388": "BATE鲍里索夫", // Bate Borisov
  "657": "耶路撒冷贝塔", // Beitar Jerusalem
  "4149": "陶格夫匹尔斯", // BFC Daugavpils
  "2277": "比尔基卡拉", // Birkirkara
  "367": "哈肯", // BK Hacken
  "327": "博德闪耀", // Bodo/Glimt
  "3840": "波希米亚人", // Bohemians
  "3364": "巴尼亚卢卡战士", // Borac Banja Luka
  "634": "普罗夫迪夫博特夫", // Botev Plovdiv
  "319": "布兰", // Brann
  "4359": "布拉沃", // Bravo
  "276": "布雷扎布利克", // Breidablik
  "407": "布隆德比", // Brondby
  "565": "伯尔尼年轻人", // BSC Young Boys
  "579": "布杜克诺斯特", // Buducnost Podgorica
  "356": "卡那封镇", // Caernarfon Town
  "4360": "采列", // Celje
  "2246": "CFR克卢日", // CFR 1907 Cluj
  "851": "切尔诺莫雷", // Cherno More Varna
  "2266": "克利夫顿维尔", // Cliftonville FC
  "669": "科尔雷恩", // Coleraine FC
  "20034": "胡内多阿拉科尔维努尔", // Corvinul Hunedoara
  "697": "十字军", // Crusaders FC
  "1426": "索菲亚中央陆军1948", // CSKA 1948
  "853": "索菲亚中央陆军", // CSKA Sofia
  "2392": "德布勒森", // Debreceni VSC
  "670": "德里城", // Derry City
  "3745": "德契奇", // Dečić
  "3499": "迪拉", // Dila
  "705": "巴统迪纳摩", // Dinamo Batumi
  "386": "布列斯特迪纳摩", // Dinamo Brest
  "394": "明斯克迪纳摩", // Dinamo Minsk
  "2262": "第比利斯迪纳摩", // Dinamo Tbilisi
  "3326": "地拉那迪纳摩", // Dinamo Tirana
  "620": "萨格勒布迪纳摩", // Dinamo Zagreb
  "364": "尤尔加登", // Djurgardens IF
  "3623": "第聂伯罗-1", // Dnipro-1
  "14281": "德利塔", // Drita
  "14393": "杜卡吉尼", // Dukagjini
  "2257": "杜纳伊斯卡斯特雷达", // Dunajska Streda
  "5351": "邓甘嫩雨燕", // Dungannon Swifts
  "572": "基辅迪纳摩", // Dynamo Kyiv
  "3327": "埃格纳蒂亚", // Egnatia Rrogozhinë
  "10125": "欧罗巴", // Europa
  "578": "迪德朗日", // F91 Dudelange
  "562": "阿斯塔纳", // FC Astana
  "551": "巴塞尔", // FC Basel 1893
  "400": "哥本哈根", // FC Copenhagen
  "684": "迪弗当日", // FC Differdange 03
  "3502": "伊比利亚1999", // FC Iberia 1999
  "391": "伊斯拉奇", // FC Isloch Minsk R.
  "2273": "塔林莱瓦迪亚", // FC Levadia Tallinn
  "606": "卢加诺", // FC Lugano
  "397": "中日德兰", // FC Midtjylland
  "3684": "诺亚", // FC Noah
  "398": "北西兰", // FC Nordsjaelland
  "591": "圣科洛马", // FC Santa Coloma
  "630": "锡永", // FC Sion
  "1011": "圣加仑", // FC ST. Gallen
  "1012": "图恩", // FC Thun
  "2276": "乌拉尔图", // FC Urartu
  "660": "瓦杜兹", // FC Vaduz
  "783": "苏黎世", // FC Zurich
  "559": "布加勒斯特星", // FCSB
  "610": "费赫瓦尔", // Fehérvár FC
  "651": "费伦茨瓦罗斯", // Ferencvarosi TC
  "598": "贝尔格莱德红星", // FK Crvena Zvezda
  "1122": "亚布洛内茨", // FK Jablonec
  "10534": "科希策", // FK Košice
  "661": "利耶帕亚", // FK Liepaja
  "573": "贝尔格莱德游击队", // FK Partizan
  "663": "拉博特尼奇基", // FK Rabotnicki
  "679": "萨拉热窝", // FK Sarajevo
  "2259": "托博尔", // FK Tobol Kostanay
  "586": "扎尔吉里斯", // FK Zalgiris Vilnius
  "687": "塔林弗洛拉", // Flora Tallinn
  "4625": "弗洛里亚纳", // Floriana
  "2149": "腓特烈斯塔", // Fredrikstad
  "2170": "加尔斯", // Gais
  "357": "康纳斯码头游牧人", // GAP Connah S Quay FC
  "3484": "卡托维兹GKS", // GKS Katowice
  "5352": "格伦托兰", // Glentoran
  "340": "扎布热矿工", // Gornik Zabrze
  "2402": "杰尔ETO", // Gyori ETO FC
  "363": "哈马比", // Hammarby FF
  "4626": "哈姆伦斯巴达", // Hamrun Spartans
  "563": "贝尔谢巴夏普尔", // Hapoel Beer Sheva
  "4501": "特拉维夫夏普尔", // Hapoel Tel Aviv
  "2194": "哈弗福德韦斯特郡", // Haverfordwest County AFC
  "4133": "HB托尔斯港", // HB Torshavn
  "3861": "赫格尔曼", // Hegelmann Litauen
  "3884": "希伯尼安斯", // Hibernians
  "649": "赫尔辛基HJK", // HJK Helsinki
  "608": "斯普利特海杜克", // HNK Hajduk Split
  "561": "里耶卡", // HNK Rijeka
  "3723": "赫拉德茨克拉洛韦", // Hradec Králové
  "372": "埃尔夫斯堡", // IF Elfsborg
  "366": "哥德堡", // IFK Goteborg
  "1163": "伊尔维斯", // Ilves
  "3342": "埃斯卡尔德国际", // Inter Club d'Escaldes
  "1164": "国际图尔库", // Inter Turku
  "336": "雅盖隆尼亚", // Jagiellonia
  "272": "阿克雷里KA", // KA Akureyri
  "664": "阿拉木图凯拉特", // Kairat Almaty
  "662": "内姆梅卡柳", // Kalju Nomme
  "3872": "考纳斯扎尔吉里斯", // Kauno Žalgiris
  "701": "克拉克斯维克", // KI Klaksvik
  "4374": "科佩尔", // Koper
  "6489": "克里夫巴斯", // Kryvbas KR
  "1165": "库奥皮奥", // KuPS
  "2249": "拉菲奥里塔", // La Fiorita
  "5354": "拉恩", // Larne
  "1026": "林茨LASK", // Lask Linz
  "1014": "洛桑", // Lausanne
  "347": "波兹南莱赫", // Lech Poznan
  "339": "华沙莱吉亚", // Legia Warszawa
  "646": "索菲亚列夫斯基", // Levski Sofia
  "321": "利勒斯特伦", // Lillestrom
  "667": "林肯红魔", // Lincoln Red Imps FC
  "583": "林菲尔德", // Linfield
  "14395": "拉皮", // Llapi
  "17161": "切尔卡瑟LNZ", // LNZ Cherkasy
  "566": "卢多戈雷茨", // Ludogorets
  "4195": "海法马卡比", // Maccabi Haifa
  "4495": "佩塔提克瓦马卡比", // Maccabi Petah Tikva
  "604": "特拉维夫马卡比", // Maccabi Tel Aviv
  "16135": "喜鹊", // Magpies
  "15576": "马利谢瓦", // Malisheva
  "375": "马尔默", // Malmo FF
  "552": "马里博尔", // Maribor
  "14507": "马尔萨什洛克", // Marsaxlokk
  "691": "奥尔海米尔萨米", // Milsami Orhei
  "2240": "米亚尔比", // Mjallby AIF
  "7808": "维捷布斯克", // ML Vitebsk
  "640": "姆拉达博莱斯拉夫", // Mlada Boleslav
  "329": "莫尔德", // Molde
  "3740": "莫尔纳尔", // Mornar
  "2270": "巴库石油", // Neftchi Baku
  "387": "格罗德诺尼曼", // Neman
  "616": "奥西耶克", // NK Osijek
  "1483": "瓦拉日丁", // NK Varazdin
  "2643": "新帕扎尔", // Novi Pazar
  "682": "鲁纳维克", // NSI Runavik
  "1124": "克里特OFI", // OFI
  "3619": "亚历山德里亚", // Oleksandria
  "677": "卢布尔雅那奥林匹亚", // Olimpija Ljubljana
  "553": "奥林匹亚科斯", // Olympiakos Piraeus
  "3402": "奥莫尼亚", // Omonia Nicosia
  "692": "奥达巴斯", // Ordabasy
  "3403": "帕福斯", // Pafos
  "3528": "派德", // Paide
  "2390": "保克什", // Paks
  "617": "帕纳辛奈科斯", // Panathinaikos
  "3874": "帕内韦日斯", // Panevėžys
  "619": "帕奥克", // PAOK
  "708": "地拉那游击队", // Partizani
  "2191": "佩尼邦特", // Penybont
  "2271": "彼得罗库布", // Petrocub
  "3741": "佩特罗瓦茨", // Petrovac
  "567": "比尔森胜利", // Plzen
  "6496": "日托米尔波利西亚", // Polessya
  "680": "普里什蒂纳", // Prishtina
  "658": "尼德科恩进步", // Progres Niederkorn
  "2391": "普斯卡什学院", // Puskas Academy
  "709": "埃里温凤凰", // Pyunik Yerevan
  "556": "卡拉巴赫", // Qarabag
  "2030": "卢森堡竞技联合", // Racing FC Union Luxembourg
  "2644": "克拉古耶瓦茨拉德尼基", // Radnicki 1923
  "3491": "琴斯托霍瓦拉科夫", // Raków Częstochowa
  "781": "维也纳快速", // Rapid Vienna
  "571": "萨尔茨堡红牛", // Red Bull Salzburg
  "10124": "里加FC", // Riga
  "331": "罗森博格", // Rosenborg
  "3549": "鲁容贝罗克", // Ružomberok
  "4160": "里加RFS", // Rīgas FS
  "13976": "萨巴赫", // Sabah FA
  "2184": "塞尔维特", // Servette FC
  "550": "顿涅茨克矿工", // Shakhtar Donetsk
  "652": "沙姆洛克流浪者", // Shamrock Rovers
  "3854": "舒尔本", // Shelbourne
  "568": "谢里夫", // Sheriff Tiraspol
  "609": "什肯迪亚", // Shkendija
  "2250": "奥洛穆茨西格玛", // Sigma Olomouc
  "4331": "西莱克斯", // Sileks
  "2073": "锡尔克堡", // Silkeborg
  "689": "塞伊奈约基", // SJK
  "337": "弗罗茨瓦夫斯拉斯克", // Slask Wroclaw
  "560": "布拉格斯拉维亚", // Slavia Praha
  "4628": "斯利马流浪者", // Sliema Wanderers
  "656": "布拉迪斯拉发斯洛万", // Slovan Bratislava
  "14864": "斯帕埃里", // Spaeri
  "628": "布拉格斯巴达", // Sparta Praha
  "1120": "特尔纳瓦斯巴达克", // Spartak Trnava
  "698": "圣约瑟夫", // St Joseph S Fc
  "3843": "圣帕特里克竞技", // St Patrick's Athl.
  "275": "斯蒂亚尔南", // Stjarnan
  "4346": "斯特鲁加", // Struga
  "637": "格拉茨风暴", // Sturm Graz
  "5503": "苏姆盖特", // Sumqayıt
  "673": "苏捷斯卡", // Sutjeska
  "3529": "塔林卡勒夫", // Tallinna Kalev
  "354": "新圣徒", // The New Saints
  "4348": "提克韦什", // Tikveš
  "694": "地拉那", // Tirana
  "685": "库塔伊西鱼雷", // Torpedo Kutaisi
  "385": "若基诺鱼雷", // Torpedo Zhodino
  "18878": "TransINVEST", // TransINVEST Vilnius
  "2260": "特雷菲奥里", // Tre Fiori
  "700": "特雷佩内", // Tre Penne
  "325": "特罗姆瑟", // Tromso
  "2646": "巴奇卡托波拉TSC", // TSC Backa Topola
  "703": "圣科洛马UE", // UE Santa Coloma
  "2036": "施特拉森", // UNA Strassen
  "2599": "克卢日大学", // Universitatea Cluj
  "632": "克拉约瓦大学", // Universitatea Craiova
  "2037": "蒙多夫", // US Mondorf-les-bains
  "659": "瓦莱塔", // Valletta FC
  "274": "瓦卢尔", // Valur Reykjavik
  "574": "瓦尔达尔", // Vardar Skopje
  "3381": "莫斯塔尔韦莱日", // Velež
  "4165": "韦斯特里", // Vestri
  "759": "维京", // Viking
  "580": "约塔维京", // Vikingur Gota
  "278": "雷克雅未克维京", // Vikingur Reykjavik
  "5308": "维尔图斯", // Virtus
  "3339": "斯库台弗拉兹尼亚", // Vllaznia Shkodër
  "702": "伏伊伏丁那", // Vojvodina
  "650": "瓦萨VPS", // VPS
  "338": "克拉科夫维斯瓦", // Wisla Krakow
  "1025": "沃尔夫斯贝格", // Wolfsberger AC
  "21011": "塞梅伊叶利迈", // Yelimay Semey
  "654": "萨拉热窝铁路", // Zeljeznicar Sarajevo
  "4633": "基希讷乌齐姆布鲁", // Zimbru
  "648": "齐拉", // Zira
  "588": "莫斯塔尔兹里尼斯基", // Zrinjski
  "3870": "希奥利艾", // Šiauliai
  "12360": "潘切沃铁路", // Železničar Pančevo
  "3554": "日利纳", // Žilina
};
