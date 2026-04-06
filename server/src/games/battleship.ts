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

function makeGrid<T>(fill: T): T[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(fill) as T[]);
}

function validatePlacement(ships: PlacedShip[]): boolean {
  if (ships.length !== SHIPS.length) return false;

  const expected = [...SHIPS].sort((a, b) => a.name.localeCompare(b.name));
  const received = [...ships].sort((a, b) => a.name.localeCompare(b.name));
  for (let i = 0; i < expected.length; i++) {
    if (received[i].name !== expected[i].name) return false;
    if (received[i].size !== expected[i].size) return false;
  }

  if (!ships.every(shipInBounds)) return false;

  for (let i = 0; i < ships.length; i++) {
    for (let j = i + 1; j < ships.length; j++) {
      if (shipsOverlap(ships[i], ships[j])) return false;
    }
  }

  return true;
}

function isShipSunk(ship: PlacedShip, shotsReceived: boolean[][]): boolean {
  return shipCells(ship).every(([r, c]) => shotsReceived[r][c]);
}

function allShipsSunk(board: PlayerBoardState): boolean {
  return board.ships.every((ship) => isShipSunk(ship, board.shotsReceived));
}

function buildOwnBoard(board: PlayerBoardState): OwnBoardCell[][] {
  const grid = makeGrid<OwnBoardCell>("empty");

  for (const ship of board.ships) {
    for (const [r, c] of shipCells(ship)) {
      grid[r][c] = "ship";
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board.shotsReceived[r][c]) {
        grid[r][c] = grid[r][c] === "ship" ? "hit" : "miss";
      }
    }
  }

  return grid;
}

function buildOpponentBoard(board: PlayerBoardState): OpponentBoardCell[][] {
  const grid = makeGrid<OpponentBoardCell>("unknown");

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
        const isHit = board.ships.some((ship) =>
          shipCells(ship).some(([sr, sc]) => sr === r && sc === c),
        );
        grid[r][c] = isHit ? "hit" : "miss";
      }
    }
  }

  return grid;
}

function buildRevealedBoard(board: PlayerBoardState): OwnBoardCell[][] {
  return buildOwnBoard(board);
}

export const battleshipLogic: GameLogic<BattleshipState, BattleshipView> = {
  minPlayers: 2,
  maxPlayers: 2,

  start: (_numPlayers) => ({
    phase: "placing",
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

    if (move.data.type === "place") {
      if (state.phase !== "placing") return null;
      if (state.placementDone[playerIndex]) return null;
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

    if (move.data.type === "shoot") {
      if (state.phase !== "shooting") return null;
      if (state.nextPlayer !== playerIndex) return null;

      const { row, col } = move.data;
      const opponentIndex = 1 - playerIndex;
      const opponentBoard = state.boards[opponentIndex];

      if (opponentBoard.shotsReceived[row][col]) return null;

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

    const { row, col } = move.data;
    const opponentIndex = 1 - playerIndex;
    const opponentBoard = prevState.boards[opponentIndex];

    const isHit = opponentBoard.ships.some((ship) =>
      shipCells(ship).some(([r, c]) => r === row && c === col),
    );

    const newShotsReceived = opponentBoard.shotsReceived.map((r) => [...r]);
    newShotsReceived[row][col] = true;

    const sunkShip = opponentBoard.ships.find(
      (ship) =>
        isShipSunk({ ...ship }, newShotsReceived) && !isShipSunk(ship, opponentBoard.shotsReceived),
    );

    const colLetter = String.fromCharCode(65 + col);
    const coord = `${colLetter}${row + 1}`;

    if (sunkShip) return ` sank ${sunkShip.name} by shooting ${coord}!`;
    if (isHit) return ` hit at ${coord}`;
    return ` missed at ${coord}`;
  },

  getWinners: (state) => {
    if (state.phase !== "done") return [];
    if (allShipsSunk(state.boards[1])) return [0];
    if (allShipsSunk(state.boards[0])) return [1];
    return [];
  },
};

export const battleshipGameService = new GameService<BattleshipState, BattleshipView>(
  battleshipLogic,
);

// bot code

export const BATTLESHIP_BOT_USER_ID = "__battleship_bot__";

export function getBattleshipBotPlacement(): PlacedShip[] {
  const placed: PlacedShip[] = [];

  for (const ship of SHIPS) {
    let placedShip: PlacedShip;

    while (true) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(
        Math.random() * (horizontal ? BOARD_SIZE : BOARD_SIZE - ship.size + 1),
      );
      const col = Math.floor(
        Math.random() * (horizontal ? BOARD_SIZE - ship.size + 1 : BOARD_SIZE),
      );
      placedShip = { ...ship, row, col, horizontal };

      const overlaps = placed.some((p) => shipsOverlap(p, placedShip));
      if (!overlaps && shipInBounds(placedShip)) break;
    }

    placed.push(placedShip);
  }

  return placed;
}

export function getBattleshipBotShot(
  state: BattleshipState,
  botIndex: number,
): { row: number; col: number } {
  const opponentIndex = 1 - botIndex;
  const shotsReceived = state.boards[opponentIndex].shotsReceived;
  const available: { row: number; col: number }[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!shotsReceived[row][col]) available.push({ row, col });
    }
  }

  return available[Math.floor(Math.random() * available.length)];
}
