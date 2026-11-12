// 냥이 꼬리기차: 대장 냥이가 간식을 먹고 아기냥이를 모아 기차를 길게 만든다.
// 다른 기차의 몸에 머리를 박으면 끝. 상대는 모두 컴퓨터 냥이(🤖)다.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const FONT = '"Jua", -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

  const WORLD = 2400;          // 놀이터 한 변 길이
  const STEP = 4;              // 꼬리 경로를 저장하는 간격
  const SPEED = 150;           // 기본 속도(초당)
  const DASH = 1.8;            // 달리기 배율
  const TURN = 4.2;            // 초당 회전 각도(라디안)
  const GAUGE_MAX = 5;         // 간식 몇 개에 아기냥 한 마리
  const START_LEN = 3;
  const BOT_COUNT = 11;
  const FISH_COUNT = 450;
  const WILD_COUNT = 28;       // 놀이터를 떠도는 길 잃은 아기냥 수
  const BOT_MAX_LEN = 30;

  const BEST_KEY = 'nyang-cattrain-best';
  const FUR_KEY = 'nyang-cattrain-fur';
  const NAME_KEY = 'nyang-nickname';

  const FURS = {
    orange: ['#f4a24c', '#d97a22'],
    gray: ['#9aa3ad', '#6f7882'],
    white: ['#fbf6ee', '#d8cfc2'],
    black: ['#3b3a40', '#22212a'],
    calico: ['#fbf6ee', '#e08a3c'],
    cream: ['#f3d9a8', '#d6b47a'],
  };
  const FUR_KEYS = Object.keys(FURS);
  const PICK_FURS = ['orange', 'gray', 'white', 'black', 'calico'];
  const BOT_NAMES = ['까망이', '회색번개', '콩떡', '삼색이', '치즈볼', '두부', '호떡', '모찌', '깜냥', '보리', '라떼', '흰둥이', '꼬미', '찹쌀'];
  const SCARVES = ['#5a8dee', '#9b6be0', '#2fae8f', '#e05a9b', '#e0b33a', '#6c7a89', '#3aa0c8'];
  const FISH_COLORS = ['#7ec8e3', '#f7b2c4', '#a8e6a1', '#b9a7f5'];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
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

  // 그림 한 마리를 (x, y)에 반지름 r로, 진행 방향 a(머리가 앞)를 보도록 그린다.
  function drawSprite(img, x, y, r, a) {
    const s = r / SR;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.drawImage(img, -SPR / 2 * s, -(SPR / 2 + 6) * s, SPR * s, SPR * s);
    ctx.restore();
  }

  // 바닥 무늬
  const groundTile = (function () {
    const c = document.createElement('canvas');
    c.width = c.height = 224;
    const g = c.getContext('2d');
    g.fillStyle = '#8fd18a'; g.fillRect(0, 0, 224, 224);
    g.fillStyle = '#86c981';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) g.fillRect(i * 56, j * 56, 56, 56);
    for (let k = 0; k < 7; k++) {
      const x = rand(8, 216), y = rand(8, 216);
      g.fillStyle = ['#fff', '#ffe680', '#ffb3c7'][k % 3];
      for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 3, y + Math.sin(p * 1.26) * 3, 2.2, 0, 7); g.fill(); }
      g.fillStyle = '#ffcf3f'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill();
    }
    return ctx.createPattern(c, 'repeat');
  })();

  // ───── 게임 상태 ─────
  let trains = [];
  let fish = [];
  let kittens = [];   // 길 잃은 아기냥
  let player = null;
  let state = 'menu'; // menu | play | dying | result
  let cam = { x: WORLD / 2, y: WORLD / 2, z: 1 };
  let vw = 0, vh = 0, dpr = 1, baseZoom = 1;
  let run = null;     // 한 판 기록
  let hintUntil = 0;
  let now = 0;
  let floats = [];    // "+1" 같은 글자 효과

  function headR(t) { return 14 + Math.min(10, t.kids.length * 0.18); }
  function gapIdx(t) { return Math.max(3, Math.round(headR(t) * 1.15 / STEP)); }

  function makeTrain(opts) {
    const a = opts.a !== undefined ? opts.a : rand(0, Math.PI * 2);
    const t = {
      name: opts.name, fur: opts.fur, isPlayer: !!opts.isPlayer, bot: !opts.isPlayer,
      scarf: opts.scarf, x: opts.x, y: opts.y, a: a, ta: a,
      kids: [], trail: [], segs: [], gauge: 0, alive: true,
      invul: 2, dashing: false, dropT: 0, think: 0, goal: null, wanderT: 0,
      aggr: opts.aggr || 0, sloppy: opts.sloppy || 0, respawn: 0,
      box: { x0: 0, y0: 0, x1: 0, y1: 0 },
    };
    for (let i = 0; i < opts.len; i++) t.kids.push(pick(FUR_KEYS));
    const need = (t.kids.length + 2) * gapIdx(t);
    for (let i = need; i >= 0; i--) t.trail.push({ x: t.x - Math.cos(a) * i * STEP, y: t.y - Math.sin(a) * i * STEP });
    computeSegs(t);
    return t;
  }

  // 꼬리 경로가 모자라면 끝에서 뒤로 늘린다.
  function ensureTrail(t) {
    const need = (t.kids.length + 2) * gapIdx(t);
    if (t.trail.length >= need) return;
    const p0 = t.trail[0], p1 = t.trail[1] || { x: p0.x + Math.cos(t.a), y: p0.y + Math.sin(t.a) };
    let dx = p0.x - p1.x, dy = p0.y - p1.y;
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const add = [];
    for (let i = need - t.trail.length; i >= 1; i--) add.push({ x: p0.x + dx * i * STEP, y: p0.y + dy * i * STEP });
    t.trail = add.concat(t.trail);
  }

  function computeSegs(t) {
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

  function addKid(t, fur) {
    t.kids.push(fur || pick(FUR_KEYS));
    ensureTrail(t);
    if (t.isPlayer) {
      run.maxLen = Math.max(run.maxLen, t.kids.length);
      floats.push({ x: t.x + 34, y: t.y - 10, text: '+1 냥', t: 0 });
    }
  }

  function spawnFish() {
    const gold = Math.random() < 0.05;
    fish.push({ x: rand(30, WORLD - 30), y: rand(30, WORLD - 30), v: gold ? 3 : 1, c: gold ? '#ffcf3f' : pick(FISH_COLORS), r: rand(0, 6.28) });
  }

  function spawnWild() {
    const p = safeSpot(120, 0);
    kittens.push({ x: p.x, y: p.y, fur: pick(FUR_KEYS), vx: 0, vy: 0, wild: true, born: now, a: rand(0, 6.28), t: rand(0, 3) });
  }

  function dropKitten(x, y, fur, burst) {
    const ang = rand(0, Math.PI * 2), sp = burst ? rand(40, 140) : rand(10, 40);
    kittens.push({ x: x, y: y, fur: fur, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, wild: false, born: now, a: ang, t: 0 });
  }

  // 다른 기차들과 충분히 떨어진 빈자리를 찾는다.
  function safeSpot(minGap, awayFromPlayer) {
    let best = null, bestScore = -1;
    for (let tries = 0; tries < 40; tries++) {
      const x = rand(200, WORLD - 200), y = rand(200, WORLD - 200);
      let near = Infinity;
      for (const t of trains) {
        if (!t.alive) continue;
        near = Math.min(near, Math.sqrt(dist2(x, y, t.x, t.y)));
        for (const s of t.segs) near = Math.min(near, Math.sqrt(dist2(x, y, s.x, s.y)));
      }
      let score = near;
      if (awayFromPlayer && player && player.alive) {
        const dp = Math.sqrt(dist2(x, y, player.x, player.y));
        if (dp < awayFromPlayer) score = Math.min(score, dp * 0.3);
      }
      if (score > minGap * 2) return { x, y };
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    return best;
  }

  function newBot(name) {
    const p = safeSpot(220, 600);
    return makeTrain({
      name: name, fur: pick(FUR_KEYS), scarf: pick(SCARVES), x: p.x, y: p.y,
      len: Math.floor(rand(START_LEN, 12)), aggr: rand(0, 0.55), sloppy: rand(0.05, 0.3),
      a: Math.atan2(WORLD / 2 - p.y, WORLD / 2 - p.x),
    });
  }

  function setupWorld() {
    trains = []; fish = []; kittens = []; floats = []; player = null;
    for (let i = 0; i < FISH_COUNT; i++) spawnFish();
    const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < BOT_COUNT; i++) trains.push(newBot(names[i]));
    for (let i = 0; i < WILD_COUNT; i++) spawnWild();
  }

  function spawnPlayer(len) {
    const p = safeSpot(260, 0);
    player = makeTrain({
      name: run.name, fur: run.fur, scarf: '#ff5a5a', isPlayer: true, x: p.x, y: p.y, len: len,
      a: Math.atan2(WORLD / 2 - p.y, WORLD / 2 - p.x),
    });
    trains.push(player);
    cam.x = player.x; cam.y = player.y;
    run.maxLen = Math.max(run.maxLen, player.kids.length);
    run.aliveSince = now;
    hintUntil = now + 4;
  }

  // ───── 컴퓨터 냥이 ─────
  function hitsSomething(b, x, y, extra) {
    const m = 24;
    if (x < m || y < m || x > WORLD - m || y > WORLD - m) return true;
    for (const t of trains) {
      if (t === b || !t.alive) continue;
      if (x < t.box.x0 - extra || x > t.box.x1 + extra || y < t.box.y0 - extra || y > t.box.y1 + extra) continue;
      const rr = headR(t) * 0.74 + extra;
      if (dist2(x, y, t.x, t.y) < (headR(t) + extra) * (headR(t) + extra)) return true;
      for (const s of t.segs) if (dist2(x, y, s.x, s.y) < rr * rr) return true;
    }
    return false;
  }

  function danger(b, ang) {
    const r = headR(b);
    let d = 0;
    const probes = [r * 1.6, r * 3.2, r * 5];
    for (let i = 0; i < probes.length; i++) {
      if (hitsSomething(b, b.x + Math.cos(ang) * probes[i], b.y + Math.sin(ang) * probes[i], r * 0.9)) d += 3 - i;
    }
    return d;
  }

  function botThink(b) {
    let goal = null, hunting = false;
    const p = player && player.alive && state === 'play' ? player : null;
    if (p && b.aggr > 0 && b.kids.length >= p.kids.length * 0.6 && dist2(b.x, b.y, p.x, p.y) < 320 * 320 && Math.random() < b.aggr) {
      goal = { x: p.x + Math.cos(p.a) * 110, y: p.y + Math.sin(p.a) * 110 };
      hunting = true;
    }
    if (!goal) {
      let bd = 420 * 420;
      for (const k of kittens) { const d = dist2(b.x, b.y, k.x, k.y); if (d < bd) { bd = d; goal = k; } }
    }
    if (!goal) {
      let bd = 260 * 260;
      for (const f of fish) { const d = dist2(b.x, b.y, f.x, f.y) / f.v; if (d < bd) { bd = d; goal = f; } }
    }
    if (!goal) {
      if (!b.goal || b.wanderT < now || dist2(b.x, b.y, b.goal.x, b.goal.y) < 60 * 60) {
        b.goal = { x: rand(200, WORLD - 200), y: rand(200, WORLD - 200) };
        b.wanderT = now + rand(3, 6);
      }
      goal = b.goal;
    }
    let want = Math.atan2(goal.y - b.y, goal.x - b.x);
    if (Math.random() > b.sloppy && danger(b, want) > 0) {
      let best = want, bestD = Infinity;
      for (let k = 1; k <= 8; k++) {
        for (const s of [1, -1]) {
          const ang = want + s * k * 0.42;
          const dd = danger(b, ang);
          if (dd < bestD) { bestD = dd; best = ang; }
          if (dd === 0) break;
        }
        if (bestD === 0) break;
      }
      want = best;
      hunting = false;
    }
    b.ta = want;
    b.dashing = hunting && b.gauge > 1;
  }

  // ───── 한 프레임 진행 ─────
  function moveTrain(t, dt) {
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
          if (s) dropKitten(s.x, s.y, fur, false);
        }
      } else dashing = false;
    }
    const turn = TURN * dt * (dashing ? 0.8 : 1);
    const d = angleTo(t.a, t.ta);
    t.a += clamp(d, -turn, turn);
    const sp = SPEED * (t.bot ? 0.93 : 1) * (dashing ? DASH : 1);
    t.x += Math.cos(t.a) * sp * dt;
    t.y += Math.sin(t.a) * sp * dt;
    // 꼬리 경로에 STEP 간격으로 점을 쌓는다.
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

  function eat(t) {
    const r = headR(t);
    for (let i = fish.length - 1; i >= 0; i--) {
      const f = fish[i];
      if (dist2(t.x, t.y, f.x, f.y) < (r + 8) * (r + 8)) {
        fish.splice(i, 1);
        t.gauge += f.v;
        while (t.gauge >= GAUGE_MAX) {
          t.gauge -= GAUGE_MAX;
          if (t.isPlayer || t.kids.length < BOT_MAX_LEN) addKid(t);
        }
      }
    }
    for (let i = kittens.length - 1; i >= 0; i--) {
      const k = kittens[i];
      if (dist2(t.x, t.y, k.x, k.y) < (r + 10) * (r + 10)) {
        kittens.splice(i, 1);
        if (t.isPlayer || t.kids.length < BOT_MAX_LEN) addKid(t, k.fur);
      }
    }
  }

  function crash(t, by) {
    if (!t.alive) return;
    t.alive = false;
    t.deadAt = now;
    t.by = by;
    for (let i = 0; i < t.segs.length; i++) dropKitten(t.segs[i].x, t.segs[i].y, t.kids[i], true);
    if (t.bot) t.respawn = now + rand(2, 5);
    if (t.isPlayer) {
      run.lived += now - run.aliveSince;
      const alive = trains.filter((o) => o.alive || o === t);
      run.rank = 1 + alive.filter((o) => o !== t && o.kids.length > t.kids.length).length;
      run.count = alive.length;
      run.by = by;
      state = 'dying';
      setTimeout(showResult, 1300);
      dashBtn.hidden = true;
    }
  }

  function collide() {
    const dead = [];
    for (const a of trains) {
      if (!a.alive || a.invul > 0) continue;
      const ra = headR(a) * 0.82;
      if (a.x < ra || a.y < ra || a.x > WORLD - ra || a.y > WORLD - ra) { dead.push([a, null]); continue; }
      for (const b of trains) {
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
    for (const [t, by] of dead) crash(t, by);
  }

  function update(dt) {
    now += dt;
    for (const t of trains) {
      if (!t.alive) continue;
      if (t.bot) {
        t.think -= dt;
        if (t.think <= 0) { t.think = 0.12 + Math.random() * 0.06; botThink(t); }
      } else {
        t.dashing = input.dash;
        if (input.keyTurn) t.ta = t.a + input.keyTurn * 1.2;
      }
      moveTrain(t, dt);
    }
    for (const t of trains) if (t.alive) eat(t);
    collide();
    // 죽은 컴퓨터 냥이는 잠시 뒤 다른 곳에서 다시 나온다.
    for (let i = 0; i < trains.length; i++) {
      const t = trains[i];
      if (t.bot && !t.alive && now > t.respawn) {
        trains[i] = newBot(t.name);
      }
    }
    // 길 잃은 아기냥 움직임
    for (let i = kittens.length - 1; i >= 0; i--) {
      const k = kittens[i];
      k.t += dt;
      if (k.wild) {
        if (k.t > 2.5) { k.t = 0; const a = rand(0, 6.28), s = rand(0, 22); k.vx = Math.cos(a) * s; k.vy = Math.sin(a) * s; if (s > 0) k.a = a; }
      } else {
        k.vx *= Math.pow(0.12, dt); k.vy *= Math.pow(0.12, dt);
        if (now - k.born > 30) { kittens.splice(i, 1); continue; }
      }
      k.x = clamp(k.x + k.vx * dt, 20, WORLD - 20);
      k.y = clamp(k.y + k.vy * dt, 20, WORLD - 20);
    }
    if (kittens.length > 260) kittens.splice(kittens.findIndex((k) => !k.wild), 1);
    let wild = 0;
    for (const k of kittens) if (k.wild) wild++;
    if (wild < WILD_COUNT && Math.random() < dt * 0.6) spawnWild();
    while (fish.length < FISH_COUNT) spawnFish();
    for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 0.9) floats.splice(i, 1); }
    if (player && player.alive) run.maxLen = Math.max(run.maxLen, player.kids.length);
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
    ctx.save();
    ctx.translate(f.x, f.y); ctx.rotate(f.r + Math.sin(now * 3 + f.r) * 0.2);
    ctx.fillStyle = f.c;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.8, 0); ctx.lineTo(s * 1.5, -s * 0.5); ctx.lineTo(s * 1.5, s * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#234'; ctx.beginPath(); ctx.arc(-s * 0.5, -s * 0.1, s * 0.13, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawTrain(t, rank1) {
    const r = headR(t), kr = r * 0.74;
    const blink = t.invul > 0 && Math.floor(now * 8) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.45;
    // 줄
    const segs = t.alive ? t.segs : [];
    if (segs.length) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = r * 0.45; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(t.x, t.y);
      for (const s of segs) ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      const face = (i + Math.floor(now * 0.7)) % 4 === 0 ? 'happy' : 'normal';
      drawSprite(sprites[t.kids[i]][face], s.x, s.y, kr, s.a);
    }
    // 대장 냥이 + 목도리
    ctx.save();
    ctx.translate(t.x, t.y); ctx.rotate(t.a + Math.PI / 2);
    ctx.fillStyle = t.scarf;
    ctx.beginPath(); ctx.ellipse(0, r * 0.85, r * 0.78, r * 0.24, 0, 0, 7); ctx.fill();
    ctx.restore();
    drawSprite(sprites[t.fur][t.alive ? 'normal' : 'dizzy'], t.x, t.y, r, t.a);
    if (rank1) {
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

  function drawLabel(t) {
    const r = headR(t);
    text(t.bot ? '🤖 ' + t.name : t.name, t.x, t.y - r * 1.9, 13 / cam.z * 0.9 + 3, '#fff', 'center', ['rgba(0,0,0,.5)', 3.5]);
  }

  function ranked() {
    return trains.filter((t) => t.alive).sort((a, b) => b.kids.length - a.kids.length);
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#5c9a59';
    ctx.fillRect(0, 0, vw, vh);
    const z = cam.z;
    ctx.save();
    ctx.translate(vw / 2, vh / 2); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
    const L = cam.x - vw / 2 / z - 40, R = cam.x + vw / 2 / z + 40, T = cam.y - vh / 2 / z - 40, B = cam.y + vh / 2 / z + 40;
    const inView = (x, y) => x > L && x < R && y > T && y < B;
    ctx.fillStyle = groundTile;
    ctx.fillRect(Math.max(0, L), Math.max(0, T), Math.min(WORLD, R) - Math.max(0, L), Math.min(WORLD, B) - Math.max(0, T));
    // 울타리
    ctx.strokeStyle = '#a0683a'; ctx.lineWidth = 10; ctx.strokeRect(-5, -5, WORLD + 10, WORLD + 10);
    ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 4; ctx.setLineDash([18, 14]); ctx.strokeRect(-5, -5, WORLD + 10, WORLD + 10); ctx.setLineDash([]);

    for (const f of fish) if (inView(f.x, f.y)) drawFish(f);
    for (const k of kittens) {
      if (!inView(k.x, k.y)) continue;
      let alpha = 1;
      if (!k.wild) { const age = now - k.born; if (age > 26) alpha = Math.floor(age * 6) % 2 ? 0.3 : 0.8; }
      ctx.globalAlpha = alpha;
      drawSprite(sprites[k.fur].normal, k.x, k.y, 10, k.a + Math.sin(now * 2 + k.born) * 0.2);
      ctx.globalAlpha = 1;
      if (k.wild && (Math.floor(now / 1.5 + k.born) % 3 === 0)) {
        ctx.fillStyle = '#fff'; rrect(k.x + 8, k.y - 26, 24, 15, 7); ctx.fill();
        text('냥?', k.x + 20, k.y - 18.5, 10, '#c06');
      }
    }
    const order = ranked();
    const top = order[0];
    for (const t of trains) if (t !== player && (t.alive) && t.box.x1 > L && t.box.x0 < R && t.box.y1 > T && t.box.y0 < B) drawTrain(t, t === top);
    if (player && (player.alive || state === 'dying')) drawTrain(player, player === top);
    for (const t of trains) if (t.alive && inView(t.x, t.y)) drawLabel(t);
    if (player && !player.alive && state === 'dying') {
      text('쿵!', player.x, player.y - 40, 28, '#fff', 'center', ['#b4500a', 5]);
    }
    for (const f of floats) {
      ctx.globalAlpha = 1 - f.t / 0.9;
      text(f.text, f.x, f.y - f.t * 40, 16, '#fff', 'center', ['#e36d0e', 4]);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (state === 'play' || state === 'dying') drawHud(order);
  }

  function drawHud(order) {
    const top = 12 + safeTop;
    // 내 기차 길이 + 간식 게이지
    ctx.fillStyle = 'rgba(255,255,255,.9)'; rrect(12, top, 150, 62, 16); ctx.fill();
    drawSprite(sprites.cream.happy, 38, top + 30, 13, -Math.PI / 2);
    text('아기냥', 60, top + 15, 13, '#8a4a12', 'left');
    text((player ? player.kids.length : 0) + '마리', 60, top + 36, 22, '#e36d0e', 'left');
    for (let i = 0; i < GAUGE_MAX; i++) {
      ctx.fillStyle = player && i < Math.floor(player.gauge) ? '#7ec8e3' : '#e8dccd';
      ctx.beginPath(); ctx.arc(64 + i * 14, top + 53, 4.5, 0, 7); ctx.fill();
    }
    // 이번 판 순위
    const w = 150, x0 = vw - w - 12;
    const rows = order.slice(0, 5);
    const myIdx = order.indexOf(player);
    const extra = player && myIdx >= 5 ? 1 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.42)'; rrect(x0, top, w, 32 + (rows.length + extra) * 19, 14); ctx.fill();
    text('이번 판 순위', x0 + w / 2, top + 16, 13, '#ffd36e');
    const line = (t, n, y) => {
      if (t === player) { ctx.fillStyle = 'rgba(255,138,42,.75)'; rrect(x0 + 5, y - 9, w - 10, 18, 6); ctx.fill(); }
      let nm = (t.bot ? '🤖' : '') + t.name;
      if (nm.length > 7) nm = nm.slice(0, 7);
      text(n + '. ' + nm, x0 + 12, y, 12.5, '#fff', 'left');
      text(String(t.kids.length), x0 + w - 10, y, 12.5, '#fff', 'right');
    };
    rows.forEach((t, i) => line(t, i + 1, top + 38 + i * 19));
    if (extra) line(player, myIdx + 1, top + 38 + 5 * 19);
    // 지도
    const ms = 92, mx = 12, my = vh - ms - 18;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; rrect(mx, my, ms, ms, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.stroke();
    for (const t of trains) {
      if (!t.alive) continue;
      ctx.fillStyle = t === player ? '#ff8a2a' : 'rgba(255,255,255,.75)';
      const rad = t === player ? 4.5 : 2 + Math.min(3, t.kids.length / 12);
      ctx.beginPath(); ctx.arc(mx + 4 + t.x / WORLD * (ms - 8), my + 4 + t.y / WORLD * (ms - 8), rad, 0, 7); ctx.fill();
    }
    if (now < hintUntil && state === 'play') {
      ctx.globalAlpha = Math.min(1, hintUntil - now);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; rrect(vw / 2 - 115, vh - 170, 230, 36, 18); ctx.fill();
      text('가고 싶은 쪽으로 손가락을 움직여요', vw / 2, vh - 152, 13.5, '#8a4a12');
      ctx.globalAlpha = 1;
    }
  }

  // ───── 조작 ─────
  const input = { dash: false, steer: null, keyTurn: 0, keys: {} };
  const dashBtn = $('dash');

  function steerTo(clientX, clientY) {
    if (!player || !player.alive) return;
    const hx = vw / 2 + (player.x - cam.x) * cam.z, hy = vh / 2 + (player.y - cam.y) * cam.z;
    const dx = clientX - hx, dy = clientY - hy;
    if (dx * dx + dy * dy > 64) player.ta = Math.atan2(dy, dx);
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play') return;
    input.steer = e.pointerId;
    steerTo(e.clientX, e.clientY);
    if (e.pointerType === 'mouse' && e.button === 0) input.mouseDash = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (state !== 'play') return;
    if (e.pointerType === 'mouse' || e.pointerId === input.steer) steerTo(e.clientX, e.clientY);
  });
  const endSteer = (e) => { if (e.pointerId === input.steer) input.steer = null; if (e.pointerType === 'mouse') input.mouseDash = false; syncDash(); };
  canvas.addEventListener('pointerup', endSteer);
  canvas.addEventListener('pointercancel', endSteer);
  canvas.addEventListener('pointerdown', syncDash);

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

  function startRun() {
    let name = nameEl.value.replace(/\s+/g, ' ').trim().slice(0, 8);
    if (name) save(NAME_KEY, name); else name = '나';
    run = { name: name, fur: chosenFur, maxLen: 0, lived: 0, aliveSince: now, continued: false };
    setupWorld();
    spawnPlayer(START_LEN);
    startEl.hidden = true;
    state = 'play';
    dashBtn.hidden = false;
    input.dash = false; dashPointer = null; input.mouseDash = false; syncDash();
  }
  $('go').addEventListener('click', startRun);
  nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); startRun(); } });

  // ───── 결과 창 ─────
  const dialog = $('result');
  const ranking = window.Ranking ? window.Ranking.create('cattrain', $('ranking')) : { show() {} };
  const resultCat = $('result-cat').getContext('2d');

  function fmtTime(sec) {
    const s = Math.floor(sec);
    return Math.floor(s / 60) + '분 ' + (s % 60) + '초';
  }

  function showResult() {
    state = 'result';
    const by = run.by;
    $('result-title').textContent = by ? '쿵! ' + (by.bot ? '🤖 ' : '') + by.name + ' 기차에 부딪혔어요' : '쿵! 울타리에 부딪혔어요';
    resultCat.clearRect(0, 0, 160, 160);
    resultCat.drawImage(sprites[run.fur].dizzy, 16, 10, 128, 128);
    $('stat-len').textContent = run.maxLen + '마리';
    $('stat-rank').textContent = run.rank + '등 / ' + run.count;
    $('stat-time').textContent = fmtTime(run.lived);
    const best = Number(load(BEST_KEY, '0')) || 0;
    const bestEl = $('result-best');
    if (run.maxLen > best) {
      save(BEST_KEY, String(run.maxLen));
      bestEl.textContent = '🎉 내 최고 기록 갱신! ' + run.maxLen + '마리';
      bestEl.className = 'result-best new';
    } else {
      bestEl.textContent = '내 최고 기록 ' + best + '마리';
      bestEl.className = 'result-best';
    }
    $('continue-btn').hidden = run.continued || (player.kids.length < 2);
    ranking.show(run.maxLen);
    dialog.returnValue = '';
    dialog.showModal();
  }

  dialog.addEventListener('close', () => {
    if (state !== 'result') return;
    if (dialog.returnValue === 'continue' && !run.continued) {
      // 나중에 보상형 광고를 붙일 자리. 지금은 한 판에 한 번 그냥 이어 할 수 있다.
      run.continued = true;
      const keep = Math.max(START_LEN, Math.ceil(player.kids.length / 2));
      const kids = player.kids.slice(0, keep);
      trains.splice(trains.indexOf(player), 1);
      spawnPlayer(keep);
      player.kids = kids;
      ensureTrail(player); computeSegs(player);
      state = 'play';
      dashBtn.hidden = false;
    } else {
      startRun();
    }
  });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); });

  // ───── 반복 ─────
  let lastT = performance.now();
  let menuTarget = null;
  function frame(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    if (!document.hidden && state !== 'result') update(dt);
    // 카메라
    let fx = cam.x, fy = cam.y, len = 3;
    if (player && (state === 'play' || state === 'dying')) { fx = player.x; fy = player.y; len = player.kids.length; }
    else {
      if (!menuTarget || !menuTarget.alive) menuTarget = trains.find((o) => o.alive) || null;
      if (menuTarget) { fx = menuTarget.x; fy = menuTarget.y; }
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
  setupWorld();
  requestAnimationFrame(frame);

  // 시험용: 자동 확인 스크립트가 상태를 들여다볼 수 있게 한다.
  window.__cattrain = { get state() { return state; }, get player() { return player; }, get trains() { return trains; }, startRun };
})();
