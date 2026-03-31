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
  missionStatus: {
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

function getPremiumRiskActionPlan(snap) {
  if (!snap) {
    return {
      title: 'Sem dados suficientes',
      summary: 'Adicione transações para o FinanceAI montar sua leitura de risco.',
      masterAlert: 'Ainda não há base suficiente para um alerta mestre.',
      action: 'Registrar receitas e despesas do mês atual.',
      objective: 'Criar consistência de dados para leitura inteligente.',
      primaryLabel: 'Ir para transações',
      primaryPage: 'transactions',
      secondaryLabel: 'Abrir IA',
      secondaryPage: 'ai'
    };
  }

  const {
    summary,
    score,
    riskLevel,
    projectedBalance,
    dailyAvgExpense,
    spendAfterIncomePct,
    topCategoryName,
    topCategoryValue,
    categoryRisks
  } = snap;

  const topProjectedRisk = (categoryRisks || [])
    .filter(item => item.limit > 0 && item.projected > item.limit)
    .sort((a, b) => (b.projected - b.limit) - (a.projected - a.limit))[0] || null;

  if (score >= 75 && projectedBalance < 0) {
    const deficit = Math.abs(projectedBalance);
    const cutTarget = Math.max(50, Math.ceil(deficit / 10) * 10);

    return {
      title: 'Seu risco financeiro está crítico',
      summary: `Seu score atual está em ${score}/100 (${riskLevel}) e o sistema projeta pressão severa no caixa se o ritmo atual continuar.`,
      masterAlert: `Você pode entrar no negativo ainda neste mês. O foco agora é preservar caixa imediatamente.`,
      action: `Reduza pelo menos ${fmt(cutTarget)} em gastos variáveis hoje, priorizando ${topCategoryName || 'categorias não essenciais'}.`,
      objective: 'Ganhar fôlego de caixa e evitar ruptura até o fechamento do mês.',
      primaryLabel: 'Cortar gastos agora',
      primaryPage: 'transactions',
      secondaryLabel: 'Ver IA',
      secondaryPage: 'ai'
    };
  }

  if (spendAfterIncomePct >= 60) {
    const cutTarget = Math.max(40, Math.ceil((summary.income * 0.1) / 10) * 10);

    return {
      title: 'Sua renda está queimando rápido demais',
      summary: `Você já comprometeu ${spendAfterIncomePct.toFixed(0)}% da última entrada de renda nos primeiros dias.`,
      masterAlert: 'O padrão indica consumo acelerado logo após receber, o que aumenta risco de sufoco no fim do mês.',
      action: `Trave novas despesas variáveis por 48 horas e reduza pelo menos ${fmt(cutTarget)} em compras impulsivas.`,
      objective: 'Quebrar o padrão de aceleração pós-recebimento.',
      primaryLabel: 'Revisar transações',
      primaryPage: 'transactions',
      secondaryLabel: 'Abrir IA',
      secondaryPage: 'ai'
    };
  }

  if (topProjectedRisk) {
    const excess = Math.max(0, topProjectedRisk.projected - topProjectedRisk.limit);

    return {
      title: 'Um limite importante está em rota de estouro',
      summary: `${topProjectedRisk.category} está projetada acima do limite definido para este mês.`,
      masterAlert: `A projeção atual para ${topProjectedRisk.category} está acima do teto em cerca de ${fmt(excess)}.`,
      action: `Ajuste imediatamente a categoria ${topProjectedRisk.category} ou reduza essa despesa antes que ela comprima sua margem.`,
      objective: 'Evitar que uma única categoria desorganize o orçamento.',
      primaryLabel: 'Ver limites',
      primaryPage: 'settings',
      secondaryLabel: 'Revisar transações',
      secondaryPage: 'transactions'
    };
  }

  if (summary.savingsRate < 10) {
    const recovery = Math.max(30, Math.ceil((summary.income * 0.08) / 10) * 10);

    return {
      title: 'Sua retenção está abaixo do ideal',
      summary: `A taxa de retenção atual é ${summary.savingsRate.toFixed(1)}%, abaixo da faixa mínima de estabilidade.`,
      masterAlert: 'Sem retenção suficiente, qualquer imprevisto pressiona seu caixa e trava evolução patrimonial.',
      action: `Preserve pelo menos ${fmt(recovery)} ainda neste ciclo e reduza despesas variáveis para recuperar margem.`,
      objective: 'Subir a retenção e reconstruir controle financeiro.',
      primaryLabel: 'Ver análise',
      primaryPage: 'ai',
      secondaryLabel: 'Ir para transações',
      secondaryPage: 'transactions'
    };
  }

  return {
    title: 'Seu risco financeiro está sob controle',
    summary: `Seu score atual está em ${score}/100 (${riskLevel}) e o sistema não detectou ruptura imediata de caixa.`,
    masterAlert: 'No momento, o principal objetivo é manter consistência e evitar relaxamento operacional.',
    action: 'Continue monitorando categorias dominantes e mantenha disciplina nas despesas variáveis.',
    objective: 'Transformar estabilidade em crescimento previsível.',
    primaryLabel: 'Abrir análise',
    primaryPage: 'ai',
    secondaryLabel: 'Ver metas',
    secondaryPage: 'goals'
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

  if (!titleEl || !summaryEl || !scoreEl || !levelEl || !masterAlertEl || !actionEl || !objectiveEl || !primaryBtn || !secondaryBtn) {
    return;
  }

  const snap = getBehaviorEngineSnapshot();
  const plan = getPremiumRiskActionPlan(snap);

  titleEl.textContent = plan.title;
  summaryEl.textContent = plan.summary;
  masterAlertEl.textContent = plan.masterAlert;
  actionEl.textContent = plan.action;
  objectiveEl.textContent = plan.objective;

  if (snap) {
    scoreEl.textContent = `${snap.score}/100`;
    levelEl.textContent = `Risco ${snap.riskLevel}`;

    const levelColor =
      snap.score >= 75 ? '#ef4444' :
      snap.score >= 50 ? '#f59e0b' :
      snap.score >= 25 ? '#facc15' :
      '#10b981';

    levelEl.style.color = levelColor;
    scoreEl.style.color = levelColor;
  } else {
    scoreEl.textContent = '--/100';
    levelEl.textContent = 'Sem leitura';
    levelEl.style.color = '#94a3b8';
    scoreEl.style.color = 'var(--text-primary)';
  }

  primaryBtn.textContent = plan.primaryLabel;
  secondaryBtn.textContent = plan.secondaryLabel;

primaryBtn.onclick = () => navigate(plan.primaryPage || 'transactions');
secondaryBtn.onclick = () => navigate(plan.secondaryPage || 'ai');
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

function ensureMissionV3State(snap) {
  if (!state.user) return;

  const txs = getFilteredTx('month');
  const summary = calcSummary(txs);

  const income = summary.income || 0;
  const expenses = summary.expenses || 0;
  const balance = summary.balance || 0;

  const score = snap?.score || 0;
  const commitment = income > 0 ? (expenses / income) : 0;

  let mission = {
    type: 'discipline',
    severity: 'stable',
    title: 'Controle financeiro ativo',
    text: 'Mantenha disciplina e evite excessos.',
    target: 100
  };

  // 🔴 CRÍTICO
  if (balance < 0 || score >= 80) {
    mission = {
      type: 'containment',
      severity: 'critical',
      title: 'INTERRUPÇÃO IMEDIATA DE RISCO',
      text: 'Seu caixa entrou em zona de colapso. Interrompa gastos imediatamente.',
      target: Math.abs(balance) + 100
    };
  }

  // 🟠 ALTO
  else if (score >= 60 || commitment >= 0.9) {
    mission = {
      type: 'containment',
      severity: 'containment',
      title: 'CONTENÇÃO URGENTE',
      text: 'Seu padrão atual está pressionando seu caixa.',
      target: Math.round(income * 0.2)
    };
  }

  // 🟡 MÉDIO (TESTE B)
  else if (score >= 40 || commitment >= 0.7) {
    mission = {
      type: 'discipline',
      severity: 'pressure',
      title: 'CONTROLE DE ACELERAÇÃO',
      text: 'Você está consumindo sua renda rápido demais após receber.',
      target: 100
    };
  }

  // 🟢 BAIXO
  else if (score >= 20) {
    mission = {
      type: 'growth',
      severity: 'stable',
      title: 'ESTABILIDADE FINANCEIRA',
      text: 'Continue mantendo controle e consistência.',
      target: 50
    };
  }

  // 🟢 IDEAL
  else {
    mission = {
      type: 'growth',
      severity: 'stable',
      title: 'EXPANSÃO CONTROLADA',
      text: 'Seu financeiro está saudável. Foque em crescer.',
      target: 0
    };
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  state.missionStatus = {
    ...state.missionStatus,
    ...mission,
    date: todayISO,
    status: 'active',
    current: mission.target,
    completed: false
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

return {
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
  const snap = typeof getRiskSnapshot === 'function' ? getRiskSnapshot() : null;

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

  textEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div style="font-size:13px;font-weight:800;letter-spacing:0.02em;color:${severity === 'critical' ? '#fca5a5' : severity === 'containment' ? '#fcd34d' : '#a5b4fc'};text-transform:uppercase;">
        ${missionTitle}
      </div>
      <div style="font-size:15px;line-height:1.6;color:var(--text-primary);">
        ${missionText}
      </div>
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
renderDailyMission();
renderPremiumRiskCard();
analyzeAlertsSafe();
analyzePredictiveAlerts();
   
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
      desc: `Seu maior centro de gasto está consumindo uma parte relevante da sua renda.`,
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

function renderNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;

  const items = state.notifications.slice(0, 20);

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

  list.innerHTML = items.map(n => `
    <div class="notif-item" style="align-items:flex-start;">
      <div class="notif-dot ${n.style}"></div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div style="font-weight:700;font-size:13px;color:var(--text-primary);">${n.title || 'Notificação'}</div>
          <div style="font-size:11px;color:var(--text-muted);">${priorityLabel[n.priority] || 'Baixo'}</div>
        </div>
        <div class="notif-text" style="margin-top:4px;">${n.text}</div>
        <div class="notif-time" style="margin-top:6px;">
          ${timeAgo(n.time)}${typeof n.score === 'number' ? ` · score ${n.score}/100` : ''}
        </div>
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

  const { summary, topCategoryName, topCategoryValue, score, riskLevel } = snap;

  if (summary.balance < 0 && shouldTriggerAlert('saldo_negativo', 30)) {
    showToast('error', 'Saldo negativo', 'Suas despesas já superaram sua receita neste mês.');

    addNotification(
      'Saldo negativo',
      `Seu mês já está negativo em ${fmt(Math.abs(summary.balance))}. Prioridade imediata: travar gastos não essenciais.`,
      'error',
      {
        priority: 'critical',
        category: 'cashflow',
        source: 'safe-engine',
        score,
        actionLabel: 'Ver transações',
        actionPage: 'transactions'
      }
    );
  }

  if (summary.savingsRate < 10 && shouldTriggerAlert('poupanca_baixa', 60)) {
    addNotification(
      'Baixa retenção',
      `Sua taxa de retenção está em ${summary.savingsRate.toFixed(1)}%. Abaixo de 10%, o caixa perde estabilidade.`,
      'warning',
      {
        priority: summary.savingsRate < 5 ? 'high' : 'medium',
        category: 'savings',
        source: 'safe-engine',
        score,
        actionLabel: 'Ver análise',
        actionPage: 'ai'
      }
    );
  }

  if (topCategoryName && summary.income > 0) {
    const pct = (topCategoryValue / summary.income) * 100;

    if (pct >= 35 && shouldTriggerAlert(`categoria_top_${topCategoryName}`, 90)) {
      addNotification(
        'Concentração de gasto',
        `${topCategoryName} está consumindo ${pct.toFixed(0)}% da sua renda do mês. Isso reduz sua margem de segurança.`,
        'warning',
        {
          priority: pct >= 50 ? 'high' : 'medium',
          category: 'category',
          source: 'safe-engine',
          score,
          actionLabel: 'Revisar categoria',
          actionPage: 'transactions'
        }
      );
    }
  }

  if (score >= 75 && shouldTriggerAlert('risk_score_critical', 120)) {
    addNotification(
      'Risco financeiro crítico',
      `Seu score atual está em ${score}/100 (${riskLevel}). O sistema detectou fragilidade alta no seu caixa.`,
      'error',
      {
        priority: 'critical',
        category: 'risk',
        source: 'safe-engine',
        score,
        actionLabel: 'Ver IA',
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
    daysRemaining
  } = snap;

  if (
    summary.income > 0 &&
    projectedBalance < 0 &&
    shouldTriggerAlert('predict_negative_balance', 180)
  ) {
    const daysToNegative = Math.max(
      1,
      Math.ceil((summary.income - summary.expense) / Math.max(dailyAvgExpense, 1))
    );

    addNotification(
      'Risco de entrar no negativo',
      `Se o ritmo atual continuar, seu caixa pode ficar negativo em cerca de ${daysToNegative} dia(s).`,
      'error',
      {
        priority: 'critical',
        category: 'predictive',
        source: 'predictive-engine',
        score,
        actionLabel: 'Ajustar agora',
        actionPage: 'transactions'
      }
    );

    showToast(
      'error',
      'Projeção crítica',
      `Mantido o ritmo atual, você pode entrar no negativo em ${daysToNegative} dia(s).`
    );
  }

  categoryRisks.forEach(item => {
    if (!item.limit || item.currentSpent <= 0) return;

    if (
      item.projected > item.limit &&
      shouldTriggerAlert(`predict_limit_${item.category}`, 240)
    ) {
      const categoryDailyAvg = item.currentSpent / Math.max(1, new Date().getDate());
      const remainingToLimit = Math.max(0, item.limit - item.currentSpent);
      const daysToLimit = categoryDailyAvg > 0
        ? Math.max(1, Math.ceil(remainingToLimit / categoryDailyAvg))
        : daysRemaining;

      addNotification(
        'Estouro de limite previsto',
        `${item.category} pode ultrapassar o limite em cerca de ${daysToLimit} dia(s). Projeção: ${fmt(item.projected)} para um limite de ${fmt(item.limit)}.`,
        'warning',
        {
          priority: item.pct >= 90 ? 'high' : 'medium',
          category: 'predictive-limit',
          source: 'predictive-engine',
          score,
          actionLabel: 'Ver limites',
          actionPage: 'settings'
        }
      );
    }
  });

  if (
    spendAfterIncomePct >= 60 &&
    shouldTriggerAlert('predict_salary_burn', 240)
  ) {
    addNotification(
      'Queima acelerada da renda',
      `Você já comprometeu ${spendAfterIncomePct.toFixed(0)}% da última entrada de renda nos primeiros dias. Esse padrão aumenta risco de sufoco no fim do mês.`,
      'warning',
      {
        priority: spendAfterIncomePct >= 75 ? 'critical' : 'high',
        category: 'behavior',
        source: 'predictive-engine',
        score,
        actionLabel: 'Rever padrão',
        actionPage: 'transactions'
      }
    );
  }

  if (
    dailyAvgExpense > 0 &&
    summary.balance > 0 &&
    (summary.balance / dailyAvgExpense) <= 7 &&
    shouldTriggerAlert('predict_runway_short', 300)
  ) {
    const runwayDays = Math.max(1, Math.floor(summary.balance / dailyAvgExpense));

    addNotification(
      'Fôlego curto de caixa',
      `No ritmo atual, seu saldo disponível cobre aproximadamente ${runwayDays} dia(s).`,
      'warning',
      {
        priority: runwayDays <= 3 ? 'critical' : 'high',
        category: 'runway',
        source: 'predictive-engine',
        score,
        actionLabel: 'Ver dashboard',
        actionPage: 'dashboard'
      }
    );
  }
}
// ==========================================
// ALERT CON2960TROL SYSTEM (FASE 2)
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
function buildEducationCards() {
  // função placeholder para evitar erro
}
// ==========================================
// GLOBAL EXPOSURE (CRÍTICO)
// ==========================================
window.completeMission = completeMission;
window.skipMission = skipMission;
