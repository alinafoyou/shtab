/* ШТАБ — Проекты (F-2.x): канбан, таблица, Гант, карта, карточка проекта */
(function () {
  const A = App, esc = A.esc;
  A.ui.pf = { mode: 'kanban', dir: '', owner: '', status: '', hot: false, nostep: false, late: false };
  const dirName = (id) => (A.byId(A.s.directions, id) || {}).name || '—';
  const late = (p) => p.deadline < A.today() && p.stage !== 'Закрыт';

  function filtered() {
    const f = A.ui.pf;
    return A.visibleProjects().filter((p) => (!f.dir || p.dirId === f.dir) && (!f.owner || p.ownerId === f.owner) && (!f.status || A.pStatus(p) === f.status)
      && (!f.hot || A.pStatus(p) === 'r') && (!f.nostep || !p.nextStep.trim()) && (!f.late || late(p)));
  }
  const stale = (p) => { const n = A.diff(p.updatedAt, A.today()); return p.stage !== 'Закрыт' && n >= 7 ? `<span class="chip ${n >= 14 ? 'r' : 'y'}" title="Авто-правило: нет обновлений">⏱ ${n} дн. без обновления</span>` : ''; };
  const pcard = (p) => `<a class="pcard" href="#/project/${p.id}" ${A.canEditProject(p) ? `draggable="true" data-drag="${p.id}"` : ''}>
    <span class="hd">${A.dot(A.pStatus(p))}<span>${esc(p.name)}</span></span>
    <span class="muted xs">${esc(dirName(p.dirId))} · ${esc(A.short(p.ownerId))}</span>
    <span class="sm">${p.nextStep.trim() ? '→ ' + esc(p.nextStep) : '<span class="c-y">⚠ нет следующего шага</span>'}</span>
    <span class="row"><span class="xs ${late(p) ? 'c-r' : 'muted'}">до ${A.fmtDate(p.deadline)}</span>${stale(p)}</span></a>`;

  A.views.projects = function () {
    const s = A.s, f = A.ui.pf, list = filtered(), vis = A.visibleProjects();
    const owners = [...new Set(vis.map((p) => p.ownerId))];
    const tog = (k, l) => `<button type="button" class="chip ${f[k] ? 'on' : ''}" aria-pressed="${!!f[k]}" data-act="pfToggle" data-k="${k}">${l}</button>`;
    const bar = `<div class="row">${A.seg([['kanban', 'Канбан'], ['table', 'Таблица'], ['gantt', 'Гант'], ['map', 'Карта']], f.mode, 'pfMode')}
      <select aria-label="Направление" data-change="pfSel" data-k="dir" style="width:auto"><option value="">Все направления</option>${A.opts(s.directions.map((d) => [d.id, d.name]), f.dir)}</select>
      <select aria-label="Ответственный" data-change="pfSel" data-k="owner" style="width:auto"><option value="">Все ответственные</option>${A.opts(owners.map((id) => [id, A.userName(id)]), f.owner)}</select>
      <select aria-label="Статус" data-change="pfSel" data-k="status" style="width:auto"><option value="">Любой статус</option>${A.opts([['g', '🟢 По плану'], ['y', '🟡 Риск'], ['r', '🔴 Горит']], f.status)}</select>
      ${tog('hot', '🔥 Горящие')}${tog('nostep', 'Без следующего шага')}${tog('late', 'Просрочен дедлайн')}
      <span class="grow"></span>${A.user().role === 'owner' ? '<button type="button" class="btn pri" data-act="projectForm">+ Проект</button>' : ''}</div>`;
    let body = '';
    if (!list.length) body = '<div class="card"><p class="muted">Под эти фильтры ничего не попало.</p></div>';
    else if (f.mode === 'kanban') {
      body = `<div class="kanban">${A.STAGES.map((st) => { const ps = list.filter((p) => p.stage === st); return `<div class="kcol" data-drop="${st}"><h4><span>${st}</span><span>${ps.length}</span></h4>${ps.map(pcard).join('')}</div>`; }).join('')}</div><p class="muted xs">На компьютере карточку можно перетащить между этапами. На телефоне этап меняется в карточке проекта.</p>`;
    } else if (f.mode === 'table') {
      body = `<div class="card scroll"><table class="t"><thead><tr><th></th><th>Проект</th><th>Направление</th><th>Ответственный</th><th>Этап</th><th>Следующий шаг</th><th>Дедлайн</th><th class="n">Бюджет</th></tr></thead><tbody>${list.map((p) => `<tr><td>${A.dot(A.pStatus(p))}</td><td><a href="#/project/${p.id}"><b>${esc(p.name)}</b></a> ${stale(p)}</td><td class="muted">${esc(dirName(p.dirId))}</td><td>${esc(A.userName(p.ownerId))}</td><td>${p.stage}</td><td>${p.nextStep.trim() ? esc(p.nextStep) : '<span class="c-y">нет</span>'}</td><td class="${late(p) ? 'c-r' : ''}" style="white-space:nowrap">${A.fmtDate(p.deadline)}</td><td class="n">${A.canSeeBudget(p) ? A.money(p.budget, p.currency) : '—'}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (f.mode === 'gantt') {
      const t = A.today(), lo = list.reduce((m, p) => (p.start < m ? p.start : m), t), hi = list.reduce((m, p) => (p.deadline > m ? p.deadline : m), t), span = Math.max(1, A.diff(lo, hi));
      const pc = (d) => (A.diff(lo, d) / span) * 100;
      body = `<div class="card scroll"><div class="row between sm muted" style="margin-bottom:10px"><span>${A.fmtDate(lo)}</span><span class="gold">▎сегодня</span><span>${A.fmtDate(hi, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div><div class="gantt">${list.map((p) => `<a href="#/project/${p.id}" class="sm"><b>${esc(p.name)}</b></a><div class="gtrack"><div class="gbar ${A.pStatus(p)}" style="left:${pc(p.start)}%;width:${Math.max(1, pc(p.deadline) - pc(p.start))}%" title="${A.fmtDate(p.start)} – ${A.fmtDate(p.deadline)}"></div><div class="gtoday" style="left:${pc(t)}%"></div></div>`).join('')}</div></div>`;
    } else {
      body = `<div class="grid g3">${s.directions.map((d) => { const ps = list.filter((p) => p.dirId === d.id); if (!ps.length) return ''; return `<div class="card tile" style="border-top-color:${d.color}"><h3>${esc(d.name)} <span class="muted sm">${ps.length}</span></h3><div class="list">${ps.map((p) => `<a class="li" href="#/project/${p.id}">${A.dot(A.pStatus(p))}<span class="grow">${esc(p.name)}</span><span class="muted xs">${p.stage}</span></a>`).join('')}</div></div>`; }).join('')}</div>`;
    }
    return `<div class="stack">${bar}${body}</div>`;
  };

  A.views.project = function (id) {
    const s = A.s, p = A.byId(A.visibleProjects(), id);
    if (!p) return '<div class="card"><p>Проект не найден или у вас нет к нему доступа.</p><p><a class="gold" href="#/projects">← К проектам</a></p></div>';
    const edit = A.canEditProject(p), canT = A.canTasks(p), st = A.pStatus(p), tasks = s.tasks.filter((k) => k.projectId === p.id), t = A.today();
    const m = A.projectMoney(p);
    const info = edit
      ? `<form class="form" data-act="projectSave" data-id="${p.id}">
        <label class="f">Название<input name="name" value="${esc(p.name)}" required></label>
        <label class="f">Следующий шаг (обязательно)<input name="nextStep" value="${esc(p.nextStep)}" required placeholder="Что конкретно происходит дальше?"></label>
        <div class="f2"><label class="f">Направление<select name="dirId">${A.opts(s.directions.map((d) => [d.id, d.name]), p.dirId)}</select></label>
        <label class="f">Ответственный<select name="ownerId" ${A.user().role === 'owner' ? '' : 'disabled'}>${A.opts(s.users.filter((u) => u.role !== 'assistant').map((u) => [u.id, u.name]), p.ownerId)}</select></label></div>
        <div class="f2"><label class="f">Этап<select name="stage">${A.opts(A.STAGES.map((x) => [x, x]), p.stage)}</select></label>
        <label class="f">Дедлайн<input type="date" name="deadline" value="${p.deadline}" required></label></div>
        <button class="btn pri" style="justify-self:start">Сохранить</button></form>`
      : `<div class="list"><div class="li"><span class="muted grow">Следующий шаг</span><b>${esc(p.nextStep || '—')}</b></div><div class="li"><span class="muted grow">Ответственный</span>${esc(A.userName(p.ownerId))}</div><div class="li"><span class="muted grow">Этап</span>${p.stage}</div><div class="li"><span class="muted grow">Дедлайн</span>${A.fmtDate(p.deadline)}</div></div><p class="note" style="margin-top:10px">У ассистента — просмотр и задачи. Поля проекта меняет владелец или ответственный.</p>`;
    const statusBox = edit ? `<div class="card"><h3>Обновить статус в 1 касание</h3><form class="form" data-act="projectStatus" data-id="${p.id}"><input name="comment" placeholder="Комментарий (необязательно)" aria-label="Комментарий к статусу"><div class="row">${[['g', '🟢 По плану'], ['y', '🟡 Риск'], ['r', '🔴 Горит']].map(([k, l]) => `<button class="btn ${p.status === k ? 'pri' : ''}" name="st" value="${k}">${l}</button>`).join('')}</div><p class="muted xs">Так же будет работать Telegram-бот: «🟢 / 🟡 / 🔴 + комментарий».</p></form></div>` : '';
    const budget = A.canSeeBudget(p) ? `<div class="card"><h3>Бюджет</h3><div class="big">${A.money(p.budget, p.currency)}</div><div class="row" style="margin-top:10px;gap:18px"><span><b class="num c-g">${A.money(m.paid, 'KZT', 1)}</b> <span class="muted xs">оплачено</span></span><span><b class="num">${A.money(m.exp, 'KZT', 1)}</b> <span class="muted xs">ожидается</span></span></div><div style="margin-top:10px">${A.progress(m.paid / (A.kzt(p.budget, p.currency) || 1), 'g')}</div></div>` : '';
    const taskList = `<div class="card"><h3>Задачи <span class="muted sm">${tasks.filter((k) => !k.done).length} открыто</span></h3><div class="list">${tasks.map((k) => `<label class="li" style="cursor:pointer"><input type="checkbox" data-change="taskToggle" data-id="${k.id}" ${k.done ? 'checked' : ''} ${canT ? '' : 'disabled'}><span class="grow" style="${k.done ? 'text-decoration:line-through;opacity:.55' : ''}">${esc(k.title)}<span class="muted xs" style="display:block">${esc(A.userName(k.assigneeId))}${k.createdBy !== A.owner().id ? ' · поставил(а) ' + esc(A.short(k.createdBy)) : ''}</span></span><span class="xs ${!k.done && k.due < t ? 'c-r' : 'muted'}">${A.fmtDate(k.due)}</span></label>`).join('') || '<p class="muted">Задач пока нет.</p>'}</div>
      ${canT ? `<form class="form" data-act="taskAdd" data-id="${p.id}" style="margin-top:12px"><input name="title" placeholder="Новая задача" aria-label="Новая задача" required><div class="f2"><select name="assigneeId" aria-label="Исполнитель">${A.opts(s.users.filter((u) => u.role !== 'employee' || A.isMember(p, u.id)).map((u) => [u.id, u.name]), A.user().id)}</select><input type="date" name="due" value="${A.addDays(t, 3)}" aria-label="Срок" required></div><button class="btn" style="justify-self:start">+ Добавить задачу</button></form>` : ''}</div>`;
    const comments = `<div class="card"><h3>Комментарии</h3><div class="list">${p.comments.map((c) => `<div class="li" style="align-items:flex-start">${A.avatar(A.byId(s.users, c.userId) || { name: '?' })}<div class="grow"><b>${esc(A.userName(c.userId))}</b> <span class="muted xs">${new Date(c.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><div>${esc(c.text)}</div></div></div>`).join('') || '<p class="muted">Пока тихо.</p>'}</div><form class="row" data-act="commentAdd" data-id="${p.id}" style="margin-top:10px;flex-wrap:nowrap"><input name="text" placeholder="Написать комментарий" aria-label="Комментарий" required><button class="btn">Отправить</button></form></div>`;
    const files = `<div class="card"><h3>Файлы</h3><div class="row">${p.files.map((f) => `<span class="chip">📎 ${esc(f)}</span>`).join('') || '<span class="muted">Файлов нет.</span>'}</div>${edit ? `<label class="btn s" style="margin-top:10px">+ Прикрепить<input type="file" hidden data-change="fileAdd" data-id="${p.id}"></label><p class="muted xs" style="margin-top:6px">В демо сохраняется только имя файла. Хранилище (Google Drive) — этап v2.</p>` : ''}</div>`;
    const hist = `<div class="card"><h3>История</h3><div class="list">${p.history.slice(0, 12).map((h) => `<div class="li"><span class="muted xs" style="width:86px;flex:none">${new Date(h.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span><span class="grow">${esc(h.text)}</span><span class="muted xs">${esc(A.short(h.userId))}</span></div>`).join('')}</div></div>`;
    const team = `<div class="card"><h3>Команда проекта</h3><div class="row">${[p.ownerId, ...p.members].map((uid) => `<span class="chip">${esc(A.userName(uid))}${uid === p.ownerId ? ' · отв.' : ''}</span>`).join('')}</div></div>`;
    return `<div class="stack"><div class="row"><a class="btn s ghost" href="#/projects">← Проекты</a><span class="chip ${st}">${A.dot(st)} ${A.SNAME[st]}</span><span class="chip">${esc(dirName(p.dirId))}</span>${p.stage !== 'Закрыт' && A.diff(p.updatedAt, A.today()) >= 7 ? `<span class="chip y">⏱ не обновлялся ${A.diff(p.updatedAt, A.today())} дн. — статус изменён авто-правилом</span>` : ''}</div>
      <div class="grid g2"><div class="stack"><div class="card"><h3>О проекте</h3>${info}</div>${taskList}${comments}</div><div class="stack">${statusBox}${budget}${team}${files}${hist}</div></div></div>`;
  };

  // ----- действия -----
  A.actions.pfMode = (el) => { A.ui.pf.mode = el.dataset.v; };
  A.actions.pfSel = (el) => { A.ui.pf[el.dataset.k] = el.value; };
  A.actions.pfToggle = (el) => { A.ui.pf[el.dataset.k] = !A.ui.pf[el.dataset.k]; };
  A.actions.projectForm = () => {
    const s = A.s;
    A.modal(`<h2>Новый проект</h2><form class="form" data-act="projectAdd">
      <label class="f">Название<input name="name" required></label>
      <div class="f2"><label class="f">Направление<select name="dirId">${A.opts(s.directions.map((d) => [d.id, d.name]))}</select></label><label class="f">Ответственный<select name="ownerId">${A.opts(s.users.filter((u) => u.role !== 'assistant').map((u) => [u.id, u.name]))}</select></label></div>
      <div class="f2"><label class="f">Бюджет<input type="number" name="budget" min="0" value="0"></label><label class="f">Валюта<select name="currency">${A.opts(A.CUR.map((c) => [c, c]), s.settings.currency)}</select></label></div>
      <div class="f2"><label class="f">Компания<select name="companyId"><option value="">— не привязан —</option>${A.opts(s.companies.map((c) => [c.id, c.name]))}</select></label><label class="f">Дедлайн<input type="date" name="deadline" value="${A.addDays(A.today(), 30)}" required></label></div>
      <label class="f">Следующий шаг (обязательно)<input name="nextStep" required></label>
      <div class="row"><button class="btn pri">Создать</button><button type="button" class="btn ghost" data-act="closeModal">Отмена</button></div></form>`);
    return false;
  };
  A.actions.projectAdd = (form) => {
    const v = A.fd(form), t = A.today();
    const p = { id: 'p' + A.uid(), dirId: v.dirId, name: v.name.trim(), ownerId: v.ownerId, status: 'g', stage: 'Идея', budget: +v.budget || 0, currency: v.currency, companyId: v.companyId || null, start: t, deadline: v.deadline, nextStep: v.nextStep.trim(), updatedAt: t, members: [], comments: [], files: [], history: [] };
    A.s.projects.push(p); A.touchProject(p, 'Проект создан'); A.toast('Проект создан');
  };
  A.actions.projectSave = (form) => {
    const p = A.byId(A.s.projects, form.dataset.id), v = A.fd(form);
    if (!p || !A.canEditProject(p)) return false;
    if (!v.nextStep.trim()) { A.toast('Следующий шаг — обязательное поле'); return false; }
    const closing = v.stage === 'Закрыт' && p.stage !== 'Закрыт';
    Object.assign(p, { name: v.name.trim(), nextStep: v.nextStep.trim(), dirId: v.dirId, stage: v.stage, deadline: v.deadline });
    if (v.ownerId) p.ownerId = v.ownerId;
    A.touchProject(p, 'Обновлены поля проекта');
    if (closing) { p.status = 'g'; A.confetti(); }
    A.toast('Сохранено');
  };
  A.actions.projectStatus = (form, e) => {
    const p = A.byId(A.s.projects, form.dataset.id), st = e.submitter && e.submitter.value, c = form.comment.value.trim();
    if (!p || !st || !A.canEditProject(p)) return false;
    p.status = st; A.touchProject(p, 'Статус: ' + A.SNAME[st] + (c ? ' — ' + c : ''));
    if (c) p.comments.push({ userId: A.user().id, text: c, at: new Date().toISOString() });
    A.toast('Статус обновлён');
  };
  A.actions.taskToggle = (el) => {
    const k = A.byId(A.s.tasks, el.dataset.id), p = k && A.byId(A.s.projects, k.projectId);
    if (!k || !A.canTasks(p)) return false;
    k.done = el.checked; k.doneAt = el.checked ? A.today() : null;
    A.touchProject(p, (k.done ? 'Закрыта задача: ' : 'Возвращена задача: ') + k.title); if (k.done) A.buzz();
  };
  A.actions.taskAdd = (form) => {
    const p = A.byId(A.s.projects, form.dataset.id), v = A.fd(form);
    if (!p || !A.canTasks(p)) return false;
    A.s.tasks.push({ id: 'k' + A.uid(), projectId: p.id, title: v.title.trim(), assigneeId: v.assigneeId, due: v.due, done: false, doneAt: null, createdBy: A.user().id });
    A.touchProject(p, 'Новая задача: ' + v.title.trim());
  };
  A.actions.commentAdd = (form) => {
    const p = A.byId(A.visibleProjects(), form.dataset.id), text = form.text.value.trim();
    if (!p || !text) return false;
    p.comments.push({ userId: A.user().id, text, at: new Date().toISOString() }); A.touchProject(p, 'Комментарий');
  };
  A.actions.fileAdd = (el) => { const p = A.byId(A.s.projects, el.dataset.id), f = el.files[0]; if (!p || !f || !A.canEditProject(p)) return false; p.files.push(f.name); A.touchProject(p, 'Файл: ' + f.name); };
})();
