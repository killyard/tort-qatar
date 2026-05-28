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
- `a700840` fix: restore X button original float:right style, keep z-index fix
- `85067c1` fix: board frame color distinct from page bg, visible hole rim
- `5362645` feat: timeline drag+touch scrub, styled thumb, gradient fill bar
- `760eb6b` fix: status-row aligned to board width via board-col wrapper, stronger hole rim
- `9e79dff` fix: SVG mask overlay for transparent holes, timeline mark colors match chips
- `c2a53d9` feat: points & streak scoring system + leaderboard guide block
- `dc4ab36` fix: inline SVG board holes + remove timeline mark dots
- `d222cab` feat: PostgreSQL + Redis persistence — db.js, cache.js, server.js wired up
- `c88f9cb` style: replace index.html hero image with game.html canvas background
- `2441d96` feat: persist player points — localStorage + server restore on page load
- `fb28cba` fix: full game-state reset on board-size change — clears chips, game-over class, timeline, locks board
- `18f2574` feat: mid-game AI Coach (Flash), post-game analysis (Pro), dual timer layout
- `8ec530d` fix: remove X close buttons from New Game + Profile modals, match profile modal style
- `1654f73` fix: board overlay cleared on size change, NGM defaults to Medium, leaderboard shows pts, chat aligned to right panel, profile modal restyle + close X re-added
- `d69e13d` fix: restore truncated DOMContentLoaded tail — auth + guest login broken
- `c49e6e2` fix: clear stale board frame overlay on size change so old hole pattern doesn't stretch over new grid
- `9447436` fix: multiplayer P2 can move — mirror server status into gameStarted in renderState (gate isMyTurn correctly for both clients)
- `eda904f` feat: mobile responsive overhaul — page scrolls, sticky bottom action footer with Start/controls, full-width chat collapsed by default, aspect-ratio cells, breakpoints 900/600/420
- `f744991` docs: add missing hashes d69e13d, c49e6e2, replace pending with 9447436, eda904f
- `295ce23` feat: realtime leaderboard update (Socket.io emit) + game.html lb/ref tabs + index.html mini leaderboard
- `a18bb8b` fix: wire index.html handleAuth + restore truncated tails in index.html and game.html
- `79ceb6a` fix: remove duplicate trailing tail in index.html (post-a18bb8b cleanup)
- `7c69877` fix: remove duplicate loadMiniLeaderboard + disable AI Coach in multiplayer (fairness)
- `677136d` feat: leaderboard shows one row per unique player — server-side dedupe by name+city + aggregated SUM query + stable client-side player id
- `f06541a` feat(pvp): left panel always shows local player — name/city/points/wins/moves/timer/turn-dot all map to ME regardless of host/joiner
- `cf5e99b` fix: remove duplicate tail in server.js — Render SyntaxError at line 654 (35 dup lines)
- `c724160` docs: update ROADMAP with cf5e99b
- `35e1f86` fix: remove duplicate tail in db.js — was blocking import with 'Illegal return statement' at module top level (Render fell back to old deploy without GROUP BY)

## Next

- Email/password auth (or skip — Google + guest covers 90% of users)
- Profile: save city after Google login (prompt on first entry)
- Multiplayer room invite links
- Leaderboard: DATABASE_URL set on Render — PostgreSQL persistence active

## Todo

- Mobile responsive layout
- Sound effects (move, win, draw)
- Localization (Kazakh / Russian / English toggle)
- Board size variants (8×7, 6×5) — PRO feature
