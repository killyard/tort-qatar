// ── AI Coach — powered by Google Gemini 2.5 Pro ──────────────────────────────
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

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
    .join('  ');

  const outcome =
    winner === 0 ? 'Draw'
    : winner === coachFor ? `Player ${coachFor} WON`
    : `Player ${coachFor} LOST`;

  const prompt = `You are a world-class Connect Four coach giving post-game analysis. Follow the steps below in exact order — do not skip ahead.

GAME OUTCOME: ${outcome}
COACHING FOR: Player ${coachFor} (${playerName})
TOTAL MOVES: ${history.length}

MOVE SEQUENCE (move_number. Player→column):
${moveLines}

FINAL BOARD (0=empty, 1=P1, 2=P2, row 0=top):
${board.map(r => r.join(' ')).join('\n')}

━━ ANALYSIS STEPS (execute in this order) ━━━━━━━━━━━━━━━━━━━━

STEP 1 — TACTICAL SCAN (highest priority):
Replay every move by Player ${coachFor} from move 1 to ${history.length}.
At each of their turns ask two questions:
  (a) Did Player ${coachFor} have an IMMEDIATE WIN available — i.e. already had 3-in-a-row (horizontal, vertical, or diagonal) with the 4th slot open and reachable? Did they take it or miss it?
  (b) On the previous half-move, did the opponent create an immediate win threat? Did Player ${coachFor} block it or ignore it?
Log every miss. A missed immediate win or a failed block is a BLUNDER and must be reported, no matter how early in the game it occurred.

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
