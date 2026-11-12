// 냥이 털실 굴리기 화면. 게임 규칙은 sim.js에 있다.
// 같이 하기 서버(server-config.js의 주소)에 붙으면 다른 사람들과 한 놀이터에서 놀고,
// 서버가 없거나 연결이 안 되면 컴퓨터 냥이들과 혼자 논다.
import * as S from './sim.js';

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const FONT = '"Jua", -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const { WORLD, START_S, FUR_KEYS, PICK_FURS, YARN_KEYS, radius, fmtSize } = S;
const PICK_YARNS = [0, 1, 2, 3, 4];

const BEST_KEY = 'nyang-yarn-best';
const FUR_KEY = 'nyang-yarn-fur';
const COLOR_KEY = 'nyang-yarn-color';
const NAME_KEY = 'nyang-nickname';
const SERVER = String(window.YARN_SERVER || '').replace(/\/+$/, '');
let interpMs = 90;

const FURS = {
  orange: ['#f4a24c', '#d97a22'],
  gray: ['#9aa3ad', '#6f7882'],
  white: ['#fbf6ee', '#d8cfc2'],
  black: ['#3b3a40', '#22212a'],
  calico: ['#fbf6ee', '#e08a3c'],
  cream: ['#f3d9a8', '#d6b47a'],
};
// 털실 색: [바탕, 진한 줄, 밝은 줄]
const YARNS = {
  red: ['#ef5b5b', '#c23b3b', '#ff9a9a'],
  blue: ['#5a8dee', '#3a64c0', '#9dbcff'],
  mint: ['#3fc1a5', '#23907a', '#8be6d2'],
  yellow: ['#f7c23a', '#d39a14', '#ffe58a'],
  purple: ['#9b6be0', '#7446b8', '#c9a8ff'],
  pink: ['#f27ab0', '#c9508a', '#ffb3d6'],
};
const BIT_COLORS = YARN_KEYS.map((k) => YARNS[k][0]);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function angleTo(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function load(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
function save(key, v) { try { localStorage.setItem(key, v); } catch (e) {} }

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

// 고양이 얼굴을 (x, y)에 반지름 r로, 머리 위쪽이 방향 a를 보도록 그린다.
function drawSprite(img, x, y, r, a) {
  const s = r / SR;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a + Math.PI / 2);
  ctx.drawImage(img, -SPR / 2 * s, -(SPR / 2 + 6) * s, SPR * s, SPR * s);
  ctx.restore();
}

// ───── 털실뭉치 그림 (색마다 한 장, 굴러갈 때 돌려 그린다) ─────
const BR = 64;   // 그림 반지름
function makeYarn(col) {
  const [m, d, l] = YARNS[col];
  const c = document.createElement('canvas');
  c.width = c.height = BR * 2;
  const g = c.getContext('2d');
  g.translate(BR, BR);
  g.fillStyle = m;
  g.beginPath(); g.arc(0, 0, BR, 0, 7); g.fill();
  g.save();
  g.beginPath(); g.arc(0, 0, BR, 0, 7); g.clip();
  g.lineWidth = 3.4;
  g.globalAlpha = 0.75;
  for (let k = 0; k < 3; k++) {
    g.save();
    g.rotate(k * 2.1 + 0.4);
    for (let i = -4; i <= 4; i++) {
      g.strokeStyle = i % 2 ? d : l;
      g.beginPath(); g.ellipse(0, i * BR * 0.21, BR * 1.05, BR * 0.35, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
    }
    g.restore();
  }
  g.restore();
  return c;
}
const yarnImg = {};
for (const k of YARN_KEYS) yarnImg[k] = makeYarn(k);
const shadeImg = (function () {
  const c = document.createElement('canvas');
  c.width = c.height = BR * 2;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(BR * 0.6, BR * 0.55, BR * 0.1, BR, BR, BR * 1.1);
  gr.addColorStop(0, 'rgba(255,255,255,.45)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(0,0,0,.25)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(BR, BR, BR, 0, 7); g.fill();
  return c;
})();

// 실 조각 그림 (색마다 한 장)
const bitImg = [];
for (let c = 0; c < 7; c++) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 40;
  const g = cv.getContext('2d');
  g.translate(20, 20);
  g.lineCap = 'round';
  if (c === 6) {
    const cols = ['#ef5b5b', '#f7c23a', '#3fc1a5', '#5a8dee', '#9b6be0'];
    g.lineWidth = 3.2;
    cols.forEach((col, i) => { g.strokeStyle = col; g.beginPath(); g.arc(0, 0, 4 + i * 2.6, 0.3, 5.2); g.stroke(); });
  } else {
    g.strokeStyle = BIT_COLORS[c]; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(-10, 2); g.bezierCurveTo(-4, -8, 0, 10, 5, -1); g.quadraticCurveTo(8, -6, 11, -2); g.stroke();
  }
  bitImg.push(cv);
}

// 나무 마루 바닥
const floorTile = (function () {
  const c = document.createElement('canvas');
  c.width = 340; c.height = 276;
  const g = c.getContext('2d');
  const ph = 46;
  for (let j = 0; j < 6; j++) {
    g.fillStyle = j % 2 ? '#e3c196' : '#ebcfa8';
    g.fillRect(0, j * ph, 340, ph);
    g.strokeStyle = '#c9a274'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, j * ph); g.lineTo(340, j * ph); g.stroke();
    const off = (j % 3) * 113;
    for (const x of [off, off + 170]) { g.beginPath(); g.moveTo(x % 340, j * ph); g.lineTo(x % 340, (j + 1) * ph); g.stroke(); }
    g.strokeStyle = 'rgba(160,110,60,.18)'; g.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const y = j * ph + 9 + k * 13;
      g.beginPath(); g.moveTo(Math.random() * 340, y); g.quadraticCurveTo(Math.random() * 340, y + 4, Math.random() * 340, y); g.stroke();
    }
  }
  return ctx.createPattern(c, 'repeat');
})();

