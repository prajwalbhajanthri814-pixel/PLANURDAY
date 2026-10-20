(() => {
  const $ = selector => document.querySelector(selector);
  const safe = window.Daymark.safe;
  let selectedDate = new Date(); selectedDate.setHours(12, 0, 0, 0);
  let calendarView = 'day';
  const key = date => window.Daymark.todayKey(date);
  const shift = (date, amount) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
  const monday = date => { const start = new Date(date); start.setHours(12, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return start; };
  const dateText = (date, options = { weekday: 'long', month: 'long', day: 'numeric' }) => new Intl.DateTimeFormat(undefined, options).format(date);
  const categories = { Study: '#9e91cc', Portfolio: '#83aa82', Personal: '#e4b178', Wellbeing: '#e4977d', Other: '#80afb2' };

  function taskCard(task) {
    return `<article class="task-row${task.done ? ' is-done' : ''}" data-task-id="${safe(task.id)}"><button class="task-check" data-task-action="toggle" aria-label="${task.done ? 'Mark incomplete' : 'Mark complete'}: ${safe(task.title)}" aria-pressed="${Boolean(task.done)}">${task.done ? '✓' : ''}</button><time class="task-time">${safe(window.Daymark.formatTime(task.time))}</time><div class="task-main"><strong>${safe(task.title)}</strong><div class="task-meta"><span class="category-tag" style="--tag-color:${categories[task.category] || categories.Other}">${safe(task.category)}</span><span>${Number(task.duration) || 30} min</span>${task.reminder ? '<span class="reminder-mark" title="Reminder set">♧</span>' : ''}</div></div><div class="task-row-actions"><button class="task-action" data-task-action="edit" aria-label="Edit ${safe(task.title)}">✎</button><button class="task-action delete-action" data-task-action="delete" aria-label="Delete ${safe(task.title)}">×</button></div></article>`;
  }

  function dayTasks(tasks, date) { return tasks.filter(task => task.date === key(date)).sort((a, b) => a.time.localeCompare(b.time)); }

  function drawDay(panel, tasks) {
    const items = dayTasks(tasks, selectedDate);
    panel.innerHTML = `<div class="calendar-heading"><div><span class="eyebrow-pill">${safe(dateText(selectedDate, { weekday: 'long' }).toUpperCase())}</span><h2>${safe(dateText(selectedDate, { month: 'long', day: 'numeric' }))}</h2></div><span>${items.length} ${items.length === 1 ? 'task' : 'tasks'}</span></div><div class="day-grid">${Array.from({ length: 12 }, (_, index) => { const hour = index + 7; const time = `${String(hour).padStart(2, '0')}:00`; const inHour = items.filter(task => Number(task.time.slice(0, 2)) === hour); return `<div class="hour-row"><time>${safe(window.Daymark.formatTime(time))}</time><div>${inHour.map(task => `<div class="calendar-event" style="--event-color:${categories[task.category] || categories.Other}"><strong>${safe(task.title)}</strong><small>${safe(window.Daymark.formatTime(task.time))} · ${Number(task.duration) || 30} min</small></div>`).join('')}</div></div>`; }).join('')}</div>`;
  }

  function drawWeek(panel, tasks) {
    const start = monday(selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => shift(start, i));
    panel.innerHTML = `<div class="calendar-heading"><div><span class="eyebrow-pill">YOUR WEEK</span><h2>${safe(dateText(start, { month: 'short', day: 'numeric' }))} – ${safe(dateText(days[6], { month: 'short', day: 'numeric' }))}</h2></div><span>Choose a day to focus in</span></div><div class="week-grid">${days.map(day => { const items = dayTasks(tasks, day); return `<button type="button" class="week-day${key(day) === key(selectedDate) ? ' selected' : ''}${key(day) === key(new Date()) ? ' today' : ''}" data-select-date="${key(day)}"><span>${safe(dateText(day, { weekday: 'short' }))}</span><strong>${day.getDate()}</strong><small>${items.length ? `${items.length} ${items.length === 1 ? 'task' : 'tasks'}` : 'Open day'}</small>${items.slice(0, 3).map(task => `<i style="--event-color:${categories[task.category] || categories.Other}">${safe(window.Daymark.formatTime(task.time))} ${safe(task.title)}</i>`).join('')}</button>`; }).join('')}</div>`;
  }

  function drawMonth(panel, tasks) {
    const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
    const start = monday(first);
    const days = Array.from({ length: 42 }, (_, i) => shift(start, i));
    panel.innerHTML = `<div class="calendar-heading"><div><span class="eyebrow-pill">ZOOM OUT A LITTLE</span><h2>${safe(dateText(selectedDate, { month: 'long', year: 'numeric' }))}</h2></div><span>Select any date to see its plan</span></div><div class="month-grid"><div class="weekday-labels">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<span>${d}</span>`).join('')}</div><div class="month-days">${days.map(day => { const items = dayTasks(tasks, day); return `<button type="button" class="month-day${day.getMonth() !== selectedDate.getMonth() ? ' outside' : ''}${key(day) === key(selectedDate) ? ' selected' : ''}${key(day) === key(new Date()) ? ' today' : ''}" data-select-date="${key(day)}" aria-label="${safe(dateText(day))}, ${items.length} tasks"><strong>${day.getDate()}</strong>${items.slice(0, 2).map(task => `<i style="--event-color:${categories[task.category] || categories.Other}">${safe(task.title)}</i>`).join('')}${items.length > 2 ? `<small>+${items.length - 2}</small>` : ''}</button>`; }).join('')}</div></div>`;
  }

  function renderPlanner(tasks) {
    const title = $('[data-planner-title]');
    const panel = $('[data-calendar-panel]');
    if (!title || !panel) return;
    const dayItems = dayTasks(tasks, selectedDate);
    const visible = calendarView === 'day' ? dayItems : calendarView === 'week' ? tasks.filter(t => t.date >= key(monday(selectedDate)) && t.date <= key(shift(monday(selectedDate), 6))) : tasks.filter(t => t.date.startsWith(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`));
    title.textContent = calendarView === 'day' ? dateText(selectedDate) : calendarView === 'week' ? `Week of ${dateText(monday(selectedDate), { month: 'short', day: 'numeric' })}` : dateText(selectedDate, { month: 'long', year: 'numeric' });
    $('[data-plan-list-title]').textContent = calendarView === 'day' ? `${dateText(selectedDate, { weekday: 'long' })}'s plan` : calendarView === 'week' ? 'This week' : 'This month';
    $('[data-plan-count]').textContent = `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'}`;
    $('[data-planner-tasks]').innerHTML = visible.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map(taskCard).join('');
    $('[data-planner-empty]').hidden = visible.length > 0;
    if (calendarView === 'day') drawDay(panel, tasks); else if (calendarView === 'week') drawWeek(panel, tasks); else drawMonth(panel, tasks);
    document.querySelectorAll('[data-calendar-view]').forEach(button => { const active = button.dataset.calendarView === calendarView; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll('[data-date-shift]').forEach(button => { button.setAttribute('aria-label', `${button.dataset.dateShift === '-1' ? 'Previous' : 'Next'} ${calendarView}`); });
  }

  function renderInsights(tasks, preferences) {
    const root = $('[data-week-chart]'); if (!root) return;
    const start = monday(new Date());
    const days = Array.from({ length: 7 }, (_, i) => shift(start, i));
    const counts = days.map(day => tasks.filter(task => task.date === key(day) && task.done).length);
    const max = Math.max(1, ...counts);
    const completed = tasks.filter(task => task.done && task.date >= key(start) && task.date <= key(shift(start, 6)));
    const weekTasks = tasks.filter(task => task.date >= key(start) && task.date <= key(shift(start, 6)));
    $('[data-insight-period]').textContent = `WEEK OF ${dateText(start, { month: 'short', day: 'numeric' }).toUpperCase()}`;
    $('[data-summary-done]').textContent = String(completed.length);
    $('[data-summary-minutes]').textContent = `${completed.reduce((total, task) => total + Number(task.duration || 0), 0)} min`;
    const windows = { morning: 'Earlier day', midday: 'Midday', evening: 'Later day', flexible: 'Flexible' };
    $('[data-summary-focus]').textContent = windows[preferences.focus_window] || 'Flexible';
    root.innerHTML = days.map((day, i) => `<div class="bar-day" title="${safe(dateText(day, { weekday: 'long' }))}: ${counts[i]} completed"><strong>${counts[i] || '·'}</strong><div class="bar-track"><i style="height:${counts[i] ? Math.max(7, counts[i] / max * 100) : 3}%"></i></div><small>${safe(dateText(day, { weekday: 'short' }))}</small></div>`).join('');
    const totals = Object.keys(categories).map(name => [name, weekTasks.filter(task => task.category === name).length]);
    const total = totals.reduce((sum, [, n]) => sum + n, 0);
    let deg = 0;
    const slices = totals.filter(([, n]) => n).map(([name, count]) => { const startDeg = deg; deg += count / total * 360; return `${categories[name]} ${startDeg}deg ${deg}deg`; });
    $('[data-pie-total]').textContent = String(total);
    $('[data-category-pie]').style.setProperty('--pie', slices.length ? `conic-gradient(${slices.join(',')})` : 'conic-gradient(#e9eee7 0deg 360deg)');
    $('[data-pie-legend]').innerHTML = totals.filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([name, count]) => `<div><i style="--event-color:${categories[name]}"></i><span>${safe(name)}</span><strong>${Math.round(count / total * 100)}%</strong></div>`).join('') || '<p class="muted-copy">Add a few tasks and your categories will appear here.</p>';
  }

  function renderJournal(entries) {
    const date = key(new Date());
    const current = entries.find(item => item.date === date);
    const form = $('[data-journal-form]');
    if (!form) return;
    $('[data-journal-date]').textContent = dateText(new Date());
    form.elements.text.value = current?.text || '';
    const energy = String(current?.energy || 3);
    const radio = form.querySelector(`input[name="energy"][value="${energy}"]`); if (radio) radio.checked = true;
    const older = entries.filter(item => item.date !== date).sort((a, b) => b.date.localeCompare(a.date));
    $('[data-journal-history]').innerHTML = older.slice(0, 12).map(item => `<article class="history-entry"><time datetime="${safe(item.date)}">${safe(dateText(new Date(`${item.date}T12:00:00`), { weekday: 'short', month: 'short', day: 'numeric' }))}</time><p>${safe(item.text)}</p><small>Energy ${Number(item.energy)}/5</small></article>`).join('');
    $('[data-journal-empty]').hidden = older.length > 0;
  }

  function renderProfile(user, preferences) {
    const form = $('[data-profile-form]'); if (!form) return;
    form.elements.name.value = user.name || '';
    $('[data-profile-heading]').textContent = user.name || 'Friend';
    const pref = $('[data-preferences-form]');
    pref.elements.focus_window.value = preferences.focus_window || 'flexible';
    pref.elements.wake_time.value = preferences.wake_time || '';
    pref.elements.bed_time.value = preferences.bed_time || '';
  }

  function render(page, state) {
    if (page === 'planner') renderPlanner(state.tasks);
    if (page === 'insights') renderInsights(state.tasks, state.preferences);
    if (page === 'journal') renderJournal(state.journal);
    if (page === 'profile') renderProfile(state.user, state.preferences);
  }

  document.addEventListener('click', event => {
    const view = event.target.closest('[data-calendar-view]');
    if (view) { calendarView = view.dataset.calendarView; renderPlanner(window.DaymarkApp.tasks); }
    const shiftBy = event.target.closest('[data-date-shift]');
    if (shiftBy) {
      const amount = Number(shiftBy.dataset.dateShift);
      if (calendarView === 'day') selectedDate = shift(selectedDate, amount);
      else if (calendarView === 'week') selectedDate = shift(selectedDate, amount * 7);
      else { selectedDate = new Date(selectedDate); selectedDate.setMonth(selectedDate.getMonth() + amount); }
      renderPlanner(window.DaymarkApp.tasks);
    }
    if (event.target.closest('[data-jump-today]')) { selectedDate = new Date(); selectedDate.setHours(12, 0, 0, 0); calendarView = 'day'; renderPlanner(window.DaymarkApp.tasks); }
    const pick = event.target.closest('[data-select-date]');
    if (pick) { selectedDate = new Date(`${pick.dataset.selectDate}T12:00:00`); calendarView = 'day'; renderPlanner(window.DaymarkApp.tasks); }
  });

  $('[data-journal-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = form.elements.text.value.trim();
    const error = $('[data-journal-error]'); error.hidden = true;
    if (!text) { error.textContent = 'Write a few words first, if you feel like it.'; error.hidden = false; form.elements.text.focus(); return; }
    const entry = { date: key(new Date()), text, energy: Number(new FormData(form).get('energy') || 3) };
    const entries = [entry, ...window.DaymarkApp.journal.filter(item => item.date !== entry.date)];
    try {
      await window.Daymark.api('/api/journal', { method: 'PUT', body: { entries: [entry] } });
      window.DaymarkApp.setJournal(entries); renderJournal(entries); window.Daymark.toast('Your check-in is saved in this browser.', 'success');
    } catch (problem) { error.textContent = problem.message; error.hidden = false; }
  });

  $('[data-profile-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget; const error = $('[data-profile-error]');
    error.hidden = true;
    try {
      const result = await window.Daymark.api('/api/profile', { method: 'PUT', body: { name: form.elements.name.value } });
      window.DaymarkApp.setUser(result.user); window.Daymark.toast('Your name is saved in this browser.', 'success');
    } catch (problem) { error.textContent = problem.message; error.hidden = false; }
  });

  $('[data-preferences-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget; const error = $('[data-preferences-error]'); error.hidden = true;
    try {
      const result = await window.Daymark.api('/api/preferences', { method: 'PUT', body: { preferences: { focus_window: form.elements.focus_window.value, wake_time: form.elements.wake_time.value, bed_time: form.elements.bed_time.value } } });
      window.DaymarkApp.setPreferences(result.preferences); window.Daymark.toast('Your preferences are saved in this browser.', 'success');
    } catch (problem) { error.textContent = problem.message; error.hidden = false; }
  });

  window.DaymarkPages = { render, get selectedDateKey() { return key(selectedDate); } };
})();
