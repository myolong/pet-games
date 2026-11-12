// 냥이 털실 굴리기 게임 규칙. 화면(혼자 하기)과 서버(같이 하기)가 같은 파일을 쓴다.
// 그림·화면 코드는 넣지 않는다.
// 크기(s)는 털실뭉치에 감긴 실 길이(cm)로 센다. 뭉치 반지름과 속도는 이 값으로 정해진다.

export const WORLD = 3000;          // 놀이터(거실) 한 변 길이
export const START_S = 30;          // 처음 털실 길이(cm)
export const BIT_COUNT = 1100;      // 바닥에 흩어진 실 조각 수
export const BIT_V = 2;             // 실 조각 하나에 늘어나는 길이
export const RAINBOW_V = 8;         // 무지개 실 조각 (드물다)
export const BASE_SPEED = 170;      // 처음 속도(초당)
export const BOOST = 1.7;           // 밀기 배율
export const TURN = 4.5;            // 초당 회전 각도(라디안)
export const EAT_RATIO = 1.05;      // 이만큼(5%) 커야 상대를 감을 수 있다
export const BONK = 330;           // 비슷한 크기끼리 부딪혔을 때 튕겨 나가는 힘
export const BONK_FADE = 5;        // 튕기는 힘이 줄어드는 빠르기
export const EAT_KEEP = 0.85;       // 감은 상대 실 중 내 것이 되는 몫 (나머지는 바닥에 흩어진다)
export const BOT_MAX_S = 700;       // 컴퓨터 냥이가 크게 자라지 않도록
export const BALL_TARGET = 16;      // 사람 + 컴퓨터 냥이를 합쳐 이 정도로 맞춘다
export const MIN_BOTS = 4;

