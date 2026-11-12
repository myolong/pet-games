// 냥이 털실 굴리기 같이 하기: 놀이터(방) 하나의 진행.
// 사람이 있는 동안 1초에 20번 게임을 진행하고, 각 사람에게 그 사람 화면 근처의 모습만 보낸다.
import {
  createWorld, step, addPlayer, removeBall, ranked,
  FUR_KEYS, PICK_FURS, WORLD, START_S,
} from '../../games/yarn/sim.js';

const TICK_MS = 50;
const MAX_PLAYERS = 20;        // 방 하나에 들어올 수 있는 사람 수
export const MAX_ROOMS = 5;
const IDLE_STOP_MS = 60000;    // 아무도 없으면 1분 뒤 쉰다
const MAX_MSGS_PER_SEC = 30;

export const ALLOWED_ORIGINS = [/^https:\/\/myolong\.github\.io$/, /^https:\/\/aywls931128-source\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

const BAD_WORDS = [
  '시발', '씨발', '씨빨', '시바', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '개새', '개색', '새끼', 'ㅅㄲ',
  '좆', '존나', '졸라', 'ㅈㄴ', '지랄', 'ㅈㄹ', '미친', '꺼져', '닥쳐', '엠창', '느금', '니애미', '애미', '애비',
  '섹스', '보지', '자지', '야동', '운영자', '관리자',
  'fuck', 'shit', 'bitch', 'sex', 'porn', 'dick', 'pussy', 'admin',
];

function cleanName(name) {
  let n = String(name || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 8);
  const flat = n.toLowerCase().replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
  if (!n || BAD_WORDS.some((w) => flat.includes(w))) n = '냥이';
  return n;
}

export function roomNumber(v) {
  return Math.min(MAX_ROOMS, Math.max(1, parseInt(v || '1', 10) || 1));
}

export class Room {
  constructor() {
    this.world = null;
    this.conns = new Set();
    this.timer = null;
    this.tickNo = 0;
    this.last = 0;
    this.emptySince = Date.now();
  }

  stats() {
    return { conns: this.conns.size, running: !!this.timer, tickGapMax: this.gapMax || 0 };
  }

  connect(ws) {
    const players = [...this.conns].filter((c) => c.joined).length;
    if (players >= MAX_PLAYERS) {
      try { ws.send(JSON.stringify({ t: 'full' })); ws.close(1000, 'full'); } catch (e) {}
      return null;
    }
    const c = { ws, ball: null, joined: false, view: { hw: 400, hh: 700 }, cam: null, continued: false, lastS: 0, msgs: 0, msgSec: 0 };
    this.conns.add(c);
    this.start();
    return c;
  }

  start() {
    if (!this.world) this.world = createWorld();
    if (this.timer) return;
    this.last = Date.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  send(c, obj) {
    try { c.ws.send(JSON.stringify(obj)); } catch (e) { this.onClose(c); }
  }

  onClose(c) {
    if (!this.conns.has(c)) return;
    this.conns.delete(c);
    if (c.ball && this.world) removeBall(this.world, c.ball);
    c.ball = null;
    if (this.conns.size === 0) this.emptySince = Date.now();
  }

  onMessage(c, data) {
    const sec = Math.floor(Date.now() / 1000);
    if (sec !== c.msgSec) { c.msgSec = sec; c.msgs = 0; }
    if (++c.msgs > MAX_MSGS_PER_SEC) return;
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const w = this.world;
    if (m.t === 'join') {
      if (c.ball) return;
      const fur = PICK_FURS.includes(m.fur) ? m.fur : 'orange';
      const color = Math.max(0, Math.min(4, m.color | 0));
      c.name = cleanName(m.name);
      let s = START_S;
      if (m.cont && !c.continued && c.lastS >= START_S * 2) {
        c.continued = true;
        s = c.lastS / 2;
      } else {
        c.continued = false;
        c.runMax = 0;
      }
      c.lastS = 0;
      c.ball = addPlayer(w, { name: c.name, fur: fur, color: color, s: s });
      c.ball.conn = c;
      c.joined = true;
      this.send(c, { t: 'joined', id: c.ball.id });
    } else if (m.t === 'in') {
      if (!c.ball || typeof m.a !== 'number' || !isFinite(m.a)) return;
      c.ball.input.a = m.a;
      c.ball.input.boost = !!m.d;
    } else if (m.t === 'ping') {
      this.send(c, { t: 'pong', c: m.c });
    } else if (m.t === 'view') {
      const hw = Number(m.hw), hh = Number(m.hh);
      if (isFinite(hw) && isFinite(hh)) c.view = { hw: Math.min(1000, Math.max(200, hw)), hh: Math.min(1100, Math.max(200, hh)) };
    }
  }

  tick() {
    const nowMs = Date.now();
    if (this.prevTick) {
      const gap = nowMs - this.prevTick;
      if (nowMs - (this.gapWin || 0) > 2000) { this.gapMax = this.gapCur || gap; this.gapCur = 0; this.gapWin = nowMs; }
      this.gapCur = Math.max(this.gapCur || 0, gap);
    }
    this.prevTick = nowMs;
    if (this.conns.size === 0) {
      if (nowMs - this.emptySince > IDLE_STOP_MS) this.stop();
      this.last = nowMs;
      return;
    }
    this.acc = Math.min(500, (this.acc || 0) + (nowMs - this.last));
    this.last = nowMs;
    if (this.acc < TICK_MS) return;
    const w = this.world;
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      step(w, TICK_MS / 1000);
      this.handleEvents();
      this.tickNo++;
    }
    this.broadcast();
  }

  handleEvents() {
    const w = this.world;
    for (const ev of w.events) {
      if (ev.type === 'absorb' && ev.ball.isPlayer && ev.ball.conn) {
        this.send(ev.ball.conn, { t: 'gulp', n: Math.round(ev.gain) });
        continue;
      }
      if (ev.type !== 'dead' || !ev.ball.isPlayer) continue;
      const b = ev.ball, c = b.conn;
      removeBall(w, b);
      if (!c) continue;
      c.ball = null;
      c.cam = { x: b.x, y: b.y };
      c.lastS = b.s;
      c.runMax = Math.max(c.runMax || 0, b.maxS);
      this.send(c, {
        t: 'dead', by: ev.by ? ev.by.name : null, bot: ev.by ? ev.by.bot : false, bc: ev.by ? ['red', 'blue', 'mint', 'yellow', 'purple', 'pink'][ev.by.color] : null,
        max: Math.round(c.runMax), rank: ev.rank, count: ev.count,
        canCont: !c.continued && b.s >= START_S * 2, x: Math.round(b.x), y: Math.round(b.y), a: Math.round(b.a * 100), fur: b.fur,
      });
    }
    w.events.length = 0;
  }

  broadcast() {
    const w = this.world;
    const order = ranked(w);
    const top = order[0];
    const lb = order.slice(0, 5).map((b) => [b.name, b.bot ? 1 : 0, Math.round(b.s), b.id]);
    let humansNow = 0;
    for (const b of w.balls) if (b.isPlayer) humansNow++;
    const withMap = this.tickNo - (this.lastMap || 0) >= 10;
    if (withMap) this.lastMap = this.tickNo;
    // 실 조각은 0.25초마다만 보낸다 (받는 양 줄이기)
    const withBits = this.tickNo - (this.lastBits || 0) >= 5;
    if (withBits) this.lastBits = this.tickNo;
    let mm = null;
    if (withMap) {
      mm = [];
      for (const b of w.balls) if (b.alive) mm.push(Math.round(b.x), Math.round(b.y), Math.round(b.s), b.id, b.color);
    }
    for (const c of this.conns) {
      if (!c.joined) continue;
      const me = c.ball;
      const cx = me ? me.x : c.cam ? c.cam.x : WORLD / 2, cy = me ? me.y : c.cam ? c.cam.y : WORLD / 2;
      const L = cx - c.view.hw, R = cx + c.view.hw, T = cy - c.view.hh, B = cy + c.view.hh;
      const rows = [];
      for (const b of w.balls) {
        if (!b.alive) continue;
        const pad = 30 + Math.sqrt(b.s) * 2.2 * 2;
        if (b.x < L - pad || b.x > R + pad || b.y < T - pad || b.y > B + pad) continue;
        const flags = (b.bot ? 1 : 0) | (b.boostNow ? 2 : 0) | (b.invul > 0 ? 4 : 0) | (b === top ? 8 : 0);
        rows.push([b.id, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.a * 100), FUR_KEYS.indexOf(b.fur), b.color, flags, b.name, Math.round(b.s)]);
      }
      const msg = { t: 's', st: Math.round(w.now * 1000), me: me ? me.id : 0, b: rows, lb: lb };
      if (withBits) {
        const f = [];
        for (const o of w.bits) if (o.x > L && o.x < R && o.y > T && o.y < B) f.push(Math.round(o.x), Math.round(o.y), o.c);
        msg.f = f;
      }
      if (me) msg.my = [order.indexOf(me) + 1, Math.round(me.s)];
      if (mm) msg.mm = mm;
      msg.hc = humansNow;
      this.send(c, msg);
    }
  }
}
