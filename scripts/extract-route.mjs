import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

let sourceName = 'roadtrip-game/roadbook-source.json';
let sourceText;
try {
  sourceText = await readFile(new URL('../roadbook-source.json', import.meta.url), 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  sourceName = 'roadbook/.local-data/roadbook.json';
  sourceText = await readFile(new URL('../../roadbook/.local-data/roadbook.json', import.meta.url), 'utf8');
}
const store = JSON.parse(sourceText);
const trip = store.trips.find(t => t.id === 'trip-usa-roadbook');
if (!trip) throw new Error('USA roadbook trip not found');
const app = await readFile(new URL('../../roadbook/dist/app.js', import.meta.url), 'utf8');
const defaults = vm.runInNewContext(`${app.slice(0, app.indexOf('const STORE_KEY'))}; ({places,defaultRows})`);
const normalize = day => [day.title, day.type, day.from ?? null, day.to ?? null, day.via ?? null];
const matchesDefaults = JSON.stringify(trip.days.map(normalize)) === JSON.stringify(defaults.defaultRows.map(normalize));

// Display names and symbols only; route ordering and coordinates come from the selected roadbook.
const labels = {
  LA: ['洛杉矶', 'Los Angeles', '🌴'], Redding: ['雷丁', 'Redding', '🌲'],
  Evergreen: ['常青航空航天博物馆', 'Evergreen Aviation & Space Museum', '✈️'],
  Portland: ['波特兰', 'Portland', '🌲'], Rainier: ['雷尼尔山', 'Mount Rainier', '🏔️'],
  Seattle: ['西雅图', 'Seattle', '🏙️'], StRegis: ['圣里吉斯', 'St. Regis', '🌲'],
  Glacier: ['冰川国家公园', 'Glacier National Park', '🏔️'], GreatFalls: ['大瀑布城', 'Great Falls', '💧'],
  Bighorn: ['小比格霍恩战场', 'Little Bighorn Battlefield', '🏳️'], Casper: ['卡斯珀', 'Casper', '🏜️'],
  Cheyenne: ['夏延', 'Cheyenne', '🚂'], Denver: ['丹佛', 'Denver', '🏙️'],
  SantaFe: ['圣菲', 'Santa Fe', '🏘️'], WichitaFalls: ['威奇托福尔斯', 'Wichita Falls', '💧'],
  Houston: ['休斯顿', 'Houston', '🚀'], FortStockton: ['斯托克顿堡', 'Fort Stockton', '🌵'],
  WhiteSands: ['白沙国家公园', 'White Sands National Park', '🏜️'], LasCruces: ['拉斯克鲁塞斯', 'Las Cruces', '🌵'],
  Pima: ['皮马航空航天博物馆', 'Pima Air & Space Museum', '🛩️'], Tucson: ['图森', 'Tucson', '🌵'],
  Cabrillo: ['卡布里洛', 'Cabrillo', '🗼'], SanDiego: ['圣迭戈', 'San Diego', '⚓'],
  SF: ['旧金山', 'San Francisco', '🌉'], Mariposa: ['马里波萨', 'Mariposa', '🌲'],
  Yosemite: ['优胜美地国家公园', 'Yosemite National Park', '🏞️'], LeeVining: ['李维宁', 'Lee Vining', '🏔️'],
  Elko: ['埃尔科', 'Elko', '🏜️'], IdahoFalls: ['爱达荷福尔斯', 'Idaho Falls', '💧'],
  Yellowstone: ['黄石', 'Yellowstone', '🌋'], GrandTeton: ['大提顿', 'Grand Teton', '🏔️'],
  Jackson: ['杰克逊', 'Jackson', '🦌'], Ogden: ['奥格登', 'Ogden', '🏔️'],
  Hill: ['希尔航空航天博物馆', 'Hill Aerospace Museum', '✈️'], LasVegas: ['拉斯维加斯', 'Las Vegas', '🎰'],
};
const descriptions = {
  Evergreen: '路书中的航空航天博物馆一站。', Rainier: '前往雷尼尔山 Paradise。',
  Seattle: '城市探索：波音工厂与飞行博物馆。', StRegis: '从西雅图出发，经斯波坎来到圣里吉斯。',
  Glacier: '穿行冰川国家公园。', Bighorn: '探访小比格霍恩战场。', Cheyenne: '探访夏延车站。',
  Denver: '抵达丹佛；这一段路书还提到科罗拉多斯普林斯。',
  Houston: '城市探索：丰田中心与太空中心。', WhiteSands: '探访白沙国家公园。',
  Pima: '探访皮马航空航天博物馆。', Cabrillo: '探访卡布里洛，路书还安排了 Point Loma 日落。',
  SanDiego: '城市探索：中途岛号博物馆。', SF: '在旧金山停留，探索城市。',
  Yosemite: '穿行优胜美地国家公园。', Yellowstone: '在黄石国家公园停留与探索。',
  GrandTeton: '从黄石前往杰克逊，途经大提顿。', Hill: '探访 Hill Aerospace Museum。',
};
const stops = [];
const counts = new Map();
const push = key => {
  if (!key || stops.at(-1)?.key === key) return;
  const coordinate = trip.places[key];
  if (!coordinate || !labels[key]) throw new Error(`Missing route data: ${key}`);
  const [name, en, icon] = labels[key];
  const count = (counts.get(key) ?? 0) + 1;
  counts.set(key, count);
  const description = key === 'LA'
    ? count === 1 ? '美国自驾之旅的起点，从洛杉矶出发。' : '回到洛杉矶，自驾环线完成。'
    : descriptions[key] ?? `沿着路书抵达${name}，继续美国自驾旅程。`;
  stops.push({ id: `${key.toLowerCase()}-${count}`, key, name, en, lat: coordinate[0], lon: coordinate[1], icon, description });
};
for (const day of trip.days) {
  if (day.type !== 'drive') continue;
  push(day.from);
  for (const via of Array.isArray(day.via) ? day.via : [day.via]) push(via);
  push(day.to);
}
const routeMeta = {
  title: trip.title,
  subtitle: '沿着路书，开过美国',
  source: sourceName,
  tripId: trip.id,
  stopCount: stops.length,
  uniquePlaceCount: new Set(stops.map(s => s.key)).size,
  defaultRouteMatches: matchesDefaults,
  disclaimer: '路线依据路书缓存的真实公路轨迹呈现，地形为卡通表现。',
};
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/route-data.js', import.meta.url),
  `// Generated from the roadbook by scripts/extract-route.mjs.\nexport const stops = ${JSON.stringify(stops, null, 2)};\n\nexport const routeMeta = ${JSON.stringify(routeMeta, null, 2)};\n`);
console.log(`Exported ${stops.length} stops; default route matches: ${matchesDefaults}`);