// ───── 상태 ─────
let mode = 'local';      // local(혼자) | online(같이 하기)
let state = 'menu';      // menu | connecting | play | dying | result
let local = S.createWorld();
let localMe = null;
let run = null;
let scene = null;
let cam = { x: WORLD / 2, y: WORLD / 2, z: 1 };
let vw = 0, vh = 0, dpr = 1, baseZoom = 1;
let hintUntil = 0;
let clock = 0;
let floats = [];
let death = null;
let menuTarget = null;
const rolls = new Map();   // 뭉치마다 굴러간 각도

// ───── 혼자 하기 ─────
function localScene() {
  const order = S.ranked(local);
  const top = order[0];
  const balls = local.balls.filter((b) => b.alive).map((b) => ({
    id: b.id, name: b.name, fur: b.fur, color: YARN_KEYS[b.color], bot: b.bot, x: b.x, y: b.y, a: b.a, s: b.s,
    boost: b.boostNow, invul: b.invul > 0, crown: b === top,
  }));
  const me = localMe && localMe.alive ? balls.find((b) => b.id === localMe.id) : null;
  const myIdx = me ? order.findIndex((b) => b.id === me.id) : -1;
  return {
    balls: balls, bits: local.bits, me: me,
    lb: order.slice(0, 5).map((b) => ({ name: b.name, bot: b.bot, s: b.s, id: b.id })),
    my: me ? { rank: myIdx + 1, s: me.s } : null,
    mm: balls.map((b) => ({ x: b.x, y: b.y, s: b.s, id: b.id, c: b.color })),
    hc: 1,
  };
}

function localStep(dt) {
  if (localMe && localMe.alive) {
    localMe.input.a = input.a;
    localMe.input.boost = input.boost;
  }
  S.step(local, dt);
  for (const ev of local.events) {
    if (ev.type === 'absorb' && ev.ball === localMe) {
      run.eaten++;
      floats.push({ x: localMe.x, y: localMe.y - radius(localMe.s) - 10, text: '꿀꺽! +' + fmtSize(ev.gain), t: 0 });
    }
    if (ev.type === 'dead' && ev.ball === localMe) {
      const b = localMe;
      run.max = Math.max(run.max, b.maxS);
      run.lived += local.now - run.joinedAt;
      S.removeBall(local, b);
      onDead({
        by: ev.by ? ev.by.name : null, bot: ev.by ? ev.by.bot : false, max: run.max, rank: ev.rank, count: ev.count,
        eaten: run.eaten, canCont: !run.continued && b.s >= START_S * 2, x: b.x, y: b.y, a: b.a, fur: b.fur, byColor: ev.by ? YARN_KEYS[ev.by.color] : null,
      });
      run.lastS = b.s;
      localMe = null;
    }
  }
  local.events.length = 0;
  if (localMe && localMe.alive) run.max = Math.max(run.max, localMe.maxS);
}

function localJoin(cont) {
  const s = cont && run.lastS ? Math.max(START_S, run.lastS / 2) : START_S;
  localMe = S.addPlayer(local, { name: run.name, fur: run.fur, color: run.color, s: s });
  run.joinedAt = local.now;
  input.a = localMe.a;
}

// ───── 같이 하기: 서버 연결 ─────
const net = { ws: null, room: 1, snaps: [], meId: 0, lastA: 99, lastBoost: false, lastSend: 0, hc: 0, mm: [], gotFirst: false, rtt: 150, lastPing: 0, off: null, late: 0, lastBits: null };
let pred = null;
const debug = { on: /[?&]debug/.test(location.search), err: 0, fixes: 0, fps: 60, bytes: 0, kbps: 0 };

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
    debug.bytes += e.data.length || 0;
    onServer(m);
  };
}

function sendNet(obj) {
  if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(obj));
}

function sendView() {
  const zMin = baseZoom * 0.55;
  sendNet({ t: 'view', hw: Math.round(vw / 2 / zMin + 100), hh: Math.round(vh / 2 / zMin + 100) });
}

