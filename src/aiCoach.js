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

  const prompt = `You are an expert Connect Four coach. Your job is a full chronological review of every move — not just the endgame.

GAME OUTCOME: ${outcome}
COACHING FOR: Player ${coachFor} (${playerName})
TOTAL MOVES: ${history.length}

MOVE SEQUENCE (format: move_number. Player→column):
${moveLines}

FINAL BOARD (0=empty, 1=P1, 2=P2, row 0=top):
${board.map(r => r.join(' ')).join('\n')}

ANALYSIS INSTRUCTIONS — follow these steps in order:
1. Replay the game from move 1 to move ${history.length} mentally. For each move by Player ${coachFor}, rate it: BLUNDER / MISTAKE / NEUTRAL / GOOD / EXCELLENT.
2. BLUNDER = missed an immediate win (3-in-a-row with an open 4th slot) OR allowed opponent to win next move without blocking.
3. GOOD/EXCELLENT = created a fork threat, blocked opponent's winning move, secured center control, or set up a future trap.
4. Pick the single WORST move (highest-priority blunder or mistake) → keyMoment.
5. Pick the single BEST move by Player ${coachFor} (if any) → smartMove. If none stands out, pick the most solid defensive play.
6. From your chronological pass, pick 3 observations: at least one must be a mistake/blunder, at least one must be a strength or smart play (even if the player lost).

Respond in JSON with exactly this shape — be specific, always reference actual move numbers and column numbers:
{
  "summary": "One sentence overall assessment (max 20 words)",
  "insights": [
    "A specific mistake or blunder with move number and column",
    "Another mistake or pattern observed with move number",
    "A strength or smart play noticed (even small ones count)"
  ],
  "smartMove": {
    "moveNumber": <integer — the best or most solid move by Player ${coachFor}>,
    "description": "Why this was a good play (1-2 sentences)"
  },
  "keyMoment": {
    "moveNumber": <integer — the worst blunder or most decisive mistake>,
    "description": "What happened and why it hurt (1-2 sentences)"
  },
  "tip": "One concrete improvement tip for next game (max 25 words)"
}`;

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
