/* ШТАБ — демо-данные (PRD §15). Все даты считаются от сегодняшнего дня. */
(function () {
  const A = App;
  const rnd = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

  // демо-команда отмечается сама, чтобы доска не пустела на следующий день
  A.demoDay = (s, date) => {
    const def = { e1: 'office', e2: 'office', e3: 'remote', e4: 'office', e5: 'office', e7: 'office' };
    const plans = {
      e1: 'Демо CRM для автодилера\nПлан спринта по приложению', e2: 'Макеты ребрендинга: 2 концепции', e3: 'API заказов для приложения доставки',
      e4: 'Медиаплан BI Group\nОтчёт по охватам', e5: 'Звонки по тёплым лидам\nКП для автодилера', e7: 'Акты сверки\nПодготовка налоговой отчётности',
    };
    Object.keys(def).forEach((uid, i) => {
      if (s.attendance.some((a) => a.userId === uid && a.date === date)) return;
      s.attendance.push({ userId: uid, date, status: def[uid], in: '08:' + (40 + i * 3), out: null, plan: plans[uid], done: '' });
    });
  };

  A.seed = function () {
    const t = A.today(), d = (n) => A.addDays(t, n);
    const md = (off, day) => { // дата в месяце «off месяцев назад», не позже сегодня
      const x = new Date(), dt = new Date(x.getFullYear(), x.getMonth() - off, 1);
      const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      dt.setDate(Math.min(day, last)); const s = A.iso(dt); return s > t ? t : s;
    };

    const users = [
      { id: 'u0', name: 'Расул Абдуллаев', role: 'owner', title: 'Владелец', email: 'owner@shtab.demo', consent: true },
      { id: 'u1', name: 'Айгерим Садыкова', role: 'assistant', title: 'Ассистент руководителя', email: 'assistant@shtab.demo', consent: true,
        perms: { pulseFinance: false, companies: { c1: false, c2: true }, personalFinance: false, timesheet: false, invite: true } },
      { id: 'e1', name: 'Данияр Сейткали', title: 'Руководитель проектов', companyId: 'c1' },
      { id: 'e2', name: 'Мадина Оспанова', title: 'Дизайнер', companyId: 'c2' },
      { id: 'e3', name: 'Тимур Ахметов', title: 'Разработчик', companyId: 'c1' },
      { id: 'e4', name: 'Асель Нурланова', title: 'Маркетолог', companyId: 'c2' },
      { id: 'e5', name: 'Ерлан Жумабеков', title: 'Менеджер по продажам', companyId: 'c1' },
      { id: 'e6', name: 'Камила Ибраева', title: 'SMM-менеджер', companyId: 'c2' },
      { id: 'e7', name: 'Арман Касымов', title: 'Бухгалтер', companyId: 'c1' },
      { id: 'e8', name: 'Жанна Тулегенова', title: 'Аккаунт-менеджер', companyId: 'c2' },
    ];
    users.forEach((u, i) => {
      if (u.id[0] !== 'e') { u.lastActive = t; return; }
      Object.assign(u, { role: 'employee', email: u.id + '@shtab.demo', consent: true, leaveTotal: 24, leaveUsed: [5, 12, 0, 7, 10, 14, 3, 9][i - 2], lastActive: d(-1) });
    });
    A.byId(users, 'e5').lastActive = d(-5); // индикатор «тишины» F-7.9

    const companies = [
      { id: 'c1', name: 'ТОО Raketa-V', legalForm: 'ТОО', currency: 'KZT' },
      { id: 'c2', name: 'Ministry of Marketing', legalForm: 'ТОО', currency: 'KZT' },
    ];
    const wallets = [
      { id: 'w0', kind: 'personal', name: 'Личные деньги', currency: 'KZT', opening: 3400000 },
      { id: 'w1', kind: 'company', companyId: 'c1', name: 'ТОО Raketa-V', currency: 'KZT', opening: 8500000 },
      { id: 'w2', kind: 'company', companyId: 'c2', name: 'Ministry of Marketing', currency: 'KZT', opening: 5200000 },
    ];
    const directions = [
      { id: 'd1', name: 'ERG / Integra', color: '#5B8DEF' }, { id: 'd2', name: 'Ministry of Marketing', color: '#C9A227' },
      { id: 'd3', name: 'ТОО Raketa-V', color: '#2EBD85' }, { id: 'd4', name: 'Федерация таеквондо', color: '#E5484D' },
      { id: 'd5', name: 'Личные стартапы', color: '#B07CE8' },
    ];
    const P = (id, dirId, name, ownerId, status, stage, budget, currency, companyId, start, deadline, nextStep, upd, members) => ({
      id, dirId, name, ownerId, status, stage, budget, currency, companyId, start: d(start), deadline: d(deadline), nextStep, updatedAt: d(upd), members,
      comments: [], files: [], history: [{ at: new Date(A.parse(d(upd))).toISOString(), userId: ownerId, text: 'Обновление статуса' }],
    });
    // 2 🟢, 4 🟡, 2 🔴 (p3 и p6 пожелтели/покраснели по авто-правилу 7/14 дней)
    const projects = [
      P('p1', 'd1', 'Трансформация закупок Integra', 'u0', 'g', 'В работе', 45000000, 'KZT', null, -60, 75, 'Защитить дорожную карту на совете директоров', -1, []),
      P('p2', 'd2', 'Ребрендинг Halyk Market', 'e4', 'g', 'В работе', 18000000, 'KZT', 'c2', -35, 40, 'Показать клиенту 2 концепции айдентики', -2, ['e2', 'e8']),
      P('p3', 'd2', 'SMM-ретейнер Technodom', 'e6', 'g', 'В работе', 8400000, 'KZT', 'c2', -80, 100, 'Согласовать контент-план на декабрь', -9, ['e4', 'e2']),
      P('p4', 'd2', 'Запуск кампании BI Group', 'e8', 'r', 'Сдача', 12000000, 'KZT', 'c2', -50, -4, 'Получить подписанный акт и закрыть оплату', -2, ['e4']),
      P('p5', 'd3', 'CRM для автодилера', 'e1', 'y', 'В работе', 60000, 'USD', 'c1', -70, 30, 'Провести демо модуля склада для клиента', -3, ['e3', 'e5']),
      P('p6', 'd3', 'Мобильное приложение доставки', 'e3', 'g', 'В работе', 22000000, 'KZT', 'c1', -45, 55, 'Выпустить бета-версию в TestFlight', -16, ['e1']),
      P('p7', 'd4', 'Чемпионат РК 2027', 'u0', 'y', 'Переговоры', 30000000, 'KZT', null, -20, 120, 'Встреча с генеральным спонсором', -5, []),
      P('p8', 'd5', 'EdTech-стартап «Sensei»', 'u0', 'y', 'Идея', 5000000, 'KZT', null, -10, 90, '', -1, []),
    ];
    projects[3].comments.push({ userId: 'e8', text: 'Клиент задерживает акт: юрист в отпуске до понедельника.', at: new Date().toISOString() });
    projects[4].files.push('ТЗ_CRM_v3.pdf', 'Смета.xlsx');

    let tn = 0;
    const K = (projectId, title, assigneeId, due, done) => ({ id: 'k' + ++tn, projectId, title, assigneeId, due: d(due), done: !!done, doneAt: done ? d(done === true ? -1 : done) : null, createdBy: 'u0' });
    const tasks = [
      K('p1', 'Собрать данные по категориям закупок', 'u0', -3, true), K('p1', 'Презентация для совета директоров', 'u1', 0), K('p1', 'Согласовать KPI с финансовым блоком', 'u0', 6),
      K('p2', 'Мудборд и 2 концепции', 'e2', 2), K('p2', 'Бриф с маркетингом клиента', 'e4', -1, true), K('p2', 'Смета на производство', 'e8', 5),
      K('p3', 'Контент-план на декабрь', 'e6', 3), K('p3', 'Отчёт по охватам за октябрь', 'e4', -2),
      K('p4', 'Закрывающие документы', 'e8', -4), K('p4', 'Финальный отчёт по кампании', 'e4', -1),
      K('p5', 'Демо модуля склада', 'e1', 1), K('p5', 'Интеграция с 1С', 'e3', 9), K('p5', 'Коммерческое предложение на 2-й этап', 'e5', -2),
      K('p5', 'Протокол встречи от 1 ноября', 'e1', -8), K('p5', 'Обновить план-график', 'e1', -6),
      K('p6', 'Бета в TestFlight', 'e3', -5), K('p6', 'Тест-кейсы оплаты', 'e1', -3), K('p6', 'Приёмка дизайна корзины', 'e1', -2),
      K('p6', 'API заказов', 'e3', 0, 0), K('p7', 'Презентация для спонсора', 'u1', 4), K('p8', 'Интервью с 5 учениками', 'u0', 10),
    ];
    tasks[18].done = true; tasks[18].doneAt = t; // закрыта сегодня — подтянется в «Что сделано»

    // ----- деньги -----
    const tx = []; let n = 0;
    const T = (walletId, type, amount, currency, date, category, projectId, note) => tx.push({ id: 't' + ++n, walletId, type, amount: Math.round(amount), currency, date, category, projectId: projectId || null, note: note || '' });
    [2, 1, 0].forEach((off, i) => {
      const k = [0.9, 1, 1.12][i];
      T('w1', 'in', 6200000 * k, 'KZT', md(off, 6), 'Оплата от клиента', 'p6', 'Приложение — спринт');
      T('w1', 'in', 12000 * k, 'USD', md(off, 11), 'Оплата от клиента', 'p5', 'CRM — этап');
      T('w1', 'out', 3800000, 'KZT', md(off, 5), 'ФОТ'); T('w1', 'out', 650000, 'KZT', md(off, 3), 'Аренда');
      T('w1', 'out', 900000 * k, 'KZT', md(off, 9), 'Подрядчики', 'p6'); T('w1', 'out', 420000, 'KZT', md(off, 10), 'Налоги');
      T('w2', 'in', 4500000 * k, 'KZT', md(off, 7), 'Оплата от клиента', 'p2', 'Ребрендинг — этап');
      T('w2', 'in', 2800000, 'KZT', md(off, 4), 'Оплата от клиента', 'p3', 'Ретейнер');
      T('w2', 'out', 3100000, 'KZT', md(off, 5), 'ФОТ'); T('w2', 'out', 1200000 * k, 'KZT', md(off, 8), 'Реклама', 'p4');
      T('w2', 'out', 480000, 'KZT', md(off, 3), 'Аренда'); T('w2', 'out', 1500, 'USD', md(off, 12), 'Сервисы и подписки');
      T('w0', 'in', 2800000, 'KZT', md(off, 5), 'Зарплата'); T('w0', 'in', 150000, 'KZT', md(off, 12), 'Прочее', null, 'Консультация');
      T('w0', 'out', 420000 * k, 'KZT', md(off, 8), 'Семья'); T('w0', 'out', 380000, 'KZT', md(off, 5), 'Дом');
      T('w0', 'out', 160000, 'KZT', md(off, 9), 'Авто'); T('w0', 'out', 250000, 'KZT', md(off, 2), 'Образование');
      T('w0', 'out', 100000, 'KZT', md(off, 6), 'Благотворительность / садака');
      if (off === 1) T('w0', 'out', 620000, 'KZT', md(off, 20), 'Путешествия');
    });
    T('w1', 'expected', 18000, 'USD', d(12), 'Оплата от клиента', 'p5', 'CRM — 3-й этап');
    T('w2', 'expected', 3600000, 'KZT', d(-6), 'Оплата от клиента', 'p4', 'BI Group — финальный платёж'); // просрочен
    T('w2', 'expected', 2800000, 'KZT', d(20), 'Оплата от клиента', 'p3', 'Ретейнер — декабрь');
    const transfers = [
      { id: 'tr1', from: 'w1', to: 'w0', kind: 'dividend', amount: 2000000, currency: 'KZT', date: md(1, 15) },
      { id: 'tr2', from: 'w2', to: 'w0', kind: 'dividend', amount: 1500000, currency: 'KZT', date: md(0, 4) },
    ];

    // ----- личное: 2 недели логов -----
    const workouts = [[13, 'gym', 60, 'high'], [11, 'run', 40, 'moderate'], [9, 'martial_arts', 75, 'high'], [7, 'gym', 60, 'high'], [6, 'walk', 45, 'low'], [4, 'run', 35, 'moderate'], [2, 'gym', 65, 'high'], [1, 'swim', 40, 'moderate']]
      .map(([ago, type, dur, intensity], i) => ({ id: 'wo' + i, date: d(-ago), type, duration: dur, intensity, note: '' }));
    const langLogs = [], habitLogs = [], prayerLogs = {}, journal = [], body = [];
    const wins = ['Закрыл этап по Integra', 'Договорился о встрече со спонсором', 'Команда сдала макеты в срок', 'Провёл сильное 1:1', 'Разобрал входящие до нуля'];
    const fails = ['Перенёс тренировку', 'Затянул совещание на 40 минут', 'Не дозвонился до клиента', 'Поздно лёг', 'Отвлекался на мессенджеры'];
    const lessons = ['Сложное — на утро', 'Повестка заранее экономит полчаса', 'Делегировать раньше', 'Телефон — в другую комнату', 'Один главный фокус в день'];
    for (let ago = 14; ago >= 1; ago--) {
      const date = d(-ago), wd = A.parse(date).getDay(), r = rnd(ago);
      if (ago !== 8) langLogs.push({ goalId: 'l1', date, minutes: 15 + Math.round(r * 20), cards: 20 + Math.round(r * 25), lesson: wd === 2 || wd === 4 });
      if (r < 0.85) habitLogs.push({ habitId: 'h1', date });
      if (wd >= 1 && wd <= 5 && r > 0.2) habitLogs.push({ habitId: 'h2', date });
      if (wd === 0 || wd === 6 || r > 0.7) habitLogs.push({ habitId: 'h3', date });
      prayerLogs[date] = { fajr: r > 0.15, dhuhr: true, asr: r > 0.1, maghrib: true, isha: true };
      const energy = wd === 3 ? 4 + Math.round(r) : 7 + Math.round(r * 2); // по средам энергия ниже — паттерн для обзора
      journal.push({ id: 'j' + ago, date, type: 'evening', score: Math.min(10, energy + (r > 0.5 ? 1 : 0)), energy, mood: wd === 3 ? 3 : 4, wins: wins[ago % 5], fails: fails[ago % 5], lesson: lessons[ago % 5], gratitude: 'Семья, здоровье, команда' });
      if (ago % 2 === 0) body.push({ date, weight: +(84.6 - (14 - ago) * 0.08).toFixed(1), steps: 6500 + Math.round(r * 4000), sleep: +(6.2 + r * 1.5).toFixed(1) });
    }

    const s = {
      v: 1, session: { userId: null }, cache: { prayer: null, weather: null },
      settings: {
        theme: 'dark', lang: 'ru', city: 'Алматы', timezone: 'Asia/Almaty', currency: 'KZT', workStart: '09:00', workEnd: '18:00', workDays: [1, 2, 3, 4, 5],
        checkinWarn: '10:00', checkinAbsent: '12:00', prayerSlot: 20, prayerMethod: 3, prayerAdjust: 0, hideAmounts: false, leaveDays: 24, geo: false, spiritMode: 'namaz',
        modules: { companyFinance: true, personalFinance: true, team: true, fitness: true, languages: true, nutrition: true, spirit: true, journal: true },
        rates: { KZT: 1, USD: 520, AED: 141.6, RUB: 6.4 },
      },
      users, companies, wallets, directions, projects, tasks, tx, transfers,
      budgets: { 'Семья': 500000, 'Дом': 400000, 'Авто': 200000, 'Образование': 300000, 'Благотворительность / садака': 150000, 'Путешествия': 400000 },
      goals: [{ id: 'g1', name: 'Подушка безопасности', target: 15000000, current: 9200000, due: d(240), history: [6.1, 6.9, 7.4, 8.1, 8.6, 9.2].map((v, i) => ({ date: md(5 - i, 1), v: v * 1e6 })) }],
      recurring: [{ id: 'r1', name: 'Ипотека', amount: 480000, day: 5 }, { id: 'r2', name: 'Школа', amount: 250000, day: 1 }, { id: 'r3', name: 'Аренда парковки', amount: 35000, day: 10 }, { id: 'r4', name: 'Подписки', amount: 18000, day: 15 }],
      taxes: [
        { id: 'x1', companyId: 'c1', name: 'ИПН и соцплатежи за сотрудников', due: d(8), amount: 420000, done: false },
        { id: 'x2', companyId: 'c2', name: 'ИПН и соцплатежи за сотрудников', due: d(8), amount: 350000, done: false },
        { id: 'x3', companyId: 'c1', name: 'Декларация и уплата НДС за квартал', due: d(22), amount: 1150000, done: false },
        { id: 'x4', companyId: 'c2', name: 'Отчётность по форме 910', due: d(60), amount: 0, done: false },
      ],
      habits: [{ id: 'h1', name: 'Чтение 30 минут', target: 7 }, { id: 'h2', name: 'Без телефона до 9:00', target: 5 }, { id: 'h3', name: 'Прогулка с семьёй', target: 3 }],
      habitLogs, workouts, body,
      langs: [{ id: 'l1', language: 'Японский', flag: '🇯🇵', levelCurrent: 'N5', levelTarget: 'N4', examDate: d(205), dailyMinutes: 20, hoursBase: 310, hoursTotal: 2200, wordsDue: 35, kanjiDue: 10 }],
      langLogs, meals: [{ id: 'm1', date: t, time: '08:35', note: 'Овсянка, яйца, чай', photo: '' }], water: { [t]: 3 }, eatWindow: { from: '08:30', to: '19:00' },
      mealPlan: { 1: 'Курица, гречка, овощи', 2: 'Рыба, рис, салат', 3: 'Говядина, булгур', 4: 'Индейка, киноа', 5: 'Плов (после джума)', 6: 'Семейный обед', 0: 'Лёгкий день: супы, овощи' },
      prayerLogs, quran: { pages: 142 }, calm: {},
      journal, top3: { [t]: [{ text: 'Защитить дорожную карту Integra', done: true }, { text: 'Закрыть акт по BI Group', done: false }, { text: 'Тренировка и урок японского', done: false }] }, morning: { [t]: 'Спокойный темп, одно главное решение' },
      promises: [{ id: 'pr1', to: 'Сын', what: 'Сходить на соревнования по таеквондо', due: d(2), done: false }, { id: 'pr2', to: 'Данияр', what: 'Дать обратную связь по плану спринта', due: d(1), done: false }, { id: 'pr3', to: 'Супруга', what: 'Забронировать отпуск на январь', due: d(-1), done: true }],
      schedule: [
        { id: 's1', days: [1, 3, 5], start: '07:00', end: '08:00', title: 'Тренировка: зал', kind: 'workout' },
        { id: 's2', days: [2, 4], start: '07:15', end: '08:00', title: 'Урок японского с преподавателем', kind: 'language' },
        { id: 's3', days: [6], start: '10:00', end: '11:15', title: 'Тренировка: таеквондо', kind: 'workout' },
        { id: 's4', days: [0, 1, 2, 3, 4, 5, 6], start: '08:30', end: '08:50', title: 'Завтрак', kind: 'meal' },
        { id: 's5', days: [0, 1, 2, 3, 4, 5, 6], start: '13:15', end: '13:45', title: 'Обед', kind: 'meal' },
        { id: 's6', days: [0, 1, 2, 3, 4, 5, 6], start: '18:15', end: '18:40', title: 'Ужин', kind: 'meal' },
        { id: 's7', days: [0, 1, 2, 3, 4, 5, 6], start: '19:30', end: '21:00', title: 'Время семьи', kind: 'family' },
      ],
      events: [
        { id: 'ev1', date: t, start: '10:00', end: '11:00', title: 'Совет директоров Integra: статус закупок', createdBy: 'u0' },
        { id: 'ev2', date: t, start: '14:00', end: '15:00', title: 'Созвон с BI Group: сдача кампании', createdBy: 'u1' },
        { id: 'ev3', date: t, start: '16:30', end: '17:15', title: '1:1 с Данияром', createdBy: 'u1' },
        { id: 'ev4', date: d(1), start: '11:00', end: '12:00', title: 'Встреча со спонсором чемпионата', createdBy: 'u1' },
      ],
      decisions: [
        { id: 'dc1', kind: 'Подпись', title: 'Договор с подрядчиком по приложению доставки', fromId: 'e3', projectId: 'p6' },
        { id: 'dc2', kind: 'Согласование', title: 'Смета на производство — Halyk Market, 2,4 млн ₸', fromId: 'e8', projectId: 'p2' },
        { id: 'dc3', kind: 'Вопрос', title: 'Даём ли скидку 10% автодилеру на 2-й этап?', fromId: 'e5', projectId: 'p5' },
      ],
      attendance: [],
      absences: [
        { id: 'a1', userId: 'e6', type: 'vacation', from: d(-3), to: d(6), substituteId: 'e4', comment: 'Плановый отпуск', file: '', status: 'approved', approvedBy: 'u0' },
        { id: 'a2', userId: 'e2', type: 'vacation', from: d(3), to: d(12), substituteId: 'e4', comment: 'Семейная поездка', file: '', status: 'pending', approvedBy: null },
        { id: 'a3', userId: 'e5', type: 'day_off', from: d(5), to: d(5), substituteId: 'e1', comment: 'Личные дела', file: '', status: 'pending', approvedBy: null },
      ],
      holidays: [['01-01', 'Новый год'], ['01-02', 'Новый год'], ['01-07', 'Рождество'], ['03-08', 'Международный женский день'], ['03-21', 'Наурыз'], ['03-22', 'Наурыз'], ['03-23', 'Наурыз'],
        ['05-01', 'Праздник единства народа'], ['05-07', 'День защитника Отечества'], ['05-09', 'День Победы'], ['07-06', 'День столицы'], ['08-30', 'День Конституции'], ['10-25', 'День Республики'], ['12-16', 'День Независимости']]
        .map(([m, name]) => ({ country: 'KZ', md: m, name })),
      invites: [], audit: [], chat: [],
    };

    // табель: прошлый месяц и текущий до вчера
    const now = new Date(), first = A.iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const isWork = (date) => s.settings.workDays.includes(A.parse(date).getDay()) && !s.holidays.some((h) => h.md === date.slice(5));
    for (let date = first, i = 0; date < t; date = A.addDays(date, 1), i++) {
      if (!isWork(date)) continue;
      users.filter((u) => u.role === 'employee').forEach((u, ui) => {
        if (s.absences.some((a) => a.userId === u.id && a.status === 'approved' && a.from <= date && date <= a.to)) return;
        const r = rnd(i * 17 + ui * 131 + 3);
        if (u.id === 'e8' && r > 0.93) return; // прогул без причины
        const status = u.id === 'e3' ? (r < 0.7 ? 'remote' : 'office') : r < 0.8 ? 'office' : r < 0.9 ? 'remote' : r < 0.94 ? 'field' : r < 0.97 ? 'sick' : 'training';
        s.attendance.push({ userId: u.id, date, status, in: '08:' + (35 + Math.round(r * 24)), out: '18:' + String(Math.round(r * 40)).padStart(2, '0'), plan: '', done: '' });
      });
    }
    A.demoDay(s, t);
    return s;
  };
})();
