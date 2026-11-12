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
const INTERP_MS = 110;      // 서버 모습을 이만큼 늦게 보여 주며 사이를 부드럽게 잇는다

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
const net = { ws: null, room: 1, snaps: [], meId: 0, lastA: 99, lastDash: false, lastSend: 0, lastLen: 0, hc: 0, mm: [], gotFirst: false };

function connect(onReady, onFail) {
  let settled = false;
  let ws;
  try { ws = new WebSocket(SERVER.replace(/^http/, 'ws') + '/ws?room=' + net.room); } catch (e) { onFail(); return; }
  net.ws = ws;
  const timer = setTimeout(() => { if (!settled) { settled = true; try { ws.close(); } catch (e) {} onFail(); } }, 5000);
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
    onServer(m, ws);
  };
}

function sendNet(obj) {
  if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(obj));
}

function sendView() {
  const zMin = baseZoom * 0.7;
  sendNet({ t: 'view', hw: Math.round(vw / 2 / zMin + 80), hh: Math.round(vh / 2 / zMin + 80) });
}

function onServer(m) {
  if (m.t === 'full') {
    // 방이 꽉 찼으면 다음 방으로
    net.full = true;
    net.room++;
    if (net.room > 5) { startLocal(); return; }
    connect(() => { net.full = false; joinOnline(false); }, startLocal);
  } else if (m.t === 'joined') {
    net.meId = m.id;
    net.snaps = [];
    net.gotFirst = false;
    net.lastLen = 0;
    net.lastA = 99;
    hintUntil = clock + 4;
  } else if (m.t === 's') {
    net.snaps.push({ at: performance.now(), d: m, map: new Map(m.tr.map((r) => [r[0], r])) });
    if (net.snaps.length > 6) net.snaps.shift();
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
  } else if (m.t === 'dead') {
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
  const t = performance.now() - INTERP_MS;
  let a = snaps[0], b = snaps[0];
  for (let i = snaps.length - 1; i >= 0; i--) {
    if (snaps[i].at <= t) { a = snaps[i]; b = snaps[Math.min(snaps.length - 1, i + 1)]; break; }
  }
  const span = b.at - a.at;
  const k = span > 0 ? clamp((t - a.at) / span, 0, 1) : 1;
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
  const kittens = [];
  for (let i = 0; i < d.k.length; i += 5) kittens.push({ x: d.k[i], y: d.k[i + 1], fur: FUR_KEYS[d.k[i + 2]], wild: d.k[i + 3] === 1, old: d.k[i + 3] === 2, a: d.k[i + 4] / 100, seed: d.k[i] * 0.37 + d.k[i + 1] * 0.11 });
  const me = d.me ? trains.find((x) => x.id === d.me) || null : null;
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

function drawFish(f) {
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

function drawTrain(t) {
  const r = headR(t), kr = r * 0.74;
  if (t.invul && Math.floor(clock * 8) % 2 === 0) ctx.globalAlpha = 0.45;
  const segs = t.segs;
  if (segs.length) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = r * 0.45; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(t.x, t.y);
    for (const s of segs) ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const face = (i + Math.floor(clock * 0.7)) % 4 === 0 ? 'happy' : 'normal';
    drawSprite((sprites[t.kids[i]] || sprites.orange)[face], s.x, s.y, kr, s.a);
  }
  ctx.save();
  ctx.translate(t.x, t.y); ctx.rotate(t.a + Math.PI / 2);
  ctx.fillStyle = t.scarf;
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
  if (state === 'play' && !scene.me && mode === 'online') {
    text('놀이터에 들어가는 중…', vw / 2, vh / 2, 20, '#fff', 'center', ['rgba(0,0,0,.5)', 4]);
  }
}

// ───── 조작 ─────
const input = { a: 0, dash: false, keyTurn: 0, keys: {}, steer: null, mouseDash: false };
const dashBtn = $('dash');

function steerTo(clientX, clientY) {
  const me = scene && scene.me;
  if (!me) return;
  const hx = vw / 2 + (me.x - cam.x) * cam.z, hy = vh / 2 + (me.y - cam.y) * cam.z;
  const dx = clientX - hx, dy = clientY - hy;
  if (dx * dx + dy * dy > 64) input.a = Math.atan2(dy, dx);
}
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'play') return;
  input.steer = e.pointerId;
  steerTo(e.clientX, e.clientY);
  if (e.pointerType === 'mouse' && e.button === 0) input.mouseDash = true;
  syncDash();
});
canvas.addEventListener('pointermove', (e) => {
  if (state !== 'play') return;
  if (e.pointerType === 'mouse' || e.pointerId === input.steer) steerTo(e.clientX, e.clientY);
});
const endSteer = (e) => { if (e.pointerId === input.steer) input.steer = null; if (e.pointerType === 'mouse') input.mouseDash = false; syncDash(); };
canvas.addEventListener('pointerup', endSteer);
canvas.addEventListener('pointercancel', endSteer);

let dashPointer = null;
dashBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); dashPointer = e.pointerId; try { dashBtn.setPointerCapture(e.pointerId); } catch (err) {} syncDash(); });
const dashUp = (e) => { if (e.pointerId === dashPointer) dashPointer = null; syncDash(); };
dashBtn.addEventListener('pointerup', dashUp);
dashBtn.addEventListener('pointercancel', dashUp);
dashBtn.addEventListener('contextmenu', (e) => e.preventDefault());

function syncDash() {
  input.dash = dashPointer !== null || !!input.keys[' '] || !!input.mouseDash;
  dashBtn.classList.toggle('on', input.dash);
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
  dashBtn.hidden = false;
  dashPointer = null; input.mouseDash = false; input.keys = {}; input.keyTurn = 0; syncDash();
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
const ranking = window.Ranking ? window.Ranking.create('cattrain', $('ranking')) : { show() {} };
const resultCat = $('result-cat').getContext('2d');

function fmtTime(sec) {
  const s = Math.floor(sec);
  return Math.floor(s / 60) + '분 ' + (s % 60) + '초';
}

function onDead(info) {
  if (state !== 'play') return;
  death = info;
  state = 'dying';
  dashBtn.hidden = true;
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
  ranking.show(run.max);
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
  if (input.keyTurn) input.a += input.keyTurn * 3.2 * dt;
  if (mode === 'local' || state === 'menu' || state === 'connecting') {
    if (!document.hidden && state !== 'result') localStep(dt);
    scene = localScene();
  } else {
    onlineInput();
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
  get local() { return local; }, get localMe() { return localMe; }, startRun,
};
