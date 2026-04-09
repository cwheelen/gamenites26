import {
  CHECKERS_BOARD_SIZE,
  CHECKERS_INITIAL_ROWS,
  type CheckersBoard,
  type CheckersMove,
  type CheckersPiece,
  type CheckersPlayer,
  type CheckersState,
  type CheckersView,
  zCheckersMove,
} from "@gamenite/shared";
import { type GameLogic } from "./gameLogic.ts";
import { GameService } from "./gameServiceManager.ts";
import { coinFlip } from "./util.ts";

// ---- Board helpers ----

/** Returns true if (row, col) is a valid dark square on the board */
function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

/** Returns true if (row, col) is within the board */
function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < CHECKERS_BOARD_SIZE && col >= 0 && col < CHECKERS_BOARD_SIZE;
}

/** Deep-clones the board */
function cloneBoard(board: CheckersBoard): CheckersBoard {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

/** Builds the initial board for a new game */
function buildInitialBoard(): CheckersBoard {
  const board: CheckersBoard = Array.from({ length: CHECKERS_BOARD_SIZE }, () =>
    Array.from({ length: CHECKERS_BOARD_SIZE }, (): CheckersPiece | null => null),
  );

  for (let row = 0; row < CHECKERS_BOARD_SIZE; row++) {
    for (let col = 0; col < CHECKERS_BOARD_SIZE; col++) {
      if (!isDarkSquare(row, col)) continue;
      if (row < CHECKERS_INITIAL_ROWS) {
        board[row][col] = { player: 1, isKing: false };
      } else if (row >= CHECKERS_BOARD_SIZE - CHECKERS_INITIAL_ROWS) {
        board[row][col] = { player: 0, isKing: false };
      }
    }
  }

  return board;
}

// ---- Move direction helpers ----

/** Returns forward row directions for a player (kings get both) */
function getForwardDirs(player: CheckersPlayer, isKing: boolean): number[] {
  if (isKing) return [-1, 1];
  return player === 0 ? [-1] : [1];
}

// ---- Legal move generation ----

interface JumpState {
  row: number;
  col: number;
  board: CheckersBoard;
  capturedKeys: Set<string>;
  steps: { row: number; col: number }[];
}

/**
 * Recursively finds all jump chains starting from (row, col) for a given piece.
 * Returns all complete jump sequences (each sequence is an array of steps).
 */
function findJumpChains(piece: CheckersPiece, state: JumpState): { row: number; col: number }[][] {
  const dirs = getForwardDirs(piece.player, piece.isKing);
  const results: { row: number; col: number }[][] = [];

  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const midRow = state.row + dr;
      const midCol = state.col + dc;
      const landRow = state.row + 2 * dr;
      const landCol = state.col + 2 * dc;
      const midKey = `${midRow},${midCol}`;

      if (!inBounds(landRow, landCol)) continue;
      if (state.capturedKeys.has(midKey)) continue;

      const midPiece = state.board[midRow]?.[midCol];
      if (!midPiece || midPiece.player === piece.player) continue;

      const landing = state.board[landRow][landCol];
      if (landing !== null) continue;

      const newBoard = cloneBoard(state.board);
      newBoard[midRow][midCol] = null;
      newBoard[landRow][landCol] = piece;
      newBoard[state.row][state.col] = null;

      const wouldKing =
        !piece.isKing &&
        ((piece.player === 0 && landRow === 0) ||
          (piece.player === 1 && landRow === CHECKERS_BOARD_SIZE - 1));

      const newPiece: CheckersPiece = wouldKing ? { ...piece, isKing: true } : piece;
      const newCaptured = new Set(state.capturedKeys).add(midKey);
      const newSteps = [...state.steps, { row: landRow, col: landCol }];

      const furtherJumps = findJumpChains(newPiece, {
        row: landRow,
        col: landCol,
        board: newBoard,
        capturedKeys: newCaptured,
        steps: newSteps,
      });

      if (furtherJumps.length > 0) {
        results.push(...furtherJumps);
      } else {
        results.push(newSteps);
      }
    }
  }

  return results;
}

/**
 * Returns all legal moves for a given player on the given board.
 * Mandatory capture is enforced: if any capture exists, only captures are returned.
 */
function getLegalMoves(board: CheckersBoard, player: CheckersPlayer): CheckersMove[] {
  const jumps: CheckersMove[] = [];
  const simple: CheckersMove[] = [];

  for (let row = 0; row < CHECKERS_BOARD_SIZE; row++) {
    for (let col = 0; col < CHECKERS_BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.player !== player) continue;

      const chains = findJumpChains(piece, {
        row,
        col,
        board,
        capturedKeys: new Set(),
        steps: [],
      });

      for (const steps of chains) {
        jumps.push({ fromRow: row, fromCol: col, steps });
      }

      const dirs = getForwardDirs(player, piece.isKing);
      for (const dr of dirs) {
        for (const dc of [-1, 1]) {
          const toRow = row + dr;
          const toCol = col + dc;
          if (!inBounds(toRow, toCol)) continue;
          if (board[toRow][toCol] !== null) continue;
          simple.push({ fromRow: row, fromCol: col, steps: [{ row: toRow, col: toCol }] });
        }
      }
    }
  }

  return jumps.length > 0 ? jumps : simple;
}

// ---- Move application ----

/**
 * Applies a validated move to the board, returning the new board.
 * Assumes the move has already been verified as legal.
 */
