// ── Tört Qatar — Backend Server ───────────────────────────────────────────────
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  isDbEnabled, runMigrations,
  recordGame, getLeaderboardFromDB, getCitiesFromDB,
} from './db.js';
import {
  isCacheEnabled, lbSync, lbSeedFromDB, lbTop, getCitiesFromCache,
} from './cache.js';
import cors from 'cors';
import { createBoard, dropPiece, checkWinner, isDraw, findThreats, formatMoveHistory } from './gameEngine.js';
import { analyzeGame, suggestMove } from './aiCoach.js';
import { getChatReply } from './aiChat.js';
import { getGeminiMove } from './geminiPlayer.js';
import session from 'express-session';
import passport from 'passport';
import passportGoogle from 'passport-google-oauth20';
const { Strategy: GoogleStrategy } = passportGoogle;

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// ── Express ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// ── Session + Passport ──────────────────────────────────────────────────────
app.set('trust proxy', 1); // Render sits behind a proxy
app.use(session({
  secret: process.env.SESSION_SECRET || 'tort-qatar-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: !!process.env.BASE_URL, // true on Render (BASE_URL set), false locally
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// Serialize/deserialize user (store full user object in session for simplicity)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Google OAuth strategy — only register if credentials are present
const GOOGLE_ENABLED = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (GOOGLE_ENABLED) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  (process.env.BASE_URL || 'http://localhost:3000') + '/auth/google/callback',
      scope: ['profile', 'email'],
    },
    (_accessToken, _refreshToken, profile, done) => {
      const user = {
        id:       'google_' + profile.id,
        name:     profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || 'Guest',
        email:    profile.emails?.[0]?.value || '',
        avatar:   profile.photos?.[0]?.value || '',
        city:     '',
        provider: 'google',
      };
      done(null, user);
    }
  ));
} else {
  console.warn('[Auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth disabled');
}

// ── Auth routes ─────────────────────────────────────────────────────────────
app.get('/auth/google', (req, res, next) => {
  if (!GOOGLE_ENABLED) return res.redirect('/game.html?auth=error&reason=no_credentials');
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  if (!GOOGLE_ENABLED) return res.redirect('/game.html?auth=error');
  passport.authenticate('google', { failureRedirect: '/game.html?auth=error' })(req, res, next);
}, (req, res) => {
  res.redirect('/game.html?auth=google');
});

app.get('/auth/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect('/game.html'));
  });
});

// Current session user
app.get('/api/me', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'not authenticated' });
  }
});

// ── In-memory stores ───────────────────────────────────────────────────────
/** @type {Map<string, GameRoom>} roomId → room */
const rooms = new Map();

// ── Leaderboard — JSON file fallback (used when DATABASE_URL is not set) ───
const LB_PATH = join(__dirname, '../data/leaderboard.json');

function loadLeaderboard() {
  try {
    if (existsSync(LB_PATH)) return JSON.parse(readFileSync(LB_PATH, 'utf8'));
  } catch (e) { console.warn('[LB] load error', e.message); }
  return [];
}

function saveLeaderboard() {
  try {
    const dir = join(__dirname, '../data');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(LB_PATH, JSON.stringify(leaderboard, null, 2), 'utf8');
  } catch (e) { console.warn('[LB] save error', e.message); }
}

/** In-memory leaderboard — only used when DATABASE_URL is not configured */
let leaderboard = isDbEnabled() ? [] : loadLeaderboard();

/**
 * Points awarded for a WIN by game type / difficulty.
 *   pvp        = vs real human player
 *   ai/easy    = vs Easy bot
 *   ai/medium  = vs Medium bot
 *   ai/hard    = vs Hard bot
 *   ai/gemini  = vs Gemini AI
 * Everyone earns 2 pts just for playing (even a loss/draw).
 * Draws give 5 pts flat (no streak).
 */
