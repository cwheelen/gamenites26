/** Returns all [row, col] cells occupied by a ship */
export function shipCells(ship: PlacedShip): [number, number][] {
  return Array.from({ length: ship.size }, (_, i) =>
    ship.horizontal
      ? ([ship.row, ship.col + i] as [number, number])
      : ([ship.row + i, ship.col] as [number, number]),
  );
}

/** Returns true if the ship fits within the board boundaries */
export function shipInBounds(ship: PlacedShip): boolean {
  if (ship.horizontal) {
    return ship.row < BOARD_SIZE && ship.col + ship.size <= BOARD_SIZE;
  }
  return ship.col < BOARD_SIZE && ship.row + ship.size <= BOARD_SIZE;
}

/** Returns true if two ships overlap */
export function shipsOverlap(a: PlacedShip, b: PlacedShip): boolean {
  const cellsA = new Set(shipCells(a).map(([r, c]) => `${r},${c}`));
  return shipCells(b).some(([r, c]) => cellsA.has(`${r},${c}`));
}
import { z } from "zod";

// Constants

export const BOARD_SIZE = 10;

export const SHIPS: { name: string; size: number }[] = [
  { name: "Carrier", size: 5 },
  { name: "Battleship", size: 4 },
  { name: "Cruiser", size: 3 },
  { name: "Submarine", size: 3 },
  { name: "Destroyer", size: 2 },
];

// Cell types

/**
 * What a player sees in each cell of their own board (the board they placed ships on)
 */
export type OwnBoardCell =
  | "empty" // no ship, not shot at
  | "ship" // ship present, not shot at
  | "hit" // ship present and shot at
  | "miss"; // no ship, but was shot at

/**
 * What a player sees in each cell of the opponent's board (the board they are shooting at).
 * They cannot see where the opponent's ships are until they are sunk.
 */
export type OpponentBoardCell =
  | "unknown" // not shot at yet
  | "hit" // shot and hit a ship
  | "miss" // shot and missed
  | "sunk"; // part of a fully-sunk ship

// Ship placement

/**
 * A placed ship on the board
 */
export interface PlacedShip {
  name: string;
  size: number;
  /** Top-left row (0-indexed) */
  row: number;
  /** Top-left column (0-indexed) */
  col: number;
  /** true = horizontal, false = vertical */
  horizontal: boolean;
}

// Moves

/**
 * A move in Battleship is one of:
 * - "place": place all ships before the game begins shooting phase
 * - "shoot": fire at a coordinate on the opponent's board
 */
export type BattleshipMove = z.infer<typeof zBattleshipMove>;

export const zPlacedShip = z.object({
  name: z.string(),
  size: z.int().gte(1),
  row: z.int().gte(0).lt(BOARD_SIZE),
  col: z.int().gte(0).lt(BOARD_SIZE),
  horizontal: z.boolean(),
});

export const zPlaceMove = z.object({
  type: z.literal("place"),
  ships: z.array(zPlacedShip),
});

export const zShootMove = z.object({
  type: z.literal("shoot"),
  row: z.int().gte(0).lt(BOARD_SIZE),
  col: z.int().gte(0).lt(BOARD_SIZE),
});

export const zBattleshipMove = z.union([zPlaceMove, zShootMove]);

// Game phases

/**
 * "placing": both players are placing their ships (not yet in the shooting phase)
 * "shooting": both players have placed; they now alternate shooting
 * "done": the game is over
 */
export type BattleshipPhase = "placing" | "shooting" | "done";

// Internal game state

/**
 * The full internal state of one player's half of the board.
 * This is never sent directly to the client.
 */
export interface PlayerBoardState {
  /** The ships this player placed */
  ships: PlacedShip[];
  /**
   * 2D grid tracking which cells have been shot at by the opponent.
   * true = has been shot at, false = not yet.
   */
  shotsReceived: boolean[][];
}

/**
 * Full internal game state.
 */
export interface BattleshipState {
  phase: BattleshipPhase;
  /**
   * Index (0 or 1) of the player whose turn it is to shoot.
   * During the placing phase, tracks whose turn it is to shoot once shooting begins.
   */
  nextPlayer: number;
  /** Whether each player (by index) has finished placing their ships */
  placementDone: boolean[];
  /** Board state for each player (index 0 and 1) */
  boards: [PlayerBoardState, PlayerBoardState];
}

// Views

/**
 * The view of the game shown to a specific player during the placing phase.
 */
export type BattleshipPlacingView = {
  phase: "placing";
  /** Whether this player has submitted their placement yet */
  iPlaced: boolean;
  /** Whether the opponent has submitted their placement yet */
  opponentPlaced: boolean;
  /** This player's own board, if they have placed (so they can review it) */
  myBoard: OwnBoardCell[][] | null;
};

/**
 * The view of the game shown to a specific player during the shooting phase.
 */
export type BattleshipShootingView = {
  phase: "shooting";
  /** True if it is this player's turn to shoot */
  myTurn: boolean;
  /** This player's own board — shows their ships and where they have been hit */
  myBoard: OwnBoardCell[][];
  /**
   * The opponent's board from this player's perspective —
   * shows hits, misses, and sunk ships but not unsunk ship locations
   */
  opponentBoard: OpponentBoardCell[][];
};

/**
 * The view shown to a player when the game is finished.
 */
export type BattleshipDoneView = {
  phase: "done";
  /** True if this player won */
  iWon: boolean;
  /** This player's own board */
  myBoard: OwnBoardCell[][];
  /** The opponent's board, fully revealed (all ships visible) */
  opponentBoard: OwnBoardCell[][];
};

/**
 * The view shown to watchers (not players), always showing both boards
 * with full information.
 */
export type BattleshipWatcherView = {
  phase: BattleshipPhase;
  /** Player 0's board */
  board0: OwnBoardCell[][];
  /** Player 1's board */
  board1: OwnBoardCell[][];
  /** Index of who's turn it is during shooting, or null during placing */
  nextPlayer: number | null;
};

export type BattleshipView =
  | BattleshipPlacingView
  | BattleshipShootingView
  | BattleshipDoneView
  | BattleshipWatcherView;
