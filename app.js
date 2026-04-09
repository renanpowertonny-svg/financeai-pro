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
  missionStatus: {    date: null,
    type: 'discipline',
    severity: 'stable',
    diagnosis: 'controlled_growth',
    title: '',
    text: '',
    actionLabel: 'Executar missão',
    target: 0,
    current: 0,
    completed: false,
    savedAmount: 0,
    status: 'pending',
    scoreDeltaSuccess: 2,
    scoreDeltaFail: -3,
    psychologicalTone: 'supportive'
  },
  missionHistory: [],
  behaviorProfile: {
    dominantPain: 'controlled_growth',
    severity: 'stable',
    failStreak: 0,
    successStreak: 0,
    recentFailureTypes: [],
    recentSuccessTypes: []
  },
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
 eduProgress: { completed: [], streak: 0, points: 0 },
 behaviorMemory: []
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
  state.missionStatus = {
  date: null,
  type: 'discipline',
  severity: 'stable',
  diagnosis: 'controlled_growth',
  title: '',
  text: '',
  actionLabel: 'Executar missão',
  target: 0,
  current: 0,
  completed: false,
  savedAmount: 0,
  status: 'pending',
  scoreDeltaSuccess: 2,
  scoreDeltaFail: -3,
  psychologicalTone: 'supportive'
};

state.missionHistory = [];

state.behaviorProfile = {
  dominantPain: 'controlled_growth',
  severity: 'stable',
  failStreak: 0,
  successStreak: 0,
  recentFailureTypes: [],
  recentSuccessTypes: []
};
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
 state.behaviorMemory = [];
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

state.missionStatus = DB.get(`missionStatus_${k}`, {
  date: null,
  type: 'discipline',
  severity: 'stable',
  diagnosis: 'controlled_growth',
  title: '',
  text: '',
  actionLabel: 'Executar missão',
  target: 0,
  current: 0,
  completed: false,
  savedAmount: 0,
  status: 'pending',
  scoreDeltaSuccess: 2,
  scoreDeltaFail: -3,
  psychologicalTone: 'supportive'
});

state.missionHistory = DB.get(`missionHistory_${k}`, []);

state.behaviorProfile = DB.get(`behaviorProfile_${k}`, {
  dominantPain: 'controlled_growth',
  severity: 'stable',
  failStreak: 0,
  successStreak: 0,
  recentFailureTypes: [],
  recentSuccessTypes: []
});

state.eduProgress = DB.get(`eduProgress_${k}`, { completed: [], streak: 0, points: 0 });
state.behaviorMemory = DB.get(`behaviorMemory_${k}`, []);
}

function saveUserData() {
  const k = state.user.email;
DB.set(`transactions_${k}`, state.transactions);
DB.set(`goals_${k}`, state.goals);
DB.set(`settings_${k}`, state.settings);
DB.set(`notifications_${k}`, state.notifications);
DB.set(`missionStatus_${k}`, state.missionStatus);
DB.set(`missionHistory_${k}`, state.missionHistory);
DB.set(`behaviorProfile_${k}`, state.behaviorProfile);
DB.set(`eduProgress_${k}`, state.eduProgress);
DB.set(`behaviorMemory_${k}`, state.behaviorMemory);
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
function buildPredictiveSignals(snap) {
  if (!snap) {
    return {
      predictiveHeadline: 'Sem dados suficientes para previsão.',
      predictiveBody: 'Adicione mais transações para ativar a leitura comportamental.'
    };
  }

  const {
    summary,
    projectedBalance = 0,
    spendAfterIncomePct = 0,
    score = 0,
    behavior = {},
    metrics = {},
    behaviorState = {},
    languagePack = {}
  } = snap;

  const impulseExpenseCount = behavior.impulseExpenseCount || 0;

  if (behaviorState.state === 'pre_collapse' || projectedBalance < 0) {
    const days = Math.max(1, Math.round(Math.abs(projectedBalance) / Math.max(behavior.dailyAvgExpense || 50, 50)));
    return {
      predictiveHeadline: `Em ${days} dias seu caixa pode romper se esse padrão continuar.`,
      predictiveBody: 'Seu problema não está mais só no nível de gasto. Está no padrão que acelera dano e reduz sua capacidade de reação.'
    };
  }

  if (behaviorState.state === 'sabotage_active') {
    return {
      predictiveHeadline: 'Sua disciplina está sendo rompida por sabotagem ativa.',
      predictiveBody: 'Mesmo sem colapso imediato, a repetição atual já aponta deterioração concreta nos próximos dias.'
    };
  }

  if (metrics.postIncomeVulnerability >= 55 || spendAfterIncomePct >= 60) {
    return {
      predictiveHeadline: 'Sua vulnerabilidade aumenta logo após entrada de renda.',
      predictiveBody: 'Esse comportamento comprime sua margem cedo demais e tende a gerar sufoco antes do fim do ciclo.'
    };
  }

  if (metrics.silentRiskLoad >= 55) {
    return {
      predictiveHeadline: 'Seu risco está se formando de maneira silenciosa.',
      predictiveBody: 'Você ainda não parece em colapso, mas sua consistência está cedendo antes do problema ficar óbvio.'
    };
  }

  if (behaviorState.state === 'recovery_fragile') {
    return {
      predictiveHeadline: 'Sua melhora ainda não é estrutural.',
      predictiveBody: 'O sistema detecta alívio, mas não estabilização. O risco é repetir o mesmo ciclo com aparência de controle.'
    };
  }

  if (impulseExpenseCount >= 3 || score >= 30) {
    return {
      predictiveHeadline: languagePack.headline || 'Seu comportamento entrou em zona de atenção.',
      predictiveBody: languagePack.body || 'Há sinais iniciais de fragmentação da disciplina financeira.'
    };
  }

  return {
    predictiveHeadline: 'Seu padrão financeiro está sob controle.',
    predictiveBody: 'O sistema não detectou ruptura ativa, mas continua monitorando consistência e fragilidade.'
  };
}
function getBehaviorEngineSnapshot() {
  const base = typeof getRiskSnapshot === 'function' ? getRiskSnapshot() : null;
  if (!base) return null;

  updateBehaviorProfileFromMissionHistory();

  const txs = getFilteredTx('month');
  const today = fmtDate(new Date());

  const nonEssentialCategories = new Set([
    'Lazer',
    'Vestuário',
    'Assinaturas',
    'Outros'
  ]);

  const impulseCategories = new Set([
    'Lazer',
    'Vestuário',
    'Assinaturas',
    'Outros',
    'Alimentação'
  ]);

  const todayExpenses = txs.filter(t => t.type === 'expense' && t.date === today);
  const todayNonEssentialTotal = todayExpenses
    .filter(t => nonEssentialCategories.has(t.category))
    .reduce((sum, t) => sum + t.value, 0);

  const impulseExpenseCount = txs
    .filter(t => t.type === 'expense' && impulseCategories.has(t.category) && t.value <= 180)
    .length;

  const failStreak = Number(state.behaviorProfile.failStreak || 0);
  const successStreak = Number(state.behaviorProfile.successStreak || 0);
  const spendAfterIncomePct = Number(base.spendAfterIncomePct || 0);
  const dailyAvgExpense = Number(base.dailyAvgExpense || 0);
  const savingsRate = Number(base.summary?.savingsRate || 0);
  const projectedBalance = Number(base.projectedBalance || 0);

  let score = Number(base.score || 0);
  let primaryDriver = 'stable_control';
  let sabotagePattern = 'none';
  let behavioralPressure = 0;

  if (projectedBalance < 0) {
    score += 8;
    behavioralPressure += 8;
    primaryDriver = 'cash_collapse_risk';
  }

  if (spendAfterIncomePct >= 80) {
    score += 12;
    behavioralPressure += 12;
    primaryDriver = 'post_income_burn';
    sabotagePattern = 'burn_after_income';
  } else if (spendAfterIncomePct >= 65) {
    score += 8;
    behavioralPressure += 8;
    primaryDriver = 'post_income_burn';
    sabotagePattern = 'burn_after_income';
  }

  if (savingsRate < 5) {
    score += 9;
    behavioralPressure += 9;
    if (primaryDriver === 'stable_control') primaryDriver = 'retention_failure';
  } else if (savingsRate < 10) {
    score += 5;
    behavioralPressure += 5;
    if (primaryDriver === 'stable_control') primaryDriver = 'retention_failure';
  }

  if (todayNonEssentialTotal >= 120) {
    score += 6;
    behavioralPressure += 6;
    if (primaryDriver === 'stable_control') primaryDriver = 'non_essential_spike';
  } else if (todayNonEssentialTotal >= 60) {
    score += 3;
    behavioralPressure += 3;
    if (primaryDriver === 'stable_control') primaryDriver = 'non_essential_spike';
  }

  if (impulseExpenseCount >= 6) {
    score += 6;
    behavioralPressure += 6;
    sabotagePattern = sabotagePattern === 'none' ? 'impulse_cluster' : sabotagePattern;
    if (primaryDriver === 'stable_control') primaryDriver = 'impulse_cluster';
  } else if (impulseExpenseCount >= 3) {
    score += 3;
    behavioralPressure += 3;
    sabotagePattern = sabotagePattern === 'none' ? 'impulse_cluster' : sabotagePattern;
  }

  if (failStreak >= 3) {
    score += 10;
    behavioralPressure += 10;
    sabotagePattern = 'mission_resistance';
    primaryDriver = primaryDriver === 'stable_control' ? 'mission_resistance' : primaryDriver;
  } else if (failStreak >= 2) {
    score += 6;
    behavioralPressure += 6;
    sabotagePattern = sabotagePattern === 'none' ? 'mission_resistance' : sabotagePattern;
  }

  if (successStreak >= 3) {
    score -= 8;
    behavioralPressure -= 8;
  } else if (successStreak >= 2) {
    score -= 4;
    behavioralPressure -= 4;
  }

  if (state.behaviorProfile.lastMissionImpact) {
    const impact = Number(state.behaviorProfile.lastMissionImpact || 0);
    const outcome = state.behaviorProfile.lastMissionOutcome || null;

    if (outcome === 'success') {
      score -= impact;
    } else if (outcome === 'fail') {
      score += impact;
    }
  }

  score = clampScore(score);

  const sabotageDiagnostic = detectFinancialSabotagePattern({
    spendAfterIncomePct,
    impulseExpenseCount,
    failStreak,
    dailyAvgExpense
  });

  const addictionDiagnostic = detectFinancialAddictionPattern({
    impulseExpenseCount,
    dailyAvgExpense,
    spendAfterIncomePct,
    todayNonEssentialTotal
  });

  const financialIdentity = buildUserFinancialIdentity({
    score,
    failStreak,
    successStreak,
    sabotagePattern: sabotageDiagnostic
  });

  const behavior = {
    failStreak,
    successStreak,
    todayNonEssentialTotal,
    impulseExpenseCount,
    behavioralPressure,
    primaryDriver,
    sabotagePattern,
    sabotageDiagnostic,
    addictionDiagnostic,
    financialIdentity,
    dailyAvgExpense
  };

  const patterns = typeof detectBehaviorPatterns === 'function'
    ? detectBehaviorPatterns({
        score,
        failStreak,
        successStreak,
        spendAfterIncomePct,
        projectedBalance,
        savingsRate,
        todayNonEssentialTotal,
        impulseExpenseCount,
        sabotagePattern,
        behavioralPressure,
        dailyAvgExpense
      })
    : {
        dominant: primaryDriver,
        secondary: sabotagePattern !== 'none' ? sabotagePattern : 'stable_support'
      };

  const metrics = typeof buildBehaviorMetrics === 'function'
    ? buildBehaviorMetrics({
        score,
        failStreak,
        successStreak,
        spendAfterIncomePct,
        projectedBalance,
        savingsRate,
        todayNonEssentialTotal,
        impulseExpenseCount,
        behavioralPressure,
        dailyAvgExpense,
        sabotageDiagnostic,
        addictionDiagnostic
      })
    : {
        sabotageIndex: sabotageDiagnostic.severity === 'high' ? 75 : sabotageDiagnostic.severity === 'medium' ? 55 : 20,
        consistencyIntegrity: successStreak >= 3 ? 80 : successStreak >= 2 ? 68 : 45,
        recoveryFragility: successStreak >= 2 && failStreak >= 1 ? 65 : 35,
        postIncomeVulnerability: Math.round(spendAfterIncomePct),
        silentRiskLoad: Math.max(10, Math.round((behavioralPressure + score) / 2))
      };

  const behaviorState = typeof classifyBehaviorState === 'function'
    ? classifyBehaviorState({
        score,
        projectedBalance,
        failStreak,
        successStreak,
        spendAfterIncomePct,
        sabotageIndex: metrics.sabotageIndex,
        recoveryFragility: metrics.recoveryFragility,
        silentRiskLoad: metrics.silentRiskLoad
      })
    : {
        state: score >= 80
          ? 'pre_collapse'
          : metrics.sabotageIndex >= 60
          ? 'sabotage_active'
          : metrics.recoveryFragility >= 60
          ? 'recovery_fragile'
          : score <= 30
          ? 'stable_disciplined'
          : 'attention',
        severity: score >= 80 ? 'critical' : score >= 55 ? 'high' : score >= 30 ? 'medium' : 'stable',
        trend: behavioralPressure >= 18 ? 'deteriorating' : successStreak >= 2 ? 'improving' : 'neutral'
      };

  const preHistoricalSnapshot = {
    ...base,
    score,
    riskLevel: getBehaviorRiskLevel(score),
    behavior,
    patterns,
    metrics,
    behaviorState
  };

  const historicalOverlay = buildHistoricalBehaviorOverlay(
    preHistoricalSnapshot,
    Array.isArray(state.behaviorMemory) ? state.behaviorMemory : []
  );

  const finalScore = clampScore(score + Number(historicalOverlay.historicalRiskDelta || 0));

  const finalBehaviorState = {
    ...behaviorState,
    trend: historicalOverlay.recentTrend && historicalOverlay.recentTrend !== 'neutral'
      ? historicalOverlay.recentTrend
      : behaviorState.trend
  };

  const finalPatterns = {
    ...patterns,
    historicalDominantSignature: historicalOverlay.dominantHistoricalSignature,
    historicalRadarEnrichment: historicalOverlay.radarEnrichment
  };

  const finalMetrics = {
    ...metrics,
    historicalPressure: Number(historicalOverlay.historicalPressure || 0),
    recurrenceConfidence: Number(historicalOverlay.recurrenceConfidence || 0),
    instabilityIndex: Number(historicalOverlay.patternSummary?.instabilityIndex || 0)
  };

  const languagePack = typeof buildBehaviorLanguagePack === 'function'
    ? buildBehaviorLanguagePack({
        score: finalScore,
        behaviorState: finalBehaviorState,
        behavior,
        patterns: finalPatterns,
        metrics: finalMetrics,
        historicalOverlay
      })
    : {
        headline: historicalOverlay.recurringSabotage
          ? 'Seu histórico mostra sabotagem recorrente.'
          : historicalOverlay.recurringRelapse
          ? 'Sua melhora recente ainda não é confiável.'
          : finalScore >= 60
          ? 'Seu comportamento entrou em zona de atenção.'
          : 'Seu padrão está relativamente sob controle.',
        body: historicalOverlay.summaryLabel || 'O FinanceAI segue monitorando seu comportamento financeiro.'
      };

  return {
    ...base,
    score: finalScore,
    riskLevel: getBehaviorRiskLevel(finalScore),
    behavior,
    patterns: finalPatterns,
    metrics: finalMetrics,
    behaviorState: finalBehaviorState,
    languagePack,
    historicalOverlay
  };
}

function renderPremiumRiskCard() {
  const card = document.getElementById('premiumRiskCard');
  if (!card) return;

  const titleEl = document.getElementById('premiumRiskTitle');
  const summaryEl = document.getElementById('premiumRiskSummary');
  const scoreEl = document.getElementById('premiumRiskScore');
  const levelEl = document.getElementById('premiumRiskLevel');
  const masterAlertEl = document.getElementById('premiumRiskMasterAlert');
  const actionEl = document.getElementById('premiumRiskAction');
  const objectiveEl = document.getElementById('premiumRiskObjective');
  const primaryBtn = document.getElementById('premiumRiskPrimaryBtn');
  const secondaryBtn = document.getElementById('premiumRiskSecondaryBtn');

  if (
    !titleEl ||
    !summaryEl ||
    !scoreEl ||
    !levelEl ||
    !masterAlertEl ||
    !actionEl ||
    !objectiveEl ||
    !primaryBtn ||
    !secondaryBtn
  ) {
    return;
  }

  const snap = getBehaviorEngineSnapshot();
  const plan = {
  title: 'Radar FinanceAI ativo',
  summary: 'Leitura comportamental em execução.',
  masterAlert: 'Sistema analisando seu padrão financeiro.',
  action: 'Continue registrando movimentações para melhorar a precisão.',
  objective: 'Gerar base comportamental consistente.',
  primaryLabel: 'Ver transações',
  secondaryLabel: 'Abrir IA',
  primaryPage: 'transactions',
  secondaryPage: 'ai'
};

  if (!snap) {
    titleEl.textContent = 'Sem leitura suficiente';
    summaryEl.textContent = 'Adicione mais movimentações para o FinanceAI consolidar sua leitura comportamental.';
    scoreEl.textContent = '--/100';
    levelEl.textContent = 'Sem leitura';
    levelEl.style.color = '#94a3b8';
    scoreEl.style.color = 'var(--text-primary)';
    masterAlertEl.textContent = 'Ainda não há base suficiente para um alerta mestre.';
    actionEl.textContent = 'Registrar receitas e despesas do mês atual.';
    objectiveEl.textContent = 'Criar consistência de dados para leitura inteligente.';
    primaryBtn.textContent = 'Ir para transações';
    secondaryBtn.textContent = 'Abrir IA';
    primaryBtn.onclick = () => navigate('transactions');
    secondaryBtn.onclick = () => navigate('ai');
    card.style.border = '1px solid rgba(99,102,241,0.22)';
    card.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(15,23,42,0.95))';
    return;
  }

  const overlay = snap.historicalOverlay || {};
  const behaviorState = snap.behaviorState || {};
  const metrics = snap.metrics || {};
  const patterns = snap.patterns || {};
  const summary = snap.summary || {};

  const score = Number(snap.score || 0);
  const recurrenceConfidence = Number(overlay.recurrenceConfidence || 0);
  const historicalPressure = Number(overlay.historicalPressure || 0);
  const instabilityIndex = Number(metrics.instabilityIndex || 0);

  let signatureLabel = 'Histórico em formação';
  if (overlay.dominantHistoricalSignature === 'recurring_sabotage') {
    signatureLabel = 'Sabotagem recorrente';
  } else if (overlay.dominantHistoricalSignature === 'relapse_cycle') {
    signatureLabel = 'Ciclo de recaída';
  } else if (overlay.dominantHistoricalSignature === 'fragile_recovery_loop') {
    signatureLabel = 'Recuperação frágil recorrente';
  } else if (overlay.dominantHistoricalSignature === 'persistent_high_risk') {
    signatureLabel = 'Risco alto persistente';
  } else if (overlay.dominantHistoricalSignature === 'disciplined_recovery') {
    signatureLabel = 'Recuperação disciplinada';
  } else if (overlay.dominantHistoricalSignature === 'historical_instability') {
    signatureLabel = 'Instabilidade histórica';
  }

  let radarTitle = plan.title || 'Radar FinanceAI ativo';
  let radarSummary = plan.summary || 'O sistema está lendo seu comportamento financeiro.';
  let masterAlert = plan.masterAlert || 'Sem alerta mestre disponível.';
  let recommendedAction = plan.action || 'Sem ação recomendada.';
  let tacticalObjective = plan.objective || 'Sem objetivo definido.';

  if (overlay.recurringSabotage) {
    radarTitle = 'Seu histórico mostra sabotagem recorrente';
    radarSummary = `Seu score está em ${score}/100 e o sistema detectou repetição de autossabotagem financeira. Isso não é evento isolado; é padrão.`;
    masterAlert = 'O risco atual está sendo amplificado por sabotagem recorrente no histórico.';
    recommendedAction = 'Interrompa novas despesas variáveis hoje e reduza imediatamente o padrão impulsivo.';
    tacticalObjective = 'Quebrar a repetição que antecede deterioração do caixa.';
  } else if (overlay.recurringRelapse) {
    radarTitle = 'Sua melhora ainda não é confiável';
    radarSummary = `Seu score está em ${score}/100 e o histórico mostra melhora seguida de recaída. O problema não é só cair, mas repetir o ciclo.`;
    masterAlert = 'O sistema detecta recaída recorrente após sinais de alívio.';
    recommendedAction = 'Proteja a disciplina nas próximas horas e não trate alívio momentâneo como controle real.';
    tacticalObjective = 'Transformar melhora pontual em estabilidade consistente.';
  } else if (overlay.fragileRecoveryRecurring) {
    radarTitle = 'Sua recuperação ainda está frágil';
    radarSummary = `Seu score está em ${score}/100 e o histórico mostra recuperação instável. Ainda existe risco real de regressão.`;
    masterAlert = 'A melhora recente ainda não consolidou segurança estrutural.';
    recommendedAction = 'Reduza exposição a gasto impulsivo e preserve retenção nas próximas 24h.';
    tacticalObjective = 'Consolidar recuperação antes de novo ciclo de pressão.';
  } else if (behaviorState.state === 'pre_collapse') {
    radarTitle = 'Seu risco financeiro está crítico';
    radarSummary = `Seu score está em ${score}/100 e o sistema detecta deterioração acelerada do seu caixa.`;
  } else if (behaviorState.state === 'sabotage_active') {
    radarTitle = 'Seu comportamento entrou em sabotagem ativa';
    radarSummary = `Seu score está em ${score}/100 e a sua disciplina está sendo rompida por padrão comportamental.`;
  } else if (behaviorState.state === 'recovery_fragile') {
    radarTitle = 'Sua melhora ainda está instável';
    radarSummary = `Seu score está em ${score}/100 e o sistema detecta que sua recuperação ainda não virou estabilidade real.`;
  } else if (metrics.silentRiskLoad >= 55) {
    radarTitle = 'Seu risco está se formando em silêncio';
    radarSummary = `Seu score está em ${score}/100 e a sua consistência começou a ceder antes do problema ficar óbvio.`;
  }

  const dominantPattern = String(
    patterns.historicalDominantSignature ||
    patterns.dominant ||
    overlay.dominantPattern ||
    'stable_support'
  ).replaceAll('_', ' ');

  const enrichedSummary =
    `${radarSummary} Assinatura dominante: ${signatureLabel}. ` +
    `Padrão principal: ${dominantPattern}. ` +
    `Confiança histórica: ${recurrenceConfidence}%. ` +
    `Pressão histórica: ${historicalPressure}. ` +
    `Instabilidade acumulada: ${instabilityIndex}.`;

  titleEl.textContent = radarTitle;
  summaryEl.textContent = enrichedSummary;
  masterAlertEl.textContent = masterAlert;
  actionEl.textContent = recommendedAction;
  objectiveEl.textContent = tacticalObjective;

  scoreEl.textContent = `${score}/100`;
  levelEl.textContent = `Risco ${snap.riskLevel}`;

  const levelColor =
    score >= 75 ? '#ef4444' :
    score >= 50 ? '#f59e0b' :
    score >= 25 ? '#facc15' :
    '#10b981';

  levelEl.style.color = levelColor;
  scoreEl.style.color = levelColor;

  if (score >= 75 || overlay.recurringSabotage) {
    card.style.border = '1px solid rgba(239,68,68,0.35)';
    card.style.background = 'linear-gradient(135deg, rgba(127,29,29,0.28), rgba(15,23,42,0.96))';
  } else if (score >= 50 || overlay.recurringRelapse || overlay.fragileRecoveryRecurring) {
    card.style.border = '1px solid rgba(245,158,11,0.30)';
    card.style.background = 'linear-gradient(135deg, rgba(120,53,15,0.24), rgba(15,23,42,0.96))';
  } else {
    card.style.border = '1px solid rgba(16,185,129,0.22)';
    card.style.background = 'linear-gradient(135deg, rgba(6,95,70,0.20), rgba(15,23,42,0.95))';
  }

  primaryBtn.textContent = plan.primaryLabel || 'Ver ação principal';
  secondaryBtn.textContent = plan.secondaryLabel || 'Abrir análise completa';

  primaryBtn.onclick = () => navigate(plan.primaryPage || 'transactions');
  secondaryBtn.onclick = () => navigate(plan.secondaryPage || 'ai');

  primaryBtn.style.boxShadow =
    score >= 75 || overlay.recurringSabotage
      ? '0 12px 24px rgba(239,68,68,0.22)'
      : score >= 50 || overlay.recurringRelapse || overlay.fragileRecoveryRecurring
      ? '0 12px 24px rgba(245,158,11,0.18)'
      : '0 12px 24px rgba(16,185,129,0.18)';

  if (summary.balance < 0) {
    objectiveEl.textContent = 'Conter ruptura de caixa e recuperar margem de reação imediatamente.';
  }
}

