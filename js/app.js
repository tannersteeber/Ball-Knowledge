const STORAGE_KEY = 'bk_state_v1';

// small helpers
const nowISO = () => new Date().toISOString();
const uid = (prefix = 'id') => prefix + Math.random().toString(36).slice(2, 9);

function defaultState() {
  const users = [
    { id: 'u1', username: 'alice', password: 'pass', createdAt: nowISO(), points: 0 },
    { id: 'u2', username: 'bob', password: 'pass', createdAt: nowISO(), points: 0 }
  ];
  const games = [
    { id: 'g1', providerId: 'p1', home: 'Lions', away: 'Tigers', league: 'College', startTime: new Date(Date.now() + 3600 * 1000).toISOString(), status: 'scheduled', result: null },
    { id: 'g2', providerId: 'p2', home: 'Hawks', away: 'Eagles', league: 'Pro', startTime: new Date(Date.now() + 7200 * 1000).toISOString(), status: 'scheduled', result: null },
    { id: 'g3', providerId: 'p3', home: 'Bears', away: 'Wolves', league: 'Pro', startTime: new Date(Date.now() - 3600 * 1000).toISOString(), status: 'final', result: { winner: 'home' } }
  ];
  return { users, games, predictions: [], transactions: [], currentUserId: null };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return JSON.parse(raw); } catch (e) { return defaultState(); }
}
function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

let state = loadState();
const findUserByUsername = (u) => state.users.find(x => x.username.toLowerCase() === u.toLowerCase());
const getCurrentUser = () => state.users.find(u => u.id === state.currentUserId) || null;

