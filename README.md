# Tört Qatar · Connect Four on the Steppe

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

> 🎮 **Live demo:** _coming soon_ — deploy your own copy with the button above

> *"Tört Qatar" (Төрт Қатар) means "Four in a Row" in Kazakh.*

A full-stack, real-time Connect Four platform built for fast online duels — wrapped in a Kazakh Ghibli aesthetic. This is not just a game; it's a **prototype startup**: multiplayer by default, AI-coached, globally ranked, and ready to monetise.

---

## What Was Built

### Core Game
- Complete Connect Four engine with win detection (horizontal, vertical, diagonal)
- Real-time multiplayer via **WebSockets** (Socket.io) — share a room link, opponent joins instantly
- Per-player move timers, move history, and in-game chat
- Resign and rematch without reloading

### AI Coach 🧠
After each game the AI Coach (powered by **Gemini 2.5 Pro**) analyses every move and delivers:
- A one-sentence summary of the game
- 3 specific observations referencing actual column numbers
- The single most pivotal move and why
- A concrete tip for the next game

### Social Layer 🌍
- **Global leaderboard** with city-based filtering (Almaty, Astana, Shymkent…)
- Scores submitted automatically after each finished game
- Win-rate bars, rankings, and city breakdowns

### Monetisation 💳
- "**Upgrade to Pro**" button wired to a Stripe checkout endpoint
- Pro tier stub ready for: custom piece skins, game history, unlimited AI Coach analyses
- Add `STRIPE_SECRET_KEY` to `.env` to activate real payments

### Design
- **Kazakh Ghibli** aesthetic: steppe landscape hero, yurt-door auth screen, ornamental board frame
- Glassmorphism panels, parallax background, animated winning cells
- Responsive (mobile-friendly)
- Keyboard shortcuts: `1–7` to drop in a column, `Esc` to close modals

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18+, Express, Socket.io |
| Game Engine | Pure JS module (`gameEngine.js`) |
| AI Coach | Google Gemini 2.5 Pro |
| Frontend | Vanilla HTML/CSS/JS — no build step |
| Payments | Stripe (stub wired, needs key) |
| Data | In-memory + JSON (swap for Postgres/Supabase in prod) |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# → add your GEMINI_API_KEY (get one free at https://aistudio.google.com/apikey)

# 3. Start the server
npm start
# or for development (auto-restart):
npm run dev

# 4. Open in browser
open http://localhost:3000
```

The server serves the frontend statically — no separate build needed.

---

## Project Structure

```
tort-qatar/
├── server.js          ← Express + Socket.io server, REST API
├── gameEngine.js      ← Pure Connect Four logic (no I/O)
├── aiCoach.js         ← Claude-powered post-game analysis
├── package.json
├── .env.example
├── README.md
└── public/            ← Static frontend (served by Express)
    ├── index.html     ← Landing page (Kazakh Ghibli hero)
    ├── game.html      ← Main game UI
    ├── leaderboard.html
    └── assets/
        ├── hero-steppe.png
        └── auth form.png
```

---

## Roadmap (Post-MVP)

- [ ] Persistent DB (Supabase / Postgres) for leaderboard & game history
- [ ] Google OAuth (already stubbed in landing page)
- [ ] Spectator mode — watch live games
- [ ] AI opponent (minimax with alpha-beta pruning)
- [ ] Real Stripe Pro tier: custom skins, ELO rating, unlimited AI Coach
- [ ] Tournament bracket mode
- [ ] Mobile app (React Native)

---

## Why This Is Valuable

Connect Four is a solved game — but **competitive, real-time, AI-coached Connect Four with a cultural identity** is not. Tört Qatar targets:

1. **Casual duellists** who want a quick, beautiful online match without account friction
2. **Students & parents** in Kazakhstan looking for strategic skill-building games in a culturally resonant wrapper
3. **Schools & educational platforms** that want AI coaching for critical thinking

The Kazakh identity gives a defensible niche: a local product with pride of place, positioned to grow within Central Asia before expanding globally.

---

*Built with ❤ on the steppe.*
