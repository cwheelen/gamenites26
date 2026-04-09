/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { describe, expect, it } from "vitest";
import { battleshipLogic } from "../../src/games/battleship.ts";
import type {
  BattleshipPlacingView,
  BattleshipShootingView,
  BattleshipState,
  BattleshipWatcherView,
  PlacedShip,
  PlayerBoardState,
} from "@gamenite/shared";
import { BOARD_SIZE, SHIPS } from "@gamenite/shared";

const VALID_PLACEMENT: PlacedShip[] = [
  { name: "Carrier", size: 5, row: 0, col: 0, horizontal: true },
  { name: "Battleship", size: 4, row: 1, col: 0, horizontal: true },
  { name: "Cruiser", size: 3, row: 2, col: 0, horizontal: true },
  { name: "Submarine", size: 3, row: 3, col: 0, horizontal: true },
  { name: "Destroyer", size: 2, row: 4, col: 0, horizontal: true },
];

const VALID_PLACEMENT_P1: PlacedShip[] = [
  { name: "Carrier", size: 5, row: 5, col: 0, horizontal: true },
  { name: "Battleship", size: 4, row: 6, col: 0, horizontal: true },
  { name: "Cruiser", size: 3, row: 7, col: 0, horizontal: true },
  { name: "Submarine", size: 3, row: 7, col: 3, horizontal: true },
  { name: "Destroyer", size: 2, row: 7, col: 6, horizontal: true },
];

/** An empty 10×10 boolean grid */
function emptyShots(): boolean[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
}

/** Shortcut: get the starting state */
function startState(): BattleshipState {
  return battleshipLogic.start(2);
}

function shootingState(): BattleshipState {
  let state = startState();
  state = battleshipLogic.update(state, { type: "place", ships: VALID_PLACEMENT }, 0)!;
  state = battleshipLogic.update(state, { type: "place", ships: VALID_PLACEMENT_P1 }, 1)!;
  return state;
}

describe("Battleship start()", () => {
  it("starts in the placing phase", () => {
    expect(startState().phase).toBe("placing");
  });

  it("initialises with neither player having placed", () => {
    expect(startState().placementDone).toStrictEqual([false, false]);
  });

  it("creates two boards with no ships and no shots", () => {
    const state = startState();
    expect(state.boards).toHaveLength(2);
    for (const board of state.boards) {
      expect(board.ships).toStrictEqual([]);
      expect(board.shotsReceived.flat().every((v) => !v)).toBe(true);
    }
  });

  it("assigns nextPlayer to 0 or 1", () => {
    expect([0, 1]).toContain(startState().nextPlayer);
  });
});

describe("Battleship update() — placement", () => {
  it("rejects a badly-typed move", () => {
    expect(battleshipLogic.update(startState(), null, 0)).toBeNull();
    expect(battleshipLogic.update(startState(), "place", 0)).toBeNull();
    expect(battleshipLogic.update(startState(), { type: "invalid" }, 0)).toBeNull();
  });

  it("accepts a valid placement for player 0", () => {
    const result = battleshipLogic.update(
      startState(),
      { type: "place", ships: VALID_PLACEMENT },
      0,
    );
    expect(result).not.toBeNull();
    expect(result!.placementDone[0]).toBe(true);
    expect(result!.placementDone[1]).toBe(false);
    expect(result!.phase).toBe("placing");
  });

  it("accepts a valid placement for player 1", () => {
    let state = startState();
    state = battleshipLogic.update(state, { type: "place", ships: VALID_PLACEMENT }, 0)!;
    const result = battleshipLogic.update(state, { type: "place", ships: VALID_PLACEMENT_P1 }, 1);
    expect(result).not.toBeNull();
    expect(result!.placementDone[1]).toBe(true);
  });

  it("transitions to 'shooting' once both players have placed", () => {
    const state = shootingState();
    expect(state.phase).toBe("shooting");
  });

  it("rejects placement with the wrong number of ships", () => {
    const tooFew = VALID_PLACEMENT.slice(0, 3);
    expect(battleshipLogic.update(startState(), { type: "place", ships: tooFew }, 0)).toBeNull();
  });

  it("rejects placement with a ship that has the wrong name", () => {
    const bad = VALID_PLACEMENT.map((s, i) => (i === 0 ? { ...s, name: "NotAShip" } : s));
    expect(battleshipLogic.update(startState(), { type: "place", ships: bad }, 0)).toBeNull();
  });

  it("rejects placement with overlapping ships", () => {
    const overlapping = VALID_PLACEMENT.map(
      (s, i) => (i === 1 ? { ...s, row: 0, col: 0 } : s), // Battleship overlaps Carrier
    );
    expect(
      battleshipLogic.update(startState(), { type: "place", ships: overlapping }, 0),
    ).toBeNull();
  });

  it("rejects placement with a ship out of bounds", () => {
    const oob = VALID_PLACEMENT.map(
      (s, i) => (i === 0 ? { ...s, col: 8, horizontal: true } : s), // Carrier size 5 starting at col 8 goes OOB
    );
    expect(battleshipLogic.update(startState(), { type: "place", ships: oob }, 0)).toBeNull();
  });

  it("rejects a second placement from the same player", () => {
    let state = startState();
    state = battleshipLogic.update(state, { type: "place", ships: VALID_PLACEMENT }, 0)!;
    const result = battleshipLogic.update(state, { type: "place", ships: VALID_PLACEMENT }, 0);
    expect(result).toBeNull();
  });

  it("rejects a shoot move during the placing phase", () => {
    expect(battleshipLogic.update(startState(), { type: "shoot", row: 0, col: 0 }, 0)).toBeNull();
  });
});

