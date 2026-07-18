/* =============================================
   app.js — Entry Point & Application Logic
   ============================================= */

const App = (() => {

  /* ─────────────────────────────────────────────
     APP STATE
     ───────────────────────────────────────────── */
  const state = {
    activeCategory: 'all',
    activeFilter:   'all',
    searchQuery:    '',
    sortBy:         'newest',
    linksEditMode:  false,
  };

  /* ─────────────────────────────────────────────
     TIMER STATE
     ───────────────────────────────────────────── */
  const timer = {
    modes:       { pomodoro: 25 * 60, short: 5 * 60, long: 15 * 60 },
    currentMode: 'pomodoro',
    remaining:   25 * 60,
    running:     false,
    sessions:    0,
    _interval:   null,
  };

  const TIMER_LABELS = {
    pomodoro: 'Fokus — tetap semangat! 💪',
    short:    'Istirahat sebentar ☕',
    long:     'Istirahat panjang, recharge! 🌿',
  };

  /* ═════════════════════════════════════════════
     BOOTSTRAP
     ═════════════════════════════════════════════ */
  function init() {
    _initSettings();
    _initClock();
    _initTimer();
    _refreshTodos();
    _refreshLinks();
    _bindAll();
  }

  /* ─────────────────────────────────────────────
     SETTINGS INIT
     ───────────────────────────────────────────── */
  function _initSettings() {
    // Dark mode
    UI.applyDarkMode(Settings.getDarkMode());

    // Greeting with saved name
    UI.renderGreeting(Settings.getUserName());

    // Timer durations from saved settings
    const saved = Settings.getTimerModes();
    timer.modes.pomodoro = saved.pomodoro * 60;
    timer.modes.short    = saved.short    * 60;
    timer.modes.long     = saved.long     * 60;
    timer.remaining      = timer.modes[timer.currentMode];
  }

  /* ─────────────────────────────────────────────
     CLOCK
     ───────────────────────────────────────────── */
  function _initClock() {
    UI.tickClock();
    setInterval(UI.tickClock, 1000);
  }

  /* ─────────────────────────────────────────────
     TODOS
     ───────────────────────────────────────────── */
  function _refreshTodos() {
    let tasks = Todos.getAll();
    tasks = _filterByCategory(tasks, state.activeCategory);
    tasks = _filterByStatus(tasks,   state.activeFilter);
    tasks = _filterBySearch(tasks,   state.searchQuery);
    tasks = _sortTasks(tasks,        state.sortBy);

    UI.renderTasks(tasks);
    UI.updateStats(Todos.getStats());
    UI.updateNavBadges(Todos.countByCategory(), Todos.getStats().active);
  }

  function _filterByCategory(tasks, cat) {
    return cat === 'all' ? tasks : tasks.filter(t => t.category === cat);
  }

  function _filterByStatus(tasks, filter) {
    if (filter === 'active')    return tasks.filter(t => !t.completed);
    if (filter === 'completed') return tasks.filter(t =>  t.completed);
    return tasks;
  }

  function _filterBySearch(tasks, q) {
    if (!q) return tasks;
    const lq = q.toLowerCase();
    return tasks.filter(t =>
      t.title.toLowerCase().includes(lq) ||
      (t.description && t.description.toLowerCase().includes(lq))
    );
  }

  function _sortTasks(tasks, by) {
    const PRI = { high: 0, medium: 1, low: 2 };
    return [...tasks].sort((a, b) => {
      if (by === 'oldest')   return new Date(a.createdAt) - new Date(b.createdAt);
      if (by === 'priority') return (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1);
      if (by === 'duedate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });
  }

  /* ── Task CRUD handlers ─────────────────────── */
  function _handleTaskSubmit(e) {
    e.preventDefault();
    const data = UI.getTaskFormData();

    if (!data.title) {
      UI.showTaskTitleError('Judul tugas tidak boleh kosong.');
      return;
    }
    if (data.title.length > 100) {
      UI.showTaskTitleError('Judul tugas maksimal 100 karakter.');
      return;
    }

    if (data.id) {
      Todos.update(data.id, {
        title: data.title, description: data.description,
        category: data.category, priority: data.priority, dueDate: data.dueDate,
      });
      UI.showToast('Tugas berhasil diperbarui!', 'success');
    } else {
      Todos.add({
        title: data.title, description: data.description,
        category: data.category, priority: data.priority, dueDate: data.dueDate,
      });
      UI.showToast('Tugas berhasil ditambahkan!', 'success');
    }

    UI.closeTaskModal();
    _refreshTodos();
  }

  function _handleToggleTask(id) {
    const task = Todos.toggle(id);
    if (!task) return;
    UI.showToast(
      task.completed ? 'Tugas selesai 🎉' : 'Tugas diaktifkan kembali.',
      task.completed ? 'success' : 'info'
    );
    _refreshTodos();
  }

  function _handleEditTask(id) {
    const task = Todos.getAll().find(t => t.id === id);
    if (task) UI.openTaskModalEdit(task);
  }

  function _handleDeleteTask(id) {
    const task = Todos.getAll().find(t => t.id === id);
    if (!task) return;
    if (!confirm(`Hapus tugas "${task.title}"?`)) return;
    Todos.remove(id);
    UI.showToast('Tugas dihapus.', 'error');
    _refreshTodos();
  }

  /* ─────────────────────────────────────────────
     QUICK LINKS
     ───────────────────────────────────────────── */
  function _refreshLinks() {
    UI.renderLinks(Links.getAll(), state.linksEditMode);
    // Re-bind add button rendered inside the grid
    const addBtn = document.getElementById('addLinkBtn');
    if (addBtn) addBtn.addEventListener('click', UI.openLinkModalAdd);
  }

  function _handleLinkSubmit(e) {
    e.preventDefault();
    const data = UI.getLinkFormData();
    let valid = true;

    if (!data.label) {
      UI.showLinkError('linkLabel', 'Nama link tidak boleh kosong.');
      valid = false;
    }
    if (!data.url) {
      UI.showLinkError('linkUrl', 'URL tidak boleh kosong.');
      valid = false;
    } else if (!/^https?:\/\/.+/.test(data.url)) {
      UI.showLinkError('linkUrl', 'URL harus diawali https:// atau http://');
      valid = false;
    }
    if (!valid) return;

    if (data.id) {
      Links.update(data.id, { label: data.label, url: data.url, icon: data.icon });
      UI.showToast('Link diperbarui!', 'success');
    } else {
      Links.add({ label: data.label, url: data.url, icon: data.icon });
      UI.showToast('Link ditambahkan!', 'success');
    }

    UI.closeLinkModal();
    _refreshLinks();
  }

  function _handleEditLink(id) {
    const link = Links.getAll().find(l => l.id === id);
    if (link) UI.openLinkModalEdit(link);
  }

  function _handleDeleteLink(id) {
    const link = Links.getAll().find(l => l.id === id);
    if (!link) return;
    if (!confirm(`Hapus link "${link.label}"?`)) return;
    Links.remove(id);
    UI.showToast('Link dihapus.', 'error');
    _refreshLinks();
  }

  /* ─────────────────────────────────────────────
     DARK MODE
     ───────────────────────────────────────────── */
  function _toggleDarkMode() {
    const next = !Settings.getDarkMode();
    Settings.setDarkMode(next);
    UI.applyDarkMode(next);
    UI.showToast(next ? 'Dark mode aktif 🌙' : 'Light mode aktif ☀️', 'info', 2000);
  }

  /* ─────────────────────────────────────────────
     NAME
     ───────────────────────────────────────────── */
  function _handleNameSave(e) {
    e.preventDefault();
    const nameVal = document.getElementById('nameInput').value.trim();
    Settings.setUserName(nameVal);
    UI.renderGreeting(nameVal);
    UI.closeNameModal();
    UI.showToast('Nama tersimpan!', 'success', 2000);
  }

  /* ─────────────────────────────────────────────
     FOCUS TIMER
     ───────────────────────────────────────────── */
  function _initTimer() {
    _renderTimer();
  }

  function _renderTimer() {
    const mins = String(Math.floor(timer.remaining / 60)).padStart(2, '0');
    const secs = String(timer.remaining % 60).padStart(2, '0');

    const display = document.getElementById('timerDisplay');
    const label   = document.getElementById('timerLabel');
    const sessEl  = document.getElementById('timerSessions');
    const startBtn = document.getElementById('timerStartBtn');

    if (display)  display.textContent = `${mins}:${secs}`;
    if (label)    label.textContent   = TIMER_LABELS[timer.currentMode];
    if (sessEl)   sessEl.textContent  = timer.sessions;

    if (startBtn) {
      if (timer.running) {
        startBtn.textContent = '⏸ Pause';
        startBtn.classList.add('running');
        startBtn.setAttribute('aria-label', 'Jeda timer');
      } else {
        startBtn.textContent = '▶ Mulai';
        startBtn.classList.remove('running');
        startBtn.setAttribute('aria-label', 'Mulai timer');
      }
    }

    // Update document title while running
    document.title = timer.running
      ? `${mins}:${secs} — Life Dashboard`
      : 'Life Dashboard';
  }

  function _startTimer() {
    if (timer.running) {
      clearInterval(timer._interval);
      timer.running = false;
    } else {
      timer.running = true;
      timer._interval = setInterval(() => {
        timer.remaining--;
        _renderTimer();
        if (timer.remaining <= 0) {
          clearInterval(timer._interval);
          timer.running = false;
          if (timer.currentMode === 'pomodoro') timer.sessions++;
          UI.showToast(
            timer.currentMode === 'pomodoro'
              ? '🎉 Sesi fokus selesai! Saatnya istirahat.'
              : '⚡ Istirahat selesai! Yuk, fokus lagi.',
            'success', 5000
          );
          timer.remaining = timer.modes[timer.currentMode];
          _renderTimer();
        }
      }, 1000);
    }
    _renderTimer();
  }

  function _resetTimer() {
    clearInterval(timer._interval);
    timer.running   = false;
    timer.remaining = timer.modes[timer.currentMode];
    _renderTimer();
  }

  function _switchTimerMode(mode) {
    clearInterval(timer._interval);
    timer.running     = false;
    timer.currentMode = mode;
    timer.remaining   = timer.modes[mode];

    // Update both old .mode-btn and new .timer-tab
    document.querySelectorAll('.mode-btn, .timer-tab').forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
    _renderTimer();
  }

  function _handleTimerSettingsSave(e) {
    e.preventDefault();
    const data = UI.getTimerSettingsData();

    // Persist to storage
    Settings.setTimerModes(data);

    // Apply to live timer state
    timer.modes.pomodoro = data.pomodoro * 60;
    timer.modes.short    = data.short    * 60;
    timer.modes.long     = data.long     * 60;

    // Reset current mode with new duration
    _resetTimer();

    UI.closeTimerSettingsModal();
    UI.showToast('Durasi timer disimpan!', 'success', 2000);
  }

  /* ─────────────────────────────────────────────
     EVENT BINDING
     ───────────────────────────────────────────── */
  function _bindAll() {
    /* ── Dark mode ───────────────── */
    document.getElementById('darkModeBtn')
      ?.addEventListener('click', _toggleDarkMode);

    /* ── Name modal ──────────────── */
    document.getElementById('editNameBtn')
      ?.addEventListener('click', () => UI.openNameModal(Settings.getUserName()));
    document.getElementById('nameForm')
      ?.addEventListener('submit', _handleNameSave);
    document.getElementById('nameModalClose')
      ?.addEventListener('click', UI.closeNameModal);
    document.getElementById('nameModalCancel')
      ?.addEventListener('click', UI.closeNameModal);
    document.getElementById('nameModalOverlay')
      ?.addEventListener('click', e => { if (e.target === e.currentTarget) UI.closeNameModal(); });

    /* ── Timer ───────────────────── */
    document.getElementById('timerStartBtn')
      ?.addEventListener('click', _startTimer);
    document.getElementById('timerResetBtn')
      ?.addEventListener('click', _resetTimer);
    // Support both old .mode-btn and new .timer-tab class names
    document.querySelectorAll('.mode-btn, .timer-tab').forEach(btn =>
      btn.addEventListener('click', () => _switchTimerMode(btn.dataset.mode))
    );
    document.getElementById('timerSettingsBtn')
      ?.addEventListener('click', () => UI.openTimerSettingsModal(Settings.getTimerModes()));
    document.getElementById('timerSettingsForm')
      ?.addEventListener('submit', _handleTimerSettingsSave);
    document.getElementById('timerSettingsClose')
      ?.addEventListener('click', UI.closeTimerSettingsModal);
    document.getElementById('timerSettingsCancel')
      ?.addEventListener('click', UI.closeTimerSettingsModal);
    document.getElementById('timerSettingsOverlay')
      ?.addEventListener('click', e => { if (e.target === e.currentTarget) UI.closeTimerSettingsModal(); });

    /* ── Task modal ──────────────── */
    document.getElementById('openModalBtn')
      ?.addEventListener('click', UI.openTaskModalAdd);
    document.getElementById('emptyAddBtn')
      ?.addEventListener('click', UI.openTaskModalAdd);
    document.getElementById('taskModalClose')
      ?.addEventListener('click', UI.closeTaskModal);
    document.getElementById('taskCancelBtn')
      ?.addEventListener('click', UI.closeTaskModal);
    document.getElementById('taskModalOverlay')
      ?.addEventListener('click', e => { if (e.target === e.currentTarget) UI.closeTaskModal(); });
    document.getElementById('taskForm')
      ?.addEventListener('submit', _handleTaskSubmit);

    /* ── Task list delegation ────── */
    document.getElementById('taskList')?.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const { action, id } = el.dataset;
      if (action === 'toggle') _handleToggleTask(id);
      if (action === 'edit')   _handleEditTask(id);
      if (action === 'delete') _handleDeleteTask(id);
    });
    document.getElementById('taskList')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const cb = e.target.closest('[data-action="toggle"]');
        if (cb) { e.preventDefault(); _handleToggleTask(cb.dataset.id); }
      }
    });

    /* ── Quick links ─────────────── */
    document.getElementById('quickLinksGrid')?.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const { action, id } = el.dataset;
      if (action === 'edit-link')   _handleEditLink(id);
      if (action === 'delete-link') _handleDeleteLink(id);
    });
    document.getElementById('linksEditToggle')?.addEventListener('click', () => {
      state.linksEditMode = !state.linksEditMode;
      const btn = document.getElementById('linksEditToggle');
      btn.textContent = state.linksEditMode ? '✅ Selesai' : '✏️ Edit';
      btn.setAttribute('aria-pressed', state.linksEditMode);
      _refreshLinks();
    });
    document.getElementById('linkForm')
      ?.addEventListener('submit', _handleLinkSubmit);
    document.getElementById('linkModalClose')
      ?.addEventListener('click', UI.closeLinkModal);
    document.getElementById('linkModalCancel')
      ?.addEventListener('click', UI.closeLinkModal);
    document.getElementById('linkModalOverlay')
      ?.addEventListener('click', e => { if (e.target === e.currentTarget) UI.closeLinkModal(); });

    /* ── Top nav category buttons (new layout) ── */
    document.querySelectorAll('.cat-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        state.activeCategory = btn.dataset.category;
        // Update active state on cat-btns
        document.querySelectorAll('.cat-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.category === state.activeCategory)
        );
        UI.setPageTitle(state.activeCategory);
        _refreshTodos();
      })
    );

    /* ── Sidebar nav (legacy, hidden on new layout) ── */
    document.querySelectorAll('.nav-item').forEach(item =>
      item.addEventListener('click', () => {
        state.activeCategory = item.dataset.category;
        UI.setActiveNav(state.activeCategory);
        UI.setPageTitle(state.activeCategory);
        if (window.innerWidth <= 768) UI.closeSidebar();
        _refreshTodos();
      })
    );
    document.getElementById('sidebarToggle')
      ?.addEventListener('click', UI.toggleSidebar);
    document.addEventListener('click', e => {
      if (e.target.id === 'sidebarBackdrop') UI.closeSidebar();
    });

    /* ── Filter / sort / search ──── */
    document.querySelectorAll('.filter-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        state.activeFilter = btn.dataset.filter;
        UI.setActiveFilter(state.activeFilter);
        _refreshTodos();
      })
    );
    document.getElementById('sortSelect')
      ?.addEventListener('change', e => {
        state.sortBy = e.target.value;
        _refreshTodos();
      });

    let searchTimer;
    document.getElementById('searchInput')
      ?.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          state.searchQuery = e.target.value.trim();
          _refreshTodos();
        }, 300);
      });

    /* ── Global Escape key ───────── */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      UI.closeTaskModal();
      UI.closeLinkModal();
      UI.closeNameModal();
      UI.closeTimerSettingsModal();
    });
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', App.init);
