/* ШТАБ — Пульс дня (F-1.x) */
(function () {
  const A = App, esc = A.esc;

  A.teamCounts = () => {
    const c = {}, t = A.today();
    A.employees().forEach((u) => { const st = A.statusOf(u.id, t); c[st] = (c[st] || 0) + 1; });
    return c;
  };

  A.timelineHtml = (date, canAdd) => {
    const now = A.nowHM(), isToday = date === A.today();
    const rows = A.dayEvents(date).map((e) => {
      const cls = !isToday ? '' : e.end <= now ? 'past' : e.start <= now ? 'now' : '';
      const by = e.kind === 'meeting' && e.createdBy && e.createdBy !== A.owner().id ? ` <span class="muted xs">· поставил(а) ${esc(A.short(e.createdBy))} от имени владельца</span>` : '';
      const del = e.kind === 'meeting' && canAdd ? `<button class="btn s ghost" type="button" data-act="meetingDel" data-id="${e.id}" aria-label="Удалить встречу">✕</button>` : '';
      return `<div class="tl ${cls}"><time>${e.start}–${e.end}</time><span aria-hidden="true">${A.KIND[e.kind]}</span><div class="grow"><b>${esc(e.title)}</b>${by}</div>${e.protected && e.kind !== 'meeting' ? '<span class="chip" title="Защищённый слот: встречу поставить нельзя">🔒</span>' : ''}${del}</div>`;
    }).join('');
    return rows || '<p class="muted">На этот день ничего не запланировано.</p>';
  };

  A.views.pulse = function () {
    const s = A.s, u = A.user(), t = A.today(), can = A.can, isOwner = u.role === 'owner';
    const h = new Date().getHours(), hi = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
    const w = s.cache.weather, wx = w && w.date === t && w.city === s.settings.city ? `<span class="chip">${w.icon} ${w.temp > 0 ? '+' : ''}${w.temp}° · ${esc(s.settings.city)}</span>` : `<span class="chip">📍 ${esc(s.settings.city)}</span>`;
    const head = `<div class="card"><div class="row between"><div><p class="muted">${A.parse(t).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h2 style="font-size:24px">${hi}, ${esc(u.name.split(' ')[0])}</h2>${isOwner ? '' : `<p class="muted sm">Вы смотрите день руководителя: ${esc(A.owner().name)}</p>`}</div>${wx}</div></div>`;

    // Top-3
    const top = s.top3[t] || [{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }];
    const top3 = `<div class="card"><h3>Top-3 дня</h3>${[0, 1, 2].map((i) => {
      const it = top[i] || { text: '', done: false };
      return `<div class="row" style="margin-bottom:8px;flex-wrap:nowrap"><input type="checkbox" aria-label="Выполнено: дело ${i + 1}" data-change="top3Toggle" data-i="${i}" ${it.done ? 'checked' : ''} ${isOwner ? '' : 'disabled'}><input type="text" aria-label="Дело ${i + 1}" placeholder="Главное дело №${i + 1}" value="${esc(it.text)}" data-change="top3Set" data-i="${i}" ${isOwner ? '' : 'readonly'} style="${it.done ? 'text-decoration:line-through;opacity:.6' : ''}"></div>`;
    }).join('')}</div>`;

    // светофор
    const act = A.visibleProjects().filter((p) => p.stage !== 'Закрыт'), cnt = { g: 0, y: 0, r: 0 };
    act.forEach((p) => cnt[A.pStatus(p)]++);
    const lights = `<div class="card"><h3>Проекты</h3><div class="lights">${[['g', 'по плану'], ['y', 'риск'], ['r', 'горит']].map(([k, l]) => `<button type="button" class="light ${k}" data-act="goProjects" data-status="${k}"><b>${cnt[k]}</b><span class="muted sm">${l}</span></button>`).join('')}</div></div>`;

    // команда сейчас
    let team = '';
    if (s.settings.modules.team) {
      const c = A.teamCounts(), work = (c.office || 0) + (c.remote || 0) + (c.field || 0) + (c.training || 0);
      const parts = [['🟢', work, 'работают'], ['🏖', c.vacation, 'в отпуске'], ['🤒', c.sick, 'болеет'], ['✈️', c.trip, 'в командировке'], ['⚪', c.no_checkin, 'не отметились'], ['🔴', c.absent, 'отсутствуют']].filter((x) => x[1]);
      team = `<a class="card" href="#/team/board" style="display:block"><h3>Команда сейчас <span class="muted sm">открыть доску →</span></h3><div class="row">${parts.map((x) => `<span class="chip">${x[0]} <b>${x[1]}</b> ${x[2]}</span>`).join('')}</div></a>`;
    }

    // деньги
    let money = '';
    if (can.pulseFinance()) {
      const mk = A.monthKey(0), rows = [];
      if (s.settings.modules.companyFinance) {
        const cw = s.wallets.filter((x) => x.kind === 'company'), ids = cw.map((x) => x.id), f = A.flow(ids, mk), ex = A.expected(ids);
        const sum = (list) => list.reduce((a, x) => a + A.kzt(x.amount, x.currency), 0), od = ex.filter((x) => x.date < t);
        rows.push(`<details><summary><div class="grow"><p class="muted sm">💼 Компании · за месяц</p><div class="row" style="gap:18px"><span><span class="mid c-g">${A.money(f.inc, 'KZT', 1)}</span> <span class="muted xs">выручка</span></span><span><span class="mid">${A.money(f.out, 'KZT', 1)}</span> <span class="muted xs">расходы</span></span><span><span class="mid">${A.money(sum(ex), 'KZT', 1)}</span> <span class="muted xs">дебиторка${od.length ? ` · <span class="c-r">просрочено ${A.money(sum(od), 'KZT', 1)}</span>` : ''}</span></span></div></div><span class="muted">▾</span></summary>${cw.map((x) => { const ff = A.flow([x.id], mk); return `<div class="li"><span class="grow">${esc(x.name)}</span><span class="num c-g">+${A.money(ff.inc, 'KZT', 1)}</span><span class="num muted">−${A.money(ff.out, 'KZT', 1)}</span></div>`; }).join('')}</details>`);
      }
      if (s.settings.modules.personalFinance && can.personalFin()) {
        const f = A.flow(['w0'], mk), bud = Object.values(s.budgets).reduce((a, b) => a + b, 0), sav = s.goals.reduce((a, g) => a + g.current, 0);
        rows.push(`<div style="border-top:1px solid var(--line);padding-top:12px;margin-top:6px"><p class="muted sm">👤 Личные · за месяц</p><div class="row" style="gap:18px"><span><span class="mid c-g">${A.money(f.inc, 'KZT', 1)}</span> <span class="muted xs">доход</span></span><span><span class="mid">${A.money(f.out, 'KZT', 1)}</span> <span class="muted xs">траты</span></span><span><span class="mid">${A.money(bud - f.out, 'KZT', 1)}</span> <span class="muted xs">остаток бюджета</span></span><span><span class="mid gold">${A.money(sav, 'KZT', 1)}</span> <span class="muted xs">накопления</span></span></div></div>`);
      }
      if (rows.length) money = `<div class="card"><h3>Деньги <a class="muted sm" href="#/finance">открыть →</a></h3>${rows.join('')}</div>`;
    }

    // ждёт решения
    const pend = s.settings.modules.team ? s.absences.filter((a) => a.status === 'pending') : [];
    const od = can.pulseFinance() ? A.expected(s.wallets.filter((x) => x.kind === 'company').map((x) => x.id)).filter((x) => x.date < t) : [];
    const dec = [
      ...pend.map((a) => `<div class="li"><span aria-hidden="true">${A.ST[a.type][0]}</span><div class="grow"><b>${esc(A.userName(a.userId))}</b> — ${A.ST[a.type][1].toLowerCase()} ${A.fmtDate(a.from)}${a.to !== a.from ? '–' + A.fmtDate(a.to) : ''}<div class="muted xs">замещает: ${esc(A.userName(a.substituteId))}${a.comment ? ' · ' + esc(a.comment) : ''}</div></div>${isOwner ? `<button class="btn s pri" type="button" data-act="absenceDecide" data-id="${a.id}" data-v="approved">Согласовать</button><button class="btn s" type="button" data-act="absenceDecide" data-id="${a.id}" data-v="rejected">Отклонить</button>` : '<span class="chip y">ждёт владельца</span>'}</div>`),
      ...s.decisions.map((x) => `<div class="li"><span class="chip">${esc(x.kind)}</span><div class="grow"><a href="#/project/${x.projectId}"><b>${esc(x.title)}</b></a><div class="muted xs">от: ${esc(A.userName(x.fromId))}</div></div>${isOwner ? `<button class="btn s" type="button" data-act="decisionDone" data-id="${x.id}">Решено</button>` : ''}</div>`),
      ...od.map((x) => `<div class="li"><span class="chip r">Просрочка</span><div class="grow"><a href="#/finance/company"><b>${esc(x.note || x.category)}</b></a><div class="muted xs">срок был ${A.fmtDate(x.date)} · ${esc(A.walletName(x.walletId))}</div></div><b class="num c-r">${A.money(x.amount, x.currency)}</b></div>`),
    ];
    const decide = `<div class="card"><h3>Ждёт вашего решения <span class="chip ${dec.length ? 'y' : 'g'}">${dec.length}</span></h3><div class="list">${dec.join('') || '<p class="muted">Всё разобрано 👌</p>'}</div></div>`;

    const canAdd = u.role !== 'employee';
    const tl = `<div class="card"><h3>Лента дня ${canAdd ? '<button class="btn s" type="button" data-act="meetingForm">+ Встреча</button>' : ''}</h3>${A.timelineHtml(t, canAdd)}${s.settings.modules.spirit && s.settings.spiritMode === 'namaz' && !A.prayerLive() ? '<p class="note" style="margin-top:10px">Время намаза приблизительное: нет связи с Aladhan. Точное подтянется при подключении к сети.</p>' : ''}</div>`;

    return `<div class="stack">${head}<div class="grid g2"><div class="stack">${top3}${lights}${team}${money}</div><div class="stack">${decide}${tl}</div></div></div>`;
  };

  // ----- действия -----
  const topOf = () => { const t = A.today(); if (!A.s.top3[t]) A.s.top3[t] = [0, 1, 2].map(() => ({ text: '', done: false })); return A.s.top3[t]; };
  A.actions.top3Set = (el) => { topOf()[+el.dataset.i].text = el.value.trim(); A.log('Top-3 дня', 'Изменено дело №' + (+el.dataset.i + 1)); };
  A.actions.top3Toggle = (el) => { topOf()[+el.dataset.i].done = el.checked; if (el.checked) A.buzz(); };
  A.actions.goProjects = (el) => { A.ui.pf = Object.assign(A.ui.pf || {}, { status: el.dataset.status, mode: 'table', dir: '', owner: '', hot: false, nostep: false, late: false }); location.hash = '#/projects'; return false; };
  A.actions.decisionDone = (el) => { const i = A.s.decisions.findIndex((x) => x.id === el.dataset.id); if (i >= 0) { A.log('Решение', 'Закрыто: ' + A.s.decisions[i].title); A.s.decisions.splice(i, 1); } };
  A.actions.meetingForm = () => {
    A.modal(`<h2>Новая встреча</h2><form class="form" data-act="meetingAdd">
      <label class="f">Название<input name="title" required maxlength="80"></label>
      <label class="f">Дата<input type="date" name="date" value="${A.today()}" required></label>
      <div class="f2"><label class="f">Начало<input type="time" name="start" value="15:00" required></label><label class="f">Конец<input type="time" name="end" value="16:00" required></label></div>
      <p class="note">Тренировки, уроки, время семьи и намаз — защищённые слоты. Поверх них встречу поставить нельзя.</p>
      <div class="row"><button class="btn pri">Поставить</button><button type="button" class="btn ghost" data-act="closeModal">Отмена</button></div></form>`);
    return false;
  };
  A.actions.meetingAdd = (form) => {
    const v = A.fd(form);
    if (v.end <= v.start) { A.toast('Конец должен быть позже начала'); return false; }
    const c = A.conflict(v.date, v.start, v.end);
    if (c) { A.toast(`🔒 Слот занят: «${c.title}» ${c.start}–${c.end}. Выберите другое время.`); return false; }
    A.s.events.push({ id: 'ev' + A.uid(), date: v.date, start: v.start, end: v.end, title: v.title.trim(), createdBy: A.user().id });
    A.log('Встреча', 'Создана: ' + v.title + (A.user().role === 'assistant' ? ' (от имени владельца)' : ''), v.date + ' ' + v.start);
    A.toast('Встреча добавлена');
  };
  A.actions.meetingDel = (el) => { const i = A.s.events.findIndex((x) => x.id === el.dataset.id); if (i >= 0) { A.log('Встреча', 'Удалена: ' + A.s.events[i].title); A.s.events.splice(i, 1); } };
})();
