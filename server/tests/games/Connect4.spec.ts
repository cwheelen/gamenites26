import { describe, expect, it } from "vitest";
import { connect4Logic } from "../../src/games/connect4.ts";
import type { Connect4State } from "@gamenite/shared";

type Cell = 0 | 1 | null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeBoard(rows: Cell[][]): Cell[][] {
  return rows;
}

/** Build an empty 6×7 board */
function emptyBoard(): Cell[][] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Array.from({ length: 6 }, () => Array(7).fill(null));
}

/** A minimal valid starting state */
function startState(): Connect4State {
  return { board: emptyBoard(), nextPlayer: 0, winner: null };
}

describe("Connect 4 start()", () => {
  it("produces an empty 6×7 board with player 0 to move and no winner", () => {
    const state = connect4Logic.start(2);
    expect(state.nextPlayer).toBe(0);
    expect(state.winner).toBeNull();
    expect(state.board).toHaveLength(6);
    for (const row of state.board) {
      expect(row).toHaveLength(7);
      expect(row.every((cell) => cell === null)).toBe(true);
    }
  });
});

describe("Connect 4 update()", () => {
  it("rejects a non-numeric move", () => {
    expect(connect4Logic.update(startState(), "bad", 0)).toBeNull();
    expect(connect4Logic.update(startState(), null, 0)).toBeNull();
    expect(connect4Logic.update(startState(), { col: 0 }, 0)).toBeNull();
  });

  it("rejects a column index out of range", () => {
    expect(connect4Logic.update(startState(), -1, 0)).toBeNull();
    expect(connect4Logic.update(startState(), 7, 0)).toBeNull();
  });

  it("rejects a move by the wrong player", () => {
    expect(connect4Logic.update(startState(), 0, 1)).toBeNull();
  });

  it("rejects a move when there is already a winner", () => {
    const state: Connect4State = { ...startState(), winner: 0 };
    expect(connect4Logic.update(state, 0, 0)).toBeNull();
  });

  it("places a token in the bottom row of an empty column", () => {
    const result = connect4Logic.update(startState(), 3, 0);
    expect(result).not.toBeNull();
    expect(result!.board[5][3]).toBe(0);
  });

  it("stacks tokens correctly — second token lands on top of the first", () => {
    let state = startState();
    state = connect4Logic.update(state, 3, 0)!;
    state = connect4Logic.update(state, 3, 1)!;
    expect(state.board[5][3]).toBe(0);
    expect(state.board[4][3]).toBe(1);
  });

  it("alternates the active player after each valid move", () => {
    let state = startState();
    expect(state.nextPlayer).toBe(0);
    state = connect4Logic.update(state, 0, 0)!;
    expect(state.nextPlayer).toBe(1);
    state = connect4Logic.update(state, 1, 1)!;
    expect(state.nextPlayer).toBe(0);
  });

  it("rejects a move into a full column", () => {
    // Fill column 0 with alternating tokens
    let state = startState();
    for (let i = 0; i < 6; i++) {
      state = connect4Logic.update(state, 0, state.nextPlayer)!;
    }
    // Column 0 is now full
    expect(connect4Logic.update(state, 0, state.nextPlayer)).toBeNull();
  });

  it("detects a horizontal win", () => {
    // p0 in cols 0-3 bottom row, p1 in cols 0-3 second-from-bottom row
    const board = emptyBoard();
    board[5][0] = 0;
    board[5][1] = 0;
    board[5][2] = 0;
    const state: Connect4State = { board, nextPlayer: 0, winner: null };
    const result = connect4Logic.update(state, 3, 0)!;
    expect(result.winner).toBe(0);
  });

  it("detects a vertical win", () => {
    const board = emptyBoard();
    board[5][0] = 0;
    board[4][0] = 0;
    board[3][0] = 0;
    const state: Connect4State = { board, nextPlayer: 0, winner: null };
    const result = connect4Logic.update(state, 0, 0)!;
    expect(result.winner).toBe(0);
  });

  it("detects a diagonal win (bottom-left to top-right)", () => {
    const board = emptyBoard();
    // Pre-place three diagonal tokens for player 0 at (5,0), (4,1), (3,2)
    board[5][0] = 0;
    board[4][1] = 0;
    board[3][2] = 0;
    // Need a filler piece at (5,3), (4,3), (3,3) for col 3 to stack correctly
    board[5][3] = 1;
    board[4][3] = 1;
    board[3][3] = 1;
    const state: Connect4State = { board, nextPlayer: 0, winner: null };
    const result = connect4Logic.update(state, 3, 0)!;
    expect(result.winner).toBe(0);
  });

  it("does not declare a winner for a non-winning move", () => {
    const result = connect4Logic.update(startState(), 0, 0)!;
    expect(result.winner).toBeNull();
  });
});