function getMissionSeverityFromSnapshot(snap) {
  if (!snap) return 'stable';

  const { score = 0, projectedBalance = 0, spendAfterIncomePct = 0, summary } = snap;
  const savingsRate = summary?.savingsRate ?? 0;

  if (score >= 85 || projectedBalance < 0) return 'critical';
  if (score >= 70 || spendAfterIncomePct >= 75) return 'containment';
  if (score >= 50 || savingsRate < 10) return 'pressure';
  if (score >= 30 || spendAfterIncomePct >= 55) return 'attention';
  return 'stable';
}

function getDominantFinancialPain(snap) {
  if (!snap) {
    return {
      diagnosis: 'controlled_growth',
      severity: 'stable',
      title: 'Crescimento sob controle',
      text: 'Seu sistema não detectou ruptura imediata. A prioridade é manter consistência e crescer com disciplina.',
      target: 20,
      type: 'discipline',
      actionLabel: 'Manter disciplina',
      scoreDeltaSuccess: 2,
      scoreDeltaFail: -2,
      psychologicalTone: 'supportive'
    };
  }

  const {
    summary,
    projectedBalance,
    spendAfterIncomePct,
    topCategoryName,
    categoryRisks,
    score,
    dailyAvgExpense
  } = snap;

  const severity = getMissionSeverityFromSnapshot(snap);

  const topProjectedRisk = (categoryRisks || [])
    .filter(item => item.limit > 0 && item.projected > item.limit)
    .sort((a, b) => (b.projected - b.limit) - (a.projected - a.limit))[0] || null;

  if (projectedBalance < 0) {
    const target = Math.max(60, Math.ceil(Math.abs(projectedBalance) / 10) * 10);

    return {
      diagnosis: 'cash_runway_risk',
      severity: 'critical',
      title: 'Interrupção imediata de risco',
      text: `Seu padrão atual leva o caixa à ruptura ainda neste ciclo. Hoje a missão não é crescer — é bloquear dano e preservar pelo menos ${fmt(target)}.`,
      target,
      type: 'containment',
      actionLabel: 'Interromper dano',
      scoreDeltaSuccess: 6,
      scoreDeltaFail: -8,
      psychologicalTone: 'hard'
    };
  }

  if (spendAfterIncomePct >= 65) {
    const target = Math.max(40, Math.ceil((summary.income * 0.1) / 10) * 10);

    return {
      diagnosis: 'post_income_burn',
      severity,
      title: 'Quebrar aceleração pós-recebimento',
      text: `Você está queimando renda rápido demais logo após receber. Hoje sua missão é travar gasto variável e preservar ${fmt(target)} para impedir sufoco no fim do mês.`,
      target,
      type: 'retention',
      actionLabel: 'Preservar caixa',
      scoreDeltaSuccess: severity === 'containment' ? 5 : 4,
      scoreDeltaFail: severity === 'containment' ? -7 : -5,
      psychologicalTone: 'firm'
    };
  }

  if (topProjectedRisk) {
    const excess = Math.max(0, topProjectedRisk.projected - topProjectedRisk.limit);
    const target = Math.max(30, Math.ceil(excess / 10) * 10);

    return {
      diagnosis: 'category_overload',
      severity,
      title: `Corrigir pressão em ${topProjectedRisk.category}`,
      text: `${topProjectedRisk.category} é hoje a categoria que mais ameaça sua margem. A missão é comprimir pelo menos ${fmt(target)} dessa pressão antes que ela desorganize o mês.`,
      target,
      type: 'category_control',
      actionLabel: 'Cortar categoria',
      scoreDeltaSuccess: 4,
      scoreDeltaFail: -5,
      psychologicalTone: 'firm'
    };
  }

  if ((summary?.savingsRate ?? 0) < 10) {
    const target = Math.max(30, Math.ceil((summary.income * 0.08) / 10) * 10);

    return {
      diagnosis: 'low_retention',
      severity,
      title: 'Reconstruir retenção',
      text: `Sua retenção caiu abaixo da faixa mínima de estabilidade. Hoje a missão é preservar ${fmt(target)} para reconstruir margem e evitar fragilidade futura.`,
      target,
      type: 'retention',
      actionLabel: 'Recuperar retenção',
      scoreDeltaSuccess: 4,
      scoreDeltaFail: -4,
      psychologicalTone: 'firm'
    };
  }

  if ((dailyAvgExpense || 0) > 0 && (summary?.balance || 0) > 0 && score >= 35) {
    const target = Math.max(20, Math.ceil((summary.income * 0.03) / 10) * 10);

    return {
      diagnosis: 'discipline_rebuild',
      severity: 'attention',
      title: 'Blindar disciplina do ciclo',
      text: `Você ainda tem margem, mas o sistema detecta espaço para relaxamento operacional. A missão hoje é proteger ${fmt(target)} e fechar o dia sem ampliar dano desnecessário.`,
      target,
      type: 'discipline',
      actionLabel: 'Blindar disciplina',
      scoreDeltaSuccess: 3,
      scoreDeltaFail: -3,
      psychologicalTone: 'strategic'
    };
  }

  return {
    diagnosis: 'controlled_growth',
    severity: 'stable',
    title: 'Consolidar crescimento controlado',
    text: 'Seu cenário está estável. A missão hoje é manter o padrão vencedor, proteger margem e evitar microdesvios que corroem consistência.',
    target: 20,
    type: 'growth',
    actionLabel: 'Consolidar crescimento',
    scoreDeltaSuccess: 2,
    scoreDeltaFail: -2,
    psychologicalTone: 'supportive'
  };
}

