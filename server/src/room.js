// 냥이 꼬리기차 같이 하기: 놀이터(방) 하나의 진행. 서버 종류(Fly.io Node, Cloudflare)와 상관없이 같이 쓴다.
// 사람이 있는 동안 1초에 20번 게임을 진행하고, 각 사람에게 그 사람 화면 근처의 모습만 보낸다.
import {
  createWorld, step, addPlayer, removeTrain, ranked,
  FUR_KEYS, PICK_FURS, SCARVES,
} from '../../games/cattrain/sim.js';

const TICK_MS = 50;
const MAX_PLAYERS = 24;        // 방 하나에 들어올 수 있는 사람 수
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

// ws: send(문자열), close(code, reason) 가 있는 연결
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
    return {
      conns: this.conns.size, running: !!this.timer,
      tickGapAvg: Math.round(this.gapAvg || 0), tickGapMax: this.gapMax || 0,
    };
  }

  // 새 연결을 받는다. 꽉 찼으면 null.
  connect(ws, where) {
    const players = [...this.conns].filter((c) => c.joined).length;
    if (players >= MAX_PLAYERS) {
      try { ws.send(JSON.stringify({ t: 'full' })); ws.close(1000, 'full'); } catch (e) {}
      return null;
    }
    const c = { ws, train: null, joined: false, view: { hw: 400, hh: 700 }, cam: null, continued: false, lastKids: null, msgs: 0, msgSec: 0, sinceJoin: 0 };
    this.conns.add(c);
    this.start();
    if (where) this.send(c, Object.assign({ t: 'where' }, where));
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
    if (c.train && this.world) removeTrain(this.world, c.train);
    c.train = null;
    if (this.conns.size === 0) this.emptySince = Date.now();
  }

  onMessage(c, data) {
    // 너무 자주 보내는 연결은 무시한다.
    const sec = Math.floor(Date.now() / 1000);
    if (sec !== c.msgSec) { c.msgSec = sec; c.msgs = 0; }
    if (++c.msgs > MAX_MSGS_PER_SEC) return;
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const w = this.world;
    if (m.t === 'join') {
      if (c.train) return;
      const fur = PICK_FURS.includes(m.fur) ? m.fur : 'orange';
      c.name = cleanName(m.name);
      let kids;
      if (m.cont && !c.continued && c.lastKids && c.lastKids.length >= 2) {
        c.continued = true;
        kids = c.lastKids.slice(0, Math.max(3, Math.ceil(c.lastKids.length / 2)));
      } else {
        c.continued = false;
        c.runMax = 0;
        c.runLived = 0;
      }
      c.lastKids = null;
      c.train = addPlayer(w, { name: c.name, fur: fur, kids: kids });
      c.train.conn = c;
      c.joined = true;
      c.joinedAt = w.now;
      this.send(c, { t: 'joined', id: c.train.id });
    } else if (m.t === 'in') {
      if (!c.train || typeof m.a !== 'number' || !isFinite(m.a)) return;
      c.train.input.a = m.a;
      c.train.input.dash = !!m.d;
    } else if (m.t === 'ping') {
      // 화면이 서버까지 걸리는 시간을 재도록 그대로 돌려준다.
      this.send(c, { t: 'pong', c: m.c, g: this.gapMax || 0 });
    } else if (m.t === 'view') {
      const hw = Number(m.hw), hh = Number(m.hh);
      if (isFinite(hw) && isFinite(hh)) c.view = { hw: Math.min(800, Math.max(200, hw)), hh: Math.min(800, Math.max(200, hh)) };
    }
  }

  tick() {
    const nowMs = Date.now();
    // 서버 박자가 얼마나 밀리는지 잰다 (2초 동안 가장 긴 틈)
    if (this.prevTick) {
      const gap = nowMs - this.prevTick;
      this.gapAvg = (this.gapAvg || TICK_MS) + (gap - (this.gapAvg || TICK_MS)) * 0.05;
      if (nowMs - (this.gapWin || 0) > 2000) { this.gapMax = this.gapCur || gap; this.gapCur = 0; this.gapWin = nowMs; }
      this.gapCur = Math.max(this.gapCur || 0, gap);
    }
    this.prevTick = nowMs;
    if (this.conns.size === 0) {
      if (nowMs - this.emptySince > IDLE_STOP_MS) this.stop();
      this.last = nowMs;
      return;
    }
    // 타이머가 늦거나 몰려 와도 게임 시간은 0.05초씩 일정하게 진행한다.
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
      if (ev.type === 'poison' && ev.train.isPlayer && ev.train.conn) {
        this.send(ev.train.conn, { t: 'ouch', n: ev.n, onion: ev.onion ? 1 : 0 });
        continue;
      }
      if (ev.type !== 'crash' || !ev.train.isPlayer) continue;
      const t = ev.train, c = t.conn;
      removeTrain(w, t);
      if (!c) continue;
      c.train = null;
      c.cam = { x: t.x, y: t.y };
      c.lastKids = t.kids.slice();
      c.runMax = Math.max(c.runMax || 0, t.maxLen);
      c.runLived = (c.runLived || 0) + (w.now - c.joinedAt);
      this.send(c, {
        t: 'dead', by: ev.by ? ev.by.name : null, bot: ev.by ? ev.by.bot : false,
        max: c.runMax, rank: ev.rank, count: ev.count, lived: Math.round(c.runLived),
        canCont: !c.continued && t.kids.length >= 2, x: Math.round(t.x), y: Math.round(t.y), a: Math.round(t.a * 100), fur: t.fur,
      });
    }
    w.events.length = 0;
  }

  broadcast() {
    const w = this.world;
    const order = ranked(w);
    const top = order[0];
    const lb = order.slice(0, 5).map((t) => [t.name, t.bot ? 1 : 0, t.kids.length, t.id]);
    let humansNow = 0;
    for (const t of w.trains) if (t.isPlayer) humansNow++;
    const withMap = this.tickNo - (this.lastMap || 0) >= 10;
    if (withMap) this.lastMap = this.tickNo;
    // 간식은 잘 안 움직이니 0.5초마다, 길 잃은 아기냥은 0.1초마다만 보낸다 (받는 양 줄이기)
    const withFish = this.tickNo - (this.lastFish || 0) >= 10;
    if (withFish) this.lastFish = this.tickNo;
    const withKits = this.tickNo - (this.lastKits || 0) >= 2;
    if (withKits) this.lastKits = this.tickNo;
    let mm = null;
    if (withMap) {
      mm = [];
      for (const t of w.trains) if (t.alive) mm.push(Math.round(t.x), Math.round(t.y), t.kids.length, t.id);
    }
    for (const c of this.conns) {
      if (!c.joined) continue;
      const me = c.train;
      const cx = me ? me.x : c.cam ? c.cam.x : 1200, cy = me ? me.y : c.cam ? c.cam.y : 1200;
      const L = cx - c.view.hw, R = cx + c.view.hw, T = cy - c.view.hh, B = cy + c.view.hh;
      const tr = [];
      for (const t of w.trains) {
        if (!t.alive || t.box.x1 < L || t.box.x0 > R || t.box.y1 < T || t.box.y0 > B) continue;
        const segs = [];
        for (const s of t.segs) segs.push(Math.round(s.x), Math.round(s.y));
        let kids = '';
        for (const k of t.kids) kids += FUR_KEYS.indexOf(k);
        const flags = (t.bot ? 1 : 0) | (t.dashNow ? 2 : 0) | (t.invul > 0 ? 4 : 0) | (t === top ? 8 : 0);
        tr.push([t.id, Math.round(t.x * 10) / 10, Math.round(t.y * 10) / 10, Math.round(t.a * 100), FUR_KEYS.indexOf(t.fur), SCARVES.indexOf(t.scarf), flags, t.name, kids, segs]);
      }
      const f = withFish ? [] : null;
      if (f) for (const o of w.fish) if (o.x > L && o.x < R && o.y > T && o.y < B) f.push(Math.round(o.x), Math.round(o.y), o.v, o.c);
      const k = withKits ? [] : null;
      if (k) for (const o of w.kittens) {
        if (o.x < L || o.x > R || o.y < T || o.y > B) continue;
        k.push(Math.round(o.x), Math.round(o.y), FUR_KEYS.indexOf(o.fur), o.wild ? 1 : (w.now - o.born > 26 ? 2 : 0), Math.round(o.a * 100));
      }
      const msg = { t: 's', st: Math.round(w.now * 1000), me: me ? me.id : 0, tr: tr, lb: lb };
      if (f) msg.f = f;
      if (k) msg.k = k;
      if (me) msg.my = [order.indexOf(me) + 1, me.kids.length, Math.floor(me.gauge)];
      if (mm) msg.mm = mm;
      msg.hc = humansNow;
      this.send(c, msg);
    }
  }
}

