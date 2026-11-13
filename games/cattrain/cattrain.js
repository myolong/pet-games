// 냥이 꼬리기차 화면. 게임 규칙은 sim.js에 있다.
// 같이 하기 서버(server-config.js의 주소)에 붙으면 다른 사람들과 한 놀이터에서 놀고,
// 서버가 없거나 연결이 안 되면 컴퓨터 냥이들과 혼자 논다.
import * as S from './sim.js';

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const FONT = '"Jua", -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const { WORLD, GAUGE_MAX, START_LEN, FUR_KEYS, PICK_FURS, SCARVES, FISH_COLORS } = S;

const BEST_KEY = 'nyang-cattrain-best';
const FUR_KEY = 'nyang-cattrain-fur';
const NAME_KEY = 'nyang-nickname';
const SERVER = String(window.CATTRAIN_SERVER || '').replace(/\/+$/, '');
let interpMs = 90;          // 다른 기차는 서버 모습을 이만큼 늦게 보여 주며 사이를 부드럽게 잇는다 (인터넷 상태에 맞춰 바뀜)

const FURS = {
  orange: ['#f4a24c', '#d97a22'],
  gray: ['#9aa3ad', '#6f7882'],
  white: ['#fbf6ee', '#d8cfc2'],
  black: ['#3b3a40', '#22212a'],
  calico: ['#fbf6ee', '#e08a3c'],
  cream: ['#f3d9a8', '#d6b47a'],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function angleTo(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function load(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
function save(key, v) { try { localStorage.setItem(key, v); } catch (e) {} }
const headR = (t) => S.headR(t);

// ───── 고양이 그림을 미리 그려 둔다 (털색 × 표정) ─────
const SPR = 128, SR = 40;
function drawCatFace(g, fur, face) {
  const [m, d] = FURS[fur];
  const r = SR;
  g.save();
  g.translate(SPR / 2, SPR / 2 + 6);
  g.lineJoin = 'round';
  g.strokeStyle = '#5a3a22';
  g.lineWidth = 3.6;
  for (const s of [-1, 1]) {
    g.fillStyle = m;
    g.beginPath(); g.moveTo(s * r * 0.85, -r * 0.25); g.lineTo(s * r * 0.75, -r * 1.15); g.lineTo(s * r * 0.15, -r * 0.8); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#f6b6b6';
    g.beginPath(); g.moveTo(s * r * 0.68, -r * 0.45); g.lineTo(s * r * 0.66, -r * 0.92); g.lineTo(s * r * 0.32, -r * 0.72); g.closePath(); g.fill();
  }
  g.fillStyle = m;
  g.beginPath(); g.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2); g.fill();
  g.save();
  g.beginPath(); g.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2); g.clip();
  if (fur === 'calico') {
    g.fillStyle = '#e08a3c'; g.beginPath(); g.arc(-r * 0.6, -r * 0.5, r * 0.6, 0, 7); g.fill();
    g.fillStyle = '#3b3a40'; g.beginPath(); g.arc(r * 0.7, -r * 0.4, r * 0.45, 0, 7); g.fill();
  } else {
    g.strokeStyle = d; g.lineWidth = r * 0.12;
    for (const s of [-1, 0, 1]) { g.beginPath(); g.moveTo(s * r * 0.25, -r * 0.95); g.lineTo(s * r * 0.2, -r * 0.55); g.stroke(); }
  }
  g.restore();
  g.strokeStyle = '#5a3a22'; g.lineWidth = 3.6;
  g.beginPath(); g.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2); g.stroke();
  const ec = fur === 'black' ? '#ffe066' : '#2b2118';
  g.strokeStyle = ec; g.fillStyle = ec; g.lineCap = 'round'; g.lineWidth = r * 0.1;
  if (face === 'dizzy') {
    for (const s of [-1, 1]) {
      const ex = s * r * 0.38;
      g.beginPath(); g.moveTo(ex - r * 0.12, -r * 0.12); g.lineTo(ex + r * 0.12, r * 0.08); g.moveTo(ex + r * 0.12, -r * 0.12); g.lineTo(ex - r * 0.12, r * 0.08); g.stroke();
    }
  } else if (face === 'happy') {
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.38, 0, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  } else {
    for (const s of [-1, 1]) {
      g.fillStyle = ec; g.beginPath(); g.ellipse(s * r * 0.38, -r * 0.02, r * 0.13, r * 0.17, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s * r * 0.38 + r * 0.04, -r * 0.08, r * 0.05, 0, 7); g.fill();
    }
  }
  g.fillStyle = '#f08a9a';
  g.beginPath(); g.moveTo(-r * 0.09, r * 0.2); g.lineTo(r * 0.09, r * 0.2); g.lineTo(0, r * 0.3); g.closePath(); g.fill();
  g.strokeStyle = fur === 'black' ? '#aaa' : '#5a3a22'; g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(0, r * 0.3); g.quadraticCurveTo(-r * 0.1, r * 0.45, -r * 0.22, r * 0.38);
  g.moveTo(0, r * 0.3); g.quadraticCurveTo(r * 0.1, r * 0.45, r * 0.22, r * 0.38);
  g.stroke();
  g.fillStyle = 'rgba(255,120,140,.35)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.62, r * 0.28, r * 0.14, r * 0.09, 0, 0, 7); g.fill(); }
  g.restore();
}
const sprites = {};
for (const fur of FUR_KEYS) {
  sprites[fur] = {};
  for (const face of ['normal', 'happy', 'dizzy']) {
    const c = document.createElement('canvas');
    c.width = c.height = SPR;
    drawCatFace(c.getContext('2d'), fur, face);
    sprites[fur][face] = c;
  }
}

// 그림 한 마리를 (x, y)에 반지름 r로, 진행 방향 a(머리가 앞)를 보도록 그린다.
function drawSprite(img, x, y, r, a) {
  const s = r / SR;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a + Math.PI / 2);
  ctx.drawImage(img, -SPR / 2 * s, -(SPR / 2 + 6) * s, SPR * s, SPR * s);
  ctx.restore();
}

