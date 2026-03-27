import { z } from "zod";

// ---- Constants ----

export const CHECKERS_BOARD_SIZE = 8;
export const CHECKERS_INITIAL_ROWS = 3; // rows each side starts with pieces on

// ---- Cell & Piece types ----

/**
 * 0 = player 0's piece (moves toward higher rows)
 * 1 = player 1's piece (moves toward lower rows)
 */
export type CheckersPlayer = 0 | 1;

export interface CheckersPiece {
  player: CheckersPlayer;
  isKing: boolean;
}

/**
 * The board is an 8x8 grid. Each cell is either null (empty) or a piece.
 * Only dark squares are ever occupied (checkers is played on dark squares).
 */
export type CheckersBoard = (CheckersPiece | null)[][];

// ---- Moves ----

/**
 * A single step in a move: the destination row and col.
 * A move is a sequence of one or more steps (multi-jump chain).
 * The starting position is implicit from context (it's the piece being moved).
 */
export const zCheckersStep = z.object({
  row: z.int().gte(0).lt(CHECKERS_BOARD_SIZE),
  col: z.int().gte(0).lt(CHECKERS_BOARD_SIZE),
});

/**
 * A full checkers move:
 * - `fromRow`, `fromCol`: the piece being moved
 * - `steps`: one or more destination squares (multi-jump = multiple steps)
 */
export const zCheckersMove = z.object({
  fromRow: z.int().gte(0).lt(CHECKERS_BOARD_SIZE),
  fromCol: z.int().gte(0).lt(CHECKERS_BOARD_SIZE),
  steps: z.array(zCheckersStep).min(1),
});

export type CheckersMove = z.infer<typeof zCheckersMove>;
export type CheckersStep = z.infer<typeof zCheckersStep>;

// ---- Game state ----

export interface CheckersState {
  board: CheckersBoard;
  /** Index of the player whose turn it is (0 or 1) */
  nextPlayer: CheckersPlayer;
  /**
   * Counts half-moves since the last capture or king move.
   * Draw is declared when this reaches 40 (40-move rule).
   */
  drawCounter: number;
  /** Whether the game has ended in a draw */
  isDraw: boolean;
  /** Winner index if the game is done, or null if ongoing/draw */
  winner: CheckersPlayer | null;
}

// ---- Views ----

/**
 * Checkers is a perfect information game — both players and watchers
 * see the full board at all times.
 */
export interface CheckersView {
  board: CheckersBoard;
  nextPlayer: CheckersPlayer;
  drawCounter: number;
  isDraw: boolean;
  winner: CheckersPlayer | null;
  /** All legal moves for the current player, for UI highlighting */
  legalMoves: CheckersMove[];
}