function onServer(m) {
  if (m.t === 'closed') {
    net.full = true;
    $('mode-note').textContent = '😴 이번 달 같이 하기는 쉬어요. 컴퓨터 냥이와 놀아요';
    startLocal();
    floats.push({ text: '이번 달 같이 하기는 쉬어요. 컴퓨터 냥이와 놀아요', t: -2.5, screen: true });
  } else if (m.t === 'full') {
    net.full = true;
    net.room++;
    if (net.room > 5) { startLocal(); return; }
    connect(() => { net.full = false; joinOnline(false); }, startLocal);
  } else if (m.t === 'joined') {
    net.meId = m.id;
    net.snaps = [];
    net.off = null;
    net.late = 0;
    net.lastBits = null;
    net.gotFirst = false;
    net.lastA = 99;
    pred = null;
    net.lastPing = 0;
    hintUntil = clock + 4;
  } else if (m.t === 'pong') {
    const rtt = performance.now() - m.c;
    if (rtt >= 0 && rtt < 5000) net.rtt += (rtt - net.rtt) * 0.3;
  } else if (m.t === 's') {
    const arrive = performance.now();
    if (m.f) net.lastBits = m.f; else m.f = net.lastBits || [];
    const st = typeof m.st === 'number' ? m.st : arrive;
    const off = arrive - st;
    if (net.off == null || off < net.off) net.off = off; else net.off += 0.3;
    const late = off - net.off;
    net.late += (late - net.late) * (late > net.late ? 0.3 : 0.02);
    interpMs = clamp(70 + net.late * 1.5, 70, 300);
    net.snaps.push({ at: st + net.off, d: m, map: new Map(m.b.map((r) => [r[0], r])) });
    if (net.snaps.length > 10) net.snaps.shift();
    if (m.mm) net.mm = m.mm;
    net.hc = m.hc || 0;
    if (m.my) {
      if (!net.gotFirst) {
        const row = net.snaps[net.snaps.length - 1].map.get(m.me);
        if (row) { input.a = row[3] / 100; net.lastA = input.a; }
      }
      net.gotFirst = true;
      run.max = Math.max(run.max, m.my[1]);
    }
  } else if (m.t === 'gulp') {
    run.eaten++;
    const p = pred || (scene && scene.me);
    if (p) floats.push({ x: p.x, y: p.y - radius(p.s || START_S) - 10, text: '꿀꺽! +' + fmtSize(m.n), t: 0 });
  } else if (m.t === 'dead') {
    pred = null;
    onDead({ by: m.by, bot: m.bot, max: m.max, rank: m.rank, count: m.count, eaten: run.eaten, canCont: m.canCont, x: m.x, y: m.y, a: m.a / 100, fur: m.fur, byColor: m.bc });
  }
}

function joinOnline(cont) {
  sendView();
  sendNet({ t: 'join', name: run.name, fur: run.fur, color: run.color, cont: !!cont });
}

function rowToBall(r) {
  return {
    id: r[0], x: r[1], y: r[2], a: r[3] / 100, fur: FUR_KEYS[r[4]] || 'orange', color: YARN_KEYS[r[5]] || 'red',
    bot: !!(r[6] & 1), boost: !!(r[6] & 2), invul: !!(r[6] & 4), crown: !!(r[6] & 8), name: r[7], s: r[8],
  };
}

// 받아 둔 서버 모습 두 장 사이를 이어서 지금 그릴 모습을 만든다.
function onlineScene() {
  const snaps = net.snaps;
  if (!snaps.length) return null;
  const t = performance.now() - interpMs;
  let a = snaps[0], b = snaps[0];
  const n = snaps.length;
  if (n >= 2 && t >= snaps[n - 1].at) { a = snaps[n - 2]; b = snaps[n - 1]; }
  else {
    for (let i = n - 1; i >= 0; i--) {
      if (snaps[i].at <= t) { a = snaps[i]; b = snaps[Math.min(n - 1, i + 1)]; break; }
    }
  }
  const span = b.at - a.at;
  const k = span >= 20 ? clamp((t - a.at) / span, 0, 1 + Math.min(100, span) / span) : span > 0 ? clamp((t - a.at) / span, 0, 1) : 1;
  const balls = [];
  for (const r of b.d.b) {
    const p = a.map.get(r[0]);
    const ball = rowToBall(r);
    if (p && p !== r) {
      const pa = p[3] / 100;
      ball.x = p[1] + (r[1] - p[1]) * k;
      ball.y = p[2] + (r[2] - p[2]) * k;
      ball.a = pa + angleTo(pa, ball.a) * k;
      ball.s = p[8] + (r[8] - p[8]) * clamp(k, 0, 1);
    }
    balls.push(ball);
  }
  const d = b.d;
  const bits = [];
  for (let i = 0; i < d.f.length; i += 3) bits.push({ x: d.f[i], y: d.f[i + 1], c: d.f[i + 2] });
  const me = d.me ? balls.find((x) => x.id === d.me) || null : null;
  if (me && pred && pred.id === me.id) { me.x = pred.x; me.y = pred.y; me.a = pred.a; }
  const mm = [];
  for (let i = 0; i < net.mm.length; i += 5) mm.push({ x: net.mm[i], y: net.mm[i + 1], s: net.mm[i + 2], id: net.mm[i + 3], c: YARN_KEYS[net.mm[i + 4]] });
  return {
    balls: balls, bits: bits, me: me,
    lb: d.lb.map((r) => ({ name: r[0], bot: !!r[1], s: r[2], id: r[3] })),
    my: d.my ? { rank: d.my[0], s: d.my[1] } : null,
    mm: mm, hc: net.hc,
  };
}