const groundTile = (function () {
  const c = document.createElement('canvas');
  c.width = c.height = 224;
  const g = c.getContext('2d');
  g.fillStyle = '#8fd18a'; g.fillRect(0, 0, 224, 224);
  g.fillStyle = '#86c981';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) g.fillRect(i * 56, j * 56, 56, 56);
  for (let k = 0; k < 7; k++) {
    const x = 8 + Math.random() * 208, y = 8 + Math.random() * 208;
    g.fillStyle = ['#fff', '#ffe680', '#ffb3c7'][k % 3];
    for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 3, y + Math.sin(p * 1.26) * 3, 2.2, 0, 7); g.fill(); }
    g.fillStyle = '#ffcf3f'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill();
  }
  return ctx.createPattern(c, 'repeat');
})();

// ───── 상태 ─────
// mode: 'local'(혼자, 컴퓨터 냥이만) | 'online'(같이 하기 서버)
let mode = 'local';
let state = 'menu'; // menu | connecting | play | dying | result
let local = S.createWorld();   // 시작 화면 뒤에서도 돌아가는 놀이터
let localMe = null;
let run = null;      // 한 판 기록
let scene = null;    // 지금 그릴 모습
let cam = { x: WORLD / 2, y: WORLD / 2, z: 1 };
let vw = 0, vh = 0, dpr = 1, baseZoom = 1;
let hintUntil = 0;
let clock = 0;       // 화면 시간(초)
let floats = [];
let death = null;    // 죽은 자리(쿵! 표시)
let menuTarget = null;

// ───── 혼자 하기: sim.js 놀이터를 그대로 그린다 ─────
function localScene() {
  const order = S.ranked(local);
  const top = order[0];
  const trains = local.trains.filter((t) => t.alive).map((t) => ({
    id: t.id, name: t.name, fur: t.fur, scarf: t.scarf, bot: t.bot, x: t.x, y: t.y, a: t.a,
    kids: t.kids, segs: t.segs, dash: t.dashNow, invul: t.invul > 0, crown: t === top,
  }));
  const me = localMe && localMe.alive ? trains.find((t) => t.id === localMe.id) : null;
  const kittens = local.kittens.map((k) => ({ x: k.x, y: k.y, fur: k.fur, wild: k.wild, old: !k.wild && local.now - k.born > 26, a: k.a, seed: k.born }));
  const myIdx = me ? order.findIndex((t) => t.id === me.id) : -1;
  return {
    trains: trains, fish: local.fish, kittens: kittens, me: me,
    lb: order.slice(0, 5).map((t) => ({ name: t.name, bot: t.bot, len: t.kids.length, id: t.id })),
    my: me ? { rank: myIdx + 1, len: me.kids.length, gauge: Math.floor(localMe.gauge) } : null,
    mm: local.trains.filter((t) => t.alive).map((t) => ({ x: t.x, y: t.y, len: t.kids.length, id: t.id })),
    hc: 1,
  };
}

function localStep(dt) {
  if (localMe && localMe.alive) {
    localMe.input.a = input.a;
    localMe.input.dash = input.dash;
  }
  S.step(local, dt);
  for (const ev of local.events) {
    if (ev.type === 'gain' && ev.train === localMe) floats.push({ x: localMe.x + 34, y: localMe.y - 10, text: '+1 냥', t: 0 });
    if (ev.type === 'poison' && ev.train === localMe) floats.push({ x: localMe.x + 34, y: localMe.y - 10, text: ouchText(ev.onion, ev.n), t: 0 });
    if (ev.type === 'crash' && ev.train === localMe) {
      const t = localMe;
      S.removeTrain(local, t);
      run.max = Math.max(run.max, t.maxLen);
      run.lived += local.now - run.joinedAt;
      onDead({
        by: ev.by ? ev.by.name : null, bot: ev.by ? ev.by.bot : false, max: run.max, rank: ev.rank, count: ev.count,
        lived: run.lived, canCont: !run.continued && t.kids.length >= 2, x: t.x, y: t.y, a: t.a, fur: t.fur,
      });
      run.lastKids = t.kids.slice();
      localMe = null;
    }
  }
  local.events.length = 0;
}

function localJoin(cont) {
  let kids;
  if (cont && run.lastKids) kids = run.lastKids.slice(0, Math.max(START_LEN, Math.ceil(run.lastKids.length / 2)));
  localMe = S.addPlayer(local, { name: run.name, fur: run.fur, kids: kids });
  run.joinedAt = local.now;
  input.a = localMe.a;
}

// ───── 같이 하기: 서버 연결 ─────
const net = { ws: null, room: 1, snaps: [], meId: 0, lastA: 99, lastDash: false, lastSend: 0, lastLen: 0, hc: 0, mm: [], gotFirst: false, rtt: 150, gapAvg: 50, jitter: 10, lastPing: 0, off: null, late: 0, lastArrive: 0, lastF: null, lastK: null };
let pred = null;
// 주소 끝에 ?debug 를 붙이면 연결 상태를 화면에 보여 준다.
const debug = { on: /[?&]debug/.test(location.search), err: 0, snaps: 0, fps: 60, bytes: 0 };    // 내 기차는 내 폰에서 먼저 움직이고, 서버 위치에 조금씩 맞춘다

function connect(onReady, onFail) {
  let settled = false;
  let ws;
  try { ws = new WebSocket(SERVER.replace(/^http/, 'ws') + '/ws?room=' + net.room); } catch (e) { onFail(); return; }
  net.ws = ws;
  const timer = setTimeout(() => { if (!settled) { settled = true; try { ws.close(); } catch (e) {} onFail(); } }, 10000);
  ws.onopen = () => { if (settled) return; settled = true; clearTimeout(timer); onReady(); };
  ws.onerror = () => { if (!settled) { settled = true; clearTimeout(timer); onFail(); } };
  ws.onclose = () => {
    if (!settled) { settled = true; clearTimeout(timer); onFail(); return; }
    if (net.ws !== ws) return;
    net.ws = null;
    if (net.full) return;
    if (state === 'play' || state === 'dying') lostConnection();
  };
  ws.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch (err) { return; }
    onServer(m, e.data);
  };
}

function sendNet(obj) {
  if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(obj));
}

function sendView() {
  const zMin = baseZoom * 0.7;
  sendNet({ t: 'view', hw: Math.round(vw / 2 / zMin + 80), hh: Math.round(vh / 2 / zMin + 80) });
}

