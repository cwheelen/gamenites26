import {
  BOARD_SIZE,
  SHIPS,
  type BattleshipState,
  type BattleshipView,
  type OwnBoardCell,
  type OpponentBoardCell,
  type PlacedShip,
  type PlayerBoardState,
  zBattleshipMove,
  shipCells,
  shipInBounds,
  shipsOverlap,
} from "@gamenite/shared";
import { type GameLogic } from "./gameLogic.ts";
import { GameService } from "./gameServiceManager.ts";
import { coinFlip } from "./util.ts";

// Board helpers
/** Creates a fresh 10x10 grid filled with a value */
function makeGrid<T>(fill: T): T[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(fill) as T[]);
}

/**
 * Validates a full ship placement submission:
 * - Must contain exactly the required ships (by name and size)
 * - All ships must be within bounds
 * - No ships may overlap
 */
function validatePlacement(ships: PlacedShip[]): boolean {
  // Check correct set of ships
  if (ships.length !== SHIPS.length) return false;

  const expected = [...SHIPS].sort((a, b) => a.name.localeCompare(b.name));
  const received = [...ships].sort((a, b) => a.name.localeCompare(b.name));
  for (let i = 0; i < expected.length; i++) {
    if (received[i].name !== expected[i].name) return false;
    if (received[i].size !== expected[i].size) return false;
  }

  // Check bounds
  if (!ships.every(shipInBounds)) return false;

  // Check no overlaps
  for (let i = 0; i < ships.length; i++) {
    for (let j = i + 1; j < ships.length; j++) {
      if (shipsOverlap(ships[i], ships[j])) return false;
    }
  }

  return true;
}

/** Returns true if a ship has been fully sunk (all its cells have been shot) */
function isShipSunk(ship: PlacedShip, shotsReceived: boolean[][]): boolean {
  return shipCells(ship).every(([r, c]) => shotsReceived[r][c]);
}

/** Returns true if all ships for a board have been sunk */
function allShipsSunk(board: PlayerBoardState): boolean {
  return board.ships.every((ship) => isShipSunk(ship, board.shotsReceived));
}

// View builders

/** Build an OwnBoardCell grid for a player — shows their ships and received shots */
function buildOwnBoard(board: PlayerBoardState): OwnBoardCell[][] {
  const grid = makeGrid<OwnBoardCell>("empty");

  // Mark ship cells
  for (const ship of board.ships) {
    for (const [r, c] of shipCells(ship)) {
      grid[r][c] = "ship";
    }
  }

  // Overlay shots received
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board.shotsReceived[r][c]) {
        grid[r][c] = grid[r][c] === "ship" ? "hit" : "miss";
      }
    }
  }

  return grid;
}

/**
 * Build an OpponentBoardCell grid for a player looking at their opponent's board.
 * They can only see hits, misses, and fully-sunk ships — not unsunk ship locations.
 */
function buildOpponentBoard(board: PlayerBoardState): OpponentBoardCell[][] {
  const grid = makeGrid<OpponentBoardCell>("unknown");

  // Determine which ships are sunk
  const sunkCells = new Set<string>();
  for (const ship of board.ships) {
    if (isShipSunk(ship, board.shotsReceived)) {
      for (const [r, c] of shipCells(ship)) {
        sunkCells.add(`${r},${c}`);
      }
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!board.shotsReceived[r][c]) continue;

      if (sunkCells.has(`${r},${c}`)) {
        grid[r][c] = "sunk";
      } else {
        // Was it a hit or miss? Check if any ship occupies this cell
        const isHit = board.ships.some((ship) =>
          shipCells(ship).some(([sr, sc]) => sr === r && sc === c),
        );
        grid[r][c] = isHit ? "hit" : "miss";
      }
    }
  }

  return grid;
}

/**
 * Build a fully-revealed OwnBoardCell grid for the done phase,
 * where all ships (including unsunk ones) are shown.
 * This is the same as buildOwnBoard since OwnBoard always shows ships.
 */
function buildRevealedBoard(board: PlayerBoardState): OwnBoardCell[][] {
  return buildOwnBoard(board);
}

// Game logic

