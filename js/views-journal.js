/* ШТАБ — Дневник руководителя (F-5.x) и «Спроси Штаб» (F-6.x, демо без LLM) */
(function () {
  const A = App, esc = A.esc;
  const MOOD = ['', '😞', '😕', '😐', '🙂', '😄'];
  const WD = ['воскресеньям', 'понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам'];

  A.weekReview = () => {
    const s = A.s, t = A.today(), from = A.addDays(t, -6), inW = (d) => d >= from && d <= t;
    const act = s.projects.filter((p) => p.stage !== 'Закрыт'), c = { g: 0, y: 0, r: 0 }; act.forEach((p) => c[A.pStatus(p)]++);
    const cw = s.wallets.filter((w) => w.kind === 'company').map((w) => w.id), cf = A.flow(cw, null, from, t), pf = A.flow(['w0'], null, from, t);
    const wo = s.workouts.filter((w) => inW(w.date)), lang = s.langLogs.filter((l) => inW(l.date)).reduce((a, l) => a + l.minutes, 0);
    const hab = s.habits.map((h) => Math.min(1, s.habitLogs.filter((l) => l.habitId === h.id && inW(l.date)).length / h.target)), habPct = hab.length ? Math.round((hab.reduce((a, b) => a + b, 0) / hab.length) * 100) : 0;
    let pr = 0; for (let d = from; d <= t; d = A.addDays(d, 1)) pr += A.PRAYERS.filter(([k]) => (s.prayerLogs[d] || {})[k]).length;
    // паттерн: день недели с заметно более низкой энергией
    const ev = s.journal.filter((j) => j.type === 'evening' && j.energy), by = {}; ev.forEach((j) => { const wd = A.parse(j.date).getDay(); (by[wd] = by[wd] || []).push(j.energy); });
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length, all = ev.length ? avg(ev.map((j) => j.energy)) : 0;
    let pattern = '';
    Object.keys(by).forEach((wd) => { const a = avg(by[wd]); if (by[wd].length >= 2 && all - a >= 1.5) pattern = `По ${WD[wd]} энергия ниже: ${a.toFixed(1).replace('.', ',')} против ${all.toFixed(1).replace('.', ',')} в среднем. Не ставьте на этот день важные встречи после 16:00.`; });
    return { from, t, c, upd: act.filter((p) => inW(p.updatedAt)).length, act: act.length, cf, pf, wo, lang, habPct, pr, pattern };
  };

  A.views.journal = function () {
    const s = A.s, t = A.today(), ev = s.journal.find((j) => j.date === t && j.type === 'evening') || {}, top = s.top3[t] || [];
    const morning = `<div class="card"><h3>☀️ Утренний настрой <span class="muted sm">1 минута</span></h3><form class="form" data-act="morningSave"><label class="f">Цель дня<input name="goal" value="${esc(s.morning[t] || '')}" placeholder="Каким должен быть этот день?"></label>${[0, 1, 2].map((i) => `<label class="f">Top-${i + 1}<input name="t${i}" value="${esc((top[i] || {}).text || '')}"></label>`).join('')}<button class="btn pri" style="justify-self:start">Сохранить настрой</button></form></div>`;
    const range = (name, lbl, val) => `<label class="f">${lbl}: <output>${val}</output><input type="range" name="${name}" min="1" max="10" value="${val}" oninput="this.previousElementSibling.textContent=this.value"></label>`;
    const evening = `<div class="card"><h3>🌙 Вечерняя рефлексия <span class="muted sm">3 минуты</span></h3><form class="form" data-act="eveningSave"><label class="f">Что получилось<textarea name="wins">${esc(ev.wins || '')}</textarea></label><label class="f">Что не получилось<textarea name="fails">${esc(ev.fails || '')}</textarea></label><label class="f">Главный урок<input name="lesson" value="${esc(ev.lesson || '')}"></label><label class="f">Благодарность<input name="gratitude" value="${esc(ev.gratitude || '')}"></label>
      <div class="f2">${range('score', 'Оценка дня', ev.score || 7)}${range('energy', 'Энергия', ev.energy || 7)}</div>
      <fieldset style="border:0;padding:0;margin:0"><legend class="muted sm" style="font-weight:600;margin-bottom:5px">Настроение</legend><div class="row">${[1, 2, 3, 4, 5].map((m) => `<label class="chip" style="cursor:pointer;min-height:44px;font-size:20px"><input type="radio" name="mood" value="${m}" ${(ev.mood || 4) === m ? 'checked' : ''} style="width:16px;height:16px">${MOOD[m]}</label>`).join('')}</div></fieldset>
      <button class="btn pri" style="justify-self:start">Сохранить рефлексию</button></form></div>`;
    const month = s.journal.filter((j) => j.type === 'evening' && j.date >= A.addDays(t, -30)).sort((a, b) => a.date.localeCompare(b.date));
    const chart = `<div class="card"><h3>Оценка дня и энергия за месяц</h3>${month.length > 1 ? A.line([{ cls: 'ln', pts: month.map((j) => ({ label: A.fmtDate(j.date), v: j.score })) }, { cls: 'ln2', pts: month.map((j) => ({ label: A.fmtDate(j.date), v: j.energy })) }], 1, 10) + '<div class="legend"><span><i class="sw gold"></i>Оценка дня</span><span><i class="sw blue"></i>Энергия</span><span>шкала 1–10</span></div>' : '<p class="muted">Нужно хотя бы две записи.</p>'}</div>`;
    const r = A.weekReview(), m = s.settings.modules;
    const li = (ico, l, v) => `<div class="li"><span aria-hidden="true">${ico}</span><span class="grow">${l}</span><b class="num" style="text-align:right">${v}</b></div>`;
    const review = `<div class="card"><h3>Недельный обзор <span class="muted sm">${A.fmtDate(r.from)} – ${A.fmtDate(r.t)}</span></h3><div class="list">
      ${li('📁', 'Проекты', `🟢 ${r.c.g} · 🟡 ${r.c.y} · 🔴 ${r.c.r} · обновлено ${r.upd} из ${r.act}`)}
      ${m.companyFinance ? li('💼', 'Деньги компаний', `+${A.money(r.cf.inc, 'KZT', 1)} / −${A.money(r.cf.out, 'KZT', 1)}`) : ''}
      ${m.personalFinance ? li('👤', 'Личные деньги', `+${A.money(r.pf.inc, 'KZT', 1)} / −${A.money(r.pf.out, 'KZT', 1)}`) : ''}
      ${m.fitness ? li('🏋️', 'Спорт', `${r.wo.length} трен. · ${r.wo.reduce((a, w) => a + w.duration, 0)} мин`) : ''}
      ${m.languages ? li('🇯🇵', 'Языки', `${r.lang} мин · серия ${s.langs[0] ? A.langStreak(s.langs[0].id) : 0} дн.`) : ''}
      ${li('✓', 'Привычки', r.habPct + '% плана')}
      ${m.spirit && s.settings.spiritMode === 'namaz' ? li('🕌', 'Намазы', `${r.pr} из 35`) : ''}</div>
      ${r.pattern ? `<p class="note warn" style="margin-top:10px">💡 ${r.pattern}</p>` : ''}<p class="muted xs" style="margin-top:8px">Обзор собирается автоматически по пятницам в 18:00; здесь — предпросмотр за последние 7 дней. Паттерны считаются по правилам, ИИ-анализ — этап v1.1.</p></div>`;
    const past = `<div class="card"><h3>Записи</h3><div class="list">${s.journal.filter((j) => j.type === 'evening').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((j) => `<details class="li" style="display:block"><summary><span class="muted xs" style="width:64px">${A.fmtDate(j.date)}</span><span>${MOOD[j.mood] || ''}</span><span class="grow">${esc(j.lesson || j.wins || '—')}</span><span class="chip">${j.score}/10</span></summary><div class="sm" style="padding:4px 0 10px"><p><span class="c-g">+</span> ${esc(j.wins)}</p><p><span class="c-r">−</span> ${esc(j.fails)}</p><p class="muted">🙏 ${esc(j.gratitude)} · энергия ${j.energy}/10</p></div></details>`).join('')}</div></div>`;
    return `<div class="stack"><p class="note">🔒 Дневник виден только вам: ни ассистент, ни сотрудники доступа не имеют.</p><div class="grid g2"><div class="stack">${morning}${evening}</div><div class="stack">${review}${chart}${past}</div></div></div>`;
  };

  A.actions.morningSave = (form) => {
    const v = A.fd(form), t = A.today(), old = A.s.top3[t] || [];
    A.s.morning[t] = v.goal.trim();
    A.s.top3[t] = [0, 1, 2].map((i) => ({ text: v['t' + i].trim(), done: (old[i] || {}).text === v['t' + i].trim() ? !!(old[i] || {}).done : false }));
    A.toast('Настрой сохранён. Top-3 уже в «Пульсе»');
  };
  A.actions.eveningSave = (form) => {
    const v = A.fd(form), t = A.today();
    A.s.journal = A.s.journal.filter((j) => !(j.date === t && j.type === 'evening'));
    A.s.journal.push({ id: 'j' + A.uid(), date: t, type: 'evening', score: +v.score, energy: +v.energy, mood: +v.mood || 4, wins: v.wins.trim(), fails: v.fails.trim(), lesson: v.lesson.trim(), gratitude: v.gratitude.trim() });
    A.toast('Рефлексия сохранена');
  };

  // ----- «Спроси Штаб»: ответы по правилам на данных, доступных роли (F-6.3) -----
  function answer(q) {
    const s = A.s, t = A.today(), can = A.can, low = q.toLowerCase();
    if (/гор|красн|риск|срочн|недел/.test(low)) {
      const ps = A.visibleProjects().filter((p) => p.stage !== 'Закрыт' && A.pStatus(p) !== 'g').sort((a, b) => (A.pStatus(a) === 'r' ? -1 : 1) - (A.pStatus(b) === 'r' ? -1 : 1));
      return ps.length ? 'Требуют внимания:\n' + ps.map((p) => `${A.pStatus(p) === 'r' ? '🔴' : '🟡'} ${p.name} — ${p.nextStep || 'нет следующего шага'} (${A.short(p.ownerId)}, до ${A.fmtDate(p.deadline)})`).join('\n') : 'Все доступные вам проекты идут по плану 🟢';
    }
    if (/должн|дебитор|ожида|плат/.test(low)) {
      if (!can.anyCompanyFin()) return 'У вашей роли нет доступа к деньгам компаний.';
      const ex = A.expected(s.wallets.filter((w) => w.kind === 'company' && can.companyFin(w.companyId)).map((w) => w.id));
      return ex.length ? 'Вам должны:\n' + ex.map((x) => `${x.date < t ? '🔴 просрочен' : '⏳ до ' + A.fmtDate(x.date)} — ${x.note}: ${A.money(x.amount, x.currency)}`).join('\n') + `\nИтого: ${A.money(ex.reduce((a, x) => a + A.kzt(x.amount, x.currency), 0))}` : 'Ожидаемых платежей нет.';
    }
    if (/команд|кто|сотрудн|отпуск/.test(low)) {
      const us = can.teamAll() ? A.employees() : A.employees().filter((u) => u.id === A.user().id);
      return 'Команда сейчас:\n' + us.map((u) => { const st = A.ST[A.statusOf(u.id, t)], at = A.attOn(u.id, t); return `${st[0]} ${u.name} — ${st[1].toLowerCase()}${at && at.plan ? ': ' + at.plan.split('\n')[0] : ''}`; }).join('\n');
    }
    if (/деньг|баланс|выручк|расход|финанс/.test(low)) {
      const out = [];
      s.wallets.forEach((w) => { if (w.kind === 'company' ? can.companyFin(w.companyId) : can.personalFin()) { const f = A.flow([w.id], A.monthKey(0)); out.push(`${w.name}: баланс ${A.money(A.balance(w.id), 'KZT', 1)}, за месяц +${A.money(f.inc, 'KZT', 1)} / −${A.money(f.out, 'KZT', 1)}`); } });
      return out.length ? out.join('\n') : 'У вашей роли нет доступа к финансам.';
    }
    if (/бриф|встреч|сегодня|день/.test(low)) {
      if (!can.pulse()) return 'Лента дня руководителя вам недоступна.';
      const ev = A.dayEvents(t).filter((e) => e.kind === 'meeting');
      return ev.length ? 'Встречи сегодня:\n' + ev.map((e) => `${e.start}–${e.end} ${e.title}`).join('\n') + '\n\nПеред встречей проверьте следующий шаг и последние комментарии в карточке связанного проекта.' : 'Встреч сегодня нет.';
    }
    return 'Я отвечаю по вашим данным. Попробуйте:\n• Что горит на этой неделе?\n• Сколько мне должны?\n• Кто сейчас работает?\n• Что с деньгами?\n• Какие встречи сегодня?';
  }
  function chatHtml() {
    const msgs = A.s.chat.length ? A.s.chat : [{ me: false, text: 'Спросите о проектах, деньгах или команде. Я вижу только то, что доступно вашей роли.' }];
    return `<h2>Спроси Штаб</h2><p class="note" style="margin-bottom:12px">Демо-режим: ответы собираются по правилам из ваших данных, без нейросети. LLM и голосовой ввод — этап v1.1.</p>
      <div class="stack" style="gap:8px;max-height:46vh;overflow:auto" id="chatlog">${msgs.map((m) => `<div class="msg ${m.me ? 'me' : ''}">${esc(m.text)}</div>`).join('')}</div>
      <div class="row" style="margin:12px 0 8px">${['Что горит?', 'Сколько мне должны?', 'Кто работает?'].map((q) => `<button type="button" class="chip" data-act="chatAsk" data-q="${q}">${q}</button>`).join('')}</div>
      <form class="row" data-act="chatSend" style="flex-wrap:nowrap"><input name="q" placeholder="Ваш вопрос" aria-label="Ваш вопрос" required autocomplete="off"><button class="btn pri">→</button></form>`;
  }
  const ask = (q) => { A.s.chat.push({ me: true, text: q }, { me: false, text: answer(q) }); if (A.s.chat.length > 40) A.s.chat.splice(0, 2); A.save(); A.modal(chatHtml()); const l = document.getElementById('chatlog'); l.scrollTop = l.scrollHeight; return false; };
  A.actions.chatOpen = () => { A.modal(chatHtml()); return false; };
  A.actions.chatAsk = (el) => ask(el.dataset.q);
  A.actions.chatSend = (form) => ask(form.q.value.trim());
})();
