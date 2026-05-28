// ── Connect Four Game Engine ──────────────────────────────────────────────────
// Pure logic — no I/O, no side-effects. Safe to import from server.js.

export const ROWS = 6;
export const COLS = 7;
export const EMPTY = 0;
export const P1 = 1;
export const P2 = 2;

/** Return a fresh blank board */
export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

/**
 * Drop a piece for `player` into `col`.
 * Returns { board, row } on success, or { error } if column is full.
 */
export function dropPiece(board, col, player) {
  if (col < 0 || col >= COLS) return { error: 'invalid_column' };
  // Find the lowest empty row in this column
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) {
      const next = board.map(row => [...row]);
      next[r][col] = player;
      return { board: next, row: r };
    }
  }
  return { error: 'column_full' };
}

/**
 * Check for a winner after placing at (row, col).
 * Returns { winner: P1|P2, cells: [[r,c],...] } or null.
 */
export function checkWinner(board, row, col) {
  const player = board[row][col];
  if (player === EMPTY) return null;

  const dirs = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal ↘
    [1, -1],  // diagonal ↙
  ];

  for (const [dr, dc] of dirs) {
    const cells = [[row, col]];
    // Extend in positive direction
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      cells.push([r, c]);
    }
    // Extend in negative direction
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i, c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      cells.push([r, c]);
    }
    if (cells.length >= 4) return { winner: player, cells };
  }
  return null;
}

/** Returns true if the board is completely full (draw). */
export function isDraw(board) {
  return board[0].every(cell => cell !== EMPTY);
}

/**
 * Build a compact move-history string for the AI coach.
 * history: [{ player, col, row }]
 */
export function formatMoveHistory(history) {
  return history
    .map((m, i) => `Move ${i + 1}: Player ${m.player} → column ${m.col + 1} (row ${m.row + 1})`)
    .join('\n');
}

/**
 * Evaluate which columns are "threats" — next move would win.
 * Returns Set of column indices that are winning moves for `player`.
 */
export function findThreats(board, player) {
  const threats = new Set();
  for (let c = 0; c < COLS; c++) {
    const { board: next, row, error } = dropPiece(board, c, player);
    if (error) continue;
    if (checkWinner(next, row, c)) threats.add(c);
  }
  return threats;
}
