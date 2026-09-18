const API = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? `${window.location.protocol}//${window.location.hostname}:4000/api`
  : `${window.location.origin}/api`;

const state = {
  tasks: [],
  goals: [],
  status: 'all',
  search: '',
  priority: 'all',
  category: 'all'
};

const els = {
  sidebar: document.getElementById('sidebar'),
  menuToggle: document.getElementById('menuToggle'),
  themeToggle: document.getElementById('themeToggle'),
  logout: document.getElementById('logout'),
  pageTitle: document.getElementById('pageTitle'),
  taskForm: document.getElementById('taskForm'),
  tasksList: document.getElementById('tasksList'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  priority: document.getElementById('priority'),
  category: document.getElementById('category'),
  due: document.getElementById('due'),
  reminder: document.getElementById('reminder'),
  progress: document.getElementById('progress'),
  search: document.getElementById('search'),
  priorityFilter: document.getElementById('priorityFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  calendarGrid: document.getElementById('calendarGrid'),
  notifications: document.getElementById('notifications'),
  goalForm: document.getElementById('goalForm'),
  goalsList: document.getElementById('goalsList'),
  gTitle: document.getElementById('gTitle'),
  gNotes: document.getElementById('gNotes'),
  gTarget: document.getElementById('gTarget'),
  gProgress: document.getElementById('gProgress')
};

const viewTitles = {
  overview: 'Overview',
  tasks: 'Tasks',
  calendar: 'Calendar',
  goals: 'Goals'
};

const searchPlaceholders = {
  overview: 'Search tasks and goals',
  tasks: 'Search tasks',
  calendar: 'Search date',
  goals: 'Search goals'
};

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(value) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

function formatFullDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function setTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('dailyTasksTheme', theme);
}

function activePage() {
  return document.body.dataset.page || 'overview';
}

function syncSearchFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search') || '';
  state.search = search.trim().toLowerCase();
  els.search.value = search;
}

function showView(view) {
  const activeView = viewTitles[view] ? view : 'overview';
  document.querySelectorAll('[data-view]').forEach(section => {
    section.hidden = section.dataset.view !== activeView;
  });
  document.querySelectorAll('[data-view-link]').forEach(link => {
    link.classList.toggle('active', link.dataset.viewLink === activeView);
  });
  els.pageTitle.textContent = viewTitles[activeView];
  els.search.placeholder = searchPlaceholders[activeView] || 'Search';
}

function filteredTasks() {
  return state.tasks.filter(task => {
    const term = `${task.title} ${task.description} ${task.category}`.toLowerCase();
    const matchesSearch = term.includes(state.search);
    const matchesPriority = state.priority === 'all' || task.priority === state.priority;
    const matchesCategory = state.category === 'all' || task.category === state.category;
    const matchesStatus =
      state.status === 'all' ||
      (state.status === 'open' && !task.completed) ||
      (state.status === 'done' && task.completed);
    return matchesSearch && matchesPriority && matchesCategory && matchesStatus;
  });
}

function filteredGoals() {
  return state.goals.filter(goal => {
    const term = `${goal.title} ${goal.notes} ${goal.status} ${formatFullDate(goal.targetDate)}`.toLowerCase();
    return term.includes(state.search);
  });
}

function taskMatchesSearch(task) {
  const term = `${task.title} ${task.description} ${task.category} ${task.priority} ${formatFullDate(task.dueDate)}`.toLowerCase();
  return term.includes(state.search);
}

function goalMatchesSearch(goal) {
  const term = `${goal.title} ${goal.notes} ${goal.status} ${formatFullDate(goal.targetDate)}`.toLowerCase();
  return term.includes(state.search);
}

