# Tört Qatar — Project Roadmap

## Done

- `7cd9152` initial commit — landing page (Kazakh Ghibli aesthetic), auth modal, hero scene, parallax
- `dee9d15` full backend + frontend — Express server, Socket.io multiplayer, Connect Four engine, game UI, leaderboard, AI Coach endpoint, vs Computer mode (minimax + alpha-beta), repo restructured (`src/` backend, `public/` frontend)
- `5e8f1ae` switched AI Coach from Anthropic Claude → Google Gemini 2.5 Pro
- `a5687bc` chore: add render.yaml + fix README for Render deploy — live at https://tort-qatar.onrender.com
- `86e286a` docs: add live demo URL to README + update ROADMAP
- `bc9b46b` feat: AI Coach — chronological analysis, missed-win detection, smart move highlight
- `11526a8` feat: AI Coach — structured step-by-step analysis prompt, optional smartMove
- `bf31164` feat: solo mode — inline AI Coach panel replaces chat, auto-analysis on game end
- `f85ca10` fix: AI Coach — pre-compute missed wins/blocks via game engine, inject as verified facts
- `91d3d33` docs: sync ROADMAP with commit hashes, clean up todo/done sections
- `c3aaced` feat: wider panels, richer move history (col/row/name), manual-only AI Coach
- `49e253e` feat: Chat/Analysis tabs, Steppe Bot AI persona, proactive chat on key moments, Pro gate stub
- `d50903e` docs: update ROADMAP with 49e253e
- `0876333` feat: switch Steppe Bot chat to Groq llama-3.1-8b-instant
- `0eb2065` feat: language picker in lobby (EN/RU/KK), Steppe Bot respects selected language
- `7eaeffa` feat: lobby UI refresh — unified tab-group style for Language/Mode/Difficulty

## Next

- [ ] Rate limiting on `/api/coach/analyze` (prevent API key abuse)
- [ ] Auth — replace non-functional Google/email buttons with simple username entry
- [ ] Persistent leaderboard (JSON file or Supabase) — resets on server restart now

## Todo

- [ ] Timer countdown with forfeit on timeout
- [ ] Spectator mode — watch live games via room link

## Known issues

- `node_modules` must be reinstalled after clone (`npm install`)
- AI Coach requires `GEMINI_API_KEY` in `.env` — falls back to static text if missing
- Leaderboard data in-memory only — lost on server restart
