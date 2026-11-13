// 냥이 꼬리기차 게임 규칙. 화면(혼자 하기)과 서버(같이 하기)가 같은 파일을 쓴다.
// 그림·화면 코드는 넣지 않는다.

export const WORLD = 4160;          // 놀이터 한 변 길이 (넓이는 처음 2400의 3배)
export const STEP = 4;              // 꼬리 경로를 저장하는 간격
export const SPEED = 150;           // 기본 속도(초당)
export const DASH = 1.8;            // 달리기 배율
export const TURN = 4.2;            // 초당 회전 각도(라디안)
export const GAUGE_MAX = 5;         // (물고기를 뺀 뒤로 쓰지 않음)
export const START_LEN = 3;
export const FISH_COUNT = 0;        // 물고기 간식은 뺐다. 아기냥은 길 잃은 냥이와 바구니로만 모은다
export const BASKET_KIDS = 8;       // 바구니 하나에 든 아기냥 수
export const BASKET_EVERY = 30;     // 몇 초마다 새 바구니가 나오나
export const BASKET_MAX = 2;        // 놀이터에 동시에 있을 수 있는 바구니 수
export const WILD_COUNT = 330;      // 놀이터를 떠도는 길 잃은 아기냥 수
export const POISON_COUNT = 135;    // 먹으면 아기냥이 도망가는 독버섯 수
export const POISON_LOSS = 2;       // 독버섯 하나에 도망가는 아기냥 수
export const ONION_COUNT = 24;      // 먹으면 아기냥 절반이 도망가는 양파 수 (드물다)
export const BOT_MAX_LEN = 60;
export const TRAIN_TARGET = 20;     // 사람 + 컴퓨터 냥이를 합쳐 이 정도로 맞춘다
export const MIN_BOTS = 3;

export const FUR_KEYS = ['orange', 'gray', 'white', 'black', 'calico', 'cream'];
export const PICK_FURS = ['orange', 'gray', 'white', 'black', 'calico'];
// 꾸미기 (광고 보고 여는 것). 순서를 바꾸면 서버와 화면의 번호가 어긋나니 뒤에만 덧붙일 것.
export const SPECIAL_FURS = ['rudolph', 'snow', 'gold', 'sakura'];
export const LEADER_FURS = FUR_KEYS.concat(SPECIAL_FURS);   // 대장 냥이 털색 번호표
export const HAT_KEYS = ['santa', 'antler', 'party', 'jobawi', 'gat', 'sakura', 'cowboy', 'beret', 'sombrero'];
export const TAIL_KEYS = ['lights', 'snow', 'firework', 'saekdong', 'petals', 'stars', 'zap', 'bubbles', 'notes'];
export const FACE_KEYS = ['angry', 'cry', 'grumpy'];
export const SCARVES = ['#ff5a5a', '#5a8dee', '#9b6be0', '#2fae8f', '#e05a9b', '#e0b33a', '#6c7a89', '#3aa0c8'];
export const FISH_COLORS = ['#7ec8e3', '#f7b2c4', '#a8e6a1', '#b9a7f5', '#ffcf3f'];
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

export function headR(t) { return 14 + Math.min(10, t.kids.length * 0.18); }
export function gapIdx(t) { return Math.max(3, Math.round(headR(t) * 1.15 / STEP)); }

