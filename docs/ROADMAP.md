# Tört Qatar — Project Roadmap

## Done

- `7cd9152` initial commit — landing page (Kazakh Ghibli aesthetic), auth modal, hero scene, parallax
- `dee9d15` full backend + frontend — Express server, Socket.io multiplayer, Connect Four engine, game UI, leaderboard, AI Coach endpoint, vs Computer mode (minimax + alpha-beta), repo restructured (`src/` backend, `public/` frontend)
- `5e8f1ae` switched AI Coach from Anthropic Claude → Google Gemini 2.5 Pro
- deployed to Render — live at https://tort-qatar.onrender.com
- added `GEMINI_API_KEY` to Render env vars
- added live demo link + Deploy to Render button to README.md

## Next

- [ ] Rate limiting on `/api/coach/analyze` (prevent API key abuse)
- [ ] Hide chat panel in solo (vs AI) mode

## Todo

- [ ] Rate limiting on `/api/coach/analyze` (prevent API key abuse)
- [ ] Hide chat panel in solo (vs AI) mode
- [ ] Auth — replace non-functional Google/email buttons with simple username entry
- [ ] Persistent leaderboard (JSON file or Supabase) — resets on server restart now
- [ ] Timer countdown with forfeit on timeout
- [ ] Spectator mode — watch live games via room link

## Known issues

- `node_modules` must be reinstalled after clone (`npm install`)
- AI Coach requires `GEMINI_API_KEY` in `.env` — falls back to static text if missing
- Leaderboard data in-memory only — lost on server restart
- Solo mode: chat panel visible but non-functional