function updateBehaviorProfileFromMissionHistory() {
  const history = Array.isArray(state.missionHistory) ? state.missionHistory.slice(0, 7) : [];
  const recentFails = history.filter(item => item && item.success === false);
  const recentSuccess = history.filter(item => item && item.success === true);

  state.behaviorProfile.failStreak = 0;
  state.behaviorProfile.successStreak = 0;

  for (const item of history) {
    if (item?.success === false) state.behaviorProfile.failStreak += 1;
    else break;
  }

  for (const item of history) {
    if (item?.success === true) state.behaviorProfile.successStreak += 1;
    else break;
  }

  state.behaviorProfile.recentFailureTypes = recentFails
    .map(item => item.type)
    .filter(Boolean)
    .slice(0, 5);

  state.behaviorProfile.recentSuccessTypes = recentSuccess
    .map(item => item.type)
    .filter(Boolean)
    .slice(0, 5);
}
function buildHistoricalMissionDirective(snap) {
  const overlay = snap?.historicalOverlay || {};
  const metrics = snap?.metrics || {};
  const behaviorState = snap?.behaviorState || {};
  const score = Number(snap?.score || 0);

  const fallback = {
    mode: 'default',
    severityBoost: 0,
    targetMultiplier: 1,
    scoreDeltaSuccessBoost: 0,
    scoreDeltaFailBoost: 0,
    diagnosisSuffix: '',
    titlePrefix: '',
    textPrefix: '',
    actionPrefix: '',
    psychologicalTone: null
  };

  if (!overlay || !overlay.hasEnoughHistory) {
    return fallback;
  }

  if (overlay.recurringSabotage) {
    return {
      mode: 'recurring_sabotage',
      severityBoost: 2,
      targetMultiplier: 0.75,
      scoreDeltaSuccessBoost: 2,
      scoreDeltaFailBoost: -2,
      diagnosisSuffix: '_historical_sabotage',
      titlePrefix: 'Correção de Sabotagem Recorrente',
      textPrefix: 'O FinanceAI detectou que este não é um desvio isolado. Seu histórico mostra sabotagem recorrente e exige interrupção estrutural do padrão. ',
      actionPrefix: 'Quebrar sabotagem recorrente',
      psychologicalTone: 'urgent_control'
    };
  }

  if (overlay.recurringRelapse) {
    return {
      mode: 'recurring_relapse',
      severityBoost: 1,
      targetMultiplier: 0.85,
      scoreDeltaSuccessBoost: 1,
      scoreDeltaFailBoost: -2,
      diagnosisSuffix: '_relapse_cycle',
      titlePrefix: 'Blindagem Contra Recaída',
      textPrefix: 'O sistema detectou que sua melhora recente tende a ceder. A missão de hoje não é só disciplina: é impedir retorno ao padrão anterior. ',
      actionPrefix: 'Blindar recaída',
      psychologicalTone: 'strategic'
    };
  }

  if (overlay.fragileRecoveryRecurring || behaviorState.state === 'recovery_fragile') {
    return {
      mode: 'fragile_recovery',
      severityBoost: 1,
      targetMultiplier: 0.9,
      scoreDeltaSuccessBoost: 1,
      scoreDeltaFailBoost: -1,
      diagnosisSuffix: '_fragile_recovery',
      titlePrefix: 'Consolidação de Recuperação',
      textPrefix: 'O FinanceAI identificou melhora frágil. Sua missão hoje é transformar alívio momentâneo em consistência real. ',
      actionPrefix: 'Consolidar recuperação',
      psychologicalTone: 'strategic'
    };
  }

  if (overlay.dominantHistoricalSignature === 'persistent_high_risk' || score >= 60 || metrics.silentRiskLoad >= 60) {
    return {
      mode: 'high_historical_pressure',
      severityBoost: 1,
      targetMultiplier: 0.8,
      scoreDeltaSuccessBoost: 1,
      scoreDeltaFailBoost: -1,
      diagnosisSuffix: '_historical_pressure',
      titlePrefix: 'Contenção de Pressão Histórica',
      textPrefix: 'Seu histórico mostra repetição de pressão financeira. A missão precisa conter o padrão antes de nova escalada. ',
      actionPrefix: 'Conter pressão',
      psychologicalTone: 'strategic'
    };
  }

  if (overlay.dominantHistoricalSignature === 'disciplined_recovery') {
    return {
      mode: 'disciplined_recovery',
      severityBoost: -1,
      targetMultiplier: 1.05,
      scoreDeltaSuccessBoost: 0,
      scoreDeltaFailBoost: 0,
      diagnosisSuffix: '_disciplined_recovery',
      titlePrefix: 'Expansão de Consistência',
      textPrefix: 'Seu histórico mostra disciplina em consolidação. A missão agora é preservar o padrão vencedor sem relaxamento. ',
      actionPrefix: 'Expandir consistência',
      psychologicalTone: 'supportive'
    };
  }

  return fallback;
}
function buildHistoricalMissionAdjustment() {
  return {
    scoreAdjustment: 0,
    urgencyBoost: 0,
    behavioralPenalty: 0,
    reason: 'no_historical_data'
  };
}
function buildHistoricalMissionAdjustment(snap) {
  const overlay = snap?.historicalOverlay || {};
  const fallback = {
    mode: 'default',
    severityBoost: 0,
    targetMultiplier: 1,
    scoreDeltaSuccessBoost: 0,
    scoreDeltaFailBoost: 0,
    diagnosisSuffix: '',
    titlePrefix: '',
    textPrefix: '',
    actionPrefix: '',
    psychologicalTone: null
  };

  if (!overlay || overlay.hasEnoughHistory !== true) {
    return fallback;
  }

  if (overlay.recurringSabotage) {
    return {
      mode: 'recurring_sabotage',
      severityBoost: 2,
      targetMultiplier: 0.85,
      scoreDeltaSuccessBoost: 1,
      scoreDeltaFailBoost: -2,
      diagnosisSuffix: '_recurring_sabotage',
      titlePrefix: 'Interrupção de Sabotagem',
      textPrefix: 'Seu histórico mostra sabotagem recorrente. ',
      actionPrefix: 'Interromper sabotagem',
      psychologicalTone: 'firm_intervention'
    };
  }

  if (overlay.recurringRelapse) {
    return {
      mode: 'recurring_relapse',
      severityBoost: 1,
      targetMultiplier: 0.9,
      scoreDeltaSuccessBoost: 1,
      scoreDeltaFailBoost: -1,
      diagnosisSuffix: '_relapse_cycle',
      titlePrefix: 'Proteção Contra Recaída',
      textPrefix: 'Seu histórico mostra recaída recorrente após melhora. ',
      actionPrefix: 'Proteger recuperação',
      psychologicalTone: 'strategic'
    };
  }

  if (overlay.fragileRecoveryRecurring) {
    return {
      mode: 'fragile_recovery',
      severityBoost: 1,
      targetMultiplier: 0.95,
      scoreDeltaSuccessBoost: 0,
      scoreDeltaFailBoost: -1,
      diagnosisSuffix: '_fragile_recovery',
      titlePrefix: 'Consolidação de Recuperação',
      textPrefix: 'Sua recuperação ainda é frágil no histórico. ',
      actionPrefix: 'Consolidar padrão',
      psychologicalTone: 'cautious_support'
    };
  }

  if (overlay.dominantHistoricalSignature === 'disciplined_recovery') {
    return {
      mode: 'disciplined_recovery',
      severityBoost: -1,
      targetMultiplier: 1.05,
      scoreDeltaSuccessBoost: 0,
      scoreDeltaFailBoost: 0,
      diagnosisSuffix: '_disciplined_recovery',
      titlePrefix: 'Expansão de Consistência',
      textPrefix: 'Seu histórico mostra disciplina em consolidação. ',
      actionPrefix: 'Expandir consistência',
      psychologicalTone: 'supportive'
    };
  }

  return fallback;
}
function ensureMissionV3State(snap) {
  if (!state.user) return;

  const txs = getFilteredTx('month');
  const summary = calcSummary(txs);

  const income = summary.income || 0;
  const expenses = summary.expense || 0;
  const balance = summary.balance || 0;

  const score = snap?.score || 0;
  const spendAfterIncomePct = snap?.spendAfterIncomePct || 0;
  const behavior = snap?.behavior || {};
  const impulseExpenseCount = behavior.impulseExpenseCount || 0;
  const addictionDiagnostic = behavior.addictionDiagnostic || { type: 'none', severity: 'stable' };

  const todayISO = new Date().toISOString().slice(0, 10);

  // Preserva missão já concluída/ignorada no mesmo dia
  if (
    state.missionStatus.date === todayISO &&
    (state.missionStatus.status === 'completed' || state.missionStatus.status === 'skipped')
  ) {
    return;
  }
// ==========================================
// BEHAVIOR-DRIVEN MISSION ENGINE (V1)
// ==========================================

const behaviorState = snap.behaviorState || {};
const metrics = snap.metrics || {};
const patterns = snap.patterns || {};
const historicalOverlay = snap?.historicalOverlay || {};
const historicalMissionAdjustment = buildHistoricalMissionAdjustment(snap);

let dynamicMissionConfig = {
  type: 'default',
  severity: 'stable',
  psychologicalTone: 'neutral',
  adjustment: 1
};

// 🔴 PRÉ-COLAPSO
if (behaviorState.state === 'pre_collapse') {
  dynamicMissionConfig = {
    type: 'containment',
    severity: 'critical',
    psychologicalTone: 'urgent_control',
    adjustment: 0.5
  };
}

// 🔴 SABOTAGEM
else if (behaviorState.state === 'sabotage_active') {
  dynamicMissionConfig = {
    type: 'interruption',
    severity: 'high',
    psychologicalTone: 'firm_intervention',
    adjustment: 0.6
  };
}

// 🟠 PRESSÃO
else if (behaviorState.state === 'pressure_escalation') {
  dynamicMissionConfig = {
    type: 'stabilization',
    severity: 'medium',
    psychologicalTone: 'preventive_control',
    adjustment: 0.8
  };
}

// 🟡 RECUPERAÇÃO FRÁGIL
else if (behaviorState.state === 'recovery_fragile') {
  dynamicMissionConfig = {
    type: 'protection',
    severity: 'attention',
    psychologicalTone: 'cautious_support',
    adjustment: 0.7
  };
}

// 🟡 RISCO SILENCIOSO
else if (metrics.silentRiskLoad >= 55) {
  dynamicMissionConfig = {
    type: 'precision_adjustment',
    severity: 'attention',
    psychologicalTone: 'strategic_alert',
    adjustment: 0.85
  };
}
  let mission = {
    type: 'growth',
    severity: dynamicMissionConfig?.severity || 'stable',
    diagnosis: 'controlled_growth',
    title: 'Consolidação de Controle',
    text: 'Você está estável. Sua missão hoje é manter consistência sem relaxar disciplina.',
    actionLabel: 'Manter padrão',
    target: Math.max(
  20,
  Math.round((snap.dailyAvgExpense || 100) * (dynamicMissionConfig?.adjustment || 1))
),
    scoreDeltaSuccess: 2,
    scoreDeltaFail: -2,
    psychologicalTone: 'supportive'
  };

  // 🔴 CRÍTICO
  if (balance < 0 || score >= 80) {
    mission = {
      type: 'containment',
      severity: 'critical',
      diagnosis: 'cash_runway_risk',
      title: 'Modo Emergencial',
      text: 'Seu comportamento financeiro entrou em zona crítica. Sua missão hoje é interromper imediatamente novas saídas e conter dano.',
      actionLabel: 'Parar gastos agora',
      target: Math.max(100, Math.ceil(Math.abs(balance) / 10) * 10),
      scoreDeltaSuccess: 6,
      scoreDeltaFail: -8,
      psychologicalTone: 'hard'
    };
  }

  // 🟠 PRESSÃO ALTA
  else if (score >= 50 || spendAfterIncomePct >= 65) {
    mission = {
      type: 'containment',
      severity: 'pressure',
      diagnosis: 'active_financial_pressure',
      title: 'Interrupção de Ciclo Financeiro',
      text: 'Seu padrão atual já está gerando risco real. Sua missão hoje é travar gastos variáveis e impedir que a pressão avance.',
      actionLabel: 'Modo contenção',
      target: Math.max(80, Math.ceil((income * 0.08) / 10) * 10),
      scoreDeltaSuccess: 5,
      scoreDeltaFail: -6,
      psychologicalTone: 'firm'
    };
  }

  // 🟡 ATENÇÃO — DIFERENCIAL PREMIUM
  else if (
    score >= 30 ||
    impulseExpenseCount >= 3 ||
    addictionDiagnostic.type === 'emotional_spending' ||
    addictionDiagnostic.type === 'compulsive_spending' ||
    addictionDiagnostic.type === 'impulse_drift' ||
    spendAfterIncomePct >= 25
  ) {
    let text = 'Seu comportamento começou a perder consistência. Sua missão hoje é bloquear a fragmentação do consumo antes que ela vire hábito.';
    let title = 'Contenção de Impulso';
    let actionLabel = 'Bloquear impulsos hoje';

    if (addictionDiagnostic.type === 'compulsive_spending') {
      title = 'Quebra de Ciclo Compulsivo';
      text = 'O FinanceAI detectou sequência de consumo com traço compulsivo. Sua missão hoje é interromper a cadeia de impulsos antes da próxima compra.';
      actionLabel = 'Quebrar ciclo hoje';
    } else if (addictionDiagnostic.type === 'emotional_spending') {
      title = 'Contenção de Consumo Emocional';
      text = 'O sistema detectou gasto emocional recorrente. Sua missão hoje é adiar decisões de consumo por alívio imediato e retomar domínio emocional.';
      actionLabel = 'Retomar domínio';
    } else if (impulseExpenseCount >= 3) {
      title = 'Contenção de Microdecisões';
      text = 'Você entrou em sequência de microcompras que começam a corroer sua disciplina. Sua missão hoje é interromper a próxima decisão impulsiva.';
      actionLabel = 'Interromper sequência';
    } else if (spendAfterIncomePct >= 25) {
      title = 'Controle de Aceleração';
      text = 'Seu ritmo de consumo começou a acelerar cedo demais no ciclo. Sua missão hoje é reduzir velocidade antes que isso comprima sua margem.';
      actionLabel = 'Reduzir aceleração';
    }

    mission = {
      type: 'discipline',
      severity: 'attention',
      diagnosis: 'behavioral_attention',
      title,
      text,
      actionLabel,
      target: Math.max(60, Math.ceil((income * 0.05) / 10) * 10),
      scoreDeltaSuccess: 4,
      scoreDeltaFail: -4,
      psychologicalTone: 'strategic'
    };
  }

  // 🟢 CONTROLE
  else {
    mission = {
      type: 'growth',
      severity: 'stable',
      diagnosis: 'controlled_growth',
      title: 'Consolidação de Controle',
      text: 'Você está estável. Sua missão hoje é manter consistência sem relaxar disciplina.',
      actionLabel: 'Manter padrão',
      target: Math.max(
  20,
  Math.round((snap.dailyAvgExpense || 100) * (dynamicMissionConfig?.adjustment || 1))
),
      scoreDeltaSuccess: 2,
      scoreDeltaFail: -2,
     psychologicalTone: dynamicMissionConfig?.psychologicalTone || 'supportive'
    };
  }

 const adjustedMission = { ...mission };

if (historicalMissionAdjustment) {
  if (historicalMissionAdjustment.severity) {
    adjustedMission.severity = historicalMissionAdjustment.severity;
  }

  if (historicalMissionAdjustment.psychologicalTone) {
    adjustedMission.psychologicalTone = historicalMissionAdjustment.psychologicalTone;
  }

  if (historicalMissionAdjustment.actionLabel) {
    adjustedMission.actionLabel = historicalMissionAdjustment.actionLabel;
  }

  if (historicalMissionAdjustment.diagnosisSuffix) {
    adjustedMission.diagnosis = `${adjustedMission.diagnosis}_${historicalMissionAdjustment.diagnosisSuffix}`;
  }

  if (historicalMissionAdjustment.titlePrefix) {
    adjustedMission.title = `${historicalMissionAdjustment.titlePrefix}: ${adjustedMission.title}`;
  }

  if (historicalMissionAdjustment.textPrefix) {
    adjustedMission.text = `${historicalMissionAdjustment.textPrefix} ${adjustedMission.text}`;
  }

  if (
    typeof historicalMissionAdjustment.targetMultiplier === 'number' &&
    Number.isFinite(historicalMissionAdjustment.targetMultiplier)
  ) {
    adjustedMission.target = Math.max(
      20,
      Math.round((Number(adjustedMission.target || 0) * historicalMissionAdjustment.targetMultiplier) / 10) * 10
    );
  }
}

state.missionStatus = {
  ...state.missionStatus,
  ...adjustedMission,
  historicalContext: {
    enabled: historicalOverlay.hasEnoughHistory === true,
    signature: historicalOverlay.dominantHistoricalSignature || 'insufficient_history',
    recurringRelapse: historicalOverlay.recurringRelapse === true,
    fragileRecoveryRecurring: historicalOverlay.fragileRecoveryRecurring === true,
    recurringSabotage: historicalOverlay.recurringSabotage === true,
    recurrenceConfidence: Number(historicalOverlay.recurrenceConfidence || 0)
  },
  date: todayISO,
  current: adjustedMission.target,
  completed: false,
  savedAmount: 0,
  status: 'pending'
};
}
function getBehaviorRiskLevel(score) {
  if (score >= 85) return 'Crítico';
  if (score >= 70) return 'Alto';
  if (score >= 50) return 'Médio';
  if (score >= 30) return 'Atenção';
  return 'Baixo';
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
// ==========================================
// BLOCO 2B — ENGINE COMPORTAMENTAL BASE
// ==========================================

function detectFinancialSabotagePattern({ spendAfterIncomePct, impulseExpenseCount, failStreak, dailyAvgExpense }) {
  if (spendAfterIncomePct >= 65) {
    return { type: 'post_income_burn', label: 'Auto-sabotagem pós-recebimento', severity: 'high' };
  }

  if (impulseExpenseCount >= 3) {
    return { type: 'impulse_spending', label: 'Gastos impulsivos recorrentes', severity: 'medium' };
  }

  if (failStreak >= 2) {
    return { type: 'discipline_breakdown', label: 'Quebra de disciplina contínua', severity: 'high' };
  }

  if (dailyAvgExpense > 0 && dailyAvgExpense < 30) {
    return { type: 'micro_leak', label: 'Vazamento financeiro silencioso', severity: 'low' };
  }

  return { type: 'none', label: 'Sem sabotagem relevante detectada', severity: 'stable' };
}

function detectFinancialAddictionPattern({
  impulseExpenseCount,
  dailyAvgExpense,
  spendAfterIncomePct,
  todayNonEssentialTotal = 0
}) {
  if (
    impulseExpenseCount >= 4 &&
    (todayNonEssentialTotal >= 220 || spendAfterIncomePct >= 30)
  ) {
    return {
      type: 'compulsive_spending',
      label: 'Comportamento compulsivo de consumo',
      severity: 'high'
    };
  }

  if (
    impulseExpenseCount >= 3 &&
    (todayNonEssentialTotal >= 120 || spendAfterIncomePct >= 20)
  ) {
    return {
      type: 'emotional_spending',
      label: 'Gasto emocional recorrente',
      severity: 'medium'
    };
  }

  if (impulseExpenseCount >= 2 && dailyAvgExpense > 50) {
    return {
      type: 'impulse_drift',
      label: 'Deriva de consumo impulsivo',
      severity: 'low'
    };
  }

  return {
    type: 'none',
    label: 'Sem padrão de vício detectado',
    severity: 'stable'
  };
}
function buildUserFinancialIdentity({ score, failStreak, successStreak, sabotagePattern }) {
  if (score >= 80 && failStreak >= 2) {
    return { type: 'critical_user', label: 'Perfil em colapso financeiro', tone: 'hard' };
  }

  if (sabotagePattern.type !== 'none') {
    return { type: 'unstable_user', label: 'Perfil instável com auto-sabotagem', tone: 'firm' };
  }

  if (successStreak >= 3) {
    return { type: 'disciplined_user', label: 'Perfil disciplinado em evolução', tone: 'strategic' };
  }

  return { type: 'neutral_user', label: 'Perfil em adaptação', tone: 'supportive' };
}

function getBehaviorEngineSnapshot() {
  const base = typeof getRiskSnapshot === 'function' ? getRiskSnapshot() : null;
  if (!base) return null;

  updateBehaviorProfileFromMissionHistory();

  const txs = getFilteredTx('month');
  const today = fmtDate(new Date());

  const nonEssentialCategories = new Set([
    'Lazer',
    'Vestuário',
    'Assinaturas',
    'Outros'
  ]);

  const impulseCategories = new Set([
    'Lazer',
    'Vestuário',
    'Assinaturas',
    'Outros',
    'Alimentação'
  ]);

  const todayExpenses = txs.filter(t => t.type === 'expense' && t.date === today);
  const todayNonEssentialTotal = todayExpenses
    .filter(t => nonEssentialCategories.has(t.category))
    .reduce((sum, t) => sum + t.value, 0);

  const impulseExpenseCount = txs
    .filter(t => t.type === 'expense' && impulseCategories.has(t.category) && t.value <= 180)
    .length;

  const failStreak = Number(state.behaviorProfile.failStreak || 0);
  const successStreak = Number(state.behaviorProfile.successStreak || 0);
  const spendAfterIncomePct = Number(base.spendAfterIncomePct || 0);
  const dailyAvgExpense = Number(base.dailyAvgExpense || 0);
  const savingsRate = Number(base.summary?.savingsRate || 0);
  const projectedBalance = Number(base.projectedBalance || 0);

  let score = Number(base.score || 0);
  let primaryDriver = 'stable_control';
  let sabotagePattern = 'none';
  let behavioralPressure = 0;

  if (projectedBalance < 0) {
    score += 8;
    behavioralPressure += 8;
    primaryDriver = 'cash_collapse_risk';
  }

  if (spendAfterIncomePct >= 80) {
    score += 12;
    behavioralPressure += 12;
    primaryDriver = 'post_income_burn';
    sabotagePattern = 'burn_after_income';
  } else if (spendAfterIncomePct >= 65) {
    score += 8;
    behavioralPressure += 8;
    primaryDriver = 'post_income_burn';
    sabotagePattern = 'burn_after_income';
  }

  if (savingsRate < 5) {
    score += 9;
    behavioralPressure += 9;
    if (primaryDriver === 'stable_control') primaryDriver = 'retention_failure';
  } else if (savingsRate < 10) {
    score += 5;
    behavioralPressure += 5;
    if (primaryDriver === 'stable_control') primaryDriver = 'retention_failure';
  }

  if (todayNonEssentialTotal >= 120) {
    score += 6;
    behavioralPressure += 6;
    if (primaryDriver === 'stable_control') primaryDriver = 'non_essential_spike';
  } else if (todayNonEssentialTotal >= 60) {
    score += 3;
    behavioralPressure += 3;
    if (primaryDriver === 'stable_control') primaryDriver = 'non_essential_spike';
  }

  if (impulseExpenseCount >= 6) {
    score += 6;
    behavioralPressure += 6;
    sabotagePattern = sabotagePattern === 'none' ? 'impulse_cluster' : sabotagePattern;
    if (primaryDriver === 'stable_control') primaryDriver = 'impulse_cluster';
  } else if (impulseExpenseCount >= 3) {
    score += 3;
    behavioralPressure += 3;
    sabotagePattern = sabotagePattern === 'none' ? 'impulse_cluster' : sabotagePattern;
  }

  if (failStreak >= 3) {
    score += 10;
    behavioralPressure += 10;
    sabotagePattern = 'mission_resistance';
    primaryDriver = primaryDriver === 'stable_control' ? 'mission_resistance' : primaryDriver;
  } else if (failStreak >= 2) {
    score += 6;
    behavioralPressure += 6;
    sabotagePattern = sabotagePattern === 'none' ? 'mission_resistance' : sabotagePattern;
  }

  if (successStreak >= 3) {
    score -= 8;
    behavioralPressure -= 8;
  } else if (successStreak >= 2) {
    score -= 4;
    behavioralPressure -= 4;
  }

if (state.behaviorProfile.lastMissionImpact) {
  const impact = Number(state.behaviorProfile.lastMissionImpact || 0);
  const outcome = state.behaviorProfile.lastMissionOutcome || null;

  if (outcome === 'success') {
    score -= impact;
  } else if (outcome === 'fail') {
    score += impact;
  }
}

const sabotageDiagnostic = detectFinancialSabotagePattern({
  spendAfterIncomePct,
  impulseExpenseCount,
  failStreak,
  dailyAvgExpense
});

const addictionDiagnostic = detectFinancialAddictionPattern({
  impulseExpenseCount,
  dailyAvgExpense,
  spendAfterIncomePct,
  todayNonEssentialTotal
});

if (addictionDiagnostic.type === 'compulsive_spending') {
  score += 18;
  behavioralPressure += 14;
  if (primaryDriver === 'stable_control') primaryDriver = 'compulsive_spending';
  sabotagePattern = sabotagePattern === 'none' ? 'compulsive_spending' : sabotagePattern;
} else if (addictionDiagnostic.type === 'emotional_spending') {
  score += 10;
  behavioralPressure += 8;
  if (primaryDriver === 'stable_control') primaryDriver = 'emotional_spending';
  sabotagePattern = sabotagePattern === 'none' ? 'emotional_spending' : sabotagePattern;
} else if (addictionDiagnostic.type === 'impulse_drift') {
  score += 4;
  behavioralPressure += 3;
  if (primaryDriver === 'stable_control') primaryDriver = 'impulse_drift';
}

score = clampScore(score);

const financialIdentity = buildUserFinancialIdentity({
  score,
  failStreak,
  successStreak,
  sabotagePattern: sabotageDiagnostic
});

const enrichedBase = {
  ...base,
  score,
  riskLevel: getBehaviorRiskLevel(score),
  behavior: {
    failStreak,
    successStreak,
    todayNonEssentialTotal,
    impulseExpenseCount,
    behavioralPressure,
    primaryDriver,
    sabotagePattern,
    sabotageDiagnostic,
    addictionDiagnostic,
    financialIdentity,
    dailyAvgExpense
  }
};

const metrics = calculateBehavioralMetrics(enrichedBase);
const patterns = detectBehaviorPatternsV2(enrichedBase, metrics);
const behaviorState = classifyBehaviorStateV2(enrichedBase, metrics, patterns);
const languagePack = buildBehaviorLanguagePack({
  ...enrichedBase,
  metrics,
  patterns,
  behaviorState
});

return {
  ...enrichedBase,
  metrics,
  patterns,
  behaviorState,
  languagePack
};
}

function clampPercent(v) {
  return Math.max(0, Math.min(100, Number(v || 0)));
}

function calculateBehavioralMetrics(snap) {
  const behavior = snap?.behavior || {};
  const summary = snap?.summary || {};

  const sabotageIndex = clampPercent(
    (Number(snap?.spendAfterIncomePct || 0) * 0.45) +
    (Number(behavior.impulseExpenseCount || 0) * 8) +
    (Number(behavior.failStreak || 0) * 9) +
    (Number(behavior.todayNonEssentialTotal || 0) >= 120 ? 12 : Number(behavior.todayNonEssentialTotal || 0) >= 60 ? 6 : 0)
  );

  const consistencyIntegrity = clampPercent(
    100
    - (Number(behavior.behavioralPressure || 0) * 0.7)
    - (Number(behavior.impulseExpenseCount || 0) * 6)
    - (Number(behavior.failStreak || 0) * 8)
    + (Number(behavior.successStreak || 0) * 7)
  );

  const recoveryFragility = clampPercent(
    (Number(behavior.successStreak || 0) >= 2 ? 35 : 10)
    + (Number(behavior.behavioralPressure || 0) * 0.55)
    + (Number(behavior.impulseExpenseCount || 0) * 5)
    - (Number(behavior.failStreak || 0) === 0 ? 10 : 0)
  );

  const postIncomeVulnerability = clampPercent(
    Number(snap?.spendAfterIncomePct || 0)
  );

  const silentRiskLoad = clampPercent(
    (Number(behavior.behavioralPressure || 0) * 0.6)
    + (Number(behavior.impulseExpenseCount || 0) * 5)
    + ((summary.balance > 0 && Number(snap?.score || 0) < 50) ? 12 : 0)
  );

  return {
    sabotageIndex,
    consistencyIntegrity,
    recoveryFragility,
    postIncomeVulnerability,
    silentRiskLoad
  };
}

function detectBehaviorPatternsV2(snap, metrics) {
  const behavior = snap?.behavior || {};
  const patterns = [];

  if (metrics.postIncomeVulnerability >= 55) {
    patterns.push('post_income_sabotage');
  }

  if (Number(behavior.impulseExpenseCount || 0) >= 4) {
    patterns.push('impulse_cluster');
  }

  if (metrics.silentRiskLoad >= 55 && Number(snap?.score || 0) < 50) {
    patterns.push('silent_deterioration');
  }

  if (
    Number(behavior.successStreak || 0) >= 2 &&
    (Number(behavior.impulseExpenseCount || 0) >= 3 || Number(behavior.behavioralPressure || 0) >= 55)
  ) {
    patterns.push('fragile_recovery');
  }

  if (metrics.sabotageIndex >= 80 || Number(snap?.projectedBalance || 0) < 0) {
    patterns.push('pre_collapse_formation');
  }

  return {
    dominant: patterns[0] || 'stable_control',
    all: patterns
  };
}

function classifyBehaviorStateV2(snap, metrics, patterns) {
  if (!snap) {
    return {
      state: 'stable_disciplined',
      severity: 'stable',
      trend: 'neutral'
    };
  }

  if (Number(snap.projectedBalance || 0) < 0 || metrics.sabotageIndex >= 80) {
    return { state: 'pre_collapse', severity: 'critical', trend: 'worsening' };
  }

  if (patterns.all.includes('post_income_sabotage') || metrics.sabotageIndex >= 60) {
    return { state: 'sabotage_active', severity: 'containment', trend: 'worsening' };
  }

  if (Number(snap.score || 0) >= 50 || Number(snap.spendAfterIncomePct || 0) >= 60) {
    return { state: 'pressure_escalation', severity: 'pressure', trend: 'worsening' };
  }

  if (patterns.all.includes('fragile_recovery') || metrics.recoveryFragility >= 60) {
    return { state: 'recovery_fragile', severity: 'attention', trend: 'unstable' };
  }

  if (metrics.silentRiskLoad >= 55 || metrics.consistencyIntegrity <= 45) {
    return { state: 'behavior_attention', severity: 'attention', trend: 'emerging' };
  }

  if (metrics.consistencyIntegrity >= 70 && Number(snap.score || 0) < 30) {
    return { state: 'stable_disciplined', severity: 'stable', trend: 'controlled' };
  }

  return { state: 'stable_vulnerable', severity: 'stable', trend: 'watch' };
}

function buildBehaviorLanguagePack(snap) {
  const metrics = snap?.metrics || {};
  const state = snap?.behaviorState || {};
  const behavior = snap?.behavior || {};
  const summary = snap?.summary || {};
  const projectedBalance = Number(snap?.projectedBalance || 0);
  const spendAfterIncomePct = Math.round(Number(snap?.spendAfterIncomePct || 0));
  const score = Math.round(Number(snap?.score || 0));
  const primaryDriver = behavior.primaryDriver || 'stable_control';
  const sabotageIndex = Math.round(Number(metrics?.sabotageIndex || 0));
  const silentRiskLoad = Math.round(Number(metrics?.silentRiskLoad || 0));
  const impulseExpenseCount = Number(behavior?.impulseExpenseCount || 0);
  const failStreak = Number(behavior?.failStreak || 0);

  let causeText = 'o sistema detectou perda de consistência no seu padrão financeiro';
  if (primaryDriver === 'post_income_burn') {
    causeText = `você já comprometeu ${spendAfterIncomePct}% da renda após a entrada do dinheiro`;
  } else if (primaryDriver === 'cash_collapse_risk') {
    causeText = `sua projeção atual fecha o ciclo em ${fmt(projectedBalance)}`;
  } else if (primaryDriver === 'retention_failure') {
    causeText = `sua retenção caiu para ${Number(summary?.savingsRate || 0).toFixed(1)}%`;
  } else if (primaryDriver === 'non_essential_spike') {
    causeText = 'seus gastos variáveis estão comprimindo sua margem cedo demais';
  } else if (primaryDriver === 'impulse_cluster') {
    causeText = `o sistema detectou ${impulseExpenseCount} saídas impulsivas no ciclo atual`;
  } else if (primaryDriver === 'mission_resistance') {
    causeText = `sua disciplina entrou em resistência com ${failStreak} falha(s) recentes de execução`;
  } else if (primaryDriver === 'compulsive_spending') {
    causeText = 'o sistema detecta repetição de consumo compulsivo';
  } else if (primaryDriver === 'emotional_spending') {
    causeText = 'há sinais de gasto emocional recorrente afetando sua estabilidade';
  } else if (primaryDriver === 'impulse_drift') {
    causeText = 'há deriva de consumo impulsivo corroendo sua margem';
  }

  let consequenceText = 'isso já começou a deteriorar sua estabilidade operacional';
  if (projectedBalance < 0) {
    consequenceText = `mantido esse ritmo, sua projeção fecha o ciclo negativa em ${fmt(projectedBalance)}`;
  } else if (spendAfterIncomePct >= 60) {
    consequenceText = 'isso comprime sua margem cedo demais no ciclo e aumenta risco de sufoco antes do fechamento do mês';
  } else if (sabotageIndex >= 60) {
    consequenceText = 'o dano não está só no valor, mas na repetição do padrão que acelera a perda de controle';
  } else if (silentRiskLoad >= 55) {
    consequenceText = 'o risco está se formando de maneira silenciosa e tende a aparecer tarde demais se não houver correção agora';
  } else if (score <= 30) {
    consequenceText = 'o cenário ainda está controlado, mas o sistema segue monitorando risco de recaída';
  }

    if (state.state === 'pre_collapse') {
    return {
      headline: 'Diagnóstico crítico de ruptura',
      body: `Você já comprometeu ${spendAfterIncomePct}% da sua renda logo após receber.

Isso significa que sua saída de dinheiro já ultrapassou a capacidade saudável do ciclo atual.

Se esse ritmo continuar, seu saldo não apenas enfraquece — ele fecha o período no negativo em ${fmt(projectedBalance)}.

Em termos práticos: você perde margem de segurança, entra em pressão antes do fechamento do ciclo e aumenta o risco de cartão, atraso ou sufoco financeiro.`,
      tone: 'hard'
    };
  }

  if (state.state === 'sabotage_active') {
    return {
      headline: 'Diagnóstico de sabotagem ativa',
      body: `O sistema detectou dano ativo porque ${causeText}, e ${consequenceText}.`,
      tone: 'firm'
    };
  }

  if (state.state === 'pressure_escalation') {
    return {
      headline: 'Diagnóstico de pressão crescente',
      body: `Sua pressão atual aumenta porque ${causeText}, e ${consequenceText}.`,
      tone: 'firm'
    };
  }

  if (state.state === 'recovery_fragile') {
    return {
      headline: 'Diagnóstico de recuperação frágil',
      body: `Sua melhora existe, mas ainda não é estrutural: ${causeText}, e ${consequenceText}.`,
      tone: 'cautious'
    };
  }

  if (state.state === 'behavior_attention') {
    return {
      headline: 'Diagnóstico de atenção comportamental',
      body: `O sistema entrou em atenção porque ${causeText}, e ${consequenceText}.`,
      tone: 'strategic'
    };
  }

  return {
    headline: 'Diagnóstico de estabilidade monitorada',
    body: `Seu cenário está relativamente controlado, mas ${causeText}. Neste momento, ${consequenceText}.`,
    tone: 'supportive'
  };
}
function buildFinancialDoctorContext(snap) {
  const monthTxs = typeof getFilteredTx === 'function' ? getFilteredTx('month') : [];
  const summary = typeof calcSummary === 'function'
    ? calcSummary(monthTxs)
    : { income: 0, expense: 0, balance: 0, savingsRate: 0 };

  const today = typeof fmtDate === 'function'
    ? fmtDate(new Date())
    : new Date().toISOString().slice(0, 10);

  const allTransactions = Array.isArray(state?.transactions) ? state.transactions : [];

  const todayExpenses = allTransactions
    .filter(t => t && t.type === 'expense' && t.date === today)
    .reduce((sum, t) => sum + Number(t.value || 0), 0);

 const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
const currentDay = now.getDate();
const daysRemainingInCycle = Math.max(0, lastDayOfMonth - currentDay);
const daysElapsedInCycle = Math.max(1, currentDay);

const monthIncome = Number(summary.income || 0);
const monthExpense = Number(summary.expense || 0);
const monthBalance = Number(summary.balance || 0);
const savingsRate = Number(summary.savingsRate || 0);

const averageDailyExpense = monthExpense > 0
  ? monthExpense / daysElapsedInCycle
  : 0;

const safeDailyLimit = daysRemainingInCycle > 0
  ? Math.max(0, monthBalance / daysRemainingInCycle)
  : Math.max(0, monthBalance);

const projectedAdditionalExpense = averageDailyExpense * daysRemainingInCycle;
const projectedEndBalance = monthBalance - projectedAdditionalExpense;
   let daysUntilBreak = null;

if (averageDailyExpense > 0 && monthBalance > 0) {
  daysUntilBreak = Math.floor(monthBalance / averageDailyExpense);
}

let operationalStatus = 'stable';
let urgency = 'low';
let recommendedAction = 'Manter disciplina financeira e monitorar execução diária.';
let doctorTitle = 'Seu caixa está sob controle no ritmo atual.';
let doctorSummary = 'A leitura inicial indica estabilidade operacional neste ciclo.';
let missionType = 'discipline';
let missionSeverity = 'stable';
let missionTitle = 'Missão do dia';
let missionText = 'Mantenha o controle das despesas variáveis para proteger seu saldo até o fim do ciclo.';
let missionTarget = safeDailyLimit;

if (projectedEndBalance < 0) {
  operationalStatus = 'collapse_risk';
  urgency = 'critical';
  recommendedAction = 'Interrompa gastos variáveis hoje para evitar fechamento negativo do ciclo.';
  doctorTitle = 'Seu caixa não sustenta o ritmo atual até o fim do ciclo.';
  doctorSummary = 'Mantendo a média atual de gasto, seu saldo projetado termina negativo antes do fechamento.';
  missionType = 'containment';
  missionSeverity = 'critical';
  missionTitle = 'Interrupção de ciclo financeiro';
  missionText = 'Seu padrão atual está empurrando o caixa para ruptura. O foco hoje é conter novas saídas variáveis.';
  missionTarget = safeDailyLimit;
} else if (todayExpenses > safeDailyLimit && safeDailyLimit > 0) {
  operationalStatus = 'daily_limit_broken';
  urgency = 'high';
  recommendedAction = 'Seu gasto de hoje ultrapassou o limite seguro. Congele novas despesas variáveis hoje.';
  doctorTitle = 'Seu limite diário seguro foi rompido hoje.';
  doctorSummary = 'O gasto de hoje já ficou acima do teto seguro para preservar o saldo até o fim do ciclo.';
  missionType = 'containment';
  missionSeverity = 'pressure';
  missionTitle = 'Contenção imediata do dia';
  missionText = 'Hoje o objetivo é encerrar o dia sem novas despesas variáveis para impedir ampliação da pressão.';
  missionTarget = safeDailyLimit;
} else if (safeDailyLimit > 0 && averageDailyExpense > safeDailyLimit) {
  operationalStatus = 'structural_pressure';
  urgency = 'medium';
  recommendedAction = 'Reduza o ritmo médio diário para manter o saldo protegido até o fim do ciclo.';
  doctorTitle = 'Seu ritmo médio diário está acima do nível seguro.';
  doctorSummary = 'Mesmo sem ruptura hoje, a média diária do ciclo já pressiona o caixa mais do que deveria.';
  missionType = 'retention';
  missionSeverity = 'attention';
  missionTitle = 'Correção de ritmo financeiro';
  missionText = 'Ajuste o ritmo de gasto agora para evitar pressão acumulada nos próximos dias.';
  missionTarget = safeDailyLimit;
}

const doctorContext = {
  generatedAt: new Date().toISOString(),
  source: 'dashboard_pre_mission',
  month: {
    transactions: monthTxs,
    income: monthIncome,
    expense: monthExpense,
    balance: monthBalance,
    savingsRate: savingsRate
  },
  today: {
    expenses: Number(todayExpenses || 0),
    currentDay,
    daysElapsedInCycle
  },
  cycle: {
    lastDayOfMonth,
    daysRemainingInCycle
  },
  behavior: snap || null,
  diagnosis: {
    title: doctorTitle,
    summary: doctorSummary,
    operationalStatus,
    urgency,
    averageDailyExpense,
    safeDailyLimit,
    projectedAdditionalExpense,
    projectedEndBalance,
    recommendedAction,
    daysUntilBreak,
  },
  missionBridge: {
    type: missionType,
    severity: missionSeverity,
    title: missionTitle,
    text: missionText,
    target: Number(missionTarget || 0)
  }
};

  if (typeof state === 'object' && state) {
    state.financialDoctor = doctorContext;
  }

  return doctorContext;
}
function renderFinancialDoctorPanel() {
  const missionTextEl = document.getElementById('missionText');
  if (!missionTextEl) return;

  const ctx = state && state.financialDoctor ? state.financialDoctor : null;
  if (!ctx) return;

  const existing = document.getElementById('financialDoctorPanel');
  if (existing) existing.remove();

  const monthIncome = Number(ctx.month?.income || 0);
  const monthExpense = Number(ctx.month?.expense || 0);
  const monthBalance = Number(ctx.month?.balance || 0);
  const savingsRate = Number(ctx.month?.savingsRate || 0);
  const todayExpenses = Number(ctx.today?.expenses || 0);

  const behaviorScore = Number(ctx.behavior?.score || 0);
  const behaviorLevel = ctx.behavior?.riskLevel || 'Sem leitura';
  const diagnosisTitle = ctx.diagnosis?.title || 'Sem diagnóstico disponível no momento.';
  const diagnosisSummary = ctx.diagnosis?.summary || 'Sem resumo operacional disponível.';
  const daysUntilBreak = ctx.diagnosis?.daysUntilBreak;
const diagnosisAction = ctx.diagnosis?.recommendedAction || 'Sem ação recomendada no momento.';
const safeDailyLimit = Number(ctx.diagnosis?.safeDailyLimit || 0);
const averageDailyExpense = Number(ctx.diagnosis?.averageDailyExpense || 0);
const projectedEndBalance = Number(ctx.diagnosis?.projectedEndBalance || 0);
const urgency = ctx.diagnosis?.urgency || 'low';
  const daysUntilBreak = ctx.diagnosis?.daysUntilBreak;
  const panel = document.createElement('div');
  panel.id = 'financialDoctorPanel';
  panel.style.cssText = [
    'margin-bottom:16px',
    'padding:16px',
    'border-radius:16px',
    'border:1px solid rgba(99,102,241,0.22)',
    'background:linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))',
    'box-shadow:0 14px 34px rgba(0,0,0,0.22)'
  ].join(';');

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#a5b4fc;">
          Doutor Financeiro
        </div>
        <div style="font-size:18px;font-weight:800;color:#ffffff;">
          Leitura inicial do seu caixa hoje
        </div>
      </div>
      <div style="padding:8px 12px;border-radius:999px;background:rgba(99,102,241,0.12);color:#c7d2fe;font-size:12px;font-weight:700;">
        Score comportamental: ${behaviorScore}/100 · ${behaviorLevel}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
      <div style="padding:12px;border-radius:14px;background:rgba(15,23,42,0.62);border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">Receitas do mês</div>
        <div style="margin-top:6px;font-size:22px;font-weight:800;color:#f8fafc;">${fmt(monthIncome)}</div>
      </div>

      <div style="padding:12px;border-radius:14px;background:rgba(15,23,42,0.62);border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">Despesas do mês</div>
        <div style="margin-top:6px;font-size:22px;font-weight:800;color:#f8fafc;">${fmt(monthExpense)}</div>
      </div>

      <div style="padding:12px;border-radius:14px;background:rgba(15,23,42,0.62);border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">Saldo do mês</div>
        <div style="margin-top:6px;font-size:22px;font-weight:800;color:${monthBalance >= 0 ? '#34d399' : '#f87171'};">${fmt(monthBalance)}</div>
      </div>

      <div style="padding:12px;border-radius:14px;background:rgba(15,23,42,0.62);border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">Gasto de hoje</div>
        <div style="margin-top:6px;font-size:22px;font-weight:800;color:#f8fafc;">${fmt(todayExpenses)}</div>
      </div>
    </div>

    <div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
  <div style="padding:12px 14px;border-radius:14px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.14);">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#a5b4fc;">Diagnóstico do ciclo</div>
    <div style="margin-top:6px;font-size:14px;font-weight:700;color:#ffffff;line-height:1.5;">${diagnosisTitle}</div>
    <div style="margin-top:6px;font-size:13px;line-height:1.6;color:#cbd5e1;">
  ${diagnosisSummary}
  ${daysUntilBreak !== null && daysUntilBreak >= 0 ? `
    <div style="margin-top:6px;color:#fca5a5;font-weight:700;">
      Se nada mudar, seu caixa entra em ruptura em aproximadamente ${daysUntilBreak} dias.
    </div>
  ` : ''}
</div>

  <div style="padding:12px 14px;border-radius:14px;background:${urgency === 'critical' ? 'rgba(239,68,68,0.10)' : urgency === 'high' ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)'};border:1px solid ${urgency === 'critical' ? 'rgba(239,68,68,0.24)' : urgency === 'high' ? 'rgba(245,158,11,0.24)' : 'rgba(16,185,129,0.22)'};">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:${urgency === 'critical' ? '#fca5a5' : urgency === 'high' ? '#fcd34d' : '#86efac'};">Ação imediata</div>
    <div style="margin-top:6px;font-size:13px;line-height:1.6;color:#f8fafc;">${diagnosisAction}</div>
  </div>
</div>

<div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
  <div style="padding:12px;border-radius:14px;background:rgba(15,23,42,0.62);border:1px solid rgba(255,255,255,0.05);">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">Limite diário seguro</div>
    <div style="margin-top:6px;font-size:20px;font-weight:800;color:#f8fafc;">${fmt(safeDailyLimit)}</div>
  </div>

  <div style="padding:12px;border-radius:14px;background:rgba(15,23,42,0.62);border:1px solid rgba(255,255,255,0.05);">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">Média diária atual</div>
    <div style="margin-top:6px;font-size:20px;font-weight:800;color:#f8fafc;">${fmt(averageDailyExpense)}</div>
  </div>

  <div style="padding:12px;border-radius:14px;background:rgba(15,23,42,0.62);border:1px solid rgba(255,255,255,0.05);">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">Saldo projetado no fechamento</div>
    <div style="margin-top:6px;font-size:20px;font-weight:800;color:${projectedEndBalance >= 0 ? '#34d399' : '#f87171'};">${fmt(projectedEndBalance)}</div>
  </div>
</div>
  `;

  missionTextEl.parentNode.insertBefore(panel, missionTextEl);
}

function renderDailyMission() {
  const textEl = document.getElementById('missionText');
  const barEl = document.getElementById('missionProgressBar');
  const progressEl = document.getElementById('missionProgressText');
  const badgeEl = document.getElementById('missionStatusBadge');
  const completeBtn = document.getElementById('missionCompleteBtn');
  const skipBtn = document.getElementById('missionSkipBtn');

  if (!textEl || !barEl || !progressEl || !state.user) return;

  const txs = getFilteredTx('month');
  const summary = calcSummary(txs);
  const snap = typeof getBehaviorEngineSnapshot === 'function' ? getBehaviorEngineSnapshot() : null;

  ensureMissionV3State(snap);

  const today = fmtDate(new Date());
  const todayISO = new Date().toISOString().slice(0, 10);

  const todayExpenses = state.transactions
    .filter(t => t.type === 'expense' && t.date === today)
    .reduce((sum, t) => sum + t.value, 0);

  let progressPct = 0;
  const missionType = state.missionStatus.type || 'discipline';
  const target = Number(state.missionStatus.target || 0);

  if (state.missionStatus.date !== todayISO) {
    ensureMissionV3State(snap);
  }

  if (state.missionStatus.status === 'completed') {
    progressPct = 100;
  } else if (state.missionStatus.status === 'skipped') {
    progressPct = 12;
  } else {
    if (missionType === 'containment' || missionType === 'retention' || missionType === 'discipline' || missionType === 'growth') {
      progressPct = target > 0
        ? Math.max(0, Math.min(100, ((target - todayExpenses) / target) * 100))
        : 100;
    } else if (missionType === 'category_control') {
      progressPct = target > 0
        ? Math.max(0, Math.min(100, ((target - todayExpenses) / target) * 100))
        : 100;
    } else {
      progressPct = 0;
    }
  }

  state.missionStatus.current = Math.max(0, target - todayExpenses);

const missionTitle = state.missionStatus.title || 'Missão do dia';
const missionText = state.missionStatus.text || 'Hoje o FinanceAI está preparando sua missão.';
const severity = state.missionStatus.severity || 'stable';

const severityLabelMap = {
  critical: 'Risco crítico em curso',
  containment: 'Contenção imediata',
  pressure: 'Pressão crescente',
  attention: 'Atenção ativa',
  stable: 'Execução estratégica'
};

const severityAccent =
  severity === 'critical'
    ? '#fca5a5'
    : severity === 'containment' || severity === 'pressure'
    ? '#fcd34d'
    : '#a5b4fc';

const missionTargetLabel = target > 0 ? fmt(target) : 'R$ 0,00';
const missionCurrentLabel = fmt(Math.max(0, Number(state.missionStatus.current || 0)));
const missionImpactLabel = state.missionStatus.status === 'completed'
  ? fmt(state.missionStatus.savedAmount || target || 0)
  : fmt(Math.max(0, Number(state.missionStatus.current || 0)));

textEl.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:10px;">
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div style="font-size:13px;font-weight:800;letter-spacing:0.02em;color:${severityAccent};text-transform:uppercase;">
        ${missionTitle}
      </div>
${(() => {
  const bridge = state?.financialDoctor?.missionBridge;

  if (!bridge) {
    return `
      <div style="font-size:14px;color:#fca5a5;font-weight:600;">
  ${bridge.title}
</div>

<div style="font-size:15px;line-height:1.6;color:var(--text-primary);">
  ${bridge.text}
</div>

<div style="font-size:14px;font-weight:700;color:#fcd34d;">
  ${state?.financialDoctor?.diagnosis?.recommendedAction || 'Ação obrigatória: proteger o caixa imediatamente.'}
</div>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:6px;">

    </div>

    <div style="margin-top:6px;font-size:13px;font-weight:600;color:#fcd34d;">
      Execução obrigatória hoje.
    </div>
  `;
})()}
    </div>
`;

  barEl.style.width = `${progressPct.toFixed(0)}%`;

  if (state.missionStatus.status === 'completed') {
    progressEl.textContent = 'Missão concluída hoje com execução validada';
    barEl.style.background = 'linear-gradient(90deg, #10b981, #34d399)';

    if (badgeEl) {
      badgeEl.textContent = '✅ Missão concluída hoje';
      badgeEl.style.background = 'rgba(16,185,129,0.14)';
      badgeEl.style.color = '#6ee7b7';
    }

    if (completeBtn) {
      completeBtn.disabled = true;
      completeBtn.textContent = '✅ Concluída';
      completeBtn.style.opacity = '0.75';
      completeBtn.style.cursor = 'not-allowed';
    }

    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.textContent = 'Encerrada';
      skipBtn.style.opacity = '0.45';
      skipBtn.style.cursor = 'not-allowed';
    }

    return;
  }

  if (state.missionStatus.status === 'skipped') {
    progressEl.textContent = 'Missão encerrada sem execução hoje';
    barEl.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';

    if (badgeEl) {
      badgeEl.textContent = '⚠️ Missão ignorada hoje';
      badgeEl.style.background = 'rgba(245,158,11,0.14)';
      badgeEl.style.color = '#fbbf24';
    }

    if (completeBtn) {
      completeBtn.disabled = true;
      completeBtn.textContent = 'Encerrada hoje';
      completeBtn.style.opacity = '0.45';
      completeBtn.style.cursor = 'not-allowed';
    }

    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.textContent = 'Ignorada';
      skipBtn.style.opacity = '0.75';
      skipBtn.style.cursor = 'not-allowed';
    }

    return;
  }

  progressEl.textContent = `${progressPct.toFixed(0)}% de execução da missão hoje`;

  if (severity === 'critical') {
    barEl.style.background = 'linear-gradient(90deg, #ef4444, #f97316)';
  } else if (severity === 'containment' || severity === 'pressure') {
    barEl.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
  } else if (progressPct >= 80) {
    barEl.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
  } else if (progressPct >= 40) {
    barEl.style.background = 'linear-gradient(90deg, #6366f1, #8b5cf6)';
  } else {
    barEl.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
  }

  if (badgeEl) {
    const severityMap = {
      stable: 'Missão estratégica',
      attention: 'Atenção ativa',
      pressure: 'Pressão financeira',
      containment: 'Contenção imediata',
      critical: 'Risco crítico'
    };

    badgeEl.textContent = severityMap[severity] || 'Missão em aberto';

    if (severity === 'critical') {
      badgeEl.style.background = 'rgba(239,68,68,0.14)';
      badgeEl.style.color = '#fca5a5';
    } else if (severity === 'containment' || severity === 'pressure') {
      badgeEl.style.background = 'rgba(245,158,11,0.14)';
      badgeEl.style.color = '#fbbf24';
    } else {
      badgeEl.style.background = 'rgba(99,102,241,0.12)';
      badgeEl.style.color = '#a5b4fc';
    }
  }

  if (completeBtn) {
    completeBtn.disabled = false;
    completeBtn.textContent = '✅ Concluir missão';
    completeBtn.style.opacity = '1';
    completeBtn.style.cursor = 'pointer';
  }

  if (skipBtn) {
    skipBtn.disabled = false;
    skipBtn.textContent = 'Ignorar hoje';
    skipBtn.style.opacity = '1';
    skipBtn.style.cursor = 'pointer';
  }
}