export const FUR_KEYS = ['orange', 'gray', 'white', 'black', 'calico', 'cream'];
export const PICK_FURS = ['orange', 'gray', 'white', 'black', 'calico'];
export const YARN_KEYS = ['red', 'blue', 'mint', 'yellow', 'purple', 'pink'];
export const BOT_NAMES = ['까망이', '회색번개', '콩떡', '삼색이', '치즈볼', '두부', '호떡', '모찌', '깜냥', '보리', '라떼', '흰둥이', '꼬미', '찹쌀', '감자', '누룽지', '인절미', '팥떡', '고등어', '버터', '쿠키', '밤톨', '단추', '구름'];

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (n) => Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
function angleTo(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function radius(s) { return 12 + Math.sqrt(Math.max(0, s)) * 2.2; }
// 크기와 상관없이 모두 같은 속도 (밀기를 쓸 때만 빨라진다)
export function speed() { return BASE_SPEED; }
export function canEat(big, small) { return big.s >= small.s * EAT_RATIO; }
// 화면에 보여 줄 크기 글자: 38cm, 1.2m
export function fmtSize(s) { return s < 100 ? Math.round(s) + 'cm' : (Math.floor(s / 10) / 10).toFixed(1) + 'm'; }

export function createWorld() {
  const w = { balls: [], bits: [], now: 0, nextId: 1, events: [], usedNames: new Set() };
  for (let i = 0; i < BIT_COUNT; i++) spawnBit(w);
  balanceBots(w);
  return w;
}

function spawnBit(w) {
  const rainbow = Math.random() < 0.04;
  w.bits.push({ x: rand(30, WORLD - 30), y: rand(30, WORLD - 30), v: rainbow ? RAINBOW_V : BIT_V, c: rainbow ? 6 : randInt(6) });
}

function dropBit(w, x, y, c, spread) {
  const a = rand(0, Math.PI * 2), d = rand(0, spread);
  w.bits.push({ x: clamp(x + Math.cos(a) * d, 20, WORLD - 20), y: clamp(y + Math.sin(a) * d, 20, WORLD - 20), v: BIT_V, c: c, drop: w.now });
}

function makeBall(w, opts) {
  const a = opts.a !== undefined ? opts.a : rand(0, Math.PI * 2);
  return {
    id: w.nextId++, name: opts.name, fur: opts.fur, color: opts.color, isPlayer: !!opts.isPlayer, bot: !opts.isPlayer,
    x: opts.x, y: opts.y, a: a, ta: a, s: opts.s || START_S, alive: true, invul: opts.isPlayer ? 3 : 2,
    boosting: false, boostNow: false, dropAcc: 0, kx: 0, ky: 0, bonkAt: -9, think: 0, goal: null, wanderT: 0,
    cap: opts.cap || BOT_MAX_S, aggr: opts.aggr || 0, sloppy: opts.sloppy || 0, respawn: 0, maxS: opts.s || START_S, eaten: 0, born: w.now,
  };
}

// 더 큰 뭉치들과 충분히 떨어진 빈자리를 찾는다.
function safeSpot(w, s) {
  let best = null, bestScore = -Infinity;
  for (let tries = 0; tries < 40; tries++) {
    const x = rand(150, WORLD - 150), y = rand(150, WORLD - 150);
    let score = Infinity;
    for (const b of w.balls) {
      if (!b.alive) continue;
      let d = Math.sqrt(dist2(x, y, b.x, b.y)) - radius(b.s);
      if (b.s > s) d *= 0.5;
      score = Math.min(score, d);
    }
    if (score > 350) return { x, y };
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  return best;
}

function botName(w) {
  const free = BOT_NAMES.filter((n) => !w.usedNames.has(n));
  const name = free.length ? free[randInt(free.length)] : BOT_NAMES[randInt(BOT_NAMES.length)];
  w.usedNames.add(name);
  return name;
}

function newBot(w) {
  const s = Math.round(START_S + Math.pow(Math.random(), 2) * 200);
  const p = safeSpot(w, s);
  return makeBall(w, {
    name: botName(w), fur: FUR_KEYS[randInt(FUR_KEYS.length)], color: randInt(YARN_KEYS.length),
    x: p.x, y: p.y, s: s, aggr: rand(0.2, 0.9), sloppy: rand(0.05, 0.35),
    cap: Math.round(80 + Math.pow(Math.random(), 2) * (BOT_MAX_S - 80)),
  });
}

function humans(w) {
  let n = 0;
  for (const b of w.balls) if (b.isPlayer) n++;
  return n;
}

function balanceBots(w) {
  const want = Math.max(MIN_BOTS, BALL_TARGET - humans(w));
  let bots = 0;
  for (const b of w.balls) if (b.bot) bots++;
  while (bots < want) { w.balls.push(newBot(w)); bots++; }
  w.botWant = want;
}

// 사람 뭉치를 놀이터에 넣는다. s를 주면 그 크기로 시작한다(이어하기).
export function addPlayer(w, opts) {
  const s = Math.max(START_S, opts.s || START_S);
  const p = safeSpot(w, s);
  const b = makeBall(w, {
    name: opts.name, fur: opts.fur, color: clamp(opts.color | 0, 0, YARN_KEYS.length - 1), isPlayer: true,
    x: p.x, y: p.y, s: s, a: Math.atan2(WORLD / 2 - p.y, WORLD / 2 - p.x),
  });
  b.input = { a: b.a, boost: false };
  w.balls.push(b);
  balanceBots(w);
  return b;
}

// 뭉치를 놀이터에서 뺀다 (사람이 나갔을 때). 실은 바닥에 흩어진다.
export function removeBall(w, b) {
  const i = w.balls.indexOf(b);
  if (i >= 0) w.balls.splice(i, 1);
  if (b.alive) {
    b.alive = false;
    scatter(w, b, b.s * 0.5);
  }
  balanceBots(w);
}

function scatter(w, b, amount) {
  const n = Math.min(40, Math.floor(amount / BIT_V));
  const r = radius(b.s);
  for (let i = 0; i < n; i++) dropBit(w, b.x, b.y, b.color, r * 1.6);
}

// ───── 컴퓨터 냥이 ─────
function botThink(w, b) {
  const r = radius(b.s);
  let want = null, boost = false;
  // 1) 나를 감을 수 있는 큰 뭉치가 가까우면 도망
  let threat = null, td = Infinity;
  for (const o of w.balls) {
    if (o === b || !o.alive || !canEat(o, b) || o.invul > 0) continue;
    const d = Math.sqrt(dist2(b.x, b.y, o.x, o.y)) - radius(o.s) - r;
    if (d < 150 && d < td) { td = d; threat = o; }
  }
  if (threat && Math.random() > b.sloppy) {
    want = Math.atan2(b.y - threat.y, b.x - threat.x);
    boost = td < 90 && b.s > START_S + 15;
  }
  // 2) 감을 수 있는 작은 뭉치를 쫓기
  if (want === null && b.s < b.cap && Math.random() < b.aggr) {
    let prey = null, pd = 300 * 300;
    for (const o of w.balls) {
      // 아주 작은 뭉치(갓 들어온 사람)는 큰 컴퓨터 냥이가 쫓지 않는다
      if (o === b || !o.alive || o.invul > 0 || !canEat(b, o) || o.s * 4 < b.s) continue;
      const d = dist2(b.x, b.y, o.x, o.y);
      if (d < pd) { pd = d; prey = o; }
    }
    if (prey) {
      want = Math.atan2(prey.y + Math.sin(prey.a) * 40 - b.y, prey.x + Math.cos(prey.a) * 40 - b.x);
      boost = pd < 200 * 200 && b.s > 80 && Math.random() < b.aggr;
    }
  }
  // 3) 가까운 실 조각
  if (want === null) {
    let goal = null, bd = 300 * 300;
    for (const f of w.bits) {
      const d = dist2(b.x, b.y, f.x, f.y) / f.v;
      if (d < bd) { bd = d; goal = f; }
    }
    if (!goal) {
      if (!b.goal || b.wanderT < w.now || dist2(b.x, b.y, b.goal.x, b.goal.y) < 60 * 60) {
        b.goal = { x: rand(200, WORLD - 200), y: rand(200, WORLD - 200) };
        b.wanderT = w.now + rand(3, 6);
      }
      goal = b.goal;
    }
    want = Math.atan2(goal.y - b.y, goal.x - b.x);
  }
  // 벽 쪽으로 가면 안쪽으로 튼다
  const m = r + 60;
  if ((b.x < m && Math.cos(want) < 0) || (b.x > WORLD - m && Math.cos(want) > 0) ||
      (b.y < m && Math.sin(want) < 0) || (b.y > WORLD - m && Math.sin(want) > 0)) {
    want = Math.atan2(WORLD / 2 - b.y, WORLD / 2 - b.x) + rand(-0.6, 0.6);
  }
  b.ta = want;
  b.boosting = boost;
}

// ───── 한 단계 진행 ─────
function moveBall(w, b, dt) {
  if (b.invul > 0) b.invul -= dt;
  // 밀기: 빨라지는 대신 실이 풀려 바닥에 떨어진다.
  let boosting = b.boosting && b.s > START_S + 2;
  if (boosting) {
    const cost = Math.max(3, b.s * 0.018) * dt;
    b.s = Math.max(START_S, b.s - cost);
    b.dropAcc += cost;
    const r = radius(b.s);
    while (b.dropAcc >= BIT_V) {
      b.dropAcc -= BIT_V;
      dropBit(w, b.x - Math.cos(b.a) * (r + 14), b.y - Math.sin(b.a) * (r + 14), b.color, 10);
    }
  }
  // 아주 큰 뭉치는 조금씩 풀린다 (혼자 너무 커지지 않게)
  if (b.s > 300) b.s -= b.s * 0.003 * dt;
  if (b.bot && b.s > b.cap) b.s -= (b.s - b.cap) * 0.3 * dt;
  const sp = speed(b.s) * (boosting ? BOOST : 1);
  const turn = TURN * dt * clamp(speed(b.s) / BASE_SPEED + 0.25, 0.6, 1);
  b.a += clamp(angleTo(b.a, b.ta), -turn, turn);
  const r = radius(b.s);
  b.x = clamp(b.x + (Math.cos(b.a) * sp + b.kx) * dt, r, WORLD - r);
  b.y = clamp(b.y + (Math.sin(b.a) * sp + b.ky) * dt, r, WORLD - r);
  // 튕겨 나간 힘은 금방 줄어든다
  const fade = Math.exp(-BONK_FADE * dt);
  b.kx *= fade; b.ky *= fade;
  b.boostNow = boosting;
}

function eatBits(w, b) {
  const r = radius(b.s) + 4;
  const bits = w.bits;
  for (let i = bits.length - 1; i >= 0; i--) {
    const f = bits[i];
    if (f.x < b.x - r || f.x > b.x + r || f.y < b.y - r || f.y > b.y + r) continue;
    // 내가 방금 흘린 실은 바로 다시 감지 않는다
    if (f.drop !== undefined && w.now - f.drop < 0.6 && f.c === b.color) continue;
    if (dist2(b.x, b.y, f.x, f.y) < r * r) {
      bits.splice(i, 1);
      b.s += f.v;
    }
  }
  if (b.s > b.maxS) b.maxS = b.s;
}

function rankOf(w, b) {
  let rank = 1, count = 1;
  for (const o of w.balls) {
    if (o === b || !o.alive) continue;
    count++;
    if (o.s > b.s) rank++;
  }
  return { rank, count };
}

function absorb(w, big, small) {
  small.alive = false;
  small.deadAt = w.now;
  const { rank, count } = rankOf(w, small);
  big.s += small.s * EAT_KEEP;
  big.eaten++;
  if (big.s > big.maxS) big.maxS = big.s;
  scatter(w, small, small.s * (1 - EAT_KEEP));
  if (small.bot) small.respawn = w.now + rand(2, 5);
  w.events.push({ type: 'absorb', ball: big, gain: small.s * EAT_KEEP, victim: small });
  w.events.push({ type: 'dead', ball: small, by: big, rank: rank, count: count });
}

function collide(w) {
  const balls = w.balls;
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (!b.alive) continue;
      const ra = radius(a.s), rb = radius(b.s);
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rs = ra + rb;
      const reach = (a.isPlayer || b.isPlayer) ? (w.playerReach || 0) : 0;
      if (d2 >= (rs + reach) * (rs + reach)) continue;
      const d = Math.sqrt(d2) || 0.01;
      const big = a.s >= b.s ? a : b, small = big === a ? b : a;
      const rBig = big === a ? ra : rb, rSmall = big === a ? rb : ra;
      if (canEat(big, small) && big.invul <= 0 && small.invul <= 0) {
        // 큰 뭉치에 닿기만 해도 감긴다. 같이 하기에서는 내 화면이 서버보다 조금 앞서 보이므로
        // 사람이 감을 때는 여유(w.playerReach, 서버가 정함)를 더 준다.
        if (d < rBig + rSmall + (big.isPlayer ? (w.playerReach || 0) : 0)) absorb(w, big, small);
        continue;
      }
      // 크기가 비슷하면 '퉁!' 하고 서로 튕겨 나간다
      if (d >= rs) continue;
      const push = (rs - d) / 2, nx = dx / d, ny = dy / d;
      a.x = clamp(a.x - nx * push, ra, WORLD - ra); a.y = clamp(a.y - ny * push, ra, WORLD - ra);
      b.x = clamp(b.x + nx * push, rb, WORLD - rb); b.y = clamp(b.y + ny * push, rb, WORLD - rb);
      if (w.now - a.bonkAt > 0.3 || w.now - b.bonkAt > 0.3) {
        // 작은 쪽이 조금 더 멀리 튕긴다
        const ka = BONK * Math.sqrt(b.s / (a.s + b.s) * 2), kb = BONK * Math.sqrt(a.s / (a.s + b.s) * 2);
        a.kx = -nx * ka; a.ky = -ny * ka; b.kx = nx * kb; b.ky = ny * kb;
        a.bonkAt = b.bonkAt = w.now;
        w.events.push({ type: 'bonk', a: a, b: b, x: a.x + nx * ra, y: a.y + ny * ra });
      }
    }
  }
}

