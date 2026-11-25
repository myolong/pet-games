// 하루 접속자 수 세기 (운영자만 본다).
// 브라우저마다 무작위로 만든 번호(이름·IP 아님)를 하루에 한 번만 센다. 운영자 기기(?owner=on)는 세지 않는다.
// 기록은 날짜별 '번호를 줄인 값' 목록뿐이고, 31일이 지나면 지운다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FILE = process.env.VISITS_FILE || '/data/visits.json';
const KEEP_DAYS = 31;
const MAX_PER_DAY = 20000;   // 하루 기록 상한 (메모리 보호)
// 운영자 확인용 열쇠의 SHA-256 값. 열쇠 자체는 코드에 없다.
const KEY_HASH = process.env.VISITS_KEY_HASH || '4898c1300b75b102bfc31acc49eb6c3b94ab04faa5ca9b15692201ac37328c4a';
const BOT_UA = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|kakaotalk-scrap|yeti|daum|phantom|python|curl|wget/i;

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const short = (vid) => sha('cattrain:' + vid).slice(0, 16);
// 한국 날짜 (YYYY-MM-DD)
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

let data = { days: {}, owners: [] };
try {
  const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (saved && typeof saved.days === 'object') data = { days: saved.days, owners: Array.isArray(saved.owners) ? saved.owners : [] };
} catch (e) { /* 처음이거나 저장 공간이 없음 */ }

const days = new Map();   // 날짜 → { v: Set(방문), p: Set(같이 하기 접속) }
for (const [d, r] of Object.entries(data.days)) days.set(d, { v: new Set(r.v || []), p: new Set(r.p || []) });
const owners = new Set(data.owners);
let dirty = false;

function prune() {
  const cut = new Date(Date.now() + 9 * 3600e3 - KEEP_DAYS * 86400e3).toISOString().slice(0, 10);
  for (const d of days.keys()) if (d < cut) { days.delete(d); dirty = true; }
}

function flush() {
  if (!dirty) return;
  prune();
  const out = { days: {}, owners: [...owners] };
  for (const [d, r] of days) out.days[d] = { v: [...r.v], p: [...r.p] };
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(out));
    fs.renameSync(FILE + '.tmp', FILE);
    dirty = false;
  } catch (e) { /* 저장 못 해도 메모리로는 센다 */ }
}
setInterval(flush, 30000).unref();
// 요금 기록이 프로세스를 끝내기 전에 먼저 저장한다
for (const sig of ['SIGINT', 'SIGTERM']) process.prependListener(sig, flush);
export { flush as flushVisits };

// vid: 브라우저가 만든 무작위 번호, owner: 운영자 기기 여부, played: 같이 하기 접속인지
export function recordVisit({ vid, owner, played, ua }) {
  if (typeof vid !== 'string' || !/^[a-z0-9]{8,32}$/.test(vid)) return;
  if (ua && BOT_UA.test(ua)) return;
  const id = short(vid);
  if (owner) {
    if (!owners.has(id)) { owners.add(id); dirty = true; }
    // 운영자 기기로 바꾸기 전에 세어진 것도 뺀다
    for (const r of days.values()) { if (r.v.delete(id)) dirty = true; if (r.p.delete(id)) dirty = true; }
    return;
  }
  if (owners.has(id)) return;
  const d = today();
  let r = days.get(d);
  if (!r) { r = { v: new Set(), p: new Set() }; days.set(d, r); prune(); }
  if (r.v.size >= MAX_PER_DAY) return;
  if (!r.v.has(id)) { r.v.add(id); dirty = true; }
  if (played && !r.p.has(id)) { r.p.add(id); dirty = true; }
}

export function keyOk(k) {
  return typeof k === 'string' && k.length >= 8 && k.length <= 64 && sha(k) === KEY_HASH;
}

// 최근 날짜부터: [{ day, visitors, players }]
export function visitReport() {
  prune();
  const rows = [...days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([d, r]) => ({ day: d, visitors: r.v.size, players: r.p.size }));
  const week = new Set();
  const weekP = new Set();
  const cut = new Date(Date.now() + 9 * 3600e3 - 6 * 86400e3).toISOString().slice(0, 10);
  for (const [d, r] of days) if (d >= cut) { r.v.forEach((x) => week.add(x)); r.p.forEach((x) => weekP.add(x)); }
  return { today: today(), last7: { visitors: week.size, players: weekP.size }, days: rows };
}
