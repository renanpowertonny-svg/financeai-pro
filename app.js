/* ========================================
   FINANCEAI — Core Application Logic
   ======================================== */

'use strict';

// ==========================================
// STATE MANAGEMENT
// ==========================================
const DB = {
  get: (key, def = null) => {
    try {
      const v = localStorage.getItem('financeai_' + key);
      return v !== null ? JSON.parse(v) : def;
    } catch { return def; }
  },
  set: (key, val) => {
    try { localStorage.setItem('financeai_' + key, JSON.stringify(val)); } catch {}
  }
};

let state = {
  user: null,
  transactions: [],
  goals: [],
  notifications: [],
  settings: {
    salary: 0,
    limits: {},
    darkMode: true,
    notif: true,
    autoReport: true
  },
  currentPage: 'dashboard',
  period: 'month',
  charts: {},
  aiInsights: [],
  eduProgress: { completed: [], streak: 0, points: 0 }
};

// ==========================================
// AUTH
// ==========================================
function getEl(id) {
  return document.getElementById(id);
}

function clearAuthForms() {
  const ids = ['loginEmail', 'loginPassword', 'regName', 'regEmail', 'regPassword', 'regConfirm'];
  ids.forEach(id => {
    const el = getEl(id);
    if (el) el.value = '';
  });
}

function getStoredUsers() {
  return DB.get('users', {});
}

function saveStoredUsers(users) {
  DB.set('users', users);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    name: user.name || 'Usuário',
    email: normalizeEmail(user.email),
    createdAt: user.createdAt || new Date().toISOString()
  };
}

function showAuthScreen(tab = 'login') {
  const authScreen = getEl('authScreen');
  const app = getEl('app');

  destroyAllCharts();

  if (app) {
    app.classList.add('hidden');
    app.style.display = 'none';
  }

  if (authScreen) {
    authScreen.classList.add('active');
    authScreen.classList.remove('hidden');
    authScreen.style.display = 'flex';
    authScreen.style.visibility = 'visible';
    authScreen.style.opacity = '1';
  }

  switchAuthTab(tab);
}

function showAppScreen() {
  const authScreen = getEl('authScreen');
  const app = getEl('app');

  if (authScreen) {
    authScreen.classList.remove('active');
    authScreen.classList.add('hidden');
    authScreen.style.display = 'none';
  }

  if (app) {
    app.classList.remove('hidden');
    app.style.display = '';
    app.style.visibility = 'visible';
    app.style.opacity = '1';
  }
}

function restoreSession() {
  const currentUser = normalizeEmail(DB.get('currentUser', null));
  const users = getStoredUsers();

  if (currentUser && users[currentUser]) {
    state.user = sanitizeUser({ ...users[currentUser], email: currentUser });
    loadUserData();
    initApp();
    return true;
  }

  state.user = null;
  showAuthScreen('login');
  return false;
}

function handleLogin() {
  const email = normalizeEmail(getEl('loginEmail')?.value);
  const pwd = getEl('loginPassword')?.value || '';

  if (!email || !pwd) {
    showToast('error', 'Campos obrigatórios', 'Preencha email e senha.');
    return;
  }

  const users = getStoredUsers();
  const user = users[email];

  if (!user) {
    showToast('error', 'Acesso negado', 'Este email não foi encontrado.');
    return;
  }

  if (user.password !== btoa(pwd)) {
    showToast('error', 'Acesso negado', 'Senha incorreta.');
    return;
  }

  state.user = sanitizeUser({ ...user, email });
  DB.set('currentUser', email);
  loadUserData();
  initApp();
  showToast('success', 'Login realizado', `Bem-vindo de volta, ${state.user.name}!`);
}

function handleRegister() {
  const name = (getEl('regName')?.value || '').trim();
  const email = normalizeEmail(getEl('regEmail')?.value);
  const pwd = getEl('regPassword')?.value || '';
  const confirm = getEl('regConfirm')?.value || '';

  if (!name || !email || !pwd || !confirm) {
    showToast('error', 'Campos obrigatórios', 'Preencha todos os campos.');
    return;
  }

  if (!email.includes('@') || !email.includes('.')) {
    showToast('error', 'Email inválido', 'Digite um email válido.');
    return;
  }

  if (pwd.length < 8) {
    showToast('error', 'Senha fraca', 'A senha deve ter no mínimo 8 caracteres.');
    return;
  }

  if (pwd !== confirm) {
    showToast('error', 'Senhas diferentes', 'As senhas não coincidem.');
    return;
  }

  const users = getStoredUsers();

  if (users[email]) {
    showToast('error', 'Email já cadastrado', 'Use outro email ou faça login.');
    return;
  }

  users[email] = {
    name,
    password: btoa(pwd),
    createdAt: new Date().toISOString()
  };

  saveStoredUsers(users);

  state.user = sanitizeUser({ name, email, createdAt: users[email].createdAt });
  DB.set('currentUser', email);

  seedDemoData();
  loadUserData();
  initApp();
  clearAuthForms();

  showToast('success', 'Conta criada!', `Bem-vindo(a), ${name}!`);
}

function resetAppStateAfterLogout() {
  state.user = null;
  state.transactions = [];
  state.goals = [];
  state.notifications = [];
  state.settings = {
    salary: 0,
    limits: {},
    darkMode: true,
    notif: true,
    autoReport: true
  };
  state.currentPage = 'dashboard';
  state.period = 'month';
  state.aiInsights = [];
  state.eduProgress = { completed: [], streak: 0, points: 0 };
}

function handleLogout() {
  DB.set('currentUser', null);
  destroyAllCharts();
  state.charts = {};
  resetAppStateAfterLogout();
  showAuthScreen('login');
  clearAuthForms();
  showToast('info', 'Até logo!', 'Sessão encerrada com sucesso.');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  const targetTab = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
  const targetForm = getEl(tab + 'Form');

  if (targetTab) targetTab.classList.add('active');
  if (targetForm) targetForm.classList.add('active');
}

function showForgotPassword() {
  showToast('info', 'Recuperação de senha', 'Nesta versão local, entre com a senha cadastrada ou crie uma nova conta.');
}

// ==========================================
// DATA SEEDING (Demo Data)
// ==========================================
function seedDemoData() {
  const now = new Date();
  const userKey = state.user.email;

  const categories = {
    expense: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinaturas', 'Outros'],
    income: ['Salário', 'Freelance', 'Investimentos', 'Outros']
  };

  const transactions = [];
  const emojis = {
    'Alimentação': '🍔', 'Transporte': '🚗', 'Moradia': '🏠', 'Saúde': '💊',
    'Lazer': '🎬', 'Educação': '📚', 'Vestuário': '👕', 'Assinaturas': '📱',
    'Outros': '💸', 'Salário': '💼', 'Freelance': '💻', 'Investimentos': '📈'
  };

  // Generate last 6 months of transactions
  for (let m = 5; m >= 0; m--) {
    const date = new Date(now.getFullYear(), now.getMonth() - m, 1);

    // Salary
    transactions.push({
      id: genId(), type: 'income', desc: 'Salário', value: 5500,
      category: 'Salário', emoji: '💼', payment: 'Transferência',
      recurrence: 'monthly', date: fmtDate(new Date(date.getFullYear(), date.getMonth(), 5)),
      notes: '', createdAt: new Date().toISOString()
    });

    // Freelance (some months)
    if (m % 2 === 0) {
      transactions.push({
        id: genId(), type: 'income', desc: 'Projeto Freelance', value: Math.floor(Math.random() * 1500) + 500,
        category: 'Freelance', emoji: '💻', payment: 'Pix',
        recurrence: 'once', date: fmtDate(new Date(date.getFullYear(), date.getMonth(), 15)),
        notes: '', createdAt: new Date().toISOString()
      });
    }

    // Expenses
    const expenses = [
      { desc: 'Aluguel', value: 1800, cat: 'Moradia', pay: 'Boleto', day: 10 },
      { desc: 'Supermercado', value: Math.floor(Math.random() * 400) + 600, cat: 'Alimentação', pay: 'Débito', day: 8 },
      { desc: 'iFood / Delivery', value: Math.floor(Math.random() * 200) + 100, cat: 'Alimentação', pay: 'Crédito', day: 18 },
      { desc: 'Combustível', value: Math.floor(Math.random() * 150) + 200, cat: 'Transporte', pay: 'Débito', day: 12 },
      { desc: 'Netflix + Spotify', value: 75, cat: 'Assinaturas', pay: 'Crédito', day: 3 },
      { desc: 'Academia', value: 99, cat: 'Saúde', pay: 'Débito', day: 1 },
      { desc: 'Farmácia', value: Math.floor(Math.random() * 100) + 50, cat: 'Saúde', pay: 'Débito', day: 20 },
      { desc: 'Energia + Internet', value: 280, cat: 'Moradia', pay: 'Débito', day: 15 },
      { desc: 'Cinema / Lazer', value: Math.floor(Math.random() * 150) + 50, cat: 'Lazer', pay: 'Crédito', day: 22 },
      { desc: 'Curso Online', value: 89, cat: 'Educação', pay: 'Crédito', day: 7 }
    ];

    expenses.forEach(e => {
      transactions.push({
        id: genId(), type: 'expense', desc: e.desc, value: e.value,
        category: e.cat, emoji: emojis[e.cat], payment: e.pay,
        recurrence: 'monthly', date: fmtDate(new Date(date.getFullYear(), date.getMonth(), e.day)),
        notes: '', createdAt: new Date().toISOString()
      });
    });
  }

  const goals = [
    { id: genId(), name: 'Viagem Europa', target: 15000, current: 4200, deadline: '2026-12-01', category: 'Viagem', emoji: '✈️', createdAt: new Date().toISOString() },
    { id: genId(), name: 'Reserva de Emergência', target: 20000, current: 12000, deadline: '2026-06-01', category: 'Emergência', emoji: '💰', createdAt: new Date().toISOString() },
    { id: genId(), name: 'iPhone Novo', target: 6000, current: 1500, deadline: '2026-04-01', category: 'Eletrônicos', emoji: '📱', createdAt: new Date().toISOString() }
  ];

  const settings = { salary: 5500, limits: { 'Alimentação': 1200, 'Lazer': 300, 'Vestuário': 200, 'Transporte': 500 }, darkMode: true, notif: true, autoReport: true };

  DB.set(`transactions_${userKey}`, transactions);
  DB.set(`goals_${userKey}`, goals);
  DB.set(`settings_${userKey}`, settings);
  DB.set(`eduProgress_${userKey}`, { completed: ['budgeting-101'], streak: 5, points: 120 });
}

// ==========================================
// LOAD USER DATA
// ==========================================
function loadUserData() {
  const k = state.user.email;
  state.transactions = DB.get(`transactions_${k}`, []);
  state.goals = DB.get(`goals_${k}`, []);
  state.settings = DB.get(`settings_${k}`, { salary: 0, limits: {}, darkMode: true, notif: true, autoReport: true });
state.notifications = DB.get(`notifications_${k}`, []);
  state.eduProgress = DB.get(`eduProgress_${k}`, { completed: [], streak: 0, points: 0 });
}