// dt초만큼 놀이터를 진행한다. 일어난 일(absorb, dead)은 w.events에 쌓인다.
export function step(w, dt) {
  w.now += dt;
  for (const b of w.balls) {
    if (!b.alive) continue;
    if (b.bot) {
      b.think -= dt;
      if (b.think <= 0) { b.think = 0.12 + Math.random() * 0.06; botThink(w, b); }
    } else if (b.input) {
      b.ta = b.input.a;
      b.boosting = b.input.boost;
    }
    moveBall(w, b, dt);
  }
  for (const b of w.balls) if (b.alive) eatBits(w, b);
  collide(w);
  // 감긴 컴퓨터 냥이는 잠시 뒤 다른 곳에서 다시 나온다. 사람이 많으면 다시 나오지 않는다.
  let bots = 0;
  for (const b of w.balls) if (b.bot && b.alive) bots++;
  for (let i = w.balls.length - 1; i >= 0; i--) {
    const b = w.balls[i];
    if (b.bot && !b.alive && w.now > b.respawn) {
      w.usedNames.delete(b.name);
      if (bots < w.botWant) { w.balls[i] = newBot(w); bots++; }
      else w.balls.splice(i, 1);
    }
  }
  // 흘린 실이 너무 많으면 오래된 것부터 치운다
  if (w.bits.length > BIT_COUNT * 2) {
    const i = w.bits.findIndex((f) => f.drop !== undefined);
    if (i >= 0) w.bits.splice(i, 1);
  }
  let fresh = 0;
  for (const f of w.bits) if (f.drop === undefined) fresh++;
  if (fresh < BIT_COUNT && Math.random() < dt * 60) { spawnBit(w); if (Math.random() < 0.5) spawnBit(w); }
}

export function ranked(w) {
  return w.balls.filter((b) => b.alive).sort((a, b) => b.s - a.s);
}
