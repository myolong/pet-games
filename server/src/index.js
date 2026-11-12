// 냥이 꼬리기차 같이 하기 서버 (Cloudflare Workers + Durable Objects, 예전 서버).
// 한국에서 무료 요금제로 접속하면 미국을 거쳐 느려서, 지금은 Fly.io 도쿄 서버(node.js)를 쓴다.
import { Room, roomNumber, ALLOWED_ORIGINS } from './room.js';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/') return new Response('cattrain ok', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const room = roomNumber(url.searchParams.get('room'));
    const stub = env.WORLD.get(env.WORLD.idFromName('wnam-room-' + room), { locationHint: 'wnam' });
    if (url.pathname === '/stats') {
      const st = await (await stub.fetch('https://do/stats')).json();
      st.edge = (req.cf && req.cf.colo) || '?';
      st.country = (req.cf && req.cf.country) || '?';
      return new Response(JSON.stringify(st, null, 1), { headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
    }
    if (url.pathname !== '/ws') return new Response('not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const origin = req.headers.get('Origin');
    if (origin && !ALLOWED_ORIGINS.some((re) => re.test(origin))) return new Response('forbidden', { status: 403 });
    const headers = new Headers(req.headers);
    headers.set('x-edge-colo', (req.cf && req.cf.colo) || '?');
    return stub.fetch(new Request(req, { headers }));
  },
};

export class World {
  constructor() {
    this.room = new Room();
  }

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
      const st = Object.assign({ server: await this.whereAmI() }, this.room.stats());
      return new Response(JSON.stringify(st), { headers: { 'content-type': 'application/json' } });
    }
    const pair = new WebSocketPair();
    const client = pair[0], ws = pair[1];
    ws.accept();
    const c = this.room.connect(ws, { edge: req.headers.get('x-edge-colo') || '?', server: await this.whereAmI() });
    if (c) {
      ws.addEventListener('message', (e) => this.room.onMessage(c, e.data));
      const bye = () => this.room.onClose(c);
      ws.addEventListener('close', bye);
      ws.addEventListener('error', bye);
    }
    return new Response(null, { status: 101, webSocket: client });
  }
}