function applyMove(
  board: CheckersBoard,
  move: CheckersMove,
  player: CheckersPlayer,
): { newBoard: CheckersBoard; wasCapture: boolean; wasKingMove: boolean } {
  const newBoard = cloneBoard(board);
  let wasCapture = false;
  const piece = newBoard[move.fromRow][move.fromCol]!;
  const wasKing = piece.isKing;

  newBoard[move.fromRow][move.fromCol] = null;

  let currentRow = move.fromRow;
  let currentCol = move.fromCol;
  let currentPiece = { ...piece };

  for (const step of move.steps) {
    const dr = step.row - currentRow;
    const dc = step.col - currentCol;

    if (Math.abs(dr) === 2) {
      const midRow = currentRow + dr / 2;
      const midCol = currentCol + dc / 2;
      newBoard[midRow][midCol] = null;
      wasCapture = true;
    }

    currentRow = step.row;
    currentCol = step.col;

    if (
      !currentPiece.isKing &&
      ((player === 0 && currentRow === 0) ||
        (player === 1 && currentRow === CHECKERS_BOARD_SIZE - 1))
    ) {
      currentPiece = { ...currentPiece, isKing: true };
    }
  }

  newBoard[currentRow][currentCol] = currentPiece;

  return {
    newBoard,
    wasCapture,
    wasKingMove: !wasKing && currentPiece.isKing,
  };
}

// ---- Win/draw detection ----

function countPieces(board: CheckersBoard, player: CheckersPlayer): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell?.player === player) count++;
    }
  }
  return count;
}

const DRAW_LIMIT = 40;

// ---- Game logic ----

export const checkersLogic: GameLogic<CheckersState, CheckersView> = {
  minPlayers: 2,
  maxPlayers: 2,

  start: (_numPlayers) => ({
    board: buildInitialBoard(),
    nextPlayer: coinFlip() ? 0 : (1 as CheckersPlayer),
    drawCounter: 0,
    isDraw: false,
    winner: null,
  }),

  update: (state, movePayload, playerIndex) => {
    if (state.winner !== null || state.isDraw) return null;
    if (playerIndex !== state.nextPlayer) return null;

    const parsed = zCheckersMove.safeParse(movePayload);
    if (parsed.error) return null;
    const move = parsed.data;

    const legalMoves = getLegalMoves(state.board, state.nextPlayer);
    const isLegal = legalMoves.some(
      (lm) =>
        lm.fromRow === move.fromRow &&
        lm.fromCol === move.fromCol &&
        lm.steps.length === move.steps.length &&
        lm.steps.every((s, i) => s.row === move.steps[i].row && s.col === move.steps[i].col),
    );
    if (!isLegal) return null;

    const { newBoard, wasCapture, wasKingMove } = applyMove(state.board, move, state.nextPlayer);

    const opponent = (1 - state.nextPlayer) as CheckersPlayer;

    const opponentPieces = countPieces(newBoard, opponent);
    const opponentMoves = getLegalMoves(newBoard, opponent);
    const currentPlayerWins = opponentPieces === 0 || opponentMoves.length === 0;

    const newDrawCounter = wasCapture || wasKingMove ? 0 : state.drawCounter + 1;
    const isDraw = !currentPlayerWins && newDrawCounter >= DRAW_LIMIT;

    return {
      board: newBoard,
      nextPlayer: currentPlayerWins || isDraw ? state.nextPlayer : opponent,
      drawCounter: newDrawCounter,
      isDraw,
      winner: currentPlayerWins ? state.nextPlayer : null,
    };
  },

  isDone: (state) => state.winner !== null || state.isDraw,

  viewAs: (state, _playerIndex) => ({
    board: state.board,
    nextPlayer: state.nextPlayer,
    drawCounter: state.drawCounter,
    isDraw: state.isDraw,
    winner: state.winner,
    legalMoves:
      state.winner !== null || state.isDraw ? [] : getLegalMoves(state.board, state.nextPlayer),
  }),

  tagView: (view) => ({ type: "checkers", view }),

  describeMove: (_prevState, newState, movePayload, playerIndex) => {
    const move = zCheckersMove.safeParse(movePayload);
    if (move.error) return " made a move";

    const { fromRow, fromCol, steps } = move.data;
    const fromColLetter = String.fromCharCode(65 + fromCol);
    const from = `${fromColLetter}${fromRow + 1}`;
    const last = steps[steps.length - 1];
    const toColLetter = String.fromCharCode(65 + last.col);
    const to = `${toColLetter}${last.row + 1}`;

    const isCapture = steps.some((step, i) => {
      const prevRow = i === 0 ? fromRow : steps[i - 1].row;
      return Math.abs(step.row - prevRow) === 2;
    });

    if (newState.isDraw) return ` moved ${from}→${to} — draw by 40-move rule`;
    if (newState.winner === playerIndex) {
      return ` moved ${from}→${to} and won the game!`;
    }
    if (isCapture && steps.length > 1) return ` made a ${steps.length}-jump chain ${from}→${to}`;
    if (isCapture) return ` captured at ${from}→${to}`;
    return ` moved ${from}→${to}`;
  },

  getWinners: (state) => {
    if (state.winner !== null) return [state.winner];
    return [];
  },
};

export const checkersGameService = new GameService<CheckersState, CheckersView>(checkersLogic);
