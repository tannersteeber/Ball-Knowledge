document.addEventListener('DOMContentLoaded', () => {
  BK.renderNav('login');

  const state = BK.loadState();
  // If already logged in, redirect to home
  if (BK.getCurrentUser(state)) {
    window.location.href = 'index.html';
    return;
  }

  const form = document.getElementById('auth-form');
  const title = document.getElementById('auth-title');
  const toggle = document.getElementById('auth-toggle');
  const toggleText = document.getElementById('auth-toggle-text');
  const alertBox = document.getElementById('auth-alert');

  let mode = 'login';

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    mode = mode === 'login' ? 'register' : 'login';
    title.textContent = mode === 'login' ? 'Login' : 'Register';
    toggleText.textContent = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
    toggle.textContent = mode === 'login' ? 'Register here' : 'Login here';
    form.querySelector('button[type="submit"]').textContent = mode === 'login' ? 'Login' : 'Create Account';
    alertBox.innerHTML = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    alertBox.innerHTML = '';

    if (!username || !password) {
      alertBox.innerHTML = '<div class="alert alert-danger">Please fill in all fields.</div>';
      return;
    }

    const freshState = BK.loadState();

    if (mode === 'register') {
      if (BK.findUserByUsername(freshState, username)) {
        alertBox.innerHTML = '<div class="alert alert-danger">Username already taken.</div>';
        return;
      }
      const newUser = {
        id: BK.uid('u'), username, password,
        createdAt: BK.nowISO(), points: 0
      };
      freshState.users.push(newUser);
      freshState.currentUserId = newUser.id;
      BK.saveState(freshState);
      window.location.href = 'games.html';
      return;
    }

    // Login
    const found = freshState.users.find(u => u.username === username && u.password === password);
    if (!found) {
      alertBox.innerHTML = '<div class="alert alert-danger">Invalid username or password.</div>';
      return;
    }
    if (found.disabled) {
      alertBox.innerHTML = '<div class="alert alert-danger">Your account has been disabled by an admin.</div>';
      return;
    }
    freshState.currentUserId = found.id;
    BK.saveState(freshState);
    window.location.href = 'games.html';
  });
});
