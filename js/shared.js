/**
 * Ball Knowledge — Shared state & helpers
 * Loaded by every page before page-specific scripts.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'bk_state_v2';
  const ADMIN_KEY = 'bk_admin_v1';

  /* ---- helpers ---- */
  const nowISO = () => new Date().toISOString();
  const uid = (prefix = 'id') => prefix + '_' + Math.random().toString(36).slice(2, 9);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
    );
  }

  /* ---- default data ---- */
  function defaultState() {
    return {
      users: [
        { id: 'u1', username: 'Tanner', password: 'pass', createdAt: nowISO(), points: 0 },
        { id: 'u2', username: 'Blake', password: 'pass', createdAt: nowISO(), points: 0 }
      ],
      games: [
        { id: 'g1', home: 'Lions', away: 'Tigers', league: 'College', startTime: new Date(Date.now() + 3600000).toISOString(), status: 'scheduled', result: null },
        { id: 'g2', home: 'Bears', away: 'Wolves', league: 'Pro', startTime: new Date(Date.now() + 7200000).toISOString(), status: 'scheduled', result: null },
        { id: 'g3', home: 'Eagles', away: 'Hawks', league: 'College', startTime: new Date(Date.now() - 3600000).toISOString(), status: 'final', result: { winner: 'home' } },
        { id: 'g4', home: 'Sharks', away: 'Dolphins', league: 'Pro', startTime: new Date(Date.now() - 7200000).toISOString(), status: 'final', result: { winner: 'away' } }
      ],
      predictions: [],
      transactions: [],
      currentUserId: null
    };
  }

  function defaultAdmin() {
    return {
      admins: [
        { id: 'a1', username: 'admin', password: 'admin123' }
      ],
      currentAdminId: null
    };
  }

  /* ---- state persistence ---- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultState();
    } catch (e) {
      console.error('loadState error', e);
      return defaultState();
    }
  }

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function loadAdmin() {
    try {
      const raw = localStorage.getItem(ADMIN_KEY);
      return raw ? JSON.parse(raw) : defaultAdmin();
    } catch (e) {
      return defaultAdmin();
    }
  }

  function saveAdmin(a) {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(a));
  }

  /* ---- user helpers ---- */
  function getCurrentUser(state) {
    return state.currentUserId ? state.users.find(u => u.id === state.currentUserId) : null;
  }

  function findUserByUsername(state, name) {
    return state.users.find(u => u.username.toLowerCase() === (name || '').toLowerCase());
  }

  function getCurrentAdmin(admin) {
    return admin.currentAdminId ? admin.admins.find(a => a.id === admin.currentAdminId) : null;
  }

  /* ---- scoring ---- */
  function runScoring(state) {
    state.games.filter(g => g.status === 'final').forEach(g => {
      if (state.transactions.find(t => t.gameId === g.id)) return;
      const winner = g.result && g.result.winner;
      if (!winner) return;
      state.predictions.filter(p => p.gameId === g.id).forEach(p => {
        const u = state.users.find(x => x.id === p.userId);
        if (!u) return;
        const correct = p.outcome === winner;
        const points = correct ? 10 : 0;
        if (points > 0) u.points = (u.points || 0) + points;
        state.transactions.push({
          id: uid('t'), gameId: g.id, predictionId: p.id,
          userId: p.userId, points, createdAt: nowISO()
        });
      });
    });
    saveState(state);
  }

  /* ---- nav rendering ---- */
  function renderNav(activePage) {
    const state = loadState();
    const user = getCurrentUser(state);
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    const pages = [
      { href: 'index.html', label: 'Home', id: 'home' },
      { href: 'games.html', label: 'Games', id: 'games' },
      { href: 'leaderboards.html', label: 'Leaderboards', id: 'leaderboards' },
      { href: 'profile.html', label: 'Profile', id: 'profile' }
    ];

    let html = pages.map(p =>
      `<a href="${p.href}" class="nav-link${activePage === p.id ? ' active' : ''}">${p.label}</a>`
    ).join('');

    if (user) {
      html += `<span class="auth-status">Hello, <strong>${escapeHtml(user.username)}</strong></span>`;
      html += `<button id="nav-logout" style="margin-left:4px">Logout</button>`;
    } else {
      html += `<a href="login.html" class="nav-link${activePage === 'login' ? ' active' : ''}">Login</a>`;
    }

    // Admin link (subtle, always visible)
    html += `<a href="admin-login.html" class="nav-link" style="font-size:12px;color:var(--muted);margin-left:8px">Admin</a>`;

    nav.innerHTML = html;

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        state.currentUserId = null;
        saveState(state);
        window.location.href = 'index.html';
      });
    }
  }

  /* ---- expose as global ---- */
  window.BK = {
    STORAGE_KEY,
    ADMIN_KEY,
    nowISO,
    uid,
    escapeHtml,
    defaultState,
    loadState,
    saveState,
    loadAdmin,
    saveAdmin,
    getCurrentUser,
    findUserByUsername,
    getCurrentAdmin,
    runScoring,
    renderNav,
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ADMIN_KEY);
      location.reload();
    }
  };
})();
