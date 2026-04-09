import { describe, expect, it } from "vitest";
import { checkersLogic } from "../../src/games/checkers.ts";
import type { CheckersBoard, CheckersPiece, CheckersState } from "@gamenite/shared";
import { CHECKERS_BOARD_SIZE, CHECKERS_INITIAL_ROWS } from "@gamenite/shared";

/** Build a blank 8×8 board (all nulls) */
function blankBoard(): CheckersBoard {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Array.from({ length: CHECKERS_BOARD_SIZE }, () => Array(CHECKERS_BOARD_SIZE).fill(null));
}

/** Convenience piece constructors */
const p0 = (isKing = false): CheckersPiece => ({ player: 0, isKing });
const p1 = (isKing = false): CheckersPiece => ({ player: 1, isKing });

/** A minimal ongoing state with player 0 to move */
function baseState(board: CheckersBoard, nextPlayer: 0 | 1 = 0): CheckersState {
  return { board, nextPlayer, drawCounter: 0, isDraw: false, winner: null };
}

describe("Checkers start()", () => {
  it("produces an 8×8 board", () => {
    const state = checkersLogic.start(2);
    expect(state.board).toHaveLength(8);
    for (const row of state.board) expect(row).toHaveLength(8);
  });

  it("places player 1 pieces in the first 3 rows on dark squares only", () => {
    const state = checkersLogic.start(2);
    for (let row = 0; row < CHECKERS_INITIAL_ROWS; row++) {
      for (let col = 0; col < CHECKERS_BOARD_SIZE; col++) {
        const isDark = (row + col) % 2 === 1;
        if (isDark) {
          expect(state.board[row][col]).toStrictEqual({ player: 1, isKing: false });
        } else {
          expect(state.board[row][col]).toBeNull();
        }
      }
    }
  });

  it("places player 0 pieces in the last 3 rows on dark squares only", () => {
    const state = checkersLogic.start(2);
    for (let row = CHECKERS_BOARD_SIZE - CHECKERS_INITIAL_ROWS; row < CHECKERS_BOARD_SIZE; row++) {
      for (let col = 0; col < CHECKERS_BOARD_SIZE; col++) {
        const isDark = (row + col) % 2 === 1;
        if (isDark) {
          expect(state.board[row][col]).toStrictEqual({ player: 0, isKing: false });
        } else {
          expect(state.board[row][col]).toBeNull();
        }
      }
    }
  });

  it("leaves the middle 2 rows empty", () => {
    const state = checkersLogic.start(2);
    for (
      let row = CHECKERS_INITIAL_ROWS;
      row < CHECKERS_BOARD_SIZE - CHECKERS_INITIAL_ROWS;
      row++
    ) {
      for (let col = 0; col < CHECKERS_BOARD_SIZE; col++) {
        expect(state.board[row][col]).toBeNull();
      }
    }
  });

  it("starts with no winner and no draw", () => {
    const state = checkersLogic.start(2);
    expect(state.winner).toBeNull();
    expect(state.isDraw).toBe(false);
    expect(state.drawCounter).toBe(0);
  });

  it("assigns the first move to player 0 or player 1 (random but valid)", () => {
    const state = checkersLogic.start(2);
    expect([0, 1]).toContain(state.nextPlayer);
  });
});