// 내 뭉치는 서버 응답을 기다리지 않고 바로 움직인다. 서버 위치와 벌어지면 조금씩 당겨 맞춘다.
function predStep(dt) {
  const last = net.snaps[net.snaps.length - 1];
  if (!last || !last.d.me || state !== 'play') { pred = null; return; }
  const row = last.map.get(last.d.me);
  if (!row) return;
  if (!pred || pred.id !== row[0]) {
    pred = { id: row[0], x: row[1], y: row[2], a: row[3] / 100, s: row[8], hist: [], ex: 0, ey: 0, lastSnap: null };
    return;
  }
  pred.s = row[8];
  const boosting = input.boost && pred.s > START_S + 2;
  const turn = S.TURN * dt * clamp(S.speed(pred.s) / S.BASE_SPEED + 0.25, 0.6, 1);
  pred.a += clamp(angleTo(pred.a, input.a), -turn, turn);
  const sp = S.speed(pred.s) * (boosting ? S.BOOST : 1);
  const r = radius(pred.s);
  pred.x = clamp(pred.x + Math.cos(pred.a) * sp * dt, r, WORLD - r);
  pred.y = clamp(pred.y + Math.sin(pred.a) * sp * dt, r, WORLD - r);
  const nowMs = performance.now();
  pred.hist.push({ t: nowMs, x: pred.x, y: pred.y });
  while (pred.hist.length > 2 && nowMs - pred.hist[0].t > 3000) pred.hist.shift();
  if (last !== pred.lastSnap) {
    pred.lastSnap = last;
    const then = last.at - net.rtt - 25;
    let h = pred.hist[0];
    for (const e of pred.hist) { if (e.t <= then) h = e; else break; }
    pred.ex = row[1] - h.x; pred.ey = row[2] - h.y;
    debug.err = Math.hypot(pred.ex, pred.ey);
    if (debug.err > 220) { pred.x = row[1]; pred.y = row[2]; pred.a = row[3] / 100; pred.hist = []; pred.ex = pred.ey = 0; debug.fixes++; return; }
  }
  const f = Math.min(1, dt * 4);
  const cx = pred.ex * f, cy = pred.ey * f;
  pred.ex -= cx; pred.ey -= cy;
  pred.x += cx; pred.y += cy;
  for (const e of pred.hist) { e.x += cx; e.y += cy; }
}

function onlineInput() {
  if (!scene || !scene.me || state !== 'play') return;
  const nowMs = performance.now();
  if (nowMs - net.lastSend < 70) return;
  if (Math.abs(angleTo(net.lastA, input.a)) > 0.03 || input.boost !== net.lastBoost) {
    sendNet({ t: 'in', a: Math.round(input.a * 1000) / 1000, d: input.boost ? 1 : 0 });
    net.lastA = input.a; net.lastBoost = input.boost; net.lastSend = nowMs;
  }
}