function onServer(m, e) {
  if (m.t === 'closed') {
    // 이번 달 같이 하기 서버가 쉬는 중: 컴퓨터 냥이와 혼자 논다
    net.full = true;
    $('mode-note').textContent = '😴 이번 달 같이 하기는 쉬어요. 컴퓨터 냥이와 놀아요';
    startLocal();
    floats.push({ text: '이번 달 같이 하기는 쉬어요. 컴퓨터 냥이와 놀아요', t: -2.5, screen: true });
  } else if (m.t === 'full') {
    // 방이 꽉 찼으면 다음 방으로
    net.full = true;
    net.room++;
    if (net.room > 5) { startLocal(); return; }
    connect(() => { net.full = false; joinOnline(false); }, startLocal);
  } else if (m.t === 'joined') {
    net.meId = m.id;
    net.snaps = [];
    net.off = null;
    net.late = 0;
    net.lastF = null;
    net.lastK = null;
    net.gotFirst = false;
    net.lastLen = 0;
    net.lastA = 99;
    pred = null;
    net.lastPing = 0;
    hintUntil = clock + 4;
  } else if (m.t === 'where') {
    net.edge = m.edge; net.server = m.server;
  } else if (m.t === 'pong') {
    net.srvGap = m.g || 0;
    const rtt = performance.now() - m.c;
    if (rtt >= 0 && rtt < 5000) net.rtt += (rtt - net.rtt) * 0.3;
  } else if (m.t === 's') {
    debug.bytes += ((e && e.length) || 0);
    const arrive = performance.now();
    // 간식·아기냥은 가끔만 오니, 안 온 판에는 앞에 받은 것을 그대로 쓴다.
    if (m.f) net.lastF = m.f; else m.f = net.lastF || [];
    if (m.k) net.lastK = m.k; else m.k = net.lastK || [];
    // 서버가 그 모습을 만든 시각(st)으로 줄을 세운다. 인터넷이 잠깐 막혔다 몰려 와도 간격이 고르게 유지된다.
    const st = typeof m.st === 'number' ? m.st : arrive;
    const off = arrive - st;
    if (net.off == null || off < net.off) net.off = off; else net.off += 0.3;
    const late = off - net.off;
    net.late += (late - net.late) * (late > net.late ? 0.3 : 0.02);
    if (net.snaps.length) {
      const gap = arrive - net.lastArrive;
      net.gapAvg += (gap - net.gapAvg) * 0.1;
      net.jitter += (Math.abs(gap - net.gapAvg) - net.jitter) * 0.1;
    }
    net.lastArrive = arrive;
    interpMs = clamp(70 + net.late * 1.5, 70, 300);
    net.snaps.push({ at: st + net.off, d: m, map: new Map(m.tr.map((r) => [r[0], r])) });
    if (net.snaps.length > 10) net.snaps.shift();
    if (m.mm) net.mm = m.mm;
    net.hc = m.hc || 0;
    if (m.my) {
      if (!net.gotFirst) {
        // 처음 들어왔을 때는 서버가 정한 방향을 그대로 이어 간다.
        const meRow = net.snaps[net.snaps.length - 1].map.get(m.me);
        if (meRow) { input.a = meRow[3] / 100; net.lastA = input.a; }
      }
      if (net.gotFirst && m.my[1] > net.lastLen && state === 'play') {
        const meRow = net.snaps[net.snaps.length - 1].map.get(m.me);
        if (meRow) floats.push({ x: meRow[1] + 34, y: meRow[2] - 10, text: '+' + (m.my[1] - net.lastLen) + ' 냥', t: 0 });
      }
      net.lastLen = m.my[1];
      net.gotFirst = true;
      run.max = Math.max(run.max, m.my[1]);
    }
  } else if (m.t === 'ouch') {
    // 독버섯이나 양파를 먹었다
    const last = net.snaps[net.snaps.length - 1];
    const meRow = last && last.map.get(net.meId);
    if (meRow) floats.push({ x: meRow[1] + 34, y: meRow[2] - 10, text: ouchText(m.onion, m.n), t: 0 });
    net.lastLen = Math.max(0, net.lastLen - (m.n || 0));
  } else if (m.t === 'dead') {
    pred = null;
    onDead({ by: m.by, bot: m.bot, max: m.max, rank: m.rank, count: m.count, lived: m.lived, canCont: m.canCont, x: m.x, y: m.y, a: m.a / 100, fur: m.fur });
  }
}

function joinOnline(cont) {
  sendView();
  sendNet({ t: 'join', name: run.name, fur: run.fur, cont: !!cont });
}