// ---- isDone() ----

describe("Connect 4 isDone()", () => {
  it("returns false for an empty board", () => {
    expect(connect4Logic.isDone(startState())).toBe(false);
  });

  it("returns true when there is a winner", () => {
    const state: Connect4State = { ...startState(), winner: 1 };
    expect(connect4Logic.isDone(state)).toBe(true);
  });

  it("returns true when the top row is completely full (draw)", () => {
    const board = emptyBoard();
    // Fill the entire top row to trigger the draw condition
    for (let col = 0; col < 7; col++) {
      board[0][col] = col % 2 === 0 ? 0 : 1;
    }
    const state: Connect4State = { board, nextPlayer: 0, winner: null };
    expect(connect4Logic.isDone(state)).toBe(true);
  });

  it("returns false when the top row has at least one empty cell", () => {
    const board = emptyBoard();
    for (let col = 0; col < 6; col++) {
      board[0][col] = 0;
    }
    // board[0][6] is still null
    const state: Connect4State = { board, nextPlayer: 0, winner: null };
    expect(connect4Logic.isDone(state)).toBe(false);
  });
});

describe("Connect 4 viewAs()", () => {
  it("returns the full state unchanged for any player index", () => {
    const state = startState();
    expect(connect4Logic.viewAs(state, 0)).toStrictEqual(state);
    expect(connect4Logic.viewAs(state, 1)).toStrictEqual(state);
    expect(connect4Logic.viewAs(state, -1)).toStrictEqual(state);
  });
});

describe("Connect 4 tagView()", () => {
  it("tags the view with type 'connect4'", () => {
    const state = startState();
    expect(connect4Logic.tagView(state)).toStrictEqual({ type: "connect4", view: state });
  });
});

// ---- getWinners() ----

describe("Connect 4 getWinners()", () => {
  it("returns an empty array when there is no winner", () => {
    expect(connect4Logic.getWinners(startState())).toStrictEqual([]);
  });

  it("returns [0] when player 0 wins", () => {
    const state: Connect4State = { ...startState(), winner: 0 };
    expect(connect4Logic.getWinners(state)).toStrictEqual([0]);
  });

  it("returns [1] when player 1 wins", () => {
    const state: Connect4State = { ...startState(), winner: 1 };
    expect(connect4Logic.getWinners(state)).toStrictEqual([1]);
  });
});

describe("Connect 4 describeMove()", () => {
  it("describes a regular move by column number", () => {
    const prev = startState();
    const next = connect4Logic.update(prev, 2, 0)!;
    const desc = connect4Logic.describeMove(prev, next, 2, 0);
    expect(desc).toContain("column 3"); // 0-indexed col 2 → "column 3"
  });

  it("mentions the win when a move ends the game", () => {
    const board = emptyBoard();
    board[5][0] = 0;
    board[5][1] = 0;
    board[5][2] = 0;
    const prev: Connect4State = { board, nextPlayer: 0, winner: null };
    const next = connect4Logic.update(prev, 3, 0)!;
    const desc = connect4Logic.describeMove(prev, next, 3, 0);
    expect(desc).toContain("won");
  });
});
