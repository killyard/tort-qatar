# Project Notes for Claude

## Environment

- **Shell**: PowerShell (Windows) — use PowerShell syntax for any terminal commands, not bash
  - Path separator: `\` (backslash)
  - Copy command: `Copy-Item`, not `cp`
  - Environment variables: `$env:VAR`, not `export VAR=`
  - Example start: `npm start` (already in the project folder — do NOT `cd` into it again)

## Project

- **Name**: Tört Qatar (Төрт Қатар) — Connect Four on the Steppe
- **Stack**: Node.js + Express + Socket.io (backend), Vanilla HTML/CSS/JS (frontend)
- **Entry point**: `server.js` — starts HTTP + WebSocket server on port 3000
- **Frontend**: served as static files from `public/`
- **Start**: `npm start` or `npm run dev` (auto-restart)