// 받아 둔 서버 모습 두 장 사이를 이어서 지금 그릴 모습을 만든다.
function onlineScene() {
  const snaps = net.snaps;
  if (!snaps.length) return null;
  const t = performance.now() - interpMs;
  let a = snaps[0], b = snaps[0];
  const n = snaps.length;
  if (n >= 2 && t >= snaps[n - 1].at) {
    // 다음 정보가 늦으면 마지막 움직임대로 조금(최대 0.1초) 더 이어 간다.
    a = snaps[n - 2]; b = snaps[n - 1];
  } else {
    for (let i = n - 1; i >= 0; i--) {
      if (snaps[i].at <= t) { a = snaps[i]; b = snaps[Math.min(n - 1, i + 1)]; break; }
    }
  }
  const span = b.at - a.at;
  // 두 장 간격이 너무 짧으면 앞으로 늘이지 않는다 (줄이 길게 튀어 나가던 문제).
  const k = span >= 20 ? clamp((t - a.at) / span, 0, 1 + Math.min(100, span) / span) : span > 0 ? clamp((t - a.at) / span, 0, 1) : 1;
  const trains = [];
  for (const r of b.d.tr) {
    const p = a.map.get(r[0]);
    const tr = rowToTrain(r);
    if (p && p !== r) {
      const pa = p[3] / 100;
      tr.x = p[1] + (r[1] - p[1]) * k;
      tr.y = p[2] + (r[2] - p[2]) * k;
      tr.a = pa + angleTo(pa, tr.a) * k;
      const ps = p[9], rs = r[9];
      const n = Math.min(ps.length, rs.length);
      for (let i = 0; i < n; i += 2) {
        const s = tr.segs[i / 2];
        s.x = ps[i] + (rs[i] - ps[i]) * k;
        s.y = ps[i + 1] + (rs[i + 1] - ps[i + 1]) * k;
      }
    }
    segAngles(tr);
    trains.push(tr);
  }
  const d = b.d;
  const fish = [];
  for (let i = 0; i < d.f.length; i += 4) fish.push({ x: d.f[i], y: d.f[i + 1], v: d.f[i + 2], c: d.f[i + 3] });
  // 굴러다니는 양파: 마지막으로 받은 위치에서 속도대로 이어서 그린다
  const on = d.o || [], dts = (t - b.at) / 1000;
  for (let i = 0; i < on.length; i += 4) fish.push({ x: on[i] + on[i + 2] * dts, y: on[i + 1] + on[i + 3] * dts, v: -2, c: 6, vx: on[i + 2] });
  const kittens = [];
  for (let i = 0; i < d.k.length; i += 5) kittens.push({ x: d.k[i], y: d.k[i + 1], fur: FUR_KEYS[d.k[i + 2]], wild: d.k[i + 3] === 1, old: d.k[i + 3] === 2, a: d.k[i + 4] / 100, seed: d.k[i] * 0.37 + d.k[i + 1] * 0.11 });
  const me = d.me ? trains.find((x) => x.id === d.me) || null : null;
  if (me && pred && pred.id === me.id) {
    me.x = pred.x; me.y = pred.y; me.a = pred.a;
    me.segs = pred.segs.map((s) => ({ x: s.x, y: s.y, a: s.a }));
  }
  const mm = [];
  for (let i = 0; i < net.mm.length; i += 4) mm.push({ x: net.mm[i], y: net.mm[i + 1], len: net.mm[i + 2], id: net.mm[i + 3] });
  return {
    trains: trains, fish: fish, kittens: kittens, me: me,
    lb: d.lb.map((r) => ({ name: r[0], bot: !!r[1], len: r[2], id: r[3] })),
    my: d.my ? { rank: d.my[0], len: d.my[1], gauge: d.my[2] } : null,
    mm: mm, hc: net.hc,
  };
}

function rowToTrain(r) {
  const segs = [];
  for (let i = 0; i < r[9].length; i += 2) segs.push({ x: r[9][i], y: r[9][i + 1], a: 0 });
  const kids = [];
  for (const ch of r[8]) kids.push(FUR_KEYS[+ch] || 'orange');
  return {
    id: r[0], x: r[1], y: r[2], a: r[3] / 100, fur: FUR_KEYS[r[4]] || 'orange', scarf: SCARVES[r[5]] || SCARVES[1],
    bot: !!(r[6] & 1), dash: !!(r[6] & 2), invul: !!(r[6] & 4), crown: !!(r[6] & 8), name: r[7], kids: kids, segs: segs,
  };
}

function segAngles(t) {
  let px = t.x, py = t.y;
  for (const s of t.segs) { s.a = Math.atan2(py - s.y, px - s.x); px = s.x; py = s.y; }
}

function kidsOf(str) {
  const kids = [];
  for (const ch of str) kids.push(FUR_KEYS[+ch] || 'orange');
  return kids;
}

function makePred(row) {
  const p = { id: row[0], x: row[1], y: row[2], a: row[3] / 100, kids: kidsOf(row[8]), trail: [], segs: [], box: {}, hist: [], ex: 0, ey: 0, lastSnap: null };
  // 서버가 준 아기냥 자리를 꼬리 끝부터 머리까지 STEP 간격 경로로 펼친다.
  const pts = [];
  const sg = row[9];
  for (let i = sg.length - 2; i >= 0; i -= 2) pts.push({ x: sg[i], y: sg[i + 1] });
  pts.push({ x: p.x, y: p.y });
  if (pts.length === 1) pts.unshift({ x: p.x - Math.cos(p.a) * S.STEP, y: p.y - Math.sin(p.a) * S.STEP });
  p.trail.push(pts[0]);
  for (let i = 1; i < pts.length; i++) {
    const q0 = pts[i - 1], q1 = pts[i];
    const l = Math.hypot(q1.x - q0.x, q1.y - q0.y);
    const steps = Math.max(1, Math.round(l / S.STEP));
    for (let j = 1; j <= steps; j++) p.trail.push({ x: q0.x + (q1.x - q0.x) * j / steps, y: q0.y + (q1.y - q0.y) * j / steps });
  }
  S.ensureTrail(p);
  S.computeSegs(p);
  return p;
}

// 내 기차를 서버 응답을 기다리지 않고 바로 움직인다. 서버 위치와 벌어지면 조금씩 당겨 맞춘다.
function predStep(dt) {
  const last = net.snaps[net.snaps.length - 1];
  if (!last || !last.d.me || state !== 'play') { pred = null; return; }
  const row = last.map.get(last.d.me);
  if (!row) return;
  if (!pred || pred.id !== row[0]) { pred = makePred(row); return; }
  pred.kids = kidsOf(row[8]);
  S.ensureTrail(pred);
  const my = last.d.my;
  const dashing = input.dash && ((my && my[2] > 0) || pred.kids.length > START_LEN);
  const turn = S.TURN * dt * (dashing ? 0.8 : 1);
  pred.a += clamp(angleTo(pred.a, input.a), -turn, turn);
  const sp = S.SPEED * (dashing ? S.DASH : 1);
  pred.x += Math.cos(pred.a) * sp * dt;
  pred.y += Math.sin(pred.a) * sp * dt;
  const nowMs = performance.now();
  pred.hist.push({ t: nowMs, x: pred.x, y: pred.y });
  while (pred.hist.length > 2 && nowMs - pred.hist[0].t > 3000) pred.hist.shift();
  // 새 서버 정보가 오면, 그 정보는 '왕복 시간 전'의 내 조작으로 만든 위치이므로
  // 그때의 내 예측 위치와 비교해서 차이만 조금씩 고친다. (도는 중에도 끌려가지 않게)
  if (last !== pred.lastSnap) {
    pred.lastSnap = last;
    const then = last.at - net.rtt - 25;
    let h = pred.hist[0];
    for (const e of pred.hist) { if (e.t <= then) h = e; else break; }
    pred.ex = row[1] - h.x; pred.ey = row[2] - h.y;
    debug.err = Math.hypot(pred.ex, pred.ey);
    if (debug.err > 220) { pred = makePred(row); debug.snaps++; return; }
  }
  const f = Math.min(1, dt * 4);
  const cx = pred.ex * f, cy = pred.ey * f;
  pred.ex -= cx; pred.ey -= cy;
  pred.x += cx; pred.y += cy;
  for (const e of pred.hist) { e.x += cx; e.y += cy; }
  let lastP = pred.trail[pred.trail.length - 1];
  let dx = pred.x - lastP.x, dy = pred.y - lastP.y, l = Math.hypot(dx, dy);
  while (l >= S.STEP) {
    lastP = { x: lastP.x + dx / l * S.STEP, y: lastP.y + dy / l * S.STEP };
    pred.trail.push(lastP);
    dx = pred.x - lastP.x; dy = pred.y - lastP.y; l = Math.hypot(dx, dy);
  }
  const need = (pred.kids.length + 2) * S.gapIdx(pred);
  if (pred.trail.length > need + 80) pred.trail.splice(0, pred.trail.length - need);
  S.computeSegs(pred);
}

