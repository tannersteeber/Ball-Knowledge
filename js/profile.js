document.addEventListener('DOMContentLoaded', () => {
  const state = BK.loadState();
  BK.runScoring(state);
  BK.renderNav('profile');

  const content = document.getElementById('profile-content');
  const user = BK.getCurrentUser(state);

  if (!user) {
    content.innerHTML = `
      <div class="card" style="text-align:center;padding:48px">
        <h2>Not Logged In</h2>
        <p style="color:var(--muted);margin-bottom:20px">Please log in to view your profile.</p>
        <a href="login.html" class="btn btn-primary">Login</a>
      </div>`;
    return;
  }

  const preds = state.predictions.filter(p => p.userId === user.id);
  const correctCount = state.transactions.filter(t => t.userId === user.id && t.points > 0).length;
  const totalScored = state.transactions.filter(t => t.userId === user.id).length;
  const accuracy = totalScored > 0 ? Math.round((correctCount / totalScored) * 100) : 0;

  let predsHtml = '';
  if (preds.length === 0) {
    predsHtml = '<li style="justify-content:center;color:var(--muted)">No predictions yet. <a href="games.html">Make one!</a></li>';
  } else {
    predsHtml = preds.map(p => {
      const g = state.games.find(x => x.id === p.gameId);
      if (!g) return '';
      const tx = state.transactions.find(t => t.predictionId === p.id);
      let resultBadge = '';
      if (g.status === 'final' && tx) {
        resultBadge = tx.points > 0
          ? '<span class="game-status final">✓ Correct (+10)</span>'
          : '<span class="game-status" style="background:rgba(239,68,68,0.15);color:var(--danger)">✗ Wrong</span>';
      } else if (g.status === 'scheduled') {
        resultBadge = '<span class="game-status scheduled">Pending</span>';
      }
      return `<li>
        <div>
          <strong>${BK.escapeHtml(g.home)} vs ${BK.escapeHtml(g.away)}</strong>
          <div class="game-meta">Picked: ${p.outcome} &bull; ${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
        ${resultBadge}
      </li>`;
    }).join('');
  }

  content.innerHTML = `
    <div class="card">
      <div class="profile-header">
        <h2>${BK.escapeHtml(user.username)}</h2>
        <small>Joined ${new Date(user.createdAt).toLocaleDateString()}</small>
      </div>
      <div class="stats-grid">
        <div class="profile-stat">
          <div class="num">${user.points || 0}</div>
          <div class="label">Total Points</div>
        </div>
        <div class="profile-stat">
          <div class="num">${preds.length}</div>
          <div class="label">Predictions</div>
        </div>
        <div class="profile-stat">
          <div class="num">${accuracy}%</div>
          <div class="label">Accuracy</div>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Prediction History</h2>
      <ul class="list">${predsHtml}</ul>
    </div>`;
});
