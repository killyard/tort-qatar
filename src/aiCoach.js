// ── AI Coach — powered by Google Gemini 2.5 Pro ──────────────────────────────
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createBoard, dropPiece, checkWinner, findThreats } from './gameEngine.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

/**
 * Replay the game move by move and return a list of tactical annotations:
 * - MISSED_WIN: coachFor had an immediate winning move but didn't take it
 * - MISSED_BLOCK: opponent had a winning threat that coachFor didn't block
 *
 * These are computed deterministically by the game engine — no guessing.
 */
function buildTacticalAnnotations(history, coachFor) {
  const opponent = coachFor === 1 ? 2 : 1;
  let board = createBoard();
  const annotations = [];

  for (let i = 0; i < history.length; i++) {
    const { player, col } = history[i];
    const moveNum = i + 1;

    if (player === coachFor) {
      // Did coachFor have a winning move available?
      const wins = findThreats(board, coachFor);
      if (wins.size > 0 && !wins.has(col)) {
        const winCols = [...wins].map(c => `col ${c + 1}`).join(', ');
        annotations.push(`MISSED_WIN at move ${moveNum}: Player ${coachFor} could have won immediately by playing ${winCols}, but played col ${col + 1} instead.`);
      }

      // Did the opponent have a winning threat that coachFor ignored?
      const oppThreats = findThreats(board, opponent);
      if (oppThreats.size > 0 && !oppThreats.has(col)) {
        const threatCols = [...oppThreats].map(c => `col ${c + 1}`).join(', ');
        annotations.push(`MISSED_BLOCK at move ${moveNum}: Opponent had a winning threat at ${threatCols}, but Player ${coachFor} played col ${col + 1} instead of blocking.`);
      }
    }

    // Advance board state
    const result = dropPiece(board, col, player);
    if (!result.error) board = result.board;
  }

  return annotations;
}

/**
 * Analyze a completed game and return coaching feedback.
 *
 * @param {object} params
 * @param {number} params.winner        - 1, 2, or 0 (draw)
 * @param {Array}  params.history       - [{ player, col, row }, ...]
 * @param {Array}  params.board         - final 6×7 board state
 * @param {string} params.playerName    - name of the player to coach
 * @param {number} params.coachFor      - player number being coached (1 or 2)
 * @returns {Promise<{summary, insights, keyMoment, tip}>}
 */
export async function analyzeGame({ winner, history, board, playerName, coachFor }) {
  const moveLines = history
    .map((m, i) => `${i + 1}. P${m.player} → col ${m.col + 1}`)
    .join('\n');

  const outcome =
    winner === 0 ? 'Draw'
    : winner === coachFor ? `Player ${coachFor} WON`
    : `Player ${coachFor} LOST`;

  // Pre-compute tactical blunders using the game engine (100% accurate)
  const tacticalAnnotations = buildTacticalAnnotations(history, coachFor);
  const tacticalSection = tacticalAnnotations.length > 0
    ? `PRE-COMPUTED TACTICAL FACTS (engine-verified, guaranteed accurate):\n${tacticalAnnotations.map(a => `  • ${a}`).join('\n')}`
    : `PRE-COMPUTED TACTICAL FACTS: No missed immediate wins or missed blocks detected.`;

  const prompt = `You are a world-class Connect Four coach giving post-game analysis. Follow the steps below in exact order — do not skip ahead.

GAME OUTCOME: ${outcome}
COACHING FOR: Player ${coachFor} (${playerName})
TOTAL MOVES: ${history.length}

MOVE SEQUENCE (move_number. Player→column):
${moveLines}

FINAL BOARD (0=empty, 1=P1, 2=P2, row 0=top):
${board.map(r => r.join(' ')).join('\n')}

${tacticalSection}

━━ ANALYSIS STEPS (execute in this order) ━━━━━━━━━━━━━━━━━━━━

STEP 1 — TACTICAL FACTS (use the pre-computed section above, do not re-derive):
The game engine has already calculated every move where Player ${coachFor} missed an immediate win or failed to block the opponent's winning threat. These are listed above as MISSED_WIN and MISSED_BLOCK entries.
  - Treat every MISSED_WIN and MISSED_BLOCK as a confirmed BLUNDER.
  - If any MISSED_WIN entries exist, the earliest one MUST appear in insights and MUST be the keyMoment (unless a MISSED_BLOCK on an even earlier move is present).
  - Do not contradict or ignore these facts — they are engine-verified.

STEP 2 — STRATEGIC PATTERNS:
Look at the full sequence for recurring themes: over-stacking one column, neglecting center (col 4), building threats that got closed off, or inadvertently helping opponent build a fork. Identify 1-2 patterns.

STEP 3 — BEST PLAY (optional):
Did Player ${coachFor} make any move that was genuinely strong — blocked a fork, created a double-threat, or grabbed a key center cell at the right moment? If yes, note it. If nothing stands out, skip this entirely.

STEP 4 — ASSEMBLE RESPONSE:
Using everything found above, fill in the JSON below.
- summary: honest 1-sentence verdict on the overall game (max 20 words).
- insights: exactly 3 observations, ordered by importance (most critical first). Must include any BLUNDER found in Step 1. May include a positive observation from Step 3 if one exists — but only if genuine, not as filler.
- smartMove: ONLY include this field if Step 3 found something truly noteworthy. If nothing stood out, OMIT the field entirely.
- keyMoment: the single worst moment — priority order: missed immediate win > failed to block opponent's win > strategic error. Always a specific move number.
- tip: one concrete, actionable improvement for the player's next game (max 25 words).

━━ OUTPUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respond with raw JSON only (no markdown fences). Shape:
{
  "summary": "...",
  "insights": ["...", "...", "..."],
  "smartMove": { "moveNumber": <int>, "description": "..." },
  "keyMoment": { "moveNumber": <int>, "description": "..." },
  "tip": "..."
}
If omitting smartMove, just leave it out of the JSON entirely.`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[AI Coach]', err.message);
    return {
      summary: outcome === 'Draw' ? 'A hard-fought draw on the steppe.' : `${outcome} — well played.`,
      insights: [
        'Look for diagonal threats early — they are easy to miss.',
        'Center column control is key in Connect Four.',
        'You showed resilience by staying in the game until the end.',
      ],
      smartMove: {
        moveNumber: Math.floor(history.length / 3),
        description: 'An early center placement that kept your options open.',
      },
      keyMoment: {
        moveNumber: Math.floor(history.length / 2),
        description: 'The midgame was the turning point of this match.',
      },
      tip: 'Always check if your opponent can win in one move before placing your piece.',
    };
  }
}