function onlineInput() {
  if (!scene || !scene.me || state !== 'play') return;
  const nowMs = performance.now();
  if (nowMs - net.lastSend < 70) return;
  if (Math.abs(angleTo(net.lastA, input.a)) > 0.03 || input.dash !== net.lastDash) {
    sendNet({ t: 'in', a: Math.round(input.a * 1000) / 1000, d: input.dash ? 1 : 0 });
    net.lastA = input.a; net.lastDash = input.dash; net.lastSend = nowMs;
  }
}

function lostConnection() {
  onDead({ lost: true, by: null, bot: false, max: run.max, rank: 0, count: 0, lived: 0, canCont: false, x: cam.x, y: cam.y, a: 0, fur: run.fur });
}

// ───── 그리기 ─────
const satProbe = document.createElement('div');
satProbe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none';
document.body.append(satProbe);
let safeTop = 0;
function resize() {
  safeTop = satProbe.offsetHeight || 0;
  vw = window.innerWidth; vh = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  baseZoom = clamp(Math.min(vw, vh * 0.62) / 400, 0.85, 1.35);
  if (mode === 'online') sendView();
}

function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function text(t, x, y, size, color, align, stroke) {
  ctx.font = size + 'px ' + FONT;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = stroke[1]; ctx.strokeStyle = stroke[0]; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); }
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}

function ouchText(onion, n) {
  return (onion ? '양파! 절반이 도망' : '독버섯!') + (n ? ' -' + n + ' 냥' : '');
}

