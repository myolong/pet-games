// 게임 결과 창에 전체 순위(상위 10명)를 보여 주고, 닉네임으로 점수를 올린다.
// Supabase REST API(표 scores)만 쓴다. 점수 범위·닉네임 길이 검사는 서버의 표 제약 조건이 맡는다.
(function () {
  const NAME_KEY = 'nyang-nickname';
  const TOP_N = 10;
  const MAX_NAME = 8;

  // 닉네임 욕설 거르기. 띄어쓰기·기호를 뺀 뒤 들어 있는지만 본다.
  const BAD_WORDS = [
    '시발', '씨발', '씨빨', '시바', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '개새', '개색', '새끼', 'ㅅㄲ',
    '좆', '존나', '졸라', 'ㅈㄴ', '지랄', 'ㅈㄹ', '미친', '꺼져', '닥쳐', '엠창', '느금', '니애미', '애미', '애비',
    '섹스', '보지', '자지', '야동', '운영자', '관리자',
    'fuck', 'shit', 'bitch', 'sex', 'porn', 'dick', 'pussy', 'admin',
  ];

  // 순위 서버(Supabase) 주소와 공개 키. assets/ranking-config.js에서 넣는다.
  const config = window.RANKING_CONFIG || {};
  const base = (config.url || '').replace(/\/+$/, '') + '/rest/v1/scores';
  const enabled = Boolean(config.url && config.key);
  const headers = { apikey: config.key };

  function cleanName(name) {
    return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  }

  function isBadName(name) {
    const flat = name.toLowerCase().replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
    return BAD_WORDS.some((w) => flat.includes(w));
  }

  async function fetchTop(game) {
    const q = 'select=id,name,score&game=eq.' + game + '&order=score.desc,created_at.asc&limit=' + TOP_N;
    const res = await fetch(base + '?' + q, { headers });
    if (!res.ok) throw new Error('순위를 불러오지 못했어요');
    const rows = await res.json();
    return rows.map((r) => ({ id: r.id, name: r.name, score: Number(r.score) }));
  }

  async function submit(game, name, score) {
    const res = await fetch(base + '?select=id', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, headers),
      body: JSON.stringify({ game: game, name: name, score: score }),
    });
    if (!res.ok) throw new Error('기록을 올리지 못했어요');
    const rows = await res.json();
    return rows[0] && rows[0].id;
  }

  function loadName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  }

  function saveName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // 결과 창 안의 빈 <section>을 순위표로 채운다. 판이 끝날 때마다 show(점수)를 부른다.
  function create(game, section) {
    if (!enabled || !section) return { show() {} };
    section.hidden = false;
    section.className = 'ranking';

    const title = el('p', 'ranking-title', '🏆 전체 순위');
    const list = el('ol', 'ranking-list');
    const form = el('div', 'ranking-form');
    const input = el('input');
    input.maxLength = MAX_NAME;
    input.placeholder = '닉네임 (8자까지)';
    input.autocomplete = 'off';
    input.enterKeyHint = 'send';
    const button = el('button', 'ranking-submit', '올리기');
    button.type = 'button';
    form.append(input, button);
    const message = el('p', 'ranking-message');
    section.append(title, form, message, list);

    let round = 0;
    let score = 0;
    let myId = null;

    async function refresh() {
      const thisRound = round;
      list.replaceChildren(el('li', 'ranking-empty', '불러오는 중…'));
      try {
        const rows = await fetchTop(game);
        if (thisRound !== round) return;
        list.replaceChildren();
        if (!rows.length) list.append(el('li', 'ranking-empty', '아직 기록이 없어요. 첫 번째가 되어 보세요!'));
        rows.forEach((row, i) => {
          const li = el('li', row.id === myId ? 'mine' : '');
          li.append(el('span', 'rank', String(i + 1)), el('span', 'who', row.name), el('b', '', String(row.score)));
          list.append(li);
        });
      } catch (e) {
        // 순위 서버가 안 될 때는 오류 문구 대신 순위표를 통째로 숨긴다.
        if (thisRound === round) section.hidden = true;
      }
    }

    async function send() {
      const name = cleanName(input.value);
      if (!name) { message.textContent = '닉네임을 입력해 주세요.'; return; }
      if (isBadName(name)) { message.textContent = '다른 닉네임을 써 주세요.'; return; }
      button.disabled = true;
      message.textContent = '올리는 중…';
      try {
        myId = await submit(game, name, score);
        saveName(name);
        form.hidden = true;
        message.textContent = name + ' 님의 ' + score + '점을 올렸어요!';
        refresh();
      } catch (e) {
        message.textContent = e.message;
        button.disabled = false;
      }
    }

    button.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });

    return {
      show(newScore) {
        round++;
        score = newScore;
        section.hidden = false;
        myId = null;
        input.value = loadName();
        button.disabled = false;
        form.hidden = score <= 0;
        message.textContent = score > 0 ? '닉네임을 쓰고 전체 순위에 올려 보세요.' : '';
        refresh();
      },
    };
  }

  window.Ranking = { create };
})();
