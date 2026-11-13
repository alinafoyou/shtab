/* ШТАБ — Личное (F-4.x): фитнес, языки, питание, духовность, привычки и семья */
(function () {
  const A = App, esc = A.esc;
  const WT = { gym: ['🏋️', 'Зал'], run: ['🏃', 'Бег'], swim: ['🏊', 'Плавание'], martial_arts: ['🥋', 'Таеквондо / единоборства'], walk: ['🚶', 'Ходьба'], other: ['⚡', 'Другое'] };
  const INT = { low: 'Лёгкая', moderate: 'Умеренная', high: 'Интенсивная' };
  const last7 = () => { const t = A.today(); return [6, 5, 4, 3, 2, 1, 0].map((n) => A.addDays(t, -n)); };
  const wdShort = (d) => A.parse(d).toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2);

  // ВОЗ: ≥150 мин умеренной (интенсивная считается ×2) + ≥2 силовые в неделю
  A.who = () => {
    const from = A.weekStart(A.today()), w = A.s.workouts.filter((x) => x.date >= from);
    return { min: w.reduce((a, x) => a + (x.intensity === 'high' ? x.duration * 2 : x.intensity === 'moderate' ? x.duration : 0), 0), strength: w.filter((x) => x.type === 'gym' || x.type === 'martial_arts').length, count: w.length };
  };
  A.langStreak = (id) => A.streak(new Set(A.s.langLogs.filter((l) => l.goalId === id && l.minutes > 0).map((l) => l.date)));

  function schedule() { // вид для ассистента: только график
    const t = A.today(), days = [0, 1, 2, 3, 4, 5, 6].map((n) => A.addDays(t, n));
    return `<div class="stack"><p class="note">Вам виден только график: защищённые слоты, поверх которых нельзя ставить встречи. Детали (вес, прогресс, дневник питания) видит только владелец.</p>
      <div class="grid g2">${days.map((d) => `<div class="card"><h3>${A.parse(d).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>${A.timelineHtml(d, false)}</div>`).join('')}</div>
      ${A.s.settings.modules.nutrition ? `<div class="card"><h3>План питания на неделю</h3><div class="list">${[1, 2, 3, 4, 5, 6, 0].map((wd) => `<div class="li"><b style="width:34px">${['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][wd]}</b><span class="grow">${esc(A.s.mealPlan[wd] || '—')}</span></div>`).join('')}</div><p class="muted xs" style="margin-top:8px">По этому плану можно заказывать продукты.</p></div>` : ''}</div>`;
  }

  function fitness() {
    const s = A.s, w = A.who(), b = s.body[s.body.length - 1] || {};
    const ring = `<div class="card"><h3>Неделя по нормам ВОЗ</h3><div class="row">${A.ring(w.min / 150, w.min + '', 'из 150 мин')}<div class="grow"><p><b>${w.min}</b> мин умеренной активности <span class="muted">(интенсивная считается ×2)</span></p><p style="margin-top:6px">Силовые: <b class="${w.strength >= 2 ? 'c-g' : 'c-y'}">${w.strength} из 2</b></p><p class="muted sm" style="margin-top:6px">${w.min >= 150 && w.strength >= 2 ? 'Недельная норма выполнена 💪' : 'Осталось: ' + [w.min < 150 ? 150 - w.min + ' мин' : '', w.strength < 2 ? 2 - w.strength + ' силовая' : ''].filter(Boolean).join(' и ')}</p></div></div></div>`;
    const bodyCard = `<div class="card"><h3>Вес, шаги, сон</h3><div class="grid g3"><div><div class="muted sm">Вес</div><div class="mid">${b.weight || '—'} кг</div></div><div><div class="muted sm">Шаги</div><div class="mid">${b.steps ? b.steps.toLocaleString('ru-RU') : '—'}</div></div><div><div class="muted sm">Сон</div><div class="mid">${b.sleep || '—'} ч</div></div></div>
      <form class="form" data-act="bodyAdd" style="margin-top:12px"><div class="grid g3"><input type="number" step="0.1" name="weight" placeholder="Вес, кг" aria-label="Вес"><input type="number" name="steps" placeholder="Шаги" aria-label="Шаги"><input type="number" step="0.1" name="sleep" placeholder="Сон, ч" aria-label="Сон"></div><button class="btn" style="justify-self:start">Записать за сегодня</button></form><p class="muted xs" style="margin-top:6px">Apple Health / Google Fit — этап v2.</p></div>`;
    const form = `<div class="card"><h3>Записать тренировку</h3><form class="form" data-act="workoutAdd"><div class="f2"><label class="f">Тип<select name="type">${A.opts(Object.entries(WT).map(([k, v]) => [k, v[0] + ' ' + v[1]]))}</select></label><label class="f">Дата<input type="date" name="date" value="${A.today()}" max="${A.today()}" required></label></div><div class="f2"><label class="f">Длительность, мин<input type="number" name="duration" min="5" max="600" value="45" required></label><label class="f">Интенсивность<select name="intensity">${A.opts(Object.entries(INT), 'moderate')}</select></label></div><label class="f">Заметка<input name="note"></label><button class="btn pri" style="justify-self:start">Добавить</button></form></div>`;
    const list = `<div class="card"><h3>Журнал тренировок</h3><div class="list">${s.workouts.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((x) => `<div class="li"><span aria-hidden="true">${WT[x.type][0]}</span><div class="grow">${WT[x.type][1]}${x.note ? ' · ' + esc(x.note) : ''}<div class="muted xs">${A.fmtDate(x.date)} · ${INT[x.intensity].toLowerCase()}</div></div><b class="num">${x.duration} мин</b></div>`).join('')}</div></div>`;
    return `<div class="grid g2"><div class="stack">${ring}${form}</div><div class="stack">${bodyCard}${list}</div></div><p class="muted xs">Тренировки из расписания — защищённые слоты: ассистент видит их и не может поставить поверх встречу.</p>`;
  }

  function languages() {
    const s = A.s, t = A.today();
    const cards = s.langs.map((g) => {
      const logs = s.langLogs.filter((l) => l.goalId === g.id), today = logs.filter((l) => l.date === t).reduce((a, l) => a + l.minutes, 0), hours = g.hoursBase + logs.reduce((a, l) => a + l.minutes, 0) / 60;
      const week = last7().map((d) => ({ d, on: logs.some((l) => l.date === d && l.minutes > 0) }));
      return `<div class="card"><h3>${g.flag || '🌐'} ${esc(g.language)} <span class="chip">${esc(g.levelCurrent)} → ${esc(g.levelTarget)}</span></h3>
        <div class="row">${A.ring(today / g.dailyMinutes, today + '', 'из ' + g.dailyMinutes + ' мин')}<div class="grow"><p>🔥 Серия: <b>${A.langStreak(g.id)} дн.</b></p>${g.examDate ? `<p style="margin-top:4px">Экзамен: <b>${A.fmtDate(g.examDate, { day: 'numeric', month: 'long', year: 'numeric' })}</b> <span class="muted">· через ${A.diff(t, g.examDate)} дн.</span></p>` : ''}<div class="days" style="margin-top:8px">${week.map((x) => `<i class="${x.on ? 'on' : ''}">${wdShort(x.d)}</i>`).join('')}</div></div></div>
        <div style="margin:12px 0"><div class="row between sm"><span>Учебные часы</span><span class="num muted">${Math.round(hours)} из ${g.hoursTotal.toLocaleString('ru-RU')} ч</span></div>${A.progress(hours / g.hoursTotal)}${g.language === 'Японский' ? '<p class="muted xs" style="margin-top:4px">Ориентир FSI: ~2 200 часов для англоговорящих (категория IV).</p>' : ''}</div>
        <div class="note row between"><span>Сегодня к повторению: <b>${g.wordsDue} слов, ${g.kanjiDue} ${g.language === 'Японский' ? 'кандзи' : 'правил'}</b></span>${g.wordsDue + g.kanjiDue ? `<button type="button" class="btn s" data-act="srsDone" data-id="${g.id}">Повторил</button>` : '<span class="c-g">✓ готово</span>'}</div>
        <form class="row" data-act="langLog" data-id="${g.id}" style="margin-top:12px"><input type="number" name="minutes" min="1" max="600" value="${g.dailyMinutes}" aria-label="Минуты занятия" style="width:96px"><label class="chk"><input type="checkbox" name="lesson"> урок с преподавателем</label><button class="btn pri">Записать занятие</button></form></div>`;
    }).join('');
    const add = `<div class="card"><h3>Добавить язык</h3><form class="form" data-act="langAdd"><div class="f2"><label class="f">Язык<input name="language" placeholder="Казахский, английский…" required></label><label class="f">Норма в день, мин<input type="number" name="dailyMinutes" value="20" min="5" required></label></div><div class="f2"><label class="f">Текущий уровень<input name="levelCurrent" placeholder="A2" required></label><label class="f">Цель<input name="levelTarget" placeholder="B1" required></label></div><div class="f2"><label class="f">Дата экзамена<input type="date" name="examDate"></label><label class="f">Часов до цели<input type="number" name="hoursTotal" value="600" min="1" required></label></div><button class="btn" style="justify-self:start">Добавить</button></form><p class="muted xs" style="margin-top:8px">JLPT проводится в июле и декабре. Встроенный словарь — открытый вопрос PRD: сейчас счётчик повторений ведётся вручную.</p></div>`;
    return `<div class="grid g2"><div class="stack">${cards}</div>${add}</div>`;
  }

  function nutrition() {
    const s = A.s, t = A.today(), water = s.water[t] || 0, meals = s.meals.filter((m) => m.date === t).sort((a, b) => a.time.localeCompare(b.time)), now = A.nowHM(), open = now >= s.eatWindow.from && now <= s.eatWindow.to;
    const busy = A.dayEvents(t).filter((e) => e.kind === 'meeting').length >= 3;
    const waterCard = `<div class="card"><h3>Вода <span class="muted sm">${water} из 8 стаканов</span></h3><div class="row">${[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<button type="button" class="glass ${i <= water ? 'on' : ''}" data-act="waterSet" data-v="${i}" aria-label="${i} стаканов">💧</button>`).join('')}</div></div>`;
    const win = `<div class="card"><h3>Окно питания <span class="chip ${open ? 'g' : ''}">${open ? 'открыто' : 'закрыто'}</span></h3><form class="row" data-act="eatWindow"><input type="time" name="from" value="${s.eatWindow.from}" aria-label="Начало окна" style="width:130px"><span>—</span><input type="time" name="to" value="${s.eatWindow.to}" aria-label="Конец окна" style="width:130px"><button class="btn">Сохранить</button></form>${busy ? '<p class="note warn" style="margin-top:10px">Сегодня плотный день встреч: приёмы пищи стоят в ленте дня, не пропустите обед.</p>' : ''}</div>`;
    const diary = `<div class="card"><h3>Дневник еды · сегодня</h3><div class="list">${meals.map((m) => `<div class="li">${m.photo ? `<img class="thumb" src="${m.photo}" alt="Фото блюда">` : '<span aria-hidden="true">🍽</span>'}<div class="grow">${esc(m.note)}<div class="muted xs">${m.time}</div></div></div>`).join('') || '<p class="muted">Пока ничего не записано.</p>'}</div><form class="form" data-act="mealAdd" style="margin-top:12px"><input name="note" placeholder="Что съели" aria-label="Что съели" required><div class="row"><label class="btn s">📷 Фото<input type="file" name="photo" accept="image/*" hidden></label><button class="btn pri">Записать</button></div></form></div>`;
    const plan = `<div class="card"><h3>План питания на неделю</h3><form class="form" data-act="mealPlan">${[1, 2, 3, 4, 5, 6, 0].map((wd) => `<label class="row" style="flex-wrap:nowrap"><b style="width:30px">${['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][wd]}</b><input name="d${wd}" value="${esc(s.mealPlan[wd] || '')}" aria-label="План на день"></label>`).join('')}<button class="btn" style="justify-self:start">Сохранить план</button></form><p class="muted xs" style="margin-top:6px">Ассистент видит план и может заказать продукты.</p></div>`;
    return `<div class="grid g2"><div class="stack">${waterCard}${win}${diary}</div>${plan}</div>`;
  }

  function spirit() {
    const s = A.s, t = A.today();
    if (s.settings.spiritMode !== 'namaz') {
      const c = s.calm[t] || {};
      return `<div class="grid g2"><div class="card"><h3>Тишина · сегодня</h3>${[['meditation', '🧘 Медитация 10 минут'], ['breath', '🌬 Дыхание: 5 циклов 4-7-8'], ['gratitude', '🙏 Три благодарности']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-change="calmToggle" data-k="${k}" ${c[k] ? 'checked' : ''}>${l}</label>`).join('')}</div><div class="card"><p class="muted">Модуль «Тишина» — светская альтернатива. Переключить на намаз можно в настройках.</p></div></div>`;
    }
    const pt = A.prayerTimes(), log = s.prayerLogs[t] || {}, now = A.nowHM(), week = last7();
    const done = week.reduce((a, d) => a + A.PRAYERS.filter(([k]) => (s.prayerLogs[d] || {})[k]).length, 0);
    const today = `<div class="card"><h3>Намаз · ${esc(s.settings.city)} <span class="chip ${A.prayerLive() ? 'g' : ''}">${A.prayerLive() ? 'Aladhan' : 'приблизительно'}</span></h3><div class="list">${A.PRAYERS.map(([k, n]) => `<label class="li" style="cursor:pointer"><input type="checkbox" data-change="prayerToggle" data-k="${k}" ${log[k] ? 'checked' : ''}><b class="grow">${n}</b>${pt[k] > now && !log[k] ? '' : ''}<span class="num ${pt[k] <= now && !log[k] ? 'c-y' : 'muted'}">${pt[k]}</span><span class="chip" title="Слот защищён в календаре">🔒 ${s.settings.prayerSlot} мин</span></label>`).join('')}</div><p class="muted xs" style="margin-top:8px">Вокруг каждого намаза в календаре блокируется слот — ни ассистент, ни интеграции не поставят на него встречу. Метод расчёта и поправка ±минуты — в настройках.</p></div>`;
    const stat = `<div class="card"><h3>За 7 дней</h3><div class="row">${A.ring(done / 35, done + '', 'из 35')}<div class="grow"><table class="t"><tbody>${week.map((d) => `<tr><td class="muted">${wdShort(d)}, ${A.fmtDate(d)}</td><td><div class="days">${A.PRAYERS.map(([k, n]) => `<i class="${(s.prayerLogs[d] || {})[k] ? 'on' : ''}" title="${n}">${n[0]}</i>`).join('')}</div></td></tr>`).join('')}</tbody></table></div></div></div>`;
    const quran = `<div class="card"><h3>Чтение Корана</h3><div class="row between sm"><span>Страница <b>${s.quran.pages}</b> из 604 · джуз ${Math.min(30, Math.floor(s.quran.pages / 20.13) + 1)}</span><span class="muted">${Math.round((s.quran.pages / 604) * 100)}%</span></div>${A.progress(s.quran.pages / 604)}<div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="quranAdd" data-v="1">+1 страница</button><button type="button" class="btn" data-act="quranAdd" data-v="5">+5</button><button type="button" class="btn ghost" data-act="quranAdd" data-v="-1">−1</button></div></div>`;
    const dua = `<div class="card"><h3>Дуа дня</h3><p style="font-size:17px;line-height:1.6">«Господь наш! Даруй нам добро в этом мире и добро в мире вечном и защити нас от мучений огня».</p><p class="muted sm" style="margin-top:6px">Коран, 2:201 (смысловой перевод)</p></div>`;
    return `<div class="grid g2"><div class="stack">${today}${quran}</div><div class="stack">${stat}${dua}</div></div>`;
  }

  function habits() {
    const s = A.s, t = A.today(), week = last7(), ws = A.weekStart(t);
    const list = `<div class="card"><h3>Привычки</h3><div class="list">${s.habits.map((h) => {
      const set = new Set(s.habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date)), wk = [...set].filter((d) => d >= ws).length;
      return `<div class="li"><button type="button" class="btn icon ${set.has(t) ? 'pri' : ''}" data-act="habitToggle" data-id="${h.id}" aria-pressed="${set.has(t)}" aria-label="Отметить сегодня: ${esc(h.name)}">✓</button><div class="grow"><b>${esc(h.name)}</b><div class="muted xs">🔥 ${A.streak(set)} дн. подряд · на этой неделе ${wk} из ${h.target}</div></div><div class="days">${week.map((d) => `<i class="${set.has(d) ? 'on' : ''}">${wdShort(d)}</i>`).join('')}</div></div>`;
    }).join('')}</div><form class="row" data-act="habitAdd" style="margin-top:12px;flex-wrap:nowrap"><input name="name" placeholder="Новая привычка" aria-label="Новая привычка" required><input type="number" name="target" min="1" max="7" value="5" aria-label="Раз в неделю" style="width:76px"><button class="btn">Добавить</button></form></div>`;
    const fam = `<div class="card"><h3>Время семьи <span class="chip">🔒 защищено</span></h3><div class="list">${s.schedule.filter((x) => x.kind === 'family').map((x) => `<div class="li"><span aria-hidden="true">👨‍👩‍👧</span><span class="grow">${esc(x.title)} · ${x.days.length === 7 ? 'каждый день' : x.days.length + ' дн. в неделю'}</span><b class="num">${x.start}–${x.end}</b></div>`).join('')}</div><p class="muted xs" style="margin-top:8px">В это время встречи поставить нельзя.</p></div>`;
    const prom = `<div class="card"><h3>Обещания</h3><div class="list">${s.promises.slice().sort((a, b) => a.done - b.done || a.due.localeCompare(b.due)).map((p) => `<label class="li" style="cursor:pointer"><input type="checkbox" data-change="promiseToggle" data-id="${p.id}" ${p.done ? 'checked' : ''}><div class="grow" style="${p.done ? 'opacity:.5;text-decoration:line-through' : ''}">${esc(p.what)}<div class="muted xs">кому: ${esc(p.to)}</div></div><span class="xs ${!p.done && p.due < t ? 'c-r' : 'muted'}">до ${A.fmtDate(p.due)}</span></label>`).join('')}</div><form class="form" data-act="promiseAdd" style="margin-top:12px"><div class="f2"><input name="to" placeholder="Кому" aria-label="Кому" required><input type="date" name="due" value="${A.addDays(t, 3)}" aria-label="Срок" required></div><input name="what" placeholder="Что обещал" aria-label="Что обещал" required><button class="btn" style="justify-self:start">Добавить обещание</button></form></div>`;
    return `<div class="grid g2">${list}<div class="stack">${fam}${prom}</div></div>`;
  }

  A.views.personal = function (arg) {
    if (!A.can.personalDetails()) return schedule();
    const m = A.s.settings.modules, tabs = [];
    if (m.fitness) tabs.push(['fitness', '🏋️ Фитнес']); if (m.languages) tabs.push(['lang', '🇯🇵 Языки']); if (m.nutrition) tabs.push(['food', '🍽 Питание']);
    if (m.spirit) tabs.push(['spirit', A.s.settings.spiritMode === 'namaz' ? '🕌 Духовность' : '🧘 Тишина']); tabs.push(['habits', '✓ Привычки и семья']);
    const tab = tabs.some((x) => x[0] === arg) ? arg : tabs[0][0];
    const body = { fitness, lang: languages, food: nutrition, spirit, habits }[tab]();
    return `<div class="stack">${A.tabs(tabs, tab, 'personal')}${body}</div>`;
  };

  // ----- действия -----
  A.actions.workoutAdd = (form) => { const v = A.fd(form); A.s.workouts.push({ id: 'wo' + A.uid(), date: v.date, type: v.type, duration: +v.duration, intensity: v.intensity, note: (v.note || '').trim() }); A.toast('Тренировка записана'); A.buzz(); };
  A.actions.bodyAdd = (form) => { const v = A.fd(form), t = A.today(), prev = A.s.body[A.s.body.length - 1] || {}; if (!v.weight && !v.steps && !v.sleep) return false; A.s.body = A.s.body.filter((b) => b.date !== t); A.s.body.push({ date: t, weight: +v.weight || prev.weight, steps: +v.steps || prev.steps, sleep: +v.sleep || prev.sleep }); A.toast('Записано'); };
  A.actions.langLog = (form) => { const g = A.byId(A.s.langs, form.dataset.id), min = +form.minutes.value; if (!g || !(min > 0)) return false; A.s.langLogs.push({ goalId: g.id, date: A.today(), minutes: min, cards: 0, lesson: form.lesson.checked }); A.toast('Занятие записано'); A.buzz(); };
  A.actions.srsDone = (el) => { const g = A.byId(A.s.langs, el.dataset.id); if (!g) return false; A.s.langLogs.push({ goalId: g.id, date: A.today(), minutes: 0, cards: g.wordsDue + g.kanjiDue, lesson: false }); g.wordsDue = 0; g.kanjiDue = 0; A.buzz(); };
  A.actions.langAdd = (form) => { const v = A.fd(form); A.s.langs.push({ id: 'l' + A.uid(), language: v.language.trim(), flag: '🌐', levelCurrent: v.levelCurrent.trim(), levelTarget: v.levelTarget.trim(), examDate: v.examDate || '', dailyMinutes: +v.dailyMinutes, hoursBase: 0, hoursTotal: +v.hoursTotal, wordsDue: 20, kanjiDue: 0 }); A.toast('Язык добавлен'); };
  A.actions.waterSet = (el) => { const t = A.today(), v = +el.dataset.v; A.s.water[t] = A.s.water[t] === v ? v - 1 : v; A.buzz(); };
  A.actions.eatWindow = (form) => { A.s.eatWindow = { from: form.from.value, to: form.to.value }; A.toast('Окно питания сохранено'); };
  A.actions.mealPlan = (form) => { const v = A.fd(form); [0, 1, 2, 3, 4, 5, 6].forEach((wd) => { A.s.mealPlan[wd] = (v['d' + wd] || '').trim(); }); A.toast('План сохранён'); };
  A.actions.mealAdd = (form) => {
    const note = form.note.value.trim(), file = form.photo.files[0];
    const push = (photo) => { A.s.meals.push({ id: 'm' + A.uid(), date: A.today(), time: A.nowHM(), note, photo }); A.save(); A.render(); A.toast('Записано'); };
    if (!file) { push(''); return false; }
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'), k = 160 / Math.max(img.width, img.height); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); push(c.toDataURL('image/jpeg', 0.7)); URL.revokeObjectURL(img.src); };
    img.onerror = () => push('');
    img.src = URL.createObjectURL(file);
    return false;
  };
  A.actions.prayerToggle = (el) => { const t = A.today(); (A.s.prayerLogs[t] = A.s.prayerLogs[t] || {})[el.dataset.k] = el.checked; if (el.checked) A.buzz(); };
  A.actions.calmToggle = (el) => { const t = A.today(); (A.s.calm[t] = A.s.calm[t] || {})[el.dataset.k] = el.checked; };
  A.actions.quranAdd = (el) => { A.s.quran.pages = Math.max(0, Math.min(604, A.s.quran.pages + +el.dataset.v)); };
  A.actions.habitToggle = (el) => { const t = A.today(), id = el.dataset.id, i = A.s.habitLogs.findIndex((l) => l.habitId === id && l.date === t); if (i >= 0) A.s.habitLogs.splice(i, 1); else { A.s.habitLogs.push({ habitId: id, date: t }); A.buzz(); } };
  A.actions.habitAdd = (form) => { const v = A.fd(form); A.s.habits.push({ id: 'h' + A.uid(), name: v.name.trim(), target: +v.target || 5 }); };
  A.actions.promiseToggle = (el) => { const p = A.byId(A.s.promises, el.dataset.id); if (p) p.done = el.checked; };
  A.actions.promiseAdd = (form) => { const v = A.fd(form); A.s.promises.push({ id: 'pr' + A.uid(), to: v.to.trim(), what: v.what.trim(), due: v.due, done: false }); };
})();