describe("Checkers update()", () => {
  it("rejects a badly-typed move payload", () => {
    const state = checkersLogic.start(2);
    expect(checkersLogic.update(state, null, state.nextPlayer)).toBeNull();
    expect(checkersLogic.update(state, "invalid", state.nextPlayer)).toBeNull();
    expect(checkersLogic.update(state, { fromRow: 0 }, state.nextPlayer)).toBeNull();
  });

  it("rejects a move by the wrong player", () => {
    const state = checkersLogic.start(2);
    const wrongPlayer = (1 - state.nextPlayer) as 0 | 1;
    const legalMove = checkersLogic.viewAs(state, state.nextPlayer).legalMoves[0];
    expect(checkersLogic.update(state, legalMove, wrongPlayer)).toBeNull();
  });

  it("rejects a move when the game is already won", () => {
    const board = blankBoard();
    board[5][1] = p0();
    const state: CheckersState = { ...baseState(board), winner: 0 };
    const move = { fromRow: 5, fromCol: 1, steps: [{ row: 4, col: 2 }] };
    expect(checkersLogic.update(state, move, 0)).toBeNull();
  });

  it("rejects a move from an empty square", () => {
    const board = blankBoard();
    board[5][1] = p0();
    const state = baseState(board, 0);
    const move = { fromRow: 4, fromCol: 2, steps: [{ row: 3, col: 3 }] };
    expect(checkersLogic.update(state, move, 0)).toBeNull();
  });

  it("rejects a move from an opponent's piece", () => {
    const board = blankBoard();
    board[2][1] = p1();
    board[5][1] = p0();
    const state = baseState(board, 0);
    // Try to move the player 1 piece as player 0
    const move = { fromRow: 2, fromCol: 1, steps: [{ row: 3, col: 2 }] };
    expect(checkersLogic.update(state, move, 0)).toBeNull();
  });

  it("accepts a valid simple move and updates the board", () => {
    // Player 0 piece at (5,1) can move diagonally to (4,2)
    const board = blankBoard();
    board[5][1] = p0();
    const state = baseState(board, 0);
    const move = { fromRow: 5, fromCol: 1, steps: [{ row: 4, col: 2 }] };
    const result = checkersLogic.update(state, move, 0);
    expect(result).not.toBeNull();
    expect(result!.board[5][1]).toBeNull();
    expect(result!.board[4][2]).toStrictEqual(p0());
  });

  it("switches the active player after a valid simple move", () => {
    const board = blankBoard();
    board[5][1] = p0();
    board[2][2] = p1();
    const state = baseState(board, 0);
    const move = { fromRow: 5, fromCol: 1, steps: [{ row: 4, col: 2 }] };
    const result = checkersLogic.update(state, move, 0)!;
    expect(result.nextPlayer).toBe(1);
  });

  it("enforces mandatory capture — rejects a simple move when a jump is available", () => {
    // Player 0 at (4,1), player 1 at (3,2) — a jump to (2,3) is available
    const board = blankBoard();
    board[4][1] = p0();
    board[3][2] = p1();
    const state = baseState(board, 0);
    // Simple move (instead of jumping) must be rejected
    const simpleMove = { fromRow: 4, fromCol: 1, steps: [{ row: 3, col: 0 }] };
    expect(checkersLogic.update(state, simpleMove, 0)).toBeNull();
  });

  it("accepts a capture move, removes the captured piece", () => {
    const board = blankBoard();
    board[4][1] = p0();
    board[3][2] = p1();
    const state = baseState(board, 0);
    const jump = { fromRow: 4, fromCol: 1, steps: [{ row: 2, col: 3 }] };
    const result = checkersLogic.update(state, jump, 0)!;
    expect(result.board[4][1]).toBeNull(); // piece left
    expect(result.board[3][2]).toBeNull(); // captured piece removed
    expect(result.board[2][3]).toStrictEqual(p0()); // piece landed
  });

  it("promotes a piece to king when it reaches the back rank", () => {
    // Player 0 moves upward (decreasing row); back rank for player 0 is row 0
    const board = blankBoard();
    board[1][1] = p0();
    const state = baseState(board, 0);
    const move = { fromRow: 1, fromCol: 1, steps: [{ row: 0, col: 2 }] };
    const result = checkersLogic.update(state, move, 0)!;
    expect(result.board[0][2]).toStrictEqual(p0(true)); // now a king
  });

  it("detects a win when the opponent has no pieces left", () => {
    // Player 0 captures the last player 1 piece
    const board = blankBoard();
    board[4][1] = p0();
    board[3][2] = p1(); // the only player 1 piece
    const state = baseState(board, 0);
    const jump = { fromRow: 4, fromCol: 1, steps: [{ row: 2, col: 3 }] };
    const result = checkersLogic.update(state, jump, 0)!;
    expect(result.winner).toBe(0);
  });

  it("increments the draw counter on a non-capture, non-king move", () => {
    const board = blankBoard();
    board[5][1] = p0();
    board[2][2] = p1();
    const state: CheckersState = { ...baseState(board, 0), drawCounter: 10 };
    const move = { fromRow: 5, fromCol: 1, steps: [{ row: 4, col: 2 }] };
    const result = checkersLogic.update(state, move, 0)!;
    expect(result.drawCounter).toBe(11);
  });

  it("resets the draw counter after a capture", () => {
    const board = blankBoard();
    board[4][1] = p0();
    board[3][2] = p1();
    const state: CheckersState = { ...baseState(board, 0), drawCounter: 20 };
    const jump = { fromRow: 4, fromCol: 1, steps: [{ row: 2, col: 3 }] };
    const result = checkersLogic.update(state, jump, 0)!;
    expect(result.drawCounter).toBe(0);
  });
});

