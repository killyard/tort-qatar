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
- `49e253e` feat: Chat/Analysis tabs, Steppe Bot AI persona, proactive chat on key moves
- `b2783c5` feat: liquid glass UI, guest name required, IP city detect, chat widget, profile modal, Start Game button
- `d43c45b` fix: restore game.html from git after truncation, fix guest login JS error
- `7efa9a1` feat: remove right panel — AI Coach analysis in chat, P2 mini-bar, unified chat widget
- `8afd6e5` feat: liquid glass fix — true translucency + or divider in auth forms
- `ebe1b61` fix: chat widget collapse to header-only, chevron direction, board + forms liquid glass rework
- `90ece67` feat: 3-col layout — move history right panel, piece/board customization left panel, PRO upgrade pill
- `065db54` feat: reference liquid glass — blur(6px) saturate(150%), ::before 135deg blik, inset inner shadow
- `a5dcbed` feat: Google OAuth — passport + express-session, /auth/google routes, session check on load
- `37c1e1c` fix: ESM import for passport-google-oauth20 (CJS pkg, use default import)
- `445159b` fix: guard Google OAuth strategy init behind env var check — server starts without credentials
- `6c16b6d` fix: trust proxy for session cookies on Render + credentials:include on /api/me
- `b856d7e` fix: session.save() before OAuth redirect + freeipapi.com for city detect + Google prompt=select_account
- `5a1f19c` feat: re