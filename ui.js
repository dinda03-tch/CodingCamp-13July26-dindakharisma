/* =============================================
   ui.js — DOM Manipulation & Rendering
   Handles: tasks, quick links, modals, toasts,
            dark mode, sidebar, greeting.
   ============================================= */

const UI = (() => {

  /* ─────────────────────────────────────────────
     UTILITY
     ───────────────────────────────────────────── */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function $(id) { return document.getElementById(id); }

  /* ─────────────────────────────────────────────
     DARK MODE
     ───────────────────────────────────────────── */
  function applyDarkMode(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const btn = $('darkModeBtn');
    if (btn) {
      btn.textContent = isDark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode');
      btn.setAttribute('aria-pressed', isDark);
    }
  }

  /* ─────────────────────────────────────────────
     GREETING & NAME
     ───────────────────────────────────────────── */
  function renderGreeting(name) {
    const hour = new Date().getHours();
    let salutation, emoji;
    if      (hour >= 5  && hour < 12) { salutation = 'Good Morning';   emoji = '☀️'; }
    else if (hour >= 12 && hour < 15) { salutation = 'Good Afternoon'; emoji = '🌤️'; }
    else if (hour >= 15 && hour < 18) { salutation = 'Good Evening';   emoji = '🌇'; }
    else                               { salutation = 'Good Night';     emoji = '🌙'; }

    const display = name ? `, ${escapeHTML(name)}` : '!';
    const greetEl = $('greetingText');
    const nameEl  = $('greetingName');
    if (greetEl) greetEl.textContent = `${salutation}${display} ${emoji}`;
    if (nameEl)  nameEl.hidden = true; // judul h1 digantikan oleh greetingText
  }

  /* ─────────────────────────────────────────────
     CLOCK
     ───────────────────────────────────────────── */
  function tickClock() {
    const now  = new Date();
    const timeEl = $('clockTime');
    const dateEl = $('currentDate');
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
      timeEl.setAttribute('datetime', now.toISOString());
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    }
  }

  /* ─────────────────────────────────────────────
     PROGRESS RING & STATS
     ───────────────────────────────────────────── */
  function updateStats(stats) {
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('statTotal',    stats.total);
    set('statActive',   stats.active);
    set('statDone',     stats.completed);
    set('statOverdue',  stats.overdue);
    set('completedCount', stats.completed);
    set('totalCount',     stats.total);
    _updateRing(stats.total, stats.completed);
  }

  function _updateRing(total, completed) {
    const circle = $('progressCircle');
    const label  = $('progressPercent');
    if (!circle) return;
    const C       = 213.6;
    const pct     = total === 0 ? 0 : Math.round((completed / total) * 100);
    circle.style.strokeDashoffset = C - (pct / 100) * C;
    if (label) label.textContent = `${pct}%`;
  }

  function updateNavBadges(counts, totalActive) {
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('badge-all',      totalActive);
    set('badge-personal', counts.personal  || 0);
    set('badge-work',     counts.work      || 0);
    set('badge-health',   counts.health    || 0);
    set('badge-finance',  counts.finance   || 0);
    set('badge-learning', counts.learning  || 0);
  }

  function setActiveNav(category) {
    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.category === category)
    );
  }

  function setPageTitle(category) {
    const map = {
      all: 'Semua Tugas', personal: 'Personal', work: 'Pekerjaan',
      health: 'Kesehatan', finance: 'Keuangan', learning: 'Belajar',
    };
    const el = $('pageTitle');
    if (el) el.textContent = map[category] || 'Semua Tugas';
  }

  function setActiveFilter(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
  }

  /* ─────────────────────────────────────────────
     TASK LIST
     ───────────────────────────────────────────── */
  const CAT_LABELS = {
    personal: '👤 Personal', work: '💼 Pekerjaan',
    health: '💪 Kesehatan', finance: '💰 Keuangan', learning: '📚 Belajar',
  };
  const PRI_LABELS = { low: '🟢 Rendah', medium: '🟡 Sedang', high: '🔴 Tinggi' };

  function renderTasks(tasks) {
    const list  = $('taskList');
    const empty = $('emptyState');
    if (!list) return;

    list.innerHTML = '';
    if (tasks.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    const frag = document.createDocumentFragment();
    tasks.forEach(t => frag.appendChild(_makeTaskCard(t)));
    list.appendChild(frag);
  }

  function _makeTaskCard(task) {
    const card = document.createElement('article');
    card.className = `task-card${task.completed ? ' completed' : ''}`;
    card.dataset.id = task.id;
    card.setAttribute('role', 'listitem');

    const due = task.dueDate ? _dueDateTag(task.dueDate, task.completed) : '';

    card.innerHTML = `
      <div class="task-card__checkbox ${task.completed ? 'checked' : ''}"
           role="checkbox" aria-checked="${task.completed}" tabindex="0"
           data-action="toggle" data-id="${escapeHTML(task.id)}"
           aria-label="Tandai selesai: ${escapeHTML(task.title)}">
        ${task.completed ? '✓' : ''}
      </div>
      <div class="task-card__body">
        <p class="task-card__title">${escapeHTML(task.title)}</p>
        ${task.description ? `<p class="task-card__desc">${escapeHTML(task.description)}</p>` : ''}
        <div class="task-card__meta">
          <span class="tag tag--category">${CAT_LABELS[task.category] || task.category}</span>
          <span class="tag tag--priority-${task.priority}">${PRI_LABELS[task.priority] || task.priority}</span>
          ${due}
        </div>
      </div>
      <div class="task-card__actions">
        <button class="action-btn" data-action="edit"   data-id="${escapeHTML(task.id)}"
                title="Edit" aria-label="Edit tugas">✏️</button>
        <button class="action-btn delete" data-action="delete" data-id="${escapeHTML(task.id)}"
                title="Hapus" aria-label="Hapus tugas">🗑️</button>
      </div>`;
    return card;
  }

  function _dueDateTag(dueDate, completed) {
    const d     = new Date(dueDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const over  = !completed && d < today;
    const fmt   = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `<span class="tag tag--duedate${over ? ' overdue' : ''}">${over ? '⚠️' : '📅'} ${fmt}</span>`;
  }

  /* ─────────────────────────────────────────────
     TASK MODAL (Add / Edit)
     ───────────────────────────────────────────── */
  function openTaskModalAdd() {
    $('taskModalTitle').textContent  = 'Tambah Tugas';
    $('taskSubmitBtn').textContent   = 'Simpan Tugas';
    $('taskForm').reset();
    $('taskId').value = '';
    _clearTaskErrors();
    $('taskModalOverlay').hidden = false;
    $('taskTitle').focus();
  }

  function openTaskModalEdit(task) {
    $('taskModalTitle').textContent  = 'Edit Tugas';
    $('taskSubmitBtn').textContent   = 'Simpan Perubahan';
    $('taskId').value        = task.id;
    $('taskTitle').value     = task.title;
    $('taskDesc').value      = task.description || '';
    $('taskCategory').value  = task.category;
    $('taskPriority').value  = task.priority;
    $('taskDueDate').value   = task.dueDate || '';
    _clearTaskErrors();
    $('taskModalOverlay').hidden = false;
    $('taskTitle').focus();
  }

  function closeTaskModal() {
    $('taskModalOverlay').hidden = true;
    $('taskForm').reset();
    _clearTaskErrors();
  }

  function getTaskFormData() {
    return {
      id:          $('taskId').value.trim(),
      title:       $('taskTitle').value.trim(),
      description: $('taskDesc').value.trim(),
      category:    $('taskCategory').value,
      priority:    $('taskPriority').value,
      dueDate:     $('taskDueDate').value || null,
    };
  }

  function showTaskTitleError(msg) {
    $('taskTitle').classList.add('error');
    $('titleError').textContent = msg;
  }

  function _clearTaskErrors() {
    $('taskTitle').classList.remove('error');
    $('titleError').textContent = '';
  }

  /* ─────────────────────────────────────────────
     QUICK LINKS
     ───────────────────────────────────────────── */
  function renderLinks(links, editMode) {
    const grid = $('quickLinksGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const frag = document.createDocumentFragment();
    links.forEach(link => frag.appendChild(_makeLinkCard(link, editMode)));

    // "Add" tile always at end
    const addTile = document.createElement('li');
    addTile.innerHTML = `
      <button class="quick-link-card quick-link-card--add" id="addLinkBtn"
              aria-label="Tambah quick link">
        <span class="quick-link-card__icon" aria-hidden="true">＋</span>
        <span class="quick-link-card__label">Tambah Link</span>
      </button>`;
    frag.appendChild(addTile);

    grid.appendChild(frag);
  }

  function _makeLinkCard(link, editMode) {
    const li = document.createElement('li');
    if (editMode) {
      li.innerHTML = `
        <div class="quick-link-card quick-link-card--edit">
          <span class="quick-link-card__icon" aria-hidden="true">${escapeHTML(link.icon)}</span>
          <span class="quick-link-card__label">${escapeHTML(link.label)}</span>
          <div class="quick-link-card__actions">
            <button class="ql-action-btn" data-action="edit-link"   data-id="${escapeHTML(link.id)}"
                    aria-label="Edit ${escapeHTML(link.label)}">✏️</button>
            <button class="ql-action-btn delete" data-action="delete-link" data-id="${escapeHTML(link.id)}"
                    aria-label="Hapus ${escapeHTML(link.label)}">🗑️</button>
          </div>
        </div>`;
    } else {
      li.innerHTML = `
        <a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer"
           class="quick-link-card" aria-label="${escapeHTML(link.label)}">
          <span class="quick-link-card__icon" aria-hidden="true">${escapeHTML(link.icon)}</span>
          <span class="quick-link-card__label">${escapeHTML(link.label)}</span>
        </a>`;
    }
    return li;
  }

  /* ─────────────────────────────────────────────
     LINK MODAL (Add / Edit)
     ───────────────────────────────────────────── */
  function openLinkModalAdd() {
    $('linkModalTitle').textContent = 'Tambah Quick Link';
    $('linkSubmitBtn').textContent  = 'Simpan Link';
    $('linkForm').reset();
    $('linkId').value = '';
    _clearLinkErrors();
    $('linkModalOverlay').hidden = false;
    $('linkLabel').focus();
  }

  function openLinkModalEdit(link) {
    $('linkModalTitle').textContent = 'Edit Quick Link';
    $('linkSubmitBtn').textContent  = 'Simpan Perubahan';
    $('linkId').value    = link.id;
    $('linkLabel').value = link.label;
    $('linkUrl').value   = link.url;
    $('linkIcon').value  = link.icon;
    _clearLinkErrors();
    $('linkModalOverlay').hidden = false;
    $('linkLabel').focus();
  }

  function closeLinkModal() {
    $('linkModalOverlay').hidden = true;
    $('linkForm').reset();
    _clearLinkErrors();
  }

  function getLinkFormData() {
    return {
      id:    $('linkId').value.trim(),
      label: $('linkLabel').value.trim(),
      url:   $('linkUrl').value.trim(),
      icon:  $('linkIcon').value.trim() || '🔗',
    };
  }

  function showLinkError(field, msg) {
    $(field).classList.add('error');
    $(`${field}Error`).textContent = msg;
  }

  function _clearLinkErrors() {
    ['linkLabel', 'linkUrl'].forEach(id => {
      $(id).classList.remove('error');
    });
    $('linkLabelError').textContent = '';
    $('linkUrlError').textContent   = '';
  }

  /* ─────────────────────────────────────────────
     NAME MODAL
     ───────────────────────────────────────────── */
  function openNameModal(currentName) {
    $('nameInput').value = currentName || '';
    $('nameModalOverlay').hidden = false;
    $('nameInput').focus();
  }

  function closeNameModal() {
    $('nameModalOverlay').hidden = true;
  }

  /* ─────────────────────────────────────────────
     TIMER SETTINGS MODAL
     ───────────────────────────────────────────── */
  function openTimerSettingsModal(modes) {
    $('timerPomodoro').value = modes.pomodoro;
    $('timerShort').value    = modes.short;
    $('timerLong').value     = modes.long;
    $('timerSettingsOverlay').hidden = false;
    $('timerPomodoro').focus();
  }

  function closeTimerSettingsModal() {
    $('timerSettingsOverlay').hidden = true;
  }

  function getTimerSettingsData() {
    const clamp = (v, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || min));
    return {
      pomodoro: clamp($('timerPomodoro').value, 1, 120),
      short:    clamp($('timerShort').value,    1, 60),
      long:     clamp($('timerLong').value,     1, 60),
    };
  }

  /* ─────────────────────────────────────────────
     TOAST
     ───────────────────────────────────────────── */
  function showToast(message, type = 'info', duration = 3000) {
    const icons  = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast  = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<span aria-hidden="true">${icons[type] || ''}</span>
                       <span>${escapeHTML(message)}</span>`;
    $('toastContainer').appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  /* ─────────────────────────────────────────────
     SIDEBAR MOBILE
     ───────────────────────────────────────────── */
  function _ensureBackdrop() {
    if (!$('sidebarBackdrop')) {
      const bd = document.createElement('div');
      bd.className = 'sidebar-backdrop';
      bd.id = 'sidebarBackdrop';
      document.body.appendChild(bd);
    }
    return $('sidebarBackdrop');
  }

  function toggleSidebar() {
    const sb = $('sidebar');
    const bd = _ensureBackdrop();
    const open = sb.classList.toggle('open');
    bd.classList.toggle('show', open);
    $('sidebarToggle').setAttribute('aria-expanded', open);
  }

  function closeSidebar() {
    $('sidebar').classList.remove('open');
    const bd = $('sidebarBackdrop');
    if (bd) bd.classList.remove('show');
    $('sidebarToggle').setAttribute('aria-expanded', false);
  }

  /* ─────────────────────────────────────────────
     LEGACY ALIASES (backward compat with app.js)
     ───────────────────────────────────────────── */
  const openModalAdd  = openTaskModalAdd;
  const openModalEdit = openTaskModalEdit;
  const closeModal    = closeTaskModal;
  const getFormData   = getTaskFormData;
  const showTitleError = showTaskTitleError;
  const clearFormErrors = () => { /* handled internally */ };

  /* ─────────────────────────────────────────────
     PUBLIC API
     ───────────────────────────────────────────── */
  return {
    // dark mode
    applyDarkMode,
    // greeting / clock
    renderGreeting, tickClock,
    // stats
    updateStats, updateNavBadges, setActiveNav, setPageTitle, setActiveFilter,
    // tasks
    renderTasks,
    openTaskModalAdd, openTaskModalEdit, closeTaskModal,
    getTaskFormData, showTaskTitleError,
    // links
    renderLinks,
    openLinkModalAdd, openLinkModalEdit, closeLinkModal,
    getLinkFormData, showLinkError,
    // name
    openNameModal, closeNameModal,
    // timer settings
    openTimerSettingsModal, closeTimerSettingsModal, getTimerSettingsData,
    // toast / sidebar
    showToast, toggleSidebar, closeSidebar,
    // legacy
    openModalAdd, openModalEdit, closeModal, getFormData,
    showTitleError, clearFormErrors,
  };

})();