describe("Checkers isDone()", () => {
  it("returns false for a fresh game", () => {
    expect(checkersLogic.isDone(checkersLogic.start(2))).toBe(false);
  });

  it("returns true when there is a winner", () => {
    const state: CheckersState = {
      ...baseState(blankBoard()),
      winner: 1,
    };
    expect(checkersLogic.isDone(state)).toBe(true);
  });

  it("returns true when isDraw is set", () => {
    const state: CheckersState = {
      ...baseState(blankBoard()),
      isDraw: true,
    };
    expect(checkersLogic.isDone(state)).toBe(true);
  });

  it("returns false when the game is still ongoing", () => {
    const board = blankBoard();
    board[5][1] = p0();
    board[2][2] = p1();
    expect(checkersLogic.isDone(baseState(board))).toBe(false);
  });
});

describe("Checkers viewAs()", () => {
  it("includes legal moves for the current player", () => {
    const board = blankBoard();
    board[5][1] = p0();
    const state = baseState(board, 0);
    const view = checkersLogic.viewAs(state, 0);
    expect(view.legalMoves.length).toBeGreaterThan(0);
  });

  it("returns an empty legalMoves array when the game is over", () => {
    const board = blankBoard();
    const state: CheckersState = { ...baseState(board), winner: 0 };
    const view = checkersLogic.viewAs(state, 0);
    expect(view.legalMoves).toStrictEqual([]);
  });

  it("exposes the full board, nextPlayer, drawCounter, isDraw, and winner", () => {
    const state = checkersLogic.start(2);
    const view = checkersLogic.viewAs(state, 0);
    expect(view.board).toStrictEqual(state.board);
    expect(view.nextPlayer).toBe(state.nextPlayer);
    expect(view.drawCounter).toBe(state.drawCounter);
    expect(view.isDraw).toBe(state.isDraw);
    expect(view.winner).toBe(state.winner);
  });

  it("returns the same view for watchers (playerIndex -1) as for players", () => {
    const state = checkersLogic.start(2);
    const playerView = checkersLogic.viewAs(state, 0);
    const watcherView = checkersLogic.viewAs(state, -1);
    // Both should expose the full board and legal moves
    expect(watcherView.board).toStrictEqual(playerView.board);
    expect(watcherView.nextPlayer).toBe(playerView.nextPlayer);
  });
});

describe("Checkers tagView()", () => {
  it("tags the view with type 'checkers'", () => {
    const state = checkersLogic.start(2);
    const view = checkersLogic.viewAs(state, 0);
    expect(checkersLogic.tagView(view)).toStrictEqual({ type: "checkers", view });
  });
});

describe("Checkers getWinners()", () => {
  it("returns [] when the game is ongoing", () => {
    expect(checkersLogic.getWinners(checkersLogic.start(2))).toStrictEqual([]);
  });

  it("returns [] on a draw", () => {
    const state: CheckersState = { ...baseState(blankBoard()), isDraw: true };
    expect(checkersLogic.getWinners(state)).toStrictEqual([]);
  });

  it("returns [0] when player 0 wins", () => {
    const state: CheckersState = { ...baseState(blankBoard()), winner: 0 };
    expect(checkersLogic.getWinners(state)).toStrictEqual([0]);
  });

  it("returns [1] when player 1 wins", () => {
    const state: CheckersState = { ...baseState(blankBoard()), winner: 1 };
    expect(checkersLogic.getWinners(state)).toStrictEqual([1]);
  });
});