function drawOnion(f) {
  // 독버섯보다 1.5배 크게, 구르는 방향으로 기울어 흔들린다
  const wob = Math.sin(clock * 9 + f.y * 0.1) * 0.25 + (f.vx || 0) * 0.004;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(wob);
  ctx.scale(1.3, 1.3);
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.beginPath(); ctx.ellipse(0, 8, 9, 3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#c86fb0';
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(13, -4, 9, 6); ctx.quadraticCurveTo(0, 12, -9, 6); ctx.quadraticCurveTo(-13, -4, 0, -14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(-5, -2, -2, 8); ctx.moveTo(0, -12); ctx.quadraticCurveTo(5, -2, 2, 8); ctx.stroke();
  ctx.strokeStyle = '#6fb04a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-3, -20); ctx.moveTo(0, -13); ctx.lineTo(3, -19); ctx.stroke();
  ctx.restore();
}

function drawMushroom(f) {
  const bob = Math.sin(clock * 2 + f.x) * 1.2;
  ctx.save();
  ctx.translate(f.x, f.y + bob);
  ctx.fillStyle = '#f3e6d0';
  ctx.fillRect(-3.5, -2, 7, 9);
  ctx.fillStyle = '#8e3fd1';
  ctx.beginPath(); ctx.ellipse(0, -2, 11, 8, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const [dx, dy, r] of [[-5, -5, 2], [3, -7, 1.6], [6, -3, 1.4]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 7); ctx.fill(); }
  ctx.restore();
}

function drawFish(f) {
  if (f.v === -2) { drawOnion(f); return; }
  if (f.v < 0) { drawMushroom(f); return; }
  const s = f.v > 1 ? 10 : 7;
  const rot = (f.x * 7.3 + f.y * 3.1) % 6.28;
  ctx.save();
  ctx.translate(f.x, f.y); ctx.rotate(rot + Math.sin(clock * 3 + rot) * 0.2);
  ctx.fillStyle = FISH_COLORS[f.c] || FISH_COLORS[0];
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.8, 0); ctx.lineTo(s * 1.5, -s * 0.5); ctx.lineTo(s * 1.5, s * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#234'; ctx.beginPath(); ctx.arc(-s * 0.5, -s * 0.1, s * 0.13, 0, 7); ctx.fill();
  ctx.restore();
}

// 기차마다 목걸이 색이 달라서, 줄이 길게 엉켜도 어느 대장 냥이의 아기냥인지 알 수 있다
const TAIL_COLORS = ['#ff4d4d', '#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48'];
function tailColor(t) { return TAIL_COLORS[(t.id * 7) % TAIL_COLORS.length]; }

// 목에 두르는 목걸이 (진행 방향 a, 반지름 r)
function drawCollar(x, y, r, a, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, r * 0.85, r * 0.78, r * 0.24, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(0, r * 1.05, r * 0.14, 0, 7); ctx.fill();
  ctx.restore();
}

function drawTrain(t) {
  const r = headR(t), kr = r * 0.74;
  if (t.invul && Math.floor(clock * 8) % 2 === 0) ctx.globalAlpha = 0.45;
  const segs = t.segs;
  const tc = tailColor(t);
  if (segs.length) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = r * 0.45; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(t.x, t.y);
    for (const s of segs) ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const face = (i + Math.floor(clock * 0.7)) % 4 === 0 ? 'happy' : 'normal';
    drawCollar(s.x, s.y, kr, s.a, tc);
    drawSprite((sprites[t.kids[i]] || sprites.orange)[face], s.x, s.y, kr, s.a);
  }
  ctx.save();
  ctx.translate(t.x, t.y); ctx.rotate(t.a + Math.PI / 2);
  ctx.fillStyle = tc;
  ctx.beginPath(); ctx.ellipse(0, r * 0.85, r * 0.78, r * 0.24, 0, 0, 7); ctx.fill();
  ctx.restore();
  drawSprite(sprites[t.fur].normal, t.x, t.y, r, t.a);
  if (t.crown) {
    ctx.save();
    ctx.translate(t.x, t.y); ctx.rotate(t.a + Math.PI / 2);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.8); ctx.lineTo(-r * 0.45, -r * 1.3); ctx.lineTo(-r * 0.2, -r * 1.05);
    ctx.lineTo(0, -r * 1.4); ctx.lineTo(r * 0.2, -r * 1.05); ctx.lineTo(r * 0.45, -r * 1.3); ctx.lineTo(r * 0.45, -r * 0.8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#5c9a59';
  ctx.fillRect(0, 0, vw, vh);
  if (!scene) return;
  const z = cam.z;
  ctx.save();
  ctx.translate(vw / 2, vh / 2); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
  const L = cam.x - vw / 2 / z - 40, R = cam.x + vw / 2 / z + 40, T = cam.y - vh / 2 / z - 40, B = cam.y + vh / 2 / z + 40;
  const inView = (x, y) => x > L && x < R && y > T && y < B;
  ctx.fillStyle = groundTile;
  ctx.fillRect(Math.max(0, L), Math.max(0, T), Math.min(WORLD, R) - Math.max(0, L), Math.min(WORLD, B) - Math.max(0, T));
  ctx.strokeStyle = '#a0683a'; ctx.lineWidth = 10; ctx.strokeRect(-5, -5, WORLD + 10, WORLD + 10);
  ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 4; ctx.setLineDash([18, 14]); ctx.strokeRect(-5, -5, WORLD + 10, WORLD + 10); ctx.setLineDash([]);

  for (const f of scene.fish) if (inView(f.x, f.y)) drawFish(f);
  for (const k of scene.kittens) {
    if (!inView(k.x, k.y)) continue;
    ctx.globalAlpha = k.old ? (Math.floor(clock * 6) % 2 ? 0.3 : 0.8) : 1;
    drawSprite(sprites[k.fur].normal, k.x, k.y, 10, k.a + Math.sin(clock * 2 + k.seed) * 0.2);
    ctx.globalAlpha = 1;
    if (k.wild && Math.floor(clock / 1.5 + k.seed) % 3 === 0) {
      ctx.fillStyle = '#fff'; rrect(k.x + 8, k.y - 26, 24, 15, 7); ctx.fill();
      text('냥?', k.x + 20, k.y - 18.5, 10, '#c06');
    }
  }
  const me = scene.me;
  for (const t of scene.trains) {
    if (t === me) continue;
    if (inView(t.x, t.y) || t.segs.some((s) => inView(s.x, s.y))) drawTrain(t);
  }
  if (me) drawTrain(me);
  for (const t of scene.trains) {
    if (!inView(t.x, t.y)) continue;
    const label = t.bot ? '🤖 ' + t.name : t.name;
    // 다른 사람 이름은 노란색으로 컴퓨터 냥이와 구분한다.
    const color = t === me || t.bot ? '#fff' : '#fff6a8';
    text(label, t.x, t.y - headR(t) * 1.9, 12 / z + 2, color, 'center', ['rgba(0,0,0,.5)', 3.5]);
  }
  if (death && (state === 'dying' || state === 'result')) {
    drawSprite(sprites[death.fur].dizzy, death.x, death.y, 16, death.a);
    if (state === 'dying') text(death.lost ? '앗!' : '쿵!', death.x, death.y - 40, 28, '#fff', 'center', ['#b4500a', 5]);
  }
  for (const f of floats) {
    if (f.t < 0) continue;
    ctx.globalAlpha = 1 - f.t / 0.9;
    text(f.text, f.x, f.y - f.t * 40, 16, '#fff', 'center', ['#e36d0e', 4]);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (state === 'play' || state === 'dying') drawHud();
}

function drawHud() {
  const top = 12 + safeTop;
  const my = scene.my;
  ctx.fillStyle = 'rgba(255,255,255,.9)'; rrect(12, top, 150, 62, 16); ctx.fill();
  drawSprite(sprites.cream.happy, 38, top + 30, 13, -Math.PI / 2);
  text('아기냥', 60, top + 15, 13, '#8a4a12', 'left');
  text((my ? my.len : 0) + '마리', 60, top + 36, 22, '#e36d0e', 'left');
  for (let i = 0; i < GAUGE_MAX; i++) {
    ctx.fillStyle = my && i < my.gauge ? '#7ec8e3' : '#e8dccd';
    ctx.beginPath(); ctx.arc(64 + i * 14, top + 53, 4.5, 0, 7); ctx.fill();
  }
  if (mode === 'online') {
    ctx.fillStyle = 'rgba(255,255,255,.85)'; rrect(12, top + 68, 150, 24, 12); ctx.fill();
    text('👥 지금 ' + scene.hc + '명 놀이 중', 87, top + 80, 12.5, '#2f7a3f');
  }
  // 순위
  const w = 150, x0 = vw - w - 12;
  const rows = scene.lb;
  const meId = scene.me ? scene.me.id : -1;
  const inTop = rows.some((r) => r.id === meId);
  const extra = my && !inTop ? 1 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.42)'; rrect(x0, top, w, 32 + (rows.length + extra) * 19, 14); ctx.fill();
  text(mode === 'online' ? '놀이터 순위' : '이번 판 순위', x0 + w / 2, top + 16, 13, '#ffd36e');
  const line = (r, n, y, mine) => {
    if (mine) { ctx.fillStyle = 'rgba(255,138,42,.75)'; rrect(x0 + 5, y - 9, w - 10, 18, 6); ctx.fill(); }
    let nm = (r.bot ? '🤖' : '') + r.name;
    if (nm.length > 7) nm = nm.slice(0, 7);
    text(n + '. ' + nm, x0 + 12, y, 12.5, '#fff', 'left');
    text(String(r.len), x0 + w - 10, y, 12.5, '#fff', 'right');
  };
  rows.forEach((r, i) => line(r, i + 1, top + 38 + i * 19, r.id === meId));
  if (extra) line({ name: scene.me ? scene.me.name : '나', bot: false, len: my.len }, my.rank, top + 38 + 5 * 19, true);
  // 지도
  const ms = 92, mx = 12, myy = vh - ms - 18;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rrect(mx, myy, ms, ms, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.stroke();
  for (const t of scene.mm) {
    const mine = t.id === meId;
    ctx.fillStyle = mine ? '#ff8a2a' : 'rgba(255,255,255,.75)';
    const rad = mine ? 4.5 : 2 + Math.min(3, t.len / 12);
    const px = mine && scene.me ? scene.me.x : t.x, py = mine && scene.me ? scene.me.y : t.y;
    ctx.beginPath(); ctx.arc(mx + 4 + px / WORLD * (ms - 8), myy + 4 + py / WORLD * (ms - 8), rad, 0, 7); ctx.fill();
  }
  if (clock < hintUntil && state === 'play') {
    ctx.globalAlpha = Math.min(1, hintUntil - clock);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; rrect(vw / 2 - 115, vh - 170, 230, 36, 18); ctx.fill();
    text('가고 싶은 쪽으로 손가락을 움직여요', vw / 2, vh - 152, 13.5, '#8a4a12');
    ctx.globalAlpha = 1;
  }
  for (const f of floats) {
    if (f.t >= 0 || !f.screen) continue;
    text(f.text, vw / 2, vh / 2 - 120, 16, '#fff', 'center', ['rgba(0,0,0,.55)', 4]);
  }
  if (debug.on && mode === 'online') {
    const lines = [
      '왕복 ' + Math.round(net.rtt) + 'ms (' + (net.edge || '?') + '→' + (net.server || '?') + ')',
      '서버 박자 최대 ' + Math.round(net.srvGap || 0) + 'ms',
      '정보 간격 ' + Math.round(net.gapAvg) + 'ms ±' + Math.round(net.jitter) + ' 늦음 ' + Math.round(net.late),
      '보여주기 지연 ' + Math.round(interpMs) + 'ms',
      '화면 ' + Math.round(debug.fps) + 'fps',
      '내 위치 차이 ' + Math.round(debug.err) + ' (맞춤 ' + debug.snaps + '회)',
      '받는 양 ' + Math.round(debug.kbps) + 'KB/s',
    ];
    ctx.fillStyle = 'rgba(0,0,0,.6)'; rrect(vw / 2 - 110, vh - 300, 220, lines.length * 18 + 10, 8); ctx.fill();
    lines.forEach((l, i) => text(l, vw / 2, vh - 286 + i * 18, 12, '#fff'));
  }
  if (state === 'play' && !scene.me && mode === 'online') {
    text('놀이터에 들어가는 중…', vw / 2, vh / 2, 20, '#fff', 'center', ['rgba(0,0,0,.5)', 4]);
  }
}

// ───── 조작 ─────
const input = { a: 0, dash: false, keyTurn: 0, keys: {}, steer: null, mouseDash: false };

function steerTo(clientX, clientY) {
  const me = scene && scene.me;
  if (!me) return;
  const hx = vw / 2 + (me.x - cam.x) * cam.z, hy = vh / 2 + (me.y - cam.y) * cam.z;
  const dx = clientX - hx, dy = clientY - hy;
  if (dx * dx + dy * dy > 64) input.a = Math.atan2(dy, dx);
}
// 휴대폰: 화면을 두 번 톡톡 치고 그대로 누르고 있으면 달리기, 손을 떼면 멈춘다.
let lastTap = { t: -9, x: 0, y: 0 };
let tapDashPointer = null;
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'play') return;
  input.steer = e.pointerId;
  steerTo(e.clientX, e.clientY);
  if (e.pointerType === 'mouse' && e.button === 0) input.mouseDash = true;
  if (e.pointerType !== 'mouse') {
    const now = performance.now();
    if (now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 60) tapDashPointer = e.pointerId;
    lastTap = { t: now, x: e.clientX, y: e.clientY };
  }
  syncDash();
});
canvas.addEventListener('pointermove', (e) => {
  if (state !== 'play') return;
  if (e.pointerType === 'mouse' || e.pointerId === input.steer) steerTo(e.clientX, e.clientY);
});
const endSteer = (e) => { if (e.pointerId === input.steer) input.steer = null; if (e.pointerId === tapDashPointer) tapDashPointer = null; if (e.pointerType === 'mouse') input.mouseDash = false; syncDash(); };
canvas.addEventListener('pointerup', endSteer);
canvas.addEventListener('pointercancel', endSteer);