const WIN_POINTS = {
  pvp:          20,
  'ai/easy':    10,
  'ai/medium':  15,
  'ai/hard':    25,
  'ai/gemini':  35,
};

/** Streak bonus added ON TOP of the win points. */
function streakBonus(streak) {
  if (streak >= 5) return 20;
  if (streak === 4) return 15;
  if (streak === 3) return 10;
  if (streak === 2) return 5;
  return 0;
}

function recalcRanksLocal() {
  leaderboard.sort((a, b) => b.points - a.points || b.winRate - a.winRate);
  leaderboard.forEach((e, i) => { e.rank = i + 1; });
  saveLeaderboard();
}

// ── REST API ───────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

// Get leaderboard (optionally filtered by city)
app.get('/api/leaderboard', async (req, res) => {
  const { city, limit = 50 } = req.query;
  try {
    if (isDbEnabled()) {
      // 1. Try Redis (fast path)
      const cached = await lbTop({ limit: Number(limit), city: city || undefined });
      if (cached && cached.length > 0) return res.json(cached);
      // 2. Fall back to PostgreSQL
      const rows = await getLeaderboardFromDB({ city: city || undefined, limit: Number(limit) });
      return res.json(rows);
    }
    // 3. Local JSON file fallback
    let data = leaderboard;
    if (city) data = data.filter(e => e.city.toLowerCase() === city.toLowerCase());
    return res.json(data.slice(0, Number(limit)));
  } catch (err) {
    console.error('[LB] GET error:', err.message);
    res.status(500).json({ error: 'leaderboard unavailable' });
  }
});

// Get unique cities
app.get('/api/leaderboard/cities', async (_req, res) => {
  try {
    if (isDbEnabled()) {
      const fromCache = await getCitiesFromCache();
      if (fromCache) return res.json(fromCache);
      const fromDB = await getCitiesFromDB();
      return res.json(fromDB);
    }
    const cities = [...new Set(leaderboard.map(e => e.city))].sort();
    return res.json(cities);
  } catch (err) {
    console.error('[LB] cities error:', err.message);
    res.json([]);
  }
});

// Register / update player score (called after game ends)
// Body: { id?, name, city, won, draw?, gameType: 'pvp'|'ai', difficulty?: 'easy'|'medium'|'hard'|'gemini' }
app.post('/api/leaderboard/score', async (req, res) => {
  const { id, name, city, won, draw = false, gameType = 'pvp', difficulty = '' } = req.body;
  if (!name || !city) return res.status(400).json({ error: 'name and city required' });

  const isWin = !!won && !draw;
  let earned  = 2; // default participation; overwritten below per path

  try {
    if (isDbEnabled()) {
      // ── DB + Redis path ───────────────────────────────────────────────────
      const playerId = id || uuidv4();
      const gameKey  = gameType === 'pvp' ? 'pvp' : `ai/${difficulty}`;
      const { scoreRow, pointsEarned } = await recordGame({
        id: playerId, name, city,
        won: isWin, draw, gameType: gameKey,
      });
      earned = pointsEarned;
      // Sync to Redis
      const lbEntry = {
        id: playerId, name, city,
        gamesPlayed: scoreRow.games_played,
        wins:        scoreRow.wins,
        points:      scoreRow.points,
        winStreak:   scoreRow.win_streak,
        winRate:     scoreRow.win_rate,
      };
      await lbSync(lbEntry);
      return res.json({ ...lbEntry, rank: 0, pointsEarned: earned });
    }

    // ── Local JSON file path ──────────────────────────────────────────────
    let entry = leaderboard.find(e => e.name === name && e.city === city);
    if (!entry) {
      entry = { id: id || uuidv4(), name, city, wins: 0, gamesPlayed: 0, winRate: 0, points: 0, winStreak: 0, rank: 0 };
      leaderboard.push(entry);
    }

    if (draw) {
      entry.winStreak = 0;
      earned = 5;
    } else if (won) {
      entry.wins += 1;
      entry.winStreak = (entry.winStreak || 0) + 1;
      const key = gameType === 'pvp' ? 'pvp' : `ai/${difficulty}`;
      const base = WIN_POINTS[key] ?? WIN_POINTS['ai/medium'];
      earned = base + streakBonus(entry.winStreak);
    } else {
      entry.winStreak = 0;
    }

    entry.gamesPlayed += 1;
    entry.points = (entry.points || 0) + earned;
    entry.winRate = Math.round((entry.wins / entry.gamesPlayed) * 100);
    recalcRanksLocal();
    return res.json({ ...entry, pointsEarned: earned });

  } catch (err) {
    console.error('[LB] score error:', err.message);
    res.status(500).json({ error: 'score update failed' });
  }
});