// 꼬리 경로(trail)에서 아기냥 자리(segs)를 다시 계산한다.
export function computeSegs(t) {
  const tr = t.trail, L = tr.length, g = gapIdx(t);
  t.segs.length = t.kids.length;
  let x0 = t.x, y0 = t.y, x1 = t.x, y1 = t.y;
  for (let k = 1; k <= t.kids.length; k++) {
    const i = Math.max(1, L - 1 - k * g);
    const p = tr[i], q = tr[Math.min(L - 1, i + 2)];
    const s = t.segs[k - 1] || (t.segs[k - 1] = {});
    s.x = p.x; s.y = p.y; s.a = Math.atan2(q.y - p.y, q.x - p.x);
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  const pad = headR(t) + 4;
  t.box.x0 = x0 - pad; t.box.y0 = y0 - pad; t.box.x1 = x1 + pad; t.box.y1 = y1 + pad;
}

// 꼬리 경로가 모자라면 끝에서 뒤로 늘린다.
export function ensureTrail(t) {
  const need = (t.kids.length + 2) * gapIdx(t);
  if (t.trail.length >= need) return;
  const p0 = t.trail[0], p1 = t.trail[1] || { x: p0.x + Math.cos(t.a), y: p0.y + Math.sin(t.a) };
  let dx = p0.x - p1.x, dy = p0.y - p1.y;
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const add = [];
  for (let i = need - t.trail.length; i >= 1; i--) add.push({ x: p0.x + dx * i * STEP, y: p0.y + dy * i * STEP });
  t.trail = add.concat(t.trail);
}

export function createWorld() {
  const w = {
    trains: [], fish: [], kittens: [], now: 0, nextId: 1, events: [],
    usedNames: new Set(), nextBasket: 8,
  };
  for (let i = 0; i < FISH_COUNT; i++) spawnFish(w);
  for (let i = 0; i < POISON_COUNT; i++) spawnPoison(w);
  for (let i = 0; i < ONION_COUNT; i++) spawnPoison(w, true);
  for (let i = 0; i < WILD_COUNT; i++) spawnWild(w);
  balanceBots(w);
  return w;
}

function makeTrain(w, opts) {
  const a = opts.a !== undefined ? opts.a : rand(0, Math.PI * 2);
  const t = {
    id: w.nextId++, name: opts.name, fur: opts.fur, isPlayer: !!opts.isPlayer, bot: !opts.isPlayer,
    scarf: opts.scarf, x: opts.x, y: opts.y, a: a, ta: a,
    hat: HAT_KEYS.includes(opts.hat) ? opts.hat : '', tail: TAIL_KEYS.includes(opts.tail) ? opts.tail : '',
    face: FACE_KEYS.includes(opts.face) ? opts.face : '',
    kids: [], trail: [], segs: [], gauge: 0, alive: true,
    invul: 2, dashing: false, dashNow: false, dropT: 0, think: 0, goal: null, wanderT: 0,
    aggr: opts.aggr || 0, sloppy: opts.sloppy || 0, respawn: 0, maxLen: 0, born: w.now,
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },
  };
  const kids = opts.kids || [];
  for (let i = 0; i < opts.len; i++) t.kids.push(kids[i] || FUR_KEYS[randInt(FUR_KEYS.length)]);
  t.maxLen = t.kids.length;
  const need = (t.kids.length + 2) * gapIdx(t);
  for (let i = need; i >= 0; i--) t.trail.push({ x: t.x - Math.cos(a) * i * STEP, y: t.y - Math.sin(a) * i * STEP });
  computeSegs(t);
  return t;
}

function spawnFish(w) {
  const gold = Math.random() < 0.05;
  w.fish.push({ x: rand(30, WORLD - 30), y: rand(30, WORLD - 30), v: gold ? 3 : 1, c: gold ? 4 : randInt(4) });
}

// 독버섯(v = -1)과 양파(v = -2)는 간식과 같은 목록에 둔다 (화면에 보낼 때도 같이 간다)
function spawnPoison(w, onion) {
  const p = safeSpot(w, 60, 0);
  const f = { x: p.x, y: p.y, v: onion ? -2 : -1, c: onion ? 6 : 5 };
  if (onion) { f.vx = 0; f.vy = 0; f.turnT = 0; }
  w.fish.push(f);
}

// 아기냥 바구니(v = -3): 먼저 닿은 기차가 아기냥 여러 마리를 한꺼번에 데려간다.
function spawnBasket(w) {
  const p = safeSpot(w, 200, 0);
  w.fish.push({ x: p.x, y: p.y, v: -3, c: 7 });
  w.events.push({ type: 'basket' });
}

// 양파는 이리저리 굴러다녀서 피하기 어렵다.
export const ONION_SPEED = [45, 85];
function rollOnions(w, dt) {
  for (const f of w.fish) {
    if (f.v !== -2) continue;
    f.turnT -= dt;
    if (f.turnT <= 0) {
      f.turnT = rand(0.8, 2.2);
      const a = rand(0, Math.PI * 2), sp = rand(ONION_SPEED[0], ONION_SPEED[1]);
      f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp;
    }
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.x < 30 || f.x > WORLD - 30) { f.vx = -f.vx; f.x = clamp(f.x, 30, WORLD - 30); }
    if (f.y < 30 || f.y > WORLD - 30) { f.vy = -f.vy; f.y = clamp(f.y, 30, WORLD - 30); }
  }
}