function syncDash() {
  input.dash = tapDashPointer !== null || !!input.keys[' '] || !!input.mouseDash;
}
window.addEventListener('keydown', (e) => {
  if (state !== 'play') return;
  if (['ArrowLeft', 'ArrowRight', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  input.keys[e.key] = true;
  input.keyTurn = (input.keys.ArrowRight ? 1 : 0) - (input.keys.ArrowLeft ? 1 : 0);
  syncDash();
});
window.addEventListener('keyup', (e) => {
  input.keys[e.key] = false;
  input.keyTurn = (input.keys.ArrowRight ? 1 : 0) - (input.keys.ArrowLeft ? 1 : 0);
  syncDash();
});

// ───── 시작 화면 ─────
const startEl = $('start');
const nameEl = $('name');
const fursEl = $('furs');
const goBtn = $('go');
let chosenFur = load(FUR_KEY, 'orange');
if (!PICK_FURS.includes(chosenFur)) chosenFur = 'orange';
PICK_FURS.forEach((fur) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', { orange: '치즈', gray: '회색', white: '흰색', black: '검정', calico: '삼색' }[fur]);
  b.style.backgroundImage = 'url(' + sprites[fur].normal.toDataURL() + ')';
  b.addEventListener('click', () => { chosenFur = fur; save(FUR_KEY, fur); paintFurs(); });
  b.dataset.fur = fur;
  fursEl.append(b);
});
function paintFurs() {
  for (const b of fursEl.children) b.setAttribute('aria-checked', String(b.dataset.fur === chosenFur));
}
paintFurs();
nameEl.value = load(NAME_KEY, '');
if (SERVER) $('mode-note').hidden = false;

function beginPlay() {
  startEl.hidden = true;
  state = 'play';
  tapDashPointer = null; input.mouseDash = false; input.keys = {}; input.keyTurn = 0; syncDash();
  hintUntil = clock + 4;
  death = null;
}

function startLocal() {
  mode = 'local';
  if (net.ws) { const ws = net.ws; net.ws = null; try { ws.close(); } catch (e) {} }
  goBtn.disabled = false; goBtn.textContent = '출발!';
  local = S.createWorld();
  localJoin(false);
  beginPlay();
}

function newRun(name, fur) {
  run = { name: name, fur: fur, max: 0, lived: 0, joinedAt: 0, continued: false, lastKids: null };
}

function startRun() {
  let name = nameEl.value.replace(/\s+/g, ' ').trim().slice(0, 8);
  if (name) save(NAME_KEY, name); else name = '나';
  newRun(name, chosenFur);
  if (!SERVER) { startLocal(); return; }
  state = 'connecting';
  goBtn.disabled = true;
  goBtn.textContent = '연결 중…';
  net.room = 1;
  net.full = false;
  connect(() => {
    goBtn.disabled = false; goBtn.textContent = '출발!';
    mode = 'online';
    joinOnline(false);
    beginPlay();
  }, () => {
    // 서버에 못 붙으면 혼자 하기로
    startLocal();
    floats.push({ text: '연결이 안 돼서 컴퓨터 냥이들과 놀아요', t: -2.5, screen: true });
  });
}
goBtn.addEventListener('click', startRun);
nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); startRun(); } });

