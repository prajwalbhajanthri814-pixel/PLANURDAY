(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const page = document.body.dataset.page;
  let user = null;
  let tasks = [];
  let journal = [];
  let preferences = { focus_window: 'flexible', wake_time: '', bed_time: '' };
  let editingId = null;
  const notified = new Set();
  const categories = { Study: '#9e91cc', Portfolio: '#83aa82', Personal: '#e4b178', Wellbeing: '#e4977d', Other: '#80afb2' };

  function fmtDate(date, opts = { weekday: 'long', month: 'long', day: 'numeric' }) { return new Intl.DateTimeFormat(undefined, opts).format(date); }
  function monday(date) { const result = new Date(date); result.setHours(12, 0, 0, 0); result.setDate(result.getDate() - ((result.getDay() + 6) % 7)); return result; }
  function shift(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
  function taskAt(task) { return new Date(`${task.date}T${task.time}:00`); }
  function saveTasks() { return window.Daymark.api('/api/tasks', { method: 'PUT', body: { tasks } }); }

  function renderCommon() {
    $$('[data-profile-name]').forEach(el => el.textContent = user?.name || 'Friend');
    $$('[data-profile-initial]').forEach(el => el.textContent = (user?.name || 'F').trim().charAt(0).toUpperCase());
    $$('[data-today-date]').forEach(el => el.textContent = fmtDate(new Date(), { month: 'short', day: 'numeric', year: 'numeric' }));
  }

  function taskMarkup(task) {
    const safe = window.Daymark.safe;
    return `<article class="task-row${task.done ? ' is-done' : ''}" data-task-id="${safe(task.id)}"><button class="task-check" data-task-action="toggle" aria-label="${task.done ? 'Mark incomplete' : 'Mark complete'}: ${safe(task.title)}" aria-pressed="${Boolean(task.done)}">${task.done ? '✓' : ''}</button><time class="task-time">${safe(window.Daymark.formatTime(task.time))}</time><div class="task-main"><strong>${safe(task.title)}</strong><div class="task-meta"><span class="category-tag" style="--tag-color:${categories[task.category] || categories.Other}">${safe(task.category)}</span><span>${Number(task.duration) || 30} min</span>${task.reminder ? '<span class="reminder-mark" title="Reminder set">♧</span>' : ''}</div></div><div class="task-row-actions"><button class="task-action" data-task-action="edit" aria-label="Edit ${safe(task.title)}" title="Edit task">✎</button><button class="task-action delete-action" data-task-action="delete" aria-label="Delete ${safe(task.title)}" title="Delete task">×</button></div></article>`;
  }

  function renderDashboard() {
    const today = window.Daymark.todayKey();
    const todays = tasks.filter(t => t.date === today).sort((a, b) => a.time.localeCompare(b.time));
    const completed = todays.filter(t => t.done).length;
    const pending = todays.length - completed;
    const greeting = $('[data-greeting]');
    if (greeting) {
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      greeting.textContent = `${timeGreeting}, ${user.name.split(' ')[0]}.`;
      $('[data-welcome-title]').textContent = pending ? 'Every small step counts.' : todays.length ? 'You made room for your day.' : 'Every day starts somewhere.';
      $('[data-progress-caption]').textContent = pending ? `${pending} planned ${pending === 1 ? 'task is' : 'tasks are'} still ahead. Take them at your pace.` : todays.length ? 'Your plan is complete. Let the rest of the day be yours.' : 'Add one small thing you would like to make room for.';
      $('[data-done-count]').textContent = String(completed);
      $('[data-total-count]').textContent = String(todays.length);
      $('[data-task-count]').textContent = `${todays.length} ${todays.length === 1 ? 'task' : 'tasks'}`;
      const percent = todays.length ? Math.round(completed / todays.length * 100) : 0;
      $('[data-progress-number]').textContent = `${percent}%`;
      $('[data-progress-ring]').style.setProperty('--progress', `${percent}%`);
      $('[data-today-tasks]').innerHTML = todays.map(taskMarkup).join('');
      $('[data-empty-today]').hidden = todays.length > 0;
      renderMiniBars(); renderSuggestion();
    }
  }

  function renderMiniBars() {
    const root = $('[data-mini-bars]');
    if (!root) return;
    const start = monday(new Date());
    const days = Array.from({ length: 7 }, (_, i) => shift(start, i));
    const counts = days.map(d => tasks.filter(t => t.date === window.Daymark.todayKey(d) && t.done).length);
    const max = Math.max(1, ...counts);
    root.innerHTML = days.map((d, i) => `<div class="mini-bar-item" title="${fmtDate(d, { weekday: 'long' })}: ${counts[i]} completed"><div class="mini-bar-track"><i style="height:${Math.max(counts[i] ? 10 : 3, counts[i] / max * 100)}%"></i></div><small>${fmtDate(d, { weekday: 'narrow' })}</small></div>`).join('');
  }

  function renderSuggestion() {
    const title = $('[data-suggestion-title]');
    if (!title) return;
    const copy = $('[data-suggestion-copy]');
    const labels = { morning: 'Earlier in the day', midday: 'Around midday', evening: 'Later in the day' };
    const selected = preferences.focus_window;
    if (labels[selected]) {
      title.textContent = `${labels[selected]} feels right to you.`;
      copy.textContent = 'You chose this focus window in your preferences. Try planning one important task there and adjust whenever your routine changes.';
      return;
    }
    const byHour = new Map();
    tasks.filter(t => t.done).forEach(t => { const h = Number(t.time.slice(0, 2)); byHour.set(h, (byHour.get(h) || 0) + 1); });
    const sample = [...byHour.values()].reduce((sum, n) => sum + n, 0);
    if (sample >= 3) {
      const top = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const band = top < 12 ? 'earlier in the day' : top < 17 ? 'around midday' : 'later in the day';
      title.textContent = `Your history leans ${band}.`;
      copy.textContent = `You have completed the most tasks ${band}. That is a personal pattern from your own history, not a rule—see how it feels for you.`;
    } else {
      title.textContent = 'Find your own rhythm.';
      copy.textContent = 'Choose the hours that tend to work for you. Daymark can learn from your preferences and your completed tasks.';
    }
  }

  function renderPage() {
    renderCommon();
    if (page === 'dashboard') renderDashboard();
    if (window.DaymarkPages) window.DaymarkPages.render(page, { tasks, journal, preferences, user });
  }

  function openTask(task = null) {
    const dialog = $('[data-task-dialog]');
    if (!dialog) { window.Daymark.toast('Open the planner to add or edit a task.'); return; }
    const form = dialog.querySelector('[data-task-form]');
    form.reset();
    const title = dialog.querySelector('#task-title');
    dialog.querySelector('#task-date').value = task?.date || (page === 'planner' && window.DaymarkPages ? window.DaymarkPages.selectedDateKey : window.Daymark.todayKey());
    dialog.querySelector('#task-time').value = task?.time || '15:00';
    dialog.querySelector('#task-category').value = task?.category || 'Study';
    dialog.querySelector('#task-duration').value = String(task?.duration || 45);
    title.value = task?.title || '';
    form.elements.reminder.checked = Boolean(task?.reminder);
    editingId = task?.id || null;
    dialog.querySelector('#task-dialog-title').textContent = task ? 'Edit your task' : 'Add a task';
    const error = dialog.querySelector('[data-task-error]'); if (error) error.hidden = true;
    dialog.showModal();
    title.focus();
  }

  function closeTask() {
    const dialog = $('[data-task-dialog]');
    if (dialog?.open) dialog.close();
    editingId = null;
  }

  async function submitTask(form) {
    const data = new FormData(form);
    const task = { id: editingId || `task-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`, title: String(data.get('title') || '').trim(), date: String(data.get('date')), time: String(data.get('time')), category: String(data.get('category')), duration: Number(data.get('duration')), done: false, reminder: data.get('reminder') === 'on', completed_at: '' };
    if (task.reminder && taskAt(task).getTime() <= Date.now()) {
      const error = $('[data-task-error]');
      if (error) { error.textContent = 'Choose a future time for this reminder, or turn the reminder off.'; error.hidden = false; }
      return;
    }
    const previous = tasks;
    const old = editingId ? tasks.find(t => t.id === editingId) : null;
    if (old) { task.done = old.done; task.completed_at = old.completed_at || ''; tasks = tasks.map(t => t.id === editingId ? task : t); }
    else tasks = [...tasks, task];
    const error = $('[data-task-error]'); if (error) error.hidden = true;
    try {
      await saveTasks();
      closeTask(); renderPage();
      window.Daymark.toast(old ? 'Your task was updated.' : 'Your task was added to your plan.', 'success');
      if (task.reminder && !task.done) scheduleReminder(task);
    } catch (problem) {
      tasks = previous;
      if (error) { error.textContent = problem.message; error.hidden = false; }
      else window.Daymark.toast(problem.message, 'error');
    }
  }

  async function changeTask(id, action) {
    const current = tasks.find(t => t.id === id);
    if (!current) return;
    if (action === 'edit') { openTask(current); return; }
    if (action === 'delete' && !window.confirm(`Remove “${current.title}” from your plan?`)) return;
    const previous = tasks;
    if (action === 'toggle') tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done, completed_at: !t.done ? new Date().toISOString() : '' } : t);
    if (action === 'delete') tasks = tasks.filter(t => t.id !== id);
    try {
      await saveTasks();
      renderPage();
      if (action === 'toggle') window.Daymark.toast(tasks.find(t => t.id === id)?.done ? 'Nice work. One more thing you showed up for.' : 'Task moved back to your plan.', 'success');
      if (action === 'delete') window.Daymark.toast('Task removed from your plan.');
    } catch (problem) { tasks = previous; renderPage(); window.Daymark.toast(problem.message, 'error'); }
  }

  function scheduleReminder(task) {
    if (!task.reminder || task.done) return;
    const delay = taskAt(task).getTime() - Date.now();
    if (delay <= 0) return;
    window.setTimeout(() => {
      const latest = tasks.find(t => t.id === task.id);
      if (!latest || latest.done || !latest.reminder || notified.has(task.id)) return;
      if (taskAt(latest).getTime() > Date.now()) { scheduleReminder(latest); return; }
      notified.add(task.id);
      window.Daymark.toast(`A gentle nudge: ${latest.title}`, 'reminder');
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Daymark reminder', { body: latest.title, icon: './daymark-icon.svg', tag: latest.id });
    }, Math.min(delay, 2147480000));
  }

  async function enableNotifications() {
    if (!('Notification' in window)) { window.Daymark.toast('This browser does not support device notifications. Reminders still appear while Daymark is open.'); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') { window.Daymark.toast('Device notifications are enabled for this browser.', 'success'); }
      else window.Daymark.toast('Notifications are off. You can allow them in your browser settings.');
    } catch { window.Daymark.toast('Could not open the notification permission prompt. Check your browser settings.'); }
  }

  async function boot() {
    try {
      const session = await window.Daymark.api('/api/auth/me');
      user = session.user;
      const [taskData, journalData, prefData] = await Promise.all([window.Daymark.api('/api/tasks'), window.Daymark.api('/api/journal'), window.Daymark.api('/api/preferences')]);
      tasks = taskData.tasks || [];
      journal = journalData.entries || [];
      preferences = prefData.preferences || preferences;
      renderPage();
      tasks.forEach(scheduleReminder);
    } catch (problem) {
      const banner = document.createElement('div'); banner.className = 'server-banner'; banner.setAttribute('role', 'alert'); banner.textContent = `Daymark couldn’t load saved information from this browser: ${problem.message}`; document.body.prepend(banner);
    }
  }

  document.addEventListener('click', event => {
    const open = event.target.closest('[data-open-task]'); if (open) openTask();
    const close = event.target.closest('[data-close-task]'); if (close) closeTask();
    const action = event.target.closest('[data-task-action]'); if (action) { const row = action.closest('[data-task-id]'); if (row) changeTask(row.dataset.taskId, action.dataset.taskAction); }
    if (event.target.closest('[data-notification-button]')) enableNotifications();
    if (event.target.closest('[data-export-data]')) window.Daymark.exportBackup();
    if (event.target.closest('[data-clear-data]') && window.confirm('Clear every Daymark task, reflection, and preference saved in this browser? This cannot be undone.')) {
      if (window.Daymark.clearData()) location.assign('index.html');
    }
  });
  document.addEventListener('change', async event => {
    const input = event.target.closest('[data-import-backup]');
    const file = input?.files?.[0];
    if (!file) return;
    try {
      await window.Daymark.importBackup(file);
      window.Daymark.toast('Your backup has been restored.', 'success');
      window.setTimeout(() => location.reload(), 500);
    } catch (problem) {
      window.Daymark.toast(problem.message || 'Daymark could not read that backup.', 'error');
      input.value = '';
    }
  });
  document.querySelectorAll('[data-task-form]').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); submitTask(event.currentTarget); }));

  window.DaymarkApp = { get tasks() { return tasks; }, get journal() { return journal; }, get preferences() { return preferences; }, get user() { return user; }, setJournal(entries) { journal = entries; }, setPreferences(value) { preferences = value; renderPage(); }, setUser(value) { user = value; renderPage(); }, render: renderPage };
  boot();
})();