function calendarDateMatchesSearch(date, tasks, goals) {
  if (!state.search) return true;
  const term = state.search;
  const numeric = /^\d+$/.test(term);
  if (numeric) {
    const value = Number(term);
    return date.getDate() === value || date.getFullYear() === value;
  }

  const dateText = [
    dateKey(date),
    date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}),
    date.toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'}),
    date.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})
  ].join(' ').toLowerCase();

  return dateText.includes(term) || tasks.some(taskMatchesSearch) || goals.some(goalMatchesSearch);
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: {'Content-Type': 'application/json', ...(options.headers || {})},
    ...options
  });
  if (res.status === 401) window.location.href = 'index.html';
  return res;
}

async function loadTasks() {
  const res = await api('/tasks');
  if (!res.ok) return;
  const data = await res.json();
  state.tasks = data.tasks;
  renderAll();
}

async function loadGoals() {
  const res = await api('/goals');
  if (!res.ok) return;
  const data = await res.json();
  state.goals = data.goals;
  renderGoals();
  renderCalendar();
  renderOverviewSearch();
}

async function loadAnalytics() {
  const res = await api('/analytics');
  if (!res.ok) return;
  const {analytics} = await res.json();
  document.getElementById('totalTasks').textContent = analytics.totalTasks;
  document.getElementById('completedTasks').textContent = analytics.completedTasks;
  document.getElementById('dueToday').textContent = analytics.dueToday;
  document.getElementById('overdueTasks').textContent = analytics.overdue;
  document.getElementById('completedToday').textContent = analytics.completedToday;
  document.getElementById('activeGoals').textContent = analytics.activeGoals;
  document.getElementById('avgProgress').textContent = `${analytics.avgProgress}%`;
  document.querySelector('.progress-ring').style.setProperty('--value', `${analytics.avgProgress}%`);
}

function renderAll() {
  renderCategories();
  renderTasks();
  renderCalendar();
  renderNotifications();
  renderOverviewSearch();
}

function renderCategories() {
  const categories = [...new Set(state.tasks.map(task => task.category || 'General'))].sort();
  els.categoryFilter.innerHTML = '<option value="all">All categories</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  });
  els.categoryFilter.value = state.category;
}

function renderTasks() {
  const tasks = filteredTasks();
  els.tasksList.innerHTML = tasks.length ? '' : '<p class="muted">No tasks match the current filters.</p>';
  tasks.forEach(task => {
    const card = document.createElement('article');
    card.className = 'task-card';
    const priorityClass = `priority-${(task.priority || 'medium').toLowerCase()}`;
    card.innerHTML = `
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p class="small">${escapeHtml(task.description || '')}</p>
        </div>
        <span class="pill ${priorityClass}">${escapeHtml(task.priority || 'Medium')}</span>
      </div>
      <div class="meta-row">
        <span class="pill">${escapeHtml(task.category || 'General')}</span>
        <span class="pill">Due ${formatDate(task.dueDate)}</span>
        <span class="pill">${task.completed ? 'Completed' : `${task.progress || 0}% done`}</span>
      </div>
      <div class="progress-line"><span style="width:${task.progress || 0}%"></span></div>
      <div class="card-actions">
        <button class="complete-button" data-action="complete" data-id="${task._id}" type="button">${task.completed ? 'Reopen' : 'Complete'}</button>
        <button class="ghost-button" data-action="plus" data-id="${task._id}" type="button">+25%</button>
        <button class="delete-button" data-action="delete" data-id="${task._id}" type="button">Delete</button>
      </div>
    `;
    els.tasksList.appendChild(card);
  });
}

function renderCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  els.calendarGrid.innerHTML = '';

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, month, day);
    const cell = document.createElement('div');
    const tasks = state.tasks.filter(task => task.dueDate && sameDay(new Date(task.dueDate), date));
    const goals = state.goals.filter(goal => goal.targetDate && sameDay(new Date(goal.targetDate), date));
    const matchesSearch = calendarDateMatchesSearch(date, tasks, goals);
    cell.className = [
      'calendar-day',
      sameDay(date, today) ? 'today' : '',
      state.search && matchesSearch ? 'calendar-day-match' : '',
      state.search && !matchesSearch ? 'calendar-day-muted' : ''
    ].filter(Boolean).join(' ');
    cell.dataset.date = dateKey(date);
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', `Open schedule for ${date.toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'})}`);
    cell.innerHTML = `<strong>${day}</strong>`;
    tasks.slice(0, 3).forEach(task => {
      cell.innerHTML += `<span class="calendar-task">${escapeHtml(task.title)}</span>`;
    });
    goals.slice(0, Math.max(0, 3 - tasks.length)).forEach(goal => {
      cell.innerHTML += `<span class="calendar-task calendar-goal">${escapeHtml(goal.title)}</span>`;
    });
    els.calendarGrid.appendChild(cell);
  }
}

function renderOverviewSearch() {
  const overview = document.getElementById('overview');
  if (!overview) return;

  document.getElementById('overviewSearchPanel')?.remove();
  if (activePage() !== 'overview' || !state.search) return;

  const tasks = state.tasks.filter(taskMatchesSearch);
  const goals = state.goals.filter(goalMatchesSearch);
  const panel = document.createElement('article');
  panel.id = 'overviewSearchPanel';
  panel.className = 'panel overview-search-panel';
  panel.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Search</p>
        <h2>Results</h2>
      </div>
    </div>
    <div class="overview-search-results">
      ${tasks.length || goals.length ? '' : '<p class="muted">No matching tasks or goals.</p>'}
      ${tasks.map(task => `
        <article class="search-result-item">
          <span class="pill">Task</span>
          <div>
            <h3>${escapeHtml(task.title)}</h3>
            <p class="small">Due ${formatDate(task.dueDate)} · ${escapeHtml(task.category || 'General')}</p>
          </div>
        </article>
      `).join('')}
      ${goals.map(goal => `
        <article class="search-result-item search-goal-result">
          <span class="pill">Goal</span>
          <div>
            <h3>${escapeHtml(goal.title)}</h3>
            <p class="small">Target ${formatDate(goal.targetDate)} · ${escapeHtml(goal.status || 'Active')}</p>
          </div>
        </article>
      `).join('')}
    </div>
  `;

  overview.insertBefore(panel, overview.querySelector('.content-grid'));
}

function tasksForDate(date) {
  return state.tasks
    .filter(task => task.dueDate && sameDay(new Date(task.dueDate), date))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return String(a.priority || '').localeCompare(String(b.priority || ''));
    });
}

function goalsForDate(date) {
  return state.goals
    .filter(goal => goal.targetDate && sameDay(new Date(goal.targetDate), date))
    .sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
}

function openDaySchedule(date) {
  document.querySelector('.schedule-modal')?.remove();

  const tasks = tasksForDate(date);
  const goals = goalsForDate(date);
  const title = date.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});
  const modal = document.createElement('div');
  modal.className = 'schedule-modal';
  modal.innerHTML = `
    <div class="schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="scheduleTitle">
      <div class="schedule-header">
        <div>
          <p class="eyebrow">Schedule</p>
          <h2 id="scheduleTitle">${escapeHtml(title)}</h2>
        </div>
        <button class="icon-button schedule-close" type="button" aria-label="Close schedule">Close</button>
      </div>
      <div class="schedule-list">
        ${tasks.length || goals.length ? '' : '<p class="muted">No tasks or goals scheduled for this day.</p>'}
        ${tasks.length ? '<h3 class="schedule-group-title">Tasks</h3>' : ''}
        ${tasks.map(task => `
          <article class="schedule-item">
            <div>
              <h3>${escapeHtml(task.title)}</h3>
              <p class="small">${escapeHtml(task.description || '')}</p>
            </div>
            <div class="meta-row">
              <span class="pill">${escapeHtml(task.category || 'General')}</span>
              <span class="pill ${`priority-${(task.priority || 'medium').toLowerCase()}`}">${escapeHtml(task.priority || 'Medium')}</span>
              <span class="pill">${task.completed ? 'Completed' : `${task.progress || 0}% done`}</span>
            </div>
          </article>
        `).join('')}
        ${goals.length ? '<h3 class="schedule-group-title">Goals</h3>' : ''}
        ${goals.map(goal => `
          <article class="schedule-item schedule-goal-item">
            <div>
              <h3>${escapeHtml(goal.title)}</h3>
              <p class="small">${escapeHtml(goal.notes || '')}</p>
            </div>
            <div class="meta-row">
              <span class="pill">${escapeHtml(goal.status || 'Active')}</span>
              <span class="pill">${goal.progress || 0}% complete</span>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('.schedule-close').focus();
}