function completeMission() {
  if (!state.user || state.missionStatus.completed) return;

  state.missionStatus.completed = true;
  state.missionStatus.status = 'completed';
  state.missionStatus.savedAmount = state.missionStatus.target || 0;

state.missionHistory.unshift({
  date: state.missionStatus.date,
  success: true,
  value: state.missionStatus.target || 0,
  type: state.missionStatus.type || 'discipline',
  diagnosis: state.missionStatus.diagnosis || 'controlled_growth',
  severity: state.missionStatus.severity || 'stable',
  title: state.missionStatus.title || '',
  createdAt: new Date().toISOString()
});

  if (state.missionHistory.length > 30) {
    state.missionHistory = state.missionHistory.slice(0, 30);
  }

  updateRiskFromMission(true);

  addNotification(
    'Missão concluída',
    `Você concluiu a missão do dia e preservou ${fmt(state.missionStatus.target || 0)}.`,
    'success'
  );

  showToast('success', 'Missão concluída!', 'Excelente disciplina financeira hoje.');
  saveUserData();
  renderDashboard();
}

function skipMission() {
  if (!state.user || state.missionStatus.completed) return;

  state.missionStatus.completed = true;
  state.missionStatus.status = 'skipped';
  state.missionStatus.savedAmount = 0;

state.missionHistory.unshift({
  date: state.missionStatus.date,
  success: false,
  value: state.missionStatus.target || 0,
  type: state.missionStatus.type || 'discipline',
  diagnosis: state.missionStatus.diagnosis || 'controlled_growth',
  severity: state.missionStatus.severity || 'stable',
  title: state.missionStatus.title || '',
  createdAt: new Date().toISOString()
});

  if (state.missionHistory.length > 30) {
    state.missionHistory = state.missionHistory.slice(0, 30);
  }

  updateRiskFromMission(false);

  addNotification(
    'Missão não concluída',
    `A missão de ${fmt(state.missionStatus.target || 0)} não foi cumprida hoje.`,
    'warning'
  );
   

  showToast('warning', 'Missão não concluída', 'Amanhã o FinanceAI recalibra sua missão.');
  saveUserData();
  renderDashboard();
}

function updateRiskFromMission(success) {
  updateBehaviorProfileFromMissionHistory();

  state.behaviorProfile.lastMissionOutcome = success ? 'success' : 'fail';
  state.behaviorProfile.lastMissionType = state.missionStatus.type || 'discipline';
  state.behaviorProfile.lastMissionDiagnosis = state.missionStatus.diagnosis || 'controlled_growth';
  state.behaviorProfile.lastMissionSeverity = state.missionStatus.severity || 'stable';
  state.behaviorProfile.lastMissionImpact = success
    ? Math.max(1, Number(state.missionStatus.scoreDeltaSuccess || 2))
    : Math.abs(Math.min(-1, Number(state.missionStatus.scoreDeltaFail || -3)));
  state.behaviorProfile.lastUpdatedAt = new Date().toISOString();

  updateBehaviorProfileFromMissionHistory();

  const premiumScoreEl = document.getElementById('premiumRiskScore');
  const premiumLevelEl = document.getElementById('premiumRiskLevel');
  const legacyScoreEl = document.getElementById('scoreNum');

  const snap = getBehaviorEngineSnapshot();
  if (!snap) return;

  if (premiumScoreEl) premiumScoreEl.textContent = `${snap.score}/100`;
  if (premiumLevelEl) premiumLevelEl.textContent = `Risco ${snap.riskLevel}`;
  if (legacyScoreEl) legacyScoreEl.textContent = String(snap.score);
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

const snap = getBehaviorEngineSnapshot();
recordBehaviorMemorySnapshot(snap);
buildFinancialDoctorContext(snap);
renderFinancialDoctorPanel();

renderDailyMission();
renderPremiumRiskCard();
analyzeAlertsSafe();
analyzePredictiveAlerts();
renderPremiumRiskCard();
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
  renderPremiumRiskCard();
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
addNotification(
  'Limite ultrapassado',
  `Você ultrapassou o limite de ${category}: ${fmt(monthTotal)} de ${fmt(limit)}.`,
  'warning',
  {
    priority: 'high',
    category: 'limit',
    source: 'limit-engine',
    actionLabel: 'Ver limites',
    actionPage: 'settings'
  }
);
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
  const snap = typeof getBehaviorEngineSnapshot === 'function'
    ? getBehaviorEngineSnapshot()
    : null;

  state._lastAISnapshot = snap;

  generateAIInsights(snap);
  updateAIScore(snap);
  renderProjectionChart('moderate');
}

