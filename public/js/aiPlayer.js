// ── Tört Qatar — AI Player (Minimax + Alpha-Beta Pruning) ────────────────────
// Runs entirely in the browser. No server round-trip needed.

// Board dimensions read from globals set by setBoardSize (default 6×7)
const getR = () => (typeof window !== 'undefined' && window.BOARD_ROWS) || 6;
const getC = () => (typeof window !== 'undefined' && window.BOARD_COLS) || 7;
const EMPTY = 0;

// Search depth by difficulty
const DEPTH = { easy: 2, medium: 4, hard: 7 };

// Column order: prefer center columns — regenerated per board width
function getColOrder() {
  const c = getC();
  const mid = Math.floor(c / 2);
  const order = [mid];
  for (let d = 1; d <= mid; d++) {
    if (mid - d >= 0) order.push(mid - d);
    if (mid + d < c)  order.push(mid + d);
  }
  return order;
}

// ── Board helpers ─────────────────────────────────────────────────────────────

function cloneBoard(board) {
  return board.map(r => [...r]);
}

function isValidCol(board, col) {
  return board[0][col] === EMPTY;
}

function dropPiece(board, col, player) {
  const b = cloneBoard(board);
  for (let r = getR() - 1; r >= 0; r--) {
    if (b[r][col] === EMPTY) { b[r][col] = player; return { board: b, row: r }; }
  }
  return { board: b, row: -1 };
}

function validCols(board) {
  return getColOrder().filter(c => isValidCol(board, c));
}

// ── Win detection ─────────────────────────────────────────────────────────────

function checkWin(board, row, col, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let cnt = 1;
    for (let i = 1; i < 4; i++) {
      const r = row + dr*i, c = col + dc*i;
      if (r < 0 || r >= getR() || c < 0 || c >= getC() || board[r][c] !== player) break;
      cnt++;
    }
    for (let i = 1; i < 4; i++) {
      const r = row - dr*i, c = col - dc*i;
      if (r < 0 || r >= getR() || c < 0 || c >= getC() || board[r][c] !== player) break;
      cnt++;
    }
    if (cnt >= 4) return true;
  }
  return false;
}

function isBoardFull(board) {
  return board[0].every(c => c !== EMPTY);
}

function isTerminal(board) {
  // Check every filled cell for a win
  for (let r = 0; r < getR(); r++)
    for (let c = 0; c < getC(); c++)
      if (board[r][c] !== EMPTY && checkWin(board, r, c, board[r][c])) return true;
  return isBoardFull(board);
}

// ── Static evaluation ─────────────────────────────────────────────────────────

function scoreWindow(win, player) {
  const opp = player === 1 ? 2 : 1;
  const pc = win.filter(x => x === player).length;
  const ec = win.filter(x => x === EMPTY).length;
  const oc = win.filter(x => x === opp).length;

  if (pc === 4)                  return  100_000;
  if (pc === 3 && ec === 1)      return      100;
  if (pc === 2 && ec === 2)      return       10;
  if (oc === 3 && ec === 1)      return     -200;  // urgent block
  if (oc === 2 && ec === 2)      return      -10;
  return 0;
}

function scoreBoard(board, player) {
  let score = 0;

  // Center column bias
  const center = board.map(r => r[3]);
  score += center.filter(x => x === player).length * 6;

  // Horizontal
  for (let r = 0; r < getR(); r++)
    for (let c = 0; c <= getC() - 4; c++)
      score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], player);

  // Vertical
  for (let c = 0; c < getC(); c++)
    for (let r = 0; r <= getR() - 4; r++)
      score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], player);

  // Diagonal ↘
  for (let r = 0; r <= getR() - 4; r++)
    for (let c = 0; c <= getC() - 4; c++)
      score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], player);

  // Diagonal ↙
  for (let r = 0; r <= getR() - 4; r++)
    for (let c = 3; c < getC(); c++)
      score += scoreWindow([board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]], player);

  return score;
}

// ── Minimax + Alpha-Beta ──────────────────────────────────────────────────────

function minimax(board, depth, alpha, beta, maximizing, aiPlayer) {
  const human = aiPlayer === 1 ? 2 : 1;

  // Terminal check
  if (isTerminal(board) || depth === 0) {
    if (depth === 0) return scoreBoard(board, aiPlayer);
    // Check who won
    for (let r = 0; r < getR(); r++)
      for (let c = 0; c < getC(); c++) {
        const p = board[r][c];
        if (p !== EMPTY && checkWin(board, r, c, p))
          return p === aiPlayer ? 100_000 + depth : -(100_000 + depth);
      }
    return 0; // draw
  }

  const cols = validCols(board);
  const currentPlayer = maximizing ? aiPlayer : human;

  if (maximizing) {
    let best = -Infinity;
    for (const col of cols) {
      const { board: next, row } = dropPiece(board, col, currentPlayer);
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false, aiPlayer));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const col of cols) {
      const { board: next, row } = dropPiece(board, col, currentPlayer);
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, true, aiPlayer));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the best column for the AI to play.
 * @param {number[][]} board - current 6×7 board
 * @param {number}     aiPlayer - 1 or 2
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {number} column index (0-6)
 */
export function getBestMove(board, aiPlayer, difficulty = 'medium') {
  const depth = DEPTH[difficulty] ?? DEPTH.medium;
  const cols = validCols(board);
  if (cols.length === 0) return -1;

  // Easy: 30% chance of random move
  if (difficulty === 'easy' && Math.random() < 0.30) {
    return cols[Math.floor(Math.random() * cols.length)];
  }

  // Immediate win check
  for (const col of cols) {
    const { board: next, row } = dropPiece(board, col, aiPlayer);
    if (checkWin(next, row, col, aiPlayer)) return col;
  }

  // Immediate block check
  const human = aiPlayer === 1 ? 2 : 1;
  for (const col of cols) {
    const { board: next, row } = dropPiece(board, col, human);
    if (checkWin(next, row, col, human)) return col;
  }

  // Full search
  let bestCol = cols[0], bestScore = -Infinity;
  for (const col of cols) {
    const { board: next } = dropPiece(board, col, aiPlayer);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) { bestScore = score; bestCol = col; }
  }
  return bestCol;
}