function spawnWild(w) {
  const p = safeSpot(w, 120, 0);
  w.kittens.push({ x: p.x, y: p.y, fur: FUR_KEYS[randInt(FUR_KEYS.length)], vx: 0, vy: 0, wild: true, born: w.now, a: rand(0, 6.28), t: rand(0, 3) });
}

function dropKitten(w, x, y, fur, burst) {
  const ang = rand(0, Math.PI * 2), sp = burst ? rand(40, 140) : rand(10, 40);
  w.kittens.push({ x: x, y: y, fur: fur, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, wild: false, born: w.now, a: ang, t: 0 });
}

// 다른 기차들과 충분히 떨어진 빈자리를 찾는다.
function safeSpot(w, minGap, awayFromPlayers) {
  let best = null, bestScore = -1;
  for (let tries = 0; tries < 40; tries++) {
    const x = rand(200, WORLD - 200), y = rand(200, WORLD - 200);
    let score = Infinity;
    for (const t of w.trains) {
      if (!t.alive) continue;
      score = Math.min(score, Math.sqrt(dist2(x, y, t.x, t.y)));
      for (const s of t.segs) score = Math.min(score, Math.sqrt(dist2(x, y, s.x, s.y)));
      if (awayFromPlayers && t.isPlayer) {
        const dp = Math.sqrt(dist2(x, y, t.x, t.y));
        if (dp < awayFromPlayers) score = Math.min(score, dp * 0.3);
      }
    }
    if (score > minGap * 2) return { x, y };
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

function newBot(w, name) {
  const p = safeSpot(w, 220, 600);
  return makeTrain(w, {
    name: name || botName(w), fur: FUR_KEYS[randInt(FUR_KEYS.length)], scarf: SCARVES[1 + randInt(SCARVES.length - 1)],
    x: p.x, y: p.y, len: Math.floor(rand(START_LEN, 12)), aggr: rand(0, 0.55), sloppy: rand(0.05, 0.3),
    a: Math.atan2(WORLD / 2 - p.y, WORLD / 2 - p.x),
    // 컴퓨터 냥이도 가끔 꾸미고 나온다
    hat: Math.random() < 0.3 ? HAT_KEYS[randInt(HAT_KEYS.length)] : '',
    tail: Math.random() < 0.15 ? TAIL_KEYS[randInt(TAIL_KEYS.length)] : '',
    face: Math.random() < 0.1 ? FACE_KEYS[randInt(FACE_KEYS.length)] : '',
  });
}

function humans(w) {
  let n = 0;
  for (const t of w.trains) if (t.isPlayer) n++;
  return n;
}

// 사람이 늘면 컴퓨터 냥이를 줄이고, 줄면 늘린다. 줄일 때는 죽은 뒤 다시 나오지 않게만 한다.
function balanceBots(w) {
  const want = Math.max(MIN_BOTS, TRAIN_TARGET - humans(w));
  let bots = 0;
  for (const t of w.trains) if (t.bot) bots++;
  while (bots < want) { w.trains.push(newBot(w)); bots++; }
  w.botWant = want;
}

// 사람 기차를 놀이터에 넣는다. kids를 주면 그 아기냥들을 데리고 시작한다(이어하기).
export function addPlayer(w, opts) {
  const p = safeSpot(w, 260, 0);
  const len = opts.kids ? opts.kids.length : START_LEN;
  const t = makeTrain(w, {
    name: opts.name, fur: opts.fur, scarf: SCARVES[0], isPlayer: true, x: p.x, y: p.y, len: len, kids: opts.kids,
    hat: opts.hat, tail: opts.tail, face: opts.face,
    a: Math.atan2(WORLD / 2 - p.y, WORLD / 2 - p.x),
  });
  t.input = { a: t.a, dash: false };
  w.trains.push(t);
  balanceBots(w);
  return t;
}

export function removeTrain(w, t) {
  const i = w.trains.indexOf(t);
  if (i >= 0) w.trains.splice(i, 1);
  if (t.alive && t.segs) {
    t.alive = false;
    for (let k = 0; k < t.segs.length; k++) dropKitten(w, t.segs[k].x, t.segs[k].y, t.kids[k], true);
  }
  balanceBots(w);
}

// ───── 컴퓨터 냥이 ─────
function hitsSomething(w, b, x, y, extra) {
  const m = 24;
  if (x < m || y < m || x > WORLD - m || y > WORLD - m) return true;
  for (const t of w.trains) {
    if (t === b || !t.alive) continue;
    if (x < t.box.x0 - extra || x > t.box.x1 + extra || y < t.box.y0 - extra || y > t.box.y1 + extra) continue;
    const rr = headR(t) * 0.74 + extra;
    if (dist2(x, y, t.x, t.y) < (headR(t) + extra) * (headR(t) + extra)) return true;
    for (const s of t.segs) if (dist2(x, y, s.x, s.y) < rr * rr) return true;
  }
  return false;
}

function danger(w, b, ang) {
  const r = headR(b);
  let d = 0;
  const probes = [r * 1.6, r * 3.2, r * 5];
  for (let i = 0; i < probes.length; i++) {
    if (hitsSomething(w, b, b.x + Math.cos(ang) * probes[i], b.y + Math.sin(ang) * probes[i], r * 0.9)) d += 3 - i;
  }
  return d;
}

function botThink(w, b) {
  let goal = null, hunting = false;
  if (b.aggr > 0) {
    for (const p of w.trains) {
      if (!p.isPlayer || !p.alive || p.invul > 0) continue;
      if (b.kids.length >= p.kids.length * 0.6 && dist2(b.x, b.y, p.x, p.y) < 320 * 320 && Math.random() < b.aggr) {
        goal = { x: p.x + Math.cos(p.a) * 110, y: p.y + Math.sin(p.a) * 110 };
        hunting = true;
        break;
      }
    }
  }
  if (!goal) {
    let bd = 900 * 900;
    for (const f of w.fish) { if (f.v !== -3) continue; const d = dist2(b.x, b.y, f.x, f.y); if (d < bd) { bd = d; goal = f; } }
  }
  if (!goal) {
    let bd = 420 * 420;
    for (const k of w.kittens) { const d = dist2(b.x, b.y, k.x, k.y); if (d < bd) { bd = d; goal = k; } }
  }
  if (!goal) {
    let bd = 260 * 260;
    for (const f of w.fish) { if (f.v < 0) continue; const d = dist2(b.x, b.y, f.x, f.y) / f.v; if (d < bd) { bd = d; goal = f; } }
  }
  if (!goal) {
    if (!b.goal || b.wanderT < w.now || dist2(b.x, b.y, b.goal.x, b.goal.y) < 60 * 60) {
      b.goal = { x: rand(200, WORLD - 200), y: rand(200, WORLD - 200) };
      b.wanderT = w.now + rand(3, 6);
    }
    goal = b.goal;
  }
  let want = Math.atan2(goal.y - b.y, goal.x - b.x);
  if (Math.random() > b.sloppy && danger(w, b, want) > 0) {
    let best = want, bestD = Infinity;
    for (let k = 1; k <= 8 && bestD > 0; k++) {
      for (const s of [1, -1]) {
        const ang = want + s * k * 0.42;
        const dd = danger(w, b, ang);
        if (dd < bestD) { bestD = dd; best = ang; }
        if (dd === 0) break;
      }
    }
    want = best;
    hunting = false;
  }
  // 앞에 독버섯이 있으면 살짝 비켜 간다 (덜렁이 봇은 가끔 그냥 먹는다)
  if (Math.random() > b.sloppy) {
    for (const f of w.fish) {
      if (f.v >= 0 || f.v === -3) continue;
      const dx = f.x - b.x, dy = f.y - b.y;
      if (dx * dx + dy * dy > 90 * 90) continue;
      const ang = Math.atan2(dy, dx), diff = angleTo(want, ang);
      if (Math.abs(diff) < 0.6) { want = ang - (diff >= 0 ? 1 : -1) * 0.9; break; }
    }
  }
  b.ta = want;
  b.dashing = hunting && b.kids.length > 8;
}

// ───── 한 단계 진행 ─────
function addKid(w, t, fur) {
  t.kids.push(fur || FUR_KEYS[randInt(FUR_KEYS.length)]);
  ensureTrail(t);
  if (t.kids.length > t.maxLen) t.maxLen = t.kids.length;
  if (t.isPlayer) w.events.push({ type: 'gain', train: t });
}

function moveTrain(w, t, dt) {
  if (t.invul > 0) t.invul -= dt;
  // 달리기: 간식 게이지를 쓰고, 다 쓰면 꼬리 아기냥을 한 마리씩 흘린다.
  let dashing = t.dashing;
  if (dashing) {
    if (t.gauge > 0) t.gauge = Math.max(0, t.gauge - 2.2 * dt);
    else if (t.kids.length > START_LEN) {
      t.dropT += dt;
      if (t.dropT > 0.55) {
        t.dropT = 0;
        const s = t.segs[t.kids.length - 1];
        const fur = t.kids.pop();
        if (s) dropKitten(w, s.x, s.y, fur, false);
      }
    } else dashing = false;
  }
  const turn = TURN * dt * (dashing ? 0.8 : 1);
  t.a += clamp(angleTo(t.a, t.ta), -turn, turn);
  const sp = SPEED * (t.bot ? 0.93 : 1) * (dashing ? DASH : 1);
  t.x += Math.cos(t.a) * sp * dt;
  t.y += Math.sin(t.a) * sp * dt;
  let last = t.trail[t.trail.length - 1];
  let dx = t.x - last.x, dy = t.y - last.y, l = Math.hypot(dx, dy);
  while (l >= STEP) {
    last = { x: last.x + dx / l * STEP, y: last.y + dy / l * STEP };
    t.trail.push(last);
    dx = t.x - last.x; dy = t.y - last.y; l = Math.hypot(dx, dy);
  }
  const need = (t.kids.length + 2) * gapIdx(t);
  if (t.trail.length > need + 80) t.trail.splice(0, t.trail.length - need);
  computeSegs(t);
  t.dashNow = dashing;
}

function eat(w, t) {
  const r = headR(t);
  const fish = w.fish, kittens = w.kittens;
  for (let i = fish.length - 1; i >= 0; i--) {
    const f = fish[i];
    const fr = r + (f.v === -2 ? 13 : f.v === -3 ? 18 : 8);
    if (dist2(t.x, t.y, f.x, f.y) < fr * fr) {
      fish.splice(i, 1);
      if (f.v === -3) {
        for (let n = 0; n < BASKET_KIDS; n++) if (t.isPlayer || t.kids.length < BOT_MAX_LEN) addKid(w, t);
        w.events.push({ type: 'basketGot', train: t, n: BASKET_KIDS });
        continue;
      }
      if (f.v < 0) {
        // 독버섯: 꼬리 쪽 아기냥 2마리, 양파: 아기냥 절반이 놀라서 도망간다
        const onion = f.v === -2;
        const loss = onion ? Math.floor(t.kids.length / 2) : POISON_LOSS;
        let n = 0;
        for (; n < loss && t.kids.length > 0; n++) {
          const s = t.segs[t.kids.length - 1];
          const fur = t.kids.pop();
          dropKitten(w, s ? s.x : t.x, s ? s.y : t.y, fur, true);
          // 바로 다시 주워 먹지 못하게 잠깐 피한다
          const k = w.kittens[w.kittens.length - 1];
          k.shy = t.id; k.shyUntil = w.now + 2;
        }
        w.events.push({ type: 'poison', train: t, n: n, onion: onion });
        continue;
      }
      t.gauge += f.v;
      while (t.gauge >= GAUGE_MAX) {
        t.gauge -= GAUGE_MAX;
        if (t.isPlayer || t.kids.length < BOT_MAX_LEN) addKid(w, t);
      }
    }
  }
  for (let i = kittens.length - 1; i >= 0; i--) {
    const k = kittens[i];
    if (k.shy === t.id && w.now < k.shyUntil) continue;
    if (dist2(t.x, t.y, k.x, k.y) < (r + 10) * (r + 10)) {
      kittens.splice(i, 1);
      if (t.isPlayer || t.kids.length < BOT_MAX_LEN) addKid(w, t, k.fur);
    }
  }
}

function crash(w, t, by) {
  if (!t.alive) return;
  t.alive = false;
  t.deadAt = w.now;
  for (let i = 0; i < t.segs.length; i++) dropKitten(w, t.segs[i].x, t.segs[i].y, t.kids[i], true);
  if (t.bot) t.respawn = w.now + rand(2, 5);
  // 죽은 순간의 순위 (살아 있는 기차 + 나)
  let rank = 1, count = 1;
  for (const o of w.trains) {
    if (o === t || !o.alive) continue;
    count++;
    if (o.kids.length > t.kids.length) rank++;
  }
  w.events.push({ type: 'crash', train: t, by: by, rank: rank, count: count });
}

function collide(w) {
  const dead = [];
  for (const a of w.trains) {
    if (!a.alive || a.invul > 0) continue;
    const ra = headR(a) * 0.82;
    if (a.x < ra || a.y < ra || a.x > WORLD - ra || a.y > WORLD - ra) { dead.push([a, null]); continue; }
    for (const b of w.trains) {
      if (b === a || !b.alive) continue;
      if (a.x < b.box.x0 - ra || a.x > b.box.x1 + ra || a.y < b.box.y0 - ra || a.y > b.box.y1 + ra) continue;
      const rb = headR(b);
      // 머리끼리 부딪히면 짧은 쪽이 진다 (같으면 둘 다).
      if (dist2(a.x, a.y, b.x, b.y) < (ra + rb * 0.82) * (ra + rb * 0.82)) {
        if (b.invul > 0 || a.kids.length <= b.kids.length) { dead.push([a, b]); break; }
        continue;
      }
      const kr = rb * 0.74 * 0.85 + ra;
      let hit = false;
      for (const s of b.segs) if (dist2(a.x, a.y, s.x, s.y) < kr * kr) { hit = true; break; }
      if (hit) { dead.push([a, b]); break; }
    }
  }
  for (const [t, by] of dead) crash(w, t, by);
}

// dt초만큼 놀이터를 진행한다. 일어난 일(gain, crash)은 w.events에 쌓인다.
export function step(w, dt) {
  w.now += dt;
  for (const t of w.trains) {
    if (!t.alive) continue;
    if (t.bot) {
      t.think -= dt;
      if (t.think <= 0) { t.think = 0.12 + Math.random() * 0.06; botThink(w, t); }
    } else if (t.input) {
      t.ta = t.input.a;
      t.dashing = t.input.dash;
    }
    moveTrain(w, t, dt);
  }
  for (const t of w.trains) if (t.alive) eat(w, t);
  collide(w);
  // 죽은 컴퓨터 냥이는 잠시 뒤 다른 곳에서 다시 나온다. 사람이 많으면 다시 나오지 않는다.
  let bots = 0;
  for (const t of w.trains) if (t.bot && t.alive) bots++;
  for (let i = w.trains.length - 1; i >= 0; i--) {
    const t = w.trains[i];
    if (t.bot && !t.alive && w.now > t.respawn) {
      w.usedNames.delete(t.name);
      if (bots < w.botWant) { w.trains[i] = newBot(w); bots++; }
      else w.trains.splice(i, 1);
    }
  }
  // 길 잃은 아기냥 움직임
  const kittens = w.kittens;
  for (let i = kittens.length - 1; i >= 0; i--) {
    const k = kittens[i];
    k.t += dt;
    if (k.wild) {
      if (k.t > 2.5) { k.t = 0; const a = rand(0, 6.28), s = rand(0, 22); k.vx = Math.cos(a) * s; k.vy = Math.sin(a) * s; if (s > 0) k.a = a; }
    } else {
      k.vx *= Math.pow(0.12, dt); k.vy *= Math.pow(0.12, dt);
      if (w.now - k.born > 30) { kittens.splice(i, 1); continue; }
    }
    k.x = clamp(k.x + k.vx * dt, 20, WORLD - 20);
    k.y = clamp(k.y + k.vy * dt, 20, WORLD - 20);
  }
  if (kittens.length > 600) {
    const i = kittens.findIndex((k) => !k.wild);
    if (i >= 0) kittens.splice(i, 1);
  }
  let wild = 0;
  for (const k of kittens) if (k.wild) wild++;
  if (wild < WILD_COUNT && Math.random() < dt * 9) spawnWild(w);
  rollOnions(w, dt);
  let poison = 0, onion = 0, baskets = 0;
  for (const f of w.fish) { if (f.v === -1) poison++; else if (f.v === -2) onion++; else if (f.v === -3) baskets++; }
  while (w.fish.length - poison - onion - baskets < FISH_COUNT) spawnFish(w);
  if (w.now >= w.nextBasket) {
    w.nextBasket = w.now + BASKET_EVERY;
    if (baskets < BASKET_MAX) spawnBasket(w);
  }
  if (poison < POISON_COUNT && Math.random() < dt * 1.5) spawnPoison(w);
  if (onion < ONION_COUNT && Math.random() < dt * 0.3) spawnPoison(w, true);
  for (const t of w.trains) if (t.alive && t.kids.length > t.maxLen) t.maxLen = t.kids.length;
}

export function ranked(w) {
  return w.trains.filter((t) => t.alive).sort((a, b) => b.kids.length - a.kids.length);
}
