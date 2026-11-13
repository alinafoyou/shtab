/* ШТАБ — каркас, навигация, роутер, события */
(function () {
  const A = App, esc = A.esc;
  const NAV = [
    ['pulse', '◉', 'Пульс', () => A.can.pulse()],
    ['projects', '▦', 'Проекты', () => true],
    ['finance', '₸', 'Финансы', () => A.can.anyCompanyFin() || A.can.personalFin()],
    ['personal', '♡', 'Личное', () => A.can.personalSchedule()],
    ['journal', '✎', 'Дневник', () => A.can.journal()],
    ['team', '☺', 'Команда', () => A.s.settings.modules.team],
    ['access', '⚿', 'Доступы', () => A.can.access()],
    ['settings', '⚙', 'Настройки', () => A.can.settings()],
  ];
  const TITLE = { pulse: 'Пульс дня', projects: 'Проекты', project: 'Проект', finance: 'Финансы', personal: 'Личное', journal: 'Дневник руководителя', team: 'Команда онлайн', leave: 'Заявка на отсутствие', access: 'Команда и доступы', settings: 'Настройки' };
  const PARENT = { project: 'projects', leave: 'team' };
  A.nav = () => NAV.filter((n) => n[3]());
  A.route = () => { const p = location.hash.replace(/^#\/?/, '').split('/'); return { name: p[0] || '', arg: p[1] || '' }; };

  A.render = function () {
    const root = document.getElementById('app'), s = A.s, r = A.route();
    const theme = s ? s.settings.theme : 'dark';
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name=theme-color]').content = theme === 'dark' ? '#0F1115' : '#F6F5F1';
    if (!A.account || !s) { root.innerHTML = A.views.login(); document.title = 'ШТАБ — вход'; return; }
    const u = A.user();
    if (!u.consent) { root.innerHTML = A.consentHtml(); return; }
    const nav = A.nav(), cur = PARENT[r.name] || r.name;
    const ok = A.views[r.name] && r.name !== 'login' && (nav.some((n) => n[0] === cur));
    if (!ok) { location.hash = '#/' + nav[0][0]; return; }
    const link = (n, cls) => `<a class="${cls} ${n[0] === cur ? 'on' : ''}" href="#/${n[0]}" ${n[0] === cur ? 'aria-current="page"' : ''}><i aria-hidden="true">${n[1]}</i><span>${n[2]}</span></a>`;
    const side = `<aside class="side"><div class="logo">ШТАБ<span>.</span></div><nav aria-label="Основная навигация">${nav.map((n) => link(n, 'nav')).join('')}</nav>
      <div class="who">${A.avatar(u)}<div class="grow"><b class="sm">${esc(u.name)}</b><div class="muted xs">${{ owner: 'Владелец', assistant: 'Ассистент', employee: 'Сотрудник' }[u.role]}</div></div><button type="button" class="btn s ghost" data-act="logout" title="Выйти" aria-label="Выйти">⎋</button></div></aside>`;
    const top = `<header class="top"><h1>${TITLE[r.name]}</h1>
      <button type="button" class="btn icon" data-act="themeToggle" aria-label="Переключить тему" title="Тема">${s.settings.theme === 'dark' ? '☀' : '☾'}</button>
      <button type="button" class="btn icon only-m" data-act="menuOpen" aria-label="Меню">☰</button></header>`;
    const tabbar = `<nav class="tabbar" aria-label="Нижняя навигация">${nav.slice(0, 5).map((n) => link(n, '')).join('')}</nav>`;
    root.innerHTML = `<div class="shell">${side}<main class="main">${top}<div class="view">${A.views[r.name](r.arg)}</div></main>${tabbar}</div><button type="button" class="fab" data-act="chatOpen" aria-label="Спроси Штаб" title="Спроси Штаб">✦</button>`;
    document.title = 'ШТАБ — ' + TITLE[r.name];
  };
  A.actions.menuOpen = () => {
    const u = A.user();
    A.modal(`<h2>${esc(u.name)}</h2><div class="list">${A.nav().map((n) => `<a class="li" href="#/${n[0]}" data-act="closeModal"><span aria-hidden="true" style="width:24px;text-align:center">${n[1]}</span><b class="grow">${n[2]}</b></a>`).join('')}<button type="button" class="li btn ghost danger" style="border:0;border-top:1px solid var(--line);border-radius:0;justify-content:flex-start" data-act="logout">⎋ Выйти</button></div>`);
    return false;
  };

  // ----- живые данные: намаз (Aladhan) и погода (Open-Meteo); без сети остаются запасные значения -----
  const WX = (c) => (c === 0 ? '☀️' : c <= 3 ? '⛅' : c <= 48 ? '🌫' : c <= 67 ? '🌧' : c <= 77 ? '❄️' : c <= 82 ? '🌦' : c <= 86 ? '🌨' : '⛈');
  A.fetchLive = function () {
    const st = A.s.settings, t = A.today(), ll = A.CITIES[st.city]; if (!ll || !navigator.onLine) return;
    const [dd, mm, yy] = [t.slice(8), t.slice(5, 7), t.slice(0, 4)];
    const p = A.s.cache.prayer;
    if (st.modules.spirit && !(p && p.date === t && p.city === st.city && p.method === st.prayerMethod)) {
      fetch(`https://api.aladhan.com/v1/timings/${dd}-${mm}-${yy}?latitude=${ll[0]}&longitude=${ll[1]}&method=${st.prayerMethod}`).then((r) => r.json()).then((j) => {
        const x = j.data.timings, cut = (v) => String(v).slice(0, 5);
        A.s.cache.prayer = { date: t, city: st.city, method: st.prayerMethod, times: { fajr: cut(x.Fajr), dhuhr: cut(x.Dhuhr), asr: cut(x.Asr), maghrib: cut(x.Maghrib), isha: cut(x.Isha) } };
        A.save(); if (!document.querySelector('#modal:not([hidden])') && !document.activeElement.matches('input,textarea,select')) A.render();
      }).catch(() => {});
    }
    const w = A.s.cache.weather;
    if (!(w && w.date === t && w.city === st.city && Date.now() - w.at < 36e5)) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ll[0]}&longitude=${ll[1]}&current=temperature_2m,weather_code`).then((r) => r.json()).then((j) => {
        A.s.cache.weather = { date: t, city: st.city, at: Date.now(), temp: Math.round(j.current.temperature_2m), icon: WX(j.current.weather_code) };
        A.save(); if (A.route().name === 'pulse' && !document.querySelector('#modal:not([hidden])') && !document.activeElement.matches('input,textarea,select')) A.render();
      }).catch(() => {});
    }
  };

  // ----- события -----
  function run(name, el, e) {
    const fn = A.actions[name]; if (!fn) return;
    const res = fn(el, e); if (res === false) return;
    A.save(); if (res !== 'keep') A.closeModal(); A.render();
  }
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-act]'); if (el && el.tagName !== 'FORM') run(el.dataset.act, el, e); });
  document.addEventListener('submit', (e) => { const f = e.target.closest('form[data-act]'); if (f) { e.preventDefault(); run(f.dataset.act, f, e); } });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-change]'); if (el) run(el.dataset.change, el, e); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') A.closeModal(); });
  document.addEventListener('dragstart', (e) => { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) e.dataTransfer.setData('text/plain', c.dataset.drag); });
  document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('[data-drop]')) e.preventDefault(); });
  document.addEventListener('drop', (e) => { const z = e.target.closest && e.target.closest('[data-drop]'); if (z) { e.preventDefault(); A.setStage(e.dataTransfer.getData('text/plain'), z.dataset.drop); } });
  window.addEventListener('hashchange', () => { A.closeModal(); A.render(); window.scrollTo(0, 0); });

  // ----- старт: кто вошёл и его данные -----
  A.boot = async function () {
    document.getElementById('app').innerHTML = '<div class="login"><p class="muted">Загрузка…</p></div>';
    A.s = null; A.ui.authErr = '';
    try { A.account = (await A.api('GET', 'me')).user; A.lsSet('shtab.last', A.account); }
    catch (e) {
      A.account = null;
      if (!e.status) { const last = A.lsGet('shtab.last'); if (last && last.id) A.account = last; else A.ui.authErr = 'Нет связи с сервером. Проверьте интернет.'; } // офлайн: работаем с копией на устройстве
    }
    if (A.account) {
      try { await A.loadState(); } catch (e) { A.account = null; A.s = null; A.ui.authErr = e.status ? e.message : 'Нет связи с сервером. Проверьте интернет.'; }
    }
    if (A.s) {
      const t = A.today();
      if (A.isWorkday(t) && !A.s.attendance.some((a) => a.date === t)) { A.demoDay(A.s, t); A.save(); }
      A.fetchLive();
    }
    A.render();
  };
  A.boot();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