function saveUserData() {
  const k = state.user.email;
  DB.set(`transactions_${k}`, state.transactions);
  DB.set(`goals_${k}`, state.goals);
  DB.set(`settings_${k}`, state.settings);
  DB.set(`notifications_${k}`, state.notifications);
  DB.set(`eduProgress_${k}`, state.eduProgress);
}

// ==========================================
// APP INITIALIZATION
// ==========================================
function initApp() {
  if (!state.user || !state.user.email) {
    showAuthScreen('login');
    return;
  }

  showAppScreen();

  const isDark = state.settings.darkMode !== false;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const dmToggle = getEl('darkModeToggle');
  if (dmToggle) dmToggle.checked = isDark;

  updateUserUI();
  setGreeting();

  navigate('dashboard');
  buildCategoryFilters();
  buildLimitsSettings();
  buildEducationCards();
  renderNotifications();

  const settingName = getEl('settingName');
  const settingEmail = getEl('settingEmail');
  const settingSalary = getEl('settingSalary');
  const txDate = getEl('txDate');

  if (settingName) settingName.value = state.user.name || '';
  if (settingEmail) settingEmail.value = state.user.email || '';
  if (settingSalary) settingSalary.value = state.settings.salary || '';
  if (txDate) txDate.value = fmtDate(new Date());

  const dtoggle = getEl('darkModeToggle');
  if (dtoggle) dtoggle.checked = document.documentElement.getAttribute('data-theme') === 'dark';
}

function updateUserUI() {
  const name = state.user.name || 'Usuário';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('sidebarName').textContent = name;
  document.getElementById('sidebarAvatar').textContent = initials;
}

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const name = state.user ? state.user.name.split(' ')[0] : '';
  document.getElementById('dashGreeting').textContent = `${g}, ${name}! 👋`;
}

// ==========================================
// NAVIGATION
// ==========================================
function navigate(page) {
  state.currentPage = page;

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });

  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  const titles = { dashboard: 'Dashboard', transactions: 'Transações', goals: 'Metas', ai: 'IA Insights', education: 'Educação', reports: 'Relatórios', settings: 'Configurações' };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  // Lazy-render per page
  if (page === 'dashboard') renderDashboard();
  if (page === 'transactions') renderTransactions();
  if (page === 'goals') renderGoals();
  if (page === 'ai') renderAIPage();
  if (page === 'education') renderEducation();
  if (page === 'reports') renderReports();
  if (page === 'settings') renderSettings();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay')?.remove();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar.classList.toggle('open');
  if (isOpen) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay active';
    overlay.onclick = toggleSidebar;
    document.body.appendChild(overlay);
  } else {
    document.querySelector('.sidebar-overlay')?.remove();
  }
}

// ==========================================
// FINANCIAL CALCULATIONS
// ==========================================
function getFilteredTx(period = state.period) {
  const now = new Date();
  return state.transactions.filter(tx => {
    const d = new Date(tx.date);
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      const dq = Math.floor(d.getMonth() / 3);
      return dq === q && d.getFullYear() === now.getFullYear();
    }
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  });
}

function calcSummary(txs) {
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);
  return { income, expense, balance: income - expense, savingsRate: income > 0 ? ((income - expense) / income * 100) : 0 };
}

function getPrevPeriodSummary() {
  const now = new Date();
  const prev = state.transactions.filter(tx => {
    const d = new Date(tx.date);
    if (state.period === 'month') {
      const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === prevM && d.getFullYear() === prevY;
    }
    return false;
  });
  return calcSummary(prev);
}

function changePeriod(p, btn) {
  state.period = p;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDashboard();
}

// ==========================================
// DASHBOARD
// ==========================================
function renderDashboard() {
  const txs = getFilteredTx();
  const { income, expense, balance, savingsRate } = calcSummary(txs);
  const prev = getPrevPeriodSummary();

  document.getElementById('totalIncome').textContent = fmt(income);
  document.getElementById('totalExpense').textContent = fmt(expense);
  document.getElementById('currentBalance').textContent = fmt(balance);
  document.getElementById('savingsRate').textContent = savingsRate.toFixed(1) + '%';

  // Changes
  const incChg = prev.income > 0 ? ((income - prev.income) / prev.income * 100).toFixed(1) : 0;
  const expChg = prev.expense > 0 ? ((expense - prev.expense) / prev.expense * 100).toFixed(1) : 0;
  const incEl = document.getElementById('incomeChange');
  const expEl = document.getElementById('expenseChange');
  incEl.textContent = (incChg >= 0 ? '+' : '') + incChg + '% vs. mês anterior';
  incEl.className = 'kpi-change ' + (incChg >= 0 ? 'positive' : 'negative');
  expEl.textContent = (expChg >= 0 ? '+' : '') + expChg + '% vs. mês anterior';
  expEl.className = 'kpi-change ' + (expChg <= 0 ? 'positive' : 'negative');

  document.getElementById('balanceStatus').textContent = balance >= 0 ? '✓ Positivo' : '⚠ Negativo';
  document.getElementById('balanceStatus').className = 'kpi-change ' + (balance >= 0 ? 'positive' : 'negative');
  document.getElementById('savingsStatus').textContent = `Meta: 20% | Atual: ${savingsRate.toFixed(1)}%`;
  document.getElementById('savingsStatus').className = 'kpi-change ' + (savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? '' : 'negative');

  renderCashflowChart();
  renderCategoryChart();
  renderRecentTransactions(txs);
  renderDashboardGoals();
  generateAIInsightBanner(txs, income, expense, savingsRate);
analyzeAlertsSafe();
   
}

function renderRecentTransactions(txs) {
  const container = document.getElementById('recentTransactions');
  const recent = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  if (!recent.length) {
    container.innerHTML = `<div class="text-muted" style="text-align:center;padding:20px;font-size:14px;">Nenhuma transação este período</div>`;
    return;
  }

  container.innerHTML = recent.map(tx => `
    <div class="tx-item">
      <div class="tx-icon ${tx.type}">${tx.emoji || (tx.type === 'income' ? '💰' : '💸')}</div>
      <div class="tx-info">
        <div class="tx-desc">${tx.desc}</div>
        <div class="tx-meta">${tx.category} · ${fmtDateDisplay(tx.date)}</div>
      </div>
      <div class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'} ${fmt(tx.value)}</div>
    </div>
  `).join('');
}

function renderDashboardGoals() {
  const container = document.getElementById('dashboardGoals');
  const active = state.goals.slice(0, 4);

  if (!active.length) {
    container.innerHTML = `<div class="text-muted" style="text-align:center;padding:20px;font-size:14px;">Nenhuma meta criada</div>`;
    return;
  }

  container.innerHTML = active.map(g => {
    const pct = Math.min((g.current / g.target) * 100, 100).toFixed(0);
    return `
      <div class="goal-mini-item">
        <div class="goal-mini-header">
          <span class="goal-mini-name">${g.emoji} ${g.name}</span>
          <span class="goal-mini-pct">${pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// CASHFLOW CHART
// ==========================================
function renderCashflowChart() {
  const ctx = document.getElementById('cashflowChart');
  if (!ctx) return;

  destroyChart('cashflow');

  const months = getLast6Months();
  const incomeData = months.map(m => getMonthTotal(m.year, m.month, 'income'));
  const expenseData = months.map(m => getMonthTotal(m.year, m.month, 'expense'));
  const labels = months.map(m => m.label);

  state.charts.cashflow = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Receitas', data: incomeData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6, borderSkipped: false },
        { label: 'Despesas', data: expenseData, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8892a4', font: { size: 12 } }, border: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892a4', font: { size: 12 }, callback: v => 'R$' + (v/1000).toFixed(0) + 'k' }, border: { display: false } }
      }
    }
  });
}

function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  destroyChart('category');

  const txs = getFilteredTx();
  const expenses = txs.filter(t => t.type === 'expense');
  const byCategory = {};
  expenses.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.value; });

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

  if (!sorted.length) {
    ctx.parentElement.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px;">Sem despesas neste período</div>';
    return;
  }

  state.charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        data: sorted.map(s => s[1]),
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8892a4', font: { size: 12 }, padding: 16, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` } }
      },
      cutout: '65%'
    }
  });
}

// ==========================================
// TRANSACTIONS PAGE
// ==========================================
function renderTransactions(filter = {}) {
  buildCategoryFilters();
  buildMonthFilters();
  filterTransactions();
}

function filterTransactions() {
  const type = document.getElementById('filterType').value;
  const cat = document.getElementById('filterCategory').value;
  const month = document.getElementById('filterMonth').value;
  const search = document.getElementById('searchInput').value.toLowerCase();

  let txs = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (type !== 'all') txs = txs.filter(t => t.type === type);
  if (cat !== 'all') txs = txs.filter(t => t.category === cat);
  if (month !== 'all') txs = txs.filter(t => t.date.startsWith(month));
  if (search) txs = txs.filter(t => t.desc.toLowerCase().includes(search) || t.category.toLowerCase().includes(search));

  renderTransactionsTable(txs);
}