// ───── 결과 창 ─────
const dialog = $('result');
const resultCat = $('result-cat').getContext('2d');

function fmtTime(sec) {
  const s = Math.floor(sec);
  return Math.floor(s / 60) + '분 ' + (s % 60) + '초';
}

function onDead(info) {
  if (state !== 'play') return;
  death = info;
  state = 'dying';
  setTimeout(() => showResult(info), 1300);
}

function showResult(info) {
  state = 'result';
  run.max = Math.max(run.max, info.max || 0);
  let title;
  if (info.lost) title = '앗! 놀이터 연결이 끊겼어요';
  else if (info.by) title = '쿵! ' + (info.bot ? '🤖 ' : '') + info.by + ' 기차에 부딪혔어요';
  else title = '쿵! 울타리에 부딪혔어요';
  $('result-title').textContent = title;
  resultCat.clearRect(0, 0, 160, 160);
  resultCat.drawImage(sprites[run.fur].dizzy, 16, 10, 128, 128);
  $('stat-len').textContent = run.max + '마리';
  $('stat-rank').textContent = info.rank ? info.rank + '등 / ' + info.count : '-';
  $('stat-time').textContent = info.lived ? fmtTime(info.lived) : '-';
  const best = Number(load(BEST_KEY, '0')) || 0;
  const bestEl = $('result-best');
  if (run.max > best) {
    save(BEST_KEY, String(run.max));
    bestEl.textContent = '🎉 내 최고 기록 갱신! ' + run.max + '마리';
    bestEl.className = 'result-best new';
  } else {
    bestEl.textContent = '내 최고 기록 ' + best + '마리';
    bestEl.className = 'result-best';
  }
  $('continue-btn').hidden = !info.canCont;
  dialog.returnValue = '';
  dialog.showModal();
}

dialog.addEventListener('close', () => {
  if (state !== 'result') return;
  const cont = dialog.returnValue === 'continue' && !run.continued;
  // 이어하기는 나중에 보상형 광고를 붙일 자리. 지금은 한 판에 한 번 그냥 이어 할 수 있다.
  if (cont) run.continued = true;
  else newRun(run.name, run.fur);
  if (mode === 'online') {
    if (net.ws && net.ws.readyState === 1) {
      joinOnline(cont);
      beginPlay();
    } else {
      startRun();
    }
  } else {
    localJoin(cont);
    beginPlay();
  }
});
dialog.addEventListener('cancel', (e) => { e.preventDefault(); });

// ───── 반복 ─────
let lastT = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  clock += dt;
  if (dt > 0) debug.fps += (1 / dt - debug.fps) * 0.05;
  if (t - (debug.kbT || 0) > 1000) { debug.kbps = debug.bytes / 1024 / ((t - (debug.kbT || t - 1000)) / 1000); debug.bytes = 0; debug.kbT = t; }
  if (input.keyTurn) input.a += input.keyTurn * 3.2 * dt;
  if (mode === 'local' || state === 'menu' || state === 'connecting') {
    if (!document.hidden && state !== 'result') localStep(dt);
    scene = localScene();
  } else {
    onlineInput();
    predStep(dt);
    if (t - net.lastPing > 2000) { net.lastPing = t; sendNet({ t: 'ping', c: performance.now() }); }
    scene = onlineScene() || scene;
  }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 0.9) floats.splice(i, 1); }
  // 카메라
  let fx = cam.x, fy = cam.y, len = START_LEN;
  if (scene && scene.me && state === 'play') { fx = scene.me.x; fy = scene.me.y; len = scene.me.kids.length; }
  else if (death && (state === 'dying' || state === 'result')) { fx = death.x; fy = death.y; }
  else if (state === 'menu' && scene) {
    if (!menuTarget || !scene.trains.some((x) => x.id === menuTarget)) menuTarget = scene.trains.length ? scene.trains[0].id : null;
    const mt = scene.trains.find((x) => x.id === menuTarget);
    if (mt) { fx = mt.x; fy = mt.y; }
  }
  const k = Math.min(1, dt * 8);
  cam.x += (fx - cam.x) * k; cam.y += (fy - cam.y) * k;
  const wantZ = baseZoom * clamp(1.05 - len * 0.006, 0.7, 1.05);
  cam.z += (wantZ - cam.z) * Math.min(1, dt * 2);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
cam.z = baseZoom;
requestAnimationFrame(frame);

// 시험용: 자동 확인 스크립트가 상태를 들여다볼 수 있게 한다.
window.__cattrain = {
  get state() { return state; }, get mode() { return mode; }, get scene() { return scene; },
  get local() { return local; }, get localMe() { return localMe; }, get floats() { return floats; }, startRun,
};
