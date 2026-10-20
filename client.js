(() => {
  const STORAGE_KEY = 'daymark.browser.v1';
  const defaultState = () => ({
    user: { name: 'Friend' },
    tasks: [],
    entries: [],
    preferences: { focus_window: 'flexible', wake_time: '', bed_time: '' }
  });

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return defaultState();
      return {
        ...defaultState(),
        ...saved,
        user: { ...defaultState().user, ...(saved.user || {}) },
        tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
        entries: Array.isArray(saved.entries) ? saved.entries : [],
        preferences: { ...defaultState().preferences, ...(saved.preferences || {}) }
      };
    } catch {
      return defaultState();
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updated_at: new Date().toISOString() }));
    } catch {
      throw new Error('Daymark could not save this change in your browser. Check available storage, then try again.');
    }
  }

  async function api(path, options = {}) {
    const state = readState();
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body || {};

    if (path === '/api/auth/me') return { user: state.user };
    if (path === '/api/auth/logout') return { ok: true };
    if (path === '/api/tasks' && method === 'GET') return { tasks: state.tasks };
    if (path === '/api/tasks' && method === 'PUT') {
      state.tasks = Array.isArray(body.tasks) ? body.tasks : [];
      writeState(state);
      return { tasks: state.tasks };
    }
    if (path === '/api/journal' && method === 'GET') return { entries: state.entries };
    if (path === '/api/journal' && method === 'PUT') {
      const incoming = Array.isArray(body.entries) ? body.entries : [];
      const byDate = new Map(state.entries.map(entry => [entry.date, entry]));
      incoming.forEach(entry => byDate.set(entry.date, entry));
      state.entries = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
      writeState(state);
      return { entries: state.entries };
    }
    if (path === '/api/preferences' && method === 'GET') return { preferences: state.preferences };
    if (path === '/api/preferences' && method === 'PUT') {
      state.preferences = { ...state.preferences, ...(body.preferences || {}) };
      writeState(state);
      return { preferences: state.preferences };
    }
    if (path === '/api/profile' && method === 'PUT') {
      const name = String(body.name || '').trim().slice(0, 60) || 'Friend';
      state.user = { ...state.user, name };
      writeState(state);
      return { user: state.user };
    }
    throw new Error('That Daymark action is not available in this version.');
  }

  function toast(message, kind = 'info') {
    const region = document.querySelector('[data-toast-region]');
    if (!region) return;
    const item = document.createElement('div');
    item.className = `toast toast-${kind}`;
    item.textContent = message;
    region.append(item);
    window.setTimeout(() => item.remove(), 5000);
  }

  function todayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function formatTime(value) {
    if (!value) return '';
    const [hour, minute] = value.split(':').map(Number);
    const date = new Date(); date.setHours(hour, minute, 0, 0);
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function safe(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function exportBackup() {
    const data = { format: 'daymark-browser-backup-v1', exported_at: new Date().toISOString(), ...readState() };
    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daymark-backup-${todayKey()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Your Daymark backup has been downloaded.', 'success');
  }

  function clearData() {
    try { localStorage.removeItem(STORAGE_KEY); return true; }
    catch { toast('The browser could not clear Daymark’s saved data.', 'error'); return false; }
  }

  async function importBackup(file) {
    const backup = JSON.parse(await file.text());
    if (backup.format !== 'daymark-browser-backup-v1' || !Array.isArray(backup.tasks) || !Array.isArray(backup.entries) || !backup.preferences || typeof backup.preferences !== 'object') {
      throw new Error('That file is not a Daymark backup. Choose a backup downloaded from Profile.');
    }
    const state = {
      user: backup.user && typeof backup.user === 'object' ? backup.user : defaultState().user,
      tasks: backup.tasks,
      entries: backup.entries,
      preferences: { ...defaultState().preferences, ...backup.preferences }
    };
    writeState(state);
  }

  window.Daymark = { api, toast, todayKey, formatTime, safe, exportBackup, importBackup, clearData };
})();