function renderTransactionsTable(txs) {
  const tbody = document.getElementById('transactionsTableBody');
  const empty = document.getElementById('transactionsEmpty');

  if (!txs.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  tbody.innerHTML = txs.map(tx => `
    <tr>
      <td>${fmtDateDisplay(tx.date)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;">${tx.emoji || '💸'}</span>
          <div>
            <div style="font-weight:500;">${tx.desc}</div>
            ${tx.recurrence !== 'once' ? `<div style="font-size:11px;color:var(--accent);">↻ ${recurrenceLabel(tx.recurrence)}</div>` : ''}
          </div>
        </div>
      </td>
      <td><span class="tx-badge ${tx.type}">${tx.category}</span></td>
      <td>${tx.payment || '—'}</td>
      <td class="tx-amount ${tx.type}" style="font-weight:700;">${tx.type === 'income' ? '+' : '-'} ${fmt(tx.value)}</td>
      <td>
        <div class="tx-actions">
          <button onclick="editTransaction('${tx.id}')" title="Editar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="del-btn" onclick="deleteTransaction('${tx.id}')" title="Excluir">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function buildCategoryFilters() {
  const sel = document.getElementById('filterCategory');
  if (!sel) return;
  const cats = [...new Set(state.transactions.map(t => t.category))].sort();
  sel.innerHTML = '<option value="all">Todas as categorias</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function buildMonthFilters() {
  const sel = document.getElementById('filterMonth');
  if (!sel) return;
  const months = [...new Set(state.transactions.map(t => t.date.substring(0, 7)))].sort().reverse();
  sel.innerHTML = '<option value="all">Todos os meses</option>' +
    months.map(m => `<option value="${m}">${fmtMonthYear(m)}</option>`).join('');
}

// ==========================================
// TRANSACTION MODAL
// ==========================================
let editingTxId = null;
let selectedTxType = 'expense';

function openTransactionModal(type = 'expense') {
  editingTxId = null;
  selectedTxType = type;
  document.getElementById('modalTitle').textContent = 'Nova Transação';
  document.getElementById('txDesc').value = '';
  document.getElementById('txValue').value = '';
  document.getElementById('txDate').value = fmtDate(new Date());
  document.getElementById('txNotes').value = '';
  document.getElementById('txRecurrence').value = 'once';

  setTransactionType(type);
  buildTxCategories(type);
  document.getElementById('transactionModal').classList.remove('hidden');
}

function setTransactionType(type) {
  selectedTxType = type;
  document.getElementById('typeExpenseBtn').classList.toggle('active', type === 'expense');
  document.getElementById('typeIncomeBtn').classList.toggle('active', type === 'income');
  document.getElementById('paymentRow').style.display = type === 'expense' ? 'grid' : 'none';
  buildTxCategories(type);
}

function buildTxCategories(type) {
  const cats = type === 'expense'
    ? ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinaturas', 'Investimentos', 'Outros']
    : ['Salário', 'Freelance', 'Investimentos', 'Outros'];
  const sel = document.getElementById('txCategory');
  sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

const categoryEmoji = {
  'Alimentação':'🍔','Transporte':'🚗','Moradia':'🏠','Saúde':'💊','Lazer':'🎬','Educação':'📚',
  'Vestuário':'👕','Assinaturas':'📱','Outros':'💸','Salário':'💼','Freelance':'💻','Investimentos':'📈'
};

function saveTransaction() {
  const desc = document.getElementById('txDesc').value.trim();
  const value = parseFloat(document.getElementById('txValue').value);
  const date = document.getElementById('txDate').value;
  const category = document.getElementById('txCategory').value;
  const payment = document.getElementById('txPayment').value;
  const recurrence = document.getElementById('txRecurrence').value;
  const notes = document.getElementById('txNotes').value;

  if (!desc) { showToast('error', 'Campo obrigatório', 'Digite uma descrição.'); return; }
  if (!value || value <= 0) { showToast('error', 'Valor inválido', 'Digite um valor válido.'); return; }
  if (!date) { showToast('error', 'Data obrigatória', 'Selecione uma data.'); return; }

  if (editingTxId) {
    const idx = state.transactions.findIndex(t => t.id === editingTxId);
    if (idx >= 0) {
      state.transactions[idx] = { ...state.transactions[idx], desc, value, date, category, payment, recurrence, notes, emoji: categoryEmoji[category] || '💸' };
    }
    showToast('success', 'Atualizada!', 'Transação atualizada com sucesso.');
  } else {
    const tx = { id: genId(), type: selectedTxType, desc, value, date, category, payment, recurrence, notes, emoji: categoryEmoji[category] || '💸', createdAt: new Date().toISOString() };
    state.transactions.push(tx);
    showToast('success', selectedTxType === 'income' ? 'Receita registrada!' : 'Despesa registrada!', `${desc} · ${fmt(value)}`);
   addNotification(
  tx.type === 'income' ? 'Receita registrada' : 'Despesa registrada',
  `${desc} (${fmt(value)})`,
  tx.type === 'income' ? 'success' : 'error',
  {
    priority: tx.type === 'income' ? 'normal' : 'medium',
    category: 'transaction',
    source: 'transactions'
  }
);
    checkSpendingLimits(category, value);
  }

  saveUserData();
   
   
  closeModal('transactionModal');
  if (state.currentPage === 'dashboard') renderDashboard();
  else if (state.currentPage === 'transactions') renderTransactions();
}

function editTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  editingTxId = id;
  selectedTxType = tx.type;
  document.getElementById('modalTitle').textContent = 'Editar Transação';
  setTransactionType(tx.type);
  buildTxCategories(tx.type);
  document.getElementById('txDesc').value = tx.desc;
  document.getElementById('txValue').value = tx.value;
  document.getElementById('txDate').value = tx.date;
  document.getElementById('txCategory').value = tx.category;
  document.getElementById('txPayment').value = tx.payment;
  document.getElementById('txRecurrence').value = tx.recurrence;
  document.getElementById('txNotes').value = tx.notes || '';
  document.getElementById('transactionModal').classList.remove('hidden');
}

function deleteTransaction(id) {
  if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveUserData();
  
  filterTransactions();
  if (state.currentPage === 'dashboard') renderDashboard();
  showToast('success', 'Excluída', 'Transação removida com sucesso.');
}

function checkSpendingLimits(category, value) {
  const limit = state.settings.limits[category];
  if (!limit) return;
  const now = new Date();
  const monthTotal = state.transactions
    .filter(t => t.type === 'expense' && t.category === category && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + t.value, 0) + value;

  if (monthTotal > limit) {
    showToast('warning', '⚠ Limite ultrapassado!', `${category}: ${fmt(monthTotal)} (limite: ${fmt(limit)})`);
    addNotification('warning', `⚠ Você ultrapassou o limite de ${category}: ${fmt(monthTotal)} / ${fmt(limit)}`, 'warning');
  } else if (monthTotal > limit * 0.8) {
    showToast('warning', 'Atenção!', `Você já usou ${((monthTotal / limit) * 100).toFixed(0)}% do limite de ${category}.`);
  }
}

// ==========================================
// GOALS PAGE
// ==========================================
let selectedEmoji = '🎯';

function openGoalModal() {
  document.getElementById('goalName').value = '';
  document.getElementById('goalTarget').value = '';
  document.getElementById('goalCurrent').value = '';
  document.getElementById('goalDeadline').value = '';
  selectedEmoji = '🎯';
  document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
  document.querySelector('.emoji-opt').classList.add('selected');
  document.getElementById('goalModal').classList.remove('hidden');
}

function selectEmoji(el) {
  document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedEmoji = el.textContent;
}

function saveGoal() {
  const name = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
  const deadline = document.getElementById('goalDeadline').value;
  const category = document.getElementById('goalCategory').value;

  if (!name) { showToast('error', 'Campo obrigatório', 'Digite um nome para a meta.'); return; }
  if (!target || target <= 0) { showToast('error', 'Valor inválido', 'Digite um valor alvo válido.'); return; }

  const goal = { id: genId(), name, target, current, deadline, category, emoji: selectedEmoji, createdAt: new Date().toISOString() };
  state.goals.push(goal);
  saveUserData();
  closeModal('goalModal');
  renderGoals();
  showToast('success', 'Meta criada!', `${selectedEmoji} ${name} — objetivo: ${fmt(target)}`);
}

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  const empty = document.getElementById('goalsEmpty');

  if (!state.goals.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = state.goals.map(g => {
    const pct = Math.min((g.current / g.target) * 100, 100).toFixed(1);
    const remaining = g.target - g.current;
    const daysLeft = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 86400000)) : null;
    return `
      <div class="goal-card">
        <div class="goal-header">
          <div class="goal-icon">${g.emoji}</div>
          <div class="goal-actions">
            <button onclick="addToGoal('${g.id}')" title="Adicionar valor">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <button onclick="deleteGoal('${g.id}')" title="Excluir">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
        <div class="goal-name">${g.name}</div>
        <div class="goal-category">${g.category} ${daysLeft !== null ? `· ${daysLeft} dias restantes` : ''}</div>
        <div class="goal-amounts">
          <span class="goal-current">${fmt(g.current)}</span>
          <span class="goal-target">de ${fmt(g.target)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-meta">
          <span>${pct}% concluído</span>
          <span>Faltam ${fmt(remaining)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function addToGoal(id) {
  const val = prompt('Quanto deseja adicionar a esta meta? (R$)');
  if (!val || isNaN(parseFloat(val))) return;
  const amount = parseFloat(val);
  const g = state.goals.find(g => g.id === id);
  if (g) {
    g.current = Math.min(g.current + amount, g.target);
    saveUserData();
    renderGoals();
    showToast('success', 'Meta atualizada!', `${g.emoji} ${g.name}: ${fmt(g.current)} / ${fmt(g.target)}`);
    if (g.current >= g.target) {
      showToast('success', '🎉 Meta atingida!', `Parabéns! Você atingiu a meta "${g.name}"!`);
    }
  }
}

function deleteGoal(id) {
  if (!confirm('Excluir esta meta?')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveUserData();
  renderGoals();
  showToast('success', 'Meta excluída', 'A meta foi removida.');
}

function runSimulator() {
  const goal = parseFloat(document.getElementById('simGoal').value);
  const monthly = parseFloat(document.getElementById('simMonthly').value);
  const rate = parseFloat(document.getElementById('simRate').value) / 100 / 12;

  if (!goal || !monthly || goal <= 0 || monthly <= 0) {
    document.getElementById('simTime').textContent = '—';
    document.getElementById('simInvested').textContent = '—';
    document.getElementById('simReturn').textContent = '—';
    return;
  }

  let months = 0;
  let total = 0;
  const maxMonths = 600;

  if (rate > 0) {
    months = Math.ceil(Math.log(1 + (goal * rate / monthly)) / Math.log(1 + rate));
  } else {
    months = Math.ceil(goal / monthly);
  }

  if (months > maxMonths || months <= 0) {
    document.getElementById('simTime').textContent = 'Inviável';
    return;
  }

  const invested = monthly * months;
  const returns = goal - invested;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  document.getElementById('simTime').textContent = years > 0 ? `${years}a ${remMonths}m` : `${months} meses`;
  document.getElementById('simInvested').textContent = fmt(invested);
  document.getElementById('simReturn').textContent = returns > 0 ? `+ ${fmt(returns)}` : fmt(0);
}

// ==========================================
// AI PAGE
// ==========================================
function renderAIPage() {
  generateAIInsights();
  updateAIScore();
  renderProjectionChart('moderate');
}

function generateAIInsights() {
  const txs = getFilteredTx();
  const allTxs = state.transactions;
  const { income, expense, balance, savingsRate } = calcSummary(txs);

  const byCategory = {};
  txs.filter(t => t.type === 'expense').forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.value; });

  const insights = [];
  const limits = state.settings.limits || {};

  // Savings rate insight
  if (savingsRate < 10) {
    insights.push({ type: 'negative', icon: '📉', title: 'Taxa de poupança baixa', desc: `Você está poupando apenas ${savingsRate.toFixed(1)}% da sua renda. O ideal é poupar pelo menos 20% por mês. Reduza gastos com lazer e alimentação fora de casa.`, action: 'Criar meta de economia →' });
  } else if (savingsRate >= 20) {
    insights.push({ type: 'positive', icon: '🏆', title: 'Excelente taxa de poupança!', desc: `Parabéns! Você está poupando ${savingsRate.toFixed(1)}% da sua renda — acima da meta de 20%. Continue esse ritmo e considere investir o excedente.`, action: 'Ver opções de investimento →' });
  }

  // Category excess
  Object.entries(byCategory).forEach(([cat, val]) => {
    const lim = limits[cat];
    if (lim && val > lim) {
      insights.push({ type: 'warning', icon: '⚠️', title: `Excesso em ${cat}`, desc: `Você gastou ${fmt(val)} em ${cat}, ultrapassando o limite de ${fmt(lim)} em ${fmt(val - lim)} (${(((val - lim) / lim) * 100).toFixed(0)}% acima).`, action: 'Ajustar limite →' });
    }
  });

  // Top expense category
  const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const pctIncome = income > 0 ? (topCat[1] / income * 100).toFixed(1) : 0;
    insights.push({ type: 'info', icon: '📊', title: `Maior gasto: ${topCat[0]}`, desc: `${topCat[0]} representa ${pctIncome}% da sua renda total (${fmt(topCat[1])}). ${pctIncome > 30 ? 'Considere reduzir esses gastos.' : 'Esse valor está dentro do esperado.'}`, action: 'Analisar detalhes →' });
  }

  // Balance check
  if (balance < 0) {
    insights.push({ type: 'negative', icon: '🔴', title: 'Saldo negativo!', desc: `Suas despesas (${fmt(expense)}) estão superando suas receitas (${fmt(income)}) em ${fmt(Math.abs(balance))}. Identifique e corte gastos não essenciais imediatamente.`, action: 'Ver despesas →' });
  }

  // Recurring expenses
  const recurrings = state.transactions.filter(t => t.type === 'expense' && t.recurrence !== 'once');
  if (recurrings.length > 0) {
    const totalFixed = recurrings.reduce((s, t) => s + t.value, 0) / 6; // avg monthly
    insights.push({ type: 'info', icon: '🔁', title: 'Gastos recorrentes', desc: `Você tem ${recurrings.length} despesas recorrentes, totalizando cerca de ${fmt(totalFixed)}/mês. Revise assinaturas e contratos periodicamente.`, action: 'Ver recorrentes →' });
  }

  // Positive: goals progress
  const goalsWithProgress = state.goals.filter(g => g.current > 0 && g.current < g.target);
  if (goalsWithProgress.length > 0) {
    const avgProgress = goalsWithProgress.reduce((s, g) => s + (g.current / g.target), 0) / goalsWithProgress.length * 100;
    insights.push({ type: 'positive', icon: '🎯', title: 'Metas em progresso', desc: `Você tem ${goalsWithProgress.length} meta(s) em andamento com progresso médio de ${avgProgress.toFixed(0)}%. Continue contribuindo regularmente!`, action: 'Ver metas →' });
  }

  state.aiInsights = insights;

  const grid = document.getElementById('insightsGrid');
  if (!grid) return;

  grid.innerHTML = insights.map(ins => `
    <div class="insight-card">
      <div class="insight-header">
        <div class="insight-icon ${ins.type}"><span>${ins.icon}</span></div>
        <div>
          <div class="insight-type ${ins.type}">${ins.type === 'positive' ? 'Positivo' : ins.type === 'negative' ? 'Atenção' : ins.type === 'warning' ? 'Alerta' : 'Informação'}</div>
        </div>
      </div>
      <div class="insight-title">${ins.title}</div>
      <div class="insight-desc">${ins.desc}</div>
      <span class="insight-action">${ins.action}</span>
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Adicione transações para gerar insights.</div>';
}

function updateAIScore() {
  const txs = getFilteredTx();
  const { income, expense, savingsRate } = calcSummary(txs);

  let score = 50;
  if (savingsRate >= 20) score += 20;
  else if (savingsRate >= 10) score += 10;
  else score -= 10;
  if (income > expense) score += 15;
  else score -= 20;
  if (state.goals.length > 0) score += 10;
  if (state.transactions.length > 10) score += 5;

  score = Math.max(10, Math.min(100, score));

  const scoreEl = document.getElementById('scoreNum');
  if (scoreEl) scoreEl.textContent = score;

  const circumference = 377;
  const offset = circumference - (score / 100) * circumference;
  const circle = document.getElementById('scoreCircle');
  if (circle) circle.setAttribute('stroke-dashoffset', offset);

  const descEl = document.getElementById('scoreDescription');
  if (descEl) {
    if (score >= 80) descEl.textContent = 'Excelente! Suas finanças estão muito bem controladas. Continue investindo e construindo seu patrimônio.';
    else if (score >= 60) descEl.textContent = 'Bom progresso! Suas finanças estão razoavelmente controladas. Foque em aumentar a taxa de poupança.';
    else if (score >= 40) descEl.textContent = 'Há oportunidade de melhora. Revise seus gastos e estabeleça metas claras de economia.';
    else descEl.textContent = 'Situação crítica! Suas despesas superam receitas. Tome ação imediata para reequilibrar seu orçamento.';
  }

  // Update bars
  const ctrl = Math.min(100, Math.max(0, 100 - (expense / (income || 1) * 100)));
  const sav = Math.min(100, savingsRate * 5);
  const goalPct = state.goals.length ? Math.min(100, state.goals.reduce((s, g) => s + (g.current / g.target), 0) / state.goals.length * 100) : 0;
  const div = Math.min(100, new Set(txs.filter(t => t.type === 'expense').map(t => t.category)).size * 15);

  ['control', 'savings', 'goals', 'divers'].forEach((key, i) => {
    const vals = [ctrl, sav, goalPct, div];
    const barEl = document.getElementById(key + 'Bar');
    const pctEl = document.getElementById(key + 'Pct');
    if (barEl) barEl.style.width = vals[i].toFixed(0) + '%';
    if (pctEl) pctEl.textContent = vals[i].toFixed(0) + '%';
  });
}

function renderProjectionChart(scenario = 'moderate') {
  const ctx = document.getElementById('projectionChart');
  if (!ctx) return;

  destroyChart('projection');

  const txs = getFilteredTx();
  const { income, expense } = calcSummary(txs);
  const monthlyBalance = income - expense;

  const multipliers = { conservative: 0.7, moderate: 1.0, optimistic: 1.3 };
  const m = multipliers[scenario] || 1;

  const labels = [];
  const data = [];
  let accumulated = Math.max(0, monthlyBalance);
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
    accumulated += monthlyBalance * m;
    data.push(Math.max(0, accumulated));
  }

  state.charts.projection = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Saldo Projetado',
        data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366f1',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8892a4', font: { size: 12 } }, border: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892a4', callback: v => 'R$' + (v/1000).toFixed(0) + 'k' }, border: { display: false } }
      }
    }
  });
}

function updateProjection(val) { renderProjectionChart(val); }

function runAIAnalysis() {
  showToast('info', 'Analisando...', 'A IA está processando seus dados financeiros.');
  setTimeout(() => {
    generateAIInsights();
    updateAIScore();
    showToast('success', 'Análise concluída!', 'Novos insights disponíveis.');
  }, 1500);
}

function generateAIInsightBanner(txs, income, expense, savingsRate) {
  const insightEl = document.getElementById('aiInsightText');
  if (!insightEl) return;

  const insights = [
    savingsRate < 10 ? `Sua taxa de poupança é de apenas ${savingsRate.toFixed(1)}%. Reduza gastos para chegar a pelo menos 20%.` : null,
    income > expense ? `Excelente! Você teve saldo positivo de ${fmt(income - expense)} este mês.` : null,
    `Seu maior gasto do período é em: ${getTopCategory(txs)}. Monitore de perto.`,
  ].filter(Boolean);

  insightEl.textContent = insights[Math.floor(Math.random() * insights.length)] || 'Continue monitorando suas finanças para receber insights personalizados.';
}

function getTopCategory(txs) {
  const by = {};
  txs.filter(t => t.type === 'expense').forEach(t => { by[t.category] = (by[t.category] || 0) + t.value; });
  return Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
}

// ==========================================
// AI CHAT
// ==========================================
const AI_RESPONSES = {
  keywords: {
    'poupança|economizar|guardar': () => {
      const { income, expense, savingsRate } = calcSummary(getFilteredTx());
      return `Atualmente você está poupando ${savingsRate.toFixed(1)}% da renda. Para aumentar, recomendo: 1) Aplique a regra 50/30/20 (50% necessidades, 30% desejos, 20% poupança); 2) Automatize transferências para poupança no início do mês; 3) Reduza gastos em ${getTopCategory(getFilteredTx())}.`;
    },
    'meta|objetivo|sonho': () => `Você tem ${state.goals.length} meta(s) ativa(s). Para criar novas metas eficazes, use o método SMART: específica, mensurável, atingível, relevante e temporal. Vá para a aba "Metas" e use o Simulador de Economia!`,
    'invest|rendimento|cdb|tesouro': () => `Para investimentos, considere: 1) Tesouro Selic (segurança + liquidez); 2) CDBs com mais de 100% do CDI; 3) Fundos de renda fixa; 4) Ações e FIIs para longo prazo. Primeiro, construa sua reserva de emergência de 6 meses de despesas.`,
    'dívida|débito|empréstimo': () => `Para eliminar dívidas: 1) Liste todas com juros e saldos; 2) Use "bola de neve" (menor primeiro) ou "avalanche" (maior juros primeiro); 3) Negocie taxas menores; 4) Evite novas dívidas. Você está conseguindo pagar suas contas em dia?`,
    'saldo|dinheiro|quanto': () => {
      const { income, expense, balance } = calcSummary(getFilteredTx());
      return `Este mês: Receitas: ${fmt(income)} | Despesas: ${fmt(expense)} | Saldo: ${fmt(balance)}. ${balance >= 0 ? '✅ Positivo!' : '⚠️ Atenção: saldo negativo!'}`;
    },
    'categoria|gasto|despesa': () => {
      const txs = getFilteredTx();
      const by = {};
      txs.filter(t => t.type === 'expense').forEach(t => { by[t.category] = (by[t.category] || 0) + t.value; });
      const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return `Seus 3 maiores gastos: ${top.map((c, i) => `${i+1}. ${c[0]}: ${fmt(c[1])}`).join(', ')}. Foque em reduzir o primeiro item para ter impacto rápido.`;
    }
  },
  default: [
    'Baseado no seu histórico, recomendo revisar seus gastos com alimentação fora de casa. Cozinhar mais em casa pode economizar até R$ 400/mês.',
    'Dica financeira: a regra de 72 diz que para saber em quanto tempo seu dinheiro dobra, divida 72 pela taxa de juros anual. Ex: 12% ao ano = 6 anos para dobrar!',
    'Você sabia? Pequenos gastos diários (como café, água, snacks) podem somar mais de R$ 200/mês. Monitore esses "pequenos vampiros financeiros".',
    'Para alcançar liberdade financeira, foque em aumentar receitas E reduzir despesas simultaneamente. Pequenas melhoras em ambos têm efeito multiplicador.',
    'Recomendo criar uma reserva de emergência de 6 meses de despesas antes de investir em ativos de maior risco.'
  ]
};

function sendChatMsg() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  addChatMessage('user', msg);
  input.value = '';

  // Typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg ai';
  typingEl.innerHTML = `<div class="chat-avatar">AI</div><div class="chat-bubble"><div class="chat-typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  document.getElementById('chatMessages').appendChild(typingEl);
  scrollChat();

  setTimeout(() => {
    typingEl.remove();
    const response = getAIResponse(msg);
    addChatMessage('ai', response);
  }, 800 + Math.random() * 600);
}

