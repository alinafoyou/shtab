/* ШТАБ — Команда онлайн (F-7.x): доска, календарь отсутствий, табель, заявки */
(function () {
  const A = App, esc = A.esc;
  A.ui.team = { group: 'company', calOff: 0, tsOff: 1 };
  const ABS = ['vacation', 'day_off', 'sick', 'trip', 'training'];

  // кого видит текущий пользователь (сотрудник — себя и свою проектную команду)
  A.teamVisible = () => {
    const u = A.user(); if (A.can.teamAll()) return A.employees();
    const ids = new Set([u.id]); A.visibleProjects().forEach((p) => [p.ownerId, ...p.members].forEach((id) => ids.add(id)));
    return A.employees().filter((e) => ids.has(e.id));
  };
  const silent = (u) => { // F-7.9
    if (!A.WORKING.includes(A.statusOf(u.id, A.today()))) return false;
    let n = 0; for (let d = A.addDays(u.lastActive, 1); d <= A.today(); d = A.addDays(d, 1)) if (A.isWorkday(d)) n++;
    return n > 2;
  };

  function tcard(u) {
    const t = A.today(), st = A.statusOf(u.id, t), at = A.attOn(u.id, t), ld = A.load2(u.id), ab = A.absenceOn(u.id, t);
    const ps = A.s.projects.filter((p) => p.stage !== 'Закрыт' && A.isMember(p, u.id));
    return `<button type="button" class="tcard" data-act="empReport" data-id="${u.id}">
      <span class="row" style="flex-wrap:nowrap">${A.avatar(u)}<span class="grow"><b>${esc(u.name)}</b><span class="muted xs" style="display:block">${esc(u.title)}</span></span></span>
      <span class="row">${A.stBadge(st)}${at && at.in ? `<span class="muted xs">с ${at.in}${at.out ? ' до ' + at.out : ''}</span>` : ''}${ab ? `<span class="muted xs">до ${A.fmtDate(ab.to)} · замещает ${esc(A.short(ab.substituteId))}</span>` : ''}</span>
      ${at && at.plan ? `<span class="sm" style="white-space:pre-line">${esc(at.plan)}</span>` : '<span class="muted sm">План на день не указан</span>'}
      <span class="row">${ps.slice(0, 3).map((p) => `<span class="chip">${A.dot(A.pStatus(p))} ${esc(p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name)}</span>`).join('')}</span>
      <span class="row xs"><span class="${ld.hot ? 'c-r' : 'muted'}">${ld.hot ? '🔥 перегружен · ' : ''}задач ${ld.open}, просрочено ${ld.overdue}</span>${silent(u) ? '<span class="chip y">🔇 нет активности 2+ дня</span>' : ''}</span></button>`;
  }

  function myDay(u) {
    const t = A.today(), at = A.attOn(u.id, t), ab = A.absenceOn(u.id, t);
    if (ab) return `<div class="card"><h3>Мой день</h3><p>${A.stBadge(ab.type)} до ${A.fmtDate(ab.to)}. Хорошего отдыха!</p></div>`;
    if (!at) return `<div class="card"><h3>Мой день · начать</h3><form class="form" data-act="checkIn"><label class="f">Где вы сегодня<select name="status">${A.opts(A.WORKING.map((k) => [k, A.ST[k][0] + ' ' + A.ST[k][1]]))}</select></label><label class="f">План на день (1–3 пункта, каждый с новой строки)<textarea name="plan" required placeholder="Демо для клиента&#10;Отчёт по спринту"></textarea></label><button class="btn pri" style="justify-self:start">▶ Начать день</button></form><p class="muted xs" style="margin-top:8px">То же самое делает команда /start_day в Telegram-боте.${A.s.settings.geo ? ' Геометка снимается только в момент отметки.' : ''}</p></div>`;
    if (!at.out) {
      const done = A.s.tasks.filter((k) => k.assigneeId === u.id && k.doneAt === t).map((k) => '✓ ' + k.title).join('\n');
      return `<div class="card"><h3>Мой день <span class="muted sm">начат в ${at.in}</span></h3><p class="sm" style="white-space:pre-line;margin-bottom:12px"><span class="muted">План:</span>\n${esc(at.plan)}</p><form class="form" data-act="checkOut"><label class="f">Что сделано (закрытые сегодня задачи подтянулись сами)<textarea name="done" required>${esc(done)}</textarea></label><button class="btn pri" style="justify-self:start">■ Завершить день</button></form></div>`;
    }
    return `<div class="card"><h3>Мой день <span class="chip g">завершён</span></h3><p class="muted sm">${at.in} – ${at.out}</p><p class="sm" style="white-space:pre-line;margin-top:6px">${esc(at.done)}</p></div>`;
  }

  function board() {
    const s = A.s, us = A.teamVisible(), g = A.ui.team.group, u = A.user();
    const groups = g === 'company' ? s.companies.map((c) => [c.name, us.filter((x) => x.companyId === c.id)]) : A.visibleProjects().filter((p) => p.stage !== 'Закрыт').map((p) => [p.name, us.filter((x) => A.isMember(p, x.id))]);
    const c = {}; us.forEach((x) => { const st = A.statusOf(x.id, A.today()); c[st] = (c[st] || 0) + 1; });
    return `<div class="stack">${u.role === 'employee' ? myDay(u) : ''}
      <div class="row">${A.seg([['company', 'По компаниям'], ['project', 'По проектам']], g, 'teamGroup')}<span class="grow"></span>${Object.keys(c).map((k) => `<span class="chip">${A.ST[k][0]} <b>${c[k]}</b> ${A.ST[k][1].toLowerCase()}</span>`).join('')}</div>
      ${groups.filter((x) => x[1].length).map(([name, list]) => `<div><h3 style="margin-bottom:10px">${esc(name)} <span class="muted sm">${list.length}</span></h3><div class="grid g3">${list.map(tcard).join('')}</div></div>`).join('')}
      <p class="muted xs">Прозрачность по отметкам и задачам: без скриншотов экрана, кейлоггеров и постоянного GPS. ⚪ появляется после ${s.settings.checkinWarn}, 🔴 — после ${s.settings.checkinAbsent} без отметки и заявки.</p></div>`;
  }

  function monthDays(off) { const d = new Date(), y = d.getFullYear(), m = d.getMonth() - off, n = new Date(y, m + 1, 0).getDate(); return Array.from({ length: n }, (_, i) => A.iso(new Date(y, m, i + 1))); }
  const monthLabel = (off) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - off, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }); };

  function calendar() {
    const s = A.s, off = A.ui.team.calOff, days = monthDays(off), us = A.teamVisible(), t = A.today();
    const warns = [];
    A.visibleProjects().filter((p) => p.stage !== 'Закрыт').forEach((p) => {
      const team = [p.ownerId, ...p.members].filter((id) => A.byId(s.users, id) && A.byId(s.users, id).role === 'employee'); if (team.length < 2) return;
      let best = null;
      days.forEach((d) => { const n = team.filter((id) => { const a = A.absenceOn(id, d, true); return a && ['vacation', 'sick', 'day_off'].includes(a.type); }).length; if (n >= 2 && (!best || n > best.n)) best = { d, n }; });
      if (best) warns.push(`⚠ «${esc(p.name)}»: с ${A.fmtDate(best.d)} отсутствуют ${best.n} из ${team.length} человек`);
    });
    const hol = days.map((d) => A.holiday(d)).filter(Boolean);
    const rows = us.map((u) => `<tr><td class="nm">${esc(u.name)}</td>${days.map((d) => {
      const a = A.absenceOn(u.id, d, true), cls = [a ? a.type : !A.isWorkday(d) ? 'off' : '', a && a.status === 'pending' ? 'pend' : '', d === t ? 'td' : ''].join(' ');
      return `<td class="${cls}" title="${A.fmtDate(d)}${a ? ' · ' + A.ST[a.type][1] + (a.status === 'pending' ? ' (на согласовании)' : '') : ''}"></td>`;
    }).join('')}</tr>`).join('');
    return `<div class="stack"><div class="row"><button type="button" class="btn icon" data-act="calNav" data-v="1" aria-label="Предыдущий месяц">‹</button><b style="min-width:150px;text-align:center;text-transform:capitalize">${monthLabel(off)}</b><button type="button" class="btn icon" data-act="calNav" data-v="-1" aria-label="Следующий месяц">›</button><span class="grow"></span><a class="btn pri" href="#/leave">+ Заявка на отсутствие</a></div>
      ${warns.map((w) => `<p class="note warn">${w}</p>`).join('')}
      <div class="card scroll"><table class="cal"><thead><tr><th class="nm"></th>${days.map((d) => `<th>${+d.slice(8)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
      <div class="legend" style="margin-top:12px">${[['vacation', 'var(--blue)'], ['sick', 'var(--r)'], ['day_off', 'var(--violet)'], ['trip', 'var(--y)'], ['training', 'var(--g)']].map(([k, c]) => `<span><i class="sw" style="background:${c}"></i>${A.ST[k][1]}</span>`).join('')}<span><i class="sw" style="border:1px solid var(--line)"></i>Выходной / праздник</span><span>Пунктир — на согласовании</span></div>
      ${hol.length ? `<p class="muted xs" style="margin-top:8px">Праздники месяца: ${[...new Set(hol.map((h) => h.name))].join(', ')}.</p>` : ''}</div></div>`;
  }

  A.timesheet = (uid, off) => {
    const r = { work: 0, remote: 0, vacation: 0, sick: 0, day_off: 0, absent: 0 }, t = A.today();
    monthDays(off).forEach((d) => {
      if (d > t) return; const st = A.statusOf(uid, d);
      if (st === 'vacation') { if (!A.holiday(d)) r.vacation++; return; }
      if (!A.isWorkday(d)) return;
      if (st === 'remote') r.remote++; else if (['office', 'field', 'trip', 'training'].includes(st)) r.work++; else if (st === 'sick') r.sick++; else if (st === 'day_off') r.day_off++; else if (st === 'absent') r.absent++;
    });
    return r;
  };
  function timesheet() {
    const u = A.user(), off = A.ui.team.tsOff, us = A.can.timesheet() ? A.employees() : u.role === 'employee' ? [u] : [];
    if (!us.length) return '<div class="card"><p class="muted">Табель открывает владелец отдельной галочкой.</p></div>';
    return `<div class="stack"><div class="row">${A.seg([['1', monthLabel(1)], ['0', monthLabel(0)]], String(off), 'tsMonth')}<span class="grow"></span><button type="button" class="btn" data-act="tsExport">⬇ Экспорт для бухгалтерии</button></div>
      <div class="card scroll"><table class="t"><thead><tr><th>Сотрудник</th><th class="n">В офисе / на выезде</th><th class="n">Удалённо</th><th class="n">Отпуск</th><th class="n">Больничный</th><th class="n">Отгул</th><th class="n">Отсутствия</th></tr></thead><tbody>${us.map((x) => { const r = A.timesheet(x.id, off); return `<tr><td><b>${esc(x.name)}</b><div class="muted xs">${esc(x.title)}</div></td><td class="n">${r.work}</td><td class="n">${r.remote}</td><td class="n">${r.vacation}</td><td class="n">${r.sick}</td><td class="n">${r.day_off}</td><td class="n ${r.absent ? 'c-r' : ''}">${r.absent}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="muted xs">Дни считаются по отметкам и согласованным заявкам. Экспорт — CSV, который открывается в Excel.</p></div>`;
  }

  A.absRow = (a, canDecide) => `<div class="li"><span aria-hidden="true">${A.ST[a.type][0]}</span><div class="grow"><b>${esc(A.userName(a.userId))}</b> — ${A.ST[a.type][1].toLowerCase()}, ${A.fmtDate(a.from)}${a.to !== a.from ? ' – ' + A.fmtDate(a.to) : ''} <span class="muted">(${A.leaveDays(a.from, a.to)} дн.)</span><div class="muted xs">замещает: ${esc(A.userName(a.substituteId))}${a.comment ? ' · ' + esc(a.comment) : ''}${a.file ? ' · 📎 ' + esc(a.file) : ''}</div></div>${a.status === 'pending' ? (canDecide ? `<button type="button" class="btn s pri" data-act="absenceDecide" data-id="${a.id}" data-v="approved">Согласовать</button><button type="button" class="btn s" data-act="absenceDecide" data-id="${a.id}" data-v="rejected">Отклонить</button>` : '<span class="chip y">на согласовании</span>') : `<span class="chip ${a.status === 'approved' ? 'g' : 'r'}">${a.status === 'approved' ? 'согласовано' : 'отклонено'}</span>`}</div>`;
  function requests() {
    const u = A.user(), all = A.can.teamAll(), list = A.s.absences.filter((a) => all || a.userId === u.id).sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || b.from.localeCompare(a.from));
    const bal = (all ? A.employees() : [u]).map((x) => `<tr><td>${esc(x.name)}</td><td class="n">${x.leaveTotal}</td><td class="n">${x.leaveUsed}</td><td class="n"><b>${x.leaveTotal - x.leaveUsed}</b></td></tr>`).join('');
    return `<div class="stack"><div class="row"><span class="grow"></span><a class="btn pri" href="#/leave">+ Заявка на отсутствие</a></div><div class="grid g2"><div class="card"><h3>Заявки</h3><div class="list">${list.map((a) => A.absRow(a, u.role === 'owner')).join('') || '<p class="muted">Заявок нет.</p>'}</div></div>
      <div class="card scroll"><h3>Остаток отпуска, дни</h3><table class="t"><thead><tr><th>Сотрудник</th><th class="n">Положено</th><th class="n">Использовано</th><th class="n">Остаток</th></tr></thead><tbody>${bal}</tbody></table><p class="muted xs" style="margin-top:8px">По умолчанию ${A.s.settings.leaveDays} календарных дня (ТК РК, ст. 88). Праздничные дни в отпуск не засчитываются.</p></div></div></div>`;
  }

  A.views.team = function (arg) {
    const tabs = [['board', 'Команда сейчас'], ['calendar', 'Календарь отсутствий'], ['timesheet', 'Табель'], ['requests', 'Заявки']];
    const tab = tabs.some((x) => x[0] === arg) ? arg : 'board';
    return `<div class="stack">${A.tabs(tabs, tab, 'team')}${{ board, calendar, timesheet, requests }[tab]()}</div>`;
  };

  A.views.leave = function () {
    const u = A.user(), isEmp = u.role === 'employee', t = A.today(), emps = A.employees();
    if (!isEmp && !A.can.teamAll()) return '';
    return `<div class="stack" style="max-width:560px"><a class="btn s ghost" href="#/team/requests" style="align-self:flex-start">← Заявки</a><div class="card"><h3>Заявка на отсутствие</h3>
      <form class="form" data-act="leaveAdd">
      ${isEmp ? `<p class="note">Остаток отпуска: <b>${u.leaveTotal - u.leaveUsed} дн.</b> из ${u.leaveTotal}</p>` : `<label class="f">Сотрудник<select name="userId">${A.opts(emps.map((e) => [e.id, e.name]))}</select></label>`}
      <label class="f">Тип<select name="type">${A.opts(ABS.map((k) => [k, A.ST[k][0] + ' ' + A.ST[k][1]]))}</select></label>
      <div class="f2"><label class="f">С<input type="date" name="from" value="${A.addDays(t, 7)}" required></label><label class="f">По<input type="date" name="to" value="${A.addDays(t, 13)}" required></label></div>
      <label class="f">Кто замещает<select name="substituteId">${A.opts(emps.filter((e) => e.id !== u.id).map((e) => [e.id, e.name]))}</select></label>
      <label class="f">Комментарий<input name="comment"></label>
      <label class="f">Лист нетрудоспособности (для больничного)<input type="file" name="file"></label>
      <button class="btn pri">Отправить на согласование</button></form>
      <p class="muted xs" style="margin-top:10px">После согласования статус на эти даты выставится автоматически. То же доступно в Telegram-боте.</p></div></div>`;
  };

  // ----- действия -----
  A.actions.teamGroup = (el) => { A.ui.team.group = el.dataset.v; };
  A.actions.calNav = (el) => { A.ui.team.calOff += +el.dataset.v; };
  A.actions.tsMonth = (el) => { A.ui.team.tsOff = +el.dataset.v; };
  A.actions.checkIn = (form) => {
    const u = A.user(), v = A.fd(form), plan = v.plan.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3).join('\n');
    if (!plan || A.attOn(u.id, A.today())) return false;
    A.s.attendance.push({ userId: u.id, date: A.today(), status: v.status, in: A.nowHM(), out: null, plan, done: '' });
    A.log('Отметка', 'Начало дня: ' + A.ST[v.status][1]); A.toast('День начат. Хорошей работы!');
  };
  A.actions.checkOut = (form) => { const at = A.attOn(A.user().id, A.today()); if (!at) return false; at.out = A.nowHM(); at.done = form.done.value.trim(); A.log('Отметка', 'Конец дня'); A.toast('День завершён'); };
  A.actions.absenceDecide = (el) => {
    const a = A.byId(A.s.absences, el.dataset.id); if (!a || A.user().role !== 'owner' || a.status !== 'pending') return false;
    a.status = el.dataset.v; a.approvedBy = A.user().id;
    if (a.status === 'approved' && a.type === 'vacation') A.byId(A.s.users, a.userId).leaveUsed += A.leaveDays(a.from, a.to);
    A.log('Заявка на отсутствие', (a.status === 'approved' ? 'Согласовано: ' : 'Отклонено: ') + A.userName(a.userId), a.from + ' – ' + a.to);
    A.toast(a.status === 'approved' ? 'Согласовано. Статус выставится на эти даты автоматически' : 'Заявка отклонена');
  };
  A.actions.leaveAdd = (form) => {
    const u = A.user(), v = A.fd(form), uid = u.role === 'employee' ? u.id : v.userId, who = A.byId(A.s.users, uid);
    if (v.to < v.from) { A.toast('Дата «по» раньше даты «с»'); return false; }
    if (v.type === 'vacation' && A.leaveDays(v.from, v.to) > who.leaveTotal - who.leaveUsed) { A.toast(`Не хватает дней отпуска: остаток ${who.leaveTotal - who.leaveUsed}`); return false; }
    const f = form.file.files[0];
    A.s.absences.push({ id: 'a' + A.uid(), userId: uid, type: v.type, from: v.from, to: v.to, substituteId: v.substituteId, comment: (v.comment || '').trim(), file: f ? f.name : '', status: 'pending', approvedBy: null });
    A.log('Заявка на отсутствие', 'Создана: ' + A.ST[v.type][1] + (uid !== u.id ? ' для ' + who.name : ''), v.from + ' – ' + v.to);
    A.toast('Заявка отправлена руководителю'); location.hash = '#/team/requests';
  };
  A.actions.tsExport = () => {
    const off = A.ui.team.tsOff, us = A.can.timesheet() ? A.employees() : [A.user()];
    const rows = [['Сотрудник', 'Должность', 'В офисе / на выезде', 'Удалённо', 'Отпуск', 'Больничный', 'Отгул', 'Отсутствия']].concat(us.map((x) => { const r = A.timesheet(x.id, off); return [x.name, x.title, r.work, r.remote, r.vacation, r.sick, r.day_off, r.absent]; }));
    const blob = new Blob(['﻿' + rows.map((r) => r.join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'tabel-' + A.monthKey(off) + '.csv'; a.click(); URL.revokeObjectURL(a.href);
    A.log('Табель', 'Экспорт за ' + A.monthKey(off)); return false;
  };
  A.actions.empReport = (el) => {
    const u = A.byId(A.teamVisible(), el.dataset.id); if (!u) return false;
    const t = A.today(), from = A.addDays(t, -29); let wd = 0, marked = 0, abs = 0;
    for (let d = from; d <= t; d = A.addDays(d, 1)) { if (A.absenceOn(u.id, d)) { abs++; continue; } if (!A.isWorkday(d)) continue; wd++; if (A.attOn(u.id, d)) marked++; }
    const ld = A.load2(u.id), closed = A.s.tasks.filter((k) => k.assigneeId === u.id && k.done && k.doneAt >= from).length, at = A.attOn(u.id, t);
    const feed = [...A.s.audit.filter((x) => x.userId === u.id).slice(0, 6).map((x) => ({ at: x.at, text: x.entity + ': ' + x.action })), ...A.s.tasks.filter((k) => k.assigneeId === u.id && k.done).map((k) => ({ at: k.doneAt + 'T12:00', text: 'Закрыта задача: ' + k.title }))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
    const full = A.user().role !== 'employee' || u.id === A.user().id;
    A.modal(`<h2>${esc(u.name)}</h2><p class="muted" style="margin:-8px 0 12px">${esc(u.title)} · ${A.stBadge(A.statusOf(u.id, t))}</p>
      ${at ? `<p class="sm" style="white-space:pre-line"><b>План на сегодня:</b>\n${esc(at.plan || '—')}${at.done ? '\n\n<b>Сделано:</b>\n' + esc(at.done) : ''}</p>` : ''}
      ${full ? `<h3 style="margin:14px 0 6px">Отчёт за 30 дней</h3><div class="list"><div class="li"><span class="grow">Дисциплина отметок</span><b>${wd ? Math.round((marked / wd) * 100) : 0}% <span class="muted xs">(${marked} из ${wd} раб. дней)</span></b></div><div class="li"><span class="grow">Закрыто задач</span><b>${closed}</b></div><div class="li"><span class="grow">Открыто / просрочено</span><b class="${ld.overdue ? 'c-r' : ''}">${ld.open} / ${ld.overdue}</b></div><div class="li"><span class="grow">Дни отсутствия по заявкам</span><b>${abs}</b></div><div class="li"><span class="grow">Остаток отпуска</span><b>${u.leaveTotal - u.leaveUsed} дн.</b></div></div>
      <h3 style="margin:14px 0 6px">Лента активности</h3><div class="list">${feed.map((f) => `<div class="li"><span class="muted xs" style="width:64px;flex:none">${A.fmtDate(f.at)}</span><span class="grow sm">${esc(f.text)}</span></div>`).join('') || '<p class="muted sm">Пока нет записей.</p>'}</div>` : '<p class="note" style="margin-top:12px">Отчёты по коллегам видит только руководитель.</p>'}
      <div class="row" style="margin-top:14px"><button type="button" class="btn" data-act="closeModal">Закрыть</button></div>`);
    return false;
  };
})();