// ── Chat rate limiter (simple in-memory: 30 req / 10 min per IP) ──────────────
const chatRateMap = new Map(); // ip → { count, resetAt }
function checkChatRate(ip) {
  const now = Date.now();
  const entry = chatRateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    chatRateMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

// ── PRO_GATE — set to true to enforce subscription check ────────────────────
// Currently false for testing; flip to true in production
const PRO_GATE = false;

// AI Chat endpoint
app.post('/api/chat', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
  if (!checkChatRate(ip)) return res.status(429).json({ error: 'Too many messages. Try again later.' });

  const { trigger, userMessage, gameContext, isPro } = req.body;

  // Pro gate (soft-check — real auth would verify server-side session)
  if (PRO_GATE && !isPro) return res.status(403).json({ error: 'pro_required' });

  // Validate user message length
  if (userMessage && userMessage.length > 200) {
    return res.status(400).json({ error: 'Message too long (max 200 chars)' });
  }

  // For auto_react: use game engine to classify the last player move
  let resolvedTrigger = trigger;
  if (trigger === 'auto_react') {
    const { history, coachFor = 1 } = gameContext ?? {};
    if (!history || history.length < 2) return res.json({ reply: null });

    // Find the last move by coachFor
    let lastPlayerMoveIdx = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].player === coachFor) { lastPlayerMoveIdx = i; break; }
    }
    if (lastPlayerMoveIdx < 0) return res.json({ reply: null });

    const opponent = coachFor === 1 ? 2 : 1;

    // Replay board up to the move BEFORE the last player move
    let board = createBoard();
    for (let i = 0; i < lastPlayerMoveIdx; i++) {
      const r = dropPiece(board, history[i].col, history[i].player);
      if (!r.error) board = r.board;
    }

    const playerWinsBeforeMove = findThreats(board, coachFor);
    const oppWinsBeforeMove    = findThreats(board, opponent);
    const playedCol = history[lastPlayerMoveIdx].col;

    // Advance board with the actual move
    const afterR = dropPiece(board, playedCol, coachFor);
    if (afterR.error) return res.json({ reply: null });
    const boardAfter = afterR.board;
    const playerWinsAfterMove = findThreats(boardAfter, coachFor);

    const missedWin  = playerWinsBeforeMove.size > 0 && !playerWinsBeforeMove.has(playedCol);
    const blockedOpp = oppWinsBeforeMove.size > 0 && oppWinsBeforeMove.has(playedCol);
    const createdFork = playerWinsAfterMove.size >= 2;

    if (missedWin) resolvedTrigger = 'critical_mistake';
    else if (blockedOpp || createdFork) resolvedTrigger = 'smart_move';
    else return res.json({ reply: null }); // nothing notable
  }

  try {
    const reply = await getChatReply({ userMessage, trigger: resolvedTrigger, gameContext });
    res.json({ reply });
  } catch (err) {
    console.error('[/api/chat]', err.message);
    res.status(500).json({ error: 'chat_error' });
  }
});

