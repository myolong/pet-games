// 냥이 꼬리기차 같이 하기 서버 (Cloudflare Workers + Durable Objects).
// 놀이터(방) 하나가 Durable Object 하나다. 사람이 있는 동안 1초에 20번 게임을 진행하고,
// 1초에 10번 각 사람에게 그 사람 화면 근처의 모습만 보낸다.
import {
  createWorld, step, addPlayer, removeTrain, ranked,
  FUR_KEYS, PICK_FURS, SCARVES,
} from '../../games/cattrain/sim.js';

const TICK_MS = 50;
const MAX_PLAYERS = 24;        // 방 하나에 들어올 수 있는 사람 수
const MAX_ROOMS = 5;
const IDLE_STOP_MS = 60000;    // 아무도 없으면 1분 뒤 쉰다
const MAX_MSGS_PER_SEC = 30;

const ALLOWED_ORIGINS = [/^https:\/\/myolong\.github\.io$/, /^https:\/\/aywls931128-source\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/') return new Response('cattrain ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (url.pathname === '/stats') {
      // 연결 상태 확인: 접속 지점, 놀이터 서버 위치, 서버 박자가 밀린 정도
      const room = Math.min(MAX_ROOMS, Math.max(1, parseInt(url.searchParams.get('room') || '1', 10) || 1));
      const stub = env.WORLD.get(env.WORLD.idFromName('wnam-room-' + room), { locationHint: 'wnam' });
      const r = await stub.fetch('https://do/stats');
      const st = await r.json();
      st.edge = (req.cf && req.cf.colo) || '?';
      st.country = (req.cf && req.cf.country) || '?';
      return new Response(JSON.stringify(st, null, 1), { headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
    }
    if (url.pathname !== '/ws') return new Response('not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const origin = req.headers.get('Origin');
    if (origin && !ALLOWED_ORIGINS.some((re) => re.test(origin))) return new Response('forbidden', { status: 403 });
    const room = Math.min(MAX_ROOMS, Math.max(1, parseInt(url.searchParams.get('room') || '1', 10) || 1));
    // 놀이터 서버는 처음 만들어질 때 자리를 정하고 옮기지 않는다. 무료 요금제에서 한국 접속은 미국 서부(LAX 등)로 들어오므로, 서버도 미국 서부에 둬서 태평양을 한 번만 건너게 한다.
    const id = env.WORLD.idFromName('wnam-room-' + room);
    // 사용자가 붙은 Cloudflare 접속 지점(공항 코드)을 놀이터 서버에 알려 준다 (연결 상태 확인용)
    const headers = new Headers(req.headers);
    headers.set('x-edge-colo', (req.cf && req.cf.colo) || '?');
    return env.WORLD.get(id, { locationHint: 'wnam' }).fetch(new Request(req, { headers }));
  },
};

export class World {
  constructor(state, env) {
    this.state = state;
    this.world = null;
    this.conns = new Set();
    this.timer = null;
    this.tickNo = 0;
    this.last = 0;
    this.emptySince = Date.now();
  }

  // 놀이터 서버가 실제로 놓인 Cloudflare 지점을 한 번만 알아 둔다.
  async whereAmI() {
    if (this.colo) return this.colo;
    try {
      const t = await (await fetch('https://cloudflare.com/cdn-cgi/trace')).text();
      const m = /colo=(\w+)/.exec(t);
      this.colo = m ? m[1] : '?';
    } catch (e) { this.colo = '?'; }
    return this.colo;
  }

  async fetch(req) {
    if (new URL(req.url).pathname === '/stats') {
      return new Response(JSON.stringify({
        server: await this.whereAmI(), conns: this.conns.size, running: !!this.timer,
        tickGapAvg: Math.round(this.gapAvg || 0), tickGapMax: this.gapMax || 0,
      }), { headers: { 'content-type': 'application/json' } });
    }
    const edge = req.headers.get('x-edge-colo') || '?';
    const pair = new WebSocketPair();
    const client = pair[0], ws = pair[1];
    ws.accept();
    const players = [...this.conns].filter((c) => c.joined).length;
    if (players >= MAX_PLAYERS) {
      ws.send(JSON.stringify({ t: 'full' }));
      ws.close(1000, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    const c = { ws, train: null, joined: false, view: { hw: 400, hh: 700 }, cam: null, continued: false, lastKids: null, msgs: 0, msgSec: 0, sinceJoin: 0 };
    this.conns.add(c);
    ws.addEventListener('message', (e) => this.onMessage(c, e.data));
    const bye = () => this.onClose(c);
    ws.addEventListener('close', bye);
    ws.addEventListener('error', bye);
    this.start();
    this.whereAmI().then((colo) => this.send(c, { t: 'where', edge: edge, server: colo }));
    return new Response(null, { status: 101, webSocket: client });
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