function lostConnection() {
  onDead({ lost: true, by: null, bot: false, max: run.max, rank: 0, count: 0, eaten: run.eaten, canCont: false, x: cam.x, y: cam.y, a: 0, fur: run.fur });
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

function drawBit(f) {
  const rot = (f.x * 7.3 + f.y * 3.1) % 6.28;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(rot + (f.c === 6 ? clock * 1.5 : 0));
  ctx.drawImage(bitImg[f.c] || bitImg[0], -14, -14, 28, 28);
  ctx.restore();
}

// 뭉치가 굴러간 만큼 무늬를 돌린다.
function rollOf(b) {
  let r = rolls.get(b.id);
  if (!r) { r = { x: b.x, y: b.y, rot: Math.random() * 6, seen: clock }; rolls.set(b.id, r); }
  const d = Math.hypot(b.x - r.x, b.y - r.y);
  if (d < 200) r.rot += d / radius(b.s) * 0.8;
  r.x = b.x; r.y = b.y; r.seen = clock;
  return r.rot;
}

function drawBall(b, me) {
  const R = radius(b.s);
  const cr = clamp(R * 0.42 + 6, 12, 42);
  if (b.invul && Math.floor(clock * 8) % 2 === 0) ctx.globalAlpha = 0.5;
  const ca = Math.cos(b.a), sa = Math.sin(b.a);
  // 그림자
  ctx.fillStyle = 'rgba(60,30,10,.2)';
  ctx.beginPath(); ctx.ellipse(b.x + R * 0.1, b.y + R * 0.9, R * 0.95, R * 0.28, 0, 0, 7); ctx.fill();
  // 뭉치를 미는 냥이 (뭉치 뒤)
  const cx = b.x - ca * (R + cr * 0.55), cy = b.y - sa * (R + cr * 0.55);
  const bob = Math.sin(clock * (b.boost ? 22 : 12) + b.id) * cr * 0.06;
  drawSprite(sprites[b.fur] ? sprites[b.fur][b.boost ? 'happy' : 'normal'] : sprites.orange.normal, cx + ca * bob, cy + sa * bob, cr, b.a);
  const [fm] = FURS[b.fur] || FURS.orange;
  ctx.fillStyle = fm; ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    const px = b.x - ca * R * 0.92 - sa * s * cr * 0.5, py = b.y - sa * R * 0.92 + ca * s * cr * 0.5;
    ctx.beginPath(); ctx.ellipse(px, py, cr * 0.24, cr * 0.2, b.a, 0, 7); ctx.fill(); ctx.stroke();
  }
  // 뭉치
  const rot = rollOf(b);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.save();
  ctx.rotate(rot);
  ctx.drawImage(yarnImg[b.color] || yarnImg.red, -R, -R, R * 2, R * 2);
  ctx.restore();
  ctx.drawImage(shadeImg, -R, -R, R * 2, R * 2);
  ctx.strokeStyle = (YARNS[b.color] || YARNS.red)[1]; ctx.lineWidth = Math.max(1.5, R * 0.05);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
  ctx.restore();
  if (b.crown) {
    ctx.save();
    ctx.translate(b.x, b.y - R - 2);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5;
    const s = 12;
    ctx.beginPath();
    ctx.moveTo(-s, 0); ctx.lineTo(-s, -s * 1.1); ctx.lineTo(-s * 0.45, -s * 0.5); ctx.lineTo(0, -s * 1.3);
    ctx.lineTo(s * 0.45, -s * 0.5); ctx.lineTo(s, -s * 1.1); ctx.lineTo(s, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // 나보다 작은 뭉치는 초록, 큰 뭉치는 빨강 점선
  if (me && b !== me && !b.invul) {
    let ring = null;
    if (me.s >= b.s * S.EAT_RATIO) ring = 'rgba(40,190,90,.9)';
    else if (b.s >= me.s * S.EAT_RATIO) ring = 'rgba(230,40,40,.85)';
    if (ring) {
      ctx.strokeStyle = ring; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.arc(b.x, b.y, R + 7, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
  }
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(0, 0, vw, vh);
  if (!scene) return;
  const z = cam.z;
  ctx.save();
  ctx.translate(vw / 2, vh / 2); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
  const L = cam.x - vw / 2 / z - 40, R = cam.x + vw / 2 / z + 40, T = cam.y - vh / 2 / z - 40, B = cam.y + vh / 2 / z + 40;
  const inView = (x, y, pad) => x > L - pad && x < R + pad && y > T - pad && y < B + pad;
  ctx.fillStyle = floorTile;
  ctx.fillRect(Math.max(0, L), Math.max(0, T), Math.min(WORLD, R) - Math.max(0, L), Math.min(WORLD, B) - Math.max(0, T));
  ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 14; ctx.strokeRect(-7, -7, WORLD + 14, WORLD + 14);
  ctx.strokeStyle = '#f2e6d6'; ctx.lineWidth = 4; ctx.strokeRect(-2, -2, WORLD + 4, WORLD + 4);

  for (const f of scene.bits) if (inView(f.x, f.y, 0)) drawBit(f);
  const me = scene.me;
  // 작은 뭉치를 먼저, 큰 뭉치를 나중에 그려 큰 뭉치가 위에 오게 한다
  const list = scene.balls.filter((b) => inView(b.x, b.y, radius(b.s) * 1.8)).sort((a, b) => a.s - b.s);
  for (const b of list) drawBall(b, me);
  for (const b of list) {
    const label = b.bot ? '🤖 ' + b.name : b.name;
    const color = b === me || b.bot ? '#fff' : '#fff6a8';
    const R0 = radius(b.s);
    text(label, b.x, b.y - R0 - (b.crown ? 26 : 14), 12 / z + 2, color, 'center', ['rgba(0,0,0,.5)', 3.5]);
    if (R0 > 26) text(fmtSize(b.s), b.x, b.y, Math.min(26, R0 * 0.3) / Math.sqrt(z), '#fff', 'center', ['rgba(0,0,0,.45)', 3]);
  }
  if (death && (state === 'dying' || state === 'result')) {
    drawSprite(sprites[death.fur].dizzy, death.x, death.y, 18, -Math.PI / 2);
    if (state === 'dying') text(death.lost ? '앗!' : '돌돌돌…', death.x, death.y - 42, 26, '#fff', 'center', ['#a8325a', 5]);
  }
  for (const f of floats) {
    if (f.t < 0) continue;
    ctx.globalAlpha = 1 - f.t / 1.1;
    text(f.text, f.x, f.y - f.t * 40, 17, '#fff', 'center', ['#e0507f', 4]);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // 오래 안 보인 뭉치의 굴림 기록은 지운다
  if (rolls.size > 80) for (const [id, r] of rolls) if (clock - r.seen > 5) rolls.delete(id);
  if (state === 'play' || state === 'dying') drawHud();
}

function drawHud() {
  const top = 12 + safeTop;
  const my = scene.my;
  ctx.fillStyle = 'rgba(255,255,255,.92)'; rrect(12, top, 150, 58, 16); ctx.fill();
  ctx.save(); ctx.translate(38, top + 29); ctx.rotate(clock * 0.8);
  ctx.drawImage(yarnImg[YARN_KEYS[run ? run.color : 0]], -15, -15, 30, 30); ctx.restore();
  ctx.drawImage(shadeImg, 23, top + 14, 30, 30);
  text('내 털실뭉치', 62, top + 16, 12.5, '#8a3a5a', 'left');
  text(my ? fmtSize(my.s) : '-', 62, top + 38, 22, '#e0507f', 'left');
  let y2 = top + 64;
  if (mode === 'online') {
    ctx.fillStyle = 'rgba(255,255,255,.85)'; rrect(12, y2, 150, 24, 12); ctx.fill();
    text('👥 지금 ' + scene.hc + '명 놀이 중', 87, y2 + 12, 12.5, '#8a3a5a');
    y2 += 30;
  }
  if (clock < hintUntil + 4 && state === 'play') {
    ctx.fillStyle = 'rgba(255,255,255,.75)'; rrect(12, y2, 150, 24, 12); ctx.fill();
    text('🐢 클수록 느려져요', 87, y2 + 12, 12.5, '#8a3a5a');
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
    if (mine) { ctx.fillStyle = 'rgba(255,111,159,.85)'; rrect(x0 + 5, y - 9, w - 10, 18, 6); ctx.fill(); }
    let nm = (r.bot ? '🤖' : '') + r.name;
    if (nm.length > 6) nm = nm.slice(0, 6);
    text(n + '. ' + nm, x0 + 11, y, 12.5, '#fff', 'left');
    text(fmtSize(r.s), x0 + w - 9, y, 12, '#fff', 'right');
  };
  rows.forEach((r, i) => line(r, i + 1, top + 38 + i * 19, r.id === meId));
  if (extra) line({ name: scene.me ? scene.me.name : '나', bot: false, s: my.s }, my.rank, top + 38 + 5 * 19, true);
  // 지도
  const ms = 92, mx = 12, myy = vh - ms - 18;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rrect(mx, myy, ms, ms, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.stroke();
  for (const b of scene.mm) {
    const mine = b.id === meId;
    const px = mine && scene.me ? scene.me.x : b.x, py = mine && scene.me ? scene.me.y : b.y;
    const rad = clamp(radius(b.s) / WORLD * (ms - 8) * 1.6, 2, 9);
    ctx.fillStyle = (YARNS[b.c] || YARNS.red)[0];
    ctx.beginPath(); ctx.arc(mx + 4 + px / WORLD * (ms - 8), myy + 4 + py / WORLD * (ms - 8), mine ? Math.max(rad, 4.5) : rad, 0, 7); ctx.fill();
    if (mine) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  if (clock < hintUntil && state === 'play') {
    ctx.globalAlpha = Math.min(1, hintUntil - clock);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; rrect(vw / 2 - 115, vh - 170, 230, 36, 18); ctx.fill();
    text('가고 싶은 쪽으로 손가락을 움직여요', vw / 2, vh - 152, 13.5, '#8a3a5a');
    ctx.globalAlpha = 1;
  }
  for (const f of floats) {
    if (f.t >= 0 || !f.screen) continue;
    text(f.text, vw / 2, vh / 2 - 120, 16, '#fff', 'center', ['rgba(0,0,0,.55)', 4]);
  }
  if (debug.on && mode === 'online') {
    const lines = [
      '왕복 ' + Math.round(net.rtt) + 'ms', '보여주기 지연 ' + Math.round(interpMs) + 'ms',
      '화면 ' + Math.round(debug.fps) + 'fps', '내 위치 차이 ' + Math.round(debug.err) + ' (맞춤 ' + debug.fixes + '회)',
      '받는 양 ' + Math.round(debug.kbps) + 'KB/s',
    ];
    ctx.fillStyle = 'rgba(0,0,0,.6)'; rrect(vw / 2 - 110, vh - 270, 220, lines.length * 18 + 10, 8); ctx.fill();
    lines.forEach((l, i) => text(l, vw / 2, vh - 256 + i * 18, 12, '#fff'));
  }
  if (state === 'play' && !scene.me && mode === 'online') {
    text('놀이터에 들어가는 중…', vw / 2, vh / 2, 20, '#fff', 'center', ['rgba(0,0,0,.5)', 4]);
  }
}

// ───── 조작 ─────
const input = { a: 0, boost: false, keyTurn: 0, keys: {}, steer: null, mouseBoost: false };
const boostBtn = $('boost');

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
  if (e.pointerType === 'mouse' && e.button === 0) input.mouseBoost = true;
  syncBoost();
});
canvas.addEventListener('pointermove', (e) => {
  if (state !== 'play') return;
  if (e.pointerType === 'mouse' || e.pointerId === input.steer) steerTo(e.clientX, e.clientY);
});
const endSteer = (e) => { if (e.pointerId === input.steer) input.steer = null; if (e.pointerType === 'mouse') input.mouseBoost = false; syncBoost(); };
canvas.addEventListener('pointerup', endSteer);
canvas.addEventListener('pointercancel', endSteer);

let boostPointer = null;
boostBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); boostPointer = e.pointerId; try { boostBtn.setPointerCapture(e.pointerId); } catch (err) {} syncBoost(); });
const boostUp = (e) => { if (e.pointerId === boostPointer) boostPointer = null; syncBoost(); };
boostBtn.addEventListener('pointerup', boostUp);
boostBtn.addEventListener('pointercancel', boostUp);
boostBtn.addEventListener('contextmenu', (e) => e.preventDefault());

function syncBoost() {
  input.boost = boostPointer !== null || !!input.keys[' '] || !!input.mouseBoost;
  boostBtn.classList.toggle('on', input.boost);
}
window.addEventListener('keydown', (e) => {
  if (state !== 'play') return;
  if (['ArrowLeft', 'ArrowRight', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  input.keys[e.key] = true;
  input.keyTurn = (input.keys.ArrowRight ? 1 : 0) - (input.keys.ArrowLeft ? 1 : 0);
  syncBoost();
});
window.addEventListener('keyup', (e) => {
  input.keys[e.key] = false;
  input.keyTurn = (input.keys.ArrowRight ? 1 : 0) - (input.keys.ArrowLeft ? 1 : 0);
  syncBoost();
});

// ───── 시작 화면 ─────
const startEl = $('start');
const nameEl = $('name');
const fursEl = $('furs');
const yarnsEl = $('yarns');
const goBtn = $('go');
let chosenFur = load(FUR_KEY, 'orange');
if (!PICK_FURS.includes(chosenFur)) chosenFur = 'orange';
let chosenColor = Number(load(COLOR_KEY, '0')) || 0;
if (!PICK_YARNS.includes(chosenColor)) chosenColor = 0;
PICK_FURS.forEach((fur) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', { orange: '치즈', gray: '회색', white: '흰색', black: '검정', calico: '삼색' }[fur]);
  b.style.backgroundImage = 'url(' + sprites[fur].normal.toDataURL() + ')';
  b.addEventListener('click', () => { chosenFur = fur; save(FUR_KEY, fur); paintPicks(); });
  b.dataset.fur = fur;
  fursEl.append(b);
});
const yarnPreview = (function () {
  const out = {};
  for (const i of PICK_YARNS) {
    const c = document.createElement('canvas');
    c.width = c.height = BR * 2;
    const g = c.getContext('2d');
    g.drawImage(yarnImg[YARN_KEYS[i]], 0, 0); g.drawImage(shadeImg, 0, 0);
    out[i] = c.toDataURL();
  }
  return out;
})();
PICK_YARNS.forEach((i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-label', ['빨강', '파랑', '민트', '노랑', '보라'][i] + ' 털실');
  b.style.backgroundImage = 'url(' + yarnPreview[i] + ')';
  b.addEventListener('click', () => { chosenColor = i; save(COLOR_KEY, String(i)); paintPicks(); });
  b.dataset.color = String(i);
  yarnsEl.append(b);
});
function paintPicks() {
  for (const b of fursEl.children) b.setAttribute('aria-checked', String(b.dataset.fur === chosenFur));
  for (const b of yarnsEl.children) b.setAttribute('aria-checked', String(Number(b.dataset.color) === chosenColor));
}
paintPicks();
nameEl.value = load(NAME_KEY, '');
if (SERVER) $('mode-note').hidden = false;

function beginPlay() {
  startEl.hidden = true;
  state = 'play';
  boostBtn.hidden = false;
  boostPointer = null; input.mouseBoost = false; input.keys = {}; input.keyTurn = 0; syncBoost();
  hintUntil = clock + 4;
  death = null;
}

function startLocal() {
  mode = 'local';
  if (net.ws) { const ws = net.ws; net.ws = null; try { ws.close(); } catch (e) {} }
  goBtn.disabled = false; goBtn.textContent = '굴리러 가기!';
  local = S.createWorld();
  localJoin(false);
  beginPlay();
}

function newRun(name, fur, color) {
  run = { name: name, fur: fur, color: color, max: 0, lived: 0, joinedAt: 0, continued: false, lastS: 0, eaten: 0 };
}

function startRun() {
  let name = nameEl.value.replace(/\s+/g, ' ').trim().slice(0, 8);
  if (name) save(NAME_KEY, name); else name = '나';
  newRun(name, chosenFur, chosenColor);
  if (!SERVER) { startLocal(); return; }
  state = 'connecting';
  goBtn.disabled = true;
  goBtn.textContent = '연결 중…';
  net.room = 1;
  net.full = false;
  connect(() => {
    goBtn.disabled = false; goBtn.textContent = '굴리러 가기!';
    mode = 'online';
    joinOnline(false);
    beginPlay();
  }, () => {
    startLocal();
    floats.push({ text: '연결이 안 돼서 컴퓨터 냥이들과 놀아요', t: -2.5, screen: true });
  });
}
goBtn.addEventListener('click', startRun);
nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); startRun(); } });