function renderNotifications() {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(now.getDate() + 2);
  const reminders = state.tasks
    .filter(task => !task.completed && ((task.reminderAt && new Date(task.reminderAt) <= soon) || (task.dueDate && new Date(task.dueDate) <= soon)))
    .sort((a, b) => new Date(a.dueDate || a.reminderAt) - new Date(b.dueDate || b.reminderAt))
    .slice(0, 5);

  els.notifications.innerHTML = reminders.length ? '' : '<p class="muted">No upcoming reminders.</p>';
  reminders.forEach(task => {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = `<strong>${escapeHtml(task.title)}</strong><span class="small">Due ${formatDate(task.dueDate)} · ${escapeHtml(task.priority || 'Medium')} priority</span>`;
    els.notifications.appendChild(item);
  });
}

function renderGoals() {
  const goals = filteredGoals();
  els.goalsList.innerHTML = goals.length ? '' : `<p class="muted">${state.search ? 'No goals match the current search.' : 'No goals yet.'}</p>`;
  goals.forEach(goal => {
    const card = document.createElement('article');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-top">
        <div>
          <h3>${escapeHtml(goal.title)}</h3>
          <p class="small">${escapeHtml(goal.notes || '')}</p>
        </div>
        <span class="pill">${escapeHtml(goal.status || 'Active')}</span>
      </div>
      <div class="meta-row">
        <span class="pill">Target ${formatDate(goal.targetDate)}</span>
        <span class="pill">${goal.progress || 0}% complete</span>
      </div>
      <div class="progress-line"><span style="width:${goal.progress || 0}%"></span></div>
      <div class="card-actions">
        <button class="complete-button" data-goal-action="complete" data-id="${goal._id}" type="button">Complete</button>
        <button class="delete-button" data-goal-action="delete" data-id="${goal._id}" type="button">Delete</button>
      </div>
    `;
    els.goalsList.appendChild(card);
  });
}

function renderSearchContext() {
  const page = activePage();
  if (page === 'goals') {
    renderGoals();
    return;
  }
  if (page === 'calendar') {
    renderCalendar();
    return;
  }
  if (page === 'overview') {
    renderOverviewSearch();
    return;
  }
  renderTasks();
}

async function refreshMetrics() {
  await loadAnalytics();
}

els.taskForm.addEventListener('submit', async event => {
  event.preventDefault();
  const body = {
    title: els.title.value.trim(),
    description: els.description.value.trim(),
    priority: els.priority.value,
    category: els.category.value,
    dueDate: els.due.value || null,
    reminderAt: els.reminder.value || null,
    progress: Number(els.progress.value)
  };
  if (!body.title) return alert('Title required');

  const res = await api('/tasks', {method: 'POST', body: JSON.stringify(body)});
  if (!res.ok) return alert('Error adding task');
  const {task} = await res.json();
  state.tasks.unshift(task);
  els.taskForm.reset();
  els.progress.value = 0;
  renderAll();
  await refreshMetrics();
});

els.tasksList.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const task = state.tasks.find(item => item._id === button.dataset.id);
  if (!task) return;

  if (button.dataset.action === 'delete') {
    await api(`/tasks/${task._id}`, {method: 'DELETE'});
    state.tasks = state.tasks.filter(item => item._id !== task._id);
  } else {
    const progress = button.dataset.action === 'complete'
      ? (task.completed ? Math.min(task.progress || 0, 75) : 100)
      : Math.min(100, (task.progress || 0) + 25);
    const res = await api(`/tasks/${task._id}`, {method: 'PUT', body: JSON.stringify({progress})});
    if (res.ok) {
      const data = await res.json();
      state.tasks = state.tasks.map(item => item._id === task._id ? data.task : item);
    }
  }

  renderAll();
  await refreshMetrics();
});

els.calendarGrid.addEventListener('click', event => {
  const day = event.target.closest('.calendar-day');
  if (!day) return;
  openDaySchedule(dateFromKey(day.dataset.date));
});

els.calendarGrid.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key)) return;
  const day = event.target.closest('.calendar-day');
  if (!day) return;
  event.preventDefault();
  openDaySchedule(dateFromKey(day.dataset.date));
});

document.addEventListener('click', event => {
  const modal = event.target.closest('.schedule-modal');
  if (!modal) return;
  if (event.target.matches('.schedule-modal, .schedule-close')) modal.remove();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelector('.schedule-modal')?.remove();
});

els.goalForm.addEventListener('submit', async event => {
  event.preventDefault();
  const body = {
    title: els.gTitle.value.trim(),
    notes: els.gNotes.value.trim(),
    targetDate: els.gTarget.value || null,
    progress: Number(els.gProgress.value || 0)
  };
  if (!body.title) return alert('Goal title required');

  const res = await api('/goals', {method: 'POST', body: JSON.stringify(body)});
  if (!res.ok) return alert('Error adding goal');
  const {goal} = await res.json();
  state.goals.unshift(goal);
  els.goalForm.reset();
  renderGoals();
  renderCalendar();
  renderOverviewSearch();
  await refreshMetrics();
});

els.goalsList.addEventListener('click', async event => {
  const button = event.target.closest('button[data-goal-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.goalAction === 'delete') {
    await api(`/goals/${id}`, {method: 'DELETE'});
    state.goals = state.goals.filter(goal => goal._id !== id);
  } else {
    const res = await api(`/goals/${id}`, {method: 'PUT', body: JSON.stringify({progress: 100, status: 'Completed'})});
    if (res.ok) {
      const {goal} = await res.json();
      state.goals = state.goals.map(item => item._id === id ? goal : item);
    }
  }
  renderGoals();
  renderCalendar();
  renderOverviewSearch();
  await refreshMetrics();
});

els.search.addEventListener('input', event => {
  state.search = event.target.value.trim().toLowerCase();
  renderSearchContext();
});

els.priorityFilter.addEventListener('change', event => {
  state.priority = event.target.value;
  renderTasks();
});

els.categoryFilter.addEventListener('change', event => {
  state.category = event.target.value;
  renderTasks();
});

document.querySelectorAll('.filter-status').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-status').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    state.status = button.dataset.status;
    renderTasks();
  });
});

document.querySelectorAll('[data-view-link]').forEach(link => {
  link.addEventListener('click', () => {
    els.sidebar.classList.remove('open');
  });
});

els.menuToggle.addEventListener('click', () => els.sidebar.classList.toggle('open'));
els.themeToggle.addEventListener('click', () => setTheme(document.body.classList.contains('dark') ? 'light' : 'dark'));
els.logout.addEventListener('click', async () => {
  await api('/logout', {method: 'POST'});
  window.location.href = 'index.html';
});

setTheme(localStorage.getItem('dailyTasksTheme') || 'light');
syncSearchFromUrl();
showView(document.body.dataset.page || 'overview');
Promise.all([loadTasks(), loadGoals(), refreshMetrics()]);