function getAIResponse(msg) {
  const lower = msg.toLowerCase();
  for (const [pattern, fn] of Object.entries(AI_RESPONSES.keywords)) {
    if (new RegExp(pattern).test(lower)) return fn();
  }
  return AI_RESPONSES.default[Math.floor(Math.random() * AI_RESPONSES.default.length)];
}

function addChatMessage(role, text) {
  const container = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = `chat-msg ${role}`;
  const avatar = role === 'ai' ? 'AI' : (state.user?.name?.[0] || 'U');
  el.innerHTML = `<div class="chat-avatar">${avatar}</div><div class="chat-bubble">${text}</div>`;
  container.appendChild(el);
  scrollChat();
}

function scrollChat() {
  const c = document.getElementById('chatMessages');
  if (c) c.scrollTop = c.scrollHeight;
}

// ==========================================
// EDUCATION PAGE
// ==========================================
const EDUCATION_PROGRAMS = [
  {
    id: 'cash-bleeding',
    tag: 'Correção Imediata',
    title: 'Seu dinheiro está vazando sem você perceber',
    emoji: '🩸',
    difficulty: 'Prioridade Alta',
    duration: '7 min',
    problem: 'O usuário recebe, gasta no automático e termina o mês sem retenção.',
    metricLabel: 'Vazamento principal',
    getMetric: (ctx) => ctx.topExpenseCategory ? `${ctx.topExpenseCategory} · ${fmt(ctx.topExpenseValue)}` : 'Sem dados suficientes',
    ctaLabel: 'Revisar transações',
    ctaAction: 'review-transactions'
  },
  {
    id: 'reserve-shield',
    tag: 'Blindagem',
    title: 'Você está a um imprevisto de entrar em pressão financeira',
    emoji: '🛡️',
    difficulty: 'Essencial',
    duration: '8 min',
    problem: 'Usuário sem colchão de segurança suficiente para absorver crise.',
    metricLabel: 'Reserva ideal',
    getMetric: (ctx) => fmt(ctx.emergencyTarget),
    ctaLabel: 'Criar meta de reserva',
    ctaAction: 'create-emergency-goal'
  },
  {
    id: 'food-control',
    tag: 'Comportamento',
    title: 'Alimentação e delivery podem estar sabotando sua margem',
    emoji: '🍔',
    difficulty: 'Ação Prática',
    duration: '6 min',
    problem: 'Gastos frequentes e repetitivos em alimentação fora de casa drenam caixa.',
    metricLabel: 'Gasto atual',
    getMetric: (ctx) => fmt(ctx.foodExpense),
    ctaLabel: 'Definir limite',
    ctaAction: 'set-food-limit'
  },
  {
    id: 'salary-evaporation',
    tag: 'Diagnóstico',
    title: 'Por que seu salário desaparece rápido demais',
    emoji: '💸',
    difficulty: 'Crítico',
    duration: '9 min',
    problem: 'Usuário não controla janela de maior gasto após entrada de renda.',
    metricLabel: 'Retenção atual',
    getMetric: (ctx) => `${ctx.savingsRate.toFixed(1)}%`,
    ctaLabel: 'Ver padrão de gastos',
    ctaAction: 'review-transactions'
  },
  {
    id: 'goal-discipline',
    tag: 'Execução',
    title: 'Meta sem aporte recorrente é só intenção',
    emoji: '🎯',
    difficulty: 'Aplicação',
    duration: '6 min',
    problem: 'Usuário cria objetivo, mas não cria sistema de contribuição.',
    metricLabel: 'Metas ativas',
    getMetric: (ctx) => `${ctx.goalsCount}`,
    ctaLabel: 'Ir para metas',
    ctaAction: 'open-goals'
  },
  {
    id: 'recurring-burden',
    tag: 'Higiene Financeira',
    title: 'Cobranças recorrentes silenciosas estão drenando seu caixa',
    emoji: '🔁',
    difficulty: 'Revisão',
    duration: '5 min',
    problem: 'Assinaturas e despesas recorrentes somem no hábito e viram peso fixo.',
    metricLabel: 'Recorrentes',
    getMetric: (ctx) => `${ctx.recurringCount} item(ns)`,
    ctaLabel: 'Auditar recorrências',
    ctaAction: 'review-transactions'
  },
  {
    id: 'stability-before-investing',
    tag: 'Estratégia',
    title: 'Primeiro estabilizar. Depois crescer.',
    emoji: '📈',
    difficulty: 'Ordem Correta',
    duration: '10 min',
    problem: 'Usuário quer investir antes de organizar estrutura básica.',
    metricLabel: 'Saúde do caixa',
    getMetric: (ctx) => ctx.balance >= 0 ? `Saldo positivo ${fmt(ctx.balance)}` : `Saldo negativo ${fmt(Math.abs(ctx.balance))}`,
    ctaLabel: 'Ver análise',
    ctaAction: 'open-ai'
  },
  {
    id: 'discipline-engine',
    tag: 'Disciplina',
    title: 'Disciplina financeira não depende de motivação',
    emoji: '🧠',
    difficulty: 'Mentalidade',
    duration: '8 min',
    problem: 'Usuário oscila entre semanas boas e recaídas de consumo.',
    metricLabel: 'Consistência atual',
    getMetric: (ctx) => `${ctx.disciplineScore}/100`,
    ctaLabel: 'Aplicar missão',
    ctaAction: 'complete-mission'
  }
];