// ───── 결과 창 ─────
const dialog = $('result');
const ranking = window.Ranking ? window.Ranking.create('yarn', $('ranking')) : { show() {} };
const resultCat = $('result-cat').getContext('2d');

function onDead(info) {
  if (state !== 'play') return;
  death = info;
  state = 'dying';
  boostBtn.hidden = true;
  setTimeout(() => showResult(info), 1300);
}

function showResult(info) {
  state = 'result';
  run.max = Math.max(run.max, info.max || 0);
  let title;
  if (info.lost) title = '앗! 놀이터 연결이 끊겼어요';
  else if (info.by) title = '돌돌돌… ' + (info.bot ? '🤖 ' : '') + info.by + ' 털실에 감겼어요!';
  else title = '털실이 다 풀렸어요!';
  $('result-title').textContent = title;
  // 감긴 냥이: 상대 털실 색 줄을 얼굴 위에 감는다
  resultCat.clearRect(0, 0, 160, 160);
  resultCat.drawImage(sprites[run.fur].dizzy, 16, 10, 128, 128);
  if (info.by) {
    resultCat.strokeStyle = (YARNS[info.byColor] || YARNS.purple)[0];
    resultCat.lineWidth = 6; resultCat.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      resultCat.beginPath(); resultCat.moveTo(30, 52 + i * 20); resultCat.quadraticCurveTo(80, 40 + i * 24, 130, 56 + i * 18); resultCat.stroke();
    }
  }
  $('result-sub').textContent = info.lost ? '잠시 뒤 다시 들어와 주세요' : '털실을 몽땅 빼앗겼어요…';
  $('stat-size').textContent = fmtSize(run.max);
  $('stat-rank').textContent = info.rank ? info.rank + '등 / ' + info.count : '-';
  $('stat-eaten').textContent = (info.eaten || 0) + '개';
  const score = Math.round(run.max);
  const best = Number(load(BEST_KEY, '0')) || 0;
  const bestEl = $('result-best');
  if (score > best) {
    save(BEST_KEY, String(score));
    bestEl.textContent = '🎉 내 최고 기록 갱신! ' + fmtSize(score);
    bestEl.className = 'result-best new';
  } else {
    bestEl.textContent = '내 최고 기록 ' + fmtSize(best);
    bestEl.className = 'result-best';
  }
  $('continue-btn').hidden = !info.canCont;
  ranking.show(score);
  dialog.returnValue = '';
  dialog.showModal();
}