// ---- update() — shooting phase ----

describe("Battleship update() — shooting", () => {
  it("rejects a placement move during the shooting phase", () => {
    const state = shootingState();
    expect(battleshipLogic.update(state, { type: "place", ships: VALID_PLACEMENT }, 0)).toBeNull();
  });

  it("rejects a shoot from the wrong player", () => {
    const state = shootingState();
    const wrongPlayer = (1 - state.nextPlayer) as 0 | 1;
    expect(
      battleshipLogic.update(state, { type: "shoot", row: 0, col: 0 }, wrongPlayer),
    ).toBeNull();
  });

  it("accepts a valid shot and records it on the opponent's board", () => {
    const state = shootingState();
    const shooter = state.nextPlayer;
    const target = 1 - shooter;
    const result = battleshipLogic.update(state, { type: "shoot", row: 0, col: 0 }, shooter)!;
    expect(result.boards[target].shotsReceived[0][0]).toBe(true);
  });

  it("alternates turns after a shot", () => {
    const state = shootingState();
    const first = state.nextPlayer;
    const result = battleshipLogic.update(state, { type: "shoot", row: 9, col: 9 }, first)!;
    expect(result.nextPlayer).toBe(1 - first);
  });

  it("rejects shooting the same cell twice", () => {
    let state = shootingState();
    const shooter = state.nextPlayer;
    state = battleshipLogic.update(state, { type: "shoot", row: 0, col: 0 }, shooter)!;
    // Now it's the other player's turn — they shoot somewhere else so we get back to shooter
    state = battleshipLogic.update(
      state,
      { type: "shoot", row: 9, col: 9 },
      (1 - shooter) as 0 | 1,
    )!;
    // Try to shoot (0,0) again
    expect(battleshipLogic.update(state, { type: "shoot", row: 0, col: 0 }, shooter)).toBeNull();
  });

  it("transitions to 'done' when all opponent ships are sunk", () => {
    // Sink every cell of VALID_PLACEMENT_P1 (player 1's ships) as player 0
    let state = shootingState();
    // Collect all cells player 1's ships occupy
    const cellsToSink: [number, number][] = [];
    for (const ship of VALID_PLACEMENT_P1) {
      for (let i = 0; i < ship.size; i++) {
        cellsToSink.push(ship.horizontal ? [ship.row, ship.col + i] : [ship.row + i, ship.col]);
      }
    }

    let i = 0;
    while (i < cellsToSink.length) {
      const [row, col] = cellsToSink[i];
      const shooter = state.nextPlayer;
      if (shooter === 0) {
        state = battleshipLogic.update(state, { type: "shoot", row, col }, 0)!;
        i++; // only advance once player 0 has shot the target
      } else {
        // Player 1 shoots somewhere harmless to give turn back to player 0
        // Search from row 9 upward so we stay away from player 0's ships (rows 0-4)
        let safeShotMade = false;
        for (let r = BOARD_SIZE - 1; r >= 0 && !safeShotMade; r--) {
          const c = state.boards[0].shotsReceived[r].findIndex((v) => !v);
          if (c >= 0) {
            state = battleshipLogic.update(state, { type: "shoot", row: r, col: c }, 1)!;
            safeShotMade = true;
          }
        }
      }
    }

    expect(state.phase).toBe("done");
  });
});

