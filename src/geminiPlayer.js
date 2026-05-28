// ── Gemini AI Player — picks a Connect Four move via Gemini 2.5 Flash ────────
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

const ROWS = 6, COLS = 7, EMPTY = 0;

function validCols(board) {
  return Array.from({ length: COLS }, (_, c) => c).filter(c => board[0][c] === EMPTY);
}

function boardToText(board) {
  const rows = board.map((row, r) =>
    `Row ${r}: [${row.map(c => c === 0 ? '.' : c === 1 ? 'X' : 'O').join(' ')}]`
  );
  return rows.join('\n');
}

function difficultyInstruction(difficulty) {
  if (difficulty === 'easy')   return 'Play at a beginner level — make some suboptimal moves, avoid planning ahead more than 1 step. Do NOT always play the strongest move.';
  if (difficulty === 'medium') return 'Play at an intermediate level — make reasonably good moves but not perfect play.';
  return 'Play at expert level — find the absolute best move, thinking several steps ahead.';
}

/**
 * Ask Gemini 2.5 Flash to choose a column.
 * @param {number[][]} board  6×7 board (0=empty, 1=human, 2=AI)
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {Promise<number>} column 0-6, or -1 on failure
 */
export async function getGeminiMove(board, difficulty = 'medium') {
  const free = validCols(board);
  if (free.length === 0) return -1;
  if (free.length === 1) return free[0];

  const prompt = `You are playing Connect Four as player O (number 2). The human is X (number 1).

BOARD (rows 0-5 top to bottom, 7 columns 0-6):
${boardToText(board)}

RULES:
- Drop a piece into a column; it falls to the lowest empty row.
- First to get 4 in a row (horizontal, vertical, or diagonal) wins.
- Available columns: [${free.join(', ')}]

DIFFICULTY: ${difficultyInstruction(difficulty)}

PRIORITY (always apply regardless of difficulty):
1. If you can win this turn — do it.
2. If the human (X) can win next turn — block it.
3. Otherwise apply the difficulty instruction.

Respond with ONLY a single integer — the column number you choose (0-6). No explanation, no text, just the number.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const col = parseInt(text.match(/\d+/)?.[0] ?? '-1', 10);
    if (free.includes(col)) return col;
    // If Gemini returned an invalid column, pick first valid
    return free[0];
  } catch (err) {
    console.error('[Gemini Player]', err.message);
    return -1; // caller falls back to minimax
  }
}