export const battleshipLogic: GameLogic<BattleshipState, BattleshipView> = {
  minPlayers: 2,
  maxPlayers: 2,

  start: (_numPlayers) => ({
    phase: "placing",
    // Randomly decide who shoots first once the shooting phase begins
    nextPlayer: coinFlip() ? 0 : 1,
    placementDone: [false, false],
    boards: [
      { ships: [], shotsReceived: makeGrid(false) },
      { ships: [], shotsReceived: makeGrid(false) },
    ],
  }),

  update: (state, movePayload, playerIndex) => {
    const move = zBattleshipMove.safeParse(movePayload);
    if (move.error) return null;

    // Placement phase
    if (move.data.type === "place") {
      if (state.phase !== "placing") return null;
      if (state.placementDone[playerIndex]) return null; // already placed
      if (!validatePlacement(move.data.ships)) return null;

      const newBoards: [PlayerBoardState, PlayerBoardState] = [
        { ...state.boards[0], shotsReceived: state.boards[0].shotsReceived.map((r) => [...r]) },
        { ...state.boards[1], shotsReceived: state.boards[1].shotsReceived.map((r) => [...r]) },
      ];
      newBoards[playerIndex] = {
        ships: move.data.ships,
        shotsReceived: makeGrid(false),
      };

      const newPlacementDone = [...state.placementDone] as [boolean, boolean];
      newPlacementDone[playerIndex] = true;

      const bothPlaced = newPlacementDone.every(Boolean);

      return {
        ...state,
        phase: bothPlaced ? "shooting" : "placing",
        placementDone: newPlacementDone,
        boards: newBoards,
      };
    }

    // Shooting phase
    if (move.data.type === "shoot") {
      if (state.phase !== "shooting") return null;
      if (state.nextPlayer !== playerIndex) return null; // not your turn

      const { row, col } = move.data;
      const opponentIndex = 1 - playerIndex;
      const opponentBoard = state.boards[opponentIndex];

      // Can't shoot the same cell twice
      if (opponentBoard.shotsReceived[row][col]) return null;

      // Apply the shot
      const newShotsReceived = opponentBoard.shotsReceived.map((r) => [...r]);
      newShotsReceived[row][col] = true;

      const newBoards: [PlayerBoardState, PlayerBoardState] = [
        { ...state.boards[0], shotsReceived: state.boards[0].shotsReceived.map((r) => [...r]) },
        { ...state.boards[1], shotsReceived: state.boards[1].shotsReceived.map((r) => [...r]) },
      ];
      newBoards[opponentIndex] = {
        ships: opponentBoard.ships,
        shotsReceived: newShotsReceived,
      };

      const gameOver = allShipsSunk(newBoards[opponentIndex]);

      return {
        ...state,
        phase: gameOver ? "done" : "shooting",
        nextPlayer: gameOver ? state.nextPlayer : ((1 - playerIndex) as 0 | 1),
        boards: newBoards,
      };
    }

    return null;
  },

  isDone: (state) => state.phase === "done",

  viewAs: (state, playerIndex) => {
    // Watcher view
    if (playerIndex === -1) {
      return {
        phase: state.phase,
        board0: buildOwnBoard(state.boards[0]),
        board1: buildOwnBoard(state.boards[1]),
        nextPlayer: state.phase === "shooting" ? state.nextPlayer : null,
      } satisfies BattleshipView;
    }

    const opponentIndex = 1 - playerIndex;

    if (state.phase === "placing") {
      return {
        phase: "placing",
        iPlaced: state.placementDone[playerIndex],
        opponentPlaced: state.placementDone[opponentIndex],
        myBoard: state.placementDone[playerIndex] ? buildOwnBoard(state.boards[playerIndex]) : null,
      } satisfies BattleshipView;
    }

    if (state.phase === "shooting") {
      return {
        phase: "shooting",
        myTurn: state.nextPlayer === playerIndex,
        myBoard: buildOwnBoard(state.boards[playerIndex]),
        opponentBoard: buildOpponentBoard(state.boards[opponentIndex]),
      } satisfies BattleshipView;
    }

    // Done
    return {
      phase: "done",
      iWon: allShipsSunk(state.boards[opponentIndex]),
      myBoard: buildOwnBoard(state.boards[playerIndex]),
      opponentBoard: buildRevealedBoard(state.boards[opponentIndex]),
    } satisfies BattleshipView;
  },

  tagView: (view) => ({ type: "battleship", view }),

  describeMove: (prevState, _newState, movePayload, playerIndex) => {
    const move = zBattleshipMove.safeParse(movePayload);
    if (move.error) return " made a move";

    if (move.data.type === "place") {
      return " finished placing ships";
    }

    // Shoot move — describe the result
    const { row, col } = move.data;
    const opponentIndex = 1 - playerIndex;
    const opponentBoard = prevState.boards[opponentIndex];

    // Was it a hit?
    const isHit = opponentBoard.ships.some((ship) =>
      shipCells(ship).some(([r, c]) => r === row && c === col),
    );

    // Did it sink a ship? Check the new board state
    // We re-derive by simulating the shot on the previous state
    const newShotsReceived = opponentBoard.shotsReceived.map((r) => [...r]);
    newShotsReceived[row][col] = true;

    const sunkShip = opponentBoard.ships.find(
      (ship) =>
        isShipSunk({ ...ship }, newShotsReceived) && !isShipSunk(ship, opponentBoard.shotsReceived),
    );

    const colLetter = String.fromCharCode(65 + col); // A-J
    const coord = `${colLetter}${row + 1}`;

    if (sunkShip) return ` sank ${sunkShip.name} by shooting ${coord}!`;
    if (isHit) return ` hit at ${coord}`;
    return ` missed at ${coord}`;
  },

  getWinners: (state) => {
    if (state.phase !== "done") return [];
    // The winner is the player who just shot — i.e. the one whose turn it was
    // (nextPlayer is unchanged from the last shot that ended the game)
    if (allShipsSunk(state.boards[1])) return [0];
    if (allShipsSunk(state.boards[0])) return [1];
    return [];
  },
};

export const battleshipGameService = new GameService<BattleshipState, BattleshipView>(
  battleshipLogic,
);
