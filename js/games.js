document.addEventListener('DOMContentLoaded', () => {
  const state = BK.loadState();
  BK.runScoring(state);
  BK.renderNav('games');

  const gamesList = document.getElementById('games-list');
  const filterLeague = document.getElementById('filter-league');
  const filterStatus = document.getElementById('filter-status');
  const gameModal = document.getElementById('game-modal');
  const gameTitle = document.getElementById('game-title');
  const gameDetails = document.getElementById('game-details');
  const predictForm = document.getElementById('predict-form');
  const predictNote = document.getElementById('predict-note');
  const closeBtn = document.getElementById('close-game-modal');

  function renderGames() {
    const freshState = BK.loadState();
    const league = filterLeague.value.toLowerCase();
    const status = filterStatus.value;

    let list = freshState.games.filter(g => g.home && g.away);
    if (league) list = list.filter(g => (g.league || '').toLowerCase().includes(league));
    if (status) list = list.filter(g => g.status === status);
    list.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    if (list.length === 0) {
      gamesList.innerHTML = '<li style="justify-content:center;color:var(--muted)">No games found.</li>';
      return;
    }

    gamesList.innerHTML = '';
    list.forEach(g => {
      const li = document.createElement('li');
      li.className = 'game-row';

      const statusClass = g.status === 'final' ? 'final' : 'scheduled';
      li.innerHTML = `
        <div class="game-info">
          <strong>${BK.escapeHtml(g.home)} vs ${BK.escapeHtml(g.away)}</strong>
          <div class="game-meta">
            ${BK.escapeHtml(g.league || 'N/A')} &bull; ${new Date(g.startTime).toLocaleString()}
            <span class="game-status ${statusClass}">${g.status}</span>
          </div>
        </div>`;

      const btn = document.createElement('button');
      btn.textContent = 'Details';
      btn.addEventListener('click', () => openGameModal(g.id));
      li.appendChild(btn);
      gamesList.appendChild(li);
    });
  }

  function openGameModal(gameId) {
    const freshState = BK.loadState();
    const g = freshState.games.find(x => x.id === gameId);
    if (!g) return;

    gameModal.classList.remove('hidden');
    gameTitle.textContent = `${g.home} vs ${g.away}`;

    let resultHtml = '';
    if (g.status === 'final' && g.result) {
      resultHtml = `<br>Result: <strong style="color:var(--success)">${g.result.winner === 'home' ? g.home : g.away} wins</strong>`;
    }

    gameDetails.innerHTML = `
      League: <strong>${BK.escapeHtml(g.league || 'N/A')}</strong><br>
      Start: <small>${new Date(g.startTime).toLocaleString()}</small><br>
      Status: <em>${g.status}</em>${resultHtml}`;

    predictNote.textContent = '';
    predictForm.querySelectorAll('[name="outcome"]').forEach(r => { r.checked = false; });
    predictForm.querySelectorAll('input,button').forEach(i => { i.disabled = false; });

    const user = BK.getCurrentUser(freshState);
    const now = new Date();
    const lock = new Date(g.startTime);
    const existing = freshState.predictions.find(p => p.userId === (user && user.id) && p.gameId === g.id);

    if (!user) {
      predictNote.innerHTML = 'You must <a href="login.html">log in</a> to make a prediction.';
      predictForm.querySelectorAll('input,button').forEach(i => { i.disabled = true; });
    } else if (g.status !== 'scheduled') {
      predictNote.textContent = 'This game has ended. Predictions are closed.';
      predictForm.querySelectorAll('input,button').forEach(i => { i.disabled = true; });
      if (existing) {
        const r = predictForm.querySelector(`input[value="${existing.outcome}"]`);
        if (r) r.checked = true;
        predictNote.textContent += ` You predicted: ${existing.outcome}.`;
      }
    } else if (now >= lock) {
      predictNote.textContent = 'This game is locked. Predictions closed at start time.';
      predictForm.querySelectorAll('input,button').forEach(i => { i.disabled = true; });
    } else if (existing) {
      predictNote.textContent = `Your current prediction: ${existing.outcome}. You can change it.`;
      const r = predictForm.querySelector(`input[value="${existing.outcome}"]`);
      if (r) r.checked = true;
    }

    predictForm.dataset.gameId = g.id;
  }

  closeBtn.addEventListener('click', () => gameModal.classList.add('hidden'));
  gameModal.addEventListener('click', (e) => {
    if (e.target === gameModal) gameModal.classList.add('hidden');
  });

  predictForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const freshState = BK.loadState();
    const user = BK.getCurrentUser(freshState);
    if (!user) { window.location.href = 'login.html'; return; }

    const gid = predictForm.dataset.gameId;
    const g = freshState.games.find(x => x.id === gid);
    if (!g) return;
    if (new Date() >= new Date(g.startTime)) { alert('Game is locked.'); return; }

    const sel = predictForm.querySelector('[name="outcome"]:checked');
    if (!sel) { alert('Please pick Home or Away.'); return; }

    const val = sel.value;
    const existing = freshState.predictions.find(p => p.userId === user.id && p.gameId === gid);
    if (existing) {
      existing.outcome = val;
      existing.updatedAt = BK.nowISO();
    } else {
      freshState.predictions.push({
        id: BK.uid('p'), userId: user.id, gameId: gid,
        outcome: val, createdAt: BK.nowISO()
      });
    }
    BK.saveState(freshState);
    gameModal.classList.add('hidden');
    renderGames();
  });

  filterLeague.addEventListener('input', renderGames);
  filterStatus.addEventListener('change', renderGames);

  renderGames();
});
