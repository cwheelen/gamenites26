/* eslint-disable import/no-duplicates */
import { describe, it, expect, vi } from "vitest";
import { getBotMove, CONNECT_4_BOT_USER_ID } from "../../src/games/connect4.ts";
import { getCheckersBotMove, CHECKERS_BOT_USER_ID } from "../../src/games/checkers.ts";
import {
  getGuessBotMove,
  NUMBER_GUESSER_BOT_USER_IDS,
  NUMBER_GUESSER_BOT_USER_ID,
} from "../../src/games/guess.ts";
import { coinFlip } from "../../src/games/util.ts";
import type { Connect4Token } from "@gamenite/shared";
import type { CheckersBoard } from "@gamenite/shared";

const COLS = 7;
const ROWS = 6;

/** Build an empty 6×7 Connect 4 board */
function emptyConnect4Board(): (Connect4Token | null)[][] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/** Fill a Connect 4 column top-to-bottom */
function fillColumn(board: (Connect4Token | null)[][], col: number): (Connect4Token | null)[][] {
  const b = board.map((r) => [...r]);
  for (let row = 0; row < ROWS; row++) b[row][col] = 0;
  return b;
}

// connect 4 bot

describe("getBotMove (Connect 4)", () => {
  it("returns a valid column index on an empty board", () => {
    const col = getBotMove(emptyConnect4Board());
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(COLS);
  });

  it("never picks a full column", () => {
    // Fill all columns except column 3
    let board = emptyConnect4Board();
    for (let col = 0; col < COLS; col++) {
      if (col !== 3) board = fillColumn(board, col);
    }
    // Run many times to rule out luck
    for (let i = 0; i < 50; i++) {
      expect(getBotMove(board)).toBe(3);
    }
  });

  it("only picks from the available columns", () => {
    const board = emptyConnect4Board();
    // Leave only columns 1 and 5 open
    for (const col of [0, 2, 3, 4, 6]) {
      board.forEach((row) => (row[col] = 0));
    }
    for (let i = 0; i < 50; i++) {
      const col = getBotMove(board);
      expect([1, 5]).toContain(col);
    }
  });

  it("returns an integer (not a float)", () => {
    const col = getBotMove(emptyConnect4Board());
    expect(Number.isInteger(col)).toBe(true);
  });

  it("CONNECT_4_BOT_USER_ID is the expected sentinel string", () => {
    expect(CONNECT_4_BOT_USER_ID).toBe("__connect4_bot__");
  });
});

// checkers bot

/** Build a blank 8×8 board */
function emptyCheckersBoard(): CheckersBoard {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

describe("getCheckersBotMove (Checkers)", () => {
  it("returns a move with a valid fromRow/fromCol and at least one step", () => {
    // Place one player-0 piece and give it somewhere to go
    const board = emptyCheckersBoard();
    board[6][1] = { player: 0, isKing: false };

    const move = getCheckersBotMove(board, 0);
    expect(move).toHaveProperty("fromRow", 6);
    expect(move).toHaveProperty("fromCol", 1);
    expect(move.steps.length).toBeGreaterThanOrEqual(1);
  });

  it("returns a capture move when one is available (mandatory capture)", () => {
    // Player 0 piece at (4,2), opponent at (3,3), empty landing at (2,4)
    const board = emptyCheckersBoard();
    board[4][2] = { player: 0, isKing: false };
    board[3][3] = { player: 1, isKing: false };

    // Run many times — mandatory capture means bot MUST jump
    for (let i = 0; i < 30; i++) {
      const move = getCheckersBotMove(board, 0);
      // A jump has step distance of 2 rows
      const firstStep = move.steps[0];
      expect(Math.abs(firstStep.row - move.fromRow)).toBe(2);
    }
  });

  it("each returned step is within board bounds", () => {
    const board = emptyCheckersBoard();
    board[6][1] = { player: 0, isKing: false };
    board[6][3] = { player: 0, isKing: false };

    for (let i = 0; i < 20; i++) {
      const move = getCheckersBotMove(board, 0);
      for (const step of move.steps) {
        expect(step.row).toBeGreaterThanOrEqual(0);
        expect(step.row).toBeLessThan(8);
        expect(step.col).toBeGreaterThanOrEqual(0);
        expect(step.col).toBeLessThan(8);
      }
    }
  });

  it("CHECKERS_BOT_USER_ID is the expected sentinel string", () => {
    expect(CHECKERS_BOT_USER_ID).toBe("__checkers_bot__");
  });
});

// guess bot

describe("getGuessBotMove (Guess)", () => {
  it("returns a number between 1 and 101 inclusive", () => {
    const move = getGuessBotMove({ secret: 50, guesses: [null, null] });
    expect(move).toBeGreaterThanOrEqual(1);
    expect(move).toBeLessThanOrEqual(101);
  });

  it("returns an integer", () => {
    const move = getGuessBotMove({ secret: 50, guesses: [null, null] });
    expect(Number.isInteger(move)).toBe(true);
  });

  it("never repeats a guess already in the state", () => {
    // Fill guesses 1–100, leaving only 101
    const existingGuesses = Array.from({ length: 100 }, (_, i) => i + 1);
    const move = getGuessBotMove({ secret: 50, guesses: existingGuesses });
    expect(move).toBe(101);
  });

  it("NUMBER_GUESSER_BOT_USER_IDS exports 4 distinct IDs", () => {
    expect(NUMBER_GUESSER_BOT_USER_IDS).toHaveLength(4);
    expect(new Set(NUMBER_GUESSER_BOT_USER_IDS).size).toBe(4);
  });

  it("NUMBER_GUESSER_BOT_USER_ID is the first entry in NUMBER_GUESSER_BOT_USER_IDS", () => {
    expect(NUMBER_GUESSER_BOT_USER_ID).toBe(NUMBER_GUESSER_BOT_USER_IDS[0]);
  });
});

// util

describe("coinFlip (util)", () => {
  it("returns a boolean", () => {
    expect(typeof coinFlip()).toBe("boolean");
  });

  it("returns both true and false across many flips", () => {
    // With 200 flips the probability of all-same is astronomically small
    const results = Array.from({ length: 200 }, coinFlip);
    expect(results.some(Boolean)).toBe(true);
    expect(results.some((v) => !v)).toBe(true);
  });

  it("returns false when Math.random returns exactly 0.5 (boundary)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(coinFlip()).toBe(false); // 0.5 < 0.5 is false
    vi.restoreAllMocks();
  });

  it("returns true when Math.random returns less than 0.5", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.49);
    expect(coinFlip()).toBe(true);
    vi.restoreAllMocks();
  });
});
