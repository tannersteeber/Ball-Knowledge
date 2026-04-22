## Ball Knowledge

Ball Knowledge is a sports prediction platform where users vote on upcoming games, earn points for correct predictions, and compete on leaderboards.

## Project Structure

apps/client → Frontend 
apps/local

# Ball Knowledge — Static MVP

This repository now contains a static HTML/CSS/JS MVP implementation of the Ball Knowledge SRS. It's a self-contained frontend that demonstrates the core flows locally using browser storage:

- Authentication (register/login)
- Browse upcoming games
- Submit and edit predictions (locked at game start)
- Demo scoring engine and transactions
- Weekly & all-time leaderboards
- Profile and prediction history

Files added
- `index.html` — main single-page UI
- `css/styles.css` — simple styling
- `js/app.js` — client logic, in-memory + localStorage state

How to run
Open `index.html` in your browser. No server required.

Notes and limitations
- This is a static demo using `localStorage` and seeded mock data. It's not a production backend.
- Passwords are stored in plain text in localStorage for the demo only. Do not use real credentials.
- External sports provider integration and push notifications are not included.

Next steps (if you want to continue)
- Add a backend (Node/Express + database) to persist users, games, predictions, and transactions.
- Integrate a real sports data provider for schedules and results.
- Replace plaintext passwords with proper hashing and authentication (JWT/session).

If you want, I can now scaffold a Node + SQLite backend and wire the static frontend to it. Tell me which stack you prefer or if the static demo is sufficient for now.
