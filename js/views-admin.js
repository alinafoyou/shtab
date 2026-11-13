/* ШТАБ — вход, команда и доступы (F-8.1), настройки (F-8.2, F-8.3) */
(function () {
  const A = App, esc = A.esc;
  const ROLE = { owner: 'Владелец', assistant: 'Ассистент', employee: 'Сотрудник' };
  const MODS = [['companyFinance', '💼 Деньги компаний'], ['personalFinance', '👤 Личные деньги'], ['team', '👥 Команда онлайн'], ['fitness', '🏋️ Фитнес'], ['languages', '🇯🇵 Языки'], ['nutrition', '🍽 Питание'], ['spirit', '🕌 Духовность'], ['journal', '📓 Дневник']];

  A.views.login = function () {
    const demo = [['u0', 'Владелец', 'Видит всё'], ['u1', 'Ассистент', 'Без дневника и личных денег'], ['e1', 'Сотрудник', 'Только свои проекты и статус']];
    return `<div class="login"><div class="card stack">
      <div><div class="logo" style="padding:0 0 6px">ШТАБ<span>.</span></div><p class="muted">Вся жизнь руководителя — на одном экране</p></div>
      <div><h3 style="margin-bottom:8px">Войти в демо как</h3><div class="stack" style="gap:8px">${demo.map(([id, r, d]) => { const u = A.byId(A.s.users, id); return `<button type="button" class="btn" style="justify-content:flex-start;height:auto;padding:10px 14px;text-align:left" data-act="loginAs" data-id="${id}">${A.avatar(u)}<span><b>${esc(u.name)}</b> · ${r}<span class="muted xs" style="display:block;font-weight:500">${d}</span></span></button>`; }).join('')}</div></div>
      <details><summary class="muted sm">Вход по email или телефону</summary><form class="form" data-act="loginOtp"><label class="f">Email или телефон<input name="login" required placeholder="owner@shtab.demo"></label><label class="f">Код из сообщения<input name="code" inputmode="numeric" placeholder="любые 4 цифры" required pattern="[0-9]{4,6}"></label><button class="btn pri">Войти</button><p class="muted xs">В демо код не отправляется: подойдёт любой. Настоящий OTP и 2FA требуют сервера.</p></form></details>
      <p class="muted xs">Данные демо хранятся только в этом браузере. <a class="gold" href="index.html">← На сайт</a></p></div></div>`;
  };
  const enter = (u) => {
    A.s.session.userId = u.id; A.log('Сессия', 'Вход');
    location.hash = u.role === 'employee' ? '#/team/board' : '#/pulse';
  };
  A.actions.loginAs = (el) => { const u = A.byId(A.s.users, el.dataset.id); if (u) enter(u); };
  A.actions.loginOtp = (form) => {
    const v = A.fd(form), u = A.s.users.find((x) => x.email === v.login.trim().toLowerCase() || (x.phone && x.phone === v.login.trim()));
    if (!u) { A.toast('Пользователь не найден. Попросите владельца прислать приглашение.'); return false; }
    enter(u);
  };
  A.actions.logout = () => { A.log('Сессия', 'Выход'); A.s.session.userId = null; location.hash = '#/login'; };
  A.actions.consentOk = () => { A.user().consent = true; A.log('Согласие', 'Принято согласие на обработку данных'); };

  A.consentHtml = () => `<div class="login"><div class="card stack"><h2>Какие данные о вас собирает ШТАБ</h2>
    <div class="list"><div class="li">✓ Отметки начала и конца рабочего дня и ваш статус</div><div class="li">✓ План на день и «что сделано»</div><div class="li">✓ Задачи, статусы проектов, комментарии</div><div class="li">✓ Заявки на отпуск и больничные</div></div>
    <p class="note"><b>Не собираем:</b> скриншоты экрана, нажатия клавиш, запись камеры, постоянную геолокацию. ${A.s.settings.geo ? 'Геометка включена руководителем и снимается только в момент отметки «в офисе».' : 'Геометка выключена.'} Свой табель вы видите сами.</p>
    <p class="muted xs">Основание: Закон РК «О персональных данных и их защите» № 94-V; для ОАЭ — PDPL.</p>
    <div class="row"><button type="button" class="btn pri" data-act="consentOk">Согласен(на), продолжить</button><button type="button" class="btn ghost" data-act="logout">Выйти</button></div></div></div>`;

  A.views.access = function () {
    const s = A.s, me = A.user(), isOwner = me.role === 'owner';
    const chk = (uid, key, label, on, cid) => `<label class="chk sm"><input type="checkbox" data-change="permToggle" data-id="${uid}" data-k="${key}" ${cid ? `data-c="${cid}"` : ''} ${on ? 'checked' : ''} ${isOwner ? '' : 'disabled'}>${label}</label>`;
    const members = s.users.map((u) => {
      let extra = '';
      if (u.role === 'assistant') {
        const p = u.perms || {};
        extra = `<div class="grid g2" style="gap:0 16px;margin-top:6px">${chk(u.id, 'pulseFinance', 'Финансы в «Пульсе»', p.pulseFinance)}${s.companies.map((c) => chk(u.id, 'companies', 'Деньги: ' + esc(c.name), (p.companies || {})[c.id], c.id)).join('')}${chk(u.id, 'personalFinance', 'Личные деньги', p.personalFinance)}${chk(u.id, 'timesheet', 'Табель и отчёты', p.timesheet)}${chk(u.id, 'invite', 'Приглашать сотрудников', p.invite)}</div>`;
      } else if (u.role === 'employee') {
        extra = `<details><summary class="muted sm">Доступ к проектам: ${s.projects.filter((p) => A.isMember(p, u.id)).length}</summary><div class="grid g2" style="gap:0 16px">${s.projects.map((p) => `<label class="chk sm"><input type="checkbox" data-change="projAccess" data-id="${u.id}" data-p="${p.id}" ${A.isMember(p, u.id) ? 'checked' : ''} ${isOwner && p.ownerId !== u.id ? '' : 'disabled'}>${esc(p.name)}${p.ownerId === u.id ? ' · отв.' : ''}</label>`).join('')}</div></details>`;
      }
      return `<div class="li" style="align-items:flex-start">${A.avatar(u)}<div class="grow"><div class="row between"><span><b>${esc(u.name)}</b> <span class="muted sm">${esc(u.title || '')}</span>${u.consent ? '' : ' <span class="chip y">ждём согласие</span>'}</span>${isOwner && u.role !== 'owner' ? `<select aria-label="Роль" data-change="roleSet" data-id="${u.id}" style="width:auto;min-height:36px">${A.opts([['assistant', 'Ассистент'], ['employee', 'Сотрудник']], u.role)}</select>` : `<span class="chip">${ROLE[u.role]}</span>`}</div><div class="muted xs">${esc(u.email || u.phone || '')}</div>${extra}</div></div>`;
    }).join('');
    const invite = `<div class="card"><h3>Пригласить участника</h3><form class="form" data-act="inviteAdd"><label class="f">Имя и фамилия<input name="name" required></label><label class="f">Email или телефон<input name="contact" required></label><div class="f2"><label class="f">Роль<select name="role">${A.opts(isOwner ? [['employee', 'Сотрудник'], ['assistant', 'Ассистент']] : [['employee', 'Сотрудник']])}</select></label><label class="f">Компания<select name="companyId">${A.opts(s.companies.map((c) => [c.id, c.name]))}</select></label></div><label class="f">Должность<input name="title"></label><button class="btn pri" style="justify-self:start">Создать приглашение</button></form>
      ${s.invites.length ? `<div class="list" style="margin-top:10px">${s.invites.slice(-3).reverse().map((i) => `<div class="li"><div class="grow sm">${esc(i.name)}<div class="muted xs" style="word-break:break-all">${esc(i.link)}</div></div><button type="button" class="btn s" data-act="copy" data-v="${esc(i.link)}">Копировать</button></div>`).join('')}</div>` : ''}
      <p class="muted xs" style="margin-top:8px">При первом входе сотрудник увидит, какие данные о нём собираются, и даст согласие. В демо ссылка не отправляется: войти можно по указанному email с любым кодом.</p></div>`;
    const audit = isOwner ? `<div class="card"><h3>Журнал действий</h3><div class="list">${s.audit.slice(0, 25).map((x) => `<div class="li"><span class="muted xs" style="width:88px;flex:none">${new Date(x.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><div class="grow sm"><b>${esc(A.short(x.userId))}</b> · ${esc(x.entity)}<div class="muted xs">${esc(x.action)}${x.diff ? ' · ' + esc(x.diff) : ''}</div></div></div>`).join('') || '<p class="muted">Пока пусто.</p>'}</div></div>` : '';
    return `<div class="grid g2"><div class="card"><h3>Участники <span class="muted sm">${s.users.length}</span></h3><div class="list">${members}</div></div><div class="stack">${invite}${audit}</div></div>`;
  };
  A.actions.permToggle = (el) => {
    const u = A.byId(A.s.users, el.dataset.id); if (!u || A.user().role !== 'owner') return false;
    u.perms = u.perms || {}; const k = el.dataset.k;
    if (k === 'companies') { u.perms.companies = u.perms.companies || {}; u.perms.companies[el.dataset.c] = el.checked; } else u.perms[k] = el.checked;
    A.log('Доступы', u.name + ': ' + k + (el.dataset.c ? '/' + el.dataset.c : ''), el.checked ? 'вкл' : 'выкл');
  };
  A.actions.projAccess = (el) => {
    const p = A.byId(A.s.projects, el.dataset.p), uid = el.dataset.id; if (!p || A.user().role !== 'owner') return false;
    p.members = p.members.filter((x) => x !== uid); if (el.checked) p.members.push(uid);
    A.log('Доступы', A.userName(uid) + ' → «' + p.name + '»', el.checked ? 'открыт' : 'закрыт');
  };
  A.actions.roleSet = (el) => {
    const u = A.byId(A.s.users, el.dataset.id); if (!u || A.user().role !== 'owner' || u.role === 'owner') return false;
    u.role = el.value;
    if (u.role === 'assistant') u.perms = u.perms || { pulseFinance: false, companies: {}, personalFinance: false, timesheet: false, invite: false };
    else Object.assign(u, { leaveTotal: u.leaveTotal || A.s.settings.leaveDays, leaveUsed: u.leaveUsed || 0, companyId: u.companyId || A.s.companies[0].id });
    A.log('Доступы', u.name + ': роль → ' + ROLE[u.role]);
  };
  A.actions.inviteAdd = (form) => {
    const v = A.fd(form), me = A.user(), role = me.role === 'owner' ? v.role : 'employee', c = v.contact.trim(), isMail = c.includes('@');
    if (!A.can.access()) return false;
    const u = { id: 'n' + A.uid(), name: v.name.trim(), role, title: (v.title || '').trim(), companyId: v.companyId, email: isMail ? c.toLowerCase() : '', phone: isMail ? '' : c, consent: false, lastActive: A.today(), leaveTotal: A.s.settings.leaveDays, leaveUsed: 0 };
    if (role === 'assistant') u.perms = { pulseFinance: false, companies: {}, personalFinance: false, timesheet: false, invite: false };
    A.s.users.push(u);
    A.s.invites.push({ name: u.name, link: location.origin + location.pathname + '#/invite/' + u.id });
    A.log('Доступы', 'Приглашён: ' + u.name, ROLE[role]); A.toast('Приглашение создано');
  };
  A.actions.copy = (el) => { if (navigator.clipboard) navigator.clipboard.writeText(el.dataset.v).then(() => A.toast('Ссылка скопирована'), () => A.toast('Не удалось скопировать')); return false; };

  A.views.settings = function () {
    const st = A.s.settings, m = st.modules;
    const mods = `<div class="card"><h3>Модули</h3><div class="grid g2" style="gap:0 16px">${MODS.map(([k, l]) => `<label class="chk"><input type="checkbox" data-change="modToggle" data-k="${k}" ${m[k] ? 'checked' : ''}>${l}</label>`).join('')}</div><p class="muted xs" style="margin-top:8px">Пульс и Проекты включены всегда.</p></div>`;
    const gen = `<div class="card"><h3>Общее</h3><form class="form" data-act="settingsSave">
      <div class="f2"><label class="f">Тема<select name="theme">${A.opts([['dark', 'Тёмная'], ['light', 'Светлая']], st.theme)}</select></label><label class="f">Язык<select name="lang">${A.opts([['ru', 'Русский'], ['kk', 'Қазақша (скоро)'], ['en', 'English (soon)']], st.lang)}</select></label></div>
      <div class="f2"><label class="f">Город<select name="city">${A.opts(Object.keys(A.CITIES).map((c) => [c, c]), st.city)}</select></label><label class="f">Валюта по умолчанию<select name="currency">${A.opts(A.CUR.map((c) => [c, c]), st.currency)}</select></label></div>
      <div class="f2"><label class="f">Начало рабочего дня<input type="time" name="workStart" value="${st.workStart}"></label><label class="f">Конец рабочего дня<input type="time" name="workEnd" value="${st.workEnd}"></label></div>
      <fieldset style="border:0;padding:0;margin:0"><legend class="muted sm" style="font-weight:600">Рабочие дни</legend><div class="row">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="chk sm"><input type="checkbox" name="wd${d}" ${st.workDays.includes(d) ? 'checked' : ''}>${['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d]}</label>`).join('')}</div></fieldset>
      <button class="btn pri" style="justify-self:start">Сохранить</button></form><p class="muted xs" style="margin-top:8px">Интерфейс пока только на русском; выбор языка сохраняется на будущее.</p></div>`;
    const team = `<div class="card"><h3>Команда онлайн</h3><form class="form" data-act="settingsTeam">
      <div class="f2"><label class="f">⚪ «Не отметился» после<input type="time" name="checkinWarn" value="${st.checkinWarn}"></label><label class="f">🔴 «Отсутствует» после<input type="time" name="checkinAbsent" value="${st.checkinAbsent}"></label></div>
      <label class="f">Дней отпуска в год по умолчанию<input type="number" name="leaveDays" min="1" max="90" value="${st.leaveDays}"></label>
      <label class="chk"><input type="checkbox" name="geo" ${st.geo ? 'checked' : ''}>Геометка при отметке «в офисе» (сотрудники увидят уведомление)</label>
      <button class="btn pri" style="justify-self:start">Сохранить</button></form></div>`;
    const sp = `<div class="card"><h3>Духовность</h3><form class="form" data-act="settingsSpirit">
      <label class="f">Режим<select name="spiritMode">${A.opts([['namaz', '🕌 Намаз'], ['calm', '🧘 Тишина (светский)']], st.spiritMode)}</select></label>
      <div class="f2"><label class="f">Метод расчёта (Aladhan)<select name="prayerMethod">${A.opts([[3, 'Всемирная исламская лига'], [4, 'Умм аль-Кура, Мекка'], [5, 'Египетское управление'], [13, 'Диянет, Турция']], st.prayerMethod)}</select></label><label class="f">Поправка, минут (±)<input type="number" name="prayerAdjust" min="-30" max="30" value="${st.prayerAdjust}"></label></div>
      <label class="f">Защищённый слот вокруг намаза, минут<input type="number" name="prayerSlot" min="5" max="60" value="${st.prayerSlot}"></label>
      <button class="btn pri" style="justify-self:start">Сохранить</button></form><p class="muted xs" style="margin-top:8px">Метод ДУМК (Muftyat.kz) пока не подключён — используйте поправку в минутах.</p></div>`;
    const rates = `<div class="card"><h3>Курсы валют к тенге</h3><form class="form" data-act="settingsRates"><div class="grid g3">${A.CUR.filter((c) => c !== 'KZT').map((c) => `<label class="f">${c}<input type="number" step="0.01" min="0.01" name="${c}" value="${st.rates[c]}"></label>`).join('')}</div><button class="btn pri" style="justify-self:start">Сохранить</button></form><p class="muted xs" style="margin-top:8px">Автообновление с Нацбанка РК раз в сутки требует сервера; сейчас курсы вводятся вручную.</p></div>`;
    const data = `<div class="card"><h3>Данные</h3><p class="muted sm" style="margin-bottom:10px">Всё хранится в этом браузере. Сброс вернёт исходные демо-данные и сотрёт ваши изменения.</p><button type="button" class="btn danger" data-act="resetAsk">Сбросить демо-данные</button></div>`;
    return `<div class="grid g2"><div class="stack">${mods}${gen}${data}</div><div class="stack">${team}${sp}${rates}</div></div>`;
  };
  A.actions.modToggle = (el) => { A.s.settings.modules[el.dataset.k] = el.checked; A.log('Настройки', 'Модуль ' + el.dataset.k, el.checked ? 'вкл' : 'выкл'); };
  A.actions.settingsSave = (form) => {
    const v = A.fd(form), st = A.s.settings;
    Object.assign(st, { theme: v.theme, lang: v.lang, city: v.city, currency: v.currency, workStart: v.workStart, workEnd: v.workEnd, workDays: [0, 1, 2, 3, 4, 5, 6].filter((d) => v['wd' + d]) });
    A.log('Настройки', 'Общие'); A.toast('Сохранено'); A.fetchLive();
  };
  A.actions.settingsTeam = (form) => { const v = A.fd(form), st = A.s.settings; Object.assign(st, { checkinWarn: v.checkinWarn, checkinAbsent: v.checkinAbsent, leaveDays: +v.leaveDays || 24, geo: !!v.geo }); A.log('Настройки', 'Команда онлайн'); A.toast('Сохранено'); };
  A.actions.settingsSpirit = (form) => { const v = A.fd(form), st = A.s.settings; Object.assign(st, { spiritMode: v.spiritMode, prayerMethod: +v.prayerMethod, prayerAdjust: +v.prayerAdjust || 0, prayerSlot: +v.prayerSlot || 20 }); A.log('Настройки', 'Духовность'); A.toast('Сохранено'); A.fetchLive(); };
  A.actions.settingsRates = (form) => { const v = A.fd(form); A.CUR.forEach((c) => { if (+v[c] > 0) A.s.settings.rates[c] = +v[c]; }); A.log('Настройки', 'Курсы валют'); A.toast('Курсы сохранены'); };
  A.actions.themeToggle = () => { A.s.settings.theme = A.s.settings.theme === 'dark' ? 'light' : 'dark'; };
  A.actions.resetAsk = () => { A.modal(`<h2>Сбросить демо-данные?</h2><p class="muted">Все ваши изменения в этом браузере будут удалены. Отменить нельзя.</p><div class="row" style="margin-top:16px"><button type="button" class="btn danger" data-act="resetDo">Да, сбросить</button><button type="button" class="btn pri" data-act="closeModal">Отмена</button></div>`); return false; };
  A.actions.resetDo = () => { const id = A.s.session.userId; A.reset(); A.s.session.userId = id; A.toast('Демо-данные восстановлены'); };
})();
