/* ШТАБ — ядро: состояние, права, даты, деньги, UI-помощники */
(function () {
  const KEY = 'shtab.v1';
  const A = (window.App = { actions: {}, views: {}, ui: {}, s: null });
  const pad = (n) => String(n).padStart(2, '0');

  // ---------- даты ----------
  A.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  A.parse = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  A.today = () => A.iso(new Date());
  A.addDays = (s, n) => { const d = A.parse(s); d.setDate(d.getDate() + n); return A.iso(d); };
  A.diff = (a, b) => Math.round((A.parse(b) - A.parse(a)) / 864e5);
  A.fmtDate = (s, o) => A.parse(s).toLocaleDateString('ru-RU', o || { day: 'numeric', month: 'short' });
  A.nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  A.min = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  A.hm = (m) => pad(Math.floor((((m % 1440) + 1440) % 1440) / 60)) + ':' + pad(((m % 60) + 60) % 60);
  A.monthKey = (off) => { const d = new Date(); return A.iso(new Date(d.getFullYear(), d.getMonth() - (off || 0), 1)).slice(0, 7); };
  A.weekStart = (s) => { const d = A.parse(s); const wd = (d.getDay() + 6) % 7; return A.addDays(s, -wd); };

  // ---------- утилиты ----------
  A.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  A.uid = () => Math.random().toString(36).slice(2, 9);
  A.byId = (list, id) => list.find((x) => x.id === id);
  A.fd = (form) => Object.fromEntries(new FormData(form).entries());
  A.go = (hash) => { if (location.hash === hash) A.render(); else location.hash = hash; };

  // ---------- хранение: данные аккаунта на сервере + копия на устройстве ----------
  A.account = null;
  A.lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  A.lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* нет места или хранилище запрещено */ } };
  A.lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  A.lsDel(KEY); // старое демо-хранилище без аккаунтов
  const cacheKey = () => 'shtab.cache.' + (A.account ? A.account.id : '');
  A.api = async (method, path, body) => {
    const r = await fetch('/api/' + path, { method, credentials: 'same-origin', headers: Object.assign({ 'X-Shtab': '1' }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok) { const err = new Error((j && j.error) || 'Ошибка сервера (' + r.status + ')'); err.status = r.status; throw err; }
    return j;
  };
  let ver = 0, pushedVer = 0, timer = null, inflight = null;
  A.syncState = 'ok';
  const setSync = (st) => { if (st === 'offline' && A.syncState !== 'offline') A.toast('Нет связи с сервером. Изменения сохранены на устройстве и отправятся позже.'); A.syncState = st; };
  async function push() {
    if (!A.account || !A.s || ver === pushedVer) return;
    if (inflight) { await inflight; return push(); }
    const v = ver;
    inflight = A.api('PUT', 'state', { data: A.s }).then(() => {
      pushedVer = v; if (ver === v) A.lsSet(cacheKey(), { data: A.s, dirty: false }); setSync('ok');
    }).catch((e) => {
      if (e.status === 401) { A.account = null; A.s = null; A.render(); A.toast('Сессия закончилась — войдите снова. Несохранённые изменения остались на устройстве.'); return; }
      setSync('offline'); clearTimeout(timer); timer = setTimeout(push, 15000);
    }).finally(() => { inflight = null; });
    return inflight;
  }
  A.save = () => { if (!A.s || !A.account) return; ver++; A.lsSet(cacheKey(), { data: A.s, dirty: true }); clearTimeout(timer); timer = setTimeout(push, 700); };
  A.flush = async () => { clearTimeout(timer); await push(); return ver === pushedVer; };
  window.addEventListener('pagehide', () => { if (A.account && A.s && ver !== pushedVer) { try { fetch('/api/state', { method: 'PUT', keepalive: true, credentials: 'same-origin', headers: { 'X-Shtab': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ data: A.s }) }); } catch (e) { /* останется в копии на устройстве */ } } });
  A.fresh = () => { const s = A.seed(), o = s.users.find((u) => u.role === 'owner'); o.name = A.account.name; o.email = A.account.email; s.session.userId = o.id; return s; };
  A.loadState = async () => {
    const cache = A.lsGet(cacheKey()), valid = (d) => d && d.v === 1 && Array.isArray(d.users);
    ver = pushedVer = 0;
    if (cache && cache.dirty && valid(cache.data)) { A.s = cache.data; ver = 1; push(); } // есть неотправленные изменения с этого устройства
    else {
      try { const r = await A.api('GET', 'state'); A.s = valid(r.data) ? r.data : null; }
      catch (e) { if (e.status || !cache || !valid(cache.data)) throw e; A.s = cache.data; setSync('offline'); }
      if (!A.s) { A.s = A.fresh(); A.save(); } else A.lsSet(cacheKey(), { data: A.s, dirty: false });
    }
    const o = A.s.users.find((u) => u.role === 'owner'); A.s.session.userId = o.id;
  };
  A.forget = () => { A.lsDel(cacheKey()); A.lsDel('shtab.last'); ver = pushedVer = 0; };
  A.reset = () => { A.s = A.fresh(); A.save(); };

  // ---------- пользователь и права (PRD §5) ----------
  A.user = () => A.s.users.find((u) => u.id === A.s.session.userId) || null;
  A.owner = () => A.s.users.find((u) => u.role === 'owner');
  A.employees = () => A.s.users.filter((u) => u.role === 'employee');
  A.userName = (id) => { const u = A.byId(A.s.users, id); return u ? u.name : '—'; };
  A.short = (id) => A.userName(id).split(' ')[0];
  A.avatar = (u) => `<span class="av" aria-hidden="true">${A.esc((u.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join(''))}</span>`;
  const role = () => (A.user() || {}).role;
  const perms = () => (A.user() || {}).perms || {};
  A.can = {
    pulse: () => role() !== 'employee',
    pulseFinance: () => role() === 'owner' || (role() === 'assistant' && !!perms().pulseFinance),
    allProjects: () => role() !== 'employee',
    companyFin: (cid) => A.s.settings.modules.companyFinance && (role() === 'owner' || (role() === 'assistant' && !!(perms().companies || {})[cid])),
    anyCompanyFin: () => A.s.companies.some((c) => A.can.companyFin(c.id)),
    personalFin: () => A.s.settings.modules.personalFinance && (role() === 'owner' || (role() === 'assistant' && !!perms().personalFinance)),
    personalSchedule: () => role() !== 'employee',
    personalDetails: () => role() === 'owner',
    journal: () => role() === 'owner' && A.s.settings.modules.journal,
    teamAll: () => role() !== 'employee',
    timesheet: () => role() === 'owner' || (role() === 'assistant' && !!perms().timesheet),
    access: () => role() === 'owner' || (role() === 'assistant' && !!perms().invite),
    settings: () => role() === 'owner',
  };
  A.log = (entity, action, diff) => {
    const u = A.user(); if (!u) return;
    u.lastActive = A.today();
    A.s.audit.unshift({ at: new Date().toISOString(), userId: u.id, entity, action, diff: diff || '' });
    if (A.s.audit.length > 200) A.s.audit.length = 200;
  };

  // ---------- деньги ----------
  const SYM = { KZT: '₸', USD: '$', AED: 'AED', RUB: '₽' };
  A.CUR = Object.keys(SYM);
  A.kzt = (a, cur) => a * (A.s.settings.rates[cur || 'KZT'] || 1);
  A.money = (a, cur, compact) => {
    if (A.s.settings.hideAmounts) return '••••';
    const v = Math.round(a);
    const str = compact && Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн' : v.toLocaleString('ru-RU');
    return str + ' ' + SYM[cur || 'KZT'];
  };
  A.shortNum = (v) => (A.s.settings.hideAmounts ? '' : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + 'м' : Math.round(v / 1e3) + 'т');
  A.flow = (wids, mk, from, to) => {
    let inc = 0, out = 0;
    const ok = (d) => (!mk || d.slice(0, 7) === mk) && (!from || d >= from) && (!to || d <= to);
    A.s.tx.forEach((x) => { if (!wids.includes(x.walletId) || !ok(x.date)) return; const v = A.kzt(x.amount, x.currency); if (x.type === 'in') inc += v; else if (x.type === 'out') out += v; });
    A.s.transfers.forEach((x) => { if (!ok(x.date)) return; const v = A.kzt(x.amount, x.currency); if (wids.includes(x.to)) inc += v; if (wids.includes(x.from)) out += v; });
    return { inc, out };
  };
  A.balance = (wid) => { const f = A.flow([wid]); return A.byId(A.s.wallets, wid).opening + f.inc - f.out; };
  A.expected = (wids) => A.s.tx.filter((x) => x.type === 'expected' && wids.includes(x.walletId)).sort((a, b) => a.date.localeCompare(b.date));
  A.walletName = (wid) => { const w = A.byId(A.s.wallets, wid); return w ? w.name : '—'; };

  // ---------- проекты ----------
  A.STAGES = ['Идея', 'Переговоры', 'В работе', 'Сдача', 'Закрыт'];
  A.SNAME = { g: 'По плану', y: 'Риск', r: 'Горит' };
  A.dot = (st) => `<span class="dot ${st}" title="${A.SNAME[st]}"></span>`;
  // авто-правило F-2.7: 7 дней без обновления → жёлтый, 14 → красный
  A.pStatus = (p) => {
    if (p.stage === 'Закрыт') return p.status;
    const n = A.diff(p.updatedAt, A.today());
    if (n >= 14) return 'r';
    if (n >= 7 && p.status === 'g') return 'y';
    return p.status;
  };
  A.isMember = (p, uid) => p.ownerId === uid || p.members.includes(uid);
  A.visibleProjects = () => { const u = A.user(); return A.can.allProjects() ? A.s.projects : A.s.projects.filter((p) => A.isMember(p, u.id)); };
  A.canEditProject = (p) => { const u = A.user(); return u.role === 'owner' || A.isMember(p, u.id); };
  A.canTasks = (p) => A.user().role !== 'employee' || A.isMember(p, A.user().id);
  A.canSeeBudget = (p) => { const u = A.user(); return u.role === 'owner' || (u.role === 'employee' && A.isMember(p, u.id)) || (u.role === 'assistant' && p.companyId && A.can.companyFin(p.companyId)); };
  A.touchProject = (p, text) => { p.updatedAt = A.today(); p.history.unshift({ at: new Date().toISOString(), userId: A.user().id, text }); A.log('Проект «' + p.name + '»', text); };
  A.setStage = (pid, stage) => {
    const p = A.byId(A.s.projects, pid);
    if (!p || !A.canEditProject(p) || p.stage === stage) return;
    p.stage = stage; A.touchProject(p, 'Этап → ' + stage);
    if (stage === 'Закрыт') { p.status = 'g'; A.confetti(); }
    A.save(); A.render();
  };
  A.projectMoney = (p) => {
    let paid = 0, exp = 0;
    A.s.tx.forEach((x) => { if (x.projectId !== p.id) return; const v = A.kzt(x.amount, x.currency); if (x.type === 'in') paid += v; else if (x.type === 'expected') exp += v; });
    return { paid, exp };
  };
  A.load2 = (uid) => { // нагрузка сотрудника F-7.8
    const t = A.today(), open = A.s.tasks.filter((x) => x.assigneeId === uid && !x.done);
    const overdue = open.filter((x) => x.due < t).length;
    return { open: open.length, overdue, hot: overdue > 3 || open.length > 15 };
  };

  // ---------- команда: статусы ----------
  A.ST = {
    office: ['🟢', 'В офисе'], remote: ['🏠', 'Удалённо'], field: ['🚗', 'На выезде'], trip: ['✈️', 'Командировка'],
    vacation: ['🏖', 'Отпуск'], sick: ['🤒', 'Больничный'], training: ['📚', 'Обучение'], day_off: ['🌿', 'Отгул'],
    no_checkin: ['⚪', 'Не отметился'], absent: ['🔴', 'Отсутствует'], off: ['💤', 'Выходной'],
  };
  A.WORKING = ['office', 'remote', 'field', 'trip', 'training'];
  A.holiday = (date) => A.s.holidays.find((h) => h.md === date.slice(5));
  A.isWorkday = (date) => A.s.settings.workDays.includes(A.parse(date).getDay()) && !A.holiday(date);
  A.absenceOn = (uid, date, withPending) => A.s.absences.find((a) => a.userId === uid && a.from <= date && date <= a.to && (a.status === 'approved' || (withPending && a.status === 'pending')));
  A.attOn = (uid, date) => A.s.attendance.find((a) => a.userId === uid && a.date === date);
  A.statusOf = (uid, date) => {
    const ab = A.absenceOn(uid, date); if (ab) return ab.type;
    const at = A.attOn(uid, date); if (at) return at.status;
    if (!A.isWorkday(date)) return 'off';
    const t = A.today();
    if (date < t) return 'absent';
    if (date > t) return null;
    return A.nowHM() >= A.s.settings.checkinAbsent ? 'absent' : 'no_checkin'; // F-7.4
  };
  A.stBadge = (st) => { const m = A.ST[st] || ['', '—']; return `<span class="chip">${m[0]} ${m[1]}</span>`; };
  A.leaveDays = (from, to) => { let n = 0; for (let d = from; d <= to; d = A.addDays(d, 1)) if (!A.holiday(d)) n++; return n; };

  // ---------- лента дня и намаз ----------
  A.PRAYERS = [['fajr', 'Фаджр'], ['dhuhr', 'Зухр'], ['asr', 'Аср'], ['maghrib', 'Магриб'], ['isha', 'Иша']];
  A.CITIES = { 'Алматы': [43.24, 76.89], 'Астана': [51.17, 71.43], 'Шымкент': [42.32, 69.59], 'Дубай': [25.2, 55.27] };
  const FALLBACK = { fajr: '06:05', dhuhr: '12:38', asr: '15:27', maghrib: '17:32', isha: '18:58' };
  A.prayerTimes = () => {
    const c = A.s.cache.prayer, st = A.s.settings;
    const base = c && c.date === A.today() && c.city === st.city && c.method === st.prayerMethod ? c.times : FALLBACK;
    const out = {}; A.PRAYERS.forEach(([k]) => { out[k] = A.hm(A.min(base[k]) + (+st.prayerAdjust || 0)); });
    return out;
  };
  A.prayerLive = () => { const c = A.s.cache.prayer, st = A.s.settings; return !!(c && c.date === A.today() && c.city === st.city && c.method === st.prayerMethod); };
  A.KIND = { meeting: '📅', workout: '🏋️', language: '🇯🇵', meal: '🍽', family: '👨‍👩‍👧', prayer: '🕌' };
  A.dayEvents = (date) => {
    const s = A.s, m = s.settings.modules, wd = A.parse(date).getDay(), ev = [];
    const on = (k) => (k === 'workout' ? m.fitness : k === 'language' ? m.languages : k === 'meal' ? m.nutrition : true);
    s.schedule.forEach((x) => { if (x.days.includes(wd) && on(x.kind)) ev.push(Object.assign({}, x, { protected: x.kind !== 'meal' })); });
    s.events.filter((x) => x.date === date).forEach((x) => ev.push(Object.assign({}, x, { kind: 'meeting' })));
    if (m.spirit && s.settings.spiritMode === 'namaz') {
      const pt = A.prayerTimes();
      A.PRAYERS.forEach(([k, n]) => ev.push({ id: 'pr_' + k, start: pt[k], end: A.hm(A.min(pt[k]) + (+s.settings.prayerSlot || 20)), title: 'Намаз · ' + n, kind: 'prayer', protected: true }));
    }
    return ev.sort((a, b) => a.start.localeCompare(b.start));
  };
  // F-4.3 / F-4.16 / F-4.20: встречу нельзя поставить поверх защищённого слота
  A.conflict = (date, start, end) => A.dayEvents(date).find((e) => e.protected && e.kind !== 'meeting' && A.min(start) < A.min(e.end) && A.min(e.start) < A.min(end));

  // ---------- UI ----------
  A.modal = (html) => { const m = document.getElementById('modal'); m.innerHTML = `<div class="modal-back" data-act="closeModal"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; m.hidden = false; const f = m.querySelector('input,select,textarea,button'); if (f) f.focus(); };
  A.closeModal = () => { const m = document.getElementById('modal'); m.hidden = true; m.innerHTML = ''; };
  A.actions.closeModal = (el, e) => { if (el.classList.contains('modal-back') && e.target !== el) return false; A.closeModal(); return false; };
  let toastT;
  A.toast = (msg) => { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); };
  A.buzz = () => { if (navigator.vibrate) navigator.vibrate(15); };
  A.confetti = () => {
    const colors = ['#C9A227', '#2EBD85', '#5B8DEF', '#E5484D', '#F0B429'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % 5]; c.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
    }
  };
  A.progress = (pct, cls) => `<div class="bar" role="progressbar" aria-valuenow="${Math.round(pct * 100)}" aria-valuemin="0" aria-valuemax="100"><i class="${cls || ''}" style="width:${Math.max(0, Math.min(100, pct * 100))}%"></i></div>`;
  A.seg = (items, cur, act) => `<div class="seg" role="tablist">${items.map(([v, l]) => `<button type="button" role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
  A.tabs = (items, cur, base) => `<div class="seg" role="tablist">${items.map(([v, l]) => `<a role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" href="#/${base}/${v}">${l}</a>`).join('')}</div>`;
  A.opts = (pairs, cur) => pairs.map(([v, l]) => `<option value="${A.esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${A.esc(l)}</option>`).join('');

  // ---------- графики (SVG) ----------
  A.ring = (pct, big, small) => {
    const r = 52, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
    return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${A.esc(big + ' ' + small)}"><circle cx="60" cy="60" r="${r}" class="ring-bg"/>${p > 0 ? `<circle cx="60" cy="60" r="${r}" class="ring-fg" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 60 60)"/>` : ''}<text x="60" y="60" text-anchor="middle" class="ring-big">${A.esc(big)}</text><text x="60" y="77" text-anchor="middle" class="ring-small">${A.esc(small)}</text></svg>`;
  };
  A.bars = (rows, aName, bName) => {
    const max = Math.max(1, ...rows.map((r) => Math.max(r.a, r.b))), W = 320, gap = 300 / rows.length, bw = Math.min(30, gap / 2 - 8);
    let g = '';
    rows.forEach((r, i) => {
      const x = 10 + i * gap + gap / 2, ha = (r.a / max) * 100, hb = (r.b / max) * 100;
      g += `<rect x="${x - bw - 2}" y="${125 - ha}" width="${bw}" height="${ha}" rx="4" class="bar-a"><title>${aName}: ${A.money(r.a)}</title></rect>`
        + `<rect x="${x + 2}" y="${125 - hb}" width="${bw}" height="${hb}" rx="4" class="bar-b"><title>${bName}: ${A.money(r.b)}</title></rect>`
        + `<text x="${x - bw / 2 - 2}" y="${120 - ha}" text-anchor="middle" class="val">${A.shortNum(r.a)}</text><text x="${x + bw / 2 + 2}" y="${120 - hb}" text-anchor="middle" class="val">${A.shortNum(r.b)}</text>`
        + `<text x="${x}" y="142" text-anchor="middle" class="ax">${A.esc(r.label)}</text>`;
    });
    return `<svg viewBox="0 0 ${W} 150" class="chart" role="img" aria-label="${aName} и ${bName} по месяцам"><line x1="10" x2="310" y1="125.5" y2="125.5" class="axl"/>${g}</svg><div class="legend"><span><i class="sw a"></i>${aName}</span><span><i class="sw b"></i>${bName}</span></div>`;
  };
  A.donut = (parts) => {
    const colors = ['var(--gold)', 'var(--blue)', 'var(--g)', 'var(--violet)'], total = parts.reduce((s, p) => s + p.value, 0) || 1, r = 42, c = 2 * Math.PI * r;
    let off = 0, g = '', lg = '';
    parts.forEach((p, i) => {
      const len = (p.value / total) * c;
      g += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${colors[i % 4]}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"><title>${A.esc(p.label)}</title></circle>`;
      lg += `<span><i class="sw" style="background:${colors[i % 4]}"></i>${A.esc(p.label)} — ${Math.round((p.value / total) * 100)}%</span>`;
      off += len;
    });
    return `<div class="row"><svg viewBox="0 0 120 120" class="ring" role="img" aria-label="Доли">${g}</svg><div class="legend" style="flex-direction:column;gap:6px">${lg}</div></div>`;
  };
  A.line = (series, lo, hi) => { // series: [{cls, pts:[{label,v}]}]
    const n = Math.max(...series.map((s) => s.pts.length)), W = 320, X = (i) => 14 + (i * (W - 28)) / Math.max(1, n - 1), Y = (v) => 108 - ((v - lo) / (hi - lo || 1)) * 92;
    const paths = series.map((s) => `<polyline class="${s.cls}" points="${s.pts.map((p, i) => X(i) + ',' + Y(p.v)).join(' ')}"/>`).join('');
    const pts = series[0].pts, lab = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i && pts[v]).map((i) => `<text x="${X(i)}" y="126" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}" class="ax">${A.esc(pts[i].label)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} 130" class="chart" role="img" aria-label="Динамика"><line x1="14" x2="306" y1="108.5" y2="108.5" class="axl"/><line x1="14" x2="306" y1="16.5" y2="16.5" class="axl" stroke-dasharray="2 4"/>${paths}${lab}</svg>`;
  };
  A.streak = (dates) => { // dates: Set ISO; серия до сегодня (или до вчера, если сегодня ещё не отмечено)
    let d = A.today(), n = 0; if (!dates.has(d)) d = A.addDays(d, -1);
    while (dates.has(d)) { n++; d = A.addDays(d, -1); }
    return n;
  };
})();