function ensureEducationState() {
  if (!state.eduProgress || typeof state.eduProgress !== 'object') {
    state.eduProgress = {};
  }

  if (!Array.isArray(state.eduProgress.completed)) {
    state.eduProgress.completed = [];
  }

  if (typeof state.eduProgress.streak !== 'number') {
    state.eduProgress.streak = 0;
  }

  if (typeof state.eduProgress.points !== 'number') {
    state.eduProgress.points = 0;
  }

  if (!Array.isArray(state.eduProgress.missionsDone)) {
    state.eduProgress.missionsDone = [];
  }

  if (!state.eduProgress.lastMissionDate) {
    state.eduProgress.lastMissionDate = null;
  }
}

function getEducationContext() {
  const txs = getFilteredTx('month');
  const summary = calcSummary(txs);
  const expenseTxs = txs.filter(t => t.type === 'expense');
  const incomeTxs = txs.filter(t => t.type === 'income');
  const now = new Date();

  const byCategory = {};
  expenseTxs.forEach(tx => {
    byCategory[tx.category] = (byCategory[tx.category] || 0) + tx.value;
  });

  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topExpenseCategory = sortedCategories[0]?.[0] || '';
  const topExpenseValue = sortedCategories[0]?.[1] || 0;
  const foodExpense = (byCategory['Alimentação'] || 0) + expenseTxs
    .filter(t => /ifood|delivery|lanche|restaurante|mercado|supermercado/i.test(t.desc || ''))
    .reduce((sum, t) => sum + t.value, 0);

  const recurringCount = state.transactions.filter(t => t.recurrence && t.recurrence !== 'once').length;
  const goalsCount = state.goals.length;
  const emergencyGoal = state.goals.find(g => /reserva|emerg[eê]ncia/i.test(g.name || ''));
  const avgMonthlyExpense = getLast6Months()
    .map(m => getMonthTotal(m.year, m.month, 'expense'))
    .filter(v => v > 0);

  const expenseBase = avgMonthlyExpense.length
    ? avgMonthlyExpense.reduce((a, b) => a + b, 0) / avgMonthlyExpense.length
    : summary.expense;

  const emergencyTarget = Math.max(expenseBase * 6, 3000);
  const emergencyCurrent = emergencyGoal ? (emergencyGoal.current || 0) : 0;
  const emergencyCoveragePct = emergencyTarget > 0 ? Math.min((emergencyCurrent / emergencyTarget) * 100, 100) : 0;

  const latestIncomeDate = incomeTxs
    .map(t => new Date(t.date))
    .sort((a, b) => b - a)[0] || null;

  let spendAfterIncome = 0;
  if (latestIncomeDate) {
    const start = new Date(latestIncomeDate);
    const end = new Date(latestIncomeDate);
    end.setDate(end.getDate() + 5);

    spendAfterIncome = expenseTxs
      .filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      })
      .reduce((sum, t) => sum + t.value, 0);
  }

  const negativeMonths = getLast6Months().filter(m => {
    const monthIncome = getMonthTotal(m.year, m.month, 'income');
    const monthExpense = getMonthTotal(m.year, m.month, 'expense');
    return monthIncome - monthExpense < 0;
  }).length;

  const concentrationPct = summary.income > 0 ? (topExpenseValue / summary.income) * 100 : 0;

  let disciplineScore = 50;
  if (summary.balance >= 0) disciplineScore += 15; else disciplineScore -= 20;
  if (summary.savingsRate >= 20) disciplineScore += 20;
  else if (summary.savingsRate >= 10) disciplineScore += 8;
  else disciplineScore -= 10;
  if (goalsCount > 0) disciplineScore += 8;
  if (emergencyCoveragePct >= 50) disciplineScore += 10;
  if (recurringCount <= 3) disciplineScore += 5;
  if (negativeMonths >= 3) disciplineScore -= 10;
  disciplineScore = Math.max(10, Math.min(100, Math.round(disciplineScore)));

  return {
    txs,
    ...summary,
    byCategory,
    topExpenseCategory,
    topExpenseValue,
    foodExpense,
    recurringCount,
    goalsCount,
    emergencyTarget,
    emergencyCurrent,
    emergencyCoveragePct,
    spendAfterIncome,
    concentrationPct,
    negativeMonths,
    disciplineScore
  };
}

function getEducationDiagnosis(ctx) {
  const priorities = [];

  if (ctx.emergencyCoveragePct < 20) {
    priorities.push({
      level: 'Risco Alto',
      title: 'Você está financeiramente exposto',
      desc: `Sua proteção financeira está abaixo do mínimo. A reserva recomendada para sua realidade é ${fmt(ctx.emergencyTarget)} e hoje você tem ${fmt(ctx.emergencyCurrent)}.`,
      gain: 'Blindar imprevistos e reduzir chance de dívida cara.',
      lessonId: 'reserve-shield'
    });
  }

  if (ctx.savingsRate < 10) {
    priorities.push({
      level: 'Urgente',
      title: 'Você não está retendo dinheiro suficiente',
      desc: `Sua taxa de retenção está em ${ctx.savingsRate.toFixed(1)}%. Isso indica baixa capacidade de acumular segurança e patrimônio.`,
      gain: 'Aumentar folga financeira já no próximo ciclo.',
      lessonId: 'salary-evaporation'
    });
  }

  if (ctx.topExpenseCategory && ctx.concentrationPct >= 20) {
    priorities.push({
      level: 'Ação Rápida',
      title: `${ctx.topExpenseCategory} está consumindo fatia relevante da sua renda`,
      desc: `Seu maior centro de gasto no mês é ${ctx.topExpenseCategory}, somando ${fmt(ctx.topExpenseValue)}.`,
      gain: 'Reduzir vazamento com ajuste simples de comportamento.',
      lessonId: ctx.topExpenseCategory === 'Alimentação' ? 'food-control' : 'cash-bleeding'
    });
  }

  if (ctx.recurringCount >= 4) {
    priorities.push({
      level: 'Revisão',
      title: 'Você tem despesas recorrentes demais para ignorar',
      desc: `Há ${ctx.recurringCount} cobranças recorrentes ativas no sistema. Custos silenciosos tendem a corroer margem mês após mês.`,
      gain: 'Aliviar o peso fixo do orçamento.',
      lessonId: 'recurring-burden'
    });
  }

  if (!priorities.length) {
    priorities.push({
      level: 'Crescimento',
      title: 'Sua base está relativamente estável',
      desc: `Seu saldo do período está em ${fmt(ctx.balance)} e a taxa de retenção em ${ctx.savingsRate.toFixed(1)}%. Agora o foco passa a ser consistência e crescimento.`,
      gain: 'Transformar controle em patrimônio.',
      lessonId: 'stability-before-investing'
    });
  }

  return priorities[0];
}

