document.addEventListener('DOMContentLoaded', () => {
  const state = BK.loadState();
  BK.runScoring(state);
  BK.renderNav('leaderboards');

  const lbList = document.getElementById('leaderboard-list');
  const yourRank = document.getElementById('your-rank');

  function renderLeaderboard(range) {
    const freshState = BK.loadState();
    let entries = freshState.users.map(u => ({
      id: u.id, username: u.username, points: u.points || 0
    }));

    if (range === 'week') {
      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
      const txByUser = {};
      freshState.transactions
        .filter(t => new Date(t.createdAt).getTime() >= weekAgo)
        .forEach(t => { txByUser[t.userId] = (txByUser[t.userId] || 0) + t.points; });
      entries = entries.map(e => ({ ...e, points: txByUser[e.id] || 0 }));
    }

    entries.sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));

    if (entries.length === 0) {
      lbList.innerHTML = '<li style="justify-content:center;color:var(--muted)">No users yet.</li>';
    } else {
      lbList.innerHTML = '';
      entries.forEach((e) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${BK.escapeHtml(e.username)}</span><strong>${e.points} pts</strong>`;
        lbList.appendChild(li);
      });
    }

    const user = BK.getCurrentUser(freshState);
    if (!user) {
      yourRank.innerHTML = '<a href="login.html">Login</a> to see your rank.';
      return;
    }
    const idx = entries.findIndex(x => x.id === user.id);
    if (idx === -1) {
      yourRank.textContent = 'You have no points yet.';
    } else {
      yourRank.textContent = `Your rank: #${idx + 1} of ${entries.length} — ${entries[idx].points} pts`;
    }
  }

  // Range toggle
  document.querySelectorAll('.lb-range').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lb-range').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLeaderboard(btn.dataset.range);
    });
  });

  renderLeaderboard('week');
});
