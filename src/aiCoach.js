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

  const prompt = `You are an expert Connect Four coach. Analyze this game and give concise, actionable feedback.

GAME OUTCOME: ${outcome}
COACHING FOR: Player ${coachFor} (${playerName})
TOTAL MOVES: ${history.length}

MOVE SEQUENCE (format: move_number. Player→column):
${moveLines}

FINAL BOARD (0=empty, 1=P1, 2=P2, row 0=top):
${board.map(r => r.join(' ')).join('\n')}

Respond in JSON with exactly this shape — be specific, reference actual column numbers:
{
  "summary": "One sentence overall assessment (max 20 words)",
  "insights": [
    "Specific observation about a key decision (mention column number)",
    "Another key moment or pattern observed",
    "A strength or repeated weakness noticed"
  ],
  "keyMoment": {
    "moveNumber": <integer — the most pivotal move>,
    "description": "What happened and why it was decisive (1-2 sentences)"
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
        'Both players fought hard until the end.',
        'Look for diagonal threats early — they are easy to miss.',
        'Center column control is key in Connect Four.',
      ],
      keyMoment: {
        moveNumber: Math.floor(history.length / 2),
        description: 'The midgame was the turning point of this match.',
      },
      tip: 'Always check if your opponent can win in one move before placing your piece.',
    };
  }
}