function getEducationMission(ctx) {
  if (ctx.savingsRate < 10) {
    return {
      id: 'mission-cut-variable',
      title: 'Missão de 7 dias: travar gastos variáveis',
      desc: 'Passe os próximos 7 dias registrando tudo e evitando compras por impulso.',
      reward: 80,
      button: 'Marcar missão como aplicada'
    };
  }

  if (ctx.emergencyCoveragePct < 20) {
    return {
      id: 'mission-create-reserve',
      title: 'Missão: ativar sua blindagem mínima',
      desc: 'Crie hoje uma meta de reserva de emergência e defina o primeiro aporte.',
      reward: 100,
      button: 'Concluir missão'
    };
  }

  if (ctx.foodExpense > 0) {
    return {
      id: 'mission-food-cap',
      title: 'Missão: reduzir alimentação fora em 15%',
      desc: `Seu gasto atual em alimentação está em ${fmt(ctx.foodExpense)}. O alvo agora é reduzir pelo menos 15%.`,
      reward: 70,
      button: 'Aplicar redução'
    };
  }

  return {
    id: 'mission-structure',
    title: 'Missão: reforçar sua disciplina financeira',
    desc: 'Revise categorias, metas e uma prioridade do mês para manter consistência.',
    reward: 60,
    button: 'Marcar como feita'
  };
}

function getPriorityProgramId(ctx) {
  const diagnosis = getEducationDiagnosis(ctx);
  return diagnosis.lessonId;
}

function renderEducationHero(ctx) {
  const diagnosis = getEducationDiagnosis(ctx);
  const mission = getEducationMission(ctx);

  const impact = Math.round(ctx.topExpenseValue || 0);
  const potentialSave = Math.round((ctx.topExpenseValue || 0) * 0.2);

  return `
    <div class="edu-card" style="grid-column:1/-1;padding:28px;border:1px solid rgba(99,102,241,.25);background:linear-gradient(135deg, rgba(99,102,241,.12), rgba(15,23,42,.95));">

      <!-- PROBLEMA PRINCIPAL -->
      <div style="margin-bottom:18px;">
        <div style="font-size:12px;text-transform:uppercase;color:#818cf8;margin-bottom:6px;">
          Situação atual
        </div>

        <div style="font-size:28px;font-weight:800;color:var(--text-primary);line-height:1.2;">
          ${diagnosis.title}
        </div>

        <div style="font-size:15px;color:var(--text-secondary);margin-top:10px;max-width:680px;">
          ${diagnosis.desc}
        </div>
      </div>

      <!-- IMPACTO -->
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <div style="padding:12px 16px;border-radius:12px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);">
          <div style="font-size:11px;color:#fca5a5;">Impacto atual</div>
          <div style="font-size:18px;font-weight:800;color:#fecaca;">
            R$ ${impact.toLocaleString()}
          </div>
        </div>

        <div style="padding:12px 16px;border-radius:12px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);">
          <div style="font-size:11px;color:#86efac;">Potencial de melhoria</div>
          <div style="font-size:18px;font-weight:800;color:#bbf7d0;">
            +R$ ${potentialSave.toLocaleString()}/mês
          </div>
        </div>

        <div style="padding:12px 16px;border-radius:12px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);">
          <div style="font-size:11px;color:#a5b4fc;">Retenção atual</div>
          <div style="font-size:18px;font-weight:800;color:white;">
            ${ctx.savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <!-- AÇÃO DIRETA -->
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:20px;">
        <div style="font-size:14px;color:var(--text-secondary);">
          Próximo passo recomendado:
        </div>

        <button class="btn-primary" onclick="applyEducationAction('${diagnosis.lessonId}')">
          Resolver agora
        </button>
      </div>

      <!-- FAÇA AGORA -->
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,.06);">

        <div style="font-size:13px;text-transform:uppercase;color:#818cf8;margin-bottom:10px;">
          Ações rápidas (faça agora)
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          <button class="btn-ghost" onclick="navigate('transactions')">Revisar gastos</button>
          <button class="btn-ghost" onclick="navigate('goals')">Criar meta</button>
          <button class="btn-ghost" onclick="navigate('settings')">Definir limites</button>
          <button class="btn-ghost" onclick="navigate('ai')">Ver análise IA</button>
        </div>
      </div>

      <!-- MISSÃO -->
      <div style="margin-top:20px;padding:16px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);">
        <div style="font-size:12px;color:#818cf8;margin-bottom:6px;">Missão recomendada</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:6px;">
          ${mission.title}
        </div>
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:10px;">
          ${mission.desc}
        </div>

        <button class="btn-primary" onclick="completeEducationMission('${mission.id}', ${mission.reward})">
          ${mission.button}
        </button>
      </div>

    </div>
  `;
}

function renderEducationTracks(ctx) {
  const completed = state.eduProgress.completed || [];
  const priorityId = getPriorityProgramId(ctx);

  return EDUCATION_PROGRAMS.map(program => {
    const done = completed.includes(program.id);
    const priority = priorityId === program.id;

    return `
      <div class="edu-card ${done ? 'completed' : ''}" style="${priority ? 'border:1px solid rgba(99,102,241,.35);box-shadow:0 0 0 1px rgba(99,102,241,.08) inset;' : ''}" onclick="openLesson('${program.id}')">
        <div class="edu-card-header">
          <div class="edu-emoji">${program.emoji}</div>
          <div class="edu-meta">
            <div class="edu-tag">${priority ? 'PRIORIDADE · ' : ''}${program.tag}</div>
            <div class="edu-title">${program.title}</div>
          </div>
        </div>

        <div class="edu-desc" style="min-height:72px;">${program.problem}</div>

        <div style="margin:14px 0;padding:12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04);">
          <div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">${program.metricLabel}</div>
          <div style="font-size:18px;font-weight:800;color:var(--text-primary);">${program.getMetric(ctx)}</div>
        </div>

        <div class="edu-footer" style="margin-bottom:10px;">
          <span class="edu-duration">⏱ ${program.duration} · ${program.difficulty}</span>
          <span class="edu-badge ${done ? 'completed' : (priority ? 'new' : 'new')}">${done ? '✓ Aplicado' : (priority ? 'Prioritário' : 'Disponível')}</span>
        </div>

        <button class="btn-ghost" style="width:100%;justify-content:center;" onclick="event.stopPropagation(); applyEducationAction('${program.ctaAction}')">${program.ctaLabel}</button>
      </div>
    `;
  }).join('');
}

function renderEducation() {
  ensureEducationState();

  const grid = document.getElementById('eduGrid');
  if (!grid) return;

  const ctx = getEducationContext();

  document.getElementById('lessonsCompleted').textContent = state.eduProgress.completed.length;
  document.getElementById('eduStreak').textContent = state.eduProgress.streak || 0;
  document.getElementById('eduPoints').textContent = state.eduProgress.points || 0;

  grid.innerHTML = `
    ${renderEducationHero(ctx)}
    ${renderEducationTracks(ctx)}
  `;
}