// All DOM wiring happens on DOMContentLoaded to avoid races
document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  const gamesList = document.getElementById('games-list');
  const authArea = document.getElementById('auth-area');
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authToggle = document.getElementById('auth-toggle');
  const navGames = document.getElementById('nav-games');
  const navLB = document.getElementById('nav-leaderboard');
  const navProfile = document.getElementById('nav-profile');
  const gamesSection = document.getElementById('games-section');
  const lbSection = document.getElementById('leaderboard-section');
  const profileSection = document.getElementById('profile-section');
  const gameModal = document.getElementById('game-modal');
  const gameTitle = document.getElementById('game-title');
  const gameDetails = document.getElementById('game-details');
  const predictForm = document.getElementById('predict-form');
  const predictNote = document.getElementById('predict-note');
  const closeGameModalBtn = document.getElementById('close-game-modal');
  const seedResultsBtn = document.getElementById('seed-results');
  const lbList = document.getElementById('leaderboard-list');
  const yourRank = document.getElementById('your-rank');
  const profileArea = document.getElementById('profile-area');

  // ensure homepage shows and modals are hidden on first paint
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  gamesSection.classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));

  // navigation
  navGames.addEventListener('click', () => showPage('games'));
  navLB.addEventListener('click', () => showPage('leaderboard'));
  navProfile.addEventListener('click', () => showPage('profile'));
  function showPage(p) {
    gamesSection.classList.toggle('hidden', p !== 'games');
    lbSection.classList.toggle('hidden', p !== 'leaderboard');
    profileSection.classList.toggle('hidden', p !== 'profile');
  }

  // auth
  function renderAuthArea() {
    const user = getCurrentUser();
    if (user) {
      authArea.innerHTML = `Hello, <strong>${user.username}</strong> <button id="logout">Logout</button>`;
      document.getElementById('logout').addEventListener('click', () => { state.currentUserId = null; saveState(state); renderAll(); });
    } else {
      authArea.innerHTML = `<button id="login">Login / Register</button>`;
      document.getElementById('login').addEventListener('click', () => openAuth('login'));
    }
  }

  let authMode = 'login';
  function openAuth(mode = 'login') {
    authMode = mode;
    authTitle.textContent = mode === 'login' ? 'Login' : 'Register';
    authToggle.textContent = mode === 'login' ? 'Switch to Register' : 'Switch to Login';
    authModal.classList.remove('hidden');
  }
  authToggle.addEventListener('click', () => openAuth(authMode === 'login' ? 'register' : 'login'));

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = authForm.querySelector('#username').value.trim();
    const p = authForm.querySelector('#password').value;
    if (authMode === 'register') {
      if (findUserByUsername(u)) { alert('Username taken'); return; }
      const user = { id: uid('u'), username: u, password: p, createdAt: nowISO(), points: 0 };
      state.users.push(user);
      state.currentUserId = user.id;
      saveState(state);
      authModal.classList.add('hidden');
      renderAll();
      return;
    }
    const user = state.users.find(x => x.username === u && x.password === p);
    if (!user) { alert('Invalid credentials'); return; }
    state.currentUserId = user.id; saveState(state); authModal.classList.add('hidden'); renderAll();
  });

  // games list
  function renderGames(filter = '') {
    gamesList.innerHTML = '';
    const list = state.games.filter(g => g.startTime && g.home && g.away)
      .filter(g => !filter || g.league.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    list.forEach(g => {
      const li = document.createElement('li');
      li.className = 'game-row';
      const left = document.createElement('div');
      left.innerHTML = `<strong>${g.home} vs ${g.away}</strong><div class="game-meta">${g.league} • ${new Date(g.startTime).toLocaleString()} • ${g.status}</div>`;
      const right = document.createElement('div');
      const btn = document.createElement('button'); btn.textContent = 'Details'; btn.addEventListener('click', () => openGameModal(g.id));
      right.appendChild(btn);
      li.appendChild(left); li.appendChild(right); gamesList.appendChild(li);
    });
  }

  function openGameModal(gameId) {
    const g = state.games.find(x => x.id === gameId); if (!g) return;
    gameModal.classList.remove('hidden');
    gameTitle.textContent = `${g.home} vs ${g.away}`;
    gameDetails.innerHTML = `League: <strong>${g.league}</strong><br>Start: <small>${new Date(g.startTime).toLocaleString()}</small><br>Status: <em>${g.status}</em>`;
    predictNote.textContent = '';
    const user = getCurrentUser();
    const lockTime = new Date(g.startTime);
    const now = new Date();
    predictForm.querySelectorAll('[name="outcome"]').forEach(r => r.checked = false);
    predictForm.querySelectorAll('input,button').forEach(i => i.disabled = false);
    const existing = state.predictions.find(p => p.userId === state.currentUserId && p.gameId === g.id);
    if (!user) {
      predictNote.textContent = 'You must log in to predict.';
      predictForm.querySelectorAll('input,button').forEach(i => i.disabled = true);
    } else if (g.status !== 'scheduled') {
      predictNote.textContent = 'Predictions closed — game not scheduled.';
      predictForm.querySelectorAll('input,button').forEach(i => i.disabled = true);
    } else if (now >= lockTime) {
      predictNote.textContent = 'Game locked — no more edits.';
      predictForm.querySelectorAll('input,button').forEach(i => i.disabled = true);
    } else {
      if (existing) {
        predictNote.textContent = `You predicted: ${existing.outcome}. You can edit until lock.`;
        const radio = predictForm.querySelector(`input[value="${existing.outcome}"]`);
        if (radio) radio.checked = true;
      }
    }
    predictForm.dataset.gameId = g.id;
  }
  closeGameModalBtn.addEventListener('click', () => gameModal.classList.add('hidden'));

  predictForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = getCurrentUser(); if (!user) { alert('Login required'); return; }
    const gid = predictForm.dataset.gameId; const g = state.games.find(x => x.id === gid);
    if (!g) return; if (new Date() >= new Date(g.startTime)) { alert('Locked'); return; }
    const outcome = predictForm.querySelector('[name="outcome"]:checked'); if (!outcome) { alert('Pick an outcome'); return; }
    const val = outcome.value;
    const existing = state.predictions.find(p => p.userId === user.id && p.gameId === gid);
    if (existing) { existing.outcome = val; existing.updatedAt = nowISO(); } else { state.predictions.push({ id: uid('p'), userId: user.id, gameId: gid, outcome: val, createdAt: nowISO() }); }
    saveState(state); renderAll(); gameModal.classList.add('hidden');
  });

  // scoring: award points when a game becomes final (idempotent via transactions)
  function runScoring() {
    state.games.filter(g => g.status === 'final').forEach(g => {
      const already = state.transactions.find(t => t.gameId === g.id);
      if (already) return;
      const winner = g.result && g.result.winner; if (!winner) return;
      const preds = state.predictions.filter(p => p.gameId === g.id);
      preds.forEach(p => {
        const user = state.users.find(u => u.id === p.userId); if (!user) return;
        const correct = p.outcome === winner; const points = correct ? 10 : 0; if (points > 0) { user.points = (user.points || 0) + points; }
        state.transactions.push({ id: uid('t'), gameId: g.id, predictionId: p.id, userId: user.id, points, createdAt: nowISO() });
      });
    });
    saveState(state);
  }

  // leaderboard
  document.querySelectorAll('.lb-range').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.lb-range').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderLeaderboard(btn.dataset.range); }));

  function renderLeaderboard(range = 'week') {
    lbList.innerHTML = '';
    let entries = state.users.map(u => ({ id: u.id, username: u.username, points: u.points || 0, createdAt: u.createdAt }));
    if (range === 'week') {
      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000; const txByUser = {};
      state.transactions.filter(t => new Date(t.createdAt).getTime() >= weekAgo).forEach(t => txByUser[t.userId] = (txByUser[t.userId] || 0) + t.points);
      entries = entries.map(e => ({ ...e, points: txByUser[e.id] || 0 }));
    }
    entries.sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));
    entries.forEach((e, i) => { const li = document.createElement('li'); li.textContent = `${i + 1}. ${e.username}`; const s = document.createElement('span'); s.textContent = `${e.points} pts`; li.appendChild(s); lbList.appendChild(li); });
    const current = getCurrentUser(); if (!current) { yourRank.textContent = 'Login to see your rank.'; return; }
    const idx = entries.findIndex(x => x.id === current.id); yourRank.textContent = idx === -1 ? 'You have no points yet.' : `Your rank: ${idx + 1} / ${entries.length} — ${entries[idx].points} pts`;
  }

  function renderProfile() {
    const user = getCurrentUser(); if (!user) { profileArea.innerHTML = '<em>Not logged in</em>'; return; }
    const preds = state.predictions.filter(p => p.userId === user.id).map(p => { const g = state.games.find(x => x.id === p.gameId); return `<li>${g.home} vs ${g.away} — ${p.outcome} <small>${p.createdAt}</small></li>`; }).join('');
    profileArea.innerHTML = `<div class="profile-row"><strong>${user.username}</strong><div>${user.points || 0} pts</div></div><h4>Predictions</h4><ul>${preds || '<li>None</li>'}</ul>`;
  }

  seedResultsBtn.addEventListener('click', () => {
    const g = state.games.find(x => x.status === 'scheduled'); if (!g) { alert('No scheduled game to finalize'); return; }
    g.status = 'final'; g.result = { winner: Math.random() > 0.5 ? 'home' : 'away' }; saveState(state); runScoring(); renderAll(); alert('Seeded final result for ' + g.home + ' vs ' + g.away);
  });

  function renderAll() { renderAuthArea(); renderGames(document.getElementById('filter-league').value || ''); renderLeaderboard(document.querySelector('.lb-range.active')?.dataset.range || 'week'); renderProfile(); }

  document.getElementById('filter-league').addEventListener('input', e => renderGames(e.target.value));

  runScoring(); renderAll();

  // developer helper
  window._bk = { state, save: () => saveState(state), reset: () => { localStorage.removeItem(STORAGE_KEY); state = defaultState(); saveState(state); location.reload(); } };
});