describe("Battleship isDone()", () => {
  it("returns false during placing phase", () => {
    expect(battleshipLogic.isDone(startState())).toBe(false);
  });

  it("returns false during shooting phase", () => {
    expect(battleshipLogic.isDone(shootingState())).toBe(false);
  });

  it("returns true in the done phase", () => {
    const state: BattleshipState = { ...shootingState(), phase: "done" };
    expect(battleshipLogic.isDone(state)).toBe(true);
  });
});

describe("Battleship viewAs()", () => {
  it("returns a placing view with iPlaced=false before a player has placed", () => {
    const state = startState();
    const view = battleshipLogic.viewAs(state, 0) as BattleshipPlacingView;
    expect(view.phase).toBe("placing");
    expect(view.iPlaced).toBe(false);
    expect(view.opponentPlaced).toBe(false);
    expect(view.myBoard).toBeNull();
  });

  it("returns iPlaced=true and myBoard non-null after placing", () => {
    let state = startState();
    state = battleshipLogic.update(state, { type: "place", ships: VALID_PLACEMENT }, 0)!;
    const view = battleshipLogic.viewAs(state, 0) as BattleshipPlacingView;
    expect(view.phase).toBe("placing");
    expect(view.iPlaced).toBe(true);
    expect(view.myBoard).not.toBeNull();
  });

  it("returns a shooting view with myBoard and opponentBoard during shooting phase", () => {
    const state = shootingState();
    const view = battleshipLogic.viewAs(state, 0) as BattleshipShootingView;
    expect(view.phase).toBe("shooting");
    expect(view.myBoard).toHaveLength(BOARD_SIZE);
    expect(view.opponentBoard).toHaveLength(BOARD_SIZE);
  });

  it("hides unsunk opponent ships during shooting phase", () => {
    const state = shootingState();
    const view = battleshipLogic.viewAs(state, 0) as BattleshipShootingView;
    expect(view.opponentBoard.flat().every((c) => c === "unknown")).toBe(true);
  });

  it("returns a watcher view (playerIndex -1) with both boards visible", () => {
    const state = shootingState();
    const view = battleshipLogic.viewAs(state, -1) as BattleshipWatcherView;
    expect(view.phase).toBe("shooting");
    expect(view.board0).toBeDefined();
    expect(view.board1).toBeDefined();
  });
});

describe("Battleship tagView()", () => {
  it("tags the view with type 'battleship'", () => {
    const state = startState();
    const view = battleshipLogic.viewAs(state, 0);
    expect(battleshipLogic.tagView(view)).toStrictEqual({ type: "battleship", view });
  });
});

describe("Battleship getWinners()", () => {
  it("returns [] during placing phase", () => {
    expect(battleshipLogic.getWinners(startState())).toStrictEqual([]);
  });

  it("returns [] during shooting phase", () => {
    expect(battleshipLogic.getWinners(shootingState())).toStrictEqual([]);
  });

  it("returns [0] when player 0 has sunk all of player 1's ships", () => {
    // Manually build a done state where player 1's board is fully sunk
    const state = shootingState();
    const allShotBoard: boolean[][] = state.boards[1].shotsReceived.map((r) => r.map(() => true));
    const doneState: BattleshipState = {
      ...state,
      phase: "done",
      boards: [state.boards[0], { ...state.boards[1], shotsReceived: allShotBoard }],
    };
    expect(battleshipLogic.getWinners(doneState)).toStrictEqual([0]);
  });

  it("returns [1] when player 1 has sunk all of player 0's ships", () => {
    const state = shootingState();
    const allShotBoard: boolean[][] = state.boards[0].shotsReceived.map((r) => r.map(() => true));
    const doneState: BattleshipState = {
      ...state,
      phase: "done",
      boards: [{ ...state.boards[0], shotsReceived: allShotBoard }, state.boards[1]],
    };
    expect(battleshipLogic.getWinners(doneState)).toStrictEqual([1]);
  });
});
