import { z } from "zod";

/** The player tokens */
export type Connect4Token = 0 | 1;

/**
 * This board is a 6-row × 7-column grid. Each cell is either null
 * or the index of the player who placed a token there.
 */
export type Connect4Board = (Connect4Token | null)[][];

/**
 * This is the internal game state that tracks the board state, whose turn it is and who is the winner
 */
export interface Connect4State {
  board: Connect4Board;
  nextPlayer: Connect4Token;
  winner: Connect4Token | null;
}

/**
 * view is the state
 */
export type Connect4View = Connect4State;

/**
 * A move in Connect 4 is a column index (0–6) to drop a token into.
 */
export type Connect4Move = z.infer<typeof zConnect4Move>;
export const zConnect4Move = z.int().gte(0).lte(6);
