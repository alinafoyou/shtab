/* ШТАБ — Финансы (F-3.x): два раздельных контура */
(function () {
  const A = App, esc = A.esc;
  A.ui.fin = { company: 'all' };
  const months = () => [2, 1, 0].map((o) => { const d = new Date(), x = new Date(d.getFullYear(), d.getMonth() - o, 1); return { key: A.iso(x).slice(0, 7), label: x.toLocaleDateString('ru-RU', { month: 'short' }) }; });
  const sum = (list) => list.reduce((a, x) => a + A.kzt(x.amount, x.currency), 0);
  const KIND = { dividend: 'Дивиденды', founder_payout: 'Выплата учредителю', loan: 'Заём', other: 'Прочее' };
  const kpi = (lbl, val, cls, sub) => `<div class="card kpi"><div class="lbl">${lbl}</div><div class="big ${cls || ''}">${val}</div>${sub ? `<div class="muted xs">${sub}</div>` : ''}</div>`;
  const txRow = (x) => `<div class="li"><span class="muted xs" style="width:58px;flex:none">${A.fmtDate(x.date)}</span><div class="grow">${esc(x.category)}${x.note ? ` <span class="muted">· ${esc(x.note)}</span>` : ''}<div class="muted xs">${esc(A.walletName(x.walletId))}${x.projectId && A.byId(A.s.projects, x.projectId) ? ' → ' + esc(A.byId(A.s.projects, x.projectId).name) : ''}</div></div><b class="num ${x.type === 'in' ? 'c-g' : ''}">${x.type === 'in' ? '+' : '−'}${A.money(x.amount, x.currency)}</b></div>`;

  function companyTab() {
    const s = A.s, t = A.today(), allowed = s.companies.filter((c) => A.can.companyFin(c.id));
    if (!allowed.length) return '<div class="card"><p class="muted">Нет доступа к деньгам компаний. Владелец открывает его по галочке для каждой компании.</p></div>';
    let cur = A.ui.fin.company; if (cur !== 'all' && !allowed.some((c) => c.id === cur)) cur = 'all';
    const comps = cur === 'all' ? allowed : allowed.filter((c) => c.id === cur);
    const wids = comps.map((c) => s.wallets.find((w) => w.companyId === c.id).id), mk = A.monthKey(0), f = A.flow(wids, mk), ms = months();
    const bal = wids.reduce((a, w) => a + A.balance(w), 0), ex = A.expected(wids), od = ex.filter((x) => x.date < t);
    const pick = `<div class="seg">${[['all', allowed.length > 1 ? 'Все компании' : ''], ...allowed.map((c) => [c.id, c.name])].filter((x) => x[1]).map(([v, l]) => `<button type="button" class="${v === cur ? 'on' : ''}" data-act="finCompany" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
    const kpis = `<div class="grid g4">${kpi('Баланс', A.money(bal, 'KZT', 1))}${kpi('Выручка за месяц', A.money(f.inc, 'KZT', 1), 'c-g')}${kpi('Расходы за месяц', A.money(f.out, 'KZT', 1))}${kpi('Дебиторка', A.money(sum(ex), 'KZT', 1), od.length ? 'c-r' : '', od.length ? 'из них просрочено ' + A.money(sum(od), 'KZT', 1) : 'просрочек нет')}</div>`;
    const chart = `<div class="card"><h3>Доходы и расходы по месяцам</h3>${A.bars(ms.map((m) => { const x = A.flow(wids, m.key); return { label: m.label, a: x.inc, b: x.out }; }), 'Доходы', 'Расходы')}</div>`;
    const share = cur === 'all' && allowed.length > 1 ? `<div class="card"><h3>Доля компаний в доходе за 3 месяца</h3>${A.donut(allowed.map((c) => ({ label: c.name, value: ms.reduce((a, m) => a + A.flow([s.wallets.find((w) => w.companyId === c.id).id], m.key).inc, 0) })))}</div>` : '';
    const expd = `<div class="card"><h3>Ожидаемые платежи и дебиторка</h3><div class="list">${ex.map((x) => `<div class="li"><span class="chip ${x.date < t ? 'r' : ''}">${x.date < t ? 'просрочен ' + A.diff(x.date, t) + ' дн.' : 'до ' + A.fmtDate(x.date)}</span><div class="grow"><b>${esc(x.note || x.category)}</b><div class="muted xs">${esc(A.walletName(x.walletId))}</div></div><b class="num">${A.money(x.amount, x.currency)}</b><button type="button" class="btn s" data-act="txPaid" data-id="${x.id}">Оплачено</button></div>`).join('') || '<p class="muted">Ожидаемых платежей нет.</p>'}</div></div>`;
    // P&L
    const q = ms.reduce((a, m) => { const x = A.flow(wids, m.key); a.inc += x.inc; a.out += x.out; return a; }, { inc: 0, out: 0 });
    const pr = s.projects.filter((p) => comps.some((c) => c.id === p.companyId)).map((p) => {
      let inc = 0, out = 0; s.tx.forEach((x) => { if (x.projectId !== p.id) return; const v = A.kzt(x.amount, x.currency); if (x.type === 'in') inc += v; else if (x.type === 'out') out += v; });
      return { p, inc, out };
    }).filter((x) => x.inc || x.out);
    const pct = (a, b) => (A.s.settings.hideAmounts ? '••' : a ? Math.round(((a - b) / a) * 100) + '%' : '—');
    const pl = `<div class="card scroll"><h3>P&amp;L</h3><table class="t"><thead><tr><th></th><th class="n">Выручка</th><th class="n">Расходы</th><th class="n">Прибыль</th><th class="n">Маржа</th></tr></thead><tbody>
      <tr><td>Этот месяц</td><td class="n">${A.money(f.inc, 'KZT', 1)}</td><td class="n">${A.money(f.out, 'KZT', 1)}</td><td class="n"><b>${A.money(f.inc - f.out, 'KZT', 1)}</b></td><td class="n">${pct(f.inc, f.out)}</td></tr>
      <tr><td>3 месяца</td><td class="n">${A.money(q.inc, 'KZT', 1)}</td><td class="n">${A.money(q.out, 'KZT', 1)}</td><td class="n"><b>${A.money(q.inc - q.out, 'KZT', 1)}</b></td><td class="n">${pct(q.inc, q.out)}</td></tr>
      ${pr.map((x) => `<tr><td class="muted">↳ <a href="#/project/${x.p.id}">${esc(x.p.name)}</a></td><td class="n">${A.money(x.inc, 'KZT', 1)}</td><td class="n">${A.money(x.out, 'KZT', 1)}</td><td class="n">${A.money(x.inc - x.out, 'KZT', 1)}</td><td class="n">${pct(x.inc, x.out)}</td></tr>`).join('')}
      </tbody></table><p class="muted xs" style="margin-top:8px">В расходах компании учтены выплаты учредителю. По проектам — только прямые расходы, без ФОТ и аренды.</p></div>`;
    const avgOut = q.out / 3;
    const fc = `<div class="card"><h3>Прогноз денежного потока</h3><div class="grid g3">${[30, 60, 90].map((n) => { const lim = A.addDays(t, n), v = bal + sum(ex.filter((x) => x.date >= t && x.date <= lim)) - (avgOut * n) / 30; return `<div><div class="muted sm">через ${n} дней</div><div class="mid ${v < 0 ? 'c-r' : ''}">${A.money(v, 'KZT', 1)}</div></div>`; }).join('')}</div><p class="muted xs" style="margin-top:8px">Баланс + ожидаемые платежи в срок − средние расходы за 3 месяца. Просроченная дебиторка в прогноз не входит.</p></div>`;
    const tax = `<div class="card"><h3>Налоговый календарь</h3><div class="list">${s.taxes.filter((x) => comps.some((c) => c.id === x.companyId)).sort((a, b) => a.due.localeCompare(b.due)).map((x) => `<label class="li" style="cursor:pointer"><input type="checkbox" data-change="taxToggle" data-id="${x.id}" ${x.done ? 'checked' : ''}><div class="grow" style="${x.done ? 'opacity:.5;text-decoration:line-through' : ''}">${esc(x.name)}<div class="muted xs">${esc(A.byId(s.companies, x.companyId).name)}</div></div><span class="xs ${!x.done && A.diff(t, x.due) <= 10 ? 'c-y' : 'muted'}">до ${A.fmtDate(x.due)}</span><b class="num">${x.amount ? A.money(x.amount) : ''}</b></label>`).join('')}</div><p class="muted xs" style="margin-top:8px">Суммы вносит владелец или бухгалтер вручную.</p></div>`;
    const ops = `<div class="card"><h3>Последние операции</h3><div class="list">${s.tx.filter((x) => wids.includes(x.walletId) && x.type !== 'expected').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(txRow).join('')}</div></div>`;
    return `<div class="stack">${pick}${kpis}<div class="grid g2">${chart}${share || fc}</div>${expd}<div class="grid g2">${pl}<div class="stack">${share ? fc : ''}${tax}</div></div>${ops}</div>`;
  }

  function personalTab() {
    const s = A.s, t = A.today();
    if (!A.can.personalFin()) return '<div class="card"><p class="muted">Личные деньги по умолчанию закрыты для всех, кроме владельца.</p></div>';
    const mk = A.monthKey(0), f = A.flow(['w0'], mk), ms = months(), bud = Object.values(s.budgets).reduce((a, b) => a + b, 0), sav = s.goals.reduce((a, g) => a + g.current, 0);
    const mtx = s.tx.filter((x) => x.walletId === 'w0' && x.date.slice(0, 7) === mk), cat = (c) => sum(mtx.filter((x) => x.type === 'out' && x.category === c));
    const salary = sum(mtx.filter((x) => x.type === 'in' && x.category === 'Зарплата')), div = sum(s.transfers.filter((x) => x.to === 'w0' && x.date.slice(0, 7) === mk));
    const kpis = `<div class="grid g4">${kpi('Доход за месяц', A.money(f.inc, 'KZT', 1), 'c-g')}${kpi('Траты за месяц', A.money(f.out, 'KZT', 1))}${kpi('Остаток бюджета', A.money(bud - f.out, 'KZT', 1), bud - f.out < 0 ? 'c-r' : '', 'из ' + A.money(bud, 'KZT', 1))}${kpi('Накопления', A.money(sav, 'KZT', 1), 'gold')}</div>`;
    const src = `<div class="card"><h3>Источники дохода</h3><div class="list">${[['Зарплата (наёмная позиция)', salary], ['Дивиденды и выплаты из своих компаний', div], ['Прочее', f.inc - salary - div]].map(([l, v]) => `<div class="li"><span class="grow">${l}</span><b class="num">${A.money(v)}</b></div>`).join('')}</div></div>`;
    const cats = `<div class="card"><h3>Бюджет по категориям</h3>${Object.keys(s.budgets).map((c) => { const v = cat(c), lim = s.budgets[c]; return `<div style="margin-bottom:12px"><div class="row between sm"><span>${esc(c)}</span><span class="num ${v > lim ? 'c-r' : 'muted'}">${A.money(v)} / ${A.money(lim)}</span></div>${A.progress(v / lim, v > lim ? 'r' : v > lim * 0.85 ? 'y' : 'g')}</div>`; }).join('')}</div>`;
    const goals = `<div class="card"><h3>Цели накоплений</h3>${s.goals.map((g) => `<div style="margin-bottom:14px"><div class="row between"><b>${esc(g.name)}</b><span class="muted xs">к ${A.fmtDate(g.due, { month: 'long', year: 'numeric' })}</span></div><div class="row between sm" style="margin:4px 0"><span class="num gold">${A.money(g.current, 'KZT', 1)}</span><span class="num muted">из ${A.money(g.target, 'KZT', 1)} · ${Math.round((g.current / g.target) * 100)}%</span></div>${A.progress(g.current / g.target)}<h3 style="margin:14px 0 4px">Динамика накоплений</h3>${A.line([{ cls: 'ln', pts: g.history.map((h) => ({ label: A.fmtDate(h.date, { month: 'short' }), v: h.v })) }], 0, g.target)}<form class="row" data-act="goalAdd" data-id="${g.id}" style="flex-wrap:nowrap;margin-top:8px"><input type="number" name="amount" min="1" placeholder="Сумма пополнения, ₸" aria-label="Сумма пополнения" required><button class="btn">Пополнить</button></form></div>`).join('')}</div>`;
    const nextDay = (day) => { const d = new Date(), x = new Date(d.getFullYear(), d.getMonth() + (d.getDate() > day ? 1 : 0), day); return A.iso(x); };
    const rec = `<div class="card"><h3>Регулярные платежи</h3><div class="list">${s.recurring.map((r) => ({ r, d: nextDay(r.day) })).sort((a, b) => a.d.localeCompare(b.d)).map(({ r, d }) => `<div class="li"><span class="chip ${A.diff(t, d) <= 3 ? 'y' : ''}">${A.fmtDate(d)}</span><span class="grow">${esc(r.name)}</span><b class="num">${A.money(r.amount)}</b></div>`).join('')}</div></div>`;
    const chart = `<div class="card"><h3>Доходы и расходы по месяцам</h3>${A.bars(ms.map((m) => { const x = A.flow(['w0'], m.key); return { label: m.label, a: x.inc, b: x.out }; }), 'Доходы', 'Расходы')}</div>`;
    const tr = `<div class="card"><h3>Переводы между контурами</h3><div class="list">${s.transfers.slice().sort((a, b) => b.date.localeCompare(a.date)).map((x) => `<div class="li"><span class="muted xs" style="width:58px;flex:none">${A.fmtDate(x.date)}</span><div class="grow">${KIND[x.kind]}<div class="muted xs">${esc(A.walletName(x.from))} → ${esc(A.walletName(x.to))}</div></div><b class="num">${A.money(x.amount, x.currency)}</b></div>`).join('')}</div><p class="note" style="margin-top:10px">Один перевод = расход в компании + доход в личном контуре. Других связей между контурами нет.</p></div>`;
    const ops = `<div class="card"><h3>Последние операции</h3><div class="list">${s.tx.filter((x) => x.walletId === 'w0').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(txRow).join('')}</div></div>`;
    return `<div class="stack">${kpis}<div class="grid g2">${chart}${src}</div><div class="grid g2">${cats}${goals}</div><div class="grid g2">${rec}${tr}</div>${ops}</div>`;
  }

  A.views.finance = function (arg) {
    const tabs = []; if (A.can.anyCompanyFin()) tabs.push(['company', '💼 Компании']); if (A.can.personalFin()) tabs.push(['personal', '👤 Личные']);
    if (!tabs.length) return '<div class="card"><p class="muted">У вас нет доступа к финансам.</p></div>';
    const tab = tabs.some((x) => x[0] === arg) ? arg : tabs[0][0], st = A.s.settings, isOwner = A.user().role === 'owner';
    const bar = `<div class="row">${A.tabs(tabs, tab, 'finance')}<span class="grow"></span>
      <button type="button" class="btn" data-act="hideToggle" aria-pressed="${st.hideAmounts}">${st.hideAmounts ? '👁 Показать суммы' : '🙈 Скрыть суммы'}</button>
      <button type="button" class="btn pri" data-act="txForm" data-tab="${tab}">+ Операция</button>
      ${isOwner ? '<button type="button" class="btn" data-act="transferForm">⇄ Перевод</button>' : ''}
      <button type="button" class="btn" data-act="csvForm" data-tab="${tab}">Импорт CSV</button></div>`;
    const rates = `<p class="muted xs">Курсы к тенге: ${A.CUR.filter((c) => c !== 'KZT').map((c) => c + ' ' + st.rates[c]).join(' · ')} — демо-значения, меняются в настройках. Все итоги пересчитаны в ₸.</p>`;
    return `<div class="stack">${bar}${tab === 'company' ? companyTab() : personalTab()}${rates}</div>`;
  };

  // ----- действия -----
  const walletsFor = (tab) => A.s.wallets.filter((w) => (tab === 'personal' ? w.kind === 'personal' && A.can.personalFin() : w.kind === 'company' && A.can.companyFin(w.companyId)));
  A.actions.finCompany = (el) => { A.ui.fin.company = el.dataset.v; };
  A.actions.hideToggle = () => { A.s.settings.hideAmounts = !A.s.settings.hideAmounts; };
  A.actions.txPaid = (el) => { const x = A.byId(A.s.tx, el.dataset.id); if (!x) return false; x.type = 'in'; x.date = A.today(); A.log('Финансы', 'Платёж получен: ' + (x.note || x.category)); A.toast('Отмечено как оплаченное'); };
  A.actions.taxToggle = (el) => { const x = A.byId(A.s.taxes, el.dataset.id); if (x) { x.done = el.checked; A.log('Налоговый календарь', (x.done ? 'Выполнено: ' : 'Возвращено: ') + x.name); } };
  A.actions.goalAdd = (form) => { const g = A.byId(A.s.goals, form.dataset.id), v = +form.amount.value; if (!g || !(v > 0)) return false; g.current += v; g.history.push({ date: A.today(), v: g.current }); A.log('Цель накоплений', 'Пополнение: ' + g.name, String(v)); A.toast('Цель пополнена'); };
  A.actions.txForm = (el) => {
    const tab = el.dataset.tab, ws = walletsFor(tab), cats = tab === 'personal' ? ['Зарплата', 'Прочее', ...Object.keys(A.s.budgets)] : ['Оплата от клиента', 'ФОТ', 'Аренда', 'Подрядчики', 'Реклама', 'Налоги', 'Сервисы и подписки'];
    A.modal(`<h2>Новая операция · ${tab === 'personal' ? 'личные' : 'компании'}</h2><form class="form" data-act="txAdd">
      <label class="f">Кошелёк<select name="walletId">${A.opts(ws.map((w) => [w.id, w.name]))}</select></label>
      <div class="f2"><label class="f">Тип<select name="type">${A.opts([['in', 'Поступление'], ['out', 'Расход'], ...(tab === 'company' ? [['expected', 'Ожидаемый платёж']] : [])])}</select></label><label class="f">Дата (для ожидаемого — срок)<input type="date" name="date" value="${A.today()}" required></label></div>
      <div class="f2"><label class="f">Сумма<input type="number" name="amount" min="0.01" step="0.01" required></label><label class="f">Валюта<select name="currency">${A.opts(A.CUR.map((c) => [c, c]), 'KZT')}</select></label></div>
      <label class="f">Категория<input name="category" list="cats" required><datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
      ${tab === 'company' ? `<label class="f">Проект<select name="projectId"><option value="">— без проекта —</option>${A.opts(A.s.projects.filter((p) => p.companyId).map((p) => [p.id, p.name]))}</select></label>` : ''}
      <label class="f">Заметка<input name="note"></label>
      <div class="row"><button class="btn pri">Добавить</button><button type="button" class="btn ghost" data-act="closeModal">Отмена</button></div></form>`);
    return false;
  };
  A.actions.txAdd = (form) => {
    const v = A.fd(form), w = A.byId(A.s.wallets, v.walletId);
    if (!w || !walletsFor(w.kind).some((x) => x.id === w.id)) return false;
    A.s.tx.push({ id: 't' + A.uid(), walletId: w.id, type: v.type, amount: +v.amount, currency: v.currency, date: v.date, category: v.category.trim(), projectId: v.projectId || null, note: (v.note || '').trim() });
    A.log('Финансы · ' + w.name, 'Операция: ' + v.category, v.amount + ' ' + v.currency); A.toast('Операция добавлена');
  };
  A.actions.transferForm = () => {
    const ws = A.s.wallets.map((w) => [w.id, w.name]);
    A.modal(`<h2>Перевод между контурами</h2><form class="form" data-act="transferAdd">
      <div class="f2"><label class="f">Откуда<select name="from">${A.opts(ws, 'w1')}</select></label><label class="f">Куда<select name="to">${A.opts(ws, 'w0')}</select></label></div>
      <label class="f">Вид<select name="kind">${A.opts(Object.entries(KIND))}</select></label>
      <div class="f2"><label class="f">Сумма<input type="number" name="amount" min="1" required></label><label class="f">Валюта<select name="currency">${A.opts(A.CUR.map((c) => [c, c]), 'KZT')}</select></label></div>
      <label class="f">Дата<input type="date" name="date" value="${A.today()}" required></label>
      <p class="note">Перевод появится расходом у отправителя и доходом у получателя.</p>
      <div class="row"><button class="btn pri">Перевести</button><button type="button" class="btn ghost" data-act="closeModal">Отмена</button></div></form>`);
    return false;
  };
  A.actions.transferAdd = (form) => {
    const v = A.fd(form); if (A.user().role !== 'owner') return false;
    if (v.from === v.to) { A.toast('Выберите разные кошельки'); return false; }
    A.s.transfers.push({ id: 'tr' + A.uid(), from: v.from, to: v.to, kind: v.kind, amount: +v.amount, currency: v.currency, date: v.date });
    A.log('Перевод', KIND[v.kind] + ': ' + A.walletName(v.from) + ' → ' + A.walletName(v.to), v.amount + ' ' + v.currency); A.toast('Перевод записан');
  };

  // импорт выписки CSV (F-3.14)
  const AUTO = [[/magnum|small|супермаркет|продукт|аптек/i, 'Семья'], [/азс|qazaq oil|helios|парковк|авто/i, 'Авто'], [/коммунал|алсеко|интернет|аренд/i, 'Дом'], [/школ|курс|обучен/i, 'Образование'], [/садака|благотвор|фонд/i, 'Благотворительность / садака'], [/авиа|air|отель|booking/i, 'Путешествия'], [/зарплат|оклад/i, 'Зарплата'], [/налог|кгд/i, 'Налоги'], [/реклам|facebook|google ads|meta/i, 'Реклама']];
  A.actions.csvForm = (el) => {
    const ws = walletsFor(el.dataset.tab);
    A.modal(`<h2>Импорт выписки CSV</h2><form class="form" data-act="csvImport">
      <label class="f">В какой кошелёк загрузить<select name="walletId">${A.opts(ws.map((w) => [w.id, w.name]))}</select></label>
      <label class="f">Файл выписки (Kaspi, Halyk)<input type="file" name="file" accept=".csv,text/csv" required></label>
      <p class="note">Нужны колонки с датой, суммой и описанием. Расходы — с минусом. Категории проставятся автоматически. Пример файла лежит в папке demo/.</p>
      <div class="row"><button class="btn pri">Загрузить</button><button type="button" class="btn ghost" data-act="closeModal">Отмена</button></div></form>`);
    return false;
  };
  A.actions.csvImport = (form) => {
    const file = form.file.files[0], wid = form.walletId.value, w = A.byId(A.s.wallets, wid);
    if (!file || !w || !walletsFor(w.kind).some((x) => x.id === wid)) return false;
    const rd = new FileReader();
    rd.onload = () => {
      const lines = String(rd.result).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
      const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
      const cells = (l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
      const head = cells(lines[0]).map((h) => h.toLowerCase());
      const iD = head.findIndex((h) => /дата|date/.test(h)), iA = head.findIndex((h) => /сумма|amount/.test(h)), iN = head.findIndex((h) => /опис|детал|назнач|descr|details/.test(h));
      if (iD < 0 || iA < 0) { A.toast('Не нашёл колонки «Дата» и «Сумма»'); return; }
      let ok = 0;
      lines.slice(1).forEach((l) => {
        const c = cells(l), raw = c[iD] || '', m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/), date = m ? `${m[3]}-${m[2]}-${m[1]}` : raw.slice(0, 10);
        const amt = parseFloat((c[iA] || '').replace(/\s/g, '').replace(',', '.')), note = iN >= 0 ? c[iN] || '' : '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !amt) return;
        const hit = AUTO.find(([re]) => re.test(note));
        A.s.tx.push({ id: 't' + A.uid(), walletId: wid, type: amt > 0 ? 'in' : 'out', amount: Math.abs(amt), currency: 'KZT', date, category: hit ? hit[1] : 'Прочее', projectId: null, note });
        ok++;
      });
      A.log('Финансы · ' + w.name, 'Импорт CSV', ok + ' операций'); A.save(); A.closeModal(); A.render(); A.toast(`Загружено операций: ${ok}`);
    };
    rd.readAsText(file);
    return false;
  };
})();
