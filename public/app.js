(function () {
  "use strict";

  const WORDS = window.WORDS;
  const TOTAL = WORDS.length;
  const STORE_KEY = "hanyu.v1";
  const REVIEW_GAPS = [1, 3, 7, 14, 30]; // 에빙하우스 간격 복습 (며칠 전 단어)

  // ── 저장소 ──
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.start) return { done: {}, rate: 0.75, ...s };
    } catch (e) { /* 저장소를 쓸 수 없으면 새로 시작 */ }
    return { start: todayStr(), done: {}, rate: 0.75 };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }

  // ── 날짜 (기기 현지 시간 기준) ──
  function todayStr(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function dayDiff(a, b) {
    const [y1, m1, d1] = a.split("-").map(Number);
    const [y2, m2, d2] = b.split("-").map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  }
  function shiftDate(s, n) {
    const [y, m, d] = s.split("-").map(Number);
    return todayStr(new Date(y, m - 1, d + n));
  }

  const state = load();
  save();

  // 오늘이 학습 며칠째인지 (1부터). 하루에 새 단어는 딱 하나만 열려요.
  function currentDay() { return Math.max(1, dayDiff(state.start, todayStr()) + 1); }
  function wordFor(day) { return WORDS[(day - 1) % TOTAL]; }
  function isDoneToday() { return !!state.done[todayStr()]; }

  function streak() {
    let n = 0;
    let d = todayStr();
    if (!state.done[d]) d = shiftDate(d, -1); // 오늘 아직 안 했어도 어제까지의 연속은 유지
    while (state.done[d]) { n++; d = shiftDate(d, -1); }
    return n;
  }

  // ── 병음 성조 ──
  const TONE_MARKS = {
    1: "āēīōūǖĀĒĪŌŪǕ", 2: "áéíóúǘÁÉÍÓÚǗ",
    3: "ǎěǐǒǔǚǍĚǏǑǓǙ", 4: "àèìòùǜÀÈÌÒÙǛ",
  };
  function toneOf(syl) {
    for (const t of [1, 2, 3, 4]) {
      for (const ch of syl) if (TONE_MARKS[t].includes(ch)) return t;
    }
    return 0;
  }

  // ── 음성 (기기 내장 중국어 TTS) ──
  let zhVoice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = speechSynthesis.getVoices();
    zhVoice =
      voices.find((v) => /zh[-_]CN/i.test(v.lang)) ||
      voices.find((v) => /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang)) ||
      voices.find((v) => /^zh/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.addEventListener("voiceschanged", pickVoice);
  }
  function speak(text, slow) {
    if (!("speechSynthesis" in window)) {
      alert("이 브라우저는 음성 재생을 지원하지 않아요.");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    if (zhVoice) u.voice = zhVoice;
    u.rate = slow ? Math.max(0.4, state.rate - 0.3) : state.rate;
    speechSynthesis.speak(u);
  }

  // ── 렌더링 도우미 ──
  const $view = document.getElementById("view");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function wordHTML(w) {
    const chars = [...w.h];
    const sylls = w.p.split(" ");
    const cells = chars.map((c, i) => {
      const s = sylls[i] || "";
      return `<span class="syl"><span class="py tone-${toneOf(s)}">${esc(s)}</span><span class="ch">${esc(c)}</span></span>`;
    }).join("");
    return `<div class="word ${chars.length >= 3 ? "long" : ""}" lang="zh-CN">${cells}</div>`;
  }

  function studyCardHTML(w, day, opts) {
    return `
      <article class="card">
        ${wordHTML(w)}
        <div class="speak-row">
          <button class="btn-ghost" data-say="${esc(w.h)}">🔊 듣기</button>
          <button class="btn-ghost" data-say="${esc(w.h)}" data-slow="1">🐢 천천히</button>
        </div>
        <button class="reveal ${opts.revealed ? "open" : ""}" data-reveal>
          ${opts.revealed
            ? `<div class="meaning">${esc(w.m)}</div>`
            : `<div class="hint">뜻을 먼저 떠올려 보세요 · 탭해서 확인</div>`}
        </button>
        ${w.kr ? `<div class="kr"><span class="label">한자어</span><span class="han">${esc(w.kr)}</span></div>` : ""}
      </article>

      <article class="card example">
        <div class="example-head">
          <p class="section-title">예문</p>
          <button class="btn-ghost" data-say="${esc(w.ex[0])}">🔊</button>
        </div>
        <div class="zh" lang="zh-CN">${esc(w.ex[0])}</div>
        <div class="py">${esc(w.ex[1])}</div>
        <div class="ko ${opts.revealed ? "" : "hidden"}" data-reveal>${esc(w.ex[2])}</div>
      </article>

      <article class="card tip">
        <p class="section-title">기억 팁</p>
        <p>${esc(w.tip)}</p>
      </article>
    `;
  }

  const LEGEND = `<div class="legend">
    <span class="tone-1">1성 ˉ</span><span class="tone-2">2성 ˊ</span>
    <span class="tone-3">3성 ˇ</span><span class="tone-4">4성 ˋ</span><span class="tone-0">경성</span>
  </div>`;

  function progressHTML(day) {
    const learned = Object.keys(state.done).length;
    const pct = Math.min(100, (learned / TOTAL) * 100);
    const cycle = day > TOTAL ? ` · ${Math.floor((day - 1) / TOTAL) + 1}회차` : "";
    return `
      <div class="progress-row"><strong>Day ${day}${cycle}</strong><span>${learned} / ${TOTAL} 단어</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>`;
  }

  // ── 화면: 오늘 ──
  let revealed = false;

  function renderToday() {
    const day = currentDay();
    const w = wordFor(day);
    const done = isDoneToday();
    const show = revealed || done;
    $view.innerHTML = `
      ${progressHTML(day)}
      ${studyCardHTML(w, day, { revealed: show })}
      ${done
        ? `<div class="done-msg"><span class="han">明天见！</span>오늘 공부 끝! 내일 새 단어로 만나요.</div>`
        : `<button class="done-btn" data-done>오늘의 단어 익혔어요 ✓</button>`}
      ${LEGEND}
      ${zhVoice || !("speechSynthesis" in window) ? "" : `<p class="notice">중국어 음성이 안 들리면 기기 설정에서 중국어(간체) 음성을 추가해 주세요.</p>`}
    `;
  }

  // ── 화면: 지난 단어 보기 ──
  function renderDay(day) {
    const today = currentDay();
    if (!(day >= 1 && day <= today)) { location.hash = "#/list"; return; }
    const w = wordFor(day);
    $view.innerHTML = `
      <a class="back" href="#/list">← 단어장</a>
      <div class="progress-row"><strong>Day ${day}</strong><span>${esc(shiftDate(state.start, day - 1))}</span></div>
      ${studyCardHTML(w, day, { revealed: true })}
      ${LEGEND}
    `;
  }

  // ── 화면: 복습 ──
  let randomPicks = null;

  function flashHTML(w, when) {
    return `<button class="flash" data-flip>
      <span class="when">${esc(when)}</span>
      <span class="zh" lang="zh-CN">${esc(w.h)}</span>
      <span class="py">${esc(w.p)}</span>
      <span class="ko hidden" data-m="${esc(w.m)}">탭해서 뜻 보기</span>
    </button>`;
  }

  function renderReview() {
    const today = currentDay();
    const due = REVIEW_GAPS
      .map((g) => ({ g, day: today - g }))
      .filter((x) => x.day >= 1);

    let body;
    if (randomPicks) {
      body = `<div class="flash-grid">${randomPicks.map((d) => flashHTML(wordFor(d), `Day ${d}`)).join("")}</div>`;
    } else if (due.length) {
      body = `<div class="flash-grid">${due.map((x) => flashHTML(wordFor(x.day), x.g === 1 ? "어제" : `${x.g}일 전`)).join("")}</div>`;
    } else {
      body = `<div class="empty"><div class="han" style="font-size:32px">慢慢来</div>내일부터 복습할 단어가 생겨요.</div>`;
    }

    $view.innerHTML = `
      <p class="lead">${randomPicks
        ? "지금까지 배운 단어 중 무작위 5개예요."
        : "잊어버릴 즈음 다시 보면 오래 기억돼요. 1·3·7·14·30일 전 단어예요."}</p>
      ${body}
      ${today > 1 ? `<div class="row-actions">
        <button class="btn-ghost" data-random>${randomPicks ? "↻ 다시 섞기" : "🎲 무작위 5개 복습"}</button>
      </div>` : ""}
    `;
  }

  function pickRandom() {
    const pool = Array.from({ length: Math.min(currentDay(), TOTAL) }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  }

  // ── 화면: 단어장 ──
  function renderList() {
    const today = currentDay();
    const shown = Math.min(today, TOTAL);
    const items = [];
    for (let d = 1; d <= shown; d++) {
      const w = WORDS[d - 1];
      items.push(`<li><a href="#/day/${d}">
        <span class="n">${d}</span>
        <span class="zh" lang="zh-CN">${esc(w.h)}</span>
        <span class="meta"><div class="py">${esc(w.p)}</div><div class="ko">${esc(w.m)}</div></span>
      </a></li>`);
    }
    if (today < TOTAL) {
      items.push(`<li><a class="locked" aria-disabled="true">
        <span class="n">${today + 1}</span><span class="zh">？</span>
        <span class="meta"><div class="ko">내일 열려요 · 남은 단어 ${TOTAL - today}개</div></span>
      </a></li>`);
    }
    $view.innerHTML = `
      <p class="lead">지금까지 만난 단어 ${shown}개. 눌러서 다시 볼 수 있어요.</p>
      <ul class="list">${items.reverse().join("")}</ul>

      <section class="settings">
        <p class="section-title">설정</p>
        <div class="card">
          <label>발음 속도
            <input type="range" min="0.5" max="1.1" step="0.05" value="${state.rate}" data-rate style="flex:1;max-width:180px">
          </label>
          <p>시작일 ${esc(state.start)} · 연속 ${streak()}일</p>
          <p><button class="btn-ghost danger" data-reset>처음부터 다시 시작</button></p>
        </div>
      </section>
    `;
  }

  // ── 라우팅 ──
  function route() {
    const hash = location.hash || "#/today";
    const m = hash.match(/^#\/day\/(\d+)$/);
    const tab = m ? "list" : hash.slice(2);
    document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));

    if (m) renderDay(Number(m[1]));
    else if (tab === "review") renderReview();
    else if (tab === "list") renderList();
    else renderToday();

    const s = streak();
    document.getElementById("streak").innerHTML = s ? `🔥 <b>${s}</b>일 연속` : "";
    window.scrollTo(0, 0);
  }

  // ── 이벤트 ──
  $view.addEventListener("click", (e) => {
    const t = e.target.closest("button, [data-reveal]");
    if (!t) return;

    if (t.dataset.say) { speak(t.dataset.say, t.dataset.slow === "1"); return; }

    if (t.hasAttribute("data-reveal")) {
      if (!revealed) { revealed = true; route(); }
      return;
    }
    if (t.hasAttribute("data-done")) {
      state.done[todayStr()] = currentDay();
      save();
      route();
      return;
    }
    if (t.hasAttribute("data-flip")) {
      const ko = t.querySelector(".ko");
      if (ko.classList.contains("hidden")) {
        ko.textContent = ko.dataset.m;
        ko.classList.remove("hidden");
        t.classList.add("flipped");
      }
      speak(t.querySelector(".zh").textContent);
      return;
    }
    if (t.hasAttribute("data-random")) { randomPicks = pickRandom(); renderReview(); return; }
    if (t.hasAttribute("data-reset")) {
      if (confirm("학습 기록을 지우고 오늘을 Day 1로 다시 시작할까요?")) {
        state.start = todayStr();
        state.done = {};
        save();
        location.hash = "#/today";
        route();
      }
    }
  });

  $view.addEventListener("input", (e) => {
    if (e.target.hasAttribute("data-rate")) {
      state.rate = Number(e.target.value);
      save();
    }
  });
  $view.addEventListener("change", (e) => {
    if (e.target.hasAttribute("data-rate")) speak("你好，我叫卢卡斯。");
  });

  window.addEventListener("hashchange", () => {
    if (!location.hash.startsWith("#/review")) randomPicks = null;
    route();
  });

  // 앱을 켜 둔 채로 날이 바뀌면 새 단어로 갱신
  let lastDate = todayStr();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && todayStr() !== lastDate) {
      lastDate = todayStr();
      revealed = false;
      route();
    }
  });

  route();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
