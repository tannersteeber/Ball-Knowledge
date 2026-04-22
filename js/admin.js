/**
 * Ball Knowledge — Admin Panel Logic
 * All changes persist to localStorage and are reflected across all pages.
 */
(function () {
  'use strict';

  /* ---- guard: must be logged-in admin ---- */
  const admin = BK.loadAdmin();
  if (!BK.getCurrentAdmin(admin)) {
    window.location.href = 'admin-login.html';
    return;
  }

  /* ---- state ---- */
  let state = BK.loadState();

  function persist() {
    BK.saveState(state);
  }

  function flash(msg, type) {
    const el = document.getElementById('admin-alert');
    if (!el) return;
    el.innerHTML = '<div class="alert alert-' + type + '">' + BK.escapeHtml(msg) + '</div>';
    setTimeout(function () { el.innerHTML = ''; }, 4000);
  }

  /* ==================================================
   * GAMES
   * ================================================== */

  function renderGames() {
    const tbody = document.getElementById('games-table-body');
    if (!tbody) return;
    state = BK.loadState();
    var games = state.games || [];

    if (games.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">No games yet.</td></tr>';
      return;
    }

    var sorted = games.slice().sort(function (a, b) {
      var order = { scheduled: 0, final: 1 };
      var oa = order[a.status] !== undefined ? order[a.status] : 1;
      var ob = order[b.status] !== undefined ? order[b.status] : 1;
      if (oa !== ob) return oa - ob;
      return new Date(a.startTime) - new Date(b.startTime);
    });

    tbody.innerHTML = sorted.map(function (g) {
      var start = new Date(g.startTime).toLocaleString();
      var statusClass = g.status === 'final' ? 'final' : 'scheduled';
      var statusLabel = g.status.charAt(0).toUpperCase() + g.status.slice(1);

      var resultText = '';
      if (g.status === 'final' && g.result) {
        var winnerName = g.result.winner === 'home' ? g.home : g.away;
        resultText = ' — <strong style="color:var(--success)">' + BK.escapeHtml(winnerName) + ' wins</strong>';
      }

      var actions = '';
      if (g.status === 'scheduled') {
        actions += '<button class="btn btn-warning" style="padding:4px 10px;font-size:12px" data-finalize="' + g.id + '" data-winner="home">Home Wins</button> ';
        actions += '<button class="btn btn-warning" style="padding:4px 10px;font-size:12px" data-finalize="' + g.id + '" data-winner="away">Away Wins</button> ';
        actions += '<button class="btn btn-danger" style="padding:4px 10px;font-size:12px" data-delete-game="' + g.id + '">Delete</button>';
      } else {
        actions += '<span style="color:var(--muted);font-size:12px">Completed</span>';
      }

      return '<tr>'
        + '<td>' + BK.escapeHtml(g.home) + ' vs ' + BK.escapeHtml(g.away) + resultText + '</td>'
        + '<td>' + BK.escapeHtml(g.league || '') + '</td>'
        + '<td style="font-size:12px">' + start + '</td>'
        + '<td><span class="game-status ' + statusClass + '">' + statusLabel + '</span></td>'
        + '<td style="white-space:nowrap">' + actions + '</td>'
        + '</tr>';
    }).join('');
  }

  /* ---- add game ---- */
  document.getElementById('add-game-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var home = document.getElementById('g-home').value.trim();
    var away = document.getElementById('g-away').value.trim();
    var league = document.getElementById('g-league').value.trim();
    var timeVal = document.getElementById('g-time').value;

    if (!home || !away || !league || !timeVal) {
      flash('Please fill in all fields.', 'danger');
      return;
    }

    state = BK.loadState();
    state.games.push({
      id: BK.uid('game'),
      home: home,
      away: away,
      league: league,
      startTime: new Date(timeVal).toISOString(),
      status: 'scheduled',
      result: null
    });
    persist();
    this.reset();
    flash('Game added: ' + home + ' vs ' + away, 'success');
    renderGames();
  });

  /* ---- finalize game ---- */
  function finalizeGame(gameId, winner) {
    state = BK.loadState();
    var game = state.games.find(function (g) { return g.id === gameId; });
    if (!game) { flash('Game not found.', 'danger'); return; }
    if (game.status === 'final') { flash('Game already finalized.', 'danger'); return; }

    game.status = 'final';
    game.result = { winner: winner };

    // Score predictions for this game
    var preds = (state.predictions || []).filter(function (p) { return p.gameId === game.id; });
    // Only score if no transactions exist for this game yet
    var alreadyScored = (state.transactions || []).some(function (t) { return t.gameId === game.id; });

    if (!alreadyScored) {
      preds.forEach(function (p) {
        var user = state.users.find(function (u) { return u.id === p.userId; });
        if (!user) return;
        var correct = p.outcome === winner;
        var points = correct ? 10 : 0;
        if (points > 0) user.points = (user.points || 0) + points;
        if (!state.transactions) state.transactions = [];
        state.transactions.push({
          id: BK.uid('t'),
          gameId: game.id,
          predictionId: p.id,
          userId: p.userId,
          points: points,
          createdAt: BK.nowISO()
        });
      });
    }

    persist();
    var winnerName = winner === 'home' ? game.home : game.away;
    flash('Game finalized: ' + game.home + ' vs ' + game.away + ' — ' + winnerName + ' wins! (' + preds.length + ' prediction(s) scored)', 'success');
    renderGames();
    renderUsers();
  }

  /* ---- delete game ---- */
  function deleteGame(gameId) {
    if (!confirm('Delete this game? All predictions for it will also be removed.')) return;
    state = BK.loadState();
    state.games = state.games.filter(function (g) { return g.id !== gameId; });
    state.predictions = (state.predictions || []).filter(function (p) { return p.gameId !== gameId; });
    state.transactions = (state.transactions || []).filter(function (t) { return t.gameId !== gameId; });
    persist();
    flash('Game deleted.', 'success');
    renderGames();
  }

  /* ---- games table click delegation ---- */
  document.getElementById('games-table-body').addEventListener('click', function (e) {
    var finalizeBtn = e.target.closest('[data-finalize]');
    if (finalizeBtn) {
      finalizeGame(finalizeBtn.getAttribute('data-finalize'), finalizeBtn.getAttribute('data-winner'));
      return;
    }
    var delBtn = e.target.closest('[data-delete-game]');
    if (delBtn) {
      deleteGame(delBtn.getAttribute('data-delete-game'));
    }
  });

  /* ==================================================
   * USERS
   * ================================================== */

  function renderUsers() {
    var tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    state = BK.loadState();
    var users = state.users || [];

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">No users yet.</td></tr>';
      return;
    }

    var sorted = users.slice().sort(function (a, b) { return (b.points || 0) - (a.points || 0); });

    tbody.innerHTML = sorted.map(function (u) {
      var predCount = (state.predictions || []).filter(function (p) { return p.userId === u.id; }).length;
      var joined = new Date(u.createdAt).toLocaleDateString();
      var disabled = u.disabled ? true : false;

      var actions = '';
      if (disabled) {
        actions += '<button class="btn btn-success" style="padding:4px 10px;font-size:12px" data-enable-user="' + u.id + '">Enable</button> ';
      } else {
        actions += '<button class="btn btn-danger" style="padding:4px 10px;font-size:12px" data-disable-user="' + u.id + '">Disable</button> ';
      }
      actions += '<button class="btn btn-danger" style="padding:4px 10px;font-size:12px" data-delete-user="' + u.id + '">Delete</button> ';
      actions += '<button class="btn btn-warning" style="padding:4px 10px;font-size:12px" data-reset-user="' + u.id + '">Reset Stats</button>';

      var statusIcon = disabled ? ' <span style="color:var(--danger)">🚫</span>' : '';

      return '<tr>'
        + '<td>' + BK.escapeHtml(u.username) + statusIcon + '</td>'
        + '<td>' + (u.points || 0) + ' pts</td>'
        + '<td>' + predCount + '</td>'
        + '<td style="font-size:12px">' + joined + '</td>'
        + '<td style="white-space:nowrap">' + actions + '</td>'
        + '</tr>';
    }).join('');
  }

  function disableUser(userId) {
    state = BK.loadState();
    var user = state.users.find(function (u) { return u.id === userId; });
    if (!user) return;
    user.disabled = true;
    if (state.currentUserId === userId) state.currentUserId = null;
    persist();
    flash('User "' + user.username + '" disabled. They can no longer log in.', 'success');
    renderUsers();
  }

  function enableUser(userId) {
    state = BK.loadState();
    var user = state.users.find(function (u) { return u.id === userId; });
    if (!user) return;
    user.disabled = false;
    persist();
    flash('User "' + user.username + '" enabled.', 'success');
    renderUsers();
  }

  function deleteUser(userId) {
    state = BK.loadState();
    var user = state.users.find(function (u) { return u.id === userId; });
    if (!user) return;
    if (!confirm('Delete user "' + user.username + '"? This removes all their data.')) return;

    if (state.currentUserId === userId) state.currentUserId = null;
    state.users = state.users.filter(function (u) { return u.id !== userId; });
    state.predictions = (state.predictions || []).filter(function (p) { return p.userId !== userId; });
    state.transactions = (state.transactions || []).filter(function (t) { return t.userId !== userId; });
    persist();
    flash('User "' + user.username + '" deleted.', 'success');
    renderUsers();
  }

  function resetUserStats(userId) {
    state = BK.loadState();
    var user = state.users.find(function (u) { return u.id === userId; });
    if (!user) return;
    if (!confirm('Reset all stats for "' + user.username + '"? Points and prediction history will be cleared.')) return;

    user.points = 0;
    state.predictions = (state.predictions || []).filter(function (p) { return p.userId !== userId; });
    state.transactions = (state.transactions || []).filter(function (t) { return t.userId !== userId; });
    persist();
    flash('Stats reset for "' + user.username + '".', 'success');
    renderUsers();
  }

  /* ---- users table click delegation ---- */
  document.getElementById('users-table-body').addEventListener('click', function (e) {
    var btn;
    btn = e.target.closest('[data-disable-user]');
    if (btn) { disableUser(btn.getAttribute('data-disable-user')); return; }
    btn = e.target.closest('[data-enable-user]');
    if (btn) { enableUser(btn.getAttribute('data-enable-user')); return; }
    btn = e.target.closest('[data-delete-user]');
    if (btn) { deleteUser(btn.getAttribute('data-delete-user')); return; }
    btn = e.target.closest('[data-reset-user]');
    if (btn) { resetUserStats(btn.getAttribute('data-reset-user')); return; }
  });

  /* ==================================================
   * DATA CONTROLS
   * ================================================== */

  /* ---- seed a final result ---- */
  document.getElementById('btn-seed').addEventListener('click', function () {
    state = BK.loadState();
    var scheduled = state.games.filter(function (g) { return g.status === 'scheduled'; });
    if (scheduled.length === 0) {
      flash('No scheduled games to finalize. Add a game first.', 'danger');
      return;
    }
    var game = scheduled[0];
    var winner = Math.random() < 0.5 ? 'home' : 'away';
    finalizeGame(game.id, winner);
  });

  /* ---- re-run scoring ---- */
  document.getElementById('btn-rescore').addEventListener('click', function () {
    state = BK.loadState();

    // Reset all user points
    state.users.forEach(function (u) { u.points = 0; });
    // Clear all transactions
    state.transactions = [];

    // Re-score every final game
    state.games.filter(function (g) { return g.status === 'final' && g.result; }).forEach(function (game) {
      var winner = game.result.winner;
      if (!winner) return;
      (state.predictions || []).filter(function (p) { return p.gameId === game.id; }).forEach(function (p) {
        var user = state.users.find(function (u) { return u.id === p.userId; });
        if (!user) return;
        var correct = p.outcome === winner;
        var points = correct ? 10 : 0;
        if (points > 0) user.points = (user.points || 0) + points;
        state.transactions.push({
          id: BK.uid('t'),
          gameId: game.id,
          predictionId: p.id,
          userId: p.userId,
          points: points,
          createdAt: BK.nowISO()
        });
      });
    });

    persist();
    flash('Scoring re-run. All user points recalculated from scratch.', 'success');
    renderGames();
    renderUsers();
  });

  /* ---- reset all data ---- */
  document.getElementById('btn-reset').addEventListener('click', function () {
    if (!confirm('⚠️ This will delete ALL data (users, games, predictions, scores). Are you sure?')) return;
    if (!confirm('This CANNOT be undone. Last chance — proceed?')) return;

    state = BK.defaultState();
    BK.saveState(state);
    flash('All data has been reset to defaults.', 'success');
    renderGames();
    renderUsers();
  });

  /* ==================================================
   * ADMIN LOGOUT
   * ================================================== */
  document.getElementById('admin-logout').addEventListener('click', function () {
    var a = BK.loadAdmin();
    a.currentAdminId = null;
    BK.saveAdmin(a);
    window.location.href = 'admin-login.html';
  });

  /* ==================================================
   * INIT
   * ================================================== */
  renderGames();
  renderUsers();

})();