dialog.addEventListener('close', () => {
  if (state !== 'result') return;
  const cont = dialog.returnValue === 'continue' && !run.continued;
  // 이어하기는 나중에 보상형 광고를 붙일 자리. 지금은 한 판에 한 번 그냥 이어 할 수 있다.
  if (cont) run.continued = true;
  else newRun(run.name, run.fur, run.color);
  if (mode === 'online') {
    if (net.ws && net.ws.readyState === 1) { joinOnline(cont); beginPlay(); }
    else startRun();
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
  if (t - (debug.kbT || 0) > 1000) { debug.kbps = debug.bytes / 1024; debug.bytes = 0; debug.kbT = t; }
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
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.1) floats.splice(i, 1); }
  // 카메라: 뭉치가 클수록 멀리서 본다
  let fx = cam.x, fy = cam.y, size = START_S;
  if (scene && scene.me && state === 'play') { fx = scene.me.x; fy = scene.me.y; size = scene.me.s; }
  else if (death && (state === 'dying' || state === 'result')) { fx = death.x; fy = death.y; }
  else if (state === 'menu' && scene) {
    if (!menuTarget || !scene.balls.some((x) => x.id === menuTarget)) menuTarget = scene.balls.length ? scene.balls[0].id : null;
    const mt = scene.balls.find((x) => x.id === menuTarget);
    if (mt) { fx = mt.x; fy = mt.y; }
  }
  const k = Math.min(1, dt * 8);
  cam.x += (fx - cam.x) * k; cam.y += (fy - cam.y) * k;
  const wantZ = baseZoom * clamp(1.1 - (radius(size) - radius(START_S)) * 0.0065, 0.55, 1.1);
  cam.z += (wantZ - cam.z) * Math.min(1, dt * 2);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
cam.z = baseZoom;
requestAnimationFrame(frame);

// 시험용: 자동 확인 스크립트가 상태를 들여다볼 수 있게 한다.
window.__yarn = {
  get state() { return state; }, get mode() { return mode; }, get scene() { return scene; },
  get local() { return local; }, get localMe() { return localMe; }, startRun,
};
