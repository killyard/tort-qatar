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
- `5a1f19c` feat: reference liquid glass on side panels + board; right panel height between profile and chat
- `15c6343` fix: null refs to removed right panel elements (inlineCoachContent, tabAnalysis, btnCoachPanel) — unblocks AI game start
- `99246d8` docs: sync ROADMAP with commits 37c1e1c–15c6343
- `a9c3260` feat: 3D liquid glass chips with Kazakh ornaments + pendulum rotation — Shanyrak (P1), Koshkar Muiz (P2), rotateY(-30°↔+30°) animation
- `9484485` fix: restore missing JS functions truncated in merge (authGoogle, enterAsGuest, renderCoachInChat, openStripe, loadMiniLeaderboard)
- `c310097` fix: rebuild game.html clean — all missing functions restored + 3D chips finalised
- `c368a4a` docs: update ROADMAP with commits a9c3260–c310097
- `f06db05` feat: SVG icons replace emoji, transparent board holes, unlock 8×7/6×5 board sizes
- `0a4de39` feat: win state — purple winner chips, grey loser chips frozen; AI Coach button purple +25%
- `0d7a446` fix: restore truncated aiPlayer.js getBestMove tail — auth broken due to SyntaxError
- `2ee8284` docs: update ROADMAP with 0d7a446
- `8861fcb` fix: SyntaxError on line 1975 — single quotes in SVG innerHTML string broke auth
- `854809f` fix: dynamic board sizes (8×7/6×5 now play correctly), transparent holes, Thinking badge centered on board, AI Coach shows after first move in solo / only at game end in multiplayer
- `ad9ee0e` feat: move timeline scrubber after game end (step through moves, highlight chip, history-mode badge); fix modal X buttons; Thinking pill + status bar in same row above board

## Next

- Email/password auth (or skip — Google + guest covers 90% of users)
- Profile: save city after Google login (prompt on first entry)
- Multiplayer room invite links
- Leaderboard: real persistent DB (currently in-memory, resets on deploy)

## Todo

- Mobile responsive layout
- Sound effects (move, win, draw)
- Localization (Kazakh / Russian / English toggle)
- Board size variants (8×7, 6×5) — PRO feature