function applyEducationAction(action) {
  if (action === 'review-transactions') {
    navigate('transactions');
    return;
  }

  if (action === 'create-emergency-goal') {
    navigate('goals');
    setTimeout(() => {
      if (typeof openGoalModal === 'function') openGoalModal();
    }, 120);
    return;
  }

  if (action === 'set-food-limit') {
    navigate('settings');
    setTimeout(() => {
      const input = document.querySelector('.limit-input[data-cat="Alimentação"]');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
    return;
  }

  if (action === 'open-goals') {
    navigate('goals');
    return;
  }

  if (action === 'open-ai') {
    navigate('ai');
    return;
  }

  if (action === 'complete-mission') {
    const mission = getEducationMission(getEducationContext());
    completeEducationMission(mission.id, mission.reward);
  }
}

function openLesson(id) {
  const lesson = EDUCATION_PROGRAMS.find(item => item.id === id);
  if (!lesson) return;

  const ctx = getEducationContext();
  const content = getLessonContent(id, ctx);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:760px;">
      <div class="modal-header">
        <h2>${lesson.emoji} ${lesson.title}</h2>
        <button onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>

      <div class="modal-body" style="max-height:68vh;overflow-y:auto;">
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <span style="padding:8px 12px;border-radius:999px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);font-size:12px;color:#a5b4fc;">${lesson.tag}</span>
          <span style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);font-size:12px;color:var(--text-secondary);">${lesson.duration} · ${lesson.difficulty}</span>
        </div>

        <div style="margin-bottom:16px;padding:14px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);">
          <div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Diagnóstico conectado ao usuário</div>
          <div style="font-size:15px;line-height:1.7;color:var(--text-secondary);">${lesson.problem}</div>
        </div>

        <div style="line-height:1.85;font-size:15px;color:var(--text-secondary);">${content}</div>
      </div>

      <div class="modal-footer" style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn-ghost" onclick="applyEducationAction('${lesson.ctaAction}')">${lesson.ctaLabel}</button>
        <button class="btn-primary" onclick="completeLesson('${id}', this.closest('.modal-overlay'))">✓ Marcar como aplicada</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function getLessonContent(id, ctx) {
  const content = {
    'cash-bleeding': `
      <p><strong>O problema real não é só gastar.</strong> É gastar sem perceber o padrão. Quando o usuário não enxerga para onde o dinheiro escapa, ele sente que “nunca sobra”, mesmo trabalhando e recebendo.</p>
      <br>
      <p><strong>No seu cenário atual:</strong> a categoria de maior pressão é <strong>${ctx.topExpenseCategory || 'não identificada'}</strong>, somando <strong>${fmt(ctx.topExpenseValue)}</strong> no período.</p>
      <br>
      <p><strong>Estratégia prática:</strong></p>
      <p>1. Liste as 5 últimas despesas da categoria crítica.</p>
      <p>2. Separe o que foi necessidade real do que foi conforto/impulso.</p>
      <p>3. Defina um teto semanal, não apenas mensal.</p>
      <p>4. Faça revisão de 3 minutos ao final do dia.</p>
      <br>
      <p><strong>Métrica de controle:</strong> o objetivo é reduzir de 10% a 20% esse centro de gasto sem gerar sensação de punição.</p>
    `,
    'reserve-shield': `
      <p><strong>Reserva de emergência não é luxo. É blindagem.</strong> Sem ela, qualquer choque empurra o usuário para cartão, empréstimo ou atraso.</p>
      <br>
      <p><strong>No seu caso:</strong> o alvo de proteção estimado é <strong>${fmt(ctx.emergencyTarget)}</strong>. Hoje, sua cobertura está em <strong>${ctx.emergencyCoveragePct.toFixed(0)}%</strong>.</p>
      <br>
      <p><strong>Ordem correta:</strong></p>
      <p>1. Definir a meta mínima.</p>
      <p>2. Criar aporte recorrente, mesmo pequeno.</p>
      <p>3. Não misturar reserva com meta de consumo.</p>
      <p>4. Priorizar liquidez e segurança, não rentabilidade agressiva.</p>
      <br>
      <p><strong>Verdade prática:</strong> a reserva reduz ansiedade, dá poder de decisão e impede que um problema vire crise financeira.</p>
    `,
    'food-control': `
      <p><strong>Alimentação fora de casa parece pequena no dia. No mês, vira erosão de margem.</strong></p>
      <br>
      <p><strong>Seu gasto atual ligado a alimentação está em torno de:</strong> <strong>${fmt(ctx.foodExpense)}</strong>.</p>
      <br>
      <p><strong>Como corrigir sem radicalismo:</strong></p>
      <p>1. Defina um teto semanal para alimentação variável.</p>
      <p>2. Identifique os 3 gatilhos mais frequentes: pressa, cansaço ou recompensa.</p>
      <p>3. Crie duas alternativas de baixo atrito: compra planejada e refeição pronta em casa.</p>
      <p>4. Monitore delivery separado de supermercado.</p>
      <br>
      <p><strong>Métrica de vitória:</strong> reduzir 15% a 20% já costuma abrir espaço para meta ou reserva.</p>
    `,
    'salary-evaporation': `
      <p><strong>O salário não some por mágica. Ele some por falta de retenção.</strong></p>
      <br>
      <p><strong>Sua retenção atual:</strong> <strong>${ctx.savingsRate.toFixed(1)}%</strong>.</p>
      <p><strong>Gasto nos 5 dias após a entrada de renda:</strong> <strong>${fmt(ctx.spendAfterIncome)}</strong>.</p>
      <br>
      <p><strong>O padrão clássico é:</strong> entra dinheiro → sensação de alívio → compra reprimida → mês volta a apertar.</p>
      <br>
      <p><strong>Estratégia profissional:</strong></p>
      <p>1. No dia da entrada, separar primeiro o dinheiro da meta principal.</p>
      <p>2. Definir teto claro para os 5 primeiros dias.</p>
      <p>3. Evitar decisões emocionais nesse intervalo.</p>
      <p>4. Revisar se a maior perda vem de conforto imediato ou de custo fixo mal calibrado.</p>
    `,
    'goal-discipline': `
      <p><strong>Meta sem rotina de aporte vira intenção emocional, não construção real.</strong></p>
      <br>
      <p><strong>Hoje você tem ${ctx.goalsCount} meta(s) ativa(s).</strong></p>
      <br>
      <p><strong>Transformação real:</strong></p>
      <p>1. Cada meta precisa de prazo.</p>
      <p>2. Cada prazo precisa de aporte recorrente.</p>
      <p>3. Cada aporte precisa caber no seu fluxo atual.</p>
      <p>4. Se a meta não recebe dinheiro, ela não está ativa de verdade.</p>
      <br>
      <p><strong>Regra simples:</strong> metas grandes só saem do papel quando entram no calendário e no orçamento.</p>
    `,
    'recurring-burden': `
      <p><strong>Despesas recorrentes viram invisíveis porque deixam de doer. Mas continuam drenando caixa.</strong></p>
      <br>
      <p><strong>Você possui ${ctx.recurringCount} item(ns) recorrente(s) registrado(s).</strong></p>
      <br>
      <p><strong>Auditoria prática:</strong></p>
      <p>1. Liste tudo que repete mensalmente.</p>
      <p>2. Marque: essencial, útil ou descartável.</p>
      <p>3. Corte o que não entrega valor proporcional.</p>
      <p>4. Renegocie o que é necessário, mas está caro.</p>
      <br>
      <p><strong>Objetivo:</strong> diminuir peso fixo para aumentar margem de decisão.</p>
    `,
    'stability-before-investing': `
      <p><strong>Investir antes de estabilizar o básico é construir em terreno frágil.</strong></p>
      <br>
      <p><strong>Seu saldo atual:</strong> <strong>${fmt(ctx.balance)}</strong>.</p>
      <p><strong>Meses negativos nos últimos 6 meses:</strong> <strong>${ctx.negativeMonths}</strong>.</p>
      <br>
      <p><strong>Ordem profissional:</strong></p>
      <p>1. Eliminar desorganização.</p>
      <p>2. Construir folga.</p>
      <p>3. Formar reserva.</p>
      <p>4. Só então acelerar crescimento.</p>
      <br>
      <p><strong>Verdade importante:</strong> investir com caixa instável aumenta ansiedade e probabilidade de resgate errado.</p>
    `,
    'discipline-engine': `
      <p><strong>Disciplina financeira não depende de “estar motivado”. Depende de sistema.</strong></p>
      <br>
      <p><strong>Sua consistência estimada hoje:</strong> <strong>${ctx.disciplineScore}/100</strong>.</p>
      <br>
      <p><strong>Motor de disciplina:</strong></p>
      <p>1. Um ritual fixo de revisão semanal.</p>
      <p>2. Uma prioridade financeira por vez.</p>
      <p>3. Um teto claro para categoria de risco.</p>
      <p>4. Uma meta que receba aporte automático.</p>
      <br>
      <p><strong>Quanto mais simples o sistema, maior a chance de repetição.</strong> O usuário evolui quando reduz atrito, não quando depende de força de vontade heroica.</p>
    `
  };

  return content[id] || `<p>Conteúdo em preparação.</p>`;
}

function completeLesson(id, overlay) {
  ensureEducationState();

  if (!state.eduProgress.completed.includes(id)) {
    state.eduProgress.completed.push(id);
    state.eduProgress.points = (state.eduProgress.points || 0) + 80;
    state.eduProgress.streak = (state.eduProgress.streak || 0) + 1;
    saveUserData();
    showToast('success', 'Aplicado com sucesso!', 'Esse módulo entrou no seu progresso educacional.');
  } else {
    showToast('info', 'Módulo já concluído', 'Esse conteúdo já está marcado no seu progresso.');
  }

  if (overlay) overlay.remove();
  renderEducation();
}

function completeEducationMission(missionId, reward) {
  ensureEducationState();

  if (!state.eduProgress.missionsDone.includes(missionId)) {
    state.eduProgress.missionsDone.push(missionId);
    state.eduProgress.points = (state.eduProgress.points || 0) + reward;
    state.eduProgress.streak = (state.eduProgress.streak || 0) + 1;
    state.eduProgress.lastMissionDate = new Date().toISOString();
    saveUserData();
    showToast('success', 'Missão concluída!', `+${reward} pontos adicionados.`);
  } else {
    showToast('info', 'Missão já registrada', 'Essa missão já foi marcada anteriormente.');
  }

  renderEducation();
}
// ==========================================
// REPORTS PAGE
// ==========================================
function renderReports() {
  renderMonthlyReportChart();
  renderCategoryReportChart();
  renderTrendChart();
  renderDetailedReport();
}

function renderMonthlyReportChart() {
  const ctx = document.getElementById('monthlyReportChart');
  if (!ctx) return;

  destroyChart('monthlyReport');

  const months = getLast6Months();
  const incomeData = months.map(m => getMonthTotal(m.year, m.month, 'income'));
  const expenseData = months.map(m => getMonthTotal(m.year, m.month, 'expense'));

  state.charts.monthlyReport = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'Receitas', data: incomeData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, borderWidth: 2 },
        { label: 'Despesas', data: expenseData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8892a4' }, border: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892a4', callback: v => 'R$' + (v/1000).toFixed(1) + 'k' }, border: { display: false } }
      }
    }
  });
}

function renderCategoryReportChart() {
  const ctx = document.getElementById('categoryReportChart');
  if (!ctx) return;

  destroyChart('categoryReport');

  const txs = state.transactions.filter(t => t.type === 'expense');
  const by = {};
  txs.forEach(t => { by[t.category] = (by[t.category] || 0) + t.value; });
  const sorted = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

  state.charts.categoryReport = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{ data: sorted.map(s => s[1]), backgroundColor: colors, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892a4', callback: v => 'R$' + (v/1000).toFixed(0) + 'k' }, border: { display: false } },
        y: { grid: { display: false }, ticks: { color: '#8892a4', font: { size: 12 } }, border: { display: false } }
      }
    }
  });
}

function renderTrendChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  destroyChart('trend');

  const months = getLast6Months();
  const balanceData = months.map(m => {
    const inc = getMonthTotal(m.year, m.month, 'income');
    const exp = getMonthTotal(m.year, m.month, 'expense');
    return inc - exp;
  });

  state.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'Saldo Mensal',
        data: balanceData,
        borderColor: '#6366f1',
        backgroundColor: ctx2 => {
          const g = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 300);
          g.addColorStop(0, 'rgba(99,102,241,0.2)');
          g.addColorStop(1, 'rgba(99,102,241,0)');
          return g;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointBackgroundColor: balanceData.map(v => v >= 0 ? '#10b981' : '#ef4444'),
        pointRadius: 5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Saldo: ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8892a4' }, border: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892a4', callback: v => 'R$' + (v/1000).toFixed(1) + 'k' }, border: { display: false } }
      }
    }
  });
}

function renderDetailedReport() {
  const container = document.getElementById('detailedReport');
  if (!container) return;

  const months = getLast6Months();
  const rows = months.map(m => {
    const inc = getMonthTotal(m.year, m.month, 'income');
    const exp = getMonthTotal(m.year, m.month, 'expense');
    const bal = inc - exp;
    const rate = inc > 0 ? ((bal / inc) * 100).toFixed(1) : 0;
    return { label: m.label, inc, exp, bal, rate };
  });

  const totalInc = rows.reduce((s, r) => s + r.inc, 0);
  const totalExp = rows.reduce((s, r) => s + r.exp, 0);
  const totalBal = totalInc - totalExp;
  const avgRate = totalInc > 0 ? ((totalBal / totalInc) * 100).toFixed(1) : 0;

  container.innerHTML = `
    <table class="transactions-table">
      <thead>
        <tr>
          <th>Mês</th>
          <th>Receitas</th>
          <th>Despesas</th>
          <th>Saldo</th>
          <th>Taxa de Poupança</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td><strong>${r.label}</strong></td>
            <td class="text-income">${fmt(r.inc)}</td>
            <td class="text-expense">${fmt(r.exp)}</td>
            <td class="${r.bal >= 0 ? 'text-income' : 'text-expense'}">${fmt(r.bal)}</td>
            <td><span class="tx-badge ${r.rate >= 20 ? 'income' : 'expense'}">${r.rate}%</span></td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="border-top:2px solid var(--border);">
          <td><strong>Total</strong></td>
          <td class="text-income"><strong>${fmt(totalInc)}</strong></td>
          <td class="text-expense"><strong>${fmt(totalExp)}</strong></td>
          <td class="${totalBal >= 0 ? 'text-income' : 'text-expense'}"><strong>${fmt(totalBal)}</strong></td>
          <td><span class="tx-badge ${avgRate >= 20 ? 'income' : 'expense'}">${avgRate}%</span></td>
        </tr>
      </tfoot>
    </table>
  `;
}

// ==========================================
// SETTINGS PAGE
// ==========================================
function renderSettings() {
  document.getElementById('settingName').value = state.user?.name || '';
  document.getElementById('settingEmail').value = state.user?.email || '';
  if (state.settings.salary) document.getElementById('settingSalary').value = state.settings.salary;

  const dm = document.getElementById('darkModeToggle');
  if (dm) dm.checked = document.documentElement.getAttribute('data-theme') === 'dark';

  const nt = document.getElementById('notifToggle');
  if (nt) nt.checked = state.settings.notif !== false;

  const ar = document.getElementById('autoReportToggle');
  if (ar) ar.checked = state.settings.autoReport !== false;

  buildLimitsSettings();
}