function generateAIInsights(externalSnap = null) {
  const snap = externalSnap || state._lastAISnapshot || (
    typeof getBehaviorEngineSnapshot === 'function'
      ? getBehaviorEngineSnapshot()
      : null
  );

  const txs = getFilteredTx();
  const { income, expense, savingsRate } = calcSummary(txs);

  const insights = [];

  if (snap?.behaviorState?.state === 'pre_collapse' || Number(snap?.score || 0) >= 85) {
    insights.push({
      type: 'negative',
      icon: '🚨',
      title: 'Risco estrutural elevado',
      desc: 'Seu padrão atual aponta ruptura financeira iminente. O foco imediato é conter aceleração de dano.',
      action: 'Executar contenção agora'
    });
  } else if (snap?.behaviorState?.state === 'sabotage_active' || Number(snap?.metrics?.sabotageIndex || 0) >= 60) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Sabotagem financeira em curso',
      desc: 'O sistema detecta repetição de comportamento que corrói sua margem mesmo sem colapso visível.',
      action: 'Interromper padrão'
    });
  } else if (Number(savingsRate || 0) >= 20 && income > expense) {
    insights.push({
      type: 'positive',
      icon: '🏆',
      title: 'Excelente taxa de poupança!',
      desc: `Parabéns! Você está poupando ${savingsRate.toFixed(1)}% da sua renda — acima da meta de 20%. Continue esse ritmo e considere investir o excedente.`,
      action: 'Ver oportunidades'
    });
  } else if (Number(savingsRate || 0) < 10) {
    insights.push({
      type: 'negative',
      icon: '📉',
      title: 'Taxa de poupança baixa',
      desc: `Você está poupando apenas ${savingsRate.toFixed(1)}% da sua renda. O ideal é avançar para pelo menos 20% com consistência.`,
      action: 'Criar meta de economia'
    });
  }

  if (state.goals.length === 0) {
    insights.push({
      type: 'info',
      icon: '🎯',
      title: 'Nenhuma meta ativa',
      desc: 'Definir metas financeiras claras aumenta retenção de caixa e melhora disciplina de longo prazo.',
      action: 'Criar primeira meta'
    });
  }

  if (txs.length === 0) {
    insights.push({
      type: 'info',
      icon: '🧠',
      title: 'Base ainda em formação',
      desc: 'Adicione mais movimentações para aumentar a precisão da leitura comportamental.',
      action: 'Adicionar transações'
    });
  }

  state.aiInsights = insights;

  const grid = document.getElementById('insightsGrid');
  if (!grid) return;

  grid.innerHTML = insights.map(ins => `
    <div class="insight-card">
      <div class="insight-header">
        <div class="insight-icon ${ins.type}"><span>${ins.icon}</span></div>
        <div>
          <div class="insight-type ${ins.type}">
            ${ins.type === 'positive' ? 'Positivo' : ins.type === 'negative' ? 'Atenção' : ins.type === 'warning' ? 'Alerta' : 'Informação'}
          </div>
        </div>
      </div>
      <div class="insight-title">${ins.title}</div>
      <div class="insight-desc">${ins.desc}</div>
      <span class="insight-action">${ins.action}</span>
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Adicione transações para gerar insights.</div>';
}

function updateAIScore(externalSnap = null) {
  const txs = getFilteredTx();
  const { income, expense, savingsRate } = calcSummary(txs);

  const snap = externalSnap || state._lastAISnapshot || (
    typeof getBehaviorEngineSnapshot === 'function'
      ? getBehaviorEngineSnapshot()
      : null
  );

  const score = snap && typeof snap.score === 'number'
    ? Math.max(0, Math.min(100, Math.round(snap.score)))
    : 20;

  const riskLevel = snap?.riskLevel || 'Baixo';
  const behaviorState = snap?.behaviorState || null;
  const languagePack = snap?.languagePack || {};
  const metrics = snap?.metrics || {};

  const scoreEl = document.getElementById('scoreNum');
  if (scoreEl) scoreEl.textContent = score;

  const circumference = 377;
  const offset = circumference - (score / 100) * circumference;
  const circle = document.getElementById('scoreCircle');
  if (circle) circle.setAttribute('stroke-dashoffset', offset);

    const descEl = document.getElementById('scoreDescription');
  if (descEl) {
    const spendAfterIncomePct = Math.round(Number(snap?.spendAfterIncomePct || 0));
    const projectedBalance = Number(snap?.projectedBalance || 0);
    const primaryDriver = snap?.behavior?.primaryDriver || 'stable_control';
    const sabotagePattern = snap?.behavior?.sabotagePattern || 'none';
    const impulseExpenseCount = Number(snap?.behavior?.impulseExpenseCount || 0);
    const failStreak = Number(snap?.behavior?.failStreak || 0);
    const silentRiskLoad = Math.round(Number(metrics?.silentRiskLoad || 0));
    const sabotageIndex = Math.round(Number(metrics?.sabotageIndex || 0));

    let driverText = 'seu padrão financeiro perdeu consistência';
    if (primaryDriver === 'post_income_burn') {
      driverText = `você comprometeu ${spendAfterIncomePct}% da renda após a entrada do dinheiro`;
    } else if (primaryDriver === 'cash_collapse_risk') {
      driverText = `sua projeção atual fecha o ciclo em ${fmt(projectedBalance)}`;
    } else if (primaryDriver === 'non_essential_spike') {
      driverText = 'seus gastos variáveis estão comprimindo sua margem cedo demais';
    } else if (primaryDriver === 'retention_failure') {
      driverText = 'sua retenção de caixa está fraca para o padrão atual de despesas';
    } else if (primaryDriver === 'impulse_cluster') {
      driverText = `o sistema detectou ${impulseExpenseCount} gastos de impulso no ciclo atual`;
    } else if (primaryDriver === 'mission_resistance') {
      driverText = `sua disciplina entrou em resistência, com ${failStreak} falha(s) recentes de execução`;
    } else if (primaryDriver === 'compulsive_spending') {
      driverText = 'o sistema detecta repetição de gasto compulsivo drenando sua margem';
    } else if (primaryDriver === 'emotional_spending') {
      driverText = 'há sinais de gasto emocional afetando sua estabilidade';
    } else if (primaryDriver === 'impulse_drift') {
      driverText = 'há deriva de impulso em pequenas saídas recorrentes';
    }

    let consequenceText = 'Isso ainda não virou colapso, mas já iniciou deterioração estrutural.';
       if (projectedBalance < 0) {
      consequenceText = `mantido esse ritmo, você termina o ciclo no negativo em ${fmt(projectedBalance)} — isso significa fechar o período sem margem e já em pressão financeira real`;
       } else if (primaryDriver === 'cash_collapse_risk') {
      driverText = `seu caixa já entrou em rota de fechamento negativo no ciclo atual`;
    } else if (sabotageIndex >= 60 || sabotagePattern === 'mission_resistance') {
      consequenceText = 'O dano não está só no valor gasto, mas na repetição do padrão que volta a desmontar sua disciplina.';
    } else if (silentRiskLoad >= 55) {
      consequenceText = 'O risco está se formando de maneira silenciosa e tende a aparecer tarde demais se não houver correção agora.';
    } else if (score <= 30) {
      consequenceText = 'Seu padrão segue relativamente controlado, mas o sistema continua monitorando sinais de recaída.';
    }

    let diagnosisPrefix = 'Leitura comportamental:';
    if (score >= 85 || behaviorState?.state === 'pre_collapse') {
      diagnosisPrefix = 'Diagnóstico crítico:';
    } else if (score >= 70 || behaviorState?.state === 'sabotage_active') {
      diagnosisPrefix = 'Diagnóstico de dano ativo:';
    } else if (score >= 50) {
      diagnosisPrefix = 'Diagnóstico de atenção:';
    } else if (score >= 30) {
      diagnosisPrefix = 'Diagnóstico preventivo:';
    } else if (score <= 30) {
      diagnosisPrefix = 'Diagnóstico de estabilidade:';
    }

    descEl.textContent = `${diagnosisPrefix} ${driverText}. ${consequenceText}`;
  }

  const ctrl = Math.min(100, Math.max(0, 100 - (expense / (income || 1) * 100)));
  const sav = Math.min(100, Math.max(0, savingsRate * 5));
  const goalPct = state.goals.length
    ? Math.min(100, state.goals.reduce((s, g) => s + (g.current / g.target), 0) / state.goals.length * 100)
    : 0;

  const canonicalDivers = metrics.silentRiskLoad != null
    ? Math.max(0, Math.min(100, 100 - Number(metrics.silentRiskLoad || 0)))
    : Math.min(100, new Set(txs.filter(t => t.type === 'expense').map(t => t.category)).size * 15);

  ['control', 'savings', 'goals', 'divers'].forEach((key, i) => {
    const vals = [ctrl, sav, goalPct, canonicalDivers];
    const barEl = document.getElementById(key + 'Bar');
    const pctEl = document.getElementById(key + 'Pct');
    if (barEl) barEl.style.width = vals[i].toFixed(0) + '%';
    if (pctEl) pctEl.textContent = vals[i].toFixed(0) + '%';
  });

  const healthTitle = document.querySelector('#page-ai .card-title, #page-ai h3');
  if (healthTitle && healthTitle.textContent.trim() === 'Saúde Financeira') {
    healthTitle.textContent = `Saúde Financeira — ${riskLevel}`;
  }
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

  const snap = typeof getBehaviorEngineSnapshot === 'function'
    ? getBehaviorEngineSnapshot()
    : null;

  if (!snap) {
    insightEl.textContent = 'Sem leitura comportamental suficiente ainda. Continue registrando movimentações para o FinanceAI detectar risco, padrão e pressão.';
    return;
  }

  const projectedBalance = Number(snap.projectedBalance || 0);
  const score = Number(snap.score || 0);
  const behavior = snap.behavior || {};
  const metrics = snap.metrics || {};
  const behaviorState = snap.behaviorState || {};
  const languagePack = snap.languagePack || {};
  const topCategory = getTopCategory(txs);

  let message = '';

  if (behaviorState.state === 'pre_collapse' || projectedBalance < 0) {
    const dailyBase = Math.max(Number(behavior.dailyAvgExpense || 0), 50);
    const daysToPressure = Math.max(1, Math.round(Math.abs(projectedBalance) / dailyBase));
    message = `Seu padrão atual está empurrando seu caixa para ruptura. Se nada mudar, a pressão pode estourar em cerca de ${daysToPressure} dias. Ação agora: interrompa o driver dominante ${behavior.primaryDriver || 'de risco'} antes que ele vire perda real.`;
  } else if (behaviorState.state === 'sabotage_active') {
    message = `O FinanceAI detectou sabotagem ativa no seu comportamento financeiro. O problema não é só gasto alto: é repetição de erro com impacto crescente. Ação agora: bloquear gastos variáveis e reduzir exposição ao padrão dominante.`;
  } else if (Number(metrics.postIncomeVulnerability || 0) >= 55) {
    message = `Sua vulnerabilidade sobe logo após entrada de renda. Isso comprime sua margem cedo demais e aumenta o risco de sufoco antes do fim do ciclo. Ação agora: travar consumo impulsivo nas próximas 48h após receber.`;
  } else if (Number(metrics.silentRiskLoad || 0) >= 55) {
    message = `Seu risco está se formando de maneira silenciosa. Ainda não parece colapso, mas sua consistência já começou a ceder. Ação agora: conter vazamentos antes que a pressão fique visível.`;
  } else if ((behavior.impulseExpenseCount || 0) >= 3) {
    message = `Seu controle está sendo corroído por decisões impulsivas recorrentes. Não é o valor isolado que pesa mais — é a repetição que drena sua margem. Ação agora: bloquear gastos não essenciais hoje.`;
  } else if (savingsRate < 10) {
    message = `Sua retenção está abaixo do necessário para estabilidade real. Hoje você poupa ${savingsRate.toFixed(1)}% e isso ainda deixa sua estrutura vulnerável. Ação agora: proteger margem e levar sua retenção para pelo menos 20%.`;
  } else if (topCategory && topCategory !== 'N/A') {
    message = `Seu maior centro de pressão atual está em ${topCategory}. O FinanceAI está acompanhando essa concentração para evitar que ela comprima sua margem sem você perceber.`;
  } else {
    message = languagePack.headline
      ? `${languagePack.headline} ${languagePack.body || ''}`.trim()
      : `Seu padrão financeiro está relativamente sob controle, mas ainda exige disciplina. Estabilidade não é ausência de risco — é repetição correta sob monitoramento.`;
  }

  insightEl.textContent = message;
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

const emergencyMinimumTarget = Math.max(expenseBase * 1, 800);
const emergencyEssentialTarget = Math.max(expenseBase * 3, 2000);
const emergencyTarget = Math.max(expenseBase * 6, 3000);

const emergencyCurrent = emergencyGoal ? (emergencyGoal.current || 0) : 0;

const emergencyCoveragePct = emergencyTarget > 0
  ? Math.min((emergencyCurrent / emergencyTarget) * 100, 100)
  : 0;

const emergencyMinimumCoveragePct = emergencyMinimumTarget > 0
  ? Math.min((emergencyCurrent / emergencyMinimumTarget) * 100, 100)
  : 0;

const emergencyEssentialCoveragePct = emergencyEssentialTarget > 0
  ? Math.min((emergencyCurrent / emergencyEssentialTarget) * 100, 100)
  : 0;

const emergencyMinimumGap = Math.max(emergencyMinimumTarget - emergencyCurrent, 0);
const emergencyEssentialGap = Math.max(emergencyEssentialTarget - emergencyCurrent, 0);
const emergencyIdealGap = Math.max(emergencyTarget - emergencyCurrent, 0);
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

    const canonicalSnap = typeof getBehaviorEngineSnapshot === 'function'
    ? getBehaviorEngineSnapshot()
    : null;

  const canonicalScore = canonicalSnap && typeof canonicalSnap.score === 'number'
    ? Number(canonicalSnap.score)
    : 20;

  const canonicalRiskLevel = canonicalSnap?.riskLevel || 'Baixo';
  const canonicalBehaviorState = canonicalSnap?.behaviorState || null;
  const canonicalProjectedBalance = typeof canonicalSnap?.projectedBalance === 'number'
    ? Number(canonicalSnap.projectedBalance)
    : summary.balance;

  const disciplineScore = canonicalScore;

  return {
    txs,
    ...summary,
    byCategory,
    topExpenseCategory,
    topExpenseValue,
    foodExpense,
    recurringCount,
    goalsCount,
    emergencyMinimumTarget,
    emergencyEssentialTarget,
    emergencyTarget,
    emergencyCurrent,
    emergencyCoveragePct,
    emergencyMinimumCoveragePct,
    emergencyEssentialCoveragePct,
    emergencyMinimumGap,
    emergencyEssentialGap,
    emergencyIdealGap,
       spendAfterIncome,
    concentrationPct,
    negativeMonths,
    score: canonicalScore,
    riskLevel: canonicalRiskLevel,
    behaviorState: canonicalBehaviorState,
    projectedBalance: canonicalProjectedBalance,
    disciplineScore
  };
}

function getEducationCoreDirective(ctx) {
  const directives = [];

  const housingPressure = ['Moradia', 'Habitação', 'Aluguel'].includes(ctx.topExpenseCategory)
    && ctx.concentrationPct >= 18;

  const foodPressure = ctx.topExpenseCategory === 'Alimentação' && ctx.concentrationPct >= 15;

  const variablePressure = ctx.savingsRate < 10 && ctx.topExpenseCategory && !housingPressure;

 if (ctx.emergencyMinimumCoveragePct < 100) {
  directives.push({
    priority: 95,
    mode: 'protection',
    level: 'Risco Alto',
    title: 'Você está a um imprevisto de entrar em pressão financeira',
    desc: `Hoje sua proteção ainda não cobre o primeiro escudo contra imprevistos. Seu colchão mínimo recomendado é ${fmt(ctx.emergencyMinimumTarget)}, você tem ${fmt(ctx.emergencyCurrent)} e faltam ${fmt(ctx.emergencyMinimumGap)} para sair da zona mais frágil.`,
    gain: `O objetivo agora não é perseguir a blindagem ideal completa. É construir o primeiro escudo real que impede um imprevisto pequeno de virar cartão, atraso ou ansiedade. Depois disso, o próximo degrau sobe para ${fmt(ctx.emergencyEssentialTarget)}.`,
    lessonId: 'reserve-shield',
    mission: {
      id: 'mission-create-reserve',
      title: 'Missão: construir seu primeiro escudo financeiro',
      desc: `Seu foco agora é sair da zona vulnerável. Feche primeiro o escudo mínimo de ${fmt(ctx.emergencyMinimumTarget)} antes de pensar na blindagem ideal completa.`,
      reward: 100,
      button: 'Construir escudo agora'
    },
    notification: {
      title: 'Você segue sem escudo contra imprevisto',
      text: `Seu caixa ainda não absorve nem um choque pequeno. O FinanceAI priorizou a construção do seu primeiro escudo financeiro antes que a pressão aumente.`,
      severity: 'high'
    }
  });
}

  if (housingPressure) {
    directives.push({
      priority: 92,
      mode: 'structural-compression',
      level: 'Estrutural',
      title: 'Moradia está comprimindo sua margem estrutural',
      desc: `Seu maior centro de gasto hoje é Moradia, somando ${fmt(ctx.topExpenseValue)} e consumindo ${ctx.concentrationPct.toFixed(1)}% da sua renda do período.`,
      gain: 'Recuperar margem estrutural e reduzir sufoco recorrente no caixa.',
      lessonId: 'cash-bleeding',
      mission: {
        id: 'mission-housing-review',
        title: 'Missão: revisar custo fixo de moradia',
        desc: `Moradia já consome ${ctx.concentrationPct.toFixed(1)}% da sua renda. O objetivo agora é identificar alavancas reais de compressão, renegociação ou ajuste de estrutura.`,
        reward: 95,
        button: 'Revisar moradia'
      },
      notification: {
        title: 'Compressão estrutural detectada',
        text: `Moradia se tornou a principal força de compressão do seu caixa. A prioridade agora é revisar custo fixo, não atacar gasto periférico.`,
        severity: 'high'
      }
    });
  }

  if (ctx.savingsRate < 10 && !housingPressure) {
    directives.push({
      priority: 88,
      mode: 'retention-failure',
      level: 'Urgente',
      title: 'Você não está retendo dinheiro suficiente',
      desc: `Sua taxa de retenção está em ${ctx.savingsRate.toFixed(1)}%. Isso indica baixa capacidade de acumular segurança e patrimônio.`,
      gain: 'Aumentar folga financeira já no próximo ciclo.',
      lessonId: 'salary-evaporation',
      mission: {
        id: 'mission-cut-variable',
        title: 'Missão: travar vazamentos variáveis por 7 dias',
        desc: `Sua retenção está em ${ctx.savingsRate.toFixed(1)}%. A prioridade agora é interromper compras por impulso e rastrear os pontos de fuga do caixa.`,
        reward: 80,
        button: 'Travar vazamentos'
      },
      notification: {
        title: 'Retenção insuficiente',
        text: `Sua retenção caiu para ${ctx.savingsRate.toFixed(1)}%. O FinanceAI priorizou contenção de vazamentos variáveis.`,
        severity: 'high'
      }
    });
  }

  if (foodPressure) {
    directives.push({
      priority: 82,
      mode: 'food-erosion',
      level: 'Ação Rápida',
      title: 'Alimentação está corroendo sua margem com baixa percepção',
      desc: `Seu gasto com alimentação está em ${fmt(ctx.foodExpense)} e já ocupa uma fatia relevante da sua renda atual.`,
      gain: 'Reduzir erosão silenciosa e recuperar espaço para meta, reserva e tranquilidade.',
      lessonId: 'food-control',
      mission: {
        id: 'mission-food-cap',
        title: 'Missão: conter alimentação variável em 15%',
        desc: `Seu gasto atual em alimentação está em ${fmt(ctx.foodExpense)}. O alvo agora é reduzir pelo menos 15% sem radicalismo.`,
        reward: 70,
        button: 'Aplicar contenção'
      },
      notification: {
        title: 'Erosão alimentar detectada',
        text: `Alimentação variável está drenando sua margem. O FinanceAI preparou uma contenção prática para os próximos dias.`,
        severity: 'medium'
      }
    });
  }

  if (ctx.recurringCount >= 4) {
    directives.push({
      priority: 78,
      mode: 'recurring-drain',
      level: 'Revisão',
      title: 'Custos recorrentes estão drenando seu caixa silenciosamente',
      desc: `Há ${ctx.recurringCount} cobranças recorrentes ativas no sistema. Custos silenciosos tendem a corroer margem mês após mês.`,
      gain: 'Aliviar peso fixo e recuperar margem de decisão.',
      lessonId: 'recurring-burden',
      mission: {
        id: 'mission-recurring-audit',
        title: 'Missão: auditar recorrências invisíveis',
        desc: `Você tem ${ctx.recurringCount} recorrências ativas. O foco agora é separar o que é essencial, útil ou descartável.`,
        reward: 75,
        button: 'Auditar recorrências'
      },
      notification: {
        title: 'Drenagem recorrente detectada',
        text: `Seus custos recorrentes viraram peso silencioso. O FinanceAI priorizou uma auditoria de recorrências.`,
        severity: 'medium'
      }
    });
  }

  if (!directives.length) {
    directives.push({
      priority: 40,
      mode: 'growth-readiness',
      level: 'Crescimento',
      title: 'Sua base está relativamente estável',
      desc: `Seu saldo do período está em ${fmt(ctx.balance)} e sua retenção em ${ctx.savingsRate.toFixed(1)}%. Agora o foco passa a ser consistência e crescimento.`,
      gain: 'Transformar controle em patrimônio com progressão estável.',
      lessonId: 'stability-before-investing',
      mission: {
        id: 'mission-structure',
        title: 'Missão: reforçar sua disciplina financeira',
        desc: 'Revise categorias, metas e uma prioridade do mês para manter consistência e preparar crescimento.',
        reward: 60,
        button: 'Reforçar disciplina'
      },
      notification: {
        title: 'Base estável detectada',
        text: 'O FinanceAI identificou estabilidade relativa. A prioridade agora é consistência e construção de base forte.',
        severity: 'low'
      }
    });
  }

  directives.sort((a, b) => b.priority - a.priority);
  return directives[0];
}

function getEducationDiagnosis(ctx) {
  const core = getEducationCoreDirective(ctx);

  return {
    level: core.level,
    title: core.title,
    desc: core.desc,
    gain: core.gain,
    lessonId: core.lessonId
  };
}

function getEducationMission(ctx) {
  const core = getEducationCoreDirective(ctx);

  return {
    id: core.mission.id,
    title: core.mission.title,
    desc: core.mission.desc,
    reward: core.mission.reward,
    button: core.mission.button
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
  ensureEducationState();

  const ctx = getEducationContext();
  const diagnosis = getEducationDiagnosis(ctx);

 const pushEducationNotification = (title, text, severity = 'medium', extra = {}) => {
  const normalizedPriority = normalizeTacticalSeverity(extra.priority || severity || 'medium');

  addNotification(
    title,
    text,
    normalizedPriority === 'critical'
      ? 'error'
      : normalizedPriority === 'high'
      ? 'warning'
      : 'info',
    {
      priority: normalizedPriority,
      category: extra.category || 'education_intervention',
      source: extra.source || 'phase3_tactical_engine',
      score: typeof extra.score === 'number' ? extra.score : (typeof ctx?.score === 'number' ? ctx.score : null),
      actionLabel: extra.actionLabel || '',
      actionPage: extra.actionPage || ''
    }
  );
};

  const registerEducationTouch = (entry) => {
    state.behaviorMemory = Array.isArray(state.behaviorMemory) ? state.behaviorMemory : [];
    state.behaviorMemory.push({
      type: 'education_intervention',
      createdAt: new Date().toISOString(),
      ...entry
    });
    state.behaviorMemory = state.behaviorMemory.slice(-50);
    saveUserData();
  };

if (action === 'review-transactions') {
  pushEducationNotification(
    'Auditoria tática iniciada',
    'O FinanceAI abriu uma revisão guiada para separar gasto necessário, impulso e conforto repetido antes que o padrão continue se escondendo.',
    'medium',
    {
      priority: 'medium',
      category: 'education_audit',
      source: 'phase3_quick_action',
      score: Number(ctx?.score || 0),
      actionLabel: 'Ver transações',
      actionPage: 'transactions'
    }
  );

  registerEducationTouch({
    lessonId: action,
    diagnosisTitle: 'Auditoria tática de lançamentos',
    currentPage: state.currentPage
  });

  navigate('transactions');

  showToast(
    'info',
    'Auditoria tática aberta',
    'Agora não é só revisão. Você entrou em um filtro para identificar o que está drenando sua margem sem parecer grave.'
  );
  return;
}

if (action === 'create-emergency-goal') {
  pushEducationNotification(
    'Blindagem emergencial iniciada',
    'O FinanceAI abriu a construção de uma reserva ativa para tirar sua proteção do campo da intenção e levar para execução prática.',
    'high',
    {
      priority: 'high',
      category: 'education_reserve',
      source: 'phase3_quick_action',
      score: Number(ctx?.score || 0),
      actionLabel: 'Criar blindagem',
      actionPage: 'goals'
    }
  );

  registerEducationTouch({
    lessonId: action,
    diagnosisTitle: 'Blindagem emergencial',
    currentPage: state.currentPage
  });

  navigate('goals');
  setTimeout(() => {
    if (typeof openGoalModal === 'function') openGoalModal();
  }, 120);

  showToast(
    'warning',
    'Blindagem prática aberta',
    'Sua correção agora saiu da teoria. O próximo passo é transformar proteção em meta ativa com aporte real.'
  );
  return;
}

if (action === 'set-food-limit') {
  const suggestedLimit = Math.max(50, Math.round((Number(ctx.foodExpense || 0)) * 0.85));

  pushEducationNotification(
    'Contenção alimentar preparada',
    `O FinanceAI calculou um teto inicial para alimentação e abriu uma contenção prática para interromper a erosão silenciosa da sua margem.`,
    'high',
    {
      priority: 'high',
      category: 'education_limit',
      source: 'phase3_quick_action',
      score: Number(ctx?.score || 0),
      actionLabel: 'Definir limite',
      actionPage: 'settings'
    }
  );

  registerEducationTouch({
    lessonId: action,
    diagnosisTitle: 'Contenção alimentar',
    currentPage: state.currentPage
  });

  navigate('settings');
  setTimeout(() => {
    const input = document.querySelector('.limit-input[data-cat="Alimentação"]');
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.value = suggestedLimit;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, 120);

  showToast(
    'warning',
    'Contenção alimentar aberta',
    'O teto inicial já foi preparado. Agora salve esse limite para parar o vazamento repetitivo antes que ele pareça normal.'
  );
  return;
}

if (action === 'open-goals') {
  pushEducationNotification(
    'Estrutura de metas acionada',
    'O FinanceAI abriu seu plano de metas para converter intenção difusa em prazo, valor e disciplina de aporte.',
    'medium',
    {
      priority: 'medium',
      category: 'education_goals',
      source: 'phase3_quick_action',
      score: Number(ctx?.score || 0),
      actionLabel: 'Abrir metas',
      actionPage: 'goals'
    }
  );

  registerEducationTouch({
    lessonId: action,
    diagnosisTitle: 'Estruturação de metas',
    currentPage: state.currentPage
  });

  navigate('goals');

  showToast(
    'info',
    'Plano tático de metas aberto',
    'Agora você vai estruturar direção, prazo e aporte. Meta sem estrutura vira desejo; com estrutura, vira execução.'
  );
  return;
}

if (action === 'open-ai') {
  pushEducationNotification(
    'Diagnóstico aprofundado aberto',
    'O FinanceAI abriu uma leitura expandida para detalhar causa, consequência e correção recomendada a partir do seu padrão atual.',
    'medium',
    {
      priority: 'medium',
      category: 'education_ai',
      source: 'phase3_quick_action',
      score: Number(ctx?.score || 0),
      actionLabel: 'Ver análise IA',
      actionPage: 'ai'
    }
  );

  registerEducationTouch({
    lessonId: action,
    diagnosisTitle: 'Diagnóstico aprofundado',
    currentPage: state.currentPage
  });

  navigate('ai');

  showToast(
    'info',
    'Leitura aprofundada aberta',
    'A IA foi aberta para transformar sintoma em causa, risco em leitura e leitura em decisão prática.'
  );
  return;
}

  if (action === 'complete-mission') {
    const mission = getEducationMission(ctx);
    completeEducationMission(mission.id, mission.reward);
    return;
  }

  const interventionIds = [
    'reserve-shield',
    'salary-evaporation',
    'food-control',
    'cash-bleeding',
    'recurring-burden',
    'stability-before-investing',
    'goal-discipline',
    'discipline-engine'
  ];

  if (interventionIds.includes(action)) {
    const tacticalCopy = buildTacticalInterventionCopy(
      {
        mode: action,
        diagnosisKey: action,
        diagnosisTitle: diagnosis?.title || 'Correção tática prioritária',
        severity: diagnosis?.severity || 'high',
        score: Number(ctx?.score || 0),
        actionLabel: 'Abrir correção'
      },
      {
        score: Number(ctx?.score || 0),
        topExpenseCategory: ctx?.topExpenseCategory || '',
        concentrationPct: Number(ctx?.concentrationPct || 0),
        savingsRate: Number(ctx?.savingsRate || 0),
        projectedBalance: Number(ctx?.projectedBalance || 0)
      }
    );

    pushEducationNotification(
      tacticalCopy.notificationTitle,
      tacticalCopy.notificationText,
      tacticalCopy.priority
    );

    registerEducationTouch({
      lessonId: action,
      diagnosisTitle: diagnosis?.title || tacticalCopy.title,
      currentPage: state.currentPage
    });

    openLesson(action);

    setTimeout(() => {
      showToast(
        tacticalCopy.priority === 'critical'
          ? 'error'
          : tacticalCopy.priority === 'high'
          ? 'warning'
          : 'info',
        tacticalCopy.toastTitle,
        tacticalCopy.toastText
      );
    }, 80);

    return;
  }

  if (diagnosis && action === diagnosis.lessonId) {
    const tacticalCopy = buildTacticalInterventionCopy(
      {
        mode: diagnosis.mode || diagnosis.diagnosis || diagnosis.lessonId,
        diagnosisKey: diagnosis.diagnosis || diagnosis.lessonId,
        diagnosisTitle: diagnosis.title || 'Correção tática prioritária',
        severity: diagnosis.severity || 'high',
        score: Number(ctx?.score || 0),
        actionLabel: diagnosis.actionLabel || 'Abrir correção'
      },
      {
        score: Number(ctx?.score || 0),
        topExpenseCategory: ctx?.topExpenseCategory || '',
        concentrationPct: Number(ctx?.concentrationPct || 0),
        savingsRate: Number(ctx?.savingsRate || 0),
        projectedBalance: Number(ctx?.projectedBalance || 0)
      }
    );

    pushEducationNotification(
      tacticalCopy.notificationTitle,
      tacticalCopy.notificationText,
      tacticalCopy.priority
    );

    registerEducationTouch({
      lessonId: diagnosis.lessonId,
      diagnosisTitle: diagnosis.title || tacticalCopy.title,
      currentPage: state.currentPage
    });

    openLesson(diagnosis.lessonId);

    setTimeout(() => {
      showToast(
        tacticalCopy.priority === 'critical'
          ? 'error'
          : tacticalCopy.priority === 'high'
          ? 'warning'
          : 'info',
        tacticalCopy.toastTitle,
        tacticalCopy.toastText
      );
    }, 80);

    return;
  }
}
   
function openLesson(id) {
  const lesson = EDUCATION_PROGRAMS.find(item => item.id === id);
  if (!lesson) return;

  const ctx = getEducationContext();
  const content = getLessonContent(id, ctx);

  const display = {
    emoji: lesson.emoji,
    title: lesson.title,
    tag: lesson.tag,
    duration: lesson.duration,
    difficulty: lesson.difficulty,
    problem: lesson.problem,
    actionLabel: lesson.ctaLabel || 'Executar ação',
    secondaryLabel: 'Ver lógica completa da correção'
  };

  const isHousingCompression =
    id === 'cash-bleeding' &&
    ['Moradia', 'Habitação', 'Aluguel'].includes(ctx.topExpenseCategory);

  const isReserveShield = id === 'reserve-shield';

  if (isHousingCompression) {
    display.emoji = '🏠';
    display.title = 'Moradia está comprimindo sua margem estrutural';
    display.tag = 'Compressão estrutural';
    display.duration = '8 min';
    display.difficulty = 'Prioridade Alta';
    display.problem = `Moradia já está em ${fmt(ctx.topExpenseValue || 0)} e consome ${Number(ctx.concentrationPct || 0).toFixed(1)}% da sua renda do período. O ponto crítico não é impulso. É custo estrutural acima da faixa saudável para o seu caixa.`;
    display.actionLabel = 'Abrir revisão estrutural';
    display.secondaryLabel = 'Ver lógica completa da compressão';
  }

  if (isReserveShield) {
    display.emoji = '🛡️';
    display.title = 'Você está a um imprevisto de entrar em pressão financeira';
    display.tag = 'Blindagem crítica';
    display.duration = '8 min';
    display.difficulty = 'Essencial';
    display.problem = `Hoje seu caixa ainda não segura nem um choque pequeno. Você tem ${fmt(ctx.emergencyCurrent || 0)}, mas o primeiro escudo real começa em ${fmt(ctx.emergencyMinimumTarget || 0)}. Faltam ${fmt(ctx.emergencyMinimumGap || 0)} para sair da zona mais vulnerável.`;
    display.actionLabel = 'Registrar primeiro aporte agora';
    display.secondaryLabel = 'Ver lógica completa da blindagem';
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:820px;">
      <div class="modal-header">
        <h2>${display.emoji} ${display.title}</h2>
        <button onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>

      <div class="modal-body" style="max-height:72vh;overflow-y:auto;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
          <span class="chip">${display.tag}</span>
          <span class="chip">${display.duration} · ${display.difficulty}</span>
        </div>

        <div class="card" style="padding:18px;margin-bottom:16px;">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:10px;">
            Diagnóstico conectado ao usuário
          </div>
          <div style="font-size:17px;line-height:1.7;font-weight:600;">
            ${display.problem}
          </div>
          <div style="margin-top:10px;font-size:14px;opacity:.82;line-height:1.6;">
            Isso não é um aviso genérico. É o ponto de maior fragilidade detectado no seu cenário atual.
          </div>
        </div>

        ${
          isReserveShield
            ? `
            <div class="card" style="padding:18px;margin-bottom:16px;border:1px solid rgba(255,80,80,.22);">
              <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#ff8f8f;margin-bottom:10px;">
                O que está em jogo agora
              </div>
              <div style="font-size:16px;line-height:1.75;">
                Sem esse escudo mínimo, qualquer imprevisto pequeno já pressiona cartão, atraso, ansiedade e decisão ruim sob sufoco.
              </div>
            </div>

            <div class="card" style="padding:18px;margin-bottom:16px;border:1px solid rgba(111,91,255,.24);">
              <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#a9a0ff;margin-bottom:10px;">
                Meta operacional desta intervenção
              </div>
              <div style="font-size:16px;line-height:1.75;">
                Seu objetivo agora não é construir a blindagem ideal completa. É fechar o primeiro escudo de <strong>${fmt(ctx.emergencyMinimumTarget || 0)}</strong>, sair da zona frágil e depois avançar para a blindagem essencial de <strong>${fmt(ctx.emergencyEssentialTarget || 0)}</strong>.
              </div>
            </div>
            `
            : ''
        }

        <div style="line-height:1.85;font-size:15px;color:var(--text-secondary);">
          ${content}
        </div>
      </div>

      <div class="modal-footer" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">${display.secondaryLabel}</button>
        <button class="btn-primary" onclick="completeLesson('${id}', this.closest('.modal-overlay'))">✓ ${display.actionLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}
function getLessonContent(id, ctx) {
  const content = {
    'cash-bleeding': `
      ${
        ['Moradia', 'Habitação', 'Aluguel'].includes(ctx.topExpenseCategory)
          ? `
          <p><strong>O problema aqui não é gasto impulsivo.</strong> É compressão estrutural. Quando moradia ocupa uma faixa alta demais da renda, o usuário perde margem antes mesmo de começar o mês.</p>
          <br>
          <p><strong>No seu cenário atual:</strong> Moradia está em <strong>${fmt(ctx.topExpenseValue)}</strong>, consumindo <strong>${ctx.concentrationPct.toFixed(1)}%</strong> da sua renda do período.</p>
          <br>
          <p><strong>Leitura profissional:</strong></p>
          <p>1. Isso não se resolve com microeconomia em café ou delivery.</p>
          <p>2. O centro do problema está no custo fixo estrutural.</p>
          <p>3. Enquanto essa faixa continuar pressionada, sua retenção seguirá fraca.</p>
          <p>4. O usuário sente sufoco recorrente mesmo quando reduz gastos menores.</p>
          <br>
          <p><strong>Estratégia prática de compressão:</strong></p>
          <p>1. Separar o que é moradia-base do que é custo agregado (condomínio, energia, internet, manutenção).</p>
          <p>2. Identificar qual parte é renegociável, substituível ou reestruturável.</p>
          <p>3. Definir uma faixa-alvo de moradia mais saudável para o seu nível de renda.</p>
          <p>4. Criar um plano de compressão sem desorganizar sua rotina.</p>
          <br>
          <p><strong>Métrica de vitória:</strong> recuperar cerca de <strong>${fmt(Math.max(50, Math.round((ctx.topExpenseValue || 0) * 0.20)))}</strong> a <strong>${fmt(Math.max(80, Math.round((ctx.topExpenseValue || 0) * 0.30)))}</strong> por ciclo já começa a aliviar sua estrutura.</p>
          `
          : `
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
          `
      }
    `,

    'reserve-shield': `
      <p><strong>Você está sem blindagem mínima.</strong> Isso significa que qualquer imprevisto pequeno pode virar pressão financeira real.</p>
      <br>
      <p><strong>No seu cenário atual:</strong> você tem <strong>${fmt(ctx.emergencyCurrent || 0)}</strong> guardado, mas seu primeiro escudo real começa em <strong>${fmt(ctx.emergencyMinimumTarget || 0)}</strong>.</p>
      <br>
      <p><strong>Leitura profissional:</strong></p>
      <p>1. Seu problema agora não é atingir a reserva ideal completa.</p>
      <p>2. Seu foco é sair da zona mais frágil.</p>
      <p>3. Sem blindagem mínima, qualquer pressão vira cartão, atraso ou ansiedade.</p>
      <p>4. O sistema precisa transformar proteção em rotina, não em intenção solta.</p>
      <br>
      <p><strong>Estratégia prática de blindagem:</strong></p>
      <p>1. Criar ou abrir a meta de reserva imediatamente.</p>
      <p>2. Definir o primeiro aporte, mesmo que ele ainda seja pequeno.</p>
      <p>3. Tratar a blindagem mínima como prioridade de estabilidade, não como meta “quando sobrar”.</p>
      <p>4. Fechar primeiro o escudo mínimo antes de pensar no alvo ideal completo.</p>
      <br>
      <p><strong>Seu próximo degrau:</strong> depois de atingir <strong>${fmt(ctx.emergencyMinimumTarget || 0)}</strong>, o próximo nível de proteção sobe para <strong>${fmt(ctx.emergencyEssentialTarget || 0)}</strong>.</p>
      <br>
      <p><strong>Métrica de vitória:</strong> faltam <strong>${fmt(ctx.emergencyMinimumGap || 0)}</strong> para você sair da zona mais vulnerável e começar a operar com um mínimo de proteção real.</p>
    `
  };

  if (!content[id]) {
    return `
      <p><strong>Diagnóstico identificado, mas protocolo ainda não carregado.</strong></p>
      <br>
      <p>O sistema reconheceu a dor dominante, porém esta intervenção ainda não recebeu conteúdo premium completo.</p>
      <p>Isso precisa ser tratado para manter coerência total da experiência.</p>
    `;
  }

  return content[id];
}
function completeLesson(id, overlay) {
  ensureEducationState();

  const completionMessages = {
    'reserve-shield': {
  successTitle: 'Consciência registrada. Execução ainda pendente.',
  successText: 'Você reconheceu a fragilidade correta, mas a proteção só começa de verdade quando o primeiro aporte entra na meta.',
  nextTitle: 'Próxima ação que muda o jogo',
  nextText: 'Agora vá em Metas e registre o primeiro valor da blindagem. Sem aporte real, sua exposição continua exatamente a mesma.'
},
    'cash-bleeding': {
      successTitle: 'Auditoria iniciada com foco real',
      successText: 'Agora o importante é transformar percepção em corte prático no centro do vazamento.',
      nextTitle: 'Próximo passo crítico',
      nextText: 'Revise as despesas da categoria dominante e separe necessidade, conforto e excesso ainda hoje.'
    }
  };

  const message = completionMessages[id] || {
    successTitle: 'Correção registrada',
    successText: 'Você marcou essa intervenção no seu progresso. Agora transforme esse entendimento em ação prática.',
    nextTitle: 'Próximo passo crítico',
    nextText: 'Defina ainda hoje uma ação concreta para que essa intervenção não vire só consciência sem execução.'
  };

  if (!state.eduProgress.completed.includes(id)) {
    state.eduProgress.completed.push(id);
    state.eduProgress.points = (state.eduProgress.points || 0) + 80;
    state.eduProgress.streak = (state.eduProgress.streak || 0) + 1;
    saveUserData();

    showToast('success', message.successTitle, message.successText);

    setTimeout(() => {
      showToast('info', message.nextTitle, message.nextText);
    }, 1200);
  } else {
    showToast('info', 'Módulo já concluído', 'Esse conteúdo já está marcado no seu progresso. O foco agora é executar a próxima ação prática.');
  }

  if (overlay) overlay.remove();
  renderEducation();
}
function getEducationMissionExecutionPlan(missionId, ctx) {
  const plans = {
     'mission-housing-review': {
  title: 'Compressão estrutural de moradia',
  badge: 'Revisão estrutural',
  lessonId: 'cash-bleeding',
  problem: `Moradia está em ${fmt(ctx.topExpenseValue || 0)} e já consome ${Number(ctx.concentrationPct || 0).toFixed(1)}% da sua renda do período. O problema aqui não é descontrole pequeno. É compressão estrutural.`,
  whyNow: 'Quando o custo de moradia entra alto demais na estrutura, o resto do orçamento passa a viver espremido. Isso enfraquece retenção, reserva e sensação de controle.',
  nextStep: 'Vou abrir sua revisão de transações para você identificar o que dentro da moradia é custo-base, custo agregado e possível alavanca de renegociação ou ajuste.',
  expected: 'Ao enxergar a composição da moradia e separar o que realmente pode ser comprimido, você sai do sufoco difuso e entra em plano concreto de alívio estrutural.',
  actionLabel: 'Reduzir pressão da moradia agora'
},
    'mission-food-cap': {
      title: 'Redução prática em alimentação',
      badge: 'Execução guiada',
      lessonId: 'food-control',
      problem: `Seu gasto atual em alimentação está em ${fmt(ctx.foodExpense || 0)}. O ponto aqui não é “gastar menos por gastar menos”. É parar a erosão silenciosa da sua margem.`,
      whyNow: 'Quando alimentação variável cresce sem teto, ela rouba espaço de meta, reserva e tranquilidade.',
      nextStep: `Vou abrir Configurações e preencher um teto inicial sugerido em torno de ${fmt(Math.max(50, Math.round((Number(ctx.foodExpense || 0)) * 0.85)))} para você revisar e salvar.`,
      expected: 'Se você consolidar esse teto e sustentar o ajuste, sua margem começa a respirar já no próximo ciclo.',
      actionLabel: 'Definir teto agora'
    },

   'mission-create-reserve': {
  title: 'Blindagem mínima contra imprevisto',
  badge: 'Proteção financeira',
  lessonId: 'reserve-shield',
  problem: `Hoje sua reserva ainda não cobre o primeiro escudo financeiro. Seu mínimo recomendado é ${fmt(ctx.emergencyMinimumTarget || 0)}, você tem ${fmt(ctx.emergencyCurrent || 0)} e faltam ${fmt(ctx.emergencyMinimumGap || 0)} para sair da zona mais frágil.`,
  whyNow: 'Sem essa blindagem mínima, qualquer imprevisto pequeno já pressiona cartão, atraso, ansiedade e decisão ruim sob sufoco.',
  nextStep: `Vou abrir Metas para você transformar essa proteção em execução prática. Primeiro fechamos o escudo mínimo. Depois avançamos para a blindagem essencial de ${fmt(ctx.emergencyEssentialTarget || 0)}.`,
  expected: 'Quando a reserva mínima entra como meta ativa, o usuário deixa de operar totalmente exposto e começa a recuperar margem psicológica e financeira.',
  actionLabel: 'Criar blindagem agora'
},

    'mission-cut-variable': {
      title: 'Travar vazamento variável',
      badge: 'Correção imediata',
      lessonId: 'cash-bleeding',
      problem: `Sua retenção atual está em ${Number(ctx.savingsRate || 0).toFixed(1)}% e seu maior centro de pressão hoje está em ${ctx.topExpenseCategory || 'uma categoria crítica'} com ${fmt(ctx.topExpenseValue || 0)}.`,
      whyNow: 'Quando a retenção despenca, o problema raramente é só renda. O dano vem do gasto variável sem fricção suficiente.',
      nextStep: 'Vou abrir Transações para você auditar o bloco mais perigoso do mês e separar necessidade de impulso.',
      expected: 'Ao travar o vazamento dominante, você recupera margem e volta a respirar antes de pensar em crescer.',
      actionLabel: 'Auditar vazamento agora'
    },

    'mission-structure': {
      title: 'Organizar base antes de acelerar',
      badge: 'Estrutura',
      lessonId: 'discipline-engine',
      problem: `Sua consistência atual está em ${ctx.disciplineScore || 0}/100. Sem rotina, prioridade e limite claros, o sistema financeiro continua dependendo de motivação.`,
      whyNow: 'Sem base estável, qualquer tentativa de crescer vira esforço disperso.',
      nextStep: 'Vou abrir a IA para aprofundar causa, fragilidade e ordem correta de organização.',
      expected: 'Quando a base fica clara, o usuário para de reagir e passa a conduzir o dinheiro.',
      actionLabel: 'Organizar base agora'
    }
  };

  return plans[missionId] || {
    title: 'Missão operacional',
    badge: 'Execução',
    lessonId: 'discipline-engine',
    problem: 'Sua missão precisa sair do modo decorativo e virar execução prática.',
    whyNow: 'Sem ação concreta, missão vira texto e o produto perde poder.',
    nextStep: 'Vou abrir o fluxo mais apropriado para você executar a correção agora.',
    expected: 'O objetivo é transformar orientação em mudança observável.',
    actionLabel: 'Executar agora'
  };
}

function executeEducationMissionAction(missionId, reward) {
  ensureEducationState();

  state.eduProgress.missionsDone = Array.isArray(state.eduProgress.missionsDone)
    ? state.eduProgress.missionsDone
    : [];

  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];

  const ctx = getEducationContext();
  const plan = getEducationMissionExecutionPlan(missionId, ctx);

  const alreadyDone = state.eduProgress.missionsDone.includes(missionId);

  if (missionId === 'mission-food-cap') {
    navigate('settings');

    setTimeout(() => {
      const input = document.querySelector('.limit-input[data-cat="Alimentação"]');
      if (!input) return;

      const suggestedLimit = Math.max(50, Math.round((Number(ctx.foodExpense || 0)) * 0.85));

      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.value = suggestedLimit;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, 140);
  } else if (missionId === 'mission-create-reserve') {
    navigate('goals');

    setTimeout(() => {
      if (typeof openGoalModal === 'function') openGoalModal();
    }, 140);
  } else if (missionId === 'mission-cut-variable') {
    navigate('transactions');
  } else if (missionId === 'mission-structure') {
    navigate('ai');
  } else {
    navigate('education');
  }

  state.notifications.unshift({
    id: genId(),
    type: 'education_mission',
    title: alreadyDone ? 'Fluxo prático reaberto' : 'Missão executada com ação real',
    text: alreadyDone
      ? `A missão "${plan.title}" já tinha sido pontuada, mas o FinanceAI reabriu a execução prática para você agir agora.`
      : `A missão "${plan.title}" foi convertida em ação prática. O sistema abriu o fluxo correto para a correção.`,
    severity: alreadyDone ? 'low' : 'medium',
    createdAt: new Date().toISOString()
  });

  state.notifications = state.notifications.slice(0, 20);

  if (!alreadyDone) {
    state.eduProgress.missionsDone.push(missionId);
    state.eduProgress.points = Number(state.eduProgress.points || 0) + Number(reward || 0);
    state.eduProgress.streak = Number(state.eduProgress.streak || 0) + 1;
    state.eduProgress.lastMissionDate = new Date().toISOString();
  }

  saveUserData();
  renderNotifications();
  renderEducation();

  document.querySelector('.education-mission-overlay')?.remove();

  showToast(
    alreadyDone ? 'info' : 'success',
    alreadyDone ? 'Fluxo reaberto com inteligência' : 'Missão convertida em execução',
    alreadyDone
      ? 'A missão já estava pontuada, mas o FinanceAI reabriu o plano prático para você agir agora.'
      : `+${reward} pontos adicionados e execução prática aberta.`
  );
}

function completeEducationMission(missionId, reward) {
  ensureEducationState();

  const ctx = getEducationContext();
  const plan = getEducationMissionExecutionPlan(missionId, ctx);
  const alreadyDone = Array.isArray(state.eduProgress.missionsDone) && state.eduProgress.missionsDone.includes(missionId);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay education-mission-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:780px;">
      <div class="modal-header">
        <h2>🎯 ${plan.title}</h2>
        <button onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>

      <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
          <span style="padding:8px 12px;border-radius:999px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.28);font-size:12px;color:#a5b4fc;">${plan.badge}</span>
          <span style="padding:8px 12px;border-radius:999px;background:${alreadyDone ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.04)'};border:1px solid ${alreadyDone ? 'rgba(16,185,129,.28)' : 'rgba(255,255,255,.08)'};font-size:12px;color:${alreadyDone ? '#6ee7b7' : 'var(--text-secondary)'};">
            ${alreadyDone ? 'Já pontuada' : 'Pronta para execução'}
          </span>
        </div>

        <div style="margin-bottom:14px;padding:16px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);">
          <div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Problema real</div>
          <div style="font-size:15px;line-height:1.7;color:var(--text-secondary);">${plan.problem}</div>
        </div>

        <div style="margin-bottom:14px;padding:16px;border-radius:16px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);">
          <div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#fca5a5;margin-bottom:6px;">Por que isso precisa acontecer agora</div>
          <div style="font-size:15px;line-height:1.7;color:var(--text-secondary);">${plan.whyNow}</div>
        </div>

        <div style="margin-bottom:14px;padding:16px;border-radius:16px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18);">
          <div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#a5b4fc;margin-bottom:6px;">Próximo passo operacional</div>
          <div style="font-size:15px;line-height:1.7;color:var(--text-secondary);">${plan.nextStep}</div>
        </div>

        <div style="margin-bottom:6px;padding:16px;border-radius:16px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.18);">
          <div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#6ee7b7;margin-bottom:6px;">Impacto esperado</div>
          <div style="font-size:15px;line-height:1.7;color:var(--text-secondary);">${plan.expected}</div>
        </div>
      </div>

      <div class="modal-actions" style="display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;">
        <button class="btn-ghost" onclick="openLesson('${plan.lessonId}')">Ver explicação aprofundada</button>
        <button class="btn-primary" onclick="executeEducationMissionAction('${missionId}', ${Number(reward || 0)})">
          ${alreadyDone ? 'Reabrir execução prática' : plan.actionLabel}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
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

  const typed = prompt('Digite CONFIRMAR para apagar tudo:');
  if (typed !== 'CONFIRMAR') {
    showToast('info', 'Ação cancelada', 'Nenhum dado foi apagado.');
    return;
  }

  if (!state.user || !state.user.email) {
    showToast('error', 'Usuário inválido', 'Não foi possível identificar a conta ativa.');
    return;
  }

  const k = state.user.email;

  [
    'transactions',
    'goals',
    'settings',
    'notifications',
    'missionStatus',
    'missionHistory',
    'behaviorProfile',
    'eduProgress',
    'behaviorMemory'
  ].forEach(key => {
    localStorage.removeItem(`financeai_${key}_${k}`);
  });

  destroyAllCharts();
  state.charts = {};

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

  state.missionStatus = {
    date: null,
    type: 'discipline',
    severity: 'stable',
    diagnosis: 'controlled_growth',
    title: '',
    text: '',
    actionLabel: 'Executar missão',
    target: 0,
    current: 0,
    completed: false,
    savedAmount: 0,
    status: 'pending',
    scoreDeltaSuccess: 2,
    scoreDeltaFail: -3,
    psychologicalTone: 'supportive'
  };

  state.missionHistory = [];

  state.behaviorProfile = {
    dominantPain: 'controlled_growth',
    severity: 'stable',
    failStreak: 0,
    successStreak: 0,
    recentFailureTypes: [],
    recentSuccessTypes: []
  };

  state.aiInsights = [];
  state.eduProgress = { completed: [], streak: 0, points: 0 };
  state.behaviorMemory = [];
  state.period = 'month';

  navigate('dashboard');
  buildEducationCards();
  renderNotifications();

  showToast('success', 'Reset total concluído', 'Todos os dados operacionais e comportamentais da conta foram apagados com sucesso.');
}
function normalizeTacticalSeverity(severity) {
  const map = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
    stable: 'low',
    attention: 'medium',
    warning: 'medium',
    urgent: 'high',
    danger: 'critical'
  };

  return map[String(severity || '').toLowerCase()] || 'medium';
}

function getTacticalPriorityLabel(priority) {
  const labels = {
    low: 'Baixa prioridade',
    medium: 'Prioridade moderada',
    high: 'Prioridade alta',
    critical: 'Prioridade crítica'
  };

  return labels[normalizeTacticalSeverity(priority)] || 'Prioridade moderada';
}

function buildTacticalInterventionCopy(core, ctx = {}) {
  const severity = normalizeTacticalSeverity(core?.severity || core?.priority || 'medium');
  const score = Number(core?.score ?? ctx?.score ?? 0);
  const topCategory = ctx?.topExpenseCategory || core?.categoryLabel || 'seu padrão atual';
  const concentrationPct = Number(ctx?.concentrationPct || 0);
  const savingsRate = Number(ctx?.savingsRate || 0);
  const projectedBalance = Number(ctx?.projectedBalance || 0);
  const diagnosisTitle = core?.diagnosisTitle || core?.title || 'ponto crítico';
  const mode = core?.mode || core?.diagnosisKey || '';

  const base = {
    title: 'Intervenção tática iniciada',
    notificationTitle: 'Intervenção tática iniciada',
    notificationText: 'O FinanceAI ativou uma intervenção guiada com causa, impacto e próximo passo.',
    toastTitle: 'Intervenção tática aberta',
    toastText: 'O sistema abriu uma correção prática para agir no ponto de maior pressão.',
    actionLabel: core?.actionLabel || 'Abrir correção',
    category: core?.category || 'intervention',
    priority: severity,
    source: 'phase3-tactical-engine'
  };

  if (mode === 'reserve-shield' || mode === 'reserve-insufficient') {
  return {
    ...base,
    title: 'Você segue sem escudo contra imprevisto',
    notificationTitle: 'Sua proteção ainda não segura um choque pequeno',
    notificationText: `Seu caixa continua sem o primeiro escudo contra imprevistos. O FinanceAI abriu um protocolo de blindagem para impedir que a próxima pressão vire cartão, atraso ou sufoco.`,
    toastTitle: 'Protocolo de blindagem aberto',
    toastText: `O foco agora não é a reserva ideal inteira. É construir o primeiro escudo que impede um imprevisto pequeno de romper seu caixa.`,
    actionLabel: 'Construir escudo agora'
  };
}

  if (mode === 'structural-compression' || mode === 'housing-review') {
    return {
      ...base,
      title: 'Compressão estrutural de moradia',
      notificationTitle: 'Compressão estrutural detectada',
      notificationText: `Moradia está comprimindo sua margem${concentrationPct > 0 ? ` com ${concentrationPct.toFixed(1)}% da renda comprometida` : ''}. A prioridade agora é revisar custo fixo, não gasto periférico.`,
      toastTitle: 'Revisão estrutural aberta',
      toastText: `Sua dor dominante é estrutural. O FinanceAI abriu a correção para atacar o custo que mais sufoca seu caixa hoje.`,
      actionLabel: 'Revisar moradia'
    };
  }

  if (mode === 'retention-failure' || mode === 'salary-evaporation') {
    return {
      ...base,
      title: 'Retenção em colapso',
      notificationTitle: 'Retenção insuficiente detectada',
      notificationText: `Sua retenção${savingsRate > 0 ? ` caiu para ${savingsRate.toFixed(1)}%` : ''}. O sistema abriu uma intervenção para travar vazamentos antes de o ciclo fechar sem folga.`,
      toastTitle: 'Contenção de vazamentos aberta',
      toastText: `O problema agora não é ganhar mais. É parar de deixar sua renda evaporar antes de gerar proteção.`,
      actionLabel: 'Travar vazamentos'
    };
  }

  if (mode === 'food-erosion' || mode === 'food-control') {
    return {
      ...base,
      title: 'Erosão alimentar silenciosa',
      notificationTitle: 'Erosão alimentar detectada',
      notificationText: `Alimentação variável está corroendo sua margem com baixa percepção. O FinanceAI abriu uma contenção prática para interromper essa drenagem.`,
      toastTitle: 'Contenção alimentar aberta',
      toastText: `Você não está em colapso por um gasto grande. Está perdendo força por repetição silenciosa. Abrimos a correção para cortar isso agora.`,
      actionLabel: 'Aplicar contenção'
    };
  }

  if (mode === 'recurring-drain' || mode === 'recurring-burden') {
    return {
      ...base,
      title: 'Drenagem recorrente silenciosa',
      notificationTitle: 'Drenagem recorrente detectada',
      notificationText: `Seus custos recorrentes ganharam peso estrutural. O FinanceAI abriu uma auditoria para recuperar margem e eliminar recorrências fracas.`,
      toastTitle: 'Auditoria recorrente aberta',
      toastText: `Seu caixa não está sendo ferido só por impulso. Há peso fixo silencioso drenando sua margem mês após mês.`,
      actionLabel: 'Auditar recorrências'
    };
  }

  if (projectedBalance < 0 || severity === 'critical' || score >= 75) {
    return {
      ...base,
      title: 'Janela crítica de deterioração',
      notificationTitle: 'Risco financeiro em escalada',
      notificationText: `O sistema detectou escalada de risco${score ? ` com score ${score}/100` : ''}. A intervenção aberta agora serve para cortar progressão, não apenas explicar o problema.`,
      toastTitle: 'Correção crítica aberta',
      toastText: 'Você entrou em uma janela de deterioração. O FinanceAI abriu a resposta prática para impedir agravamento do dano.',
      actionLabel: 'Executar correção'
    };
  }

  return {
    ...base,
    title: diagnosisTitle,
    notificationTitle: diagnosisTitle,
    notificationText: `O FinanceAI abriu uma microintervenção tática para agir sobre ${topCategory}. O foco agora é correção prática, não observação passiva.`,
    toastTitle: 'Microintervenção aberta',
    toastText: 'O sistema saiu do aviso genérico e abriu uma correção orientada pela sua dor dominante.',
    actionLabel: core?.actionLabel || 'Abrir correção'
  };
}
// ==========================================
// NOTIFICATIONS
// ==========================================
function addNotification(title, text, type = 'info', options = {}) {
  const notif = {
    id: genId(),
    title: title || 'Notificação',
    text: text || '',
    style: type,
    time: new Date().toISOString(),
    read: false,
    priority: options.priority || 'low',
    category: options.category || 'general',
    source: options.source || 'system',
    score: typeof options.score === 'number' ? options.score : null,
    actionLabel: options.actionLabel || '',
    actionPage: options.actionPage || ''
  };

  const alreadyExists = state.notifications.some(n =>
    n.title === notif.title &&
    n.text === notif.text &&
    (Date.now() - new Date(n.time).getTime()) < 1000 * 60 * 5
  );

  if (alreadyExists) return;

  state.notifications.unshift(notif);

  if (state.notifications.length > 50) {
    state.notifications.pop();
  }

  saveUserData();
  renderNotifications();
  updateNotifBadge();
}
function buildHistoricalAlertContext(snap) {
  const overlay = snap?.historicalOverlay || {};
  const behaviorState = snap?.behaviorState || {};
  const metrics = snap?.metrics || {};
  const patterns = snap?.patterns || {};

  const fallback = {
    hasHistoricalContext: false,
    severityBoost: 0,
    priority: null,
    relapseCopy: '',
    sabotageCopy: '',
    recoveryCopy: '',
    signatureCopy: '',
    predictivePrefix: '',
    recurrenceLabel: '',
    sourceSuffix: 'behavior-engine'
  };

  if (overlay.hasEnoughHistory !== true) {
    return fallback;
  }

  let severityBoost = 0;
  let priority = null;
  let relapseCopy = '';
  let sabotageCopy = '';
  let recoveryCopy = '';
  let signatureCopy = '';
  let predictivePrefix = '';
  let recurrenceLabel = '';

  if (overlay.recurringSabotage) {
    severityBoost += 2;
    priority = 'critical';
    sabotageCopy = ' O sistema detecta sabotagem recorrente no seu histórico, não um evento isolado.';
    predictivePrefix = 'Seu risco projetado está sendo ampliado por sabotagem recorrente.';
    recurrenceLabel = 'sabotagem_recorrente';
  }

  if (overlay.recurringRelapse) {
    severityBoost += 1;
    if (!priority) priority = 'high';
    relapseCopy = ' Seu histórico mostra melhora seguida de recaída. O problema atual tem padrão de repetição.';
    if (!predictivePrefix) {
      predictivePrefix = 'Sua projeção atual está mais sensível porque você costuma recair após sinais de melhora.';
    }
    if (!recurrenceLabel) recurrenceLabel = 'recaida_recorrente';
  }

  if (overlay.fragileRecoveryRecurring) {
    severityBoost += 1;
    if (!priority) priority = 'high';
    recoveryCopy = ' Sua recuperação recente ainda não pode ser tratada como estabilidade real.';
    if (!predictivePrefix) {
      predictivePrefix = 'Seu cenário projetado exige cuidado porque sua melhora histórica costuma ser frágil.';
    }
    if (!recurrenceLabel) recurrenceLabel = 'recuperacao_fragil_recorrente';
  }

  if (overlay.dominantHistoricalSignature && overlay.dominantHistoricalSignature !== 'insufficient_history') {
    signatureCopy = ` Assinatura histórica dominante: ${overlay.dominantHistoricalSignature.replaceAll('_', ' ')}.`;
  }

  if (
    !predictivePrefix &&
    ((overlay.historicalPressure || 0) >= 8 || (metrics.instabilityIndex || 0) >= 55 || behaviorState.trend === 'worsening')
  ) {
    predictivePrefix = 'O risco projetado está sendo reforçado por instabilidade histórica acumulada.';
  }

  return {
    hasHistoricalContext: true,
    severityBoost,
    priority,
    relapseCopy,
    sabotageCopy,
    recoveryCopy,
    signatureCopy,
    predictivePrefix,
    recurrenceLabel,
    sourceSuffix: recurrenceLabel ? `historical-${recurrenceLabel}` : 'historical-overlay',
    dominantState: overlay.dominantState || 'unknown',
    dominantPattern: overlay.dominantPattern || patterns?.dominant || 'unknown',
    recurrenceConfidence: Number(overlay.recurrenceConfidence || 0)
  };
}

function renderNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;

  const items = Array.isArray(state.notifications) ? state.notifications.slice(0, 20) : [];

  if (!items.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:14px;">Sem notificações</div>';
    return;
  }

  const priorityLabel = {
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto',
    critical: 'Crítico'
  };

  const normalizePriority = (n) => {
    if (n?.priority && priorityLabel[n.priority]) return n.priority;
    if (n?.severity && priorityLabel[n.severity]) return n.severity;
    return 'medium';
  };

  const normalizeTime = (n) => {
    if (n?.time) return n.time;
    if (n?.createdAt) return n.createdAt;
    return new Date().toISOString();
  };

  const normalizeStyle = (n, priority) => {
    if (n?.style) return n.style;
    if (priority === 'critical' || priority === 'high') return 'warning';
    if (n?.type === 'education' || n?.type === 'education_mission') return 'info';
    return 'info';
  };

  const safeText = (value) => {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  };

  list.innerHTML = items.map(raw => {
    const priority = normalizePriority(raw);
    const notifTime = normalizeTime(raw);
    const style = normalizeStyle(raw, priority);
    const title = safeText(raw?.title || 'Notificação');
    const text = safeText(raw?.text || '');
    const scoreSuffix = typeof raw?.score === 'number' ? ` · score ${raw.score}/100` : '';

    return `
      <div class="notif-item" style="align-items:flex-start;">
        <div class="notif-dot ${style}"></div>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div style="font-weight:700;font-size:13px;color:var(--text-primary);">${title}</div>
            <div style="font-size:11px;color:var(--text-muted);">${priorityLabel[priority]}</div>
          </div>
          <div class="notif-text" style="margin-top:4px;">${text}</div>
          <div class="notif-time" style="margin-top:6px;">
            ${timeAgo(notifTime)}${scoreSuffix}
          </div>
        </div>
      </div>
    `;
  }).join('');

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

function getRiskSnapshot() {
  if (!state.user) return null;

  const txs = getFilteredTx('month');
  const summary = calcSummary(txs);
  const now = new Date();
  const currentDay = now.getDate();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(1, currentDay);
  const daysRemaining = Math.max(1, lastDayOfMonth - currentDay);

  const expenses = txs.filter(t => t.type === 'expense');
  const incomes = txs.filter(t => t.type === 'income');

  const byCategory = {};
  expenses.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.value;
  });

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || null;
  const topCategoryName = topCategory ? topCategory[0] : '';
  const topCategoryValue = topCategory ? topCategory[1] : 0;

  const spentSoFar = summary.expense;
  const dailyAvgExpense = spentSoFar / daysElapsed;
  const projectedExpense = spentSoFar + (dailyAvgExpense * daysRemaining);
  const projectedBalance = summary.income - projectedExpense;

  let spendAfterIncome = 0;
  let spendAfterIncomePct = 0;

  if (incomes.length) {
    const latestIncome = [...incomes].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const incomeDate = new Date(latestIncome.date);
    const endWindow = new Date(latestIncome.date);
    endWindow.setDate(endWindow.getDate() + 5);

    spendAfterIncome = expenses
      .filter(t => {
        const d = new Date(t.date);
        return d >= incomeDate && d <= endWindow;
      })
      .reduce((sum, t) => sum + t.value, 0);

    spendAfterIncomePct = latestIncome.value > 0
      ? (spendAfterIncome / latestIncome.value) * 100
      : 0;
  }

  const limits = state.settings?.limits || {};
  const categoryRisks = Object.entries(limits).map(([category, limit]) => {
    const currentSpent = byCategory[category] || 0;
    const avg = currentSpent / daysElapsed;
    const projected = currentSpent + (avg * daysRemaining);
    return {
      category,
      limit,
      currentSpent,
      projected,
      pct: limit > 0 ? (currentSpent / limit) * 100 : 0
    };
  });

  let score = 20;

  if (summary.balance < 0) score += 35;
  else if (projectedBalance < 0) score += 25;
  else if (summary.balance <= summary.income * 0.1) score += 12;

  if (summary.savingsRate < 5) score += 20;
  else if (summary.savingsRate < 10) score += 12;
  else if (summary.savingsRate < 20) score += 6;

  if (spendAfterIncomePct >= 70) score += 18;
  else if (spendAfterIncomePct >= 50) score += 10;

  const criticalCategories = categoryRisks.filter(c => c.limit > 0 && c.projected > c.limit).length;
  score += Math.min(criticalCategories * 8, 20);

  score = Math.max(0, Math.min(100, Math.round(score)));

  const riskLevel = score >= 75 ? 'Crítico' : score >= 50 ? 'Alto' : score >= 25 ? 'Médio' : 'Baixo';

  return {
    txs,
    summary,
    byCategory,
    topCategoryName,
    topCategoryValue,
    dailyAvgExpense,
    projectedExpense,
    projectedBalance,
    spendAfterIncome,
    spendAfterIncomePct,
    categoryRisks,
    score,
    riskLevel,
    daysRemaining
  };
}

function analyzeAlertsSafe() {
  const snap = getBehaviorEngineSnapshot();
  if (!snap) return;

  const {
    summary,
    topCategoryName,
    topCategoryValue,
    score,
    riskLevel,
    behaviorState = {},
    metrics = {},
    languagePack = {}
  } = snap;

  const historical = buildHistoricalAlertContext(snap);

  const pickPriority = (basePriority) => {
    const order = { low: 1, medium: 2, high: 3, critical: 4 };
    const boosted = historical.priority || basePriority;
    return (order[boosted] || 1) > (order[basePriority] || 1) ? boosted : basePriority;
  };

  if (summary.balance < 0 && shouldTriggerAlert('saldo_negativo', 30)) {
    const text =
      `Seu mês já está negativo em ${fmt(Math.abs(summary.balance))}. Prioridade imediata: travar gastos não essenciais.` +
      historical.sabotageCopy +
      historical.relapseCopy +
      historical.signatureCopy;

    showToast('error', 'Saldo negativo', 'Seu caixa já entrou em ruptura no mês atual.');

    addNotification(
      historical.hasHistoricalContext ? 'Ruptura de caixa com memória histórica' : 'Saldo negativo',
      text,
      'error',
      {
        priority: pickPriority('critical'),
        category: 'cashflow',
        source: historical.hasHistoricalContext ? historical.sourceSuffix : 'safe-engine',
        score,
        actionLabel: 'Ver transações',
        actionPage: 'transactions'
      }
    );
  }

  if (summary.savingsRate < 10 && shouldTriggerAlert('poupanca_baixa', 60)) {
    const retentionBase =
      `Sua taxa de retenção está em ${summary.savingsRate.toFixed(1)}%. Abaixo de 10%, o caixa perde estabilidade.`;

    const retentionText =
      retentionBase +
      historical.recoveryCopy +
      historical.relapseCopy +
      historical.signatureCopy;

    addNotification(
      historical.fragileRecoveryRecurring ? 'Retenção baixa com recuperação frágil' : 'Baixa retenção',
      retentionText,
      'warning',
      {
        priority: pickPriority(summary.savingsRate < 5 ? 'high' : 'medium'),
        category: 'savings',
        source: historical.hasHistoricalContext ? historical.sourceSuffix : 'safe-engine',
        score,
        actionLabel: 'Ver análise',
        actionPage: 'ai'
      }
    );
  }

  if (topCategoryName && summary.income > 0) {
    const pct = (topCategoryValue / summary.income) * 100;

    if (pct >= 35 && shouldTriggerAlert(`categoria_top_${topCategoryName}`, 90)) {
      const concentrationText =
        `${topCategoryName} está consumindo ${pct.toFixed(0)}% da sua renda do mês. Isso reduz sua margem de segurança.` +
        (historical.dominantPattern === 'burn_after_income'
          ? ' Seu histórico sugere aceleração depois da entrada de renda.'
          : '') +
        historical.sabotageCopy +
        historical.signatureCopy;

      addNotification(
        historical.dominantPattern === 'burn_after_income'
          ? 'Concentração com aceleração histórica'
          : 'Concentração de gasto',
        concentrationText,
        'warning',
        {
          priority: pickPriority(pct >= 50 ? 'high' : 'medium'),
          category: 'category',
          source: historical.hasHistoricalContext ? historical.sourceSuffix : 'safe-engine',
          score,
          actionLabel: 'Revisar categoria',
          actionPage: 'transactions'
        }
      );
    }
  }

  if (
    (score >= 75 || behaviorState.state === 'pre_collapse' || metrics.sabotageIndex >= 70) &&
    shouldTriggerAlert('risk_score_critical', 120)
  ) {
    const riskText =
      `Seu score atual está em ${score}/100 (${riskLevel}). O sistema detectou fragilidade alta no seu caixa.` +
      ' ' +
      (languagePack.headline || '') +
      historical.sabotageCopy +
      historical.relapseCopy +
      historical.recoveryCopy +
      historical.signatureCopy;

    addNotification(
      historical.recurringSabotage
        ? 'Risco crítico com sabotagem recorrente'
        : historical.recurringRelapse
        ? 'Risco crítico com recaída recorrente'
        : 'Risco financeiro crítico',
      riskText.trim(),
      'error',
      {
        priority: pickPriority('critical'),
        category: 'risk',
        source: historical.hasHistoricalContext ? historical.sourceSuffix : 'safe-engine',
        score,
        actionLabel: 'Ver IA',
        actionPage: 'ai'
      }
    );
  }

  if (
    historical.hasHistoricalContext &&
    historical.recurrenceConfidence >= 55 &&
    shouldTriggerAlert(`historical_pattern_${historical.recurrenceLabel || 'generic'}`, 240)
  ) {
    let title = 'Padrão histórico recorrente';
    let body = 'O FinanceAI detectou repetição de padrão com impacto direto na sua estabilidade.';

    if (historical.recurrenceLabel === 'sabotagem_recorrente') {
      title = 'Sabotagem financeira recorrente';
      body = 'Seu histórico mostra repetição de sabotagem após sinais de alívio ou impulso. O risco atual precisa ser tratado como padrão recorrente.';
    } else if (historical.recurrenceLabel === 'recaida_recorrente') {
      title = 'Recaída recorrente detectada';
      body = 'Você não está apenas em atenção hoje. O sistema detectou repetição de melhora seguida de retorno ao erro.';
    } else if (historical.recurrenceLabel === 'recuperacao_fragil_recorrente') {
      title = 'Recuperação ainda não consolidada';
      body = 'Sua melhora recente ainda não é confiável. O histórico mostra recuperação frágil com chance real de regressão.';
    }

    addNotification(
      title,
      `${body} Confiança histórica: ${historical.recurrenceConfidence}%.`,
      historical.recurrenceLabel === 'sabotagem_recorrente' ? 'error' : 'warning',
      {
        priority: pickPriority(historical.recurrenceLabel === 'sabotagem_recorrente' ? 'critical' : 'high'),
        category: 'behavior',
        source: historical.sourceSuffix,
        score,
        actionLabel: 'Abrir IA',
        actionPage: 'ai'
      }
    );
  }
}
function analyzePredictiveAlerts() {
  const snap = getBehaviorEngineSnapshot();
  if (!snap) return;

  const {
    summary,
    projectedBalance,
    dailyAvgExpense,
    spendAfterIncomePct,
    categoryRisks,
    score,
    daysRemaining,
    behaviorState = {},
    metrics = {},
    languagePack = {}
  } = snap;

  const historical = buildHistoricalAlertContext(snap);

  const pickPriority = (basePriority) => {
    const order = { low: 1, medium: 2, high: 3, critical: 4 };
    const boosted = historical.priority || basePriority;
    return (order[boosted] || 1) > (order[basePriority] || 1) ? boosted : basePriority;
  };

  if (
    summary.income > 0 &&
    projectedBalance < 0 &&
    shouldTriggerAlert('predict_negative_balance', 180)
  ) {
    const daysToNegative = Math.max(
      1,
      Math.ceil((summary.income - summary.expense) / Math.max(dailyAvgExpense, 1))
    );

    const predictiveText =
      `${historical.predictivePrefix || 'Seu comportamento atual projeta deterioração do caixa.'} ` +
      `Mantido o ritmo atual, sua projeção fecha o ciclo em ${fmt(projectedBalance)} e a ruptura pode acontecer em cerca de ${daysToNegative} dia(s).` +
      historical.sabotageCopy +
      historical.relapseCopy +
      historical.signatureCopy;

    addNotification(
      historical.recurringSabotage
        ? 'Projeção crítica com sabotagem recorrente'
        : historical.recurringRelapse
        ? 'Projeção crítica com recaída recorrente'
        : 'Projeção de saldo negativo',
      predictiveText.trim(),
      'error',
      {
        priority: pickPriority('critical'),
        category: 'predictive',
        source: historical.hasHistoricalContext ? historical.sourceSuffix : 'predictive-engine',
        score,
        actionLabel: 'Agir agora',
        actionPage: 'transactions'
      }
    );
  }

  if (
    spendAfterIncomePct >= 60 &&
    shouldTriggerAlert('predict_post_income_burn', 180)
  ) {
    const postIncomeText =
      `Você já comprometeu ${spendAfterIncomePct.toFixed(0)}% da renda após a entrada de dinheiro. Isso comprime sua margem cedo demais no ciclo.` +
      (historical.dominantPattern === 'burn_after_income'
        ? ' O sistema reconhece esse padrão como recorrente no seu histórico.'
        : '') +
      historical.sabotageCopy +
      historical.signatureCopy;

    addNotification(
      historical.dominantPattern === 'burn_after_income'
        ? 'Aceleração recorrente após renda'
        : 'Aceleração após entrada de renda',
      postIncomeText,
      'warning',
      {
        priority: pickPriority(spendAfterIncomePct >= 75 ? 'high' : 'medium'),
        category: 'predictive',
        source: historical.hasHistoricalContext ? historical.sourceSuffix : 'predictive-engine',
        score,
        actionLabel: 'Rever padrão',
        actionPage: 'transactions'
      }
    );
  }

  const highRiskCategories = Object.entries(categoryRisks || {}).filter(([, value]) => value >= 70);

  if (
    highRiskCategories.length &&
    shouldTriggerAlert('predict_category_risk_cluster', 240)
  ) {
    const topNames = highRiskCategories.slice(0, 2).map(([name]) => name).join(' e ');

    addNotification(
      'Cluster de risco por categoria',
      `${topNames} concentram risco elevado no seu ciclo atual. Isso amplia a chance de pressão progressiva no restante do mês.` +
        historical.relapseCopy +
        historical.signatureCopy,
      'warning',
      {
        priority: pickPriority('medium'),
        category: 'predictive',
        source: historical.hasHistoricalContext ? historical.sourceSuffix : 'predictive-engine',
        score,
        actionLabel: 'Ver transações',
        actionPage: 'transactions'
      }
    );
  }

  if (
    behaviorState.state === 'recovery_fragile' &&
    historical.fragileRecoveryRecurring &&
    shouldTriggerAlert('predict_fragile_recovery_regression', 240)
  ) {
    addNotification(
      'Risco de regressão após melhora',
      `O sistema detecta melhora aparente, mas sua recuperação ainda é frágil e historicamente instável. Nos próximos ${Math.max(1, daysRemaining)} dia(s), o foco deve ser preservar consistência e não interpretar alívio como cura.` +
        historical.signatureCopy,
      'warning',
      {
        priority: pickPriority('high'),
        category: 'predictive',
        source: historical.sourceSuffix,
        score,
        actionLabel: 'Proteger recuperação',
        actionPage: 'dashboard'
      }
    );
  }

  if (
    (metrics.silentRiskLoad >= 60 || behaviorState.trend === 'worsening' || score >= 55) &&
    historical.hasHistoricalContext &&
    shouldTriggerAlert('predict_historical_pressure', 240)
  ) {
    addNotification(
      'Pressão histórica acumulada',
      `${historical.predictivePrefix || 'Seu histórico está reforçando o risco atual.'} O problema não está apenas no saldo do momento, mas na repetição do padrão que antecede deterioração.` +
        ' ' +
        (languagePack.body || ''),
      behaviorState.state === 'pre_collapse' ? 'error' : 'warning',
      {
        priority: pickPriority(behaviorState.state === 'pre_collapse' ? 'critical' : 'high'),
        category: 'predictive',
        source: historical.sourceSuffix,
        score,
        actionLabel: 'Abrir IA',
        actionPage: 'ai'
      }
    );
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
function recordBehaviorMemorySnapshot(snap) {
  if (!state.user || !snap) return;

  const today = fmtDate(new Date());
  const memory = Array.isArray(state.behaviorMemory) ? state.behaviorMemory : [];

  const entry = {
    date: today,
    score: Number(snap.score || 0),
    riskLevel: snap.riskLevel || 'stable',
    state: snap.behaviorState?.state || 'stable_disciplined',
    severity: snap.behaviorState?.severity || 'stable',
    trend: snap.behaviorState?.trend || 'neutral',
    dominantPattern: snap.patterns?.dominant || 'stable_control',
    sabotageIndex: Number(snap.metrics?.sabotageIndex || 0),
    consistencyIntegrity: Number(snap.metrics?.consistencyIntegrity || 0),
    recoveryFragility: Number(snap.metrics?.recoveryFragility || 0),
    postIncomeVulnerability: Number(snap.metrics?.postIncomeVulnerability || 0),
    silentRiskLoad: Number(snap.metrics?.silentRiskLoad || 0),
    projectedBalance: Number(snap.projectedBalance || 0),
    savingsRate: Number(snap.summary?.savingsRate || 0),
    balance: Number(snap.summary?.balance || 0),
    missionType: state.missionStatus?.type || 'discipline',
    missionSeverity: state.missionStatus?.severity || 'stable',
    missionCompleted: !!state.missionStatus?.completed,
    missionStatus: state.missionStatus?.status || 'pending',
    createdAt: new Date().toISOString()
  };

  const existingIndex = memory.findIndex(item => item.date === today);

  if (existingIndex >= 0) {
    memory[existingIndex] = entry;
  } else {
    memory.unshift(entry);
  }

  state.behaviorMemory = memory.slice(0, 45);
}
function analyzeBehaviorMemoryPatterns(memoryEntries = []) {
  const entries = Array.isArray(memoryEntries)
    ? memoryEntries
        .filter(item => item && typeof item === 'object')
        .slice()
        .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0))
    : [];

  const sampleSize = entries.length;

  const fallback = {
    hasEnoughHistory: false,
    sampleSize,
    recurringRelapse: false,
    fragileRecoveryRecurring: false,
    recurringSabotage: false,
    dominantHistoricalSignature: 'insufficient_history',
    dominantState: 'unknown',
    dominantPattern: 'unknown',
    stateCounts: {},
    patternCounts: {},
    riskLevelCounts: {},
    avgScore: 0,
    maxScore: 0,
    minScore: 0,
    negativeBalanceDays: 0,
    highRiskDays: 0,
    criticalDays: 0,
    improvementCycles: 0,
    relapseCount: 0,
    fragileRecoveryCount: 0,
    sabotageCount: 0,
    instabilityIndex: 0,
    recurrenceConfidence: 0,
    historicalPressure: 0,
    recentTrend: 'neutral',
    last7AvgScore: 0,
    last3AvgScore: 0,
    summaryLabel: 'Histórico insuficiente para leitura recorrente.'
  };

  if (sampleSize < 3) {
    return fallback;
  }

  const stateCounts = {};
  const patternCounts = {};
  const riskLevelCounts = {};

  let totalScore = 0;
  let maxScore = 0;
  let minScore = 100;
  let negativeBalanceDays = 0;
  let highRiskDays = 0;
  let criticalDays = 0;
  let relapseCount = 0;
  let fragileRecoveryCount = 0;
  let sabotageCount = 0;
  let improvementCycles = 0;

  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    const score = Number(item.score || 0);
    const state = item.state || 'unknown';
    const pattern = item.dominantPattern || 'unknown';
    const riskLevel = item.riskLevel || 'stable';

    totalScore += score;
    maxScore = Math.max(maxScore, score);
    minScore = Math.min(minScore, score);

    stateCounts[state] = (stateCounts[state] || 0) + 1;
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    riskLevelCounts[riskLevel] = (riskLevelCounts[riskLevel] || 0) + 1;

    if (Number(item.balance || 0) < 0 || Number(item.projectedBalance || 0) < 0) {
      negativeBalanceDays += 1;
    }

    if (score >= 60) highRiskDays += 1;
    if (score >= 80 || riskLevel === 'critical') criticalDays += 1;

    if (
      state === 'sabotage_active' ||
      pattern === 'burn_after_income' ||
      pattern === 'impulse_cluster' ||
      pattern === 'mission_resistance' ||
      Number(item.sabotageIndex || 0) >= 60
    ) {
      sabotageCount += 1;
    }

    if (
      state === 'recovery_fragile' ||
      Number(item.recoveryFragility || 0) >= 60
    ) {
      fragileRecoveryCount += 1;
    }

    const prev = entries[i - 1];
    if (prev) {
      const prevScore = Number(prev.score || 0);
      const prevState = prev.state || 'unknown';

      const hadImprovement =
        prevScore <= 35 ||
        prevState === 'recovery_fragile' ||
        prevState === 'stable_disciplined';

      const nowWorse =
        score >= 55 ||
        state === 'sabotage_active' ||
        state === 'pre_collapse';

      if (hadImprovement && nowWorse) {
        relapseCount += 1;
      }

      if (
        prevScore >= 55 &&
        score <= 35
      ) {
        improvementCycles += 1;
      }
    }
  }

  const getTopKey = (obj, fallbackValue = 'unknown') => {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || fallbackValue;
  };

  const avgScore = totalScore / sampleSize;
  const last7 = entries.slice(-7);
  const last3 = entries.slice(-3);

  const avg = arr => arr.length
    ? arr.reduce((sum, item) => sum + Number(item.score || 0), 0) / arr.length
    : 0;

  const last7AvgScore = avg(last7);
  const last3AvgScore = avg(last3);

  let recentTrend = 'neutral';
  if (last3AvgScore - last7AvgScore >= 8) recentTrend = 'worsening';
  else if (last7AvgScore - last3AvgScore >= 8) recentTrend = 'improving';

  const dominantState = getTopKey(stateCounts, 'unknown');
  const dominantPattern = getTopKey(patternCounts, 'unknown');

  let dominantHistoricalSignature = 'historical_instability';

  if (sabotageCount >= Math.ceil(sampleSize * 0.35)) {
    dominantHistoricalSignature = 'recurring_sabotage';
  } else if (fragileRecoveryCount >= Math.ceil(sampleSize * 0.30)) {
    dominantHistoricalSignature = 'fragile_recovery_loop';
  } else if (relapseCount >= 2) {
    dominantHistoricalSignature = 'relapse_cycle';
  } else if (highRiskDays >= Math.ceil(sampleSize * 0.45)) {
    dominantHistoricalSignature = 'persistent_high_risk';
  } else if (dominantState === 'stable_disciplined' && avgScore <= 30) {
    dominantHistoricalSignature = 'disciplined_recovery';
  }

  const recurringRelapse = relapseCount >= 2;
  const fragileRecoveryRecurring = fragileRecoveryCount >= Math.max(2, Math.ceil(sampleSize * 0.25));
  const recurringSabotage = sabotageCount >= Math.max(2, Math.ceil(sampleSize * 0.30));

  let historicalPressure = 0;
  if (recurringRelapse) historicalPressure += 8;
  if (fragileRecoveryRecurring) historicalPressure += 6;
  if (recurringSabotage) historicalPressure += 10;
  if (negativeBalanceDays >= Math.ceil(sampleSize * 0.25)) historicalPressure += 6;
  if (criticalDays >= Math.ceil(sampleSize * 0.20)) historicalPressure += 6;
  if (recentTrend === 'worsening') historicalPressure += 5;
  if (dominantHistoricalSignature === 'disciplined_recovery') historicalPressure -= 6;

  historicalPressure = Math.max(-8, Math.min(22, historicalPressure));

  const recurrenceConfidence = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (sampleSize * 8) +
        (relapseCount * 10) +
        (sabotageCount * 8) +
        (fragileRecoveryCount * 6)
      )
    )
  );

  let summaryLabel = 'Histórico com sinais mistos.';
  if (recurringSabotage) {
    summaryLabel = 'Histórico aponta sabotagem recorrente.';
  } else if (recurringRelapse) {
    summaryLabel = 'Histórico aponta recaída recorrente após melhora.';
  } else if (fragileRecoveryRecurring) {
    summaryLabel = 'Histórico aponta recuperação frágil e pouco confiável.';
  } else if (dominantHistoricalSignature === 'disciplined_recovery') {
    summaryLabel = 'Histórico aponta disciplina em consolidação.';
  }

  return {
    hasEnoughHistory: true,
    sampleSize,
    recurringRelapse,
    fragileRecoveryRecurring,
    recurringSabotage,
    dominantHistoricalSignature,
    dominantState,
    dominantPattern,
    stateCounts,
    patternCounts,
    riskLevelCounts,
    avgScore: Math.round(avgScore),
    maxScore,
    minScore,
    negativeBalanceDays,
    highRiskDays,
    criticalDays,
    improvementCycles,
    relapseCount,
    fragileRecoveryCount,
    sabotageCount,
    instabilityIndex: Math.max(0, Math.min(100, Math.round(avgScore + historicalPressure))),
    recurrenceConfidence,
    historicalPressure,
    recentTrend,
    last7AvgScore: Math.round(last7AvgScore),
    last3AvgScore: Math.round(last3AvgScore),
    summaryLabel
  };
}

function buildHistoricalBehaviorOverlay(currentSnapshot, memoryEntries = []) {
  const patterns = analyzeBehaviorMemoryPatterns(memoryEntries);

  const fallback = {
    enabled: false,
    hasEnoughHistory: false,
    sampleSize: patterns.sampleSize || 0,
    historicalRiskDelta: 0,
    dominantHistoricalSignature: patterns.dominantHistoricalSignature || 'insufficient_history',
    dominantState: patterns.dominantState || 'unknown',
    dominantPattern: patterns.dominantPattern || 'unknown',
    recurringRelapse: false,
    fragileRecoveryRecurring: false,
    recurringSabotage: false,
    recurrenceConfidence: 0,
    historicalPressure: 0,
    recentTrend: 'neutral',
    summaryLabel: 'Sem histórico suficiente para overlay.',
    radarEnrichment: 'sem_base_historica'
  };

  if (!currentSnapshot || !patterns.hasEnoughHistory) {
    return fallback;
  }

  let historicalRiskDelta = Number(patterns.historicalPressure || 0);

  if (
    currentSnapshot.behaviorState?.state === 'recovery_fragile' &&
    patterns.fragileRecoveryRecurring
  ) {
    historicalRiskDelta += 4;
  }

  if (
    currentSnapshot.behaviorState?.state === 'sabotage_active' &&
    patterns.recurringSabotage
  ) {
    historicalRiskDelta += 5;
  }

  if (
    currentSnapshot.score <= 35 &&
    patterns.recurringRelapse
  ) {
    historicalRiskDelta += 3;
  }

  if (
    patterns.dominantHistoricalSignature === 'disciplined_recovery' &&
    currentSnapshot.score <= 35
  ) {
    historicalRiskDelta -= 4;
  }

  historicalRiskDelta = Math.max(-8, Math.min(18, Math.round(historicalRiskDelta)));

  let radarEnrichment = 'historical_instability';
  if (patterns.recurringSabotage) {
    radarEnrichment = 'recurring_sabotage';
  } else if (patterns.recurringRelapse) {
    radarEnrichment = 'relapse_cycle';
  } else if (patterns.fragileRecoveryRecurring) {
    radarEnrichment = 'fragile_recovery';
  } else if (patterns.dominantHistoricalSignature === 'disciplined_recovery') {
    radarEnrichment = 'disciplined_recovery';
  }

  return {
    enabled: true,
    hasEnoughHistory: true,
    sampleSize: patterns.sampleSize,
    historicalRiskDelta,
    dominantHistoricalSignature: patterns.dominantHistoricalSignature,
    dominantState: patterns.dominantState,
    dominantPattern: patterns.dominantPattern,
    recurringRelapse: patterns.recurringRelapse,
    fragileRecoveryRecurring: patterns.fragileRecoveryRecurring,
    recurringSabotage: patterns.recurringSabotage,
    recurrenceConfidence: patterns.recurrenceConfidence,
    historicalPressure: patterns.historicalPressure,
    recentTrend: patterns.recentTrend,
    summaryLabel: patterns.summaryLabel,
    radarEnrichment,
    patternSummary: patterns
  };
}
function buildEducationCards() {
  ensureEducationState();

  const grid = document.getElementById('eduGrid');
  if (!grid) return;

  const statsIds = ['lessonsCompleted', 'eduStreak', 'eduPoints'];
  const hasStats = statsIds.every(id => document.getElementById(id));

  if (!hasStats) return;

  const completed = Array.isArray(state.eduProgress.completed)
    ? state.eduProgress.completed
    : [];

  state.eduProgress.completed = completed;
  state.eduProgress.streak = Number(state.eduProgress.streak || 0);
  state.eduProgress.points = Number(state.eduProgress.points || 0);
}
// ==========================================
// GLOBAL EXPOSURE (CRÍTICO)
// ==========================================
window.completeMission = completeMission;
window.skipMission = skipMission;
