import { GameService } from "./gameServiceManager.ts";
import {
  type Connect4State,
  type Connect4View,
  type Connect4Token,
  zConnect4Move,
} from "@gamenite/shared";
import { type GameLogic } from "./gameLogic.ts";

const ROWS = 6;
const COLS = 7;

function emptyBoard(): (Connect4Token | null)[][] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/** Returns the row index where a token would land in the given column, returns -1 if full */
function dropRow(board: (Connect4Token | null)[][], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) return row;
  }
  return -1;
}

/** Checks whether placing piece at (row, col) creates a win */
function checkWin(
  board: (Connect4Token | null)[][],
  row: number,
  col: number,
  token: Connect4Token,
): boolean {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal
    [1, -1], // diagonal
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === token) {
        count++;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= 4) return true;
  }
  return false;
}

export const connect4Logic: GameLogic<Connect4State, Connect4View> = {
  minPlayers: 2,
  maxPlayers: 2,

  start: () => ({
    board: emptyBoard(),
    nextPlayer: 0,
    winner: null,
  }),

  update: ({ board, nextPlayer, winner }, payload, playerIndex) => {
    if (winner !== null) return null;
    if (playerIndex !== nextPlayer) return null;

    const move = zConnect4Move.safeParse(payload);
    if (move.error) return null;

    const col = move.data;
    const row = dropRow(board, col);
    if (row === -1) return null; // column is full

    // Deep-copy the board before mutating
    const newBoard = board.map((r: (Connect4Token | null)[]) => [...r]);
    newBoard[row][col] = nextPlayer;

    const newWinner = checkWin(newBoard, row, col, nextPlayer) ? nextPlayer : null;

    return {
      board: newBoard,
      nextPlayer: nextPlayer === 0 ? 1 : 0,
      winner: newWinner,
    };
  },

  isDone: ({ board, winner }) => {
    if (winner !== null) return true;
    // Draw: top row is full
    return board[0].every((cell: Connect4Token | null) => cell !== null);
  },

  viewAs: (state) => state,

  tagView: (view) => ({ type: "connect4", view }),

  describeMove: (prevState, newState, movePayload, playerIndex) => {
    const col = zConnect4Move.parse(movePayload);
    if (newState.winner !== null) {
      return ` dropped a token in column ${col + 1} and won!`;
    }
    return ` dropped a token in column ${col + 1}`;
  },

  getWinners: ({ winner }) => {
    if (winner === null) return [];
    return [winner];
  },
};

export const connect4GameService = new GameService<Connect4State, Connect4View>(connect4Logic);

// This is bot code

/** Sentinel user ID stored in game.players to represent the CPU opponent */
export const CONNECT_4_BOT_USER_ID = "__connect4_bot__";

/**
 * Picks a random non-full column for the bot to play.
 * Only call this when the game is not yet over.
 */
export function getBotMove(board: (Connect4Token | null)[][]): number {
  const available: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === null) available.push(col);
  }
  return available[Math.floor(Math.random() * available.length)];
}