function buildLimitsSettings() {
  const container = document.getElementById('limitsContainer');
  if (!container) return;

  const categories = ['Alimentação', 'Transporte', 'Lazer', 'Vestuário', 'Assinaturas', 'Saúde'];
  const limits = state.settings.limits || {};

  container.innerHTML = categories.map(c => `
    <div class="limit-item">
      <label>${c}</label>
      <input type="number" class="limit-input" data-cat="${c}" value="${limits[c] || ''}" placeholder="Sem limite" style="width:130px;" />
    </div>
  `).join('');
}

function saveLimits() {
  const inputs = document.querySelectorAll('.limit-input');
  inputs.forEach(inp => {
    const cat = inp.dataset.cat;
    const val = parseFloat(inp.value);
    if (val > 0) state.settings.limits[cat] = val;
    else delete state.settings.limits[cat];
  });
  saveUserData();
  showToast('success', 'Limites salvos!', 'Alertas de gastos configurados.');
}

function saveSettings() {
  const name = document.getElementById('settingName').value.trim();
  const salary = parseFloat(document.getElementById('settingSalary').value) || 0;

  if (name && state.user) {
    state.user.name = name;
    const users = DB.get('users', {});
    if (users[state.user.email]) users[state.user.email].name = name;
    DB.set('users', users);
    updateUserUI();
  }

  state.settings.salary = salary;
  saveUserData();
  showToast('success', 'Perfil salvo!', 'Suas configurações foram atualizadas.');
}

function clearAllData() {
  if (!confirm('⚠️ ATENÇÃO: Todos os dados serão apagados. Esta ação é IRREVERSÍVEL!\n\nDigite "CONFIRMAR" para prosseguir.')) return;
  const k = state.user.email;
  ['transactions', 'goals', 'settings', 'notifications', 'eduProgress'].forEach(key => localStorage.removeItem(`financeai_${key}_${k}`));
  state.transactions = [];
  state.goals = [];
  state.settings = { salary: 0, limits: {} };
  state.notifications = [];
  state.eduProgress = { completed: [], streak: 0, points: 0 };
  navigate('dashboard');
  showToast('success', 'Dados apagados', 'Todos os dados foram removidos.');
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function addNotification(type, text, style = 'info') {
  const notif = { id: genId(), text, style, time: new Date().toISOString(), read: false };
  state.notifications.unshift(notif);
  if (state.notifications.length > 30) state.notifications.pop();
  saveUserData();
  renderNotifications();
  updateNotifBadge();
}

function renderNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;

  const unread = state.notifications.slice(0, 20);

  if (!unread.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:14px;">Sem notificações</div>';
    return;
  }

  list.innerHTML = unread.map(n => `
    <div class="notif-item">
      <div class="notif-dot ${n.style}"></div>
      <div>
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${timeAgo(n.time)}</div>
      </div>
    </div>
  `).join('');

  updateNotifBadge();
}

function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  const count = state.notifications.filter(n => !n.read).length;
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    state.notifications.forEach(n => n.read = true);
    saveUserData();
    updateNotifBadge();
  }
}

function clearNotifications() {
  state.notifications = [];
  saveUserData();
  renderNotifications();
  document.getElementById('notifPanel').classList.add('hidden');
}

// ==========================================
// THEME
// ==========================================
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  state.settings.darkMode = !isDark;
  saveUserData();
  const dm = document.getElementById('darkModeToggle');
  if (dm) dm.checked = !isDark;
  reDrawCharts();
}

function toggleThemeFromSettings() {
  toggleTheme();
}

function reDrawCharts() {
  if (state.currentPage === 'dashboard') renderDashboard();
  else if (state.currentPage === 'reports') renderReports();
  else if (state.currentPage === 'ai') renderAIPage();
}

// ==========================================
// PDF EXPORT
// ==========================================
function exportPDF() {
  showToast('info', 'Gerando PDF...', 'Aguarde enquanto processamos o relatório.');

  setTimeout(() => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const textColor = [26, 29, 46];
      const accentColor = [99, 102, 241];
      const incomeColor = [16, 185, 129];
      const expenseColor = [239, 68, 68];

      // Header
      doc.setFillColor(...accentColor);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('FinanceAI', 20, 18);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório Financeiro Mensal', 20, 28);
      doc.text(new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), 20, 36);

      // User info
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 130, 28);
      doc.text(`Usuário: ${state.user?.name || 'N/A'}`, 130, 34);

      // Summary section
      const txs = getFilteredTx();
      const { income, expense, balance, savingsRate } = calcSummary(txs);

      let y = 55;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('Resumo do Período', 20, y);

      y += 8;
      const metrics = [
        { label: 'Total de Receitas', value: fmt(income), color: incomeColor },
        { label: 'Total de Despesas', value: fmt(expense), color: expenseColor },
        { label: 'Saldo', value: fmt(balance), color: balance >= 0 ? incomeColor : expenseColor },
        { label: 'Taxa de Poupança', value: savingsRate.toFixed(1) + '%', color: accentColor },
      ];

      metrics.forEach((m, i) => {
        const col = i % 2 === 0 ? 20 : 110;
        const row = Math.floor(i / 2);
        doc.setFillColor(248, 249, 255);
        doc.roundedRect(col, y + row * 22, 85, 18, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 110, 130);
        doc.text(m.label, col + 6, y + row * 22 + 7);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...m.color);
        doc.text(m.value, col + 6, y + row * 22 + 15);
      });

      y += 52;

      // Transactions table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('Transações do Período', 20, y);

      y += 8;
      const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'];
      const colWidths = [24, 65, 36, 22, 30];
      let x = 20;

      doc.setFillColor(...accentColor);
      doc.rect(20, y, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');

      headers.forEach((h, i) => {
        doc.text(h, x + 2, y + 5.5);
        x += colWidths[i];
      });

      y += 8;
      const recent = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 25);

      recent.forEach((tx, idx) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 255 : 255);
        doc.rect(20, y, 170, 7, 'F');
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        x = 20;
        const cells = [
          fmtDateDisplay(tx.date),
          tx.desc.substring(0, 28),
          tx.category,
          tx.type === 'income' ? 'Receita' : 'Despesa',
          (tx.type === 'income' ? '+' : '-') + ' ' + fmt(tx.value)
        ];
        cells.forEach((c, i) => {
          if (i === 1 && tx.type === 'income') doc.setTextColor(...incomeColor);
          else if (i === 1 && tx.type === 'expense') doc.setTextColor(...expenseColor);
          else if (i === 4) doc.setTextColor(...(tx.type === 'income' ? incomeColor : expenseColor));
          else doc.setTextColor(...textColor);
          doc.text(c, x + 2, y + 5);
          x += colWidths[i];
        });
        y += 7;
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 200);
        doc.text(`Gerado pelo FinanceAI · Página ${p} de ${pageCount}`, 20, 290);
      }

      doc.save(`FinanceAI_Relatorio_${new Date().toISOString().slice(0, 7)}.pdf`);
      showToast('success', 'PDF gerado!', 'Relatório salvo com sucesso.');
    } catch (e) {
      console.error(e);
      showToast('error', 'Erro ao gerar PDF', 'Tente novamente em instantes.');
    }
  }, 500);
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(type, title, msg) {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-text">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// MODAL HELPERS
// ==========================================
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
  if (!e.target.closest('.notification-bell') && !e.target.closest('.notif-panel')) {
    document.getElementById('notifPanel')?.classList.add('hidden');
  }
});

// ==========================================
// HELPERS
// ==========================================
function genId() { return Math.random().toString(36).substring(2, 11) + Date.now().toString(36); }

function fmt(val) {
  return 'R$ ' + (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function fmtDateDisplay(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMonthYear(ym) {
  const [y, m] = ym.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function recurrenceLabel(r) {
  return { monthly: 'Mensal', weekly: 'Semanal', yearly: 'Anual', once: 'Única' }[r] || r;
}

function getLast6Months() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: `${labels[d.getMonth()]}/${d.getFullYear().toString().slice(2)}` });
  }
  return months;
}

function getMonthTotal(year, month, type) {
  return state.transactions
    .filter(t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === month && t.type === type; })
    .reduce((s, t) => s + t.value, 0);
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function destroyChart(key) {
  if (state.charts[key]) {
    try { state.charts[key].destroy(); } catch {}
    delete state.charts[key];
  }
}

function destroyAllCharts() {
  Object.keys(state.charts).forEach(k => destroyChart(k));
}

// ==========================================
// BOOTSTRAP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const users = getStoredUsers();

  if (!users['demo@financeai.com']) {
    users['demo@financeai.com'] = {
      name: 'Demo User',
      password: btoa('demo1234'),
      createdAt: new Date().toISOString()
    };
    saveStoredUsers(users);

    const prevUser = state.user;
    state.user = { name: 'Demo User', email: 'demo@financeai.com' };
    seedDemoData();
    state.user = prevUser;
  }

  const restored = restoreSession();
  if (restored) return;

  setTimeout(() => {
    const hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;font-size:13px;color:var(--text-secondary);z-index:999;box-shadow:var(--shadow-lg);text-align:center;';
    hint.innerHTML = '👋 Para demo rápido: crie uma conta ou use <strong style="color:var(--accent)">demo@financeai.com</strong> / <strong style="color:var(--accent)">demo1234</strong>';
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 6000);
  }, 1000);
});

// ==========================================
// ALERT ENGINE (SAFE VERSION - FASE 1)
// ==========================================

function analyzeAlertsSafe() {
  if (!state.user) return;

  const txs = getFilteredTx('month');
  const summary = calcSummary(txs);

  // ALERTA 1 — saldo negativo
 if (summary.balance < 0 && shouldTriggerAlert('saldo_negativo', 5)) {
    showToast('error', 'Saldo negativo', 'Suas despesas estão maiores que sua receita.');
    
    addNotification(
      'Alerta financeiro',
      'Você está com saldo negativo este mês.',
      'error'
    );
  }

  // ALERTA 2 — baixa poupança
  if (summary.savingsRate < 10 && shouldTriggerAlert('poupanca_baixa', 15)) {
    addNotification(
      'Baixa poupança',
      `Você está poupando apenas ${summary.savingsRate.toFixed(1)}%`,
      'warning'
    );
  }

  // ALERTA 3 — gasto alto categoria
  const expenses = txs.filter(t => t.type === 'expense');
  const byCategory = {};

  expenses.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.value;
  });

  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  if (top && summary.income > 0) {
    const percent = (top[1] / summary.income) * 100;

    if (percent > 30 && shouldTriggerAlert('categoria_' + top[0], 20)) {
      addNotification(
        'Gasto elevado',
        `${top[0]} está consumindo ${percent.toFixed(0)}% da sua renda`,
        'warning'
      );
    }
  }
}

// ==========================================
// ALERT CONTROL SYSTEM (FASE 2)
// ==========================================

function shouldTriggerAlert(key, cooldownMinutes = 10) {
  if (!state.user) return false;

  const storageKey = `alert_control_${state.user.email}`;
  const control = DB.get(storageKey, {});

  const now = Date.now();

  if (control[key]) {
    const diff = (now - control[key]) / (1000 * 60);
    if (diff < cooldownMinutes) {
      return false;
    }
  }

  control[key] = now;
  DB.set(storageKey, control);

  return true;
}
