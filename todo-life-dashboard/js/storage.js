/* =============================================
   storage.js — LocalStorage Helper
   Keys:
     ld_todos     → array of task objects
     ld_links     → array of quick link objects
     ld_settings  → { darkMode, userName, timerModes }
   ============================================= */

const KEYS = {
  TODOS:    'ld_todos',
  LINKS:    'ld_links',
  SETTINGS: 'ld_settings',
};

/* ── Default values ──────────────────────────── */
const DEFAULT_SETTINGS = {
  darkMode:   false,
  userName:   '',
  timerModes: { pomodoro: 25, short: 5, long: 15 }, // in minutes
};

const DEFAULT_LINKS = [
  { id: 'link_default_1', label: 'Google Calendar', url: 'https://calendar.google.com', icon: '📅' },
  { id: 'link_default_2', label: 'Gmail',           url: 'https://gmail.com',            icon: '📧' },
  { id: 'link_default_3', label: 'Google Drive',    url: 'https://drive.google.com',     icon: '☁️' },
  { id: 'link_default_4', label: 'Notion',          url: 'https://notion.so',            icon: '📓' },
  { id: 'link_default_5', label: 'GitHub',          url: 'https://github.com',           icon: '🐙' },
  { id: 'link_default_6', label: 'YouTube',         url: 'https://youtube.com',          icon: '▶️' },
];

/* ── Generic read / write ─────────────────────── */
function _read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function _write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[Storage] write error:', e);
  }
}

function _genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ════════════════════════════════════════════════
   TODOS
   ════════════════════════════════════════════════ */
const Todos = {
  getAll()       { return _read(KEYS.TODOS, []); },
  saveAll(arr)   { _write(KEYS.TODOS, arr); },

  add(data) {
    const todos = this.getAll();
    const task  = {
      id:        _genId('task'),
      createdAt: new Date().toISOString(),
      completed: false,
      title:       data.title       || '',
      description: data.description || '',
      category:    data.category    || 'personal',
      priority:    data.priority    || 'medium',
      dueDate:     data.dueDate     || null,
    };
    todos.unshift(task);
    this.saveAll(todos);
    return task;
  },

  update(id, patch) {
    const todos = this.getAll();
    const i = todos.findIndex(t => t.id === id);
    if (i === -1) return null;
    todos[i] = { ...todos[i], ...patch, updatedAt: new Date().toISOString() };
    this.saveAll(todos);
    return todos[i];
  },

  remove(id) {
    const todos = this.getAll();
    const next  = todos.filter(t => t.id !== id);
    if (next.length === todos.length) return false;
    this.saveAll(next);
    return true;
  },

  toggle(id) {
    const todos = this.getAll();
    const task  = todos.find(t => t.id === id);
    if (!task) return null;
    return this.update(id, { completed: !task.completed });
  },

  clearCompleted() {
    const todos  = this.getAll();
    const active = todos.filter(t => !t.completed);
    this.saveAll(active);
    return todos.length - active.length;
  },

  getStats() {
    const todos = this.getAll();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      total:     todos.length,
      active:    todos.filter(t => !t.completed).length,
      completed: todos.filter(t =>  t.completed).length,
      overdue:   todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length,
    };
  },

  countByCategory() {
    const counts = {};
    this.getAll().forEach(t => {
      if (!t.completed) counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  },
};

/* ════════════════════════════════════════════════
   QUICK LINKS
   ════════════════════════════════════════════════ */
const Links = {
  getAll() {
    const stored = _read(KEYS.LINKS, null);
    // First-run: seed defaults
    if (stored === null) {
      _write(KEYS.LINKS, DEFAULT_LINKS);
      return DEFAULT_LINKS;
    }
    return stored;
  },

  saveAll(arr) { _write(KEYS.LINKS, arr); },

  add(data) {
    const links = this.getAll();
    const link  = {
      id:    _genId('link'),
      label: data.label || 'Link',
      url:   data.url   || '#',
      icon:  data.icon  || '🔗',
    };
    links.push(link);
    this.saveAll(links);
    return link;
  },

  update(id, patch) {
    const links = this.getAll();
    const i = links.findIndex(l => l.id === id);
    if (i === -1) return null;
    links[i] = { ...links[i], ...patch };
    this.saveAll(links);
    return links[i];
  },

  remove(id) {
    const links = this.getAll();
    const next  = links.filter(l => l.id !== id);
    if (next.length === links.length) return false;
    this.saveAll(next);
    return true;
  },
};

/* ════════════════════════════════════════════════
   SETTINGS
   ════════════════════════════════════════════════ */
const Settings = {
  get()          { return { ...DEFAULT_SETTINGS, ..._read(KEYS.SETTINGS, {}) }; },
  save(patch)    { _write(KEYS.SETTINGS, { ...this.get(), ...patch }); },

  getDarkMode()  { return this.get().darkMode; },
  setDarkMode(v) { this.save({ darkMode: v }); },

  getUserName()  { return this.get().userName; },
  setUserName(n) { this.save({ userName: n }); },

  getTimerModes()  { return { ...DEFAULT_SETTINGS.timerModes, ...this.get().timerModes }; },
  setTimerModes(m) { this.save({ timerModes: { ...this.getTimerModes(), ...m } }); },
};

/* ── Backward-compat alias (used by legacy code) ── */
const Storage = {
  getAll:           () => Todos.getAll(),
  add:              (d) => Todos.add(d),
  update:           (id, p) => Todos.update(id, p),
  remove:           (id) => Todos.remove(id),
  toggleComplete:   (id) => Todos.toggle(id),
  clearCompleted:   () => Todos.clearCompleted(),
  getStats:         () => Todos.getStats(),
  getCountByCategory: () => Todos.countByCategory(),
};