// Gemini AI move
app.post('/api/ai-move', async (req, res) => {
  const { board, difficulty } = req.body;
  if (!board) return res.status(400).json({ error: 'board required' });
  try {
    const col = await getGeminiMove(board, difficulty ?? 'medium');
    res.json({ col });
  } catch (err) {
    console.error('[/api/ai-move]', err.message);
    res.status(500).json({ error: 'gemini failed', col: -1 });
  }
});

// AI Coach analysis
app.post('/api/coach/analyze', async (req, res) => {
  const { winner, history, board, playerName, coachFor } = req.body;
  if (!history || !board) return res.status(400).json({ error: 'history and board required' });
  try {
    const analysis = await analyzeGame({ winner, history, board, playerName, coachFor });
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mid-game move suggestion (Gemini 2.5 Flash — fast)
// Body: { board, history, coachFor, playerName }
app.post('/api/coach/suggest', async (req, res) => {
  const { board, history, coachFor, playerName } = req.body;
  if (!board) return res.status(400).json({ error: 'board required' });
  try {
    const suggestion = await suggestMove({ board, history: history || [], coachFor: coachFor || 1, playerName: playerName || 'Player' });
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stripe stub — returns a mock checkout session
app.post('/api/stripe/checkout', (req, res) => {
  const { plan } = req.body; // 'pro_monthly' | 'pro_yearly'
  // In production: create real Stripe session with process.env.STRIPE_SECRET_KEY
  res.json({
    sessionId: `cs_test_${uuidv4().replace(/-/g, '')}`,
    url: `https://checkout.stripe.com/pay/cs_test_example#stub`,
    plan,
    note: 'Stripe integration stub — wire up STRIPE_SECRET_KEY to enable real payments',
  });
});

// SPA fallback — any unknown GET returns index.html (skip API + auth)
app.get(/^(?!\/api|\/auth)/, (_req, res) => {
  res.sendFile(join(__dirname, '../public', 'index.html'));
});

// ── HTTP + Socket.io ───────────────────────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Game Room helpers ──────────────────────────────────────────────────────

function createRoom(hostId, hostName, hostCity) {
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  const room = {
    id: roomId,
    board: createBoard(),
    players: [{ socketId: hostId, name: hostName, city: hostCity, playerNumber: 1 }],
    currentTurn: 1,
    history: [],
    status: 'waiting',   // waiting | playing | finished
    winner: null,
    winCells: null,
    chat: [],
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  return room;
}

function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room;
  }
  return null;
}

function broadcastRoom(room) {
  // Send sanitized state to all players in the room
  io.to(room.id).emit('room:state', {
    id: room.id,
    board: room.board,
    players: room.players.map(p => ({ name: p.name, city: p.city, playerNumber: p.playerNumber })),
    currentTurn: room.currentTurn,
    history: room.history,
    status: room.status,
    winner: room.winner,
    winCells: room.winCells,
  });
}

// ── Socket.io events ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] connect   ${socket.id}`);

  // Create a new room
  socket.on('room:create', ({ name, city }) => {
    const room = createRoom(socket.id, name || 'Nomad', city || 'Almaty');
    socket.join(room.id);
    socket.emit('room:created', { roomId: room.id });
    broadcastRoom(room);
    console.log(`[WS] room:create  ${room.id}  by ${name}`);
  });

  // Join existing room
  socket.on('room:join', ({ roomId, name, city }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('room:error', { message: 'Room not found. Check your link.' });
    if (room.players.length >= 2) return socket.emit('room:error', { message: 'Room is full.' });
    if (room.status !== 'waiting') return socket.emit('room:error', { message: 'Game already started.' });

    room.players.push({ socketId: socket.id, name: name || 'Nomad', city: city || 'Almaty', playerNumber: 2 });
    room.status = 'playing';
    socket.join(roomId);
    broadcastRoom(room);
    io.to(roomId).emit('room:chat', { system: true, text: `${name} joined. The duel begins!` });
    console.log(`[WS] room:join  ${roomId}  by ${name}`);
  });

  // Make a move
  socket.on('game:move', ({ roomId, col }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.status !== 'playing') return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || player.playerNumber !== room.currentTurn) {
      return socket.emit('room:error', { message: 'Not your turn.' });
    }

    const { board, row, error } = dropPiece(room.board, col, player.playerNumber);
    if (error) return socket.emit('room:error', { message: 'Invalid move: ' + error });

    room.board = board;
    room.history.push({ player: player.playerNumber, col, row });

    const result = checkWinner(board, row, col);
    if (result) {
      room.status = 'finished';
      room.winner = result.winner;
      room.winCells = result.cells;
    } else if (isDraw(board)) {
      room.status = 'finished';
      room.winner = 0; // draw
    } else {
      room.currentTurn = room.currentTurn === 1 ? 2 : 1;
    }

    broadcastRoom(room);

    if (room.status === 'finished') {
      const winnerPlayer = room.players.find(p => p.playerNumber === room.winner);
      const text = room.winner === 0
        ? 'The steppe has witnessed a draw!'
        : `${winnerPlayer?.name ?? 'Player ' + room.winner} wins! 🏆`;
      io.to(roomId).emit('room:chat', { system: true, text });
    }
  });

  // Rematch request
  socket.on('game:rematch', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.players.length < 2) return;
    room.board = createBoard();
    room.history = [];
    room.status = 'playing';
    room.winner = null;
    room.winCells = null;
    // Swap who goes first
    room.currentTurn = room.currentTurn === 1 ? 2 : 1;
    broadcastRoom(room);
    io.to(roomId).emit('room:chat', { system: true, text: 'Rematch! The steppe awaits…' });
  });

  // Resign
  socket.on('game:resign', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    room.status = 'finished';
    room.winner = player.playerNumber === 1 ? 2 : 1;
    broadcastRoom(room);
    io.to(roomId).emit('room:chat', { system: true, text: `${player.name} resigned. Honour to the winner.` });
  });

  // Chat
  socket.on('room:chat', ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id);
    const message = {
      system: false,
      name: player?.name ?? 'Guest',
      playerNumber: player?.playerNumber ?? 0,
      text: String(text).slice(0, 200),
      ts: Date.now(),
    };
    room.chat.push(message);
    io.to(roomId).emit('room:chat', message);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[WS] disconnect ${socket.id}`);
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (player && room.status === 'playing') {
      room.status = 'finished';
      room.winner = player.playerNumber === 1 ? 2 : 1;
      broadcastRoom(room);
      io.to(room.id).emit('room:chat', { system: true, text: `${player.name} disconnected. The wind carries them away.` });
    }
    // Clean up stale rooms after 1 hour
    setTimeout(() => {
      if (Date.now() - room.createdAt > 3_600_000) rooms.delete(room.id);
    }, 3_600_000);
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
async function start() {
  // Run DB migrations (no-op if DATABASE_URL not set)
  await runMigrations();

  // Seed Redis from PostgreSQL on every cold start
  if (isDbEnabled() && isCacheEnabled()) {
    try {
      const rows = await getLeaderboardFromDB({ limit: 500 });
      await lbSeedFromDB(rows);
    } catch (err) {
      console.warn('[Startup] Redis seed failed (non-fatal):', err.message);
    }
  }

  httpServer.listen(PORT, () => {
    console.log(`\n🏕️  Tört Qatar server running → http://localhost:${PORT}`);
    console.log(`   DB:    ${isDbEnabled()  ? '✅ PostgreSQL' : '⚠️  JSON file (set DATABASE_URL to enable)'}`);
    console.log(`   Cache: ${isCacheEnabled() ? '✅ Redis'      : '⚠️  disabled (set REDIS_URL to enable)'}\n`);
  });
}

start().catch(err => {
  console.error('[Fatal] startup error:', err);
  process.exit(1);
});
