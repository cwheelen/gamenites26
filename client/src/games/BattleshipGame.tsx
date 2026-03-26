import "./BattleshipGame.css";
import type {
  BattleshipView,
  BattleshipMove,
  OwnBoardCell,
  OpponentBoardCell,
} from "@gamenite/shared";
import type { GameProps } from "../util/types";
import React, { useState } from "react";

import {
  BOARD_SIZE,
  SHIPS,
  shipCells,
  shipInBounds,
  shipsOverlap,
} from "@gamenite/shared/src/games/battleship.types";

function renderOwnBoard(board: OwnBoardCell[][] | null) {
  const colLabels = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));
  if (!board)
    return (
      <div className="battleship-board" style={{ opacity: 0.5, textAlign: "center" }}>
        No board to display
      </div>
    );
  return (
    <table className="battleship-board">
      <thead>
        <tr>
          <th></th>
          {colLabels.map((label) => (
            <th key={label} className="battleship-label">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {board.map((row, r) => (
          <tr key={r}>
            <th className="battleship-label">{r + 1}</th>
            {row.map((cell, c) => (
              <td key={c} className={`cell cell-${cell}`}>
                {renderOwnCell(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderOpponentBoard(
  board: OpponentBoardCell[][] | null,
  onShoot?: (r: number, c: number) => void,
  disabled = false,
) {
  const colLabels = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));
  if (!board)
    return (
      <div className="battleship-board" style={{ opacity: 0.5, textAlign: "center" }}>
        No board to display
      </div>
    );
  return (
    <table className="battleship-board">
      <thead>
        <tr>
          <th></th>
          {colLabels.map((label) => (
            <th key={label} className="battleship-label">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {board.map((row, r) => (
          <tr key={r}>
            <th className="battleship-label">{r + 1}</th>
            {row.map((cell, c) => (
              <td key={c} className={`cell cell-${cell}`}>
                {cell === "unknown" && onShoot && !disabled ? (
                  <button className="cell-btn" onClick={() => onShoot(r, c)}>
                    &nbsp;
                  </button>
                ) : (
                  renderOpponentCell(cell)
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderOwnCell(cell: string) {
  switch (cell) {
    case "empty":
      return "";
    case "ship":
      return (
        <span role="img" aria-label="ship" className="battleship-emoji">
          🚢
        </span>
      );
    case "hit":
      return (
        <span role="img" aria-label="hit" className="battleship-emoji">
          💥
        </span>
      );
    case "miss":
      return (
        <span role="img" aria-label="miss" className="battleship-emoji">
          •
        </span>
      );
    default:
      return cell;
  }
}

function renderOpponentCell(cell: string) {
  switch (cell) {
    case "unknown":
      return "";
    case "hit":
      return (
        <span role="img" aria-label="hit" className="battleship-emoji">
          💥
        </span>
      );
    case "miss":
      return (
        <span role="img" aria-label="miss" className="battleship-emoji">
          •
        </span>
      );
    case "sunk":
      return (
        <span role="img" aria-label="sunk" className="battleship-emoji">
          🚢
        </span>
      );
    default:
      return cell;
  }
}

export default function BattleshipGame({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<BattleshipView, BattleshipMove>) {
  // --- Ship placement state (always initialized, only used in placing phase) ---
  const [placedShips, setPlacedShips] = useState(
    [] as Array<{
      name: string;
      size: number;
      row: number;
      col: number;
      horizontal: boolean;
    }>,
  );
  const [selectedShip, setSelectedShip] = useState(0); // index in SHIPS
  const [orientation, setOrientation] = useState(true); // true = horizontal

  // --- Ship placement helpers ---
  function getPlacementBoard() {
    const grid: OwnBoardCell[][] = Array.from({ length: BOARD_SIZE }, () =>
      Array<OwnBoardCell>(BOARD_SIZE).fill("empty"),
    );
    for (const ship of placedShips) {
      for (const [r, c] of shipCells(ship)) {
        grid[r][c] = "ship";
      }
    }
    return grid;
  }

  function canPlaceShip(row: number, col: number) {
    if (selectedShip >= SHIPS.length) return false;
    const ship = {
      ...SHIPS[selectedShip],
      row,
      col,
      horizontal: orientation,
    };
    // Check bounds
    if (!shipInBounds(ship)) return false;
    // Check overlap
    for (const placed of placedShips) {
      if (shipsOverlap(ship, placed)) return false;
    }
    return true;
  }

  function handleCellClick(row: number, col: number) {
    if (selectedShip >= SHIPS.length) return;
    if (!canPlaceShip(row, col)) return;
    const ship = SHIPS[selectedShip];
    setPlacedShips([
      ...placedShips,
      { name: ship.name, size: ship.size, row, col, horizontal: orientation },
    ]);
    setSelectedShip(selectedShip + 1);
  }

  function handleRemoveShip(idx: number) {
    setPlacedShips(placedShips.filter((_, i) => i !== idx));
    setSelectedShip(Math.min(selectedShip, placedShips.length - 1));
  }

  function handleSubmit() {
    makeMove({ type: "place", ships: placedShips });
  }

  const allPlaced = placedShips.length === SHIPS.length;

  // PHASE: PLACING
  if (view.phase === "placing") {
    return (
      <div className="content spacedSection">
        <ol>
          <li>Click a cell to place the selected ship. Toggle orientation as needed.</li>
          <li>Remove a ship by clicking its name below.</li>
          <li>When all ships are placed, submit to lock in your placement.</li>
        </ol>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div>
            <h3>Board Preview</h3>
            <table className="battleship-board">
              <tbody>
                {Array.from({ length: BOARD_SIZE }).map((_, r) => (
                  <tr key={r}>
                    {Array.from({ length: BOARD_SIZE }).map((_, c) => {
                      const cell = getPlacementBoard()[r][c];
                      return (
                        <td
                          key={c}
                          className={`cell cell-${cell}`}
                          style={{
                            cursor: allPlaced
                              ? "not-allowed"
                              : canPlaceShip(r, c)
                                ? "pointer"
                                : "not-allowed",
                            background:
                              !allPlaced && selectedShip < SHIPS.length && canPlaceShip(r, c)
                                ? "#e0f7fa"
                                : undefined,
                          }}
                          onClick={() =>
                            !allPlaced &&
                            selectedShip < SHIPS.length &&
                            canPlaceShip(r, c) &&
                            handleCellClick(r, c)
                          }
                        >
                          {cell === "ship" ? (
                            <span role="img" aria-label="ship">
                              🚢
                            </span>
                          ) : (
                            ""
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3>Ships to Place</h3>
            <ul>
              {SHIPS.map((ship, idx) => {
                const placedIdx = placedShips.findIndex((s) => s.name === ship.name);
                return (
                  <li key={ship.name}>
                    {placedIdx !== -1 ? (
                      <button onClick={() => handleRemoveShip(placedIdx)}>
                        Remove {ship.name}
                      </button>
                    ) : (
                      <button
                        style={{ fontWeight: idx === selectedShip ? "bold" : undefined }}
                        disabled={selectedShip !== idx}
                        onClick={() => setSelectedShip(idx)}
                      >
                        {ship.name} ({ship.size}) {idx === selectedShip ? "←" : ""}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <button onClick={() => setOrientation((o) => !o)}>
              Orientation: {orientation ? "Horizontal" : "Vertical"}
            </button>
            <br />
            <button onClick={handleSubmit} disabled={Boolean(!allPlaced || view.iPlaced)}>
              Place ships
            </button>
          </div>
        </div>
        <div>
          {view.iPlaced ? "You have placed your ships." : "You have not placed your ships yet."}
        </div>
        <div>
          {view.opponentPlaced ? "Opponent has placed their ships." : "Waiting for opponent..."}
        </div>
      </div>
    );
  }

  // PHASE: SHOOTING
  if (view.phase === "shooting") {
    return (
      <div className="content spacedSection">
        <div>It is {view.myTurn ? "your" : "opponent's"} turn to shoot.</div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div>
            <h3>Your Board</h3>
            {renderOwnBoard(view.myBoard as OwnBoardCell[][] | null)}
          </div>
          <div>
            <h3>Opponent's Board</h3>
            {renderOpponentBoard(
              view.opponentBoard as OpponentBoardCell[][],
              (r, c) => makeMove({ type: "shoot", row: r, col: c }),
              !view.myTurn,
            )}
            <div>{view.myTurn ? "Click a cell to shoot." : "Waiting for opponent's move..."}</div>
          </div>
        </div>
      </div>
    );
  }

  // PHASE: DONE
  if (view.phase === "done") {
    return (
      <div className="content spacedSection">
        <div>{view.iWon ? "You won!" : "You lost."}</div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div>
            <h3>Your Board</h3>
            {renderOwnBoard(view.myBoard as OwnBoardCell[][])}
          </div>
          <div>
            <h3>Opponent's Board (Revealed)</h3>
            {renderOwnBoard(view.opponentBoard as OwnBoardCell[][])}
          </div>
        </div>
      </div>
    );
  }

  // PHASE: WATCHER (not a player)
  if ("board0" in view && "board1" in view) {
    return (
      <div className="content spacedSection">
        <h2>Battleship: Watcher View</h2>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div>
            <h3>Player 1 Board</h3>
            {renderOwnBoard(view.board0)}
          </div>
          <div>
            <h3>Player 2 Board</h3>
            {renderOwnBoard(view.board1)}
          </div>
        </div>
        <div>
          {view.nextPlayer !== null
            ? `It is Player ${view.nextPlayer + 1}'s turn.`
            : "Placing phase."}
        </div>
      </div>
    );
  }

  // Fallback
  return <div>Unknown Battleship game state.</div>;
}
